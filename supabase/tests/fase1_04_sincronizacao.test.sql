-- =====================================================================
-- Teste da migration 20261015000004_fase1_sincronizacao.
--
-- O próprio arquivo abre a transação e termina com ROLLBACK: nada fica gravado.
-- Grava no LEGADO como a tela atual faz e confere o efeito nas tabelas novas.
-- Cada verificação levanta exceção com a descrição do que falhou. Se chegar ao
-- fim, devolve 'ok'.
-- =====================================================================
BEGIN;

CREATE TEMP TABLE _t ON COMMIT DROP AS
SELECT gen_random_uuid() AS emp_a, gen_random_uuid() AS emp_b,
       gen_random_uuid() AS base1, gen_random_uuid() AS base2, gen_random_uuid() AS rep1;

-- Catálogo de produtos (a carga ainda não rodou): garante os 3 códigos
INSERT INTO produtos (codigo, nome, ordem) VALUES ('COMEX', 'COMEX', 1), ('FISCAL', 'FISCAL', 2), ('GALLERY', 'GALLERY', 3)
ON CONFLICT (codigo) DO NOTHING;

-- 1. Estrutura
DO $teste$
DECLARE
  v_tabela text;
BEGIN
  IF to_regclass('public.sincronizacao_legado_falhas') IS NULL THEN
    RAISE EXCEPTION 'Tabela sincronizacao_legado_falhas não existe';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.sincronizacao_legado_falhas'::regclass) THEN
    RAISE EXCEPTION 'sincronizacao_legado_falhas sem RLS';
  END IF;
  FOREACH v_tabela IN ARRAY ARRAY['empresas_clientes','empresa_produtos','baseline_historico','percentual_repasse_historico','taxas_clientes'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
                    WHERE c.relname = v_tabela AND t.tgname LIKE 'trg_sinc_%' AND NOT t.tgisinternal) THEN
      RAISE EXCEPTION 'Sem gatilho de sincronização em %', v_tabela;
    END IF;
  END LOOP;
END
$teste$;

-- 2. Empresa nova no legado
INSERT INTO empresas_clientes (id, nome_completo, nome_abreviado, status, tem_ams, tipo_book, email_gestor, vigencia_inicial, anexo)
SELECT emp_a, 'EMPRESA SINC A LTDA', 'SINC A', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', true FROM _t;

DO $teste$
DECLARE
  v_a uuid := (SELECT emp_a FROM _t);
  v_e empresas%ROWTYPE;
BEGIN
  SELECT * INTO v_e FROM empresas WHERE id = v_a;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empresa criada no legado não foi sincronizada'; END IF;
  IF v_e.nome_completo <> 'EMPRESA SINC A LTDA' OR v_e.nome_abreviado <> 'SINC A' OR v_e.status <> 'ativo'
     OR NOT v_e.tem_ams OR v_e.tipo_book <> 'qualidade' OR v_e.email_gestor <> 'gestor@sonda.com'
     OR v_e.vigencia_inicio <> '2025-01-01' OR NOT v_e.book_anexo OR v_e.sincronizado_em IS NULL
     OR v_e.modelo_calculo <> 'legado' THEN
    RAISE EXCEPTION 'Identidade sincronizada com valores errados';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM empresas_informacoes_contrato WHERE empresa_id = v_a) THEN
    RAISE EXCEPTION 'Informações do contrato não criadas';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM empresas_organizacoes_aranda WHERE empresa_id = v_a AND nome_organizacao = 'EMPRESA SINC A LTDA' AND ativo) THEN
    RAISE EXCEPTION 'Organização do Aranda não criada com o nome completo';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes WHERE tabela = 'empresas' AND registro_id = v_a::text AND origem = 'sincronizacao') THEN
    RAISE EXCEPTION 'Auditoria da sincronização sem origem "sincronizacao"';
  END IF;
  IF EXISTS (SELECT 1 FROM bancos_horas WHERE empresa_id = v_a) THEN
    RAISE EXCEPTION 'Criou banco para empresa sem tipo de contrato';
  END IF;
END
$teste$;

-- 3. Produtos: espelho exato
INSERT INTO empresa_produtos (empresa_id, produto) SELECT emp_a, 'COMEX' FROM _t;
INSERT INTO empresa_produtos (empresa_id, produto) SELECT emp_a, 'FISCAL' FROM _t;
DELETE FROM empresa_produtos WHERE empresa_id = (SELECT emp_a FROM _t) AND produto = 'FISCAL';

DO $teste$
DECLARE
  v_a uuid := (SELECT emp_a FROM _t);
