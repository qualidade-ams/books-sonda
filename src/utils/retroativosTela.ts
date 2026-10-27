/**
 * Regras da tela Apontamentos Retroativos que não dependem de componente: a busca e os filtros
 * da lista (dentro da aba de cada situação) e as opções dos filtros.
 */
import type { ItemRetroativo, Retroativo, SituacaoRetroativo } from '@/types/retroativos';
import type { EnvelopeRegularizacao } from '@/services/retroativos/envioRegularizacao';
import { formatarHoras } from '@/components/ds/horas';
import { rotuloMesLocal } from '@/utils/controleTela';
import {
  dataHoraPlanilha,
  type Exportacao,
  type Traduzir,
  type ValorCelula,
} from '@/utils/exportarTabela';

export interface FiltroRetroativos {
  busca: string;
  /** Ids das empresas */
  empresas: string[];
  /** Nomes dos consultores, como vêm do Aranda */
  consultores: string[];
}

export const SEM_FILTRO_RETROATIVOS: FiltroRetroativos = {
  busca: '',
  empresas: [],
  consultores: [],
};

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function filtrarRetroativos(
  lista: Retroativo[],
  situacao: SituacaoRetroativo,
  filtro: FiltroRetroativos
): Retroativo[] {
  const termo = normalizar(filtro.busca.trim());
  return lista.filter(
    (r) =>
      r.situacao === situacao &&
      (!filtro.empresas.length || filtro.empresas.includes(r.empresaId)) &&
      (!filtro.consultores.length ||
        r.itens.some((i) => i.consultor && filtro.consultores.includes(i.consultor))) &&
      (!termo ||
        normalizar(
          [r.empresa, r.banco, ...r.itens.flatMap((i) => [i.chamado ?? '', i.tarefa ?? ''])].join(
            ' '
          )
        ).includes(termo))
  );
}

/** Empresas e consultores que aparecem na lista, para os filtros */
export function opcoesDosRetroativos(lista: Retroativo[]) {
  const empresas = new Map(lista.map((r) => [r.empresaId, r.empresa]));
  const consultores = new Set(lista.flatMap((r) => r.itens.map((i) => i.consultor ?? '')));
  consultores.delete('');
  return {
    empresas: [...empresas]
      .map(([valor, rotulo]) => ({ valor, rotulo }))
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo)),
    consultores: [...consultores].sort((a, b) => a.localeCompare(b)),
  };
}

/**
 * Itens selecionados → um envelope por consultor, com o e-mail do cadastro de especialistas.
 * Sem consultor no Aranda não há para quem mandar: o envelope fica sem e-mail, por último.
 */
export function montarEnvelopes(
  itens: (EnvelopeRegularizacao['itens'][number] & { id: string })[],
  emails: Record<string, string | null>,
  rotuloSemConsultor: string
): EnvelopeRegularizacao[] {
  const grupos = new Map<string | null, EnvelopeRegularizacao['itens']>();
  for (const i of itens) {
    // Sem o id da linha da tela: o envelope leva o que o e-mail e o aviso usam
    const item = {
      retroativoId: i.retroativoId,
      itemId: i.itemId,
      empresa: i.empresa,
      chamado: i.chamado,
      tarefa: i.tarefa,
      consultor: i.consultor,
      minutos: i.minutos,
      mes: i.mes,
    };
    grupos.set(i.consultor, [...(grupos.get(i.consultor) ?? []), item]);
  }
  return [...grupos]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a.localeCompare(b)))
    .map(([consultor, doConsultor]) => ({
      consultor: consultor ?? rotuloSemConsultor,
      email: consultor ? (emails[consultor] ?? null) : null,
      itens: doConsultor,
    }));
}

type LinhaRetroativo = { r: Retroativo; i: ItemRetroativo };

/** Exportação dos retroativos visíveis: uma linha por apontamento ou ticket */
export function exportacaoRetroativos(
  lista: Retroativo[],
  t: Traduzir,
  idioma: string
): Exportacao {
  const a = (chave: string) => t(`apontamentosRetroativos.${chave}`);
  const coluna = (rotulo: string, valor: (l: LinhaRetroativo) => ValorCelula) => ({
    rotulo,
    valor,
  });
  return {
    arquivo: a('exportar.arquivo'),
    titulo: a('titulo'),
    abas: [
      {
        nome: a('titulo'),
        linhas: lista.flatMap((r) => r.itens.map((i) => ({ r, i }))),
        colunas: [
          coluna(a('exportar.colunas.empresa'), (l) => l.r.empresa),
          coluna(a('exportar.colunas.banco'), (l) => l.r.banco),
          coluna(a('exportar.colunas.mes'), (l) => rotuloMesLocal(l.r.mes, idioma)),
          coluna(t('fase3Comum.situacao'), (l) => a(`situacoes.${l.r.situacao}`)),
          coluna(a('exportar.colunas.tipo'), (l) => a(`exportar.tipo.${l.i.tipo}`)),
          coluna(a('exportar.colunas.chamado'), (l) => l.i.chamado),
          coluna(a('exportar.colunas.tarefa'), (l) => l.i.tarefa),
          coluna(a('colunas.consultor'), (l) => l.i.consultor),
          // O dia puro (AAAA-MM-DD) vai como está
          coluna(a('colunas.dataAtividade'), (l) => l.i.dataAtividade),
          coluna(a('colunas.dataSistema'), (l) => dataHoraPlanilha(l.i.lancadoEm)),
          coluna(a('colunas.status'), (l) => l.i.statusChamado),
          coluna(a('exportar.colunas.horas'), (l) => formatarHoras(l.i.minutos).replace('−', '-')),
          coluna(a('exportar.colunas.tickets'), (l) => l.i.tickets),
          coluna(a('exportar.colunas.justificativa'), (l) => l.r.decisao?.justificativa),
        ],
      },
    ],
  };
}
