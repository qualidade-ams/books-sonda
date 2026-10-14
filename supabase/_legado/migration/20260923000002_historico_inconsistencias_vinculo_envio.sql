-- =====================================================================
-- Histórico de emails de inconsistências: vincular cada envio à linha
-- da inconsistência e corrigir restrições que impediam a gravação.
--
-- Contexto: a aba "Emails Enviados" foi removida. O envio passa a ser
-- exibido na própria linha (bolinha verde ao lado do nº do chamado), o que
-- exige saber a qual inconsistência cada envio pertence.
--
-- 1. Nova coluna inconsistencia_id (FK para inconsistencias_chamados).
-- 2. Nova coluna email_cc (destinatários em cópia).
-- 3. data_atividade / data_sistema passam a aceitar NULL: tickets não têm
--    data_sistema, e o INSERT desses envios era recusado.
-- 4. CHECK de tipo_inconsistencia passa a aceitar ic_999999 e
--    sem_atualizacao (antes só mes_diferente, data_invertida, tempo_excessivo).
-- 5. Preenche inconsistencia_id dos envios antigos quando há correspondência
--    única com uma inconsistência.
--
-- RLS: nenhuma política é alterada (a tabela já tem RLS e as políticas atuais
-- de SELECT/INSERT para usuários autenticados atendem o novo uso).
-- =====================================================================

-- 1 e 2. Novas colunas
ALTER TABLE public.historico_inconsistencias_chamados
  ADD COLUMN IF NOT EXISTS inconsistencia_id UUID
    REFERENCES public.inconsistencias_chamados(id) ON DELETE SET NULL;

ALTER TABLE public.historico_inconsistencias_chamados
  ADD COLUMN IF NOT EXISTS email_cc TEXT;

CREATE INDEX IF NOT EXISTS idx_historico_inconsistencias_inconsistencia_id
  ON public.historico_inconsistencias_chamados(inconsistencia_id);

COMMENT ON COLUMN public.historico_inconsistencias_chamados.inconsistencia_id IS 'Inconsistência (inconsistencias_chamados.id) a que o envio se refere';
COMMENT ON COLUMN public.historico_inconsistencias_chamados.email_analista IS 'Destinatários (Para) do email, separados por ", "';
COMMENT ON COLUMN public.historico_inconsistencias_chamados.email_cc IS 'Destinatários em cópia (CC), separados por ", "';

-- 3. Datas opcionais
ALTER TABLE public.historico_inconsistencias_chamados
  ALTER COLUMN data_atividade DROP NOT NULL,
  ALTER COLUMN data_sistema DROP NOT NULL;

-- 4. Recriar CHECK de tipo_inconsistencia (remove qualquer CHECK existente na coluna,
--    independente do nome gerado)
DO $$
DECLARE
  v_constraint RECORD;
BEGIN
  FOR v_constraint IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'historico_inconsistencias_chamados'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%tipo_inconsistencia%'
  LOOP
    EXECUTE format('ALTER TABLE public.historico_inconsistencias_chamados DROP CONSTRAINT %I', v_constraint.conname);
  END LOOP;
END $$;

ALTER TABLE public.historico_inconsistencias_chamados
  ADD CONSTRAINT historico_inconsistencias_chamados_tipo_inconsistencia_check
  CHECK (tipo_inconsistencia IN ('mes_diferente', 'data_invertida', 'tempo_excessivo', 'ic_999999', 'sem_atualizacao'));

-- 5. Backfill: vincular envios antigos quando existe exatamente UMA inconsistência correspondente
--    - tickets: mesmo origem + nro_chamado + tipo (inconsistência é única por ticket)
--    - apontamentos: idem + mesma data (dia) de data_atividade
WITH candidatos AS (
  SELECT h.id AS historico_id, i.id AS inconsistencia_id,
         COUNT(*) OVER (PARTITION BY h.id) AS qtd
  FROM public.historico_inconsistencias_chamados h
  JOIN public.inconsistencias_chamados i
    ON i.origem = h.origem
   AND i.nro_chamado = h.nro_chamado
   AND i.tipo_inconsistencia = h.tipo_inconsistencia
   AND (
     h.origem = 'tickets'
     OR (h.data_atividade IS NOT NULL AND i.data_atividade IS NOT NULL
         AND (h.data_atividade AT TIME ZONE 'America/Sao_Paulo')::date
           = (i.data_atividade::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date)
   )
  WHERE h.inconsistencia_id IS NULL
)
UPDATE public.historico_inconsistencias_chamados h
SET inconsistencia_id = c.inconsistencia_id
FROM candidatos c
WHERE h.id = c.historico_id
  AND c.qtd = 1;
