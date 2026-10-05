import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { booksDisparoService } from '../booksDisparoService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() }
}));

vi.mock('../emailService', () => ({
  emailService: { sendEmail: vi.fn() },
  RATE_LIMIT_CONFIG: {}
}));

type Chamada = [string, unknown[]];

/** Query encadeável que registra as chamadas e resolve com o resultado configurado */
function criarQuery(resultado: { data: unknown; error: unknown }) {
  const chamadas: Chamada[] = [];
  const query: any = new Proxy(
    {},
    {
      get(_alvo, prop) {
        if (prop === 'then') {
          return (res: any, rej: any) => Promise.resolve(resultado).then(res, rej);
        }
        return (...args: unknown[]) => {
          chamadas.push([String(prop), args]);
          return query;
        };
      }
    }
  );
  return { query, chamadas };
}

describe('BooksDisparoService - destinatários respeitam a finalidade do contato', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('busca apenas contatos com finalidade "book" ou "ambos" ao resolver destinatários', async () => {
    const empresa = criarQuery({ data: { id: 'empresa-1', email_gestor: null }, error: null });
    const clientes = criarQuery({ data: [{ id: 'c1', email: 'a@x.com' }], error: null });
    const grupos = criarQuery({ data: [], error: null });

    (supabase.from as any).mockImplementation((tabela: string) => {
      if (tabela === 'empresas_clientes') return empresa.query;
      if (tabela === 'clientes') return clientes.query;
      return grupos.query;
    });

    await (booksDisparoService as any).resolverEmpresaClientesCC('empresa-1');

    expect(clientes.chamadas).toContainEqual(['in', ['finalidade_envio', ['book', 'ambos']]]);
  });

  it('toda consulta de contatos ativos no serviço filtra pela finalidade do Book', () => {
    const fonte = readFileSync(resolve(__dirname, '../booksDisparoService.ts'), 'utf8');

    // Cada bloco começa em .from('clientes') e termina no fim da instrução
    const blocos = fonte.split(".from('clientes')").slice(1).map(trecho => trecho.split(';')[0]);
    const consultasAtivos = blocos.filter(bloco => bloco.includes(".eq('status', 'ativo')"));

    expect(consultasAtivos.length).toBeGreaterThan(0);
    const semFiltro = consultasAtivos.filter(bloco => !bloco.includes("'finalidade_envio'"));
    expect(semFiltro).toEqual([]);
  });
});
