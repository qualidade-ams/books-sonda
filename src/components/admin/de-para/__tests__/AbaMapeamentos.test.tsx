import { useState } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AbaMapeamentos } from '../AbaMapeamentos';
import type { Catalogo } from '@/types/catalogo';
import type { MapeamentoGrupo, UsoGrupo } from '@/types/dePara';
import { SEM_FILTRO, type FiltroMapeamentos } from '@/utils/deParaTela';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));
vi.mock('@/hooks/useNomesUsuarios', () => ({ useNomesUsuarios: () => ({ u1: 'Pessoa A' }) }));
// O Radix (Select e menu) usa captura de ponteiro e rolagem, que o jsdom não implementa
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const autoria = { atualizadoEm: '2026-10-22T15:30:00Z', atualizadoPor: 'u1' };
const CATALOGO: Catalogo = {
  solucoes: [{ id: 's1', codigo: 'COMEX', nome: 'COMEX', ordem: 1, ativo: true, ...autoria }],
  produtos: [
    {
      id: 'ce',
      solucaoId: 's1',
      codigo: 'CE',
      nome: 'CE PLUS',
      descricao: null,
      ordem: 1,
      ativo: true,
      aClassificar: false,
      ...autoria,
    },
  ],
  modulos: [
    {
      id: 'cambio',
      produtoId: 'ce',
      nome: 'Câmbio',
      descricao: null,
      ordem: 1,
      ativo: true,
      ...autoria,
    },
  ],
};
const mapeamento = (
  id: string,
  grupoAranda: string,
  destino: Partial<MapeamentoGrupo>,
  classificacao: MapeamentoGrupo['classificacao']
) =>
  ({
    id,
    grupoAranda,
    grupoBook: 'COMEX',
    solucaoId: null,
    produtoId: null,
    moduloId: null,
    classificacao,
    vinculos: destino.solucaoId
      ? [
          {
            solucaoId: destino.solucaoId,
            produtoId: destino.produtoId ?? null,
            moduloId: destino.moduloId ?? null,
          },
        ]
      : [],
    ...autoria,
    ...destino,
  }) as MapeamentoGrupo;
const MAPEAMENTOS = [
  mapeamento(
    'g1',
    'AMS APL - CAMBIO - N2',
    { solucaoId: 's1', produtoId: 'ce', moduloId: 'cambio' },
    'modulo'
  ),
  mapeamento('g2', 'AMS APL - CE - N2', { solucaoId: 's1', produtoId: 'ce' }, 'produto'),
  mapeamento('g3', 'DEDICADOS', {}, 'nao_se_aplica'),
];
const USO: Record<string, UsoGrupo> = {
  g1: { apontamentos: 120, tickets: 4, empresasMultiplos: ['ALFA'] },
  g2: { apontamentos: 7, tickets: 0, empresasMultiplos: ['BETA'] },
};

const props = {
  mapeamentos: MAPEAMENTOS,
  catalogo: CATALOGO,
  uso: USO,
  carregando: false,
  erro: null,
  podeEditar: true,
  onEditar: vi.fn(),
  onAtribuir: vi.fn(async () => undefined),
  onExcluir: vi.fn(async () => undefined),
  onTentarNovamente: vi.fn(),
};
/** O filtro é controlado pela página; aqui um estado faz o papel dela */
function Controlado({
  filtroInicial = SEM_FILTRO,
  ...extra
}: Partial<typeof props> & { filtroInicial?: FiltroMapeamentos }) {
  const [filtro, setFiltro] = useState(filtroInicial);
  return <AbaMapeamentos {...props} {...extra} filtro={filtro} onFiltro={setFiltro} />;
}
const renderizar = (extra: Partial<typeof props> & { filtroInicial?: FiltroMapeamentos } = {}) =>
  render(
    <TooltipProvider>
      <Controlado {...extra} />
    </TooltipProvider>
  );
const lista = () => within(screen.getByRole('list', { name: 'deParaGrupos.lista.rotulo' }));

