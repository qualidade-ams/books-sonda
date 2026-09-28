import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { SyncAgendamento } from '@/types/syncAgendamentos';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (chave: string) => chave, i18n: { language: 'pt-BR' } }),
}));

const preverMock = vi.fn<(...args: any[]) => any>(() => ({ previsao: ['2026-09-24T10:00:00.000Z'], isFetching: false, error: null }));
vi.mock('@/hooks/useSyncAgendamentos', () => ({
  usePreverExecucoes: (...args: any[]) => preverMock(...args),
}));

import { AgendamentoFormModal } from '../AgendamentoFormModal';

describe('AgendamentoFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preverMock.mockReturnValue({ previsao: ['2026-09-24T10:00:00.000Z'], isFetching: false, error: null });
  });

  function renderizar(agendamento: SyncAgendamento | null = null) {
    const onSalvar = vi.fn<(dados: any) => Promise<void>>(async () => {});
    render(<AgendamentoFormModal open onOpenChange={() => {}} agendamento={agendamento} onSalvar={onSalvar} salvando={false} />);
    return { onSalvar };
  }

  it('salva um agendamento novo com os valores padrão normalizados', async () => {
    const { onSalvar } = renderizar();

    fireEvent.change(screen.getByLabelText('sincronizacaoSql.form.nome'), { target: { value: 'Diário 7h' } });
    fireEvent.click(screen.getByRole('button', { name: 'sincronizacaoSql.form.salvar' }));

    await waitFor(() => expect(onSalvar).toHaveBeenCalled());
    expect(onSalvar.mock.calls[0][0]).toMatchObject({
      nome: 'Diário 7h',
      ativo: true,
      frequencia: 'diario',
      dias_semana: [],
      modo_horario: 'horarios',
      horarios: ['07:00'],
      intervalo_horas: null,
    });
  });

  it('não salva sem nome e mostra o erro', async () => {
    const { onSalvar } = renderizar();
    fireEvent.click(screen.getByRole('button', { name: 'sincronizacaoSql.form.salvar' }));

    expect(await screen.findByText('sincronizacaoSql.validacao.nomeObrigatorio')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('mostra a previsão das próximas execuções', () => {
    renderizar();
    expect(screen.getByText('sincronizacaoSql.form.previsao24h')).toBeInTheDocument();
    expect(preverMock).toHaveBeenCalled();
    expect(screen.getAllByTestId('previsao-execucao')).toHaveLength(1);
  });

  it('mostra todas as execuções das próximas 24 horas', () => {
    const base = Date.now();
    const execucoes = Array.from({ length: 20 }, (_, i) => new Date(base + (i + 1) * 2 * 3600_000).toISOString());
    preverMock.mockReturnValue({ previsao: execucoes, isFetching: false, error: null });

    renderizar();

    // 2h, 4h ... 24h → 12 dentro das próximas 24 horas
    expect(screen.getAllByTestId('previsao-execucao')).toHaveLength(12);
    expect(screen.getByText('sincronizacaoSql.form.previsao24h')).toBeInTheDocument();
  });

  it('sem execuções nas próximas 24 horas mostra as próximas 5', () => {
    const base = Date.now();
    const semanais = Array.from({ length: 8 }, (_, i) => new Date(base + (i + 2) * 7 * 86400_000).toISOString());
    preverMock.mockReturnValue({ previsao: semanais, isFetching: false, error: null });

    renderizar();

    expect(screen.getAllByTestId('previsao-execucao')).toHaveLength(5);
    expect(screen.getByText('sincronizacaoSql.form.previsao')).toBeInTheDocument();
  });

  it('preenche o formulário ao editar', () => {
    renderizar({
      id: 'a1',
      nome: 'Semanal',
      ativo: true,
      tabelas: { pesquisas: true },
      frequencia: 'semanal',
      dias_semana: [1, 3],
      dias_mes: [],
      ultimo_dia_mes: false,
      modo_horario: 'intervalo',
      horarios: [],
      intervalo_horas: 2,
      hora_inicio: '07:00:00',
      hora_fim: '19:00:00',
    } as unknown as SyncAgendamento);

    expect(screen.getByText('sincronizacaoSql.form.tituloEditar')).toBeInTheDocument();
    expect(screen.getByLabelText('sincronizacaoSql.form.nome')).toHaveValue('Semanal');
    expect(screen.getByLabelText('sincronizacaoSql.form.horaInicio')).toHaveValue('07:00');
    expect(screen.getByLabelText('sincronizacaoSql.form.horaFim')).toHaveValue('19:00');
    expect(screen.getByRole('button', { name: 'sincronizacaoSql.diasSemana.d1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'sincronizacaoSql.diasSemana.d2' })).toHaveAttribute('aria-pressed', 'false');
  });
});
