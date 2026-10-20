-- =====================================================
-- Script Simples: Corrigir requerimentos com Hora Extra
-- =====================================================

-- Atualizar TODOS os requerimentos com tipo_cobranca = 'Hora Extra'
-- que não têm tipo_hora_extra definido
-- Valor padrão: '17h30-19h30' (Seg-Sex 17h30-19h30)

UPDATE requerimentos
SET tipo_hora_extra = '17h30-19h30'
WHERE tipo_cobranca = 'Hora Extra'
AND tipo_hora_extra IS NULL;

-- Verificar resultado
SELECT 
  'Requerimentos atualizados' as status,
  COUNT(*) as total
FROM requerimentos
WHERE tipo_cobranca = 'Hora Extra'
AND tipo_hora_extra = '17h30-19h30';

-- Verificar se ainda há algum sem tipo
SELECT 
  'Requerimentos ainda sem tipo' as status,
  COUNT(*) as total
FROM requerimentos
WHERE tipo_cobranca = 'Hora Extra'
AND tipo_hora_extra IS NULL;
