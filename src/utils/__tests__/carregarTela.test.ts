import { describe, it, expect, vi } from 'vitest';
import { carregarComRecarga, ehFalhaDeCarga } from '../carregarTela';

function memoria() {
  const dados = new Map<string, string>();
  return {
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => void dados.set(k, v),
    removeItem: (k: string) => void dados.delete(k),
  };
}

const modulo = { default: () => null };

describe('ehFalhaDeCarga', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://app/assets/Empresas-abc.js',
    'error loading dynamically imported module',
    'Importing a module script failed.',
  ])('reconhece "%s"', (mensagem) => {
    expect(ehFalhaDeCarga(new TypeError(mensagem))).toBe(true);
  });

  it('não confunde com erro do código da tela', () => {
    expect(ehFalhaDeCarga(new Error('x is not defined'))).toBe(false);
  });
});

describe('carregarComRecarga', () => {
  it('carrega a tela e limpa a marca de recarga', async () => {
    const armazenamento = memoria();
    armazenamento.setItem('tela-recarregada', '1');
    const recarregar = vi.fn();

    expect(await carregarComRecarga(async () => modulo, { recarregar, armazenamento })).toBe(
      modulo
    );
    expect(recarregar).not.toHaveBeenCalled();
    expect(armazenamento.getItem('tela-recarregada')).toBeNull();
  });

  it('arquivo da tela sumiu (deploy novo): recarrega a página uma vez', async () => {
    const armazenamento = memoria();
    const recarregar = vi.fn();
    const falha = () =>
      Promise.reject(new TypeError('Failed to fetch dynamically imported module: x'));

    const carga = carregarComRecarga(falha, { recarregar, armazenamento });
    await new Promise((r) => setTimeout(r, 0));

    expect(recarregar).toHaveBeenCalledTimes(1);
    expect(armazenamento.getItem('tela-recarregada')).toBe('1');
    // Fica pendente: a página está sendo recarregada
    expect(await Promise.race([carga.then(() => 'resolveu'), Promise.resolve('pendente')])).toBe(
      'pendente'
    );
  });

  it('se falhar de novo depois de recarregar, mostra o erro em vez de recarregar sem fim', async () => {
    const armazenamento = memoria();
    armazenamento.setItem('tela-recarregada', '1');
    const recarregar = vi.fn();
    const erro = new TypeError('Failed to fetch dynamically imported module: x');

    await expect(
      carregarComRecarga(() => Promise.reject(erro), { recarregar, armazenamento })
    ).rejects.toBe(erro);
    expect(recarregar).not.toHaveBeenCalled();
  });

  it('erro do código da tela não recarrega', async () => {
    const recarregar = vi.fn();
    const erro = new Error('x is not defined');

    await expect(
      carregarComRecarga(() => Promise.reject(erro), { recarregar, armazenamento: memoria() })
    ).rejects.toBe(erro);
    expect(recarregar).not.toHaveBeenCalled();
  });

  it('sem armazenamento disponível (navegação privada bloqueada), ainda carrega', async () => {
    const quebrado = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(
      await carregarComRecarga(async () => modulo, { recarregar: vi.fn(), armazenamento: quebrado })
    ).toBe(modulo);
  });
});
