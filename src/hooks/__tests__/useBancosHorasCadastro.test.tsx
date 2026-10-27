import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useBancosHorasCadastro } from '../useBancosHorasCadastro';
import { bancosHorasCadastroService } from '@/services/bancosHorasCadastroService';
import { ErroTraduzivel } from '@/errors/erroTraduzivel';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));

vi.mock('@/services/bancosHorasCadastroService', () => ({
  bancosHorasCadastroService: {
    listar: vi.fn(),
    criar: vi.fn(),
    salvar: vi.fn(),
    reordenar: vi.fn(),
    inativar: vi.fn(),
    reativar: vi.fn(),
    novaVigencia: vi.fn(),
  },
}));

const service = bancosHorasCadastroService as unknown as Record<string, ReturnType<typeof vi.fn>>;

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('useBancosHorasCadastro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.listar.mockResolvedValue([{ id: 'b1', nome: 'Banco COMEX' }]);
  });

  it('não carrega sem empresa', () => {
    const { wrapper } = criarWrapper();
    renderHook(() => useBancosHorasCadastro(undefined), { wrapper });
    expect(service.listar).not.toHaveBeenCalled();
  });

  it('carrega os bancos da empresa', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useBancosHorasCadastro('e1'), { wrapper });

    await waitFor(() => expect(result.current.bancos).toHaveLength(1));
    expect(service.listar).toHaveBeenCalledWith('e1');
  });

  it('recarregar busca os bancos de novo (tentar novamente)', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useBancosHorasCadastro('e1'), { wrapper });
    await waitFor(() => expect(result.current.bancos).toHaveLength(1));

    act(() => result.current.recarregar());
    await waitFor(() => expect(service.listar).toHaveBeenCalledTimes(2));
  });

  it('criar banco recarrega os bancos e a empresa, e avisa', async () => {
    service.criar.mockResolvedValue('b-novo');
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useBancosHorasCadastro('e1'), { wrapper });
    const input = { empresaId: 'e1', nome: 'Novo' } as any;

    await act(async () => {
      await expect(result.current.criar(input)).resolves.toBe('b-novo');
    });

    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['bancos-horas-cadastro', 'e1'] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['empresas-cadastro'] });
    expect(toast).toHaveBeenCalledWith({ title: 'avisos.bancos.criado' });
  });

  it('salvar passa o banco e os parâmetros', async () => {
    service.salvar.mockResolvedValue(undefined);
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useBancosHorasCadastro('e1'), { wrapper });
    const parametros = { nome: 'X' } as any;

    await act(() => result.current.salvar({ bancoId: 'b1', parametros }));

    expect(service.salvar).toHaveBeenCalledWith({ id: 'b1', empresaId: 'e1' }, parametros);
    expect(toast).toHaveBeenCalledWith({ title: 'avisos.bancos.salvo' });
  });

  it('inativar, reativar, reordenar e nova vigência', async () => {
    for (const m of ['inativar', 'reativar', 'reordenar', 'novaVigencia'])
      service[m].mockResolvedValue(undefined);
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useBancosHorasCadastro('e1'), { wrapper });
    const vigencia = {
      bancoId: 'b1',
      tipo: 'repasse',
      desde: '2027-01-01',
      valores: {},
      motivo: 'x',
    } as any;

    await act(() => result.current.inativar({ bancoId: 'b1', motivo: 'Fim' }));
    await act(() => result.current.reativar('b1'));
    await act(() => result.current.reordenar(['b2', 'b1']));
    await act(() => result.current.novaVigencia(vigencia));

    expect(service.inativar).toHaveBeenCalledWith('b1', 'Fim');
    expect(service.reativar).toHaveBeenCalledWith('b1');
    expect(service.reordenar).toHaveBeenCalledWith(['b2', 'b1']);
    expect(service.novaVigencia).toHaveBeenCalledWith(vigencia);
    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.bancos.inativado',
      description: 'avisos.bancos.inativadoDescricao',
    });
    expect(toast).toHaveBeenCalledWith({ title: 'avisos.bancos.reativado' });
    expect(toast).toHaveBeenCalledWith({ title: 'avisos.bancos.vigenciaRegistrada' });
    // Reordenar não avisa no sucesso
    expect(toast).toHaveBeenCalledTimes(3);
  });

  it('erro aparece no aviso e recarrega (parte pode ter sido gravada)', async () => {
    service.salvar.mockRejectedValue(
      new Error('Conflito de escopo: o banco "A" já cobre este produto ou módulo.')
    );
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useBancosHorasCadastro('e1'), { wrapper });

    await act(() =>
      result.current.salvar({ bancoId: 'b1', parametros: {} as any }).catch(() => undefined)
    );

    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['bancos-horas-cadastro', 'e1'] });
    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.bancos.erroSalvar',
      description: 'Conflito de escopo: o banco "A" já cobre este produto ou módulo.',
      variant: 'destructive',
    });
  });

  it('erro do service com chave aparece no aviso no idioma da tela', async () => {
    service.salvar.mockRejectedValue(
      new ErroTraduzivel('erros.bancos.conflitoEscopo', { banco: 'A' }, 'Conflito de escopo...')
    );
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useBancosHorasCadastro('e1'), { wrapper });

    await act(() =>
      result.current.salvar({ bancoId: 'b1', parametros: {} as any }).catch(() => undefined)
    );

    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.bancos.erroSalvar',
      description: 'erros.bancos.conflitoEscopo {"banco":"A"}',
      variant: 'destructive',
    });
  });
});
