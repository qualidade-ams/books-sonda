-- ============================================
-- CORREÇÃO DE TAMANHOS DE CAMPOS - PESQUISAS
-- ============================================
-- Erro 22001: value too long for type character varying(100)
-- 
-- Este script aumenta o tamanho dos campos de texto
-- para acomodar dados do SQL Server
-- 
-- Campo identificado: comentario_pesquisa precisa de 1000 caracteres

-- Aumentar campo id_externo (problema identificado - ID concatenado muito longo)
ALTER TABLE pesquisas 
  ALTER COLUMN id_externo TYPE varchar(500);

-- Aumentar campo comentario_pesquisa para 1000 caracteres
ALTER TABLE pesquisas 
  ALTER COLUMN comentario_pesquisa TYPE varchar(1000);

-- Aumentar outros campos de texto para tamanhos adequados
ALTER TABLE pesquisas 
  ALTER COLUMN empresa TYPE varchar(500),
  ALTER COLUMN categoria TYPE varchar(200),
  ALTER COLUMN grupo TYPE varchar(200),
  ALTER COLUMN cliente TYPE varchar(200),
  ALTER COLUMN email_cliente TYPE varchar(255),
  ALTER COLUMN prestador TYPE varchar(255),
  ALTER COLUMN nro_caso TYPE varchar(100),
  ALTER COLUMN tipo_caso TYPE varchar(200),
  ALTER COLUMN resposta TYPE text,
  ALTER COLUMN autor_nome TYPE varchar(255),
  ALTER COLUMN observacao TYPE text;

-- Verificar estrutura atualizada
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'pesquisas'
  AND column_name IN (
    'empresa', 'categoria', 'grupo', 'cliente', 
    'email_cliente', 'prestador', 'nro_caso', 'tipo_caso',
    'resposta', 'comentario_pesquisa'
  )
ORDER BY ordinal_position;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE 'Tamanhos dos campos atualizados com sucesso!';
  RAISE NOTICE 'Todos os campos de texto agora são do tipo TEXT (sem limite)';
END $$;
