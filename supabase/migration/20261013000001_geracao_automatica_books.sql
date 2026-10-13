-- =====================================================================
-- Geração automática de Books (tela "Sincronização SQL Server").
--
-- 1) sync_agendamentos / sync_execucoes ganham `tipo`:
--      'sincronizacao' — sincronização SQL Server (comportamento atual)
--      'books'         — gera e envia para a Qualidade os books liberados
--                        e ainda não enviados do período de referência
--    As duas usam o mesmo agendador e a mesma trava do sync-api: uma espera
--    a outra terminar.
--
-- 2) registrar_envio_book passa a aceitar o service role (sync-api), que não
--    tem auth.uid(). Para usuários a validação continua igual: autenticado e
--    com permissão de edição na tela geracao_books.
-- =====================================================================

ALTER TABLE sync_agendamentos
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'sincronizacao';

ALTER TABLE sync_execucoes
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'sincronizacao';

ALTER TABLE sync_agendamentos DROP CONSTRAINT IF EXISTS sync_agendamentos_tipo_check;
ALTER TABLE sync_agendamentos
  ADD CONSTRAINT sync_agendamentos_tipo_check CHECK (tipo IN ('sincronizacao', 'books'));

ALTER TABLE sync_execucoes DROP CONSTRAINT IF EXISTS sync_execucoes_tipo_check;
ALTER TABLE sync_execucoes
  ADD CONSTRAINT sync_execucoes_tipo_check CHECK (tipo IN ('sincronizacao', 'books'));

COMMENT ON COLUMN sync_agendamentos.tipo IS 'sincronizacao = sync SQL Server; books = geração e envio automático de books para a Qualidade';
COMMENT ON COLUMN sync_execucoes.tipo IS 'sincronizacao = sync SQL Server; books = geração e envio automático de books para a Qualidade';

-- ---------------------------------------------------------------------
-- registrar_envio_book: aceita o service role (geração automática)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_envio_book(p_book_id uuid, p_usuario_id uuid, p_destinatarios text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_book RECORD;
  v_versao_id UUID;
  v_versao_numero INTEGER;
  v_motivo_retificacao TEXT;
  v_versao_existente UUID;
BEGIN
  -- O sync-api (service role) gera os books agendados sem usuário logado
  IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN
    -- Validar que o usuário está autenticado
    IF (SELECT auth.uid()) IS NULL THEN
      RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    -- Validar que o usuário tem permissão de edição na tela geracao_books
    IF NOT has_screen_permission('geracao_books'::varchar, 'edit'::varchar) THEN
      RAISE EXCEPTION 'Usuário não tem permissão para registrar envio de books';
    END IF;
  END IF;

  -- Buscar book atual
  SELECT * INTO v_book FROM books WHERE id = p_book_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book não encontrado: %', p_book_id;
  END IF;

  -- Se já está enviado, retornar a versão existente (idempotente)
  IF v_book.status = 'enviado' THEN
    SELECT id INTO v_versao_existente
    FROM books_versoes
    WHERE book_id = p_book_id
    ORDER BY versao DESC
    LIMIT 1;
    RETURN COALESCE(v_versao_existente, gen_random_uuid());
  END IF;

  -- Aceitar status 'gerado' OU 'desatualizado' para envio
  IF v_book.status NOT IN ('gerado', 'desatualizado') THEN
    RAISE EXCEPTION 'Book precisa estar com status "gerado" ou "desatualizado" para ser enviado. Status atual: %', v_book.status;
  END IF;

  -- Determinar número da versão
  v_versao_numero := COALESCE(v_book.versao_atual, 1);

  -- Verificar se esta versão já existe (caso de re-tentativa)
  SELECT id INTO v_versao_existente
  FROM books_versoes
  WHERE book_id = p_book_id AND versao = v_versao_numero;

  IF v_versao_existente IS NOT NULL THEN
    -- Versão já existe (tentativa anterior parcial) - apenas atualizar status do book
    UPDATE books SET
      status = 'enviado',
      enviado_em = NOW(),
      enviado_por = p_usuario_id,
      destinatarios_envio = p_destinatarios,
      updated_at = NOW()
    WHERE id = p_book_id;

    RETURN v_versao_existente;
  END IF;

  -- Se é retificação (versão > 1), buscar o motivo do histórico de geração
  IF v_versao_numero > 1 THEN
    SELECT (detalhes->>'motivo')::TEXT INTO v_motivo_retificacao
    FROM books_historico_geracao
    WHERE book_id = p_book_id
      AND detalhes->>'tipo' = 'retificacao'
      AND (detalhes->>'nova_versao')::INTEGER = v_versao_numero
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- Criar snapshot imutável na tabela de versões
  INSERT INTO books_versoes (
    book_id,
    versao,
    dados_capa,
    dados_volumetria,
    dados_sla,
    dados_backlog,
    dados_consumo,
    dados_pesquisa,
    pdf_url,
    pdf_gerado_em,
    enviado_em,
    enviado_por,
    destinatarios,
    motivo_retificacao,
    retificado_por,
    retificado_em
  ) VALUES (
    p_book_id,
    v_versao_numero,
    v_book.dados_capa,
    v_book.dados_volumetria,
    v_book.dados_sla,
    v_book.dados_backlog,
    v_book.dados_consumo,
    v_book.dados_pesquisa,
    v_book.pdf_url,
    v_book.pdf_gerado_em,
    NOW(),
    p_usuario_id,
    p_destinatarios,
    v_motivo_retificacao,
    CASE WHEN v_versao_numero > 1 THEN p_usuario_id ELSE NULL END,
    CASE WHEN v_versao_numero > 1 THEN NOW() ELSE NULL END
  )
  RETURNING id INTO v_versao_id;

  -- Atualizar status do book para 'enviado' (TRAVA)
  UPDATE books SET
    status = 'enviado',
    enviado_em = NOW(),
    enviado_por = p_usuario_id,
    destinatarios_envio = p_destinatarios,
    updated_at = NOW()
  WHERE id = p_book_id;

  RETURN v_versao_id;
END;
$function$;
