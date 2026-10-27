import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useLogoMenu, useMenuOrganizado } from '../useMenuOrganizado';
import { menuOrganizadoService } from '@/services/menuOrganizadoService';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));

vi.mock('@/services/menuOrganizadoService', () => ({
  menuOrganizadoService: {
    carregar: vi.fn(),
    salvar: vi.fn(),
    enviarLogo: vi.fn(),
    urlDoLogo: vi.fn(),
  },
}));

const service = menuOrganizadoService as unknown as Record<string, ReturnType<typeof vi.fn>>;

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

const salvo = { itens: [{ chave: '/admin/dashboard' }], aparencia: { claro: {}, escuro: {} } };

describe('useMenuOrganizado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.carregar.mockResolvedValue(salvo);
  });

  it('carrega a ordem e a aparência', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useMenuOrganizado(), { wrapper });
    await waitFor(() => expect(result.current.menu).toEqual(salvo));
  });

  it('recarregar lê de novo', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useMenuOrganizado(), { wrapper });
    await waitFor(() => expect(result.current.menu).toEqual(salvo));
    await act(() => result.current.recarregar());
    expect(service.carregar).toHaveBeenCalledTimes(2);
  });

  it('salvar grava, recarrega para todos e avisa', async () => {
    service.salvar.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useMenuOrganizado(), { wrapper });
    const input = { arvore: null, aparenciaAtual: {}, aparenciaNova: {} } as any;

    await act(() => result.current.salvar(input));

    expect(service.salvar).toHaveBeenCalledWith(input);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['menu-organizado'] });
    expect(toast).toHaveBeenCalledWith({ title: 'avisos.menu.salvo' });
  });

  it('enviar logo devolve o caminho; erro aparece no aviso', async () => {
    service.enviarLogo.mockResolvedValueOnce('claro/aberto-1.png');
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useMenuOrganizado(), { wrapper });
    const arquivo = new File(['x'], 'logo.png', { type: 'image/png' });

    await act(async () => {
      await expect(
        result.current.enviarLogo({ tema: 'claro', tipo: 'aberto', arquivo })
      ).resolves.toBe('claro/aberto-1.png');
    });
    expect(service.enviarLogo).toHaveBeenCalledWith('claro', 'aberto', arquivo);

    service.enviarLogo.mockRejectedValueOnce(new Error('O logo passa de 500 KB.'));
    await act(() =>
      result.current.enviarLogo({ tema: 'claro', tipo: 'aberto', arquivo }).catch(() => undefined)
    );
    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.menu.erroLogo',
      description: 'O logo passa de 500 KB.',
      variant: 'destructive',
    });
  });
});

describe('useLogoMenu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sem logo próprio não consulta; com logo, devolve o endereço temporário', async () => {
    service.urlDoLogo.mockResolvedValue('https://assinado/logo.png');
    const { wrapper } = criarWrapper();
    const sem = renderHook(() => useLogoMenu(null), { wrapper });
    expect(sem.result.current).toBeNull();
    expect(service.urlDoLogo).not.toHaveBeenCalled();

    const com = renderHook(() => useLogoMenu('claro/logo.png'), { wrapper });
    await waitFor(() => expect(com.result.current).toBe('https://assinado/logo.png'));
  });
});
