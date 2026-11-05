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

describe('VigenciaComHistorico: editar vigência', () => {
  const abrir = async (onEditarVigencia = vi.fn(async () => undefined), podeEditar = true) => {
    render(
      <VigenciaComHistorico
        tipo="baseline"
        banco={BANCO}
        podeEditar={podeEditar}
        onNovaVigencia={vi.fn()}
        onEditarVigencia={onEditarVigencia}
      />
    );
    await userEvent.click(
      screen.getByRole('button', { name: /empresasCadastro.edicaoBanco.gerenciar/ })
    );
    return onEditarVigencia;
  };
  const editar = (inicio: string) =>
    userEvent.click(
      screen.getByRole('button', {
        name: `empresasCadastro.edicaoBanco.editarVigencia {"inicio":"${inicio}"}`,
      })
    );

  it('quem só vê não edita', async () => {
    await abrir(vi.fn(), false);
    expect(
      screen.queryByRole('button', { name: /empresasCadastro.edicaoBanco.editarVigencia/ })
    ).not.toBeInTheDocument();
  });

  it('vigência anterior: corrige o valor e o último mês; a primeira começa no início do banco', async () => {
    const onEditarVigencia = await abrir();
    await editar('01/2026');
    const dialogo = within(screen.getByRole('alertdialog'));
    expect(dialogo.getByText('empresasCadastro.edicaoBanco.edicaoMesFechado')).toBeInTheDocument();
    const inicio = dialogo.getByLabelText(/empresasCadastro.edicaoBanco.aPartirDe/);
    expect(inicio).toHaveValue('2026-01');
    expect(inicio).toBeDisabled();
    expect(dialogo.getByLabelText(/empresasCadastro.edicaoBanco.ateMes/)).toHaveValue('2026-05');
    expect(dialogo.getByLabelText(/empresasCadastro.edicaoBanco.baselineHoras/)).toHaveValue(
      '10:00'
    );

    fireEvent.change(dialogo.getByLabelText(/empresasCadastro.edicaoBanco.baselineHoras/), {
      target: { value: '08:00' },
    });
    fireEvent.change(dialogo.getByLabelText(/empresasCadastro.edicaoBanco.ateMes/), {
      target: { value: '2026-07' },
    });
    fireEvent.change(dialogo.getByLabelText(/empresasCadastro.edicaoBanco.motivoVigencia/), {
      target: { value: 'Baseline cadastrado errado' },
    });
    fireEvent.click(
      dialogo.getByRole('button', { name: 'empresasCadastro.edicaoBanco.salvarVigencia' })
    );

    await waitFor(() =>
      expect(onEditarVigencia).toHaveBeenCalledWith({
        vigenciaId: 'v1',
        tipo: 'baseline',
        desde: '2026-01-01',
        ate: '2026-07-01',
        valores: { baselineMinutos: 480, baselineTickets: null, credito: 'mensal' },
        motivo: 'Baseline cadastrado errado',
      })
    );
  });

  it('a última fica em aberto: muda o primeiro mês, sem último mês', async () => {
    const onEditarVigencia = await abrir();
    await editar('06/2026');
    const dialogo = within(screen.getByRole('alertdialog'));
    expect(dialogo.queryByLabelText(/empresasCadastro.edicaoBanco.ateMes/)).not.toBeInTheDocument();
    const inicio = dialogo.getByLabelText(/empresasCadastro.edicaoBanco.aPartirDe/);
    expect(inicio).toBeEnabled();
    fireEvent.change(inicio, { target: { value: '2026-04' } });
    fireEvent.change(dialogo.getByLabelText(/empresasCadastro.edicaoBanco.motivoVigencia/), {
      target: { value: 'Começou em abril' },
    });
    fireEvent.click(
      dialogo.getByRole('button', { name: 'empresasCadastro.edicaoBanco.salvarVigencia' })
    );

    await waitFor(() =>
      expect(onEditarVigencia).toHaveBeenCalledWith({
        vigenciaId: 'v2',
        tipo: 'baseline',
        desde: '2026-04-01',
        ate: null,
        valores: { baselineMinutos: 720, baselineTickets: null, credito: 'mensal' },
        motivo: 'Começou em abril',
      })
    );
  });

  it('último mês antes do primeiro não salva', async () => {
    await abrir();
    await editar('01/2026');
    const dialogo = within(screen.getByRole('alertdialog'));
    fireEvent.change(dialogo.getByLabelText(/empresasCadastro.edicaoBanco.ateMes/), {
      target: { value: '2025-12' },
    });
    fireEvent.change(dialogo.getByLabelText(/empresasCadastro.edicaoBanco.motivoVigencia/), {
      target: { value: 'x' },
    });
    expect(
      dialogo.getByRole('button', { name: 'empresasCadastro.edicaoBanco.salvarVigencia' })
    ).toBeDisabled();
  });
});
