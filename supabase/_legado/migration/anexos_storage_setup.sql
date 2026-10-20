-- Configuração do Supabase Storage para Anexos
-- Criação de buckets e políticas de acesso

-- Criar bucket para anexos temporários
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'anexos-temporarios',
  'anexos-temporarios',
  false, -- Não público, requer autenticação
  10485760, -- 10MB por arquivo
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Criar bucket para anexos permanentes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'anexos-permanentes',
  'anexos-permanentes',
  false, -- Não público, requer autenticação
  10485760, -- 10MB por arquivo
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso para bucket anexos-temporarios

-- Política para SELECT (download) - usuários autenticados com permissão
CREATE POLICY "Usuários podem baixar anexos temporários" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'anexos-temporarios' AND
    EXISTS (
      SELECT 1 FROM user_group_assignments uga
      JOIN screen_permissions sp ON uga.group_id = sp.group_id
      WHERE uga.user_id = auth.uid()
        AND sp.screen_key = 'controle_disparos_personalizados'
        AND sp.permission_level IN ('view', 'edit')
    )
  );

-- Política para INSERT (upload) - usuários com permissão de escrita
CREATE POLICY "Usuários podem fazer upload de anexos temporários" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'anexos-temporarios' AND
    EXISTS (
      SELECT 1 FROM user_group_assignments uga
      JOIN screen_permissions sp ON uga.group_id = sp.group_id
      WHERE uga.user_id = auth.uid()
        AND sp.screen_key = 'controle_disparos_personalizados'
        AND sp.permission_level = 'edit'
    )
  );

-- Política para UPDATE - usuários com permissão de escrita
CREATE POLICY "Usuários podem atualizar anexos temporários" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'anexos-temporarios' AND
    EXISTS (
      SELECT 1 FROM user_group_assignments uga
      JOIN screen_permissions sp ON uga.group_id = sp.group_id
      WHERE uga.user_id = auth.uid()
        AND sp.screen_key = 'controle_disparos_personalizados'
        AND sp.permission_level = 'edit'
    )
  );

-- Política para DELETE - apenas admins
CREATE POLICY "Apenas admins podem deletar anexos temporários" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'anexos-temporarios' AND
    EXISTS (
      SELECT 1 FROM user_group_assignments uga
      JOIN user_groups ug ON uga.group_id = ug.id
      WHERE uga.user_id = auth.uid()
        AND ug.is_default_admin = true
    )
  );

-- Políticas de acesso para bucket anexos-permanentes

-- Política para SELECT (download) - usuários autenticados com permissão
CREATE POLICY "Usuários podem baixar anexos permanentes" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'anexos-permanentes' AND
    EXISTS (
      SELECT 1 FROM user_group_assignments uga
      JOIN screen_permissions sp ON uga.group_id = sp.group_id
      WHERE uga.user_id = auth.uid()
        AND sp.screen_key IN ('controle_disparos_personalizados', 'historico_books')
        AND sp.permission_level IN ('view', 'edit')
    )
  );

-- Política para INSERT (movimentação do temporário) - sistema e admins
CREATE POLICY "Sistema pode mover anexos para permanente" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'anexos-permanentes' AND
    (
      auth.role() = 'service_role' OR
      EXISTS (
        SELECT 1 FROM user_group_assignments uga
        JOIN user_groups ug ON uga.group_id = ug.id
        WHERE uga.user_id = auth.uid()
          AND ug.is_default_admin = true
      )
    )
  );

-- Política para DELETE - apenas sistema e admins
CREATE POLICY "Sistema e admins podem deletar anexos permanentes" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'anexos-permanentes' AND
    (
      auth.role() = 'service_role' OR
      EXISTS (
        SELECT 1 FROM user_group_assignments uga
        JOIN user_groups ug ON uga.group_id = ug.id
        WHERE uga.user_id = auth.uid()
          AND ug.is_default_admin = true
      )
    )
  );

-- Função para gerar caminho organizado do arquivo
CREATE OR REPLACE FUNCTION gerar_caminho_anexo(
  p_empresa_id UUID,
  p_nome_arquivo VARCHAR,
  p_temporario BOOLEAN DEFAULT true
) RETURNS TEXT AS $$
DECLARE
  empresa_nome VARCHAR;
  data_atual DATE;
  bucket_path TEXT;
BEGIN
  -- Buscar nome abreviado da empresa
  SELECT nome_abreviado INTO empresa_nome
  FROM empresas_clientes
  WHERE id = p_empresa_id;
  
  -- Se não encontrar a empresa, usar o ID
  IF empresa_nome IS NULL THEN
    empresa_nome := p_empresa_id::TEXT;
  END IF;
  
  -- Limpar nome da empresa para uso em path
  empresa_nome := regexp_replace(empresa_nome, '[^a-zA-Z0-9_-]', '_', 'g');
  
  -- Data atual para organização
  data_atual := CURRENT_DATE;
  
  -- Construir caminho baseado no tipo
  IF p_temporario THEN
    bucket_path := format('%s/%s/temp/%s',
      empresa_nome,
      to_char(data_atual, 'YYYY-MM'),
      p_nome_arquivo
    );
  ELSE
    bucket_path := format('%s/%s/processed/%s',
      empresa_nome,
      to_char(data_atual, 'YYYY-MM'),
      p_nome_arquivo
    );
  END IF;
  
  RETURN bucket_path;
END;
$$ LANGUAGE plpgsql;

-- Comentários sobre a configuração de storage
COMMENT ON FUNCTION gerar_caminho_anexo(UUID, VARCHAR, BOOLEAN) IS 'Gera caminho organizado para arquivos no storage baseado na empresa e data';

-- Exemplo de estrutura de pastas gerada:
-- anexos-temporarios/
-- ├── empresa-abc/
-- │   ├── 2025-01/
-- │   │   ├── temp/
-- │   │   │   ├── arquivo1_uuid.pdf
-- │   │   │   └── arquivo2_uuid.docx
-- │   │   └── processed/
-- │   │       ├── arquivo1_uuid.pdf
-- │   │       └── arquivo2_uuid.docx
-- │   └── 2025-02/
-- │       └── temp/
-- └── empresa-xyz/
--     └── 2025-01/
--         └── temp/