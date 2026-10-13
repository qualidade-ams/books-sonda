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
  AgendamentoFormModal: ({ open, tipo }: any) =>
    open ? <div data-tipo={tipo ?? 'sincronizacao'}>modal-agendamento</div> : null,
}));

const estado = {
  agendamentos: [] as any[],
  execucoes: [] as any[],
  agendadorAtivo: true as boolean | undefined,
};
const executarMock = vi.fn();
const gerarBooksMock = vi.fn();
const alternarMock = vi.fn();

vi.mock('@/hooks/useSyncAgendamentos', () => ({
  useSyncAgendamentos: () => ({ agendamentos: estado.agendamentos, isLoading: false, error: null }),
  useSyncExecucoes: () => ({ execucoes: estado.execucoes, isLoading: false, error: null }),
  useSalvarAgendamento: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAlternarAgendamento: () => ({ mutateAsync: alternarMock, isPending: false }),
  useExcluirAgendamento: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useExecutarSyncAgora: () => ({ mutateAsync: executarMock, isPending: false }),
  useGerarBooksAgora: () => ({ mutateAsync: gerarBooksMock, isPending: false }),
  useStatusSyncJobs: () => ({ agendadorAtivo: estado.agendadorAtivo }),
  useEmpresasBook: () => ({
    empresas: [
      { id: 'e1', nome: 'VOTORANTIM' },
      { id: 'e2', nome: 'HYPERA PHARMA' },
    ],
    isLoading: false,
    error: null,
  }),
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
    estado.agendadorAtivo = true;
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

  it('avisa quando o agendador está desligado no sync-api', () => {
    estado.agendamentos = [{ ...agendamento, proxima_execucao: null }];
    estado.agendadorAtivo = false;
    render(<SincronizacaoSqlServer />);
    expect(screen.getByText('sincronizacaoSql.agendadorDesligado')).toBeInTheDocument();
    expect(screen.getByText('sincronizacaoSql.agendamentos.aguardandoAgendador')).toBeInTheDocument();
    expect(screen.queryByText('sincronizacaoSql.agendamentos.calculando')).not.toBeInTheDocument();
  });

  it('não avisa enquanto o status do agendador é desconhecido', () => {
    estado.agendamentos = [{ ...agendamento, proxima_execucao: null }];
    estado.agendadorAtivo = undefined;
    render(<SincronizacaoSqlServer />);
    expect(screen.queryByText('sincronizacaoSql.agendadorDesligado')).not.toBeInTheDocument();
    expect(screen.getByText('sincronizacaoSql.agendamentos.calculando')).toBeInTheDocument();
  });

  it('abre o modal de novo agendamento', () => {
    render(<SincronizacaoSqlServer />);
    fireEvent.click(screen.getByRole('button', { name: /sincronizacaoSql.novoAgendamento/ }));
    expect(screen.getByText('modal-agendamento')).toBeInTheDocument();
  });

  describe('geração de books', () => {
    const agendamentoBooks = { ...agendamento, id: 'b1', tipo: 'books', nome: 'Books mensais', tabelas: {} };

    const abrirAbaBooks = () => fireEvent.mouseDown(screen.getByRole('tab', { name: 'sincronizacaoSql.tabs.books' }));

    it('botões do topo acompanham a aba ativa e somem no histórico', () => {
      render(<SincronizacaoSqlServer />);
      const botao = (nome: RegExp) => screen.queryByRole('button', { name: nome });

      // Agendamentos (sincronização)
      expect(botao(/sincronizacaoSql.executarAgora/)).toBeInTheDocument();
      expect(botao(/^sincronizacaoSql.novoAgendamento$/)).toBeInTheDocument();
      expect(botao(/sincronizacaoSql.books.gerarAgora/)).not.toBeInTheDocument();
      expect(botao(/sincronizacaoSql.books.novoAgendamento/)).not.toBeInTheDocument();

      // Geração de Books: só os botões de books
      abrirAbaBooks();
      expect(botao(/sincronizacaoSql.books.gerarAgora/)).toBeInTheDocument();
      expect(botao(/sincronizacaoSql.books.novoAgendamento/)).toBeInTheDocument();
      expect(botao(/sincronizacaoSql.executarAgora/)).not.toBeInTheDocument();
      expect(botao(/^sincronizacaoSql.novoAgendamento$/)).not.toBeInTheDocument();

      // Histórico: nenhum botão de ação
      fireEvent.mouseDown(screen.getByRole('tab', { name: 'sincronizacaoSql.tabs.historico' }));
      expect(botao(/sincronizacaoSql.executarAgora/)).not.toBeInTheDocument();
      expect(botao(/sincronizacaoSql.novoAgendamento/)).not.toBeInTheDocument();
      expect(botao(/sincronizacaoSql.books.gerarAgora/)).not.toBeInTheDocument();
      expect(botao(/sincronizacaoSql.books.novoAgendamento/)).not.toBeInTheDocument();
    });

    it('agendamentos de books ficam só na aba própria', () => {
      estado.agendamentos = [{ ...agendamento, tipo: 'sincronizacao' }, agendamentoBooks];
      render(<SincronizacaoSqlServer />);

      expect(screen.getByText('Pesquisas 2h')).toBeInTheDocument();
      expect(screen.queryByText('Books mensais')).not.toBeInTheDocument();

      abrirAbaBooks();

      expect(screen.getByText('Books mensais')).toBeInTheDocument();
      expect(screen.queryByText('Pesquisas 2h')).not.toBeInTheDocument();
      expect(screen.getByText('sincronizacaoSql.books.descricao')).toBeInTheDocument();
    });

    it('gerar books agora só para as empresas escolhidas', async () => {
      gerarBooksMock.mockResolvedValue({ execucaoId: 'e2' });
      render(<SincronizacaoSqlServer />);
      abrirAbaBooks();

      fireEvent.click(screen.getByRole('button', { name: /sincronizacaoSql.books.gerarAgora/ }));
      fireEvent.click(screen.getByLabelText('sincronizacaoSql.empresas.selecionadas'));
      fireEvent.click(screen.getByRole('checkbox', { name: 'VOTORANTIM' }));
      fireEvent.click(screen.getByRole('button', { name: 'sincronizacaoSql.books.confirmarGerar' }));

      await waitFor(() => expect(gerarBooksMock).toHaveBeenCalledWith(['e1']));
    });

    it('tabela de books mostra as empresas do agendamento', () => {
      estado.agendamentos = [
        { ...agendamentoBooks, id: 'b1', nome: 'Todas', empresa_ids: [] },
        { ...agendamentoBooks, id: 'b2', nome: 'Só Votorantim', empresa_ids: ['e1'] },
      ];
      render(<SincronizacaoSqlServer />);
      abrirAbaBooks();

      expect(screen.getByText('sincronizacaoSql.agendamentos.empresas')).toBeInTheDocument();
      expect(screen.getByText('sincronizacaoSql.empresas.todasCurto')).toBeInTheDocument();
      expect(screen.getByText('VOTORANTIM')).toBeInTheDocument();
    });

    it('estado vazio da aba de books', () => {
      estado.agendamentos = [agendamento];
      render(<SincronizacaoSqlServer />);
      abrirAbaBooks();
      expect(screen.getByText('sincronizacaoSql.books.vazio')).toBeInTheDocument();
    });

    it('gerar books agora pede confirmação e dispara no sync-api', async () => {
      gerarBooksMock.mockResolvedValue({ execucaoId: 'e2' });
      render(<SincronizacaoSqlServer />);
      abrirAbaBooks();

      fireEvent.click(screen.getByRole('button', { name: /sincronizacaoSql.books.gerarAgora/ }));
      expect(gerarBooksMock).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'sincronizacaoSql.books.confirmarGerar' }));

      await waitFor(() => expect(gerarBooksMock).toHaveBeenCalledWith([]));
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'sincronizacaoSql.toasts.booksIniciado' }));
    });

    it('gerar books agora mostra o motivo quando o sync-api recusa', async () => {
      gerarBooksMock.mockRejectedValue(new Error('Já existe uma sincronização ou geração de books em andamento'));
      render(<SincronizacaoSqlServer />);
      abrirAbaBooks();

      fireEvent.click(screen.getByRole('button', { name: /sincronizacaoSql.books.gerarAgora/ }));
      fireEvent.click(screen.getByRole('button', { name: 'sincronizacaoSql.books.confirmarGerar' }));

      await waitFor(() =>
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'destructive', description: 'Já existe uma sincronização ou geração de books em andamento' })
        )
      );
    });

    it('gerar books agora fica bloqueado durante qualquer execução', () => {
      estado.execucoes = [{ id: 'e1', tipo: 'sincronizacao', status: 'executando', origem: 'agendado', iniciado_em: '2026-09-24T10:00:00Z', logs: [], resultado: null }];
      render(<SincronizacaoSqlServer />);
      abrirAbaBooks();
      expect(screen.getByRole('button', { name: /sincronizacaoSql.books.gerarAgora/ })).toBeDisabled();
    });

    it('novo agendamento na aba de books abre o modal do tipo books', () => {
      render(<SincronizacaoSqlServer />);
      abrirAbaBooks();
      fireEvent.click(screen.getByRole('button', { name: /sincronizacaoSql.books.novoAgendamento/ }));
      expect(screen.getByText('modal-agendamento')).toHaveAttribute('data-tipo', 'books');
    });

    it('novo agendamento do topo continua sendo de sincronização', () => {
      render(<SincronizacaoSqlServer />);
      fireEvent.click(screen.getByRole('button', { name: /sincronizacaoSql.novoAgendamento/ }));
      expect(screen.getByText('modal-agendamento')).toHaveAttribute('data-tipo', 'sincronizacao');
    });

    it('histórico mostra o resumo da geração de books e as empresas com erro', () => {
      estado.execucoes = [
        {
          id: 'e9',
          tipo: 'books',
          status: 'parcial',
          origem: 'agendado',
          iniciado_em: '2026-10-01T09:00:00Z',
          finalizado_em: '2026-10-01T10:00:00Z',
          logs: [],
          agendamento: { nome: 'Books mensais' },
          resultado: {
            gerarBooks: {
              sucesso: false,
              mes: 9,
              ano: 2026,
              total: 2,
              gerados: 1,
              erros: 1,
              pulados: 128,
              selecionadas: 2,
              empresas: [
                { empresa: 'ABBOTT', sucesso: true },
                { empresa: 'AGFA', sucesso: false, erro: 'Falha ao gerar book: sem dados' },
              ],
            },
          },
        },
      ];
      render(<SincronizacaoSqlServer />);
      fireEvent.mouseDown(screen.getByRole('tab', { name: 'sincronizacaoSql.tabs.historico' }));

      expect(screen.getByText('sincronizacaoSql.tabelas.gerarBooks')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Books mensais'));
      expect(screen.getByText('sincronizacaoSql.historico.booksResumo')).toBeInTheDocument();
      expect(screen.getByText('sincronizacaoSql.historico.booksSelecionadas')).toBeInTheDocument();
      expect(screen.getByText('AGFA')).toBeInTheDocument();
      expect(screen.getByText('Falha ao gerar book: sem dados')).toBeInTheDocument();
    });
  });
});
