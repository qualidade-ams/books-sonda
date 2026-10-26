import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { CartaoRetroativo } from '../CartaoRetroativo';
import type { ItemRetroativo, Retroativo } from '@/types/retroativos';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));

const item = (id: string, extra: Partial<ItemRetroativo> = {}): ItemRetroativo => ({
  id,
  tipo: 'apontamento',
  itemId: `ap-${id}`,
  chamado: `CH-${id}`,
  tarefa: `T-${id}`,
  consultor: 'Ana Souza',
  dataAtividade: '2026-09-10',
  lancadoEm: '2026-10-05T15:00:00Z',
  statusChamado: 'Closed',
  minutos: 60,
  tickets: 0,
  aviso: null,
  ...extra,
});

const RETROATIVO: Retroativo = {
  id: 'r1',
  empresaId: 'e1',
  empresa: 'ALFA',
  bancoId: 'b1',
  banco: 'BANCO COMEX',
  mes: { ano: 2026, mes: 9 },
  consumoAntesMinutos: 600,
  consumoDepoisMinutos: 660,
  consumoAntesTickets: 0,
  consumoDepoisTickets: 0,
  detectadoEm: '2026-10-05T15:00:00Z',
  atualizadoEm: '2026-10-05T15:00:00Z',
  situacao: 'pendente',
  decisao: null,
  retificacao: null,
  itens: [
    item('1'),
    item('2', {
      tipo: 'ticket',
      minutos: 0,
      tickets: 1,
      aviso: { em: '2026-10-06T12:00:00Z', porId: 'u1', por: 'Pessoa A' },
    }),
  ],
};

const props = {
  retroativo: RETROATIVO,
  aberto: false,
  onAlternar: vi.fn(),
  podeEditar: true,
  onAprovar: vi.fn(),
  onDescartar: vi.fn(),
};
const renderizar = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('CartaoRetroativo', () => {
  it('empresa, banco, mês e a diferença do consumo', () => {
    renderizar(<CartaoRetroativo {...props} />);
    expect(screen.getByText('ALFA')).toBeInTheDocument();
    expect(screen.getByText(/BANCO COMEX/)).toBeInTheDocument();
    expect(screen.getByText(/Set\/2026/)).toBeInTheDocument();
    expect(
      screen.getByText(/apontamentosRetroativos.cartao.apontamentos.varios \{"n":2\}/)
    ).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('11:00')).toBeInTheDocument();
    expect(screen.getByText('+01:00')).toBeInTheDocument();
    expect(screen.getByText('apontamentosRetroativos.situacoes.pendente')).toBeInTheDocument();
  });

  it('quem edita aprova ou descarta o pendente; quem só vê, não', () => {
    const onAprovar = vi.fn();
    const onDescartar = vi.fn();
    const { unmount } = renderizar(
      <CartaoRetroativo {...props} onAprovar={onAprovar} onDescartar={onDescartar} />
    );
    fireEvent.click(screen.getByRole('button', { name: /apontamentosRetroativos.cartao.aprovar/ }));
    fireEvent.click(
      screen.getByRole('button', { name: /apontamentosRetroativos.cartao.descartar/ })
    );
    expect(onAprovar).toHaveBeenCalled();
    expect(onDescartar).toHaveBeenCalled();
    unmount();

    renderizar(<CartaoRetroativo {...props} podeEditar={false} />);
    expect(
      screen.queryByRole('button', { name: /apontamentosRetroativos.cartao.aprovar/ })
    ).not.toBeInTheDocument();
  });

  it('aberto, mostra os apontamentos, o aviso já enviado e o caminho para o Controle', () => {
    const onAlternar = vi.fn();
    const { rerender } = renderizar(<CartaoRetroativo {...props} onAlternar={onAlternar} />);
    fireEvent.click(screen.getByRole('button', { name: /apontamentosRetroativos.cartao.ver/ }));
    expect(onAlternar).toHaveBeenCalled();
    rerender(
      <MemoryRouter>
        <CartaoRetroativo {...props} aberto />
      </MemoryRouter>
    );
    const tabela = within(screen.getByRole('table'));
    expect(tabela.getByText('CH-1')).toBeInTheDocument();
    expect(tabela.getAllByText('Ana Souza')).toHaveLength(2);
    expect(tabela.getAllByText('10/09/2026')).toHaveLength(2);
    expect(tabela.getByText('01:00')).toBeInTheDocument();
    expect(tabela.getByText('apontamentosRetroativos.cartao.ticketsN {"n":1}')).toBeInTheDocument();
    expect(tabela.getByText(/apontamentosRetroativos.avisadoEm/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /apontamentosRetroativos.cartao.verNoControle/ })
    ).toHaveAttribute('href', '/admin/bancos-horas?empresa=e1&banco=b1');
  });

  it('decidido: quem, quando, a justificativa e se já foi aplicado', () => {
    const { unmount } = renderizar(
      <CartaoRetroativo
        {...props}
        retroativo={{
          ...RETROATIVO,
          situacao: 'aprovado',
          decisao: {
            em: '2026-10-07T12:00:00Z',
            porId: 'u1',
            por: 'Pessoa A',
            justificativa: 'Confirmado',
          },
        }}
      />
    );
    expect(
      screen.getByText(/apontamentosRetroativos.cartao.aprovadoPor .*Pessoa A/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Confirmado/)).toBeInTheDocument();
    expect(
      screen.getByText(/apontamentosRetroativos.cartao.aguardando .*Set\/2026/)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /apontamentosRetroativos.cartao.aprovar/ })
    ).not.toBeInTheDocument();
    unmount();

    renderizar(
      <CartaoRetroativo
        {...props}
        retroativo={{
          ...RETROATIVO,
          situacao: 'aplicado',
          decisao: {
            em: '2026-10-07T12:00:00Z',
            porId: 'u1',
            por: null,
            justificativa: 'Confirmado',
          },
          retificacao: { em: '2026-10-10T12:00:00Z', porId: 'u2', por: 'Pessoa B' },
        }}
      />
    );
    expect(
      screen.getByText(
        /apontamentosRetroativos.cartao.aprovadoPor .*apontamentosRetroativos.cartao.semNome/
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/apontamentosRetroativos.cartao.aplicado/)).toBeInTheDocument();
  });

  it('quem edita seleciona os apontamentos ainda não avisados do pendente', () => {
    const onSelecionar = vi.fn();
    const { rerender } = renderizar(
      <CartaoRetroativo {...props} aberto selecionados={[]} onSelecionar={onSelecionar} />
    );
    // O item já avisado não entra na seleção
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    fireEvent.click(
      screen.getByRole('checkbox', { name: /apontamentosRetroativos.selecao.item .*CH-1/ })
    );
    expect(onSelecionar).toHaveBeenCalledWith(['1'], true);
    fireEvent.click(
      screen.getByRole('checkbox', { name: /apontamentosRetroativos.selecao.todos/ })
    );
    expect(onSelecionar).toHaveBeenLastCalledWith(['1'], true);

    rerender(
      <MemoryRouter>
        <CartaoRetroativo {...props} aberto selecionados={['1']} onSelecionar={onSelecionar} />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('checkbox', { name: /apontamentosRetroativos.selecao.todos/ })
    ).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(
      screen.getByRole('checkbox', { name: /apontamentosRetroativos.selecao.todos/ })
    );
    expect(onSelecionar).toHaveBeenLastCalledWith(['1'], false);

    rerender(
      <MemoryRouter>
        <CartaoRetroativo
          {...props}
          aberto
          podeEditar={false}
          selecionados={[]}
          onSelecionar={onSelecionar}
        />
      </MemoryRouter>
    );
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
