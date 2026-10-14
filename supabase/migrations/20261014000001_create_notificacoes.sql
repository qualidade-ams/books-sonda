-- =====================================================================
-- Notificações do sino (header).
--
-- notificacoes: pendências geradas pelo sistema, sempre ligadas a uma tela
--   (screen_key). Só quem tem permissão de EDIÇÃO nessa tela vê a notificação;
--   quem só visualiza não recebe.
-- notificacoes_leituras: leitura por usuário (cada um marca como lida para si).
--
-- As notificações são criadas e resolvidas por gatilhos nas tabelas de origem,
-- para cobrir todos os pontos que gravam nelas (front, Vercel e sync-api):
--   book_precisa_retificacao   books.precisa_retificacao = true       → geracao_books
--   ajuste_retroativo_pendente banco_horas_ajustes_retroativos         → banco_horas_ajustes_retroativos
--   saldo_parcial_falha        banco_horas_envio_execucoes (falha)     → envio_saldo_parcial
--   geracao_books_falha        sync_execucoes tipo 'books' (falha)     → geracao_books
--
-- `chave` evita duplicidade: existe no máximo uma notificação ABERTA por chave.
-- Os gatilhos só gravam em notificacoes; não alteram a linha de origem, exceto
-- a limpeza de books.precisa_retificacao quando o book retificado é reenviado.
--
-- Sem políticas de INSERT/UPDATE/DELETE em notificacoes: usuários não gravam
-- direto (RLS nega); a escrita é feita só pelas funções SECURITY DEFINER abaixo.
-- =====================================================================

CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN (
    'book_precisa_retificacao',
    'ajuste_retroativo_pendente',
    'saldo_parcial_falha',
    'geracao_books_falha'
  )),
  screen_key VARCHAR NOT NULL REFERENCES screens(key) ON UPDATE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  link TEXT,
  -- CASCADE para não mudar o comportamento atual da exclusão de empresa
  empresa_id UUID REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  chave TEXT NOT NULL,
  referencia JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolvida_em TIMESTAMPTZ,
  resolvida_motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notificacoes_leituras (
  notificacao_id UUID NOT NULL REFERENCES notificacoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lida_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (notificacao_id, user_id)
);

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes_leituras ENABLE ROW LEVEL SECURITY;

-- Só quem tem EDIÇÃO na tela da notificação (has_screen_permission respeita edit > view)
CREATE POLICY "notificacoes_select_edicao_tela" ON notificacoes
  FOR SELECT TO authenticated
  USING (has_screen_permission(screen_key::text, 'edit'::text));

-- Leituras: cada usuário só enxerga e grava as próprias, e só de notificações que pode ver
CREATE POLICY "notificacoes_leituras_select_proprias" ON notificacoes_leituras
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "notificacoes_leituras_insert_proprias" ON notificacoes_leituras
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM notificacoes n WHERE n.id = notificacao_id)
  );

CREATE POLICY "notificacoes_leituras_update_proprias" ON notificacoes_leituras
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "notificacoes_leituras_delete_proprias" ON notificacoes_leituras
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE UNIQUE INDEX IF NOT EXISTS notificacoes_chave_aberta_uq
  ON notificacoes (chave) WHERE resolvida_em IS NULL;
CREATE INDEX IF NOT EXISTS notificacoes_abertas_idx
  ON notificacoes (screen_key, created_at DESC) WHERE resolvida_em IS NULL;
CREATE INDEX IF NOT EXISTS notificacoes_empresa_idx ON notificacoes (empresa_id);
CREATE INDEX IF NOT EXISTS notificacoes_leituras_user_idx ON notificacoes_leituras (user_id);

-- ---------------------------------------------------------------------
-- Funções internas (só gatilhos chamam; sem EXECUTE para usuários)
-- ---------------------------------------------------------------------

