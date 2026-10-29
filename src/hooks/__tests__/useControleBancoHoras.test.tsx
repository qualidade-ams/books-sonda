import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useBuscarQuadro,
  useControleBancos,
  useControleEmpresas,
  useEmpresaLiberada,
  useHistoricoControle,
  useLancamentosControle,
  useQuadroControle,
  useRequerimentosControle,
  useSaldoParcialControle,
} from '../useControleBancoHoras';
import { controleBancoHorasService } from '@/services/controleBancoHorasService';
import { controleLancamentosService } from '@/services/controleLancamentosService';
import { controleHistoricoService } from '@/services/controleHistoricoService';
import { controleSaldoParcialService } from '@/services/controleSaldoParcialService';
import { enviarSaldoParcialControle } from '@/services/saldoParcial/envioControle';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));

vi.mock('@/services/controleBancoHorasService', async (original) => ({
  ...(await original<typeof import('@/services/controleBancoHorasService')>()),
  controleBancoHorasService: {
    empresas: vi.fn(),
    bancos: vi.fn(),
    quadro: vi.fn(),
    requerimentos: vi.fn(),
  },
}));
vi.mock('@/services/controleLancamentosService', () => ({
  controleLancamentosService: {
    reajustes: vi.fn(),
    observacoes: vi.fn(),
    lancarReajuste: vi.fn(),
    inativarReajuste: vi.fn(),
    salvarObservacao: vi.fn(),
    excluirObservacao: vi.fn(),
    salvarAjustesRequerimentos: vi.fn(),
  },
}));
vi.mock('@/services/controleSaldoParcialService', () => ({
  controleSaldoParcialService: { bancos: vi.fn(), idiomaDoEmail: vi.fn() },
}));
vi.mock('@/services/saldoParcial/envioControle', () => ({ enviarSaldoParcialControle: vi.fn() }));
vi.mock('@/services/controleHistoricoService', () => ({
  controleHistoricoService: { historico: vi.fn() },
}));

const controle = controleBancoHorasService as unknown as Record<string, ReturnType<typeof vi.fn>>;
const lancamentos = controleLancamentosService as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;
const historico = controleHistoricoService as unknown as Record<string, ReturnType<typeof vi.fn>>;

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

const meses = [
  { mes: 9, ano: 2026 },
  { mes: 10, ano: 2026 },
];

beforeEach(() => {
  vi.clearAllMocks();
  controle.empresas.mockResolvedValue([
    { id: 'e1', nome: 'EMPRESA ALFA', modelo: 'liberada', bancosAtivos: 2 },
  ]);
  controle.bancos.mockResolvedValue([{ bancoId: 'b1' }]);
  controle.quadro.mockResolvedValue({ '2026-10': { bancos: [] } });
  controle.requerimentos.mockResolvedValue([{ id: 'r1' }]);
  lancamentos.reajustes.mockResolvedValue([{ id: 'rj1' }]);
  lancamentos.observacoes.mockResolvedValue([{ id: 'ob1' }]);
  historico.historico.mockResolvedValue([{ tipo: 'versao', id: 'f1' }]);
});

