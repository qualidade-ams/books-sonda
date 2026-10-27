-- =====================================================================
-- Teste da migration 20261027000001_notificacao_replica_desatualizada.
--
-- Um único bloco DO. Se todas as verificações passarem, termina com o ERRO
-- proposital "TESTE OK — tudo revertido", que desfaz tudo o que o teste gravou.
-- Qualquer outra mensagem de erro diz qual verificação falhou.
-- =====================================================================
DO $teste$
DECLARE
  v_n record;
  v_abertas int;
BEGIN
  -- 1. Função SECURITY DEFINER com search_path fixo
  IF NOT EXISTS (SELECT 1 FROM pg_proc
                  WHERE proname = 'notificacoes_sync_replica'
                    AND pronamespace = 'public'::regnamespace
                    AND prosecdef
                    AND 'search_path=public' = ANY (coalesce(proconfig, '{}'))) THEN
    RAISE EXCEPTION 'notificacoes_sync_replica não existe, sem SECURITY DEFINER ou sem search_path fixo';
  END IF;

  -- 2. Só o sync-api (service_role) executa; usuários não
  IF has_function_privilege('authenticated', 'public.notificacoes_sync_replica(text, jsonb)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.notificacoes_sync_replica(text, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon/authenticated não deveriam executar notificacoes_sync_replica';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.notificacoes_sync_replica(text, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role deveria executar notificacoes_sync_replica';
  END IF;

  -- Parte de um estado sem notificação aberta
  DELETE FROM notificacoes WHERE chave = 'replica_desatualizada';

  -- 3. Atraso abre a notificação na tela Rotinas Automáticas
  PERFORM public.notificacoes_sync_replica('Apontamentos: há 3h10min', '{"tabelas":[{"tabela":"apontamentos"}]}'::jsonb);
  SELECT * INTO v_n FROM notificacoes WHERE chave = 'replica_desatualizada' AND resolvida_em IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atraso não abriu a notificação';
  END IF;
  IF v_n.tipo <> 'replica_desatualizada' OR v_n.screen_key <> 'sincronizacao_sql_server'
     OR v_n.link <> '/admin/rotinas-automaticas' OR v_n.mensagem <> 'Apontamentos: há 3h10min'
     OR v_n.titulo <> 'Banco réplica desatualizado' OR v_n.empresa_id IS NOT NULL
     OR v_n.referencia -> 'tabelas' -> 0 ->> 'tabela' <> 'apontamentos' THEN
    RAISE EXCEPTION 'Notificação aberta com dados errados: % / % / %', v_n.tipo, v_n.screen_key, v_n.mensagem;
  END IF;

  -- 4. Atraso de novo: continua uma só, com o texto atualizado
  PERFORM public.notificacoes_sync_replica('Apontamentos: há 4h10min', '{"tabelas":[]}'::jsonb);
  SELECT count(*) INTO v_abertas FROM notificacoes WHERE chave = 'replica_desatualizada' AND resolvida_em IS NULL;
  IF v_abertas <> 1 THEN
    RAISE EXCEPTION 'Esperada 1 notificação aberta, há %', v_abertas;
  END IF;
  IF (SELECT mensagem FROM notificacoes WHERE chave = 'replica_desatualizada' AND resolvida_em IS NULL)
     <> 'Apontamentos: há 4h10min' THEN
    RAISE EXCEPTION 'Mensagem da notificação aberta não foi atualizada';
  END IF;

  -- 5. Réplica em dia (mensagem nula) resolve
  PERFORM public.notificacoes_sync_replica(NULL, '{"tabelas":[]}'::jsonb);
  IF EXISTS (SELECT 1 FROM notificacoes WHERE chave = 'replica_desatualizada' AND resolvida_em IS NULL) THEN
    RAISE EXCEPTION 'Réplica em dia não resolveu a notificação';
  END IF;
  IF (SELECT resolvida_motivo FROM notificacoes WHERE id = v_n.id) IS NULL THEN
    RAISE EXCEPTION 'Notificação resolvida sem motivo';
  END IF;

  -- 6. Em dia sem notificação aberta: não faz nada (nem erro)
  PERFORM public.notificacoes_sync_replica(NULL, NULL);

  -- 7. Os tipos anteriores continuam aceitos
  PERFORM public.notificacoes_abrir('sincronizacao_legado_falha', 'empresas', 't', 'm', NULL, NULL,
                                    'teste_replica_tipos_antigos', '{}'::jsonb);

  RAISE EXCEPTION 'TESTE OK — tudo revertido';
END
$teste$;
