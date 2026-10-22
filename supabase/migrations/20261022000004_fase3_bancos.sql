-- =====================================================================
-- Fase 3 — migration 12: fim de vigência do banco
-- (docs/especificacoes/Modelagem_Fase3.md, seção 4)
--
-- bancos_horas.fim_vigencia: último mês em que o banco vale (opcional), no dia 1 e
-- não anterior ao início. Depois dele as horas vão para o Banco padrão, e o último
-- mês aplica a regra de fim de período (pergunta P1): isso fica no motor
-- (TypeScript). Autoria, auditoria e RLS são os da Fase 1.
-- =====================================================================

ALTER TABLE bancos_horas ADD COLUMN IF NOT EXISTS fim_vigencia DATE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bancos_horas_fim_vigencia_ck') THEN
    ALTER TABLE bancos_horas ADD CONSTRAINT bancos_horas_fim_vigencia_ck CHECK (
      fim_vigencia IS NULL OR (extract(day FROM fim_vigencia) = 1 AND fim_vigencia >= inicio_vigencia)
    );
  END IF;
END $$;
