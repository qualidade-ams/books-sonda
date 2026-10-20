-- =====================================================
-- MIGRAÇÃO: SISTEMA DE PLANO DE AÇÃO
-- =====================================================
-- Cria estrutura completa para gerenciamento de planos
-- de ação baseados em pesquisas de satisfação
-- =====================================================

-- =====================================================
-- 1. TABELA PRINCIPAL: planos_acao
-- =====================================================

CREATE TABLE IF NOT EXISTS planos_acao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamento com pesquisa
  pesquisa_id UUID NOT NULL REFERENCES pesquisas_satisfacao(id) ON DELETE CASCADE,
  
  -- Ação Corretiva e Preventiva
  descricao_acao_corretiva TEXT NOT NULL,
  acao_preventiva TEXT,
  
  -- Prioridade e Status
  prioridade VARCHAR(20) NOT NULL CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
  status_plano VARCHAR(30) NOT NULL DEFAULT 'aberto' CHECK (status_plano IN ('aberto', 'em_andamento', 'aguardando_retorno', 'concluido', 'cancelado')),
  
  -- Datas
  data_inicio DATE NOT NULL,
  data_conclusao DATE,
  
  -- Contato com Cliente
  data_primeiro_contato DATE,
  meio_contato VARCHAR(20) CHECK (meio_contato IN ('whatsapp', 'email', 'ligacao')),
  resumo_comunicacao TEXT,
  retorno_cliente VARCHAR(30) CHECK (retorno_cliente IN ('aguardando', 'respondeu', 'solicitou_mais_informacoes')),
  
  -- Resultado Final
  status_final VARCHAR(30) CHECK (status_final IN ('resolvido', 'nao_resolvido', 'resolvido_parcialmente')),
  data_fechamento TIMESTAMP,
  
  -- Auditoria
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),
  
  -- Índices
  CONSTRAINT plano_acao_pesquisa_unique UNIQUE (pesquisa_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_planos_acao_pesquisa ON planos_acao(pesquisa_id);
CREATE INDEX IF NOT EXISTS idx_planos_acao_status ON planos_acao(status_plano);
CREATE INDEX IF NOT EXISTS idx_planos_acao_prioridade ON planos_acao(prioridade);
CREATE INDEX IF NOT EXISTS idx_planos_acao_criado_em ON planos_acao(criado_em);

-- Comentários
COMMENT ON TABLE planos_acao IS 'Planos de ação para pesquisas de satisfação';
COMMENT ON COLUMN planos_acao.descricao_acao_corretiva IS 'O que será feito para resolver o problema';
COMMENT ON COLUMN planos_acao.acao_preventiva IS 'O que será feito para evitar recorrência';
COMMENT ON COLUMN planos_acao.prioridade IS 'Nível de prioridade: baixa, media, alta, critica';
COMMENT ON COLUMN planos_acao.status_plano IS 'Status atual do plano de ação';

-- =====================================================
-- 2. TABELA: plano_acao_historico
-- =====================================================

CREATE TABLE IF NOT EXISTS plano_acao_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamento
  plano_acao_id UUID NOT NULL REFERENCES planos_acao(id) ON DELETE CASCADE,
  
  -- Dados do log
  data_atualizacao TIMESTAMP NOT NULL DEFAULT NOW(),
  usuario_id UUID REFERENCES auth.users(id),
  usuario_nome VARCHAR(255),
  descricao_atualizacao TEXT NOT NULL,
  
  -- Tipo de atualização
  tipo_atualizacao VARCHAR(30) CHECK (tipo_atualizacao IN ('criacao', 'atualizacao', 'contato', 'conclusao', 'reabertura', 'cancelamento')),
  
  -- Auditoria
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_plano_historico_plano ON plano_acao_historico(plano_acao_id);
CREATE INDEX IF NOT EXISTS idx_plano_historico_data ON plano_acao_historico(data_atualizacao);
CREATE INDEX IF NOT EXISTS idx_plano_historico_usuario ON plano_acao_historico(usuario_id);

-- Comentários
COMMENT ON TABLE plano_acao_historico IS 'Histórico de atualizações dos planos de ação';
COMMENT ON COLUMN plano_acao_historico.tipo_atualizacao IS 'Tipo de atualização: criacao, atualizacao, contato, conclusao, reabertura, cancelamento';

-- =====================================================
-- 3. TRIGGER: Atualizar timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION atualizar_timestamp_plano_acao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_plano_acao ON planos_acao;
CREATE TRIGGER trigger_atualizar_plano_acao
  BEFORE UPDATE ON planos_acao
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp_plano_acao();

-- =====================================================
-- 4. TRIGGER: Preencher data_conclusao automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION preencher_data_conclusao()
RETURNS TRIGGER AS $$
BEGIN
  -- Se status mudou para 'concluido' e data_conclusao está vazia
  IF NEW.status_plano = 'concluido' AND OLD.status_plano != 'concluido' AND NEW.data_conclusao IS NULL THEN
    NEW.data_conclusao = CURRENT_DATE;
  END IF;
  
  -- Se status mudou para 'concluido' e status_final está vazio, definir como 'resolvido'
  IF NEW.status_plano = 'concluido' AND NEW.status_final IS NULL THEN
    NEW.status_final = 'resolvido';
  END IF;
  
  -- Se status mudou para 'concluido' e data_fechamento está vazia
  IF NEW.status_plano = 'concluido' AND OLD.status_plano != 'concluido' AND NEW.data_fechamento IS NULL THEN
    NEW.data_fechamento = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_preencher_data_conclusao ON planos_acao;
CREATE TRIGGER trigger_preencher_data_conclusao
  BEFORE UPDATE ON planos_acao
  FOR EACH ROW
  EXECUTE FUNCTION preencher_data_conclusao();

-- =====================================================
-- 5. TRIGGER: Criar log automático no histórico
-- =====================================================

CREATE OR REPLACE FUNCTION criar_log_historico_plano()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_nome VARCHAR(255);
BEGIN
  -- Buscar nome do usuário
  SELECT full_name INTO v_usuario_nome
  FROM profiles
  WHERE id = NEW.criado_por
  LIMIT 1;
  
  IF v_usuario_nome IS NULL AND NEW.criado_por IS NOT NULL THEN
    SELECT email INTO v_usuario_nome
    FROM auth.users
    WHERE id = NEW.criado_por
    LIMIT 1;
  END IF;
  
  -- Criar log de criação
  IF TG_OP = 'INSERT' THEN
    INSERT INTO plano_acao_historico (
      plano_acao_id,
      usuario_id,
      usuario_nome,
      descricao_atualizacao,
      tipo_atualizacao
    ) VALUES (
      NEW.id,
      NEW.criado_por,
      COALESCE(v_usuario_nome, 'Sistema'),
      'Plano de ação criado',
      'criacao'
    );
  END IF;
  
  -- Criar log de atualização de status
  IF TG_OP = 'UPDATE' AND OLD.status_plano != NEW.status_plano THEN
    INSERT INTO plano_acao_historico (
      plano_acao_id,
      usuario_id,
      usuario_nome,
      descricao_atualizacao,
      tipo_atualizacao
    ) VALUES (
      NEW.id,
      NEW.criado_por,
      COALESCE(v_usuario_nome, 'Sistema'),
      'Status alterado de "' || OLD.status_plano || '" para "' || NEW.status_plano || '"',
      CASE 
        WHEN NEW.status_plano = 'concluido' THEN 'conclusao'
        WHEN NEW.status_plano = 'cancelado' THEN 'cancelamento'
        ELSE 'atualizacao'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_criar_log_historico ON planos_acao;
CREATE TRIGGER trigger_criar_log_historico
  AFTER INSERT OR UPDATE ON planos_acao
  FOR EACH ROW
  EXECUTE FUNCTION criar_log_historico_plano();

-- =====================================================
-- 6. ATUALIZAR TABELA pesquisas_satisfacao
-- =====================================================

-- Adicionar campo para indicar se pesquisa tem plano de ação
ALTER TABLE pesquisas_satisfacao 
ADD COLUMN IF NOT EXISTS tem_plano_acao BOOLEAN DEFAULT FALSE;

-- Adicionar campo para data de encaminhamento
ALTER TABLE pesquisas_satisfacao 
ADD COLUMN IF NOT EXISTS data_encaminhamento TIMESTAMP;

-- Índice
CREATE INDEX IF NOT EXISTS idx_pesquisas_tem_plano ON pesquisas_satisfacao(tem_plano_acao);

-- =====================================================
-- 7. FUNÇÃO: Marcar pesquisa como encaminhada
-- =====================================================

CREATE OR REPLACE FUNCTION marcar_pesquisa_encaminhada()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um plano de ação é criado, marcar pesquisa como encaminhada
  UPDATE pesquisas_satisfacao
  SET 
    tem_plano_acao = TRUE,
    data_encaminhamento = NOW()
  WHERE id = NEW.pesquisa_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_marcar_pesquisa_encaminhada ON planos_acao;
CREATE TRIGGER trigger_marcar_pesquisa_encaminhada
  AFTER INSERT ON planos_acao
  FOR EACH ROW
  EXECUTE FUNCTION marcar_pesquisa_encaminhada();

-- =====================================================
-- 8. POLÍTICAS RLS
-- =====================================================

-- Habilitar RLS
ALTER TABLE planos_acao ENABLE ROW LEVEL SECURITY;
ALTER TABLE plano_acao_historico ENABLE ROW LEVEL SECURITY;

-- Políticas para planos_acao
DROP POLICY IF EXISTS "Usuários autenticados podem ler planos" ON planos_acao;
CREATE POLICY "Usuários autenticados podem ler planos"
ON planos_acao FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar planos" ON planos_acao;
CREATE POLICY "Usuários autenticados podem criar planos"
ON planos_acao FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários autenticados podem atualizar planos" ON planos_acao;
CREATE POLICY "Usuários autenticados podem atualizar planos"
ON planos_acao FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem deletar planos" ON planos_acao;
CREATE POLICY "Usuários autenticados podem deletar planos"
ON planos_acao FOR DELETE
TO authenticated
USING (true);

-- Políticas para plano_acao_historico
DROP POLICY IF EXISTS "Usuários autenticados podem ler histórico" ON plano_acao_historico;
CREATE POLICY "Usuários autenticados podem ler histórico"
ON plano_acao_historico FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar histórico" ON plano_acao_historico;
CREATE POLICY "Usuários autenticados podem criar histórico"
ON plano_acao_historico FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- 9. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar estrutura criada
SELECT 
  'planos_acao' as tabela,
  COUNT(*) as total_colunas
FROM information_schema.columns
WHERE table_name = 'planos_acao';

SELECT 
  'plano_acao_historico' as tabela,
  COUNT(*) as total_colunas
FROM information_schema.columns
WHERE table_name = 'plano_acao_historico';

-- Listar triggers criados
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('planos_acao', 'plano_acao_historico')
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- LOG DE EXECUÇÃO
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Tabela planos_acao criada com sucesso';
  RAISE NOTICE '✅ Tabela plano_acao_historico criada com sucesso';
  RAISE NOTICE '✅ Triggers automáticos configurados';
  RAISE NOTICE '✅ Políticas RLS aplicadas';
  RAISE NOTICE '✅ Campo tem_plano_acao adicionado em pesquisas_satisfacao';
  RAISE NOTICE '📊 Sistema de Plano de Ação pronto para uso!';
END $$;
