-- Migração para permitir templates personalizados no campo template_padrao
-- Data: 2025-01-15
-- Descrição: Remove a constraint que limitava template_padrao apenas a 'portugues' e 'ingles'
--           para permitir IDs de templates personalizados

-- 1. Remover a constraint existente
ALTER TABLE public.empresas_clientes 
DROP CONSTRAINT IF EXISTS empresas_clientes_template_padrao_check;

-- 2. Alterar o campo para aceitar qualquer string (mantendo o tamanho máximo)
ALTER TABLE public.empresas_clientes 
ALTER COLUMN template_padrao TYPE VARCHAR(255);

-- 3. Adicionar comentário explicativo
COMMENT ON COLUMN public.empresas_clientes.template_padrao IS 
'Template de email para books. Pode ser "portugues", "ingles" (templates padrão) ou UUID de template personalizado da tabela email_templates';

-- 4. Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_empresas_clientes_template_padrao 
ON public.empresas_clientes(template_padrao);

-- 5. Verificar se existem dados inconsistentes (opcional - para debug)
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM public.empresas_clientes 
    WHERE template_padrao IS NOT NULL 
    AND template_padrao NOT IN ('portugues', 'ingles')
    AND NOT EXISTS (
        SELECT 1 FROM public.email_templates 
        WHERE id::text = template_padrao 
        AND ativo = true 
        AND formulario = 'book'
    );
    
    IF invalid_count > 0 THEN
        RAISE NOTICE 'Encontradas % empresas com template_padrao inválido', invalid_count;
    ELSE
        RAISE NOTICE 'Todos os templates estão válidos';
    END IF;
END $$;