/**
 * Regras da tela Comparação Legado x Novo (Fase 4) que não dependem de componente: o grupo
 * dos indicadores, a busca, as unidades do detalhe e as exportações.
 */
import type { Unidade } from '@/services/bancosHoras/calculo';
import { formatarHoras } from '@/components/ds/horas';
import { rotuloMesLocal } from '@/utils/controleTela';
import {
  dataHoraPlanilha,
  type Exportacao,
  type Traduzir,
  type ValorCelula,
} from '@/utils/exportarTabela';
import type {
  ComparacaoEmpresa,
  DiferencaItem,
  GrupoComparacao,
  MesComparacao,
} from '@/types/comparacao';

/** Cor do selo de cada situação */
export const TOM_SITUACAO: Record<
  NonNullable<ComparacaoEmpresa['situacao']>,
  'success' | 'info' | 'danger'
> = {
  identico: 'success',
  soma_confere: 'success',
  explicada: 'info',
  divergente: 'danger',
};

/** Grupo dos indicadores: liberada, depois validada, depois a situação; sem resultado, nenhum */
export function grupoDaComparacao(e: ComparacaoEmpresa): GrupoComparacao | null {
  if (e.liberacao) return 'liberada';
  if (!e.situacao) return null;
  if (e.validacao) return 'validada';
  if (e.situacao === 'identico' || e.situacao === 'soma_confere') return 'conferem';
  return e.situacao;
}

