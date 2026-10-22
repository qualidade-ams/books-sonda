-- =====================================================================
-- Consultores x Coordenadores
--
-- Liga cada consultor (especialistas) a um responsável do organograma
-- (organizacao_estrutura com cargo Coordenador, Gerente ou Diretor). O email do
-- responsável entra no CC do email de inconsistências de chamados, nas telas
-- Inconsistência de Chamados e Monitoramento de Chamados.
--
-- Um consultor tem no máximo um coordenador: a chave primária é especialista_id.
--
-- O organograma só é legível para quem tem a tela "organograma". Por isso as duas
-- leituras abaixo são funções SECURITY DEFINER, cada uma liberada só para as telas
-- que precisam dela.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabela
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS especialistas_coordenadores (
  especialista_id UUID PRIMARY KEY REFERENCES especialistas(id) ON DELETE CASCADE,
  coordenador_id UUID NOT NULL REFERENCES organizacao_estrutura(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE especialistas_coordenadores IS
  'Coordenador (organizacao_estrutura) de cada consultor (especialistas); copiado no email de inconsistências de chamados';
COMMENT ON COLUMN especialistas_coordenadores.coordenador_id IS
  'Pessoa do organograma com cargo Coordenador, Gerente ou Diretor (validado na trigger)';
COMMENT ON COLUMN especialistas_coordenadores.created_at IS 'UTC; exibir em America/Sao_Paulo';
COMMENT ON COLUMN especialistas_coordenadores.updated_at IS 'UTC; exibir em America/Sao_Paulo';

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

ALTER TABLE especialistas_coordenadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS especialistas_coordenadores_select ON especialistas_coordenadores;
DROP POLICY IF EXISTS especialistas_coordenadores_insert ON especialistas_coordenadores;
DROP POLICY IF EXISTS especialistas_coordenadores_update ON especialistas_coordenadores;
DROP POLICY IF EXISTS especialistas_coordenadores_delete ON especialistas_coordenadores;

CREATE POLICY especialistas_coordenadores_select ON especialistas_coordenadores
  FOR SELECT TO authenticated
  USING (has_screen_permission('consultores_coordenadores'::text, 'view'::text));

CREATE POLICY especialistas_coordenadores_insert ON especialistas_coordenadores
  FOR INSERT TO authenticated
  WITH CHECK (has_screen_permission('consultores_coordenadores'::text, 'edit'::text));

CREATE POLICY especialistas_coordenadores_update ON especialistas_coordenadores
  FOR UPDATE TO authenticated
  USING (has_screen_permission('consultores_coordenadores'::text, 'edit'::text))
  WITH CHECK (has_screen_permission('consultores_coordenadores'::text, 'edit'::text));

CREATE POLICY especialistas_coordenadores_delete ON especialistas_coordenadores
  FOR DELETE TO authenticated
  USING (has_screen_permission('consultores_coordenadores'::text, 'edit'::text));

-- ---------------------------------------------------------------------
-- Índice
-- ---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_especialistas_coordenadores_coordenador
  ON especialistas_coordenadores(coordenador_id);

-- ---------------------------------------------------------------------
-- Trigger: valida o cargo do responsável e preenche autoria/updated_at
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.especialistas_coordenadores_antes_gravar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organizacao_estrutura o
     WHERE o.id = NEW.coordenador_id
       AND o.cargo IN ('Coordenador', 'Gerente', 'Diretor')
  ) THEN
    RAISE EXCEPTION 'O responsável precisa ter cargo Coordenador, Gerente ou Diretor no organograma'
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := NOW();
    NEW.created_by := (SELECT auth.uid());
  ELSE
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;
  END IF;
  NEW.updated_at := NOW();
  NEW.updated_by := (SELECT auth.uid());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS especialistas_coordenadores_antes_gravar ON especialistas_coordenadores;
CREATE TRIGGER especialistas_coordenadores_antes_gravar
  BEFORE INSERT OR UPDATE ON especialistas_coordenadores
  FOR EACH ROW
  EXECUTE FUNCTION public.especialistas_coordenadores_antes_gravar();

-- ---------------------------------------------------------------------
-- Leitura do organograma para o seletor da tela
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.listar_responsaveis_organograma()
RETURNS TABLE (id uuid, nome text, cargo text, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_screen_permission('consultores_coordenadores'::text, 'view'::text) THEN
    RAISE EXCEPTION 'Sem permissão para listar os responsáveis do organograma'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT o.id, o.nome, o.cargo, o.email
    FROM organizacao_estrutura o
   WHERE o.cargo IN ('Coordenador', 'Gerente', 'Diretor')
   ORDER BY o.nome;
END;
$$;

COMMENT ON FUNCTION public.listar_responsaveis_organograma() IS
  'Pessoas do organograma que podem ser coordenador de consultor (tela consultores_coordenadores)';

REVOKE ALL ON FUNCTION public.listar_responsaveis_organograma() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_responsaveis_organograma() TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- Consultores com o email do coordenador, para o modal de email de inconsistências
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.listar_especialistas_para_email()
RETURNS TABLE (nome text, email text, email_coordenador text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    has_screen_permission('inconsistencia_chamados'::text, 'view'::text)
    OR has_screen_permission('troca_codigo_resolucao'::text, 'view'::text)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para listar os emails de consultores e coordenadores'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT e.nome, e.email, o.email
    FROM especialistas e
    LEFT JOIN especialistas_coordenadores ec ON ec.especialista_id = e.id
    LEFT JOIN organizacao_estrutura o ON o.id = ec.coordenador_id;
END;
$$;

COMMENT ON FUNCTION public.listar_especialistas_para_email() IS
  'Nome, email e email do coordenador de cada consultor (telas inconsistencia_chamados e troca_codigo_resolucao)';

REVOKE ALL ON FUNCTION public.listar_especialistas_para_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_especialistas_para_email() TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- Tela e permissão inicial
-- ---------------------------------------------------------------------

INSERT INTO screens (key, name, description, category, route) VALUES
  ('consultores_coordenadores', 'Consultores x Coordenadores',
   'Coordenador de cada consultor, copiado no email de inconsistências de chamados',
   'Administração', '/admin/consultores-coordenadores')
ON CONFLICT (key) DO NOTHING;

INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'consultores_coordenadores', 'edit'
  FROM user_groups ug
 WHERE ug.name = 'Administradores'
   AND NOT EXISTS (SELECT 1 FROM screen_permissions sp
                    WHERE sp.group_id = ug.id AND sp.screen_key = 'consultores_coordenadores');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM screens WHERE key = 'consultores_coordenadores') THEN
    RAISE EXCEPTION 'Falha ao registrar a tela "consultores_coordenadores"';
  END IF;
END $$;
