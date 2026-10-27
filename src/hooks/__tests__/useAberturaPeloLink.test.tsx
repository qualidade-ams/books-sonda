import { renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAberturaPeloLink } from '../useAberturaPeloLink';

const EMPRESAS = [{ id: 'e1' }, { id: 'e2' }];
const editar = vi.fn();
const nova = vi.fn();

const abrir = (rota: string, carregando = false) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[rota]}>{children}</MemoryRouter>
  );
  return renderHook(
    ({ carregando: c }) => {
      useAberturaPeloLink(EMPRESAS, c, { editar, nova });
      return useLocation();
    },
    { wrapper, initialProps: { carregando } }
  );
};

describe('useAberturaPeloLink', () => {
  beforeEach(() => vi.clearAllMocks());

  it('?editar= abre a edição da empresa depois de carregar, e sai do endereço', () => {
    const { result, rerender } = abrir('/admin/empresas-clientes?editar=e2', true);
    expect(editar).not.toHaveBeenCalled();
    rerender({ carregando: false });
    expect(editar).toHaveBeenCalledWith({ id: 'e2' });
    expect(result.current.search).toBe('');
  });

  it('?nova=1 abre o cadastro de uma empresa', () => {
    const { result } = abrir('/admin/empresas-clientes?nova=1');
    expect(nova).toHaveBeenCalledTimes(1);
    expect(result.current.search).toBe('');
  });

  it('empresa que não está na lista: não abre nada, só limpa o endereço', () => {
    const { result } = abrir('/admin/empresas-clientes?editar=outra');
    expect(editar).not.toHaveBeenCalled();
    expect(result.current.search).toBe('');
  });

  it('sem parâmetro, nada acontece', () => {
    abrir('/admin/empresas-clientes');
    expect(editar).not.toHaveBeenCalled();
    expect(nova).not.toHaveBeenCalled();
  });
});
