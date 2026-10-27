import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AbaHistorico } from '../AbaHistorico';
import type { EventoHistorico } from '@/types/controleBancoHoras';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));

const EVENTOS: EventoHistorico[] = [
  {
    tipo: 'alteracao',
    id: 'a1',
    em: '2026-10-20T13:00:00Z',
    usuarioId: 'u1',
    usuario: 'Pessoa A',
    tabela: 'bancos_horas_reajustes',
    acao: 'update',
    campos: ['ativo', 'updated_at'],
    antes: { ativo: true, updated_at: 'x' },
    depois: { ativo: false, updated_at: 'y' },
    motivo: 'Duplicado',
    origem: 'app',
  },
  {
    tipo: 'alteracao',
    id: 'a2',
    em: '2026-10-19T13:00:00Z',
    usuarioId: null,
    usuario: null,
    tabela: 'requerimentos_bancos',
    acao: 'insert',
    campos: [],
    antes: null,
    depois: { banco_id: 'b2' },
    motivo: null,
    origem: 'sincronizacao',
  },
  {
    tipo: 'versao',
    id: 'v2',
    em: '2026-10-05T10:00:00Z',
    usuarioId: 'u1',
    usuario: 'Pessoa A',
    mes: { ano: 2026, mes: 9 },
    versao: 2,
    vigente: true,
    motivo: 'retificacao',
    saldoFinalMinutos: -90,
    saldoFinalTickets: null,
    excedenteMinutos: 90,
  },
  {
    tipo: 'transferencia',
    id: 't1',
    em: '2026-10-01T10:00:00Z',
    mes: { ano: 2026, mes: 9 },
    unidade: 'horas',
    quantidade: 120,
    papel: 'consumiu',
    outroBanco: 'Banco padrão',
  },
];
const props = {
  eventos: EVENTOS,
  carregando: false,
  erro: null,
  onTentarNovamente: vi.fn(),
};
const lista = () =>
  within(screen.getByRole('list', { name: 'controleBancoHoras.historico.rotulo' }));

describe('AbaHistorico', () => {
  it('cada tipo de evento com o que interessa', () => {
    render(<AbaHistorico {...props} />);
    const itens = lista().getAllByRole('listitem');
    expect(itens).toHaveLength(4);

    const alteracao = within(itens[0]);
    expect(alteracao.getByText(/controleBancoHoras.historico.acoes.update/)).toBeInTheDocument();
    expect(
      alteracao.getByText(/controleBancoHoras.historico.tabelas.bancos_horas_reajustes/)
    ).toBeInTheDocument();
    expect(alteracao.getByText(/Pessoa A/)).toBeInTheDocument();
    expect(
      alteracao.getByText('controleBancoHoras.historico.motivo {"motivo":"Duplicado"}')
    ).toBeInTheDocument();
    expect(alteracao.getByText('ativo')).toBeInTheDocument();
    expect(alteracao.queryByText('updated_at')).not.toBeInTheDocument();

    const sincronizacao = within(itens[1]);
    expect(
      sincronizacao.getByText('controleBancoHoras.historico.origem.sincronizacao')
    ).toBeInTheDocument();
    expect(sincronizacao.getByText(/controleBancoHoras.historico.sistema/)).toBeInTheDocument();

    const versao = within(itens[2]);
    expect(
      versao.getByText('controleBancoHoras.historico.versao {"versao":2,"mes":"Set/2026"}')
    ).toBeInTheDocument();
    expect(
      versao.getByText('controleBancoHoras.historico.motivoVersao.retificacao')
    ).toBeInTheDocument();
    expect(versao.getByText('controleBancoHoras.historico.vigente')).toBeInTheDocument();
    expect(versao.getByText('−01:30')).toBeInTheDocument();

    expect(
      within(itens[3]).getByText(
        'controleBancoHoras.historico.consumiu {"quantidade":"02:00","banco":"Banco padrão","mes":"Set/2026"}'
      )
    ).toBeInTheDocument();
  });

  it('filtra pelo tipo', async () => {
    render(<AbaHistorico {...props} />);
    await userEvent.click(
      screen.getByRole('button', { name: /controleBancoHoras.historico.filtroTipo/ })
    );
    await userEvent.click(
      screen.getByRole('checkbox', { name: /controleBancoHoras.historico.tipos.versao/ })
    );
    expect(lista().getAllByRole('listitem')).toHaveLength(1);
  });

  it('vazio e erro', () => {
    const onTentarNovamente = vi.fn();
    const { unmount } = render(<AbaHistorico {...props} eventos={[]} />);
    expect(screen.getByText('controleBancoHoras.historico.vazio')).toBeInTheDocument();
    unmount();
    render(<AbaHistorico {...props} erro={new Error('x')} onTentarNovamente={onTentarNovamente} />);
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.tentarNovamente' }));
    expect(onTentarNovamente).toHaveBeenCalled();
  });
});
