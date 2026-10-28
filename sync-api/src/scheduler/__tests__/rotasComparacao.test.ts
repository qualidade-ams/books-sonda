import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { criarHandlersComparacao, SCREEN_KEY_COMPARACAO } from '../rotasComparacao';

function respostaFake() {
  const res: any = { statusCode: 200, corpo: undefined };
  res.status = vi.fn((s: number) => {
    res.statusCode = s;
    return res;
  });
  res.json = vi.fn((c: unknown) => {
    res.corpo = c;
    return res;
  });
  return res;
}

describe('rotasComparacao', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('usa a chave da tela da Comparação', () => {
    expect(SCREEN_KEY_COMPARACAO).toBe('bancos_horas_comparacao');
  });

  it('recalcular responde 202 na hora e roda a empresa em background', async () => {
    const modoSombra = { recalcularEmpresa: vi.fn(() => new Promise<any>(() => {})) };
    const handlers = criarHandlersComparacao({ modoSombra });
    const res = respostaFake();

    await handlers.recalcular({ body: { empresaId: 'e1' } } as any, res);

    expect(res.statusCode).toBe(202);
    expect(res.corpo).toEqual({ iniciado: true });
    expect(modoSombra.recalcularEmpresa).toHaveBeenCalledWith('e1');
  });

  it('recalcular exige a empresa', async () => {
    const modoSombra = { recalcularEmpresa: vi.fn() };
    const handlers = criarHandlersComparacao({ modoSombra });
    const res = respostaFake();

    await handlers.recalcular({ body: {} } as any, res);

    expect(res.statusCode).toBe(400);
    expect(modoSombra.recalcularEmpresa).not.toHaveBeenCalled();
  });

  it('falha em background só vai para o log, sem dado da empresa além do id', async () => {
    const modoSombra = { recalcularEmpresa: vi.fn(async () => { throw new Error('timeout'); }) };
    const handlers = criarHandlersComparacao({ modoSombra });

    await handlers.recalcular({ body: { empresaId: 'e1' } } as any, respostaFake());
    await new Promise((r) => setTimeout(r, 0));

    expect(console.error).toHaveBeenCalledWith('[COMPARACAO] Erro ao recalcular:', 'timeout');
  });
});
