-- ============================================
-- Migration: Criar tabela apontamentos_aranda
-- Data: 19/01/2026
-- Descrição: Tabela para sincronizar dados da tabela AMSapontamento do SQL Server Aranda
-- ============================================

-- Criar tabela apontamentos_aranda
CREATE TABLE IF NOT EXISTS public.apontamentos_aranda (
  -- Campos de controle
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origem TEXT NOT NULL DEFAULT 'sql_server' CHECK (origem IN ('sql_server', 'manual')),
  id_externo TEXT NOT NULL UNIQUE, -- ID único gerado a partir dos campos do SQL Server
  
  -- Campos da tabela AMSapontamento
  nro_chamado TEXT,
  tipo_chamado TEXT,
  org_us_final TEXT,
  categoria TEXT,
  causa_raiz TEXT,
  solicitante TEXT,
  us_final_afetado TEXT,
  data_abertura TIMESTAMPTZ,
  data_sistema TIMESTAMPTZ,
  data_atividade TIMESTAMPTZ,
  data_fechamento TIMESTAMPTZ,
  data_ult_modificacao TIMESTAMPTZ,
  ativi_interna TEXT,
  caso_estado TEXT,
  caso_grupo TEXT,
  nro_tarefa TEXT,
  descricao_tarefa TEXT,
  tempo_gasto_segundos FLOAT,
  tempo_gasto_minutos FLOAT,
  tempo_gasto_horas TEXT,
  item_configuracao TEXT,
  analista_tarefa TEXT,
  analista_caso TEXT,
  estado_tarefa TEXT,
  resumo_tarefa TEXT,
  grupo_tarefa TEXT,
  problema TEXT,
  cod_resolucao TEXT,
  log TIMESTAMPTZ,
  
  -- Campos de auditoria
  autor_id UUID REFERENCES auth.users(id),
  autor_nome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_apontamentos_aranda_origem ON public.apontamentos_aranda(origem);
CREATE INDEX IF NOT EXISTS idx_apontamentos_aranda_id_externo ON public.apontamentos_aranda(id_externo);
CREATE INDEX IF NOT EXISTS idx_apontamentos_aranda_nro_chamado ON public.apontamentos_aranda(nro_chamado);
CREATE INDEX IF NOT EXISTS idx_apontamentos_aranda_data_abertura ON public.apontamentos_aranda(data_abertura);
CREATE INDEX IF NOT EXISTS idx_apontamentos_aranda_data_fechamento ON public.apontamentos_aranda(data_fechamento);
CREATE INDEX IF NOT EXISTS idx_apontamentos_aranda_caso_grupo ON public.apontamentos_aranda(caso_grupo);
CREATE INDEX IF NOT EXISTS idx_apontamentos_aranda_analista_tarefa ON public.apontamentos_aranda(analista_tarefa);
CREATE INDEX IF NOT EXISTS idx_apontamentos_aranda_created_at ON public.apontamentos_aranda(created_at);

-- Habilitar RLS
ALTER TABLE public.apontamentos_aranda ENABLE ROW LEVEL SECURITY;

-- Políticas RLS otimizadas para performance
-- SELECT: Todos os usuários autenticados podem visualizar
CREATE POLICY "Users can view apontamentos" ON public.apontamentos_aranda
  FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- INSERT: Apenas service_role pode inserir (sincronização)
CREATE POLICY "Service role can insert apontamentos" ON public.apontamentos_aranda
  FOR INSERT WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'service_role'
  );

-- UPDATE: Apenas service_role pode atualizar (sincronização)
CREATE POLICY "Service role can update apontamentos" ON public.apontamentos_aranda
  FOR UPDATE USING (
    (SELECT auth.jwt()->>'role') = 'service_role'
  );

-- DELETE: Apenas service_role pode deletar
CREATE POLICY "Service role can delete apontamentos" ON public.apontamentos_aranda
  FOR DELETE USING (
    (SELECT auth.jwt()->>'role') = 'service_role'
  );

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_apontamentos_aranda_updated_at()
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

CREATE TRIGGER trigger_update_apontamentos_aranda_updated_at
  BEFORE UPDATE ON public.apontamentos_aranda
  FOR EACH ROW
  EXECUTE FUNCTION public.update_apontamentos_aranda_updated_at();

-- Comentários na tabela
COMMENT ON TABLE public.apontamentos_aranda IS 'Tabela para sincronizar apontamentos da tabela AMSapontamento do SQL Server Aranda (a partir de 01/01/2026)';
COMMENT ON COLUMN public.apontamentos_aranda.id_externo IS 'ID único gerado a partir dos campos do SQL Server para evitar duplicatas';
COMMENT ON COLUMN public.apontamentos_aranda.origem IS 'Origem do registro: sql_server (sincronização automática) ou manual';
COMMENT ON COLUMN public.apontamentos_aranda.tempo_gasto_segundos IS 'Tempo gasto em segundos (FLOAT do SQL Server)';
COMMENT ON COLUMN public.apontamentos_aranda.tempo_gasto_minutos IS 'Tempo gasto em minutos (FLOAT do SQL Server)';
COMMENT ON COLUMN public.apontamentos_aranda.tempo_gasto_horas IS 'Tempo gasto em horas (VARCHAR do SQL Server)';

-- Conceder permissões
GRANT SELECT ON public.apontamentos_aranda TO authenticated;
GRANT ALL ON public.apontamentos_aranda TO service_role;
