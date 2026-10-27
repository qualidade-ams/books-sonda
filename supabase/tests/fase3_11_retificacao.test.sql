-- =====================================================================
-- Teste da migration 20261023000002_fase3_retificacao
-- (docs/especificacoes/Modelagem_Fase3.md, seção 7; decisão de 23/10/2026).
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
  v_fechamento uuid;
  v_book uuid;
  v_obs uuid;
  v_reajuste uuid;
  v_n int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'marcar_book_para_retificacao'
                    AND pronamespace = 'public'::regnamespace
                    AND prosecdef AND proconfig @> ARRAY['search_path=public']) THEN
    RAISE EXCEPTION 'marcar_book_para_retificacao ausente, sem SECURITY DEFINER ou sem search_path fixo';
  END IF;

  -- Cenário: banco com setembro/2026 fechado e o Book de setembro já enviado
  INSERT INTO empresas_clientes (id, nome_completo, nome_abreviado, status, tem_ams, tipo_book, email_gestor, vigencia_inicial, anexo)
  VALUES (v_empresa, 'EMPRESA TESTE RETIFICACAO LTDA', 'TESTE RETIFICACAO', 'ativo', true, 'qualidade', 'gestor@sonda.com', '2025-01-01', false);
  INSERT INTO bancos_horas (empresa_id, nome, padrao, ordem, tipo_contrato, periodo_apuracao, inicio_vigencia, taxa_produto, origem)
  VALUES (v_empresa, 'TESTE PADRÃO', true, 1, 'horas', 3, '2026-07-01', 'OUTROS', 'manual')
  RETURNING id INTO v_banco;
  INSERT INTO bancos_horas_fechamentos (banco_id, mes, ano, versao, motivo, nome_banco)
  VALUES (v_banco, 9, 2026, 1, 'geracao_book', 'TESTE PADRÃO')
  RETURNING id INTO v_fechamento;
  INSERT INTO books (empresa_id, mes, ano, status, precisa_retificacao)
  VALUES (v_empresa, 9, 2026, 'enviado', false)
  RETURNING id INTO v_book;

  -- -------------------------------------------------------------------
  -- 1. Observação manual em mês fechado marca o Book e abre o aviso
  -- -------------------------------------------------------------------
  INSERT INTO bancos_horas_observacoes (banco_id, mes, ano, texto, origem)
  VALUES (v_banco, 9, 2026, 'Atendimento extra combinado com o cliente', 'manual')
  RETURNING id INTO v_obs;
  IF (SELECT precisa_retificacao FROM books WHERE id = v_book) IS NOT TRUE THEN
    RAISE EXCEPTION 'Observação em mês fechado não marcou o Book para retificação';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM notificacoes WHERE tipo = 'book_precisa_retificacao'
                    AND chave = 'book_retificacao:' || v_book AND resolvida_em IS NULL) THEN
    RAISE EXCEPTION 'O aviso "Book precisa de retificação" não foi aberto';
  END IF;

  -- Editar e excluir (inativar) a observação também
  UPDATE books SET precisa_retificacao = false WHERE id = v_book;
  UPDATE bancos_horas_observacoes SET texto = 'Texto corrigido' WHERE id = v_obs;
  IF (SELECT precisa_retificacao FROM books WHERE id = v_book) IS NOT TRUE THEN
    RAISE EXCEPTION 'Editar a observação em mês fechado não marcou o Book';
  END IF;
  UPDATE books SET precisa_retificacao = false WHERE id = v_book;
  UPDATE bancos_horas_observacoes SET ativo = false WHERE id = v_obs;
  IF (SELECT precisa_retificacao FROM books WHERE id = v_book) IS NOT TRUE THEN
    RAISE EXCEPTION 'Excluir a observação em mês fechado não marcou o Book';
  END IF;

  -- -------------------------------------------------------------------
  -- 2. Reajuste manual em mês fechado marca; inativar também
  -- -------------------------------------------------------------------
  UPDATE books SET precisa_retificacao = false WHERE id = v_book;
  INSERT INTO bancos_horas_reajustes (banco_id, mes, ano, tipo, minutos, justificativa)
  VALUES (v_banco, 9, 2026, 'entrada', 60, 'Atendimento presencial não apontado')
  RETURNING id INTO v_reajuste;
  IF (SELECT precisa_retificacao FROM books WHERE id = v_book) IS NOT TRUE THEN
    RAISE EXCEPTION 'Reajuste em mês fechado não marcou o Book';
  END IF;
  UPDATE books SET precisa_retificacao = false WHERE id = v_book;
  UPDATE bancos_horas_reajustes SET ativo = false, motivo_inativacao = 'Duplicado' WHERE id = v_reajuste;
  IF (SELECT precisa_retificacao FROM books WHERE id = v_book) IS NOT TRUE THEN
    RAISE EXCEPTION 'Inativar reajuste em mês fechado não marcou o Book';
  END IF;

  -- -------------------------------------------------------------------
  -- 3. O que não marca
  -- -------------------------------------------------------------------
  UPDATE books SET precisa_retificacao = false WHERE id = v_book;

  -- Mês aberto (sem fechamento)
  INSERT INTO bancos_horas_observacoes (banco_id, mes, ano, texto, origem)
  VALUES (v_banco, 10, 2026, 'Mês aberto', 'manual');
  INSERT INTO bancos_horas_reajustes (banco_id, mes, ano, tipo, minutos, justificativa)
  VALUES (v_banco, 10, 2026, 'saida', 30, 'Mês aberto');
  -- Observação automática (nasce com o fechamento) e reajuste de retroativo
  INSERT INTO bancos_horas_observacoes (banco_id, mes, ano, texto, origem, fechamento_id)
  VALUES (v_banco, 9, 2026, '01:00 horas consumidas do Banco X', 'consumo_entre_bancos', v_fechamento);
  INSERT INTO bancos_horas_reajustes (banco_id, mes, ano, tipo, minutos, justificativa, origem)
  VALUES (v_banco, 9, 2026, 'entrada', 15, 'Retroativo aprovado', 'ajuste_retroativo');
  -- Fechamento substituído (não vigente) não conta
  UPDATE bancos_horas_fechamentos SET vigente = false WHERE id = v_fechamento;
  INSERT INTO bancos_horas_observacoes (banco_id, mes, ano, texto, origem)
  VALUES (v_banco, 9, 2026, 'Sem fechamento vigente', 'manual');

  IF (SELECT precisa_retificacao FROM books WHERE id = v_book) IS TRUE THEN
    RAISE EXCEPTION 'Marcou o Book sem mudança manual em mês fechado';
  END IF;

  -- Sem Book gerado para o mês: nada a marcar, e a gravação não falha
  UPDATE bancos_horas_fechamentos SET vigente = true WHERE id = v_fechamento;
  DELETE FROM books WHERE id = v_book;
  INSERT INTO bancos_horas_observacoes (banco_id, mes, ano, texto, origem)
  VALUES (v_banco, 9, 2026, 'Sem Book', 'manual');

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
