-- =====================================================================
-- Fase 5 — migration 28: snapshot do consumo do Book por banco
-- (docs/especificacoes/Modelagem_Fase5.md, seção 6.1; spec A.2; D-15)
--
--   books_consumo_bancos             uma linha por Book e banco que o cliente vê, com o
--                                    que a página de consumo mostra. A página lê só daqui,
--                                    para o PDF de um Book enviado não mudar com o tempo
--   gravar_consumo_bancos_do_book()  troca as linhas do Book de uma vez; só a geração do
--                                    Book grava (Edição na Geração de Books ou sync-api)
--   consumo_bancos_do_book()         leitura pelo id do Book. Liberada também ao anônimo:
--                                    a rota de impressão do PDF (/pdf/book/:id) é aberta
--                                    pelo Puppeteer sem login, como já acontece com books.
--                                    A tabela em si não é listável pelo anônimo
-- =====================================================================

CREATE TABLE IF NOT EXISTS books_consumo_bancos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- O snapshot é parte do Book: sai junto quando o Book é apagado
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  banco_id UUID NOT NULL REFERENCES bancos_horas(id) ON DELETE RESTRICT,
  -- Empresa dona do banco: difere da do Book quando o banco é de uma consolidada (D-15)
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  ordem SMALLINT NOT NULL,
  -- Nomes vigentes na geração: Books gerados mantêm o nome (spec 4.2)
  nome_banco TEXT NOT NULL CHECK (length(trim(nome_banco)) > 0),
  nome_empresa TEXT NOT NULL,
  -- Versão do fechamento usada
  fechamento_id UUID REFERENCES bancos_horas_fechamentos(id) ON DELETE RESTRICT,
  dados JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT books_consumo_bancos_uq UNIQUE (book_id, banco_id)
);

CREATE INDEX IF NOT EXISTS books_consumo_bancos_banco_idx ON books_consumo_bancos (banco_id);
CREATE INDEX IF NOT EXISTS books_consumo_bancos_empresa_idx ON books_consumo_bancos (empresa_id);
CREATE INDEX IF NOT EXISTS books_consumo_bancos_fechamento_idx ON books_consumo_bancos (fechamento_id);

ALTER TABLE books_consumo_bancos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE books_consumo_bancos FROM anon;

-- Leitura direta para quem vê a Geração de Books; gravação só pela função
DROP POLICY IF EXISTS "books_consumo_bancos_select" ON books_consumo_bancos;
DROP POLICY IF EXISTS "books_consumo_bancos_insert" ON books_consumo_bancos;
DROP POLICY IF EXISTS "books_consumo_bancos_update" ON books_consumo_bancos;
DROP POLICY IF EXISTS "books_consumo_bancos_delete" ON books_consumo_bancos;
CREATE POLICY "books_consumo_bancos_select" ON books_consumo_bancos
  FOR SELECT TO authenticated
  USING ((SELECT has_screen_permission('geracao_books'::text, 'view'::text)));

-- ---------------------------------------------------------------------
-- Gravação
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.gravar_consumo_bancos_do_book(p_book_id UUID, p_bancos JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims JSONB := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  v_empresa UUID;
  v_n INTEGER;
BEGIN
  IF NOT (v_claims IS NULL OR v_claims ->> 'role' = 'service_role'
          OR has_screen_permission('geracao_books'::text, 'edit'::text)) THEN
    RAISE EXCEPTION 'Sem permissão para gravar o consumo do Book.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT empresa_id INTO v_empresa FROM books WHERE id = p_book_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book não encontrado.' USING ERRCODE = 'check_violation';
  END IF;

  -- Só bancos da empresa do Book ou de uma consolidada dela (D-15)
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(p_bancos, '[]'::jsonb)) x
     WHERE NOT EXISTS (
       SELECT 1 FROM bancos_horas b JOIN empresas e ON e.id = b.empresa_id
        WHERE b.id = (x ->> 'banco_id')::uuid
          AND (b.empresa_id = v_empresa OR e.empresa_consolidadora_id = v_empresa))
  ) THEN
    RAISE EXCEPTION 'O consumo do Book tem banco que não é da empresa nem de uma consolidada dela.'
      USING ERRCODE = 'check_violation';
  END IF;

  DELETE FROM books_consumo_bancos WHERE book_id = p_book_id;
  INSERT INTO books_consumo_bancos (book_id, banco_id, empresa_id, ordem, nome_banco, nome_empresa,
                                    fechamento_id, dados, created_by)
  SELECT p_book_id, b.id, b.empresa_id, (x ->> 'ordem')::smallint, x ->> 'nome_banco',
         COALESCE(x ->> 'nome_empresa', ''), NULLIF(x ->> 'fechamento_id', '')::uuid,
         COALESCE(x -> 'dados', '{}'::jsonb), (SELECT auth.uid())
    FROM jsonb_array_elements(COALESCE(p_bancos, '[]'::jsonb)) x
    JOIN bancos_horas b ON b.id = (x ->> 'banco_id')::uuid;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

-- ---------------------------------------------------------------------
-- Leitura pelo id do Book (página de consumo, também no PDF)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.consumo_bancos_do_book(p_book_id UUID)
RETURNS TABLE (
  ordem SMALLINT,
  banco_id UUID,
  empresa_id UUID,
  nome_banco TEXT,
  nome_empresa TEXT,
  fechamento_id UUID,
  dados JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.ordem, c.banco_id, c.empresa_id, c.nome_banco, c.nome_empresa, c.fechamento_id, c.dados
    FROM books_consumo_bancos c
   WHERE c.book_id = p_book_id
   ORDER BY c.ordem, c.nome_banco;
$$;

REVOKE ALL ON FUNCTION public.gravar_consumo_bancos_do_book(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gravar_consumo_bancos_do_book(UUID, JSONB) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.consumo_bancos_do_book(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consumo_bancos_do_book(UUID) TO anon, authenticated, service_role;
