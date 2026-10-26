import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AbaRequerimentos, BarraAjustesRequerimentos } from '../AbaRequerimentos';
import type { RequerimentoControle } from '@/types/controleBancoHoras';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));
vi.mock('@/hooks/useNomesUsuarios', () => ({ useNomesUsuarios: () => ({ u1: 'Pessoa A' }) }));
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const req = (id: string, extra: Partial<RequerimentoControle> = {}): RequerimentoControle => ({
  id,
  chamado: `CH-${id}`,
  titulo: `Título ${id}`,
  modulo: 'Comex',
  mes: { ano: 2026, mes: 10 },
  minutos: 90,
  tickets: 0,
  situacao: 'enviado',
  bancoAutomaticoId: 'b1',
  bancoId: 'b1',
  ajuste: null,
  ...extra,
});
const REQUERIMENTOS = [
  req('1'),
  req('2', {
    situacao: 'desenvolvimento',
    bancoId: 'b2',
    ajuste: {
      bancoId: 'b2',
      motivo: 'Projeto',
      atualizadoEm: '2026-10-05T12:00:00Z',
      atualizadoPor: 'u1',
    },
  }),
  req('3', { bancoId: 'b2', bancoAutomaticoId: 'b2' }),
];
const BANCOS = [
  { bancoId: 'b1', nome: 'BANCO COMEX' },
  { bancoId: 'b2', nome: 'Banco padrão' },
];
const props = {
  requerimentos: REQUERIMENTOS,
  bancos: BANCOS,
  bancoAtualId: 'b1',
  carregando: false,
  erro: null,
  podeEditar: true,
  escolhas: {},
  onEscolher: vi.fn(),
  onTentarNovamente: vi.fn(),
};
const renderizar = (ui: React.ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);
const lista = () =>
  within(screen.getByRole('list', { name: 'controleBancoHoras.requerimentos.rotulo' }));

describe('AbaRequerimentos', () => {
  it('abre só com os do banco; o filtro mostra todos, com a classificação', () => {
    renderizar(<AbaRequerimentos {...props} />);
    expect(lista().getByText('CH-1')).toBeInTheDocument();
    expect(lista().queryByText('CH-3')).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'controleBancoHoras.requerimentos.soDeste' })
    );
    expect(lista().getByText('CH-3')).toBeInTheDocument();
    expect(lista().getAllByText('controleBancoHoras.requerimentos.peloModulo')).toHaveLength(2);
    expect(lista().getByText('controleBancoHoras.requerimentos.ajustada')).toBeInTheDocument();
    expect(lista().getByText(/Pessoa A/)).toBeInTheDocument();
    expect(lista().getByText('controleBancoHoras.requerimentos.naoConsome')).toBeInTheDocument();
  });

  it('trocar o banco vira escolha da página e marca a linha', async () => {
    const onEscolher = vi.fn();
    const { rerender } = renderizar(<AbaRequerimentos {...props} onEscolher={onEscolher} />);
    await userEvent.click(
      screen.getByRole('combobox', {
        name: 'controleBancoHoras.requerimentos.bancoDe {"chamado":"CH-1"}',
      })
    );
    await userEvent.click(screen.getByRole('option', { name: 'Banco padrão' }));
    expect(onEscolher).toHaveBeenCalledWith('1', 'b2');
    rerender(
      <TooltipProvider>
        <AbaRequerimentos {...props} escolhas={{ '1': 'b2' }} />
      </TooltipProvider>
    );
    expect(
      screen.getByRole('combobox', {
        name: 'controleBancoHoras.requerimentos.bancoDe {"chamado":"CH-1"}',
      })
    ).toHaveTextContent('Banco padrão');
    expect(lista().getByText('controleBancoHoras.requerimentos.alterado')).toBeInTheDocument();
  });

  it('quem só vê não troca o banco', () => {
    renderizar(<AbaRequerimentos {...props} podeEditar={false} />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(lista().getByText('BANCO COMEX')).toBeInTheDocument();
  });
});

describe('BarraAjustesRequerimentos', () => {
  it('pede o motivo uma vez, no salvar; descartar volta', async () => {
    const onSalvar = vi.fn(async () => undefined);
    const onDescartar = vi.fn();
    renderizar(
      <BarraAjustesRequerimentos quantidade={2} onDescartar={onDescartar} onSalvar={onSalvar} />
    );
    expect(
      screen.getByText('controleBancoHoras.requerimentos.alterados.varios {"n":2}')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.descartar' }));
    expect(onDescartar).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.salvar' }));
    const dialogo = within(screen.getByRole('alertdialog'));
    fireEvent.change(dialogo.getByLabelText(/controleBancoHoras.requerimentos.motivo/), {
      target: { value: 'Projeto do cliente' },
    });
    fireEvent.click(dialogo.getByRole('button', { name: 'fase3Comum.salvar' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledWith('Projeto do cliente'));
  });
});