BEGIN
  IF (SELECT array_agg(p.codigo ORDER BY p.codigo) FROM empresas_produtos ep JOIN produtos p ON p.id = ep.produto_id
       WHERE ep.empresa_id = v_a) IS DISTINCT FROM ARRAY['COMEX'] THEN
    RAISE EXCEPTION 'Produtos não espelham o legado (esperado só COMEX)';
  END IF;
END
$teste$;

-- 4. Renomear e suspender no legado
UPDATE empresas_clientes SET nome_completo = 'EMPRESA SINC A RENOMEADA LTDA', status = 'suspenso', descricao_status = 'teste'
 WHERE id = (SELECT emp_a FROM _t);

DO $teste$
DECLARE
  v_a uuid := (SELECT emp_a FROM _t);
BEGIN
  IF (SELECT nome_completo FROM empresas WHERE id = v_a) <> 'EMPRESA SINC A RENOMEADA LTDA' THEN
    RAISE EXCEPTION 'Renomear no legado não atualizou a empresa nova';
  END IF;
  IF (SELECT status FROM empresas WHERE id = v_a) <> 'inativo' THEN
    RAISE EXCEPTION 'Status suspenso não virou inativo (D-13)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM empresas_organizacoes_aranda WHERE empresa_id = v_a AND nome_organizacao = 'EMPRESA SINC A LTDA')
     OR EXISTS (SELECT 1 FROM empresas_organizacoes_aranda WHERE empresa_id = v_a AND nome_organizacao = 'EMPRESA SINC A RENOMEADA LTDA') THEN
    RAISE EXCEPTION 'Renomear no legado alterou a organização do Aranda (não deveria)';
  END IF;
END
$teste$;

-- Sem mudança real: não gera nova auditoria
DO $teste$
DECLARE
  v_a uuid := (SELECT emp_a FROM _t);
  v_antes int;
BEGIN
  SELECT count(*) INTO v_antes FROM auditoria_alteracoes WHERE tabela = 'empresas' AND registro_id = v_a::text;
  UPDATE empresas_clientes SET updated_at = now() WHERE id = v_a;
  IF (SELECT count(*) FROM auditoria_alteracoes WHERE tabela = 'empresas' AND registro_id = v_a::text) <> v_antes THEN
    RAISE EXCEPTION 'Gravação sem mudança de identidade gerou auditoria';
  END IF;
END
$teste$;

-- 5. Banco espelho: parâmetros + históricos do legado
UPDATE empresas_clientes SET status = 'ativo', tipo_contrato = 'horas', periodo_apuracao = 3, inicio_vigencia = '2026-01-01'
 WHERE id = (SELECT emp_a FROM _t);
INSERT INTO baseline_historico (id, empresa_id, baseline_horas, data_inicio, motivo)
SELECT base1, emp_a, 10.5, '2026-01-01', 'Inicial' FROM _t;
INSERT INTO percentual_repasse_historico (id, empresa_id, percentual, data_inicio, motivo)
SELECT rep1, emp_a, 50, '2026-01-01', 'Inicial' FROM _t;
INSERT INTO taxas_clientes (cliente_id, vigencia_inicio, tipo_produto)
SELECT emp_a, '2025-01-01', 'GALLERY' FROM _t;

DO $teste$
DECLARE
  v_a uuid := (SELECT emp_a FROM _t);
  v_b bancos_horas%ROWTYPE;
BEGIN
  SELECT * INTO v_b FROM bancos_horas WHERE empresa_id = v_a;
  IF NOT FOUND THEN RAISE EXCEPTION 'Banco espelho não foi criado'; END IF;
  IF NOT v_b.padrao OR NOT v_b.espelha_legado OR v_b.origem <> 'carga_legado' OR v_b.nome <> 'Banco de Horas'
     OR v_b.tipo_contrato <> 'horas' OR v_b.periodo_apuracao <> 3 OR v_b.inicio_vigencia <> '2026-01-01'
     OR v_b.taxa_produto <> 'GALLERY' OR v_b.repasse_especial <> 'nenhum' THEN
    RAISE EXCEPTION 'Banco espelho com parâmetros errados';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM bancos_horas_baseline WHERE id = (SELECT base1 FROM _t) AND banco_id = v_b.id
                  AND baseline_minutos = 630 AND credito = 'mensal' AND data_fim IS NULL) THEN
    RAISE EXCEPTION 'Baseline não espelhado (esperado 630 min, mesmo id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM bancos_horas_repasse WHERE id = (SELECT rep1 FROM _t) AND banco_id = v_b.id
                  AND percentual_mensal = 50) THEN
    RAISE EXCEPTION 'Repasse não espelhado (esperado 50%%, mesmo id)';
  END IF;
END
$teste$;

