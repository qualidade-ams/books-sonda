import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useControleBancos,
  useControleEmpresas,
  useHistoricoControle,
  useLancamentosControle,
  useQuadroControle,
  useRequerimentosControle,
} from '../useControleBancoHoras';
import { controleBancoHorasService } from '@/services/controleBancoHorasService';
import { controleLancamentosService } from '@/services/controleLancamentosService';
import { controleHistoricoService } from '@/services/controleHistoricoService';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

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
    expect(toast).toHaveBeenCalledWith({ title: 'Reajuste lançado' });
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
    expect(toast).toHaveBeenCalledWith({ title: 'Reajuste inativado' });
    expect(toast).toHaveBeenCalledWith({ title: 'Observação salva' });
    expect(toast).toHaveBeenCalledWith({ title: 'Observação excluída' });
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
      title: 'Banco dos requerimentos alterado',
      description: 'Vale a partir do próximo recálculo; meses fechados não mudam.',
    });
  });

  it('erro na gravação aparece no aviso', async () => {
    lancamentos.lancarReajuste.mockRejectedValue(new Error('Informe o motivo do reajuste.'));
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useLancamentosControle('b1', meses), { wrapper });

    await act(() => result.current.lancarReajuste({} as any).catch(() => undefined));

    expect(toast).toHaveBeenCalledWith({
      title: 'Erro ao lançar o reajuste',
      description: 'Informe o motivo do reajuste.',
      variant: 'destructive',
    });
  });
});
