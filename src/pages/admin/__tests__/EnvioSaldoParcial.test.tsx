import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import EnvioSaldoParcial from '../EnvioSaldoParcial';
import * as hooks from '@/hooks/useEnvioSaldoParcial';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, opcoes?: Record<string, unknown>) => (opcoes ? `${chave} ${JSON.stringify(opcoes)}` : chave),
    i18n: { language: 'pt-BR' }
  })
}));

vi.mock('@/components/admin/LayoutAdmin', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/auth', () => ({ ProtectedAction: ({ children }: { children: ReactNode }) => <>{children}</> }));

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useApiStatus', () => ({ useApiStatus: () => ({ data: true }) }));

vi.mock('@/hooks/useEnvioSaldoParcial', () => ({
  useAgendamentosSaldoParcial: vi.fn(),
  useExecucoesSaldoParcial: vi.fn(),
  useClientesElegiveisSaldoParcial: vi.fn(),
  useSalvarAgendamentoSaldoParcial: vi.fn(),
  useAlternarAgendamentoSaldoParcial: vi.fn(),
  useExcluirAgendamentoSaldoParcial: vi.fn(),
  useExecutarSaldoParcialAgora: vi.fn(),
  useStatusSaldoParcial: vi.fn(),
  usePreverExecucoesSaldoParcial: vi.fn()
}));

const agendamento = {
  id: 'ag-1',
  nome: 'Parcial dias 15 e 25',
  ativo: true,
  emails_cc: ['qualidade@sonda.com'],
  empresas: [{ empresa_id: 'e1' }, { empresa_id: 'e2' }],
  frequencia: 'mensal',
  dias_semana: [],
  dias_mes: [15, 25],
  ultimo_dia_mes: false,
  modo_horario: 'horarios',
  horarios: ['07:00'],
  intervalo_horas: null,
  hora_inicio: null,
  hora_fim: null,
  proxima_execucao: '2026-10-25T10:00:00.000Z',
  ultima_execucao: null,
  ultimo_status: null
};

const mutacao = (fn = vi.fn().mockResolvedValue(undefined)) => ({ mutateAsync: fn, isPending: false });

let salvar: ReturnType<typeof mutacao>;
let executar: ReturnType<typeof mutacao>;

describe('EnvioSaldoParcial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    salvar = mutacao();
    executar = mutacao();
    (hooks.useAgendamentosSaldoParcial as any).mockReturnValue({ agendamentos: [agendamento], isLoading: false, error: null });
    (hooks.useExecucoesSaldoParcial as any).mockReturnValue({
      execucoes: [{
        id: 'x1', empresa_id: 'e1', origem: 'agendado', status: 'sem_destinatarios', qtd_destinatarios: 0, qtd_emails: 0,
        erro: null, iniciado_em: '2026-10-15T10:00:05Z', finalizado_em: '2026-10-15T10:00:06Z', executado_para: '2026-10-15T10:00:00Z',
        agendamento: { nome: 'Parcial dias 15 e 25' }, empresa: { nome_abreviado: 'CLIENTE A' }
      }],
      isLoading: false,
      error: null
    });
    (hooks.useClientesElegiveisSaldoParcial as any).mockReturnValue({
      clientes: [
        { id: 'e1', nome: 'CLIENTE A', qtdContatosSaldoParcial: 2 },
        { id: 'e2', nome: 'CLIENTE B', qtdContatosSaldoParcial: 0 },
        { id: 'e3', nome: 'CLIENTE C', qtdContatosSaldoParcial: 1 }
      ],
      isLoading: false
    });
    (hooks.useSalvarAgendamentoSaldoParcial as any).mockReturnValue(salvar);
    (hooks.useAlternarAgendamentoSaldoParcial as any).mockReturnValue(mutacao());
    (hooks.useExcluirAgendamentoSaldoParcial as any).mockReturnValue(mutacao());
    (hooks.useExecutarSaldoParcialAgora as any).mockReturnValue(executar);
    (hooks.useStatusSaldoParcial as any).mockReturnValue({ agendadorAtivo: true });
    (hooks.usePreverExecucoesSaldoParcial as any).mockReturnValue({ previsao: [], isFetching: false, error: null });
  });

  it('lista os agendamentos com a quantidade de clientes e os e-mails em cópia', () => {
    render(<EnvioSaldoParcial />);

    const linha = screen.getByText('Parcial dias 15 e 25').closest('tr')!;
    expect(within(linha).getByText(/envioSaldoParcial.agendamentos.qtdClientes.*"count":2/)).toBeInTheDocument();
    expect(within(linha).getByText('qualidade@sonda.com')).toBeInTheDocument();
  });

  it('avisa quando um cliente do agendamento não tem contatos de Saldo Parcial', () => {
    render(<EnvioSaldoParcial />);

    const linha = screen.getByText('Parcial dias 15 e 25').closest('tr')!;
    expect(within(linha).getByText(/envioSaldoParcial.agendamentos.clientesSemContato.*"count":1/)).toBeInTheDocument();
  });

  it('"Executar agora" dispara o envio do agendamento', async () => {
    const user = userEvent.setup();
    render(<EnvioSaldoParcial />);

    await user.click(screen.getByTitle('envioSaldoParcial.agendamentos.executarAgora'));
    await user.click(await screen.findByRole('button', { name: 'envioSaldoParcial.agendamentos.confirmarExecutar' }));

    await waitFor(() => expect(executar.mutateAsync).toHaveBeenCalledWith('ag-1'));
  });

  it('cria um agendamento com os clientes selecionados e o CC', async () => {
    const user = userEvent.setup();
    render(<EnvioSaldoParcial />);

    await user.click(screen.getByRole('button', { name: /envioSaldoParcial.novoAgendamento/ }));
    await user.type(screen.getByLabelText('envioSaldoParcial.form.nome'), 'Parcial semanal');
    await user.click(screen.getByRole('checkbox', { name: /CLIENTE C/ }));
    await user.type(screen.getByLabelText('envioSaldoParcial.form.emailsCc'), 'cc@sonda.com');
    await user.click(screen.getByRole('button', { name: 'envioSaldoParcial.form.salvar' }));

    await waitFor(() => expect(salvar.mutateAsync).toHaveBeenCalled());
    const { id, dados } = salvar.mutateAsync.mock.calls[0][0];
    expect(id).toBeUndefined();
    expect(dados).toMatchObject({ nome: 'Parcial semanal', empresaIds: ['e3'], emails_cc: ['cc@sonda.com'] });
  });

  it('no formulário mostra quais clientes não têm contatos de Saldo Parcial', async () => {
    const user = userEvent.setup();
    render(<EnvioSaldoParcial />);

    await user.click(screen.getByRole('button', { name: /envioSaldoParcial.novoAgendamento/ }));

    const clienteB = screen.getByRole('checkbox', { name: /CLIENTE B/ }).closest('label')!;
    expect(within(clienteB).getByText('envioSaldoParcial.form.semContatos')).toBeInTheDocument();
  });

  it('mostra o histórico por cliente com o status e a quantidade de destinatários', async () => {
    const user = userEvent.setup();
    render(<EnvioSaldoParcial />);

    await user.click(screen.getByRole('tab', { name: 'envioSaldoParcial.tabs.historico' }));

    const linha = (await screen.findByText('CLIENTE A')).closest('tr')!;
    expect(within(linha).getByText('envioSaldoParcial.status.sem_destinatarios')).toBeInTheDocument();
    // destinatários e e-mails enviados
    expect(within(linha).getAllByText('0')).toHaveLength(2);
  });

  it('mostra o próximo envio na hora, mesmo antes de o agendador do servidor recalcular', () => {
    (hooks.useAgendamentosSaldoParcial as any).mockReturnValue({
      agendamentos: [{ ...agendamento, proxima_execucao: null }],
      isLoading: false,
      error: null
    });

    render(<EnvioSaldoParcial />);

    const linha = screen.getByText('Parcial dias 15 e 25').closest('tr')!;
    expect(within(linha).queryByText('envioSaldoParcial.agendamentos.calculando')).not.toBeInTheDocument();
    expect(within(linha).getByText(/\d{2}\/\d{2}\/\d{4}/)).toBeInTheDocument();
  });

  it('a lista de clientes do formulário contém os próprios elementos (evita espaço em branco no fim do modal)', async () => {
    const user = userEvent.setup();
    render(<EnvioSaldoParcial />);

    await user.click(screen.getByRole('button', { name: /envioSaldoParcial.novoAgendamento/ }));

    const lista = screen.getByRole('checkbox', { name: /CLIENTE A/ }).closest('label')!.parentElement!;
    expect(lista.className).toContain('overflow-y-auto');
    expect(lista.className).toContain('relative');
  });

  it('avisa quando o sync-api está sem a RENDER_IMAGE_URL (nenhum e-mail sai sem a imagem)', () => {
    (hooks.useStatusSaldoParcial as any).mockReturnValue({ agendadorAtivo: true, renderImagemConfigurado: false });

    render(<EnvioSaldoParcial />);

    expect(screen.getByText('envioSaldoParcial.renderImagemNaoConfigurado')).toBeInTheDocument();
  });

  it('não mostra o aviso de imagem quando está configurada', () => {
    (hooks.useStatusSaldoParcial as any).mockReturnValue({ agendadorAtivo: true, renderImagemConfigurado: true });

    render(<EnvioSaldoParcial />);

    expect(screen.queryByText('envioSaldoParcial.renderImagemNaoConfigurado')).not.toBeInTheDocument();
  });

  it('avisa quando o agendador está desligado no servidor', () => {
    (hooks.useStatusSaldoParcial as any).mockReturnValue({ agendadorAtivo: false });

    render(<EnvioSaldoParcial />);

    expect(screen.getByText('envioSaldoParcial.agendadorDesligado')).toBeInTheDocument();
  });
});
