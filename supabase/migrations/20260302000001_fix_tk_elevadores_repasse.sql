-- Migration: Configurar repasse por período para TK ELEVADORES
-- Data: 2026-03-02
-- Descrição: Atualiza TK ELEVADORES com configuração de repasse por período

-- Verificar dados atuais da TK ELEVADORES
DO $$
DECLARE
  empresa_record RECORD;
BEGIN
  SELECT 
    id,
    nome_completo,
    possui_repasse_especial,
    tipo_repasse_especial,
    duracao_periodo_meses,
    percentual_dentro_periodo,
    percentual_entre_periodos,
    periodos_ate_zerar
  INTO empresa_record
  FROM empresas_clientes
  WHERE nome_completo ILIKE '%TK ELEVADORES%'
  LIMIT 1;
  
  IF FOUND THEN
    RAISE NOTICE '📊 Dados atuais da TK ELEVADORES:';
    RAISE NOTICE '  - ID: %', empresa_record.id;
    RAISE NOTICE '  - Nome: %', empresa_record.nome_completo;
    RAISE NOTICE '  - possui_repasse_especial: %', empresa_record.possui_repasse_especial;
    RAISE NOTICE '  - tipo_repasse_especial: %', empresa_record.tipo_repasse_especial;
    RAISE NOTICE '  - duracao_periodo_meses: %', empresa_record.duracao_periodo_meses;
    RAISE NOTICE '  - percentual_dentro_periodo: %', empresa_record.percentual_dentro_periodo;
    RAISE NOTICE '  - percentual_entre_periodos: %', empresa_record.percentual_entre_periodos;
    RAISE NOTICE '  - periodos_ate_zerar: %', empresa_record.periodos_ate_zerar;
  ELSE
    RAISE NOTICE '⚠️ TK ELEVADORES não encontrada';
  END IF;
END $$;

-- Atualizar TK ELEVADORES com configuração de repasse por período
UPDATE empresas_clientes
SET 
  possui_repasse_especial = true,
  tipo_repasse_especial = 'por_periodo',
  duracao_periodo_meses = 3,
  percentual_dentro_periodo = 100,
  percentual_entre_periodos = 70,
  periodos_ate_zerar = 2
WHERE nome_completo ILIKE '%TK ELEVADORES%';

-- Verificar se a atualização foi bem-sucedida
DO $$
DECLARE
  empresa_record RECORD;
BEGIN
  SELECT 
    id,
    nome_completo,
    possui_repasse_especial,
    tipo_repasse_especial,
    duracao_periodo_meses,
    percentual_dentro_periodo,
    percentual_entre_periodos,
    periodos_ate_zerar
  INTO empresa_record
  FROM empresas_clientes
  WHERE nome_completo ILIKE '%TK ELEVADORES%'
  LIMIT 1;
  
  IF FOUND THEN
    RAISE NOTICE '✅ Dados atualizados da TK ELEVADORES:';
    RAISE NOTICE '  - ID: %', empresa_record.id;
    RAISE NOTICE '  - Nome: %', empresa_record.nome_completo;
    RAISE NOTICE '  - possui_repasse_especial: %', empresa_record.possui_repasse_especial;
    RAISE NOTICE '  - tipo_repasse_especial: %', empresa_record.tipo_repasse_especial;
    RAISE NOTICE '  - duracao_periodo_meses: %', empresa_record.duracao_periodo_meses;
    RAISE NOTICE '  - percentual_dentro_periodo: %', empresa_record.percentual_dentro_periodo;
    RAISE NOTICE '  - percentual_entre_periodos: %', empresa_record.percentual_entre_periodos;
    RAISE NOTICE '  - periodos_ate_zerar: %', empresa_record.periodos_ate_zerar;
  END IF;
END $$;
