import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { VigenciaComHistorico } from '../VigenciasBanco';
import type { BancoCadastro } from '@/types/bancosHorasCadastro';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const autoria = { atualizadoEm: '2026-06-02T12:00:00Z', atualizadoPor: null };
const BANCO = {
  id: 'b1',
  tipoContrato: 'horas',
  repasseEspecial: 'nenhum',
  inicioVigencia: '2026-01-01',
  baselines: [
    {
      id: 'v1',
      dataInicio: '2026-01-01',
      dataFim: '2026-05-31',
      baselineMinutos: 600,
      baselineTickets: null,
      credito: 'mensal',
      motivo: null,
      ...autoria,
    },
    {
      id: 'v2',
      dataInicio: '2026-06-01',
      dataFim: null,
      baselineMinutos: 720,
      baselineTickets: null,
      credito: 'mensal',
      motivo: 'Aditivo',
      ...autoria,
    },
  ],
  repasses: [
    {
      id: 'r1',
      dataInicio: '2026-01-01',
      dataFim: null,
      percentualMensal: 100,
      percentualDentroPeriodo: null,
      percentualEntrePeriodos: null,
      motivo: null,
      ...autoria,
    },
  ],
} as unknown as BancoCadastro;

describe('VigenciaComHistorico', () => {
  it('valor vigente com o mês de início; o histórico lista as vigências com o motivo', async () => {
    render(
      <VigenciaComHistorico
        tipo="baseline"
        banco={BANCO}
        podeEditar={false}
        onNovaVigencia={vi.fn()}
      />
    );
    expect(
      screen.getByText('empresasCadastro.bancos.porMes {"valor":"12:00"}')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/empresasCadastro.edicaoBanco.desde {"mes":"06\/2026"}/)
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /empresasCadastro.edicaoBanco.gerenciar/ })
    );
    const lista = within(
      screen.getByRole('list', { name: /empresasCadastro.edicaoBanco.vigenciasDe/ })
    );
    expect(lista.getAllByRole('listitem')).toHaveLength(2);
    expect(lista.getByText(/Aditivo/)).toBeInTheDocument();
    expect(lista.getByText(/empresasCadastro.edicaoBanco.semMotivo/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /empresasCadastro.edicaoBanco.nova$/ })
    ).not.toBeInTheDocument();
  });

  it('nova vigência de baseline: mês, horas e motivo; grava em minutos a partir do dia 1', async () => {
    const onNovaVigencia = vi.fn(async () => undefined);
    render(
      <VigenciaComHistorico
        tipo="baseline"
        banco={BANCO}
        podeEditar
        onNovaVigencia={onNovaVigencia}
      />
    );
    await userEvent.click(
      screen.getByRole('button', { name: /empresasCadastro.edicaoBanco.gerenciar/ })
    );
    await userEvent.click(
      screen.getByRole('button', { name: /empresasCadastro.edicaoBanco.nova$/ })
    );
    const dialogo = within(screen.getByRole('alertdialog'));
    const registrar = dialogo.getByRole('button', {
      name: 'empresasCadastro.edicaoBanco.registrar',
    });
    expect(registrar).toBeDisabled();
    fireEvent.change(dialogo.getByLabelText(/empresasCadastro.edicaoBanco.aPartirDe/), {
      target: { value: '2026-11' },
    });
    fireEvent.change(dialogo.getByLabelText(/empresasCadastro.edicaoBanco.baselineHoras/), {
      target: { value: '15:30' },
    });
    fireEvent.change(dialogo.getByLabelText(/empresasCadastro.edicaoBanco.motivoVigencia/), {
      target: { value: 'Aditivo 2' },
    });
    fireEvent.click(registrar);
    await waitFor(() =>
      expect(onNovaVigencia).toHaveBeenCalledWith({
        bancoId: 'b1',
        tipo: 'baseline',
        desde: '2026-11-01',
        valores: { baselineMinutos: 930, baselineTickets: null, credito: 'mensal' },
        motivo: 'Aditivo 2',
      })
    );
  });

  it('nova vigência de repasse por período pede os dois percentuais', async () => {
    const onNovaVigencia = vi.fn(async () => undefined);
    const porPeriodo = { ...BANCO, repasseEspecial: 'por_periodo' } as BancoCadastro;
    render(
      <VigenciaComHistorico
        tipo="repasse"
        banco={porPeriodo}
        podeEditar
        onNovaVigencia={onNovaVigencia}
      />
    );
    await userEvent.click(
      screen.getByRole('button', { name: /empresasCadastro.edicaoBanco.gerenciar/ })
    );
    await userEvent.click(
      screen.getByRole('button', { name: /empresasCadastro.edicaoBanco.nova$/ })
    );
    const dialogo = within(screen.getByRole('alertdialog'));
    fireEvent.change(dialogo.getByLabelText(/empresasCadastro.edicaoBanco.aPartirDe/), {
      target: { value: '2026-11' },
    });
    fireEvent.change(dialogo.getByLabelText(/empresasCadastro.edicaoBanco.motivoVigencia/), {
      target: { value: 'x' },
    });
    const registrar = dialogo.getByRole('button', {
      name: 'empresasCadastro.edicaoBanco.registrar',
    });
    expect(registrar).toBeDisabled();
    fireEvent.change(dialogo.getByLabelText(/empresasCadastro.edicaoBanco.dentroPeriodo/), {
      target: { value: '100' },
    });
    fireEvent.change(dialogo.getByLabelText(/empresasCadastro.edicaoBanco.entrePeriodos/), {
      target: { value: '70' },
    });
    fireEvent.click(registrar);
    await waitFor(() =>
      expect(onNovaVigencia).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'repasse',
          valores: {
            percentualMensal: 100,
            percentualDentroPeriodo: 100,
            percentualEntrePeriodos: 70,
          },
        })
      )
    );
  });
});