-- 6. Mudanças no legado continuam chegando ao espelho
UPDATE empresas_clientes SET periodo_apuracao = 6 WHERE id = (SELECT emp_a FROM _t);
-- nova vigência de baseline: o legado encerra a anterior
INSERT INTO baseline_historico (id, empresa_id, baseline_horas, data_inicio, motivo)
SELECT base2, emp_a, 12, '2026-04-01', 'Reajuste' FROM _t;

DO $teste$
DECLARE
  v_a uuid := (SELECT emp_a FROM _t);
BEGIN
  IF (SELECT periodo_apuracao FROM bancos_horas WHERE empresa_id = v_a) <> 6 THEN
    RAISE EXCEPTION 'Mudança de período no legado não chegou ao espelho';
  END IF;
  IF (SELECT count(*) FROM bancos_horas_baseline b JOIN bancos_horas bh ON bh.id = b.banco_id WHERE bh.empresa_id = v_a) <> 2 THEN
    RAISE EXCEPTION 'Nova vigência de baseline não espelhada';
  END IF;
  IF (SELECT data_fim FROM bancos_horas_baseline WHERE id = (SELECT base1 FROM _t))
     IS DISTINCT FROM (SELECT data_fim FROM baseline_historico WHERE id = (SELECT base1 FROM _t)) THEN
    RAISE EXCEPTION 'Encerramento da vigência anterior não espelhado';
  END IF;
END
$teste$;

-- 7. Editar o banco pelo app desliga o espelho
SELECT set_config('app.origem', '', true);
UPDATE bancos_horas SET descricao = 'editado pelo app' WHERE empresa_id = (SELECT emp_a FROM _t);
UPDATE empresas_clientes SET periodo_apuracao = 12 WHERE id = (SELECT emp_a FROM _t);

DO $teste$
DECLARE
  v_a uuid := (SELECT emp_a FROM _t);
BEGIN
  IF (SELECT espelha_legado FROM bancos_horas WHERE empresa_id = v_a) THEN
    RAISE EXCEPTION 'Editar o banco pelo app não desligou o espelho';
  END IF;
  IF (SELECT periodo_apuracao FROM bancos_horas WHERE empresa_id = v_a) <> 6 THEN
    RAISE EXCEPTION 'Banco com espelho desligado continuou recebendo o legado';
  END IF;
END
$teste$;

-- 8. Falha não bloqueia o legado: banco começando antes do contrato (D-12)
INSERT INTO empresas_clientes (id, nome_completo, nome_abreviado, status, tipo_contrato, periodo_apuracao, inicio_vigencia, vigencia_inicial)
SELECT emp_b, 'EMPRESA SINC B LTDA', 'SINC B', 'ativo', 'horas', 3, '2024-12-01', '2025-12-01' FROM _t;

DO $teste$
DECLARE
  v_b uuid := (SELECT emp_b FROM _t);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM empresas_clientes WHERE id = v_b) THEN
    RAISE EXCEPTION 'A gravação do legado foi bloqueada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM empresas WHERE id = v_b) THEN
    RAISE EXCEPTION 'A falha no banco impediu a sincronização da empresa';
  END IF;
  IF EXISTS (SELECT 1 FROM bancos_horas WHERE empresa_id = v_b) THEN
    RAISE EXCEPTION 'Criou banco violando a D-12';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM sincronizacao_legado_falhas WHERE registro_id = v_b::text AND resolvida_em IS NULL) THEN
    RAISE EXCEPTION 'Falha de sincronização não registrada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM notificacoes WHERE chave = 'sincronizacao_legado' AND resolvida_em IS NULL
                  AND screen_key = 'empresas') THEN
    RAISE EXCEPTION 'Falha de sincronização não gerou notificação';
  END IF;
END
$teste$;

-- resolver as falhas resolve a notificação
UPDATE sincronizacao_legado_falhas SET resolvida_em = now() WHERE resolvida_em IS NULL;

DO $teste$
BEGIN
  IF EXISTS (SELECT 1 FROM notificacoes WHERE chave = 'sincronizacao_legado' AND resolvida_em IS NULL) THEN
    RAISE EXCEPTION 'Notificação de falha não foi resolvida';
  END IF;
END
$teste$;

-- 9. Exclusão no legado: inativa e marca, sem apagar
DELETE FROM empresa_produtos WHERE empresa_id = (SELECT emp_b FROM _t);
DELETE FROM empresas_clientes WHERE id = (SELECT emp_b FROM _t);

DO $teste$
DECLARE
  v_b uuid := (SELECT emp_b FROM _t);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM empresas WHERE id = v_b AND status = 'inativo' AND excluida_no_legado_em IS NOT NULL) THEN
    RAISE EXCEPTION 'Exclusão no legado não inativou/marcou a empresa nova';
  END IF;
END
$teste$;

SELECT 'ok' AS resultado;

ROLLBACK;
