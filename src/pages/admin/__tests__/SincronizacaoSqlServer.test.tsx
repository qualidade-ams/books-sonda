import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (chave: string) => chave, i18n: { language: 'pt-BR' } }),
}));
vi.mock('@/components/admin/LayoutAdmin', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/auth', () => ({ ProtectedAction: ({ children }: { children: ReactNode }) => <>{children}</> }));

const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));

const apiStatus = { data: true };
vi.mock('@/hooks/useApiStatus', () => ({ useApiStatus: () => apiStatus }));

vi.mock('@/components/admin/pesquisas-satisfacao/SyncSelectionModal', () => ({
  SyncSelectionModal: ({ open, onConfirm }: any) =>
    open ? (
      <button onClick={() => onConfirm({ pesquisas: true, especialistas: false, apontamentos: false, tickets: false, codigoResolucao: false, detectarInconsistencias: true })}>
        confirmar-sync
      </button>
    ) : null,
}));
vi.mock('@/components/admin/sincronizacao/AgendamentoFormModal', () => ({
  AgendamentoFormModal: ({ open }: any) => (open ? <div>modal-agendamento</div> : null),
}));

const estado = {
  agendamentos: [] as any[],
  execucoes: [] as any[],
};
const executarMock = vi.fn();
const alternarMock = vi.fn();

vi.mock('@/hooks/useSyncAgendamentos', () => ({
  useSyncAgendamentos: () => ({ agendamentos: estado.agendamentos, isLoading: false, error: null }),
  useSyncExecucoes: () => ({ execucoes: estado.execucoes, isLoading: false, error: null }),
  useSalvarAgendamento: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAlternarAgendamento: () => ({ mutateAsync: alternarMock, isPending: false }),
  useExcluirAgendamento: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useExecutarSyncAgora: () => ({ mutateAsync: executarMock, isPending: false }),
}));

import SincronizacaoSqlServer from '../SincronizacaoSqlServer';

const agendamento = {
  id: 'a1',
  nome: 'Pesquisas 2h',
  ativo: true,
  tabelas: { pesquisas: true },
  frequencia: 'diario',
  dias_semana: [],
  dias_mes: [],
  ultimo_dia_mes: false,
  modo_horario: 'horarios',
  horarios: ['07:00'],
  intervalo_horas: null,
  hora_inicio: null,
  hora_fim: null,
  proxima_execucao: '2026-09-25T10:00:00Z',
  ultima_execucao: null,
  ultimo_status: null,
};

describe('SincronizacaoSqlServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estado.agendamentos = [];
    estado.execucoes = [];
    apiStatus.data = true;
  });

  it('mostra estado vazio sem agendamentos', () => {
    render(<SincronizacaoSqlServer />);
    expect(screen.getByText('sincronizacaoSql.agendamentos.vazio')).toBeInTheDocument();
  });

  it('lista os agendamentos com tabelas e status', () => {
    estado.agendamentos = [agendamento];
    render(<SincronizacaoSqlServer />);
    expect(screen.getByText('Pesquisas 2h')).toBeInTheDocument();
    expect(screen.getByText('sincronizacaoSql.tabelas.pesquisas')).toBeInTheDocument();
    expect(screen.getByText('sincronizacaoSql.agendamentos.nunca')).toBeInTheDocument();
  });

  it('executar agora dispara a sincronização no sync-api', async () => {
    executarMock.mockResolvedValue({ execucaoId: 'e1' });
    render(<SincronizacaoSqlServer />);

    fireEvent.click(screen.getByRole('button', { name: /sincronizacaoSql.executarAgora/ }));
    fireEvent.click(screen.getByText('confirmar-sync'));

    await waitFor(() => expect(executarMock).toHaveBeenCalled());
    expect(executarMock.mock.calls[0][0]).toMatchObject({ pesquisas: true, detectarInconsistencias: true });
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'sincronizacaoSql.toasts.execucaoIniciada' }));
  });

  it('mostra erro quando o sync-api recusa (execução em andamento)', async () => {
    executarMock.mockRejectedValue(new Error('Já existe uma sincronização em andamento'));
    render(<SincronizacaoSqlServer />);

    fireEvent.click(screen.getByRole('button', { name: /sincronizacaoSql.executarAgora/ }));
    fireEvent.click(screen.getByText('confirmar-sync'));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', description: 'Já existe uma sincronização em andamento' })
      )
    );
  });

  it('bloqueia executar agora com a API fora do ar', () => {
    apiStatus.data = false;
    render(<SincronizacaoSqlServer />);
    expect(screen.getByRole('button', { name: /sincronizacaoSql.executarAgora/ })).toBeDisabled();
    expect(screen.getByText('sincronizacaoSql.apiOffline')).toBeInTheDocument();
  });

  it('bloqueia executar agora enquanto há execução em andamento', () => {
    estado.execucoes = [{ id: 'e1', status: 'executando', origem: 'manual', iniciado_em: '2026-09-24T10:00:00Z', logs: [], resultado: null }];
    render(<SincronizacaoSqlServer />);
    expect(screen.getByRole('button', { name: /sincronizacaoSql.executarAgora/ })).toBeDisabled();
    expect(screen.getByText('sincronizacaoSql.emExecucao')).toBeInTheDocument();
  });

  it('liga/desliga agendamento pelo switch', async () => {
    estado.agendamentos = [agendamento];
    alternarMock.mockResolvedValue(undefined);
    render(<SincronizacaoSqlServer />);

    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(alternarMock).toHaveBeenCalledWith({ id: 'a1', ativo: false }));
  });

  it('abre o modal de novo agendamento', () => {
    render(<SincronizacaoSqlServer />);
    fireEvent.click(screen.getByRole('button', { name: /sincronizacaoSql.novoAgendamento/ }));
    expect(screen.getByText('modal-agendamento')).toBeInTheDocument();
  });
});
