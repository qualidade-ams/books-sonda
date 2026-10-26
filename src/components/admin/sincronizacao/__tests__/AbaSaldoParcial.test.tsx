import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { AbaSaldoParcial } from '../AbaSaldoParcial';
import * as hooks from '@/hooks/useEnvioSaldoParcial';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, opcoes?: Record<string, unknown>) =>
      opcoes ? `${chave} ${JSON.stringify(opcoes)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));

vi.mock('@/components/auth', () => ({
  ProtectedAction: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const permissao = { edicao: true };
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => permissao.edicao }),
}));

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useApiStatus', () => ({ useApiStatus: () => ({ data: true }) }));

vi.mock('@/hooks/useEnvioSaldoParcial', () => ({
  useAgendamentosSaldoParcial: vi.fn(),
  useExecucoesSaldoParcial: vi.fn(),
  useClientesElegiveisSaldoParcial: vi.fn(),
  useSemAgendamentoSaldoParcial: vi.fn(),
  useAlternarAgendamentoSaldoParcial: vi.fn(),
  useExcluirAgendamentoSaldoParcial: vi.fn(),
  useExecutarSaldoParcialAgora: vi.fn(),
  useStatusSaldoParcial: vi.fn(),
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
  ultimo_status: null,
};

const execucao = {
  id: 'x1',
  agendamento_id: 'ag-1',
  empresa_id: 'e1',
  origem: 'agendado',
  status: 'sem_destinatarios',
  qtd_destinatarios: 0,
  qtd_emails: 0,
  erro: null,
  iniciado_em: '2026-10-15T10:00:05Z',
  finalizado_em: '2026-10-15T10:00:06Z',
  executado_para: '2026-10-15T10:00:00Z',
  agendamento: { nome: 'Parcial dias 15 e 25' },
  empresa: { nome_abreviado: 'CLIENTE A' },
};

const mutacao = (fn = vi.fn().mockResolvedValue(undefined)) => ({
  mutateAsync: fn,
  isPending: false,
});

let executar: ReturnType<typeof mutacao>;
let alternar: ReturnType<typeof mutacao>;
let excluir: ReturnType<typeof mutacao>;

// A edição abre no lugar da tela Rotinas Automáticas, que recebe o pedido
const onEditar = vi.fn();
const renderAba = () => render(<AbaSaldoParcial onEditar={onEditar} />);
const cartao = (nome: string) => screen.getByText(nome).closest('li')!;
const abrirAcoes = async (user: ReturnType<typeof userEvent.setup>, nome = agendamento.nome) =>
  user.click(screen.getByRole('button', { name: `fase3Comum.acoesDe {"nome":"${nome}"}` }));

describe('AbaSaldoParcial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissao.edicao = true;
    executar = mutacao();
    alternar = mutacao();
    excluir = mutacao();
    (hooks.useAgendamentosSaldoParcial as any).mockReturnValue({
      agendamentos: [agendamento],
      isLoading: false,
      error: null,
    });
    (hooks.useExecucoesSaldoParcial as any).mockReturnValue({
      execucoes: [execucao],
      isLoading: false,
      error: null,
    });
    (hooks.useClientesElegiveisSaldoParcial as any).mockReturnValue({
      clientes: [
        {
          id: 'e1',
          nome: 'CLIENTE A',
          qtdContatosSaldoParcial: 2,
          emailGestor: 'gestor.ab@sonda.com',
        },
        {
          id: 'e2',
          nome: 'CLIENTE B',
          qtdContatosSaldoParcial: 0,
          emailGestor: 'gestor.ab@sonda.com',
        },
        {
          id: 'e3',
          nome: 'CLIENTE C',
          qtdContatosSaldoParcial: 1,
          emailGestor: 'gestor.c@sonda.com',
        },
      ],
      isLoading: false,
    });
    (hooks.useSemAgendamentoSaldoParcial as any).mockReturnValue({
      empresas: [
        { id: 'e3', nome: 'CLIENTE C', qtdContatosSaldoParcial: 1, emailGestor: null },
        { id: 'e4', nome: 'CLIENTE D', qtdContatosSaldoParcial: 0, emailGestor: null },
      ],
      isLoading: false,
      error: null,
    });
    (hooks.useAlternarAgendamentoSaldoParcial as any).mockReturnValue(alternar);
    (hooks.useExcluirAgendamentoSaldoParcial as any).mockReturnValue(excluir);
    (hooks.useExecutarSaldoParcialAgora as any).mockReturnValue(executar);
    (hooks.useStatusSaldoParcial as any).mockReturnValue({
      agendadorAtivo: true,
      renderImagemConfigurado: true,
    });
  });

  it('mostra cada agendamento num cartão, com a recorrência, as empresas e a cópia', () => {
    renderAba();

    const c = cartao('Parcial dias 15 e 25');
    expect(
      within(c).getByText(/rotinasSaldoParcial.cartao.empresas.varios.*"n":2/)
    ).toBeInTheDocument();
    expect(within(c).getByText(/qualidade@sonda.com/)).toBeInTheDocument();
    expect(within(c).getByText(/sincronizacaoSql.recorrencia/)).toBeInTheDocument();
  });

  it('ordena os agendamentos pelo próximo envio mais próximo, deixando os sem data por último', () => {
    (hooks.useAgendamentosSaldoParcial as any).mockReturnValue({
      agendamentos: [
        { ...agendamento, id: 'ag-inativo', nome: 'Inativo', ativo: false, proxima_execucao: null },
        {
          ...agendamento,
          id: 'ag-25',
          nome: 'Dia 25',
          proxima_execucao: '2026-10-25T13:00:00.000Z',
        },
        {
          ...agendamento,
          id: 'ag-12b',
          nome: 'Dia 12 B',
          proxima_execucao: '2026-10-12T13:00:00.000Z',
        },
        {
          ...agendamento,
          id: 'ag-12a',
          nome: 'Dia 12 A',
          proxima_execucao: '2026-10-12T13:00:00.000Z',
        },
        { ...agendamento, id: 'ag-7', nome: 'Dia 7', proxima_execucao: '2026-10-07T13:00:00.000Z' },
      ],
      isLoading: false,
      error: null,
    });

    renderAba();

    const nomes = ['Inativo', 'Dia 25', 'Dia 12 B', 'Dia 12 A', 'Dia 7'];
    const ordem = within(
      screen.getByRole('list', { name: 'rotinasSaldoParcial.abas.agendamentos' })
    )
      .getAllByRole('listitem')
      .map((li) => nomes.find((n) => within(li).queryByText(n)));
    expect(ordem).toEqual(['Dia 7', 'Dia 12 A', 'Dia 12 B', 'Dia 25', 'Inativo']);
  });

  it('avisa quantas empresas do agendamento não têm contato de Saldo Parcial', () => {
    renderAba();
    expect(
      within(cartao('Parcial dias 15 e 25')).getByText(
        /rotinasSaldoParcial.cartao.semContato.*"n":1/
      )
    ).toBeInTheDocument();
  });

  it('indicadores de agendamentos ativos e empresas agendadas', () => {
    // Sem animação: o número aparece direto
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      ...original(q),
      matches: q.includes('prefers-reduced-motion'),
    })) as typeof window.matchMedia;
    try {
      renderAba();
      const ativos = screen.getByText('rotinasSaldoParcial.indicadores.ativos').parentElement!;
      expect(within(ativos).getByText('1')).toBeInTheDocument();
      const empresas = screen.getByText('rotinasSaldoParcial.indicadores.empresas').parentElement!;
      expect(within(empresas).getByText('2')).toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });

  it('"Executar agora" pede confirmação, avisa quem já recebeu hoje e dispara o envio', async () => {
    (hooks.useExecucoesSaldoParcial as any).mockReturnValue({
      execucoes: [{ ...execucao, status: 'sucesso', iniciado_em: new Date().toISOString() }],
      isLoading: false,
      error: null,
    });
    const user = userEvent.setup();
    renderAba();

    await abrirAcoes(user);
    await user.click(screen.getByRole('menuitem', { name: /rotinasSaldoParcial.cartao.executar/ }));
    const dialogo = await screen.findByRole('alertdialog');
    expect(
      within(dialogo).getByText(/rotinasSaldoParcial.executar.recebeuHoje.um.*CLIENTE A/)
    ).toBeInTheDocument();
    await user.click(
      within(dialogo).getByRole('button', { name: 'rotinasSaldoParcial.executar.confirmar' })
    );

    await waitFor(() => expect(executar.mutateAsync).toHaveBeenCalledWith('ag-1'));
  });

  it('desativar pede confirmação; ativar não', async () => {
    (hooks.useAgendamentosSaldoParcial as any).mockReturnValue({
      agendamentos: [agendamento, { ...agendamento, id: 'ag-2', nome: 'Parado', ativo: false }],
      isLoading: false,
      error: null,
    });
    const user = userEvent.setup();
    renderAba();

    await user.click(
      screen.getByRole('switch', { name: /rotinasSaldoParcial.cartao.ativo.*Parado/ })
    );
    await waitFor(() =>
      expect(alternar.mutateAsync).toHaveBeenCalledWith({ id: 'ag-2', ativo: true })
    );

    await user.click(
      screen.getByRole('switch', { name: /rotinasSaldoParcial.cartao.ativo.*Parcial dias/ })
    );
    const dialogo = await screen.findByRole('alertdialog');
    await user.click(
      within(dialogo).getByRole('button', { name: 'rotinasSaldoParcial.desativar.confirmar' })
    );
    await waitFor(() =>
      expect(alternar.mutateAsync).toHaveBeenCalledWith({ id: 'ag-1', ativo: false })
    );
  });

  it('excluir pede confirmação', async () => {
    const user = userEvent.setup();
    renderAba();

    await abrirAcoes(user);
    await user.click(screen.getByRole('menuitem', { name: /rotinasSaldoParcial.cartao.excluir/ }));
    const dialogo = await screen.findByRole('alertdialog');
    await user.click(
      within(dialogo).getByRole('button', { name: 'rotinasSaldoParcial.excluir.confirmar' })
    );
    await waitFor(() => expect(excluir.mutateAsync).toHaveBeenCalledWith('ag-1'));
  });

  it('só quem edita vê as ações', () => {
    permissao.edicao = false;
    renderAba();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fase3Comum.acoesDe/ })).not.toBeInTheDocument();
  });

  it('lista as empresas sem agendamento, com quem não tem contato', async () => {
    const user = userEvent.setup();
    renderAba();

    await user.click(screen.getByRole('tab', { name: /rotinasSaldoParcial.abas.sem/ }));
    const lista = screen.getByRole('list', { name: 'rotinasSaldoParcial.abas.sem' });
    expect(within(lista).getByText('CLIENTE C')).toBeInTheDocument();
    const d = within(lista).getByText('CLIENTE D').closest('li')!;
    expect(within(d).getByText('rotinasSaldoParcial.sem.semContato')).toBeInTheDocument();
  });

  it('mostra o histórico com a origem, a situação e os destinatários, e filtra pela situação', async () => {
    (hooks.useExecucoesSaldoParcial as any).mockReturnValue({
      execucoes: [
        execucao,
        {
          ...execucao,
          id: 'x2',
          origem: 'manual',
          agendamento_id: null,
          status: 'erro',
          erro: 'Caixa cheia',
          empresa: { nome_abreviado: 'CLIENTE B' },
        },
      ],
      isLoading: false,
      error: null,
    });
    const user = userEvent.setup();
    renderAba();

    await user.click(screen.getByRole('tab', { name: /rotinasSaldoParcial.abas.historico/ }));
    const lista = screen.getByRole('list', { name: 'rotinasSaldoParcial.historico.lista' });
    const a = within(lista).getByText('CLIENTE A').closest('li')!;
    expect(
      within(a).getByText('rotinasSaldoParcial.situacoes.sem_destinatarios')
    ).toBeInTheDocument();
    expect(within(a).getByText('Parcial dias 15 e 25')).toBeInTheDocument();
    const b = within(lista).getByText('CLIENTE B').closest('li')!;
    expect(within(b).getByText('rotinasSaldoParcial.historico.controle')).toBeInTheDocument();
    expect(within(b).getByText('Caixa cheia')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /rotinasSaldoParcial.historico.situacao/ })
    );
    await user.click(screen.getByRole('checkbox', { name: 'rotinasSaldoParcial.situacoes.erro' }));
    expect(within(lista).queryByText('CLIENTE A')).not.toBeInTheDocument();
    expect(within(lista).getByText('CLIENTE B')).toBeInTheDocument();
  });

  it('mostra o próximo envio na hora, mesmo antes de o agendador do servidor recalcular', () => {
    (hooks.useAgendamentosSaldoParcial as any).mockReturnValue({
      agendamentos: [{ ...agendamento, proxima_execucao: null }],
      isLoading: false,
      error: null,
    });

    renderAba();

    expect(
      within(cartao('Parcial dias 15 e 25')).getByText(/\d{2}\/\d{2}\/\d{4}/)
    ).toBeInTheDocument();
  });

  it('avisa quando o sync-api está sem a RENDER_IMAGE_URL (nenhum e-mail sai sem a imagem)', () => {
    (hooks.useStatusSaldoParcial as any).mockReturnValue({
      agendadorAtivo: true,
      renderImagemConfigurado: false,
    });
    renderAba();
    expect(screen.getByText('rotinasSaldoParcial.servico.semImagem')).toBeInTheDocument();
  });

  it('avisa quando o agendador está desligado no servidor; ligado, diz que está ligado', () => {
    (hooks.useStatusSaldoParcial as any).mockReturnValue({ agendadorAtivo: false });
    const { unmount } = renderAba();
    expect(screen.getByText('rotinasSaldoParcial.servico.desligado')).toBeInTheDocument();
    unmount();

    (hooks.useStatusSaldoParcial as any).mockReturnValue({
      agendadorAtivo: true,
      renderImagemConfigurado: true,
    });
    renderAba();
    expect(screen.getByText('rotinasSaldoParcial.servico.ligado')).toBeInTheDocument();
    expect(screen.queryByText('rotinasSaldoParcial.servico.semImagem')).not.toBeInTheDocument();
  });

  it('erro ao carregar os agendamentos', () => {
    (hooks.useAgendamentosSaldoParcial as any).mockReturnValue({
      agendamentos: [],
      isLoading: false,
      error: new Error('sem rede'),
      refetch: vi.fn(),
    });
    renderAba();
    expect(screen.getByText('rotinasSaldoParcial.erro')).toBeInTheDocument();
  });

  it('editar pede a edição do agendamento à tela', async () => {
    const user = userEvent.setup();
    renderAba();

    await abrirAcoes(user);
    await user.click(screen.getByRole('menuitem', { name: /rotinasSaldoParcial.cartao.editar/ }));
    expect(onEditar).toHaveBeenCalledWith(expect.objectContaining({ id: 'ag-1' }));
  });

  it('sem agendamentos, quem edita cria o primeiro dali mesmo', async () => {
    (hooks.useAgendamentosSaldoParcial as any).mockReturnValue({
      agendamentos: [],
      isLoading: false,
      error: null,
    });
    const user = userEvent.setup();
    renderAba();

    expect(screen.getByText('rotinasSaldoParcial.vazio.titulo')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /envioSaldoParcial.novoAgendamento/ }));
    expect(onEditar).toHaveBeenCalledWith(null);
  });
});
