import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import { EdicaoAgendamento } from '../EdicaoAgendamento';
import * as hooks from '@/hooks/useEnvioSaldoParcial';
import { ErroTraduzivel } from '@/errors/erroTraduzivel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, opcoes?: Record<string, unknown>) =>
      opcoes ? `${chave} ${JSON.stringify(opcoes)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

vi.mock('@/hooks/useEnvioSaldoParcial', () => ({
  useAgendamentosSaldoParcial: vi.fn(),
  useClientesElegiveisSaldoParcial: vi.fn(),
  useSalvarAgendamentoSaldoParcial: vi.fn(),
  usePreverExecucoesSaldoParcial: vi.fn(),
}));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

const agendamento = {
  id: 'ag-1',
  nome: 'Parcial dias 15 e 25',
  ativo: true,
  emails_cc: ['qualidade@sonda.com'],
  empresas: [{ empresa_id: 'e1' }],
  frequencia: 'mensal',
  dias_semana: [],
  dias_mes: [15, 25],
  ultimo_dia_mes: false,
  modo_horario: 'horarios',
  horarios: ['07:00'],
  intervalo_horas: null,
  hora_inicio: null,
  hora_fim: null,
  proxima_execucao: null,
  ultima_execucao: null,
  ultimo_status: null,
};
const outro = { ...agendamento, id: 'ag-2', nome: 'Semanal', empresas: [{ empresa_id: 'e4' }] };

let salvar: { mutateAsync: ReturnType<typeof vi.fn>; isPending: boolean };
const onFechar = vi.fn();

const renderizar = (ag: typeof agendamento | null = null) =>
  render(
    <TooltipProvider>
      <EdicaoAgendamento agendamento={ag as any} onFechar={onFechar} />
    </TooltipProvider>
  );
const empresa = (nome: string) => screen.getByRole('checkbox', { name: new RegExp(nome) });
const cc = () => screen.getByPlaceholderText('rotinasSaldoParcial.edicao.copiaPlaceholder');
const chipsDoCc = () =>
  within(screen.getByRole('list', { name: 'rotinasSaldoParcial.edicao.copia' }))
    .queryAllByRole('listitem')
    .map((li) => li.textContent);

describe('EdicaoAgendamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    salvar = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
    (hooks.useSalvarAgendamentoSaldoParcial as any).mockReturnValue(salvar);
    (hooks.useAgendamentosSaldoParcial as any).mockReturnValue({
      agendamentos: [agendamento, outro],
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
        { id: 'e4', nome: 'CLIENTE D', qtdContatosSaldoParcial: 1, emailGestor: null },
      ],
      isLoading: false,
    });
    (hooks.usePreverExecucoesSaldoParcial as any).mockReturnValue({
      previsao: [],
      isFetching: false,
      error: null,
    });
  });

  it('cria um agendamento com as empresas marcadas e a cópia, e volta', async () => {
    const user = userEvent.setup();
    renderizar();

    const criar = screen.getByRole('button', { name: 'rotinasSaldoParcial.edicao.criar' });
    expect(criar).toBeDisabled();

    await user.type(screen.getByLabelText(/rotinasSaldoParcial.edicao.nome/), 'Parcial semanal');
    await user.click(empresa('CLIENTE C'));
    await user.type(cc(), 'cc@sonda.com{Enter}');
    await user.click(criar);

    await waitFor(() => expect(salvar.mutateAsync).toHaveBeenCalled());
    const { id, dados } = salvar.mutateAsync.mock.calls[0][0];
    expect(id).toBeUndefined();
    expect(dados).toMatchObject({
      nome: 'Parcial semanal',
      ativo: true,
      empresaIds: ['e3'],
      emails_cc: ['gestor.c@sonda.com', 'cc@sonda.com'],
    });
    expect(onFechar).toHaveBeenCalled();
  });

  it('edita um agendamento: começa preenchido e salva com o id dele', async () => {
    const user = userEvent.setup();
    renderizar(agendamento);

    expect(screen.getByLabelText(/rotinasSaldoParcial.edicao.nome/)).toHaveValue(
      'Parcial dias 15 e 25'
    );
    expect(empresa('CLIENTE A')).toBeChecked();
    expect(chipsDoCc()).toEqual(['qualidade@sonda.com']);
    await user.click(screen.getByRole('button', { name: 'ds.formulario.salvar' }));

    await waitFor(() => expect(salvar.mutateAsync).toHaveBeenCalled());
    expect(salvar.mutateAsync.mock.calls[0][0]).toMatchObject({
      id: 'ag-1',
      dados: { frequencia: 'mensal', dias_mes: [15, 25] },
    });
  });

  it('empresa de outro agendamento fica bloqueada, com o nome dele; sem contato é avisada', () => {
    renderizar(agendamento);
    expect(empresa('CLIENTE D')).toBeDisabled();
    const d = empresa('CLIENTE D').closest('label')!;
    expect(within(d).getByText(/rotinasSaldoParcial.edicao.emOutro.*Semanal/)).toBeInTheDocument();
    const b = empresa('CLIENTE B').closest('label')!;
    expect(within(b).getByText('rotinasSaldoParcial.sem.semContato')).toBeInTheDocument();
  });

  it('ao marcar uma empresa o gestor entra na cópia; ao desmarcar sai, se nenhuma outra marcada tiver o mesmo', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(empresa('CLIENTE A'));
    await user.click(empresa('CLIENTE B'));
    await user.click(empresa('CLIENTE C'));
    expect(chipsDoCc()).toEqual(['gestor.ab@sonda.com', 'gestor.c@sonda.com']);

    await user.click(empresa('CLIENTE C'));
    await user.click(empresa('CLIENTE A'));
    expect(chipsDoCc()).toEqual(['gestor.ab@sonda.com']);

    await user.click(empresa('CLIENTE B'));
    expect(chipsDoCc()).toEqual([]);
  });

  it('colar do Outlook na cópia mantém só os endereços, sem repetir; e-mail inválido não entra', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(cc());
    await user.paste(
      'Rafael Viegas <rafael.viegas@sonda.com>; Giselle Lobo <giselle.lobo@sonda.com>'
    );
    await user.type(cc(), 'rafael.viegas@sonda.com{Enter}');
    expect(chipsDoCc()).toEqual(['rafael.viegas@sonda.com', 'giselle.lobo@sonda.com']);

    await user.type(cc(), 'sem-arroba{Enter}');
    expect(chipsDoCc()).toHaveLength(2);
    expect(screen.getByText('rotinasSaldoParcial.edicao.emailInvalido')).toBeInTheDocument();
  });

  it('semanal sem dia não salva e avisa', async () => {
    const user = userEvent.setup();
    renderizar(agendamento);

    await user.click(
      screen.getByRole('radio', { name: 'rotinasSaldoParcial.edicao.frequencias.semanal' })
    );
    // Começa com os dias úteis; tira todos
    for (const d of [1, 2, 3, 4, 5]) {
      await user.click(screen.getByRole('button', { name: `sincronizacaoSql.diasSemana.d${d}` }));
    }
    expect(screen.getByText('sincronizacaoSql.validacao.diaSemanaObrigatorio')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ds.formulario.salvar' })).toBeDisabled();
  });

  it('horários em intervalo', async () => {
    const user = userEvent.setup();
    renderizar(agendamento);

    await user.click(
      screen.getByRole('radio', { name: 'rotinasSaldoParcial.edicao.modos.intervalo' })
    );
    await user.clear(screen.getByLabelText('rotinasSaldoParcial.edicao.das'));
    await user.type(screen.getByLabelText('rotinasSaldoParcial.edicao.das'), '08:00');
    await user.click(screen.getByRole('button', { name: 'ds.formulario.salvar' }));

    await waitFor(() => expect(salvar.mutateAsync).toHaveBeenCalled());
    expect(salvar.mutateAsync.mock.calls[0][0].dados).toMatchObject({
      modo_horario: 'intervalo',
      hora_inicio: '08:00',
      intervalo_horas: 2,
    });
  });

  it('mostra a regra e os próximos envios', () => {
    (hooks.usePreverExecucoesSaldoParcial as any).mockReturnValue({
      previsao: ['2099-11-15T10:00:00Z', '2099-11-25T10:00:00Z'],
      isFetching: false,
      error: null,
    });
    renderizar(agendamento);
    expect(screen.getByText(/sincronizacaoSql.recorrencia/)).toBeInTheDocument();
    expect(screen.getByText(/15\/11\/2099/)).toBeInTheDocument();
  });

  it('erro ao salvar: avisa e continua na edição', async () => {
    salvar.mutateAsync.mockRejectedValue(new Error('Um dos clientes já está em outro agendamento'));
    const user = userEvent.setup();
    renderizar(agendamento);

    await user.click(screen.getByRole('button', { name: 'ds.formulario.salvar' }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          description: 'Um dos clientes já está em outro agendamento',
        })
      )
    );
    expect(onFechar).not.toHaveBeenCalled();
  });

  it('erro com chave aparece no idioma da tela', async () => {
    salvar.mutateAsync.mockRejectedValue(
      new ErroTraduzivel('erros.motivo', {}, 'Informe o motivo.')
    );
    const user = userEvent.setup();
    renderizar(agendamento);

    await user.click(screen.getByRole('button', { name: 'ds.formulario.salvar' }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', description: 'erros.motivo {}' })
      )
    );
  });
});