describe('leituras do Controle', () => {
  it('empresas e bancos', async () => {
    const { wrapper } = criarWrapper();
    const empresas = renderHook(() => useControleEmpresas(), { wrapper });
    const bancos = renderHook(() => useControleBancos('e1'), { wrapper });
    await waitFor(() => expect(empresas.result.current.empresas).toHaveLength(1));
    await waitFor(() => expect(bancos.result.current.bancos).toHaveLength(1));
    expect(controle.bancos).toHaveBeenCalledWith('e1');
  });

  it('empresa liberada: o Controle atual fica só para consulta (Fase 5, P3)', async () => {
    controle.empresas.mockResolvedValue([
      { id: 'e1', nome: 'EMPRESA ALFA', modelo: 'liberada', bancosAtivos: 2 },
      { id: 'e2', nome: 'EMPRESA BETA', modelo: 'multiplo', bancosAtivos: 2 },
    ]);
    const { wrapper } = criarWrapper();
    const { result, rerender } = renderHook(({ id }) => useEmpresaLiberada(id), {
      wrapper,
      initialProps: { id: undefined as string | undefined },
    });
    expect(result.current).toBe(false);
    rerender({ id: 'e1' });
    await waitFor(() => expect(result.current).toBe(true));
    rerender({ id: 'e2' });
    expect(result.current).toBe(false);
  });

  it('não consulta sem empresa, banco ou meses', () => {
    const { wrapper } = criarWrapper();
    renderHook(() => useControleBancos(undefined), { wrapper });
    renderHook(() => useQuadroControle('e1', []), { wrapper });
    renderHook(() => useLancamentosControle(undefined, meses), { wrapper });
    renderHook(() => useHistoricoControle(undefined), { wrapper });
    expect(controle.bancos).not.toHaveBeenCalled();
    expect(controle.quadro).not.toHaveBeenCalled();
    expect(lancamentos.reajustes).not.toHaveBeenCalled();
    expect(historico.historico).not.toHaveBeenCalled();
  });

  it('quadro, requerimentos e histórico', async () => {
    const { wrapper } = criarWrapper();
    const quadro = renderHook(() => useQuadroControle('e1', meses), { wrapper });
    const reqs = renderHook(() => useRequerimentosControle('e1', meses), { wrapper });
    const hist = renderHook(() => useHistoricoControle('b1'), { wrapper });
    await waitFor(() => expect(quadro.result.current.quadro['2026-10']).toBeDefined());
    await waitFor(() => expect(reqs.result.current.requerimentos).toHaveLength(1));
    await waitFor(() => expect(hist.result.current.eventos).toHaveLength(1));
    expect(controle.quadro).toHaveBeenCalledWith('e1', meses);
    expect(controle.requerimentos).toHaveBeenCalledWith('e1', meses);
  });

  it('expõe o erro do quadro', async () => {
    controle.quadro.mockRejectedValue(
      new Error('Banco sem percentual de repasse vigente em 10/2026')
    );
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useQuadroControle('e1', meses), { wrapper });
    await waitFor(() =>
      expect(result.current.error?.message).toBe(
        'Banco sem percentual de repasse vigente em 10/2026'
      )
    );
  });
});

describe('gravações do Controle', () => {
  it('tentar de novo busca o histórico outra vez', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useHistoricoControle('b1'), { wrapper });
    await waitFor(() => expect(result.current.eventos).toHaveLength(1));
    historico.historico.mockClear();

    await act(() => result.current.recarregar());

    expect(historico.historico).toHaveBeenCalledTimes(1);
  });

  it('tentar de novo busca os requerimentos outra vez', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useRequerimentosControle('e1', meses), { wrapper });
    await waitFor(() => expect(result.current.requerimentos).toHaveLength(1));
    controle.requerimentos.mockClear();

    await act(() => result.current.recarregar());

    expect(controle.requerimentos).toHaveBeenCalledTimes(1);
  });

  it('lançar reajuste recalcula o Controle inteiro e avisa', async () => {
    lancamentos.lancarReajuste.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useLancamentosControle('b1', meses), { wrapper });
    await waitFor(() => expect(result.current.reajustes).toHaveLength(1));
    const input = { bancoId: 'b1' } as any;

    await act(() => result.current.lancarReajuste(input));

    expect(lancamentos.lancarReajuste).toHaveBeenCalledWith(input);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['controle-bh'] });
    expect(toast).toHaveBeenCalledWith({ title: 'avisos.controle.reajusteLancado' });
  });

  it('tentar de novo busca os reajustes e as observações outra vez', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useLancamentosControle('b1', meses), { wrapper });
    await waitFor(() => expect(result.current.reajustes).toHaveLength(1));
    lancamentos.reajustes.mockClear();
    lancamentos.observacoes.mockClear();

    await act(() => result.current.recarregar());

    expect(lancamentos.reajustes).toHaveBeenCalledTimes(1);
    expect(lancamentos.observacoes).toHaveBeenCalledTimes(1);
  });

  it('inativar reajuste, salvar e excluir observação', async () => {
    for (const m of ['inativarReajuste', 'salvarObservacao', 'excluirObservacao']) {
      lancamentos[m].mockResolvedValue(undefined);
    }
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useLancamentosControle('b1', meses), { wrapper });

    await act(() => result.current.inativarReajuste({ reajusteId: 'rj1', motivo: 'Duplicado' }));
    await act(() => result.current.salvarObservacao({ bancoId: 'b1', mes: meses[1], texto: 'x' }));
    await act(() => result.current.excluirObservacao('ob1'));

    expect(lancamentos.inativarReajuste).toHaveBeenCalledWith('rj1', 'Duplicado');
    expect(lancamentos.excluirObservacao).toHaveBeenCalledWith('ob1');
    expect(toast).toHaveBeenCalledWith({ title: 'avisos.controle.reajusteInativado' });
    expect(toast).toHaveBeenCalledWith({ title: 'avisos.controle.observacaoSalva' });
    expect(toast).toHaveBeenCalledWith({ title: 'avisos.controle.observacaoExcluida' });
  });

  it('trocar o banco dos requerimentos com o motivo', async () => {
    lancamentos.salvarAjustesRequerimentos.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRequerimentosControle('e1', meses), { wrapper });
    const ajustes = [{ requerimentoId: 'r1', bancoId: 'b2' }];

    await act(() => result.current.salvarAjustes({ ajustes, motivo: 'Contrato FISCAL' }));

    expect(lancamentos.salvarAjustesRequerimentos).toHaveBeenCalledWith(ajustes, 'Contrato FISCAL');
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['controle-bh'] });
    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.controle.bancoRequerimentosAlterado',
      description: 'avisos.controle.valeProximoRecalculo',
    });
  });

  it('erro na gravação aparece no aviso', async () => {
    lancamentos.lancarReajuste.mockRejectedValue(new Error('Informe o motivo do reajuste.'));
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useLancamentosControle('b1', meses), { wrapper });

    await act(() => result.current.lancarReajuste({} as any).catch(() => undefined));

    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.controle.erroLancarReajuste',
      description: 'Informe o motivo do reajuste.',
      variant: 'destructive',
    });
  });
});

