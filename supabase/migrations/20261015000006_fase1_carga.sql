-- =====================================================================
-- Fase 1 — migration 6: carga inicial (Modelagem_Fase1.md, seção 5)
--
-- Um único bloco DO: ou carrega tudo e a conferência bate, ou nada fica gravado.
--   1. produtos (COMEX, FISCAL, GALLERY)
--   2. módulos, a partir dos grupos do Book "PRODUTO - Módulo"
--      ("FISCAL GALLERY - X" → GALLERY, decisão P3)
--   3. de-para (grupos_aranda) a partir de de_para_categoria, mesmo id;
--      duplicados idênticos descartados; grupos sem produto = "nao_se_aplica"
--   4. módulo do requerimento → produto/módulo (decisão 9.3-11)
--   5. empresas, produtos, organizações do Aranda e informações do contrato
--      (mesmas funções da sincronização)
--   6. Banco padrão espelho para cada empresa com cadastro de banco completo
--      (tipo de contrato, início e período); as demais ficam sem banco e são
--      listadas no aviso final (hoje: 10 AMS sem tipo e a HYPERA PHARMA sem período)
--   7. conferência (seção 5.2): aborta tudo se algo não bater
-- Idempotente: pode rodar de novo sem duplicar.
-- =====================================================================
DO $carga$
DECLARE
  v_violacoes TEXT;
  v_esperado BIGINT;
  v_obtido BIGINT;
  v_empresa RECORD;
