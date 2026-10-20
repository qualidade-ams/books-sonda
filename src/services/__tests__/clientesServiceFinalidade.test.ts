import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clientesService } from '../clientesService';
import { supabase } from '@/integrations/supabase/client';
import {
  FINALIDADES_BOOK,
  FINALIDADES_SALDO_PARCIAL,
  FINALIDADE_ENVIO,
  FINALIDADE_ENVIO_OPTIONS
} from '@/types/clientBooksTypes';
import type { ClienteFormData } from '@/types/clientBooksTypes';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() }
}));

type Chamada = [string, unknown[]];

/**
 * Query encadeável que registra cada chamada (select, eq, in, insert...) e,
 * quando aguardada, resolve com o resultado configurado.
 */
function criarQuery(resultado: { data: unknown; error: unknown }) {
  const chamadas: Chamada[] = [];
  const query: any = new Proxy(
    {},
    {
      get(_alvo, prop) {
        if (prop === 'then') {
          return (resolve: any, reject: any) => Promise.resolve(resultado).then(resolve, reject);
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

function chamadasDe(chamadas: Chamada[], metodo: string) {
  return chamadas.filter(([nome]) => nome === metodo).map(([, args]) => args);
}

const dadosBase: ClienteFormData = {
  nomeCompleto: 'Contato Teste',
  email: 'contato@empresa.com',
  funcao: 'Analista',
  empresaId: 'empresa-1',
  status: 'ativo',
  principalContato: false,
  finalidadeEnvio: 'saldo_parcial'
};

describe('Constantes de finalidade de envio', () => {
  it('define os grupos de finalidade usados pelo Book e pelo Saldo Parcial', () => {
    expect(FINALIDADE_ENVIO).toEqual({ BOOK: 'book', SALDO_PARCIAL: 'saldo_parcial', AMBOS: 'ambos' });
    expect(FINALIDADES_BOOK).toEqual(['book', 'ambos']);
    expect(FINALIDADES_SALDO_PARCIAL).toEqual(['saldo_parcial', 'ambos']);
    expect(FINALIDADE_ENVIO_OPTIONS.map(o => o.value)).toEqual(['book', 'saldo_parcial', 'ambos']);
  });
});

describe('ClientesService - finalidade de envio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('criarCliente grava finalidade_envio informada', async () => {
    const empresa = criarQuery({ data: { id: 'empresa-1', status: 'ativo' }, error: null });
    const emailUnico = criarQuery({ data: [], error: null });
    const insercao = criarQuery({ data: { id: 'cliente-1' }, error: null });

    (supabase.from as any)
      .mockReturnValueOnce(empresa.query)
      .mockReturnValueOnce(emailUnico.query)
      .mockReturnValueOnce(insercao.query);

    await clientesService.criarCliente(dadosBase);

    const [payload] = chamadasDe(insercao.chamadas, 'insert')[0] as [Record<string, unknown>];
    expect(payload.finalidade_envio).toBe('saldo_parcial');
  });

  it('criarCliente usa "book" quando a finalidade não é informada', async () => {
    const empresa = criarQuery({ data: { id: 'empresa-1', status: 'ativo' }, error: null });
    const emailUnico = criarQuery({ data: [], error: null });
    const insercao = criarQuery({ data: { id: 'cliente-1' }, error: null });

    (supabase.from as any)
      .mockReturnValueOnce(empresa.query)
      .mockReturnValueOnce(emailUnico.query)
      .mockReturnValueOnce(insercao.query);

    const semFinalidade: ClienteFormData = { ...dadosBase, finalidadeEnvio: undefined };
    await clientesService.criarCliente(semFinalidade);

    const [payload] = chamadasDe(insercao.chamadas, 'insert')[0] as [Record<string, unknown>];
    expect(payload.finalidade_envio).toBe('book');
  });

  it('criarCliente rejeita finalidade inválida', async () => {
    await expect(
      clientesService.criarCliente({ ...dadosBase, finalidadeEnvio: 'outro' as any })
    ).rejects.toMatchObject({ code: 'INVALID_FINALIDADE' });
  });

  it('atualizarCliente grava finalidade_envio quando informada', async () => {
    const atual = criarQuery({
      data: { id: 'cliente-1', email: 'contato@empresa.com', empresa_id: 'empresa-1', principal_contato: false },
      error: null
    });
    const atualizacao = criarQuery({ data: null, error: null });

    (supabase.from as any)
      .mockReturnValueOnce(atual.query)
      .mockReturnValueOnce(atualizacao.query);

    await clientesService.atualizarCliente('cliente-1', { finalidadeEnvio: 'ambos' });

    const [payload] = chamadasDe(atualizacao.chamadas, 'update')[0] as [Record<string, unknown>];
    expect(payload.finalidade_envio).toBe('ambos');
  });

  it('atualizarCliente não altera finalidade_envio quando ela não é informada', async () => {
    const atual = criarQuery({
      data: { id: 'cliente-1', email: 'contato@empresa.com', empresa_id: 'empresa-1', principal_contato: false },
      error: null
    });
    const atualizacao = criarQuery({ data: null, error: null });

    (supabase.from as any)
      .mockReturnValueOnce(atual.query)
      .mockReturnValueOnce(atualizacao.query);

    await clientesService.atualizarCliente('cliente-1', { funcao: 'Gerente' });

    const [payload] = chamadasDe(atualizacao.chamadas, 'update')[0] as [Record<string, unknown>];
    expect(payload).not.toHaveProperty('finalidade_envio');
  });

  it('listarClientes filtra por finalidade quando o filtro é informado', async () => {
    const lista = criarQuery({ data: [], error: null });
    (supabase.from as any).mockReturnValueOnce(lista.query);

    await clientesService.listarClientes({ finalidadeEnvio: ['saldo_parcial'] });

    expect(chamadasDe(lista.chamadas, 'in')).toContainEqual(['finalidade_envio', ['saldo_parcial']]);
  });

  it('listarEmailsPorFinalidade busca e-mails de contatos ativos da empresa com as finalidades informadas', async () => {
    const lista = criarQuery({
      data: [{ email: 'a@cliente.com' }, { email: 'b@cliente.com' }],
      error: null
    });
    (supabase.from as any).mockReturnValueOnce(lista.query);

    const emails = await clientesService.listarEmailsPorFinalidade('empresa-1', FINALIDADES_SALDO_PARCIAL);

    expect(supabase.from).toHaveBeenCalledWith('clientes');
    expect(chamadasDe(lista.chamadas, 'eq')).toEqual(
      expect.arrayContaining([['empresa_id', 'empresa-1'], ['status', 'ativo']])
    );
    expect(chamadasDe(lista.chamadas, 'in')).toContainEqual(['finalidade_envio', ['saldo_parcial', 'ambos']]);
    expect(emails).toEqual(['a@cliente.com', 'b@cliente.com']);
  });

  it('listarEmailsPorFinalidade lança erro quando a consulta falha', async () => {
    const lista = criarQuery({ data: null, error: { message: 'falhou' } });
    (supabase.from as any).mockReturnValueOnce(lista.query);

    await expect(
      clientesService.listarEmailsPorFinalidade('empresa-1', FINALIDADES_SALDO_PARCIAL)
    ).rejects.toMatchObject({ code: 'LIST_ERROR' });
  });

  it('listarClientes não filtra por finalidade sem o filtro', async () => {
    const lista = criarQuery({ data: [], error: null });
    (supabase.from as any).mockReturnValueOnce(lista.query);

    await clientesService.listarClientes({});

    expect(chamadasDe(lista.chamadas, 'in').some(([coluna]) => coluna === 'finalidade_envio')).toBe(false);
  });
});
