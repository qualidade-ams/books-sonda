// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chavesIguais, tratarRequisicao, type EmpresaLeitura } from '../logica';

const CHAVE = 'chave-de-teste-com-tamanho-suficiente';
const URL_BASE = 'https://exemplo.supabase.co/functions/v1/consulta-empresas';

const EMPRESAS: EmpresaLeitura[] = [
  { nome_completo: 'Empresa Alfa Ltda', nome_abreviado: 'ALFA', status: 'ativo' },
  { nome_completo: 'Empresa Beta S.A.', nome_abreviado: 'BETA', status: 'inativo' },
];

function requisicao(opcoes: { metodo?: string; chave?: string | null; query?: string } = {}) {
  const { metodo = 'GET', chave = CHAVE, query = '' } = opcoes;
  const headers = new Headers();
  if (chave !== null) headers.set('x-api-key', chave);
  return new Request(`${URL_BASE}${query}`, { method: metodo, headers });
}

describe('chavesIguais', () => {
  it('aceita chaves idênticas', () => {
    expect(chavesIguais('abc123', 'abc123')).toBe(true);
  });

  it('recusa chaves diferentes de mesmo tamanho', () => {
    expect(chavesIguais('abc123', 'abc124')).toBe(false);
  });

  it('recusa chaves de tamanhos diferentes', () => {
    expect(chavesIguais('abc', 'abc123')).toBe(false);
  });

  it('recusa chave vazia', () => {
    expect(chavesIguais('', '')).toBe(false);
  });
});

describe('tratarRequisicao', () => {
  let buscarEmpresas: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    buscarEmpresas = vi.fn().mockResolvedValue(EMPRESAS);
  });

  it('devolve 200 com as empresas quando a chave confere', async () => {
    const resposta = await tratarRequisicao(requisicao(), { chaveEsperada: CHAVE, buscarEmpresas });

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get('Content-Type')).toContain('application/json');
    expect(resposta.headers.get('Cache-Control')).toBe('no-store');
    expect(await resposta.json()).toEqual({ data: EMPRESAS });
    expect(buscarEmpresas).toHaveBeenCalledWith({});
  });

  it('devolve só nome_completo, nome_abreviado e status, mesmo que a busca traga mais campos', async () => {
    buscarEmpresas.mockResolvedValue([
      { ...EMPRESAS[0], id: 'uuid-qualquer', email_gestor: 'gestor@exemplo.com' },
    ]);

    const resposta = await tratarRequisicao(requisicao(), { chaveEsperada: CHAVE, buscarEmpresas });
    const corpo = await resposta.json();

    expect(corpo.data).toEqual([EMPRESAS[0]]);
    expect(Object.keys(corpo.data[0]).sort()).toEqual(['nome_abreviado', 'nome_completo', 'status']);
  });

  it('repassa o filtro de status quando é válido', async () => {
    await tratarRequisicao(requisicao({ query: '?status=ativo' }), {
      chaveEsperada: CHAVE,
      buscarEmpresas,
    });

    expect(buscarEmpresas).toHaveBeenCalledWith({ status: 'ativo' });
  });

  it('devolve 400 para status fora de ativo/inativo, sem consultar o banco', async () => {
    const resposta = await tratarRequisicao(requisicao({ query: '?status=suspenso' }), {
      chaveEsperada: CHAVE,
      buscarEmpresas,
    });

    expect(resposta.status).toBe(400);
    expect(buscarEmpresas).not.toHaveBeenCalled();
  });

  it('devolve 401 sem o header x-api-key', async () => {
    const resposta = await tratarRequisicao(requisicao({ chave: null }), {
      chaveEsperada: CHAVE,
      buscarEmpresas,
    });

    expect(resposta.status).toBe(401);
    expect(buscarEmpresas).not.toHaveBeenCalled();
  });

  it('devolve 401 com chave errada', async () => {
    const resposta = await tratarRequisicao(requisicao({ chave: 'outra-chave' }), {
      chaveEsperada: CHAVE,
      buscarEmpresas,
    });

    expect(resposta.status).toBe(401);
    expect(buscarEmpresas).not.toHaveBeenCalled();
  });

  it('devolve 500 e não consulta o banco quando a chave não está configurada no servidor', async () => {
    const resposta = await tratarRequisicao(requisicao({ chave: '' }), {
      chaveEsperada: '',
      buscarEmpresas,
    });

    expect(resposta.status).toBe(500);
    expect(buscarEmpresas).not.toHaveBeenCalled();
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('devolve 405 para %s', async (metodo) => {
    const resposta = await tratarRequisicao(requisicao({ metodo }), {
      chaveEsperada: CHAVE,
      buscarEmpresas,
    });

    expect(resposta.status).toBe(405);
    expect(resposta.headers.get('Allow')).toBe('GET');
    expect(buscarEmpresas).not.toHaveBeenCalled();
  });

  it('devolve 500 genérico quando a busca falha, sem vazar a mensagem do banco', async () => {
    const erroSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    buscarEmpresas.mockRejectedValue(new Error('relation "empresas" does not exist'));

    const resposta = await tratarRequisicao(requisicao(), { chaveEsperada: CHAVE, buscarEmpresas });
    const corpo = await resposta.json();

    expect(resposta.status).toBe(500);
    expect(JSON.stringify(corpo)).not.toContain('relation');
    erroSpy.mockRestore();
  });
});