describe('useSaldoParcialControle', () => {
  const saldo = controleSaldoParcialService as unknown as Record<string, ReturnType<typeof vi.fn>>;
  const enviar = vi.mocked(enviarSaldoParcialControle);

  it('só busca com a tela de envio aberta; traz os bancos e o idioma do e-mail', async () => {
    saldo.bancos.mockResolvedValue([{ bancoId: 'b1' }]);
    saldo.idiomaDoEmail.mockResolvedValue('en');
    const { wrapper } = criarWrapper();
    renderHook(() => useSaldoParcialControle('e1', false), { wrapper });
    expect(saldo.bancos).not.toHaveBeenCalled();

    const { result } = renderHook(() => useSaldoParcialControle('e1', true), { wrapper });
    await waitFor(() => expect(result.current.bancos).toHaveLength(1));
    expect(result.current.idioma).toBe('en');
    expect(saldo.bancos).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({ ano: expect.any(Number) })
    );
  });

  it('enviar avisa o sucesso e o erro', async () => {
    saldo.bancos.mockResolvedValue([]);
    saldo.idiomaDoEmail.mockResolvedValue('pt-BR');
    enviar.mockResolvedValueOnce(undefined);
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useSaldoParcialControle('e1', true), { wrapper });
    const input = { empresaId: 'e1' } as any;

    await act(() => result.current.enviar(input));
    expect(enviar).toHaveBeenCalledWith(input);
    expect(toast).toHaveBeenCalledWith({ title: 'avisos.controle.saldoParcialEnviado' });

    enviar.mockRejectedValueOnce(new Error('Servidor de e-mail fora'));
    await act(() => result.current.enviar(input).catch(() => undefined));
    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.controle.erroSaldoParcial',
      description: 'Servidor de e-mail fora',
      variant: 'destructive',
    });
  });
});

describe('useBuscarQuadro', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca o quadro de um período sob demanda, com o mesmo cache do quadro da tela', async () => {
    controle.quadro.mockResolvedValue({ '2026-09': { bancos: [] } });
    const { wrapper } = criarWrapper();
    const { result } = renderHook(
      () => ({ buscar: useBuscarQuadro('e1'), tela: useQuadroControle('e1', meses) }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.tela.isLoading).toBe(false));

    await expect(result.current.buscar(meses)).resolves.toEqual({ '2026-09': { bancos: [] } });
    expect(controle.quadro).toHaveBeenCalledTimes(1);

    const outros = [{ mes: 1, ano: 2027 }];
    await result.current.buscar(outros);
    expect(controle.quadro).toHaveBeenLastCalledWith('e1', outros);
  });
});
