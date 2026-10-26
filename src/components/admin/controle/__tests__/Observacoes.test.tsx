import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AbaObservacoes } from '../AbaObservacoes';
import type { MesDoQuadro } from '@/utils/controleTela';
import type { ObservacaoControle } from '@/types/controleBancoHoras';

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

const observacao = (id: string, extra: Partial<ObservacaoControle> = {}): ObservacaoControle => ({
  id,
  bancoId: 'b1',
  mes: { ano: 2026, mes: 8 },
  texto: 'Texto',
  origem: 'manual',
  reajusteId: null,
  criadoEm: '2026-08-10T15:00:00Z',
  criadoPor: 'u1',
  editada: false,
  ...extra,
});
const OBSERVACOES = [
  observacao('o1', { mes: { ano: 2026, mes: 7 }, texto: 'Mais antiga', editada: true }),
  observacao('o2', { texto: 'Do reajuste', origem: 'ajuste', criadoPor: null }),
  observacao('o3', { texto: 'Manual de agosto' }),
];
const mes = (m: number, situacao: MesDoQuadro['situacao']): MesDoQuadro => ({
  mes: { ano: 2026, mes: m },
  chave: `2026-0${m}`,
  situacao,
  resultado: null,
});
const MESES = [mes(7, 'fechado'), mes(8, 'aberto'), mes(9, 'futuro')];

const props = {
  observacoes: OBSERVACOES,
  meses: MESES,
  carregando: false,
  erro: null,
  podeEditar: true,
  onSalvar: vi.fn(async () => undefined),
  onExcluir: vi.fn(async () => undefined),
  onTentarNovamente: vi.fn(),
};
const renderizar = (ui: React.ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);
const lista = () =>
  within(screen.getByRole('list', { name: 'controleBancoHoras.observacoes.rotulo' }));

describe('AbaObservacoes', () => {
  it('mais recentes primeiro, com o tipo, quem escreveu e se foi editada', () => {
    renderizar(<AbaObservacoes {...props} />);
    const itens = lista().getAllByRole('listitem');
    expect(itens.map((i) => i.textContent)).toEqual([
      expect.stringContaining('Do reajuste'),
      expect.stringContaining('Manual de agosto'),
      expect.stringContaining('Mais antiga'),
    ]);
    expect(
      within(itens[0]).getByText('controleBancoHoras.observacoes.origem.ajuste')
    ).toBeInTheDocument();
    expect(within(itens[1]).getByText(/Pessoa A/)).toBeInTheDocument();
    expect(
      within(itens[2]).getByText(/controleBancoHoras.observacoes.editada/)
    ).toBeInTheDocument();
  });

  it('só a manual tem ações; quem só vê não escreve', () => {
    const { unmount } = renderizar(<AbaObservacoes {...props} />);
    expect(
      screen.getAllByRole('button', { name: /controleBancoHoras.observacoes.acoesDe/ })
    ).toHaveLength(2);
    unmount();
    renderizar(<AbaObservacoes {...props} podeEditar={false} />);
    expect(
      screen.queryByRole('button', { name: /controleBancoHoras.observacoes.acoesDe/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'controleBancoHoras.observacoes.nova' })
    ).not.toBeInTheDocument();
  });

  it('nova observação no mês de referência, sem os meses que não começaram', async () => {
    const onSalvar = vi.fn(async () => undefined);
    renderizar(<AbaObservacoes {...props} onSalvar={onSalvar} />);
    fireEvent.click(screen.getByRole('button', { name: 'controleBancoHoras.observacoes.nova' }));
    const mesSelect = screen.getByRole('combobox', { name: /controleBancoHoras.observacoes.mes/ });
    expect(mesSelect).toHaveTextContent('Ago/2026');
    await userEvent.click(mesSelect);
    expect(screen.queryByRole('option', { name: 'Set/2026' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'Jul/2026' }));
    const salvar = screen.getByRole('button', { name: 'fase3Comum.salvar' });
    expect(salvar).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/controleBancoHoras.observacoes.texto/), {
      target: { value: ' Cliente pediu revisão ' },
    });
    fireEvent.click(salvar);
    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith({
        mes: { ano: 2026, mes: 7 },
        texto: 'Cliente pediu revisão',
      })
    );
    await waitFor(() =>
      expect(
        screen.queryByLabelText(/controleBancoHoras.observacoes.texto/)
      ).not.toBeInTheDocument()
    );
  });

  it('editar traz o texto; excluir confirma', async () => {
    const onSalvar = vi.fn(async () => undefined);
    const onExcluir = vi.fn(async () => undefined);
    renderizar(<AbaObservacoes {...props} onSalvar={onSalvar} onExcluir={onExcluir} />);
    const acoes = () =>
      screen.getByRole('button', {
        name: 'controleBancoHoras.observacoes.acoesDe {"mes":"Ago/2026"}',
      });
    await userEvent.click(acoes());
    await userEvent.click(screen.getByRole('menuitem', { name: 'fase3Comum.editar' }));
    const texto = screen.getByLabelText(/controleBancoHoras.observacoes.texto/);
    expect(texto).toHaveValue('Manual de agosto');
    fireEvent.change(texto, { target: { value: 'Manual revisada' } });
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.salvar' }));
    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith({
        id: 'o3',
        mes: { ano: 2026, mes: 8 },
        texto: 'Manual revisada',
      })
    );

    await userEvent.click(acoes());
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'controleBancoHoras.observacoes.excluir' })
    );
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'controleBancoHoras.observacoes.excluir',
      })
    );
    await waitFor(() => expect(onExcluir).toHaveBeenCalledWith(OBSERVACOES[2]));
  });

  it('vazio e erro', () => {
    const onTentarNovamente = vi.fn();
    const { unmount } = renderizar(<AbaObservacoes {...props} observacoes={[]} />);
    expect(screen.getByText('controleBancoHoras.observacoes.vazio')).toBeInTheDocument();
    unmount();
    renderizar(
      <AbaObservacoes {...props} erro={new Error('x')} onTentarNovamente={onTentarNovamente} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.tentarNovamente' }));
    expect(onTentarNovamente).toHaveBeenCalled();
  });
});