BEGIN
  PERFORM set_config('app.origem', 'carga', true);

  -- Pré-condição D-12: banco não começa antes da vigência do contrato
  SELECT string_agg(format('%s (banco %s, contrato %s)', nome_abreviado,
                           to_char(inicio_vigencia, 'MM/YYYY'), to_char(vigencia_inicial, 'DD/MM/YYYY')), '; ')
    INTO v_violacoes
    FROM empresas_clientes
   WHERE tipo_contrato IS NOT NULL
     AND inicio_vigencia < date_trunc('month', vigencia_inicial);
  IF v_violacoes IS NOT NULL THEN
    RAISE EXCEPTION 'Carga abortada: banco começa antes da vigência do contrato (D-12). Corrija na tela atual: %', v_violacoes;
  END IF;

  -- 1. Produtos
  INSERT INTO produtos (codigo, nome, ordem) VALUES
    ('COMEX', 'COMEX', 1), ('FISCAL', 'FISCAL', 2), ('GALLERY', 'GALLERY', 3)
  ON CONFLICT (codigo) DO NOTHING;

  -- 2. Módulos
  INSERT INTO produto_modulos (produto_id, nome, ordem)
  SELECT p.id, m.modulo, row_number() OVER (PARTITION BY p.id ORDER BY m.modulo)
    FROM (
      SELECT DISTINCT
             CASE WHEN grupo_book LIKE 'FISCAL GALLERY - %' THEN 'GALLERY'
                  WHEN grupo_book LIKE 'COMEX - %' THEN 'COMEX'
                  WHEN grupo_book LIKE 'FISCAL - %' THEN 'FISCAL' END AS produto,
             trim(regexp_replace(grupo_book, '^(FISCAL GALLERY|COMEX|FISCAL) - ', '')) AS modulo
        FROM de_para_categoria
    ) m
    JOIN produtos p ON p.codigo = m.produto
  ON CONFLICT DO NOTHING;

  -- 3. De-para de grupos (mesmo id; duplicados idênticos: fica o mais antigo)
  INSERT INTO grupos_aranda (id, grupo_aranda, grupo_book, produto_id, modulo_id, classificacao, ativo)
  SELECT d.id, d.grupo, d.grupo_book, pm.produto_id, pm.id,
         CASE WHEN pm.id IS NOT NULL THEN 'modulo' ELSE 'nao_se_aplica' END,
         COALESCE(d.status, 'ativa') = 'ativa'
    FROM (
      SELECT DISTINCT ON (grupo) id, grupo, grupo_book, status
        FROM de_para_categoria
       ORDER BY grupo, criado_em, id
    ) d
    LEFT JOIN produtos p ON p.codigo = CASE WHEN d.grupo_book LIKE 'FISCAL GALLERY - %' THEN 'GALLERY'
                                            WHEN d.grupo_book LIKE 'COMEX - %' THEN 'COMEX'
                                            WHEN d.grupo_book LIKE 'FISCAL - %' THEN 'FISCAL' END
    LEFT JOIN produto_modulos pm ON pm.produto_id = p.id
                                AND lower(pm.nome) = lower(trim(regexp_replace(d.grupo_book, '^(FISCAL GALLERY|COMEX|FISCAL) - ', '')))
  ON CONFLICT DO NOTHING;

  -- 4. Módulo do requerimento → produto/módulo (9.3-11)
  INSERT INTO modulos_requerimento_produto (modulo_requerimento, produto_id, modulo_id)
  SELECT v.modulo_requerimento, p.id, pm.id
    FROM (VALUES
      ('Comex', 'COMEX', NULL),
      ('Comply', 'FISCAL', NULL),
      ('pw.SATI', 'FISCAL', NULL),
      ('pw.SPED', 'FISCAL', NULL),
      ('pw.SATI/pw.SPED', 'FISCAL', NULL),
      ('Comply e-DOCS', 'FISCAL', 'COMPLY e-DOCS'),
      ('Gallery', 'GALLERY', NULL)
    ) AS v(modulo_requerimento, produto, modulo)
    JOIN produtos p ON p.codigo = v.produto
    LEFT JOIN produto_modulos pm ON pm.produto_id = p.id AND lower(pm.nome) = lower(v.modulo)
  ON CONFLICT (modulo_requerimento) DO NOTHING;

  IF EXISTS (SELECT 1 FROM modulos_requerimento_produto mrp
              WHERE mrp.modulo_requerimento = 'Comply e-DOCS' AND mrp.modulo_id IS NULL) THEN
    RAISE EXCEPTION 'Carga abortada: módulo "COMPLY e-DOCS" não encontrado no FISCAL';
  END IF;

  -- 5. Empresas (consolidadoras primeiro; a função também cuida disso)
  FOR v_empresa IN SELECT id FROM empresas_clientes ORDER BY (empresa_consolidadora_id IS NOT NULL), id LOOP
    PERFORM sinc_empresa_do_legado(v_empresa.id);
  END LOOP;

  -- 6. Bancos espelho
  FOR v_empresa IN SELECT id FROM empresas_clientes
                    WHERE tipo_contrato IS NOT NULL AND inicio_vigencia IS NOT NULL AND periodo_apuracao IS NOT NULL
                    ORDER BY id LOOP
    PERFORM sinc_banco_espelho(v_empresa.id);
  END LOOP;

  -- 7. Conferência (seção 5.2)
  SELECT count(*) INTO v_esperado FROM empresas_clientes;
  SELECT count(*) INTO v_obtido FROM empresas;
  IF v_obtido <> v_esperado THEN
    RAISE EXCEPTION 'Conferência: empresas % (legado %)', v_obtido, v_esperado;
  END IF;

  SELECT count(*) INTO v_obtido
    FROM empresas e JOIN empresas_clientes c ON c.id = e.id
   WHERE (e.nome_completo, e.nome_abreviado, e.email_gestor, e.tem_ams, e.vigencia_inicio, e.vigencia_fim, e.tipo_book)
         IS DISTINCT FROM
         (c.nome_completo, c.nome_abreviado, c.email_gestor, COALESCE(c.tem_ams, false), c.vigencia_inicial, c.vigencia_final,
          COALESCE(c.tipo_book::text, 'nao_tem_book'))
      OR e.status <> CASE WHEN c.status = 'ativo' THEN 'ativo' ELSE 'inativo' END;
  IF v_obtido <> 0 THEN
    RAISE EXCEPTION 'Conferência: % empresa(s) com identidade diferente do legado (CA-18)', v_obtido;
  END IF;

  SELECT count(DISTINCT (empresa_id, upper(produto))) INTO v_esperado FROM empresa_produtos;
  SELECT count(*) INTO v_obtido FROM empresas_produtos;
  IF v_obtido <> v_esperado THEN
    RAISE EXCEPTION 'Conferência: produtos das empresas % (legado %)', v_obtido, v_esperado;
  END IF;

  SELECT count(*) INTO v_obtido FROM empresas_organizacoes_aranda;
  SELECT count(*) INTO v_esperado FROM empresas;
  IF v_obtido <> v_esperado THEN
    RAISE EXCEPTION 'Conferência: organizações do Aranda % (esperado uma por empresa: %)', v_obtido, v_esperado;
  END IF;

  SELECT count(*) INTO v_esperado FROM empresas_clientes
   WHERE tipo_contrato IS NOT NULL AND inicio_vigencia IS NOT NULL AND periodo_apuracao IS NOT NULL;
  SELECT count(*) INTO v_obtido FROM bancos_horas WHERE padrao AND espelha_legado AND origem = 'carga_legado';
  IF v_obtido <> v_esperado THEN
    RAISE EXCEPTION 'Conferência: bancos padrão % (empresas com tipo de contrato %)', v_obtido, v_esperado;
  END IF;

  SELECT count(*) INTO v_esperado FROM baseline_historico h JOIN empresas_clientes e ON e.id = h.empresa_id
   WHERE e.tipo_contrato IS NOT NULL AND e.inicio_vigencia IS NOT NULL AND e.periodo_apuracao IS NOT NULL;
  SELECT count(*) INTO v_obtido FROM bancos_horas_baseline;
  IF v_obtido <> v_esperado THEN
    RAISE EXCEPTION 'Conferência: vigências de baseline % (legado %)', v_obtido, v_esperado;
  END IF;
  SELECT COALESCE(sum(round(h.baseline_horas * 60)), 0) INTO v_esperado
    FROM baseline_historico h JOIN empresas_clientes e ON e.id = h.empresa_id
   WHERE e.tipo_contrato IS NOT NULL AND e.inicio_vigencia IS NOT NULL AND e.periodo_apuracao IS NOT NULL;
  SELECT COALESCE(sum(baseline_minutos), 0) INTO v_obtido FROM bancos_horas_baseline;
  IF v_obtido <> v_esperado THEN
    RAISE EXCEPTION 'Conferência: soma dos baselines % min (legado % min)', v_obtido, v_esperado;
  END IF;

  SELECT count(*) INTO v_esperado FROM percentual_repasse_historico h JOIN empresas_clientes e ON e.id = h.empresa_id
   WHERE e.tipo_contrato IS NOT NULL AND e.inicio_vigencia IS NOT NULL AND e.periodo_apuracao IS NOT NULL;
  SELECT count(*) INTO v_obtido FROM bancos_horas_repasse;
  IF v_obtido <> v_esperado THEN
    RAISE EXCEPTION 'Conferência: vigências de repasse % (legado %)', v_obtido, v_esperado;
  END IF;

  SELECT count(DISTINCT grupo) INTO v_esperado FROM de_para_categoria;
  SELECT count(*) INTO v_obtido FROM grupos_aranda;
  IF v_obtido <> v_esperado THEN
    RAISE EXCEPTION 'Conferência: grupos do de-para % (legado %)', v_obtido, v_esperado;
  END IF;

  IF EXISTS (SELECT 1 FROM sincronizacao_legado_falhas WHERE resolvida_em IS NULL) THEN
    RAISE EXCEPTION 'Conferência: há falhas de sincronização abertas; verifique antes da carga';
  END IF;

  RAISE NOTICE 'Carga concluída: % empresas, % bancos, % módulos, % grupos do de-para',
    (SELECT count(*) FROM empresas), (SELECT count(*) FROM bancos_horas),
    (SELECT count(*) FROM produto_modulos), (SELECT count(*) FROM grupos_aranda);
  RAISE NOTICE 'Empresas AMS ativas sem banco (cadastro de banco incompleto no legado): %',
    (SELECT string_agg(nome_abreviado, ', ' ORDER BY nome_abreviado) FROM empresas_clientes
      WHERE tem_ams AND status = 'ativo'
        AND (tipo_contrato IS NULL OR inicio_vigencia IS NULL OR periodo_apuracao IS NULL));
END
$carga$;

-- Resumo (o SQL Editor nem sempre mostra os NOTICE)
SELECT
  (SELECT count(*) FROM empresas) AS empresas,
  (SELECT count(*) FROM empresas_produtos) AS produtos_contratados,
  (SELECT count(*) FROM empresas_organizacoes_aranda) AS organizacoes_aranda,
  (SELECT count(*) FROM bancos_horas) AS bancos,
  (SELECT count(*) FROM bancos_horas_baseline) AS vigencias_baseline,
  (SELECT count(*) FROM bancos_horas_repasse) AS vigencias_repasse,
  (SELECT count(*) FROM produto_modulos) AS modulos,
  (SELECT count(*) FROM grupos_aranda) AS grupos_de_para,
  (SELECT count(*) FROM modulos_requerimento_produto) AS modulos_requerimento,
  (SELECT string_agg(nome_abreviado, ', ' ORDER BY nome_abreviado) FROM empresas_clientes
    WHERE tem_ams AND status = 'ativo'
      AND (tipo_contrato IS NULL OR inicio_vigencia IS NULL OR periodo_apuracao IS NULL)) AS ams_sem_banco;
