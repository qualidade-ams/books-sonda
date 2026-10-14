-- Inconsistências de chamados: novo status 'descartada'.
--
-- O botão "Arquivar" da Auditoria passa a ter duas opções:
--   - Arquivar inconsistência: status 'resolvida' (vai para o Histórico)
--   - Descartar: status 'descartada' (não aparece em nenhuma aba)
--
-- A linha descartada não é apagada: ela fica com arquivado_manualmente = true,
-- e a detecção do sync-api ignora essa chave_unica. Se fosse apagada, a próxima
-- sincronização detectaria e recriaria a mesma inconsistência.
--
-- Sem mudança de RLS: o descarte é um UPDATE, já coberto pela política existente.

ALTER TABLE public.inconsistencias_chamados
  DROP CONSTRAINT IF EXISTS inconsistencias_chamados_status_check;

ALTER TABLE public.inconsistencias_chamados
  ADD CONSTRAINT inconsistencias_chamados_status_check
  CHECK (status IN ('ativa', 'resolvida', 'descartada'));
