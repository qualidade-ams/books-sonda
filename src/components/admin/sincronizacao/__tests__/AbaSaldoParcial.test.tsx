import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
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
  useSalvarAgendamentoSaldoParcial: vi.fn(),
  useAlternarAgendamentoSaldoParcial: vi.fn(),
  useExcluirAgendamentoSaldoParcial: vi.fn(),
  useExecutarSaldoParcialAgora: vi.fn(),
  useStatusSaldoParcial: vi.fn(),
  usePreverExecucoesSaldoParcial: vi.fn(),
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

let salvar: ReturnType<typeof mutacao>;
let executar: ReturnType<typeof mutacao>;
let alternar: ReturnType<typeof mutacao>;
let excluir: ReturnType<typeof mutacao>;

// O botão "Novo agendamento" fica no cabeçalho da tela Rotinas Automáticas
function Tela() {
  const [novoAberto, setNovoAberto] = useState(false);
  return (
    <>
      <button onClick={() => setNovoAberto(true)}>envioSaldoParcial.novoAgendamento</button>
      <AbaSaldoParcial novoAberto={novoAberto} onNovoAbertoChange={setNovoAberto} />
    </>
  );
}

const renderAba = () => render(<Tela />);
const cartao = (nome: string) => screen.getByText(nome).closest('li')!;
const abrirAcoes = async (user: ReturnType<typeof userEvent.setup>, nome = agendamento.nome) =>
  user.click(screen.getByRole('button', { name: `fase3Comum.acoesDe {"nome":"${nome}"}` }));

