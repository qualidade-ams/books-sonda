-- =====================================================
-- Migração: Adicionar tela "Visualizar Pesquisas"
-- Data: 2024-12-15
-- Descrição: Adiciona nova tela para visualização de todas as pesquisas de satisfação
-- =====================================================

-- Inserir a nova tela no sistema de permissões
INSERT INTO screens (key, name, description, category, route)
VALUES (
  'visualizar_pesquisas',
  'Visualizar Pesquisas',
  'Visualização de todas as pesquisas de satisfação registradas no sistema',
  'Pesquisas de Satisfação',
  '/admin/visualizar-pesquisas'
)
ON CONFLICT (key) DO NOTHING;

-- Verificar se a tela foi inserida
DO $$
DECLARE
  v_screen_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM screens WHERE key = 'visualizar_pesquisas'
  ) INTO v_screen_exists;
  
  IF v_screen_exists THEN
    RAISE NOTICE '✅ Tela "Visualizar Pesquisas" registrada com sucesso';
  ELSE
    RAISE NOTICE '❌ Erro ao registrar tela "Visualizar Pesquisas"';
  END IF;
END $$;

-- Mostrar informações da nova tela
SELECT 
  key,
  name,
  description,
  category,
  route,
  created_at
FROM screens 
WHERE key = 'visualizar_pesquisas';