-- Cria a notificação ou, se já houver uma aberta com a mesma chave, só atualiza o texto
CREATE OR REPLACE FUNCTION public.notificacoes_abrir(
  p_tipo TEXT,
  p_screen_key TEXT,
  p_titulo TEXT,
  p_mensagem TEXT,
  p_link TEXT,
  p_empresa_id UUID,
  p_chave TEXT,
  p_referencia JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notificacoes (tipo, screen_key, titulo, mensagem, link, empresa_id, chave, referencia)
  VALUES (p_tipo, p_screen_key, p_titulo, p_mensagem, p_link, p_empresa_id, p_chave, COALESCE(p_referencia, '{}'::jsonb))
  ON CONFLICT (chave) WHERE resolvida_em IS NULL
  DO UPDATE SET
    titulo = EXCLUDED.titulo,
    mensagem = EXCLUDED.mensagem,
    referencia = EXCLUDED.referencia,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.notificacoes_resolver(p_chave TEXT, p_motivo TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notificacoes
     SET resolvida_em = NOW(), resolvida_motivo = p_motivo, updated_at = NOW()
   WHERE chave = p_chave AND resolvida_em IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.notificacoes_nome_empresa(p_empresa_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(TRIM(nome_abreviado), ''), nome_completo, 'Empresa')
    FROM empresas_clientes WHERE id = p_empresa_id;
$$;

-- ---------------------------------------------------------------------
-- 1. Book precisa de retificação (tela Geração de Books)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notificacoes_sync_book(p_book_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_book RECORD;
BEGIN
  SELECT id, empresa_id, mes, ano, precisa_retificacao INTO v_book FROM books WHERE id = p_book_id;
  IF NOT FOUND OR v_book.precisa_retificacao IS NOT TRUE THEN
    RETURN;
  END IF;

  PERFORM notificacoes_abrir(
    'book_precisa_retificacao',
    'geracao_books',
    'Book precisa de retificação',
    format('O book de %s de %s/%s teve alteração após o fechamento e precisa ser retificado e reenviado.',
           notificacoes_nome_empresa(v_book.empresa_id), lpad(v_book.mes::text, 2, '0'), v_book.ano),
    '/admin/geracao-books',
    v_book.empresa_id,
    'book_retificacao:' || v_book.id,
    jsonb_build_object('book_id', v_book.id, 'mes', v_book.mes, 'ano', v_book.ano)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notificar_book_precisa_retificacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notificacoes_sync_book(NEW.id);
  RETURN NULL;
END;
$$;

-- Ao reenviar o book retificado: resolve a notificação e limpa a flag.
-- Só resolve se o book foi gerado DEPOIS da notificação (uma alteração feita
-- após a regeração ainda não está no book reenviado e continua pendente).
CREATE OR REPLACE FUNCTION public.resolver_book_precisa_retificacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notificacao_em TIMESTAMPTZ;
BEGIN
  IF NEW.status = 'enviado'
     AND OLD.status IS DISTINCT FROM 'enviado'
     AND NEW.precisa_retificacao IS TRUE THEN

    SELECT created_at INTO v_notificacao_em
      FROM notificacoes
     WHERE chave = 'book_retificacao:' || NEW.id AND resolvida_em IS NULL;

    IF v_notificacao_em IS NULL OR COALESCE(NEW.pdf_gerado_em, NOW()) >= v_notificacao_em THEN
      PERFORM notificacoes_resolver('book_retificacao:' || NEW.id, 'Book retificado e reenviado');
      NEW.precisa_retificacao := FALSE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolver_book_precisa_retificacao ON books;
CREATE TRIGGER trg_resolver_book_precisa_retificacao
  BEFORE UPDATE OF status ON books
  FOR EACH ROW EXECUTE FUNCTION resolver_book_precisa_retificacao();

-- UPDATE OF dispara mesmo quando a flag já era true (nova marcação reabre se estiver resolvida)
DROP TRIGGER IF EXISTS trg_notificar_book_precisa_retificacao ON books;
CREATE TRIGGER trg_notificar_book_precisa_retificacao
  AFTER INSERT OR UPDATE OF precisa_retificacao ON books
  FOR EACH ROW WHEN (NEW.precisa_retificacao IS TRUE)
  EXECUTE FUNCTION notificar_book_precisa_retificacao();

-- ---------------------------------------------------------------------
-- 2. Ajuste retroativo pendente (tela Ajustes Retroativos), um por empresa/mês
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notificacoes_sync_retroativo(p_empresa_id UUID, p_mes INTEGER, p_ano INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chave TEXT := format('retroativo:%s:%s-%s', p_empresa_id, p_ano, lpad(p_mes::text, 2, '0'));
BEGIN
  IF EXISTS (
    SELECT 1 FROM banco_horas_ajustes_retroativos
     WHERE empresa_id = p_empresa_id
       AND mes_referencia = p_mes
       AND ano_referencia = p_ano
       AND status = 'pendente'
  ) THEN
    PERFORM notificacoes_abrir(
      'ajuste_retroativo_pendente',
      'banco_horas_ajustes_retroativos',
      'Ajuste retroativo pendente',
      format('Há ajustes retroativos de %s em %s/%s aguardando análise.',
             notificacoes_nome_empresa(p_empresa_id), lpad(p_mes::text, 2, '0'), p_ano),
      '/admin/ajustes-retroativos',
      p_empresa_id,
      v_chave,
      jsonb_build_object('mes', p_mes, 'ano', p_ano)
    );
  ELSE
    PERFORM notificacoes_resolver(v_chave, 'Ajustes retroativos analisados');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.notificar_ajuste_retroativo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM notificacoes_sync_retroativo(OLD.empresa_id, OLD.mes_referencia, OLD.ano_referencia);
  ELSE
    PERFORM notificacoes_sync_retroativo(NEW.empresa_id, NEW.mes_referencia, NEW.ano_referencia);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_ajuste_retroativo ON banco_horas_ajustes_retroativos;
CREATE TRIGGER trg_notificar_ajuste_retroativo
  AFTER INSERT OR UPDATE OF status OR DELETE ON banco_horas_ajustes_retroativos
  FOR EACH ROW EXECUTE FUNCTION notificar_ajuste_retroativo();

-- ---------------------------------------------------------------------
-- 3. Falha no envio do Saldo Parcial (tela Envio de Saldo Parcial), uma por empresa
--    O texto do erro não é copiado: pode conter corpo de resposta do webhook.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notificacoes_sync_saldo_parcial(p_execucao_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exec RECORD;
  v_chave TEXT;
  v_motivo TEXT;
BEGIN
  SELECT id, empresa_id, status, origem INTO v_exec FROM banco_horas_envio_execucoes WHERE id = p_execucao_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_chave := 'saldo_parcial:' || v_exec.empresa_id;

  IF v_exec.status = 'sucesso' THEN
    PERFORM notificacoes_resolver(v_chave, 'Envio de Saldo Parcial concluído com sucesso');
  ELSIF v_exec.status IN ('erro', 'sem_destinatarios', 'interrompida') THEN
    v_motivo := CASE v_exec.status
      WHEN 'sem_destinatarios' THEN 'não há contatos ativos com finalidade Saldo Parcial'
      WHEN 'interrompida' THEN 'a execução foi interrompida'
      ELSE 'ocorreu um erro no envio'
    END;
    PERFORM notificacoes_abrir(
      'saldo_parcial_falha',
      'envio_saldo_parcial',
      'Falha no envio do Saldo Parcial',
      format('O Saldo Parcial de %s não foi enviado: %s. Veja o histórico de execuções.',
             notificacoes_nome_empresa(v_exec.empresa_id), v_motivo),
      '/admin/envio-saldo-parcial',
      v_exec.empresa_id,
      v_chave,
      jsonb_build_object('execucao_id', v_exec.id, 'status', v_exec.status, 'origem', v_exec.origem)
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.notificar_saldo_parcial_execucao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notificacoes_sync_saldo_parcial(NEW.id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_saldo_parcial_execucao ON banco_horas_envio_execucoes;
CREATE TRIGGER trg_notificar_saldo_parcial_execucao
  AFTER INSERT OR UPDATE OF status ON banco_horas_envio_execucoes
  FOR EACH ROW EXECUTE FUNCTION notificar_saldo_parcial_execucao();

-- ---------------------------------------------------------------------
-- 4. Falha na geração automática de books (tela Geração de Books)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notificacoes_sync_geracao_books(p_execucao_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exec RECORD;
  v_empresas TEXT;
  v_mensagem TEXT;
BEGIN
  SELECT id, tipo, status, resultado INTO v_exec FROM sync_execucoes WHERE id = p_execucao_id;
  IF NOT FOUND OR v_exec.tipo IS DISTINCT FROM 'books' THEN
    RETURN;
  END IF;

  IF v_exec.status = 'sucesso' THEN
    PERFORM notificacoes_resolver('geracao_books', 'Geração automática de books concluída com sucesso');
  ELSIF v_exec.status IN ('erro', 'parcial', 'interrompida') THEN
    SELECT string_agg(e ->> 'empresa', ', ')
      INTO v_empresas
      FROM jsonb_array_elements(COALESCE(v_exec.resultado -> 'gerarBooks' -> 'empresas', '[]'::jsonb)) e
     WHERE (e ->> 'sucesso')::boolean IS FALSE;

    v_mensagem := CASE
      WHEN v_empresas IS NOT NULL THEN format('A geração automática de books falhou para: %s.', v_empresas)
      WHEN v_exec.status = 'interrompida' THEN 'A geração automática de books foi interrompida.'
      ELSE 'A geração automática de books terminou com erro.'
    END;

    PERFORM notificacoes_abrir(
      'geracao_books_falha',
      'geracao_books',
      'Falha na geração automática de books',
      v_mensagem,
      '/admin/geracao-books',
      NULL,
      'geracao_books',
      jsonb_build_object('execucao_id', v_exec.id, 'status', v_exec.status)
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.notificar_geracao_books_execucao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notificacoes_sync_geracao_books(NEW.id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_geracao_books_execucao ON sync_execucoes;
CREATE TRIGGER trg_notificar_geracao_books_execucao
  AFTER INSERT OR UPDATE OF status ON sync_execucoes
  FOR EACH ROW WHEN (NEW.tipo = 'books')
  EXECUTE FUNCTION notificar_geracao_books_execucao();

-- Funções internas: nenhum usuário chama direto
REVOKE EXECUTE ON FUNCTION
  public.notificacoes_abrir(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, JSONB),
  public.notificacoes_resolver(TEXT, TEXT),
  public.notificacoes_nome_empresa(UUID),
  public.notificacoes_sync_book(UUID),
  public.notificacoes_sync_retroativo(UUID, INTEGER, INTEGER),
  public.notificacoes_sync_saldo_parcial(UUID),
  public.notificacoes_sync_geracao_books(UUID),
  public.notificar_book_precisa_retificacao(),
  public.resolver_book_precisa_retificacao(),
  public.notificar_ajuste_retroativo(),
  public.notificar_saldo_parcial_execucao(),
  public.notificar_geracao_books_execucao()
FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- Carga das pendências que já existem (sem alterar as tabelas de origem)
-- ---------------------------------------------------------------------

SELECT notificacoes_sync_book(id) FROM books WHERE precisa_retificacao IS TRUE;

SELECT notificacoes_sync_retroativo(empresa_id, mes_referencia, ano_referencia)
  FROM (SELECT DISTINCT empresa_id, mes_referencia, ano_referencia
          FROM banco_horas_ajustes_retroativos WHERE status = 'pendente') p;

-- Última execução de Saldo Parcial de cada empresa (se falhou, abre)
SELECT notificacoes_sync_saldo_parcial(id)
  FROM (SELECT DISTINCT ON (empresa_id) id
          FROM banco_horas_envio_execucoes
         WHERE status <> 'executando'
         ORDER BY empresa_id, iniciado_em DESC) u;

-- Última execução da geração automática de books (se falhou, abre)
SELECT notificacoes_sync_geracao_books(id)
  FROM (SELECT id FROM sync_execucoes
         WHERE tipo = 'books' AND status NOT IN ('executando', 'ignorada')
         ORDER BY iniciado_em DESC LIMIT 1) u;

-- Realtime: o sino atualiza na hora (o Realtime aplica a RLS de cada usuário)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notificacoes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
  END IF;
END $$;
