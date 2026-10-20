-- ============================================
-- Migration: Criar tabela de histórico de inconsistências
-- Data: 27/01/2026
-- Descrição: Tabela para armazenar inconsistências já notificadas
-- ============================================

-- Criar tabela de histórico
CREATE TABLE IF NOT EXISTS public.historico_inconsistencias_chamados (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dados da inconsistência original
  origem TEXT NOT NULL CHECK (origem IN ('apontamentos', 'tickets')),
  nro_chamado TEXT NOT NULL,
  tipo_inconsistencia TEXT NOT NULL CHECK (tipo_inconsistencia IN ('mes_diferente', 'data_invertida', 'tempo_excessivo')),
  
  -- Datas
  data_atividade TIMESTAMPTZ NOT NULL,
  data_sistema TIMESTAMPTZ NOT NULL,
  
  -- Tempo
  tempo_gasto_horas TEXT,
  tempo_gasto_minutos FLOAT,
  
  -- Informações adicionais
  empresa TEXT,
  analista TEXT,
  tipo_chamado TEXT,
  
  -- Descrição da inconsistência
  descricao_inconsistencia TEXT NOT NULL,
  
  -- Dados do envio
  data_envio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_analista TEXT,
  enviado_por UUID REFERENCES auth.users(id),
  enviado_por_nome TEXT,
  
  -- Período de referência
  mes_referencia INTEGER NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
  ano_referencia INTEGER NOT NULL CHECK (ano_referencia >= 2020),
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_historico_inconsistencias_origem ON public.historico_inconsistencias_chamados(origem);
CREATE INDEX IF NOT EXISTS idx_historico_inconsistencias_nro_chamado ON public.historico_inconsistencias_chamados(nro_chamado);
CREATE INDEX IF NOT EXISTS idx_historico_inconsistencias_tipo ON public.historico_inconsistencias_chamados(tipo_inconsistencia);
CREATE INDEX IF NOT EXISTS idx_historico_inconsistencias_analista ON public.historico_inconsistencias_chamados(analista);
CREATE INDEX IF NOT EXISTS idx_historico_inconsistencias_data_envio ON public.historico_inconsistencias_chamados(data_envio);
CREATE INDEX IF NOT EXISTS idx_historico_inconsistencias_periodo ON public.historico_inconsistencias_chamados(mes_referencia, ano_referencia);

-- Habilitar RLS
ALTER TABLE public.historico_inconsistencias_chamados ENABLE ROW LEVEL SECURITY;

-- Políticas RLS otimizadas para performance
-- SELECT: Todos os usuários autenticados podem visualizar
CREATE POLICY "Users can view historico" ON public.historico_inconsistencias_chamados
  FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- INSERT: Apenas usuários autenticados podem inserir
CREATE POLICY "Users can insert historico" ON public.historico_inconsistencias_chamados
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- UPDATE: Apenas service_role pode atualizar
CREATE POLICY "Service role can update historico" ON public.historico_inconsistencias_chamados
  FOR UPDATE USING (
    (SELECT auth.jwt()->>'role') = 'service_role'
  );

-- DELETE: Apenas service_role pode deletar
CREATE POLICY "Service role can delete historico" ON public.historico_inconsistencias_chamados
  FOR DELETE USING (
    (SELECT auth.jwt()->>'role') = 'service_role'
  );

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_historico_inconsistencias_updated_at()
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

CREATE TRIGGER trigger_update_historico_inconsistencias_updated_at
  BEFORE UPDATE ON public.historico_inconsistencias_chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_historico_inconsistencias_updated_at();

-- Comentários na tabela
COMMENT ON TABLE public.historico_inconsistencias_chamados IS 'Histórico de inconsistências de chamados já notificadas aos analistas';
COMMENT ON COLUMN public.historico_inconsistencias_chamados.origem IS 'Origem da inconsistência: apontamentos ou tickets';
COMMENT ON COLUMN public.historico_inconsistencias_chamados.tipo_inconsistencia IS 'Tipo de inconsistência detectada';
COMMENT ON COLUMN public.historico_inconsistencias_chamados.data_envio IS 'Data e hora do envio da notificação';
COMMENT ON COLUMN public.historico_inconsistencias_chamados.mes_referencia IS 'Mês de referência da inconsistência (1-12)';
COMMENT ON COLUMN public.historico_inconsistencias_chamados.ano_referencia IS 'Ano de referência da inconsistência';

-- Conceder permissões
GRANT SELECT ON public.historico_inconsistencias_chamados TO authenticated;
GRANT INSERT ON public.historico_inconsistencias_chamados TO authenticated;
GRANT ALL ON public.historico_inconsistencias_chamados TO service_role;

-- Verificar se a tabela foi criada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'historico_inconsistencias_chamados') THEN
    RAISE NOTICE '✅ Tabela "historico_inconsistencias_chamados" criada com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Falha ao criar tabela "historico_inconsistencias_chamados"';
  END IF;
END $$;
