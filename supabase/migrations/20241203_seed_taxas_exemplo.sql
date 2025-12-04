-- =====================================================
-- SEED: DADOS DE EXEMPLO PARA TAXAS DE CLIENTES
-- =====================================================
-- Este arquivo é OPCIONAL e serve apenas para demonstração
-- Pode ser executado para criar dados de exemplo no ambiente de desenvolvimento

-- ATENÇÃO: Este script só deve ser executado em ambiente de desenvolvimento/teste
-- NÃO executar em produção sem revisar os dados

-- Comentar/descomentar conforme necessário

/*
-- Exemplo 1: Taxa para cliente com produto GALLERY
DO $$
DECLARE
  v_cliente_id UUID;
  v_taxa_id UUID;
  v_user_id UUID;
BEGIN
  -- Buscar primeiro cliente ativo (ajustar conforme necessário)
  SELECT id INTO v_cliente_id
  FROM empresas_clientes
  WHERE status = 'ativo'
  LIMIT 1;

  -- Buscar primeiro usuário admin
  SELECT id INTO v_user_id
  FROM auth.users
  LIMIT 1;

  IF v_cliente_id IS NOT NULL AND v_user_id IS NOT NULL THEN
    -- Criar taxa
    INSERT INTO taxas_clientes (
      cliente_id,
      vigencia_inicio,
      vigencia_fim,
      tipo_produto,
      criado_por
    ) VALUES (
      v_cliente_id,
      '2024-01-01',
      '2024-12-31',
      'GALLERY',
      v_user_id
    )
    RETURNING id INTO v_taxa_id;

    -- Inserir valores para hora remota
    INSERT INTO valores_taxas_funcoes (taxa_id, funcao, tipo_hora, valor_base) VALUES
    (v_taxa_id, 'Funcional', 'remota', 222.79),
    (v_taxa_id, 'Técnico / ABAP', 'remota', 275.80),
    (v_taxa_id, 'DBA / Basis', 'remota', 410.08),
    (v_taxa_id, 'Gestor', 'remota', 334.32);

    -- Inserir valores para hora local
    INSERT INTO valores_taxas_funcoes (taxa_id, funcao, tipo_hora, valor_base) VALUES
    (v_taxa_id, 'Funcional', 'local', 245.07),
    (v_taxa_id, 'Técnico / ABAP', 'local', 303.38),
    (v_taxa_id, 'DBA / Basis', 'local', 451.09),
    (v_taxa_id, 'Gestor', 'local', 367.75);

    RAISE NOTICE 'Taxa de exemplo criada com sucesso para produto GALLERY';
  ELSE
    RAISE WARNING 'Cliente ou usuário não encontrado para criar taxa de exemplo';
  END IF;
END $$;

-- Exemplo 2: Taxa para cliente com produto OUTROS
DO $$
DECLARE
  v_cliente_id UUID;
  v_taxa_id UUID;
  v_user_id UUID;
BEGIN
  -- Buscar segundo cliente ativo (ajustar conforme necessário)
  SELECT id INTO v_cliente_id
  FROM empresas_clientes
  WHERE status = 'ativo'
  OFFSET 1
  LIMIT 1;

  -- Buscar primeiro usuário admin
  SELECT id INTO v_user_id
  FROM auth.users
  LIMIT 1;

  IF v_cliente_id IS NOT NULL AND v_user_id IS NOT NULL THEN
    -- Criar taxa
    INSERT INTO taxas_clientes (
      cliente_id,
      vigencia_inicio,
      vigencia_fim,
      tipo_produto,
      criado_por
    ) VALUES (
      v_cliente_id,
      '2024-01-01',
      NULL, -- Vigência indefinida
      'OUTROS',
      v_user_id
    )
    RETURNING id INTO v_taxa_id;

    -- Inserir valores para hora remota
    INSERT INTO valores_taxas_funcoes (taxa_id, funcao, tipo_hora, valor_base) VALUES
    (v_taxa_id, 'Funcional', 'remota', 200.00),
    (v_taxa_id, 'Técnico (Instalação / Atualização)', 'remota', 250.00),
    (v_taxa_id, 'ABAP - PL/SQL', 'remota', 300.00),
    (v_taxa_id, 'DBA', 'remota', 380.00),
    (v_taxa_id, 'Gestor', 'remota', 320.00);

    -- Inserir valores para hora local
    INSERT INTO valores_taxas_funcoes (taxa_id, funcao, tipo_hora, valor_base) VALUES
    (v_taxa_id, 'Funcional', 'local', 220.00),
    (v_taxa_id, 'Técnico (Instalação / Atualização)', 'local', 275.00),
    (v_taxa_id, 'ABAP - PL/SQL', 'local', 330.00),
    (v_taxa_id, 'DBA', 'local', 418.00),
    (v_taxa_id, 'Gestor', 'local', 352.00);

    RAISE NOTICE 'Taxa de exemplo criada com sucesso para produto OUTROS';
  ELSE
    RAISE WARNING 'Cliente ou usuário não encontrado para criar taxa de exemplo';
  END IF;
END $$;
*/

-- Para executar os exemplos acima, remova os comentários /* e */
