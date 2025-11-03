-- =====================================================
-- Atualização da Constraint de Módulos
-- =====================================================
-- Script para adicionar novos módulos à tabela requerimentos
-- =====================================================

-- Passo 1: Remover a constraint existente
ALTER TABLE requerimentos 
DROP CONSTRAINT IF EXISTS valid_modulo;

-- Passo 2: Adicionar nova constraint com todos os módulos (antigos + novos)
ALTER TABLE requerimentos 
ADD CONSTRAINT valid_modulo CHECK (
  modulo IN (
    'Comex',
    'Comply', 
    'Comply e-DOCS', 
    'Gallery', 
    'pw.SATI', 
    'pw.SPED', 
    'pw.SATI/pw.SPED'
  )
);

-- Verificar se a constraint foi aplicada corretamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc
      ON tc.constraint_name = cc.constraint_name
    WHERE tc.constraint_name = 'valid_modulo'
      AND tc.table_name = 'requerimentos'
  ) THEN
    RAISE NOTICE '✅ Constraint valid_modulo atualizada com sucesso!';
    RAISE NOTICE 'Módulos válidos: Comex, Comply, Comply e-DOCS, Gallery, pw.SATI, pw.SPED, pw.SATI/pw.SPED';
  ELSE
    RAISE EXCEPTION '❌ Erro: Constraint valid_modulo não foi criada corretamente';
  END IF;
END $$;


-- Opcional: Verificar dados existentes que podem violar a nova constraint
SELECT DISTINCT modulo, COUNT(*) as quantidade
FROM requerimentos 
WHERE modulo NOT IN (
  'Comex',
  'Comply', 
  'Comply e-DOCS', 
  'Gallery', 
  'pw.SATI', 
  'pw.SPED', 
  'pw.SATI/pw.SPED'
)
GROUP BY modulo
ORDER BY modulo;