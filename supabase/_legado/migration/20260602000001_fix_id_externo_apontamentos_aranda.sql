-- Migration: Reescrever id_externo da tabela apontamentos_aranda
-- Data: 02/06/2026
-- Motivo: O formato antigo incluía Data_Atividade na chave, que pode mudar quando o
--         usuário edita a tarefa no Aranda, causando duplicatas na sincronização.
--         Novo formato: AMSapontamento|{nro_chamado}|{nro_tarefa} (imutável)
--
-- ATENÇÃO: Esta migration reescreve os id_externo existentes.
--          Deve ser executada ANTES de reiniciar o sync para evitar duplicatas.

-- ============================================
-- PASSO 1: Verificar duplicatas ANTES (diagnóstico)
-- ============================================
-- Registros que teriam o mesmo novo id_externo (colisões potenciais)
-- SELECT
--   'AMSapontamento|' || nro_chamado || '|' || nro_tarefa AS novo_id_externo,
--   COUNT(*) AS total,
--   array_agg(id_externo) AS ids_antigos
-- FROM apontamentos_aranda
-- WHERE origem = 'sql_server'
--   AND nro_chamado IS NOT NULL
--   AND nro_tarefa IS NOT NULL
-- GROUP BY novo_id_externo
-- HAVING COUNT(*) > 1;

-- ============================================
-- PASSO 2: Para registros com mesmo nro_chamado + nro_tarefa (duplicatas geradas pelo
--          formato antigo), manter apenas o mais recente (maior data_ult_modificacao_geral)
-- ============================================
DELETE FROM apontamentos_aranda
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY nro_chamado, nro_tarefa
        ORDER BY COALESCE(data_ult_modificacao_geral, created_at) DESC
      ) AS rn
    FROM apontamentos_aranda
    WHERE origem = 'sql_server'
      AND nro_chamado IS NOT NULL
      AND nro_tarefa IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- ============================================
-- PASSO 3: Reescrever id_externo no novo formato
-- ============================================
UPDATE apontamentos_aranda
SET id_externo = 'AMSapontamento|' || nro_chamado || '|' || nro_tarefa
WHERE origem = 'sql_server'
  AND nro_chamado IS NOT NULL
  AND nro_tarefa IS NOT NULL;

-- ============================================
-- PASSO 4: Verificar resultado
-- ============================================
-- SELECT
--   COUNT(*) AS total_registros,
--   COUNT(DISTINCT id_externo) AS ids_unicos,
--   SUM(CASE WHEN id_externo LIKE 'AMSapontamento|%' THEN 1 ELSE 0 END) AS no_novo_formato
-- FROM apontamentos_aranda
-- WHERE origem = 'sql_server';