export interface FiltroComparacao {
  busca: string;
  grupo: GrupoComparacao | null;
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

export function filtrarComparacoes(
  lista: ComparacaoEmpresa[],
  { busca, grupo }: FiltroComparacao
): ComparacaoEmpresa[] {
  const termo = normalizar(busca);
  return lista.filter(
    (e) =>
      (!termo || normalizar(e.empresa).includes(termo)) &&
      (!grupo || grupoDaComparacao(e) === grupo)
  );
}

const MEDIDAS = ['consumo', 'requerimentos', 'reajustes', 'saldo', 'repasse', 'excedente'] as const;
type Medida = (typeof MEDIDAS)[number];

/** Unidades com algum valor nos meses (o contrato da empresa); sem nada, horas */
export function unidadesDosMeses(meses: MesComparacao[]): Unidade[] {
  const usadas = (['horas', 'tickets'] as Unidade[]).filter((u) =>
    meses.some((m) =>
      MEDIDAS.some((medida) => m.legado[u][medida] !== 0 || m.novo[u][medida] !== 0)
    )
  );
  return usadas.length > 0 ? usadas : ['horas'];
}

// ---------------------------------------------------------------------------
// Exportação
// ---------------------------------------------------------------------------

/** Horas na planilha com o hífen comum, para o Excel não ler um caractere estranho */
const horas = (minutos: number | null | undefined, opcoes?: { sinal: 'sempre' }) =>
  minutos === null || minutos === undefined
    ? null
    : formatarHoras(minutos, opcoes).replace('−', '-');

const coluna = <T>(rotulo: string, valor: (linha: T) => ValorCelula) => ({ rotulo, valor });

export function exportacaoComparacao(lista: ComparacaoEmpresa[], t: Traduzir): Exportacao {
  const a = (chave: string) => t(`comparacaoBancosHoras.${chave}`);
  const c = coluna<ComparacaoEmpresa>;
  return {
    arquivo: a('exportar.arquivo'),
    titulo: a('titulo'),
    abas: [
      {
        nome: a('titulo'),
        linhas: lista,
        colunas: [
          c(a('colunas.empresa'), (e) => e.empresa),
          c(a('colunas.bancos'), (e) => e.bancosAtivos),
          c(a('colunas.meses'), (e) => e.mesesComparados),
          c(t('fase3Comum.situacao'), (e) =>
            e.situacao ? a(`situacoes.${e.situacao}`) : a('semResultado')
          ),
          c(a('colunas.consumoLegado'), (e) => horas(e.consumoLegadoMinutos)),
          c(a('colunas.consumoNovo'), (e) => horas(e.consumoNovoMinutos)),
          c(a('colunas.diferenca'), (e) =>
            horas(e.consumoNovoMinutos - e.consumoLegadoMinutos, { sinal: 'sempre' })
          ),
          c(a('exportar.colunas.ticketsLegado'), (e) => e.consumoLegadoTickets),
          c(a('exportar.colunas.ticketsNovo'), (e) => e.consumoNovoTickets),
          c(a('exportar.colunas.validadaPor'), (e) => e.validacao?.por),
          c(a('exportar.colunas.validadaEm'), (e) => dataHoraPlanilha(e.validacao?.em ?? null)),
          c(a('exportar.colunas.calculadoEm'), (e) => dataHoraPlanilha(e.calculadoEm)),
          c(a('exportar.colunas.erro'), (e) => e.erro),
        ],
      },
    ],
  };
}

interface LinhaItem {
  mes: MesComparacao;
  item: DiferencaItem;
}

/** Detalhe de uma empresa: o mês a mês e as diferenças por item */
export function exportacaoMesesComparacao(
  empresa: string,
  meses: MesComparacao[],
  t: Traduzir,
  idioma: string
): Exportacao {
  const a = (chave: string) => t(`comparacaoBancosHoras.${chave}`);
  const m_ = coluna<MesComparacao>;
  const i_ = coluna<LinhaItem>;
  const rotuloMes = (m: MesComparacao) => rotuloMesLocal(m.mes, idioma);
  const legado = a('exportar.colunas.legado');
  const novo = a('exportar.colunas.novo');
  const par = (rotulo: string, unidade: Unidade, medida: Medida) => [
    m_(`${rotulo} · ${legado}`, (m) =>
      unidade === 'horas' ? horas(m.legado.horas[medida]) : m.legado.tickets[medida]
    ),
    m_(`${rotulo} · ${novo}`, (m) =>
      unidade === 'horas' ? horas(m.novo.horas[medida]) : m.novo.tickets[medida]
    ),
  ];
  return {
    arquivo: `${a('exportar.arquivo')}-${empresa}`,
    titulo: `${a('titulo')} · ${empresa}`,
    abas: [
      {
        nome: a('detalhe.mesAMes'),
        linhas: meses,
        colunas: [
          m_(a('colunasMes.mes'), rotuloMes),
          m_(t('fase3Comum.situacao'), (m) => a(`situacoesMes.${m.situacao}`)),
          m_(a('colunasMes.consumoLegado'), (m) => horas(m.legado.horas.consumo)),
          m_(a('colunasMes.consumoNovo'), (m) => horas(m.novo.horas.consumo)),
          m_(a('colunasMes.diferenca'), (m) =>
            horas(m.novo.horas.consumo - m.legado.horas.consumo, { sinal: 'sempre' })
          ),
          ...par(a('exportar.colunas.requerimentos'), 'horas', 'requerimentos'),
          ...par(a('exportar.colunas.reajustes'), 'horas', 'reajustes'),
          ...par(a('exportar.colunas.saldo'), 'horas', 'saldo'),
          ...par(a('exportar.colunas.repasse'), 'horas', 'repasse'),
          ...par(a('exportar.colunas.excedente'), 'horas', 'excedente'),
          ...par(a('exportar.colunas.tickets'), 'tickets', 'consumo'),
          m_(a('colunasMes.porBanco'), (m) =>
            m.novo.porBanco.map((b) => `${b.nome} ${horas(b.minutos)}`).join(' · ')
          ),
          m_(a('exportar.colunas.origemSaldo'), (m) =>
            m.origemSaldo ? rotuloMesLocal(m.origemSaldo, idioma) : null
          ),
        ],
      },
      {
        nome: a('exportar.abaDiferencas'),
        linhas: meses.flatMap((m) => m.itens.map((item): LinhaItem => ({ mes: m, item }))),
        colunas: [
          i_(a('colunasMes.mes'), (l) => rotuloMes(l.mes)),
          i_(a('colunasItem.chamado'), (l) => l.item.chamado),
          i_(a('colunasItem.data'), (l) => dataHoraPlanilha(l.item.data)),
          i_(a('colunasItem.grupo'), (l) => l.item.grupo),
          i_(`${a('exportar.colunas.horas')} · ${legado}`, (l) => horas(l.item.minutosLegado)),
          i_(`${a('exportar.colunas.horas')} · ${novo}`, (l) => horas(l.item.minutosNovo)),
          i_(`${a('exportar.colunas.tickets')} · ${legado}`, (l) => l.item.ticketsLegado),
          i_(`${a('exportar.colunas.tickets')} · ${novo}`, (l) => l.item.ticketsNovo),
          i_(a('colunasItem.motivo'), (l) => a(`motivos.${l.item.motivo}`)),
          i_(a('exportar.colunas.explicado'), (l) =>
            a(l.item.explicado ? 'explicado' : 'semExplicacao')
          ),
        ],
      },
    ],
  };
}
