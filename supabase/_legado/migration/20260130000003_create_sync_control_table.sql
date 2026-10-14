-- =====================================================
-- Migration: Criar tabela de controle de sincronização
-- Data: 30/01/2026
-- Descrição: Tabela para armazenar informações de controle de sincronização incremental
-- =====================================================

-- Criar tabela de controle de sincronização
CREATE TABLE IF NOT EXISTS public.sync_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'error', 'running')),
  last_sync_error TEXT,
  records_synced INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  sync_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_sync_control_table_name 
  ON public.sync_control(table_name);

CREATE INDEX IF NOT EXISTS idx_sync_control_last_sync_at 
  ON public.sync_control(last_sync_at DESC);

-- Comentários
COMMENT ON TABLE public.sync_control IS 
  'Tabela de controle para sincronização incremental - armazena informações sobre a última sincronização de cada tabela';

COMMENT ON COLUMN public.sync_control.table_name IS 
  'Nome da tabela sincronizada (ex: apontamentos_aranda, apontamentos_tickets_aranda)';

COMMENT ON COLUMN public.sync_control.last_sync_at IS 
  'Timestamp da última sincronização bem-sucedida';

COMMENT ON COLUMN public.sync_control.last_sync_status IS 
  'Status da última sincronização: success, error, running';

COMMENT ON COLUMN public.sync_control.last_sync_error IS 
  'Mensagem de erro da última sincronização (se houver)';

COMMENT ON COLUMN public.sync_control.records_synced IS 
  'Total de registros sincronizados na última execução';

COMMENT ON COLUMN public.sync_control.records_inserted IS 
  'Total de registros inseridos na última execução';

COMMENT ON COLUMN public.sync_control.records_updated IS 
  'Total de registros atualizados na última execução';

COMMENT ON COLUMN public.sync_control.records_failed IS 
  'Total de registros que falharam na última execução';

COMMENT ON COLUMN public.sync_control.sync_duration_ms IS 
  'Duração da última sincronização em milissegundos';

-- Inserir registros iniciais para as tabelas
INSERT INTO public.sync_control (table_name, last_sync_status)
VALUES 
  ('apontamentos_aranda', 'success'),
  ('apontamentos_tickets_aranda', 'success')
ON CONFLICT (table_name) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.sync_control ENABLE ROW LEVEL SECURITY;

-- Políticas RLS otimizadas (sem re-avaliação de funções)
-- Política para service_role (acesso total)
CREATE POLICY "service_role_all_sync_control" ON public.sync_control
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Política para authenticated users (apenas leitura)
CREATE POLICY "authenticated_select_sync_control" ON public.sync_control
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para anon (apenas leitura de registros bem-sucedidos)
CREATE POLICY "anon_select_sync_control" ON public.sync_control
  FOR SELECT
  TO anon
  USING (last_sync_status = 'success');

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_sync_control_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_sync_control_updated_at
  BEFORE UPDATE ON public.sync_control
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sync_control_updated_at();

-- Conceder permissões
GRANT SELECT ON public.sync_control TO authenticated;
GRANT ALL ON public.sync_control TO service_role;

-- Verificação
DO $$
BEGIN
  RAISE NOTICE '✅ Tabela sync_control criada com sucesso';
  RAISE NOTICE '   - Armazena informações de controle de sincronização';
  RAISE NOTICE '   - Registros iniciais criados para apontamentos_aranda e apontamentos_tickets_aranda';
  RAISE NOTICE '   - RLS habilitado com políticas de segurança';
END $$;