describe('AbaMapeamentos', () => {
  it('lista com destino, apontamentos e última alteração; a linha abre a edição', () => {
    const onEditar = vi.fn();
    renderizar({ onEditar });
    expect(lista().getByText('120')).toBeInTheDocument();
    expect(lista().getAllByText('Pessoa A')).toHaveLength(3);
    expect(lista().getAllByText('22/10/2026 12:30')).toHaveLength(3);
    expect(lista().getByText('deParaGrupos.classificacao.nao_se_aplica')).toBeInTheDocument();
    fireEvent.click(lista().getByText('DEDICADOS'));
    expect(onEditar).toHaveBeenCalledWith(MAPEAMENTOS[2]);
  });

  it('grupo em vários lugares: o Destino mostra todos', () => {
    const emDois = mapeamento(
      'g9',
      'AMS APL - INTEGRACAO',
      {
        solucaoId: 's1',
        produtoId: 'ce',
        moduloId: 'cambio',
        vinculos: [
          { solucaoId: 's1', produtoId: 'ce', moduloId: 'cambio' },
          { solucaoId: 's1', produtoId: null, moduloId: null },
        ],
      },
      'modulo'
    );
    renderizar({ mapeamentos: [emDois] });
    const destinos = lista().getAllByTestId('lugar-do-grupo');
    expect(destinos.map((d) => d.textContent)).toEqual([
      'COMEX › CE PLUS › Câmbio',
      'COMEX · deParaGrupos.destino.servico',
    ]);
  });

  it('busca e, sem resultado, oferece limpar', () => {
    renderizar();
    fireEvent.change(screen.getByRole('searchbox', { name: 'deParaGrupos.lista.buscar' }), {
      target: { value: 'nada disso' },
    });
    expect(screen.getByText('deParaGrupos.lista.nenhumNoFiltro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.limparFiltros' }));
    expect(lista().getByText('DEDICADOS')).toBeInTheDocument();
  });

  it('a situação vinda do indicador filtra e mostra os filtros abertos', () => {
    renderizar({
      filtroInicial: { ...SEM_FILTRO, situacao: ['produto', 'solucao', 'nao_se_aplica'] },
    });
    expect(lista().queryByText('AMS APL - CAMBIO - N2')).not.toBeInTheDocument();
    expect(lista().getByText('DEDICADOS')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'ds.filtros.ativos {"quantidade":1}' })
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('atribui o mesmo destino a vários grupos, com as empresas afetadas na confirmação', async () => {
    const onAtribuir = vi.fn(async () => undefined);
    renderizar({ onAtribuir });
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'deParaGrupos.lista.selecionar {"grupo":"AMS APL - CAMBIO - N2"}',
      })
    );
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'deParaGrupos.lista.selecionar {"grupo":"AMS APL - CE - N2"}',
      })
    );
    expect(screen.getByText('deParaGrupos.lista.selecionados.varios {"n":2}')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'deParaGrupos.destino.solucao' }));
    await userEvent.click(screen.getByRole('option', { name: 'COMEX' }));
    fireEvent.click(screen.getByRole('button', { name: 'deParaGrupos.lista.atribuir' }));
    const dialogo = screen.getByRole('alertdialog', {
      name: 'deParaGrupos.lote.titulo.varios {"n":2}',
    });
    expect(
      within(dialogo).getByText('deParaGrupos.lote.afetadas {"empresas":"ALFA, BETA"}')
    ).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'deParaGrupos.lista.atribuir' }));
    await waitFor(() =>
      expect(onAtribuir).toHaveBeenCalledWith(['g1', 'g2'], {
        solucaoId: 's1',
        produtoId: null,
        moduloId: null,
      })
    );
    await waitFor(() => expect(screen.queryByText(/lista.selecionados/)).not.toBeInTheDocument());
  });

  it('excluir pede confirmação', async () => {
    const onExcluir = vi.fn(async () => undefined);
    renderizar({ onExcluir });
    await userEvent.click(
      screen.getByRole('button', { name: 'fase3Comum.acoesDe {"nome":"DEDICADOS"}' })
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'deParaGrupos.lista.excluir' }));
    const dialogo = screen.getByRole('alertdialog', {
      name: 'deParaGrupos.excluir.titulo {"grupo":"DEDICADOS"}',
    });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'deParaGrupos.lista.excluir' }));
    await waitFor(() => expect(onExcluir).toHaveBeenCalledWith(MAPEAMENTOS[2]));
  });

  it('só visualiza: sem seleção, sem menu e a linha não abre', () => {
    const onEditar = vi.fn();
    renderizar({ podeEditar: false, onEditar });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fase3Comum.acoesDe/ })).not.toBeInTheDocument();
    fireEvent.click(lista().getByText('DEDICADOS'));
    expect(onEditar).not.toHaveBeenCalled();
  });

  it('erro ao carregar, com tentar novamente', () => {
    const onTentarNovamente = vi.fn();
    renderizar({ erro: new Error('x'), onTentarNovamente });
    expect(screen.getByText('deParaGrupos.lista.erro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.tentarNovamente' }));
    expect(onTentarNovamente).toHaveBeenCalled();
  });
});