describe('AbaSaldoParcial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissao.edicao = true;
    salvar = mutacao();
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
    (hooks.useSalvarAgendamentoSaldoParcial as any).mockReturnValue(salvar);
    (hooks.useAlternarAgendamentoSaldoParcial as any).mockReturnValue(alternar);
    (hooks.useExcluirAgendamentoSaldoParcial as any).mockReturnValue(excluir);
    (hooks.useExecutarSaldoParcialAgora as any).mockReturnValue(executar);
    (hooks.useStatusSaldoParcial as any).mockReturnValue({
      agendadorAtivo: true,
      renderImagemConfigurado: true,
    });
    (hooks.usePreverExecucoesSaldoParcial as any).mockReturnValue({
      previsao: [],
      isFetching: false,
      error: null,
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

  // Formulário de criação e edição (o modal atual, até a edição em nível a mais)

  it('cria um agendamento com os clientes selecionados e o CC', async () => {
    const user = userEvent.setup();
    renderAba();

    await user.click(screen.getByRole('button', { name: /envioSaldoParcial.novoAgendamento/ }));
    await user.type(screen.getByLabelText('envioSaldoParcial.form.nome'), 'Parcial semanal');
    await user.click(screen.getByRole('checkbox', { name: /CLIENTE C/ }));
    await user.type(screen.getByLabelText('envioSaldoParcial.form.emailsCc'), '; cc@sonda.com');
    await user.click(screen.getByRole('button', { name: 'envioSaldoParcial.form.salvar' }));

    await waitFor(() => expect(salvar.mutateAsync).toHaveBeenCalled());
    const { id, dados } = salvar.mutateAsync.mock.calls[0][0];
    expect(id).toBeUndefined();
    expect(dados).toMatchObject({
      nome: 'Parcial semanal',
      empresaIds: ['e3'],
      emails_cc: ['gestor.c@sonda.com', 'cc@sonda.com'],
    });
  });

  it('fecha o formulário depois de salvar um novo agendamento', async () => {
    const user = userEvent.setup();
    renderAba();

    await user.click(screen.getByRole('button', { name: /envioSaldoParcial.novoAgendamento/ }));
    await user.type(screen.getByLabelText('envioSaldoParcial.form.nome'), 'Parcial semanal');
    await user.click(screen.getByRole('checkbox', { name: /CLIENTE C/ }));
    await user.click(screen.getByRole('button', { name: 'envioSaldoParcial.form.salvar' }));

    await waitFor(() =>
      expect(screen.queryByLabelText('envioSaldoParcial.form.nome')).not.toBeInTheDocument()
    );
  });

  it('editar abre o formulário com o agendamento e salva com o id dele', async () => {
    const user = userEvent.setup();
    renderAba();

    await abrirAcoes(user);
    await user.click(screen.getByRole('menuitem', { name: /rotinasSaldoParcial.cartao.editar/ }));
    expect(screen.getByLabelText('envioSaldoParcial.form.nome')).toHaveValue(
      'Parcial dias 15 e 25'
    );
    await user.click(screen.getByRole('button', { name: 'envioSaldoParcial.form.salvar' }));

    await waitFor(() => expect(salvar.mutateAsync).toHaveBeenCalled());
    expect(salvar.mutateAsync.mock.calls[0][0].id).toBe('ag-1');
  });

  it('ao marcar um cliente pré-preenche o CC com o e-mail do gestor dele, sem repetir', async () => {
    const user = userEvent.setup();
    renderAba();

    await user.click(screen.getByRole('button', { name: /envioSaldoParcial.novoAgendamento/ }));
    const cc = screen.getByLabelText('envioSaldoParcial.form.emailsCc');
    await user.type(cc, 'qualidade@sonda.com');
    await user.click(screen.getByRole('checkbox', { name: /CLIENTE A/ }));
    await user.click(screen.getByRole('checkbox', { name: /CLIENTE B/ }));
    await user.click(screen.getByRole('checkbox', { name: /CLIENTE C/ }));

    expect(cc).toHaveValue('qualidade@sonda.com; gestor.ab@sonda.com; gestor.c@sonda.com');
  });

  it('ao desmarcar um cliente tira o gestor do CC só se nenhum outro cliente marcado tiver o mesmo gestor', async () => {
    const user = userEvent.setup();
    renderAba();

    await user.click(screen.getByRole('button', { name: /envioSaldoParcial.novoAgendamento/ }));
    const cc = screen.getByLabelText('envioSaldoParcial.form.emailsCc');
    await user.click(screen.getByRole('checkbox', { name: /CLIENTE A/ }));
    await user.click(screen.getByRole('checkbox', { name: /CLIENTE B/ }));
    await user.click(screen.getByRole('checkbox', { name: /CLIENTE C/ }));

    await user.click(screen.getByRole('checkbox', { name: /CLIENTE C/ }));
    await user.click(screen.getByRole('checkbox', { name: /CLIENTE A/ }));
    expect(cc).toHaveValue('gestor.ab@sonda.com');

    await user.click(screen.getByRole('checkbox', { name: /CLIENTE B/ }));
    expect(cc).toHaveValue('');
  });

  it('ao colar e-mails no CC remove o nome e os <> e mantém só os endereços', async () => {
    const user = userEvent.setup();
    renderAba();

    await user.click(screen.getByRole('button', { name: /envioSaldoParcial.novoAgendamento/ }));
    const cc = screen.getByLabelText('envioSaldoParcial.form.emailsCc');
    await user.type(cc, 'qualidade@sonda.com');
    await user.paste(
      'Rafael Viegas <rafael.viegas@sonda.com>; Giselle Lobo <giselle.lobo@sonda.com>; qualidade@sonda.com'
    );

    expect(cc).toHaveValue('qualidade@sonda.com; rafael.viegas@sonda.com; giselle.lobo@sonda.com');
  });

  it('no formulário mostra quais clientes não têm contatos de Saldo Parcial', async () => {
    const user = userEvent.setup();
    renderAba();

    await user.click(screen.getByRole('button', { name: /envioSaldoParcial.novoAgendamento/ }));

    const clienteB = screen.getByRole('checkbox', { name: /CLIENTE B/ }).closest('label')!;
    expect(within(clienteB).getByText('envioSaldoParcial.form.semContatos')).toBeInTheDocument();
  });

  it('a lista de clientes do formulário contém os próprios elementos (evita espaço em branco no fim do modal)', async () => {
    const user = userEvent.setup();
    renderAba();

    await user.click(screen.getByRole('button', { name: /envioSaldoParcial.novoAgendamento/ }));

    const lista = screen
      .getByRole('checkbox', { name: /CLIENTE A/ })
      .closest('label')!.parentElement!;
    expect(lista.className).toContain('overflow-y-auto');
    expect(lista.className).toContain('relative');
  });
});
