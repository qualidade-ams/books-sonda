-- =====================================================================
-- Teste da migration 20261022000004_fase3_bancos
-- (docs/especificacoes/Modelagem_Fase3.md, seção 4).
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou
-- (inclusive as linhas criadas no legado). Qualquer outra mensagem de erro diz
-- qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_empresa uuid := gen_random_uuid();
  v_banco uuid;
  v_falhou boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'bancos_horas' AND column_name = 'fim_vigencia'
                    AND data_type = 'date' AND is_nullable = 'YES') THEN
    RAISE EXCEPTION 'bancos_horas.fim_vigencia (date, opcional) não existe';
  END IF;

  INSERT INTO empresas_clientes (id, nome_completo, nome_abreviado, status, tem_ams, tipo_book, email_gestor, vigencia_inicial, anexo)
  VALUES (v_empresa, 'EMPRESA TESTE FASE 3 LTDA', 'TESTE F3', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false);

  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia,
                            taxa_produto, origem)
  VALUES (v_empresa, 'TESTE BANCO', false, 1, 'horas', 3, '2025-03-01', 'OUTROS', 'manual')
  RETURNING id INTO v_banco;

  -- Sem fim é o padrão; com fim, no dia 1 e não antes do início
  UPDATE bancos_horas SET fim_vigencia = '2025-12-01' WHERE id = v_banco;
  UPDATE bancos_horas SET fim_vigencia = '2025-03-01' WHERE id = v_banco;

  v_falhou := false;
  BEGIN UPDATE bancos_horas SET fim_vigencia = '2025-12-15' WHERE id = v_banco;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou fim de vigência fora do dia 1'; END IF;

  v_falhou := false;
  BEGIN UPDATE bancos_horas SET fim_vigencia = '2025-02-01' WHERE id = v_banco;
  EXCEPTION WHEN check_violation THEN v_falhou := true; END;
  IF NOT v_falhou THEN RAISE EXCEPTION 'Aceitou fim de vigência antes do início'; END IF;

  IF NOT EXISTS (SELECT 1 FROM auditoria_alteracoes
                  WHERE tabela = 'bancos_horas' AND registro_id = v_banco::text
                    AND 'fim_vigencia' = ANY (campos_alterados)) THEN
    RAISE EXCEPTION 'Alteração do fim de vigência não foi auditada';
  END IF;

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
