// Comparação Legado x Novo (Fase 4, Modelagem_Fase4.md, seções 3 a 5)
import type { MesAno } from '@/services/bancosHoras/calculo';
import type {
  ConsumoDoBanco,
  DiferencaItem,
  MedidasMes,
  SituacaoComparacao,
  SituacaoMes,
} from '@/services/bancosHoras/comparacao';

export type {
  ConsumoDoBanco,
  DiferencaItem,
  MedidasMes,
  MotivoDiferenca,
  SituacaoComparacao,
  SituacaoMes,
} from '@/services/bancosHoras/comparacao';

export interface ValidacaoComparacao {
  /** Nome de quem validou; nulo quando o nome não pôde ser lido */
  por: string | null;
  em: string;
  situacao: SituacaoComparacao;
}

/** Empresa liberada para o modelo novo (Fase 5) */
export interface LiberacaoComparacao {
  /** Nome de quem liberou; nulo quando o nome não pôde ser lido */
  por: string | null;
  em: string | null;
  /** Primeiro mês pelo modelo novo; nulo quando não houve transição (nenhum mês fechado no legado) */
  desde: MesAno | null;
}

/** O que a volta para o legado copia do Controle novo (P4) */
export interface LancamentosParaLegado {
  reajustes: number;
  observacoes: number;
}

/** Uma linha da lista: a empresa e o resumo dos meses comparados */
export interface ComparacaoEmpresa {
  empresaId: string;
  empresa: string;
  bancosAtivos: number;
  /** Nula quando a rotina só registrou erro, ainda sem resultado */
  situacao: SituacaoComparacao | null;
  mesesComparados: number;
  consumoLegadoMinutos: number;
  consumoNovoMinutos: number;
  consumoLegadoTickets: number;
  consumoNovoTickets: number;
  calculadoEm: string | null;
  erro: string | null;
  erroEm: string | null;
  validacao: ValidacaoComparacao | null;
  liberacao: LiberacaoComparacao | null;
}

export interface MesComparacao {
  mes: MesAno;
  situacao: SituacaoMes;
  legado: MedidasMes;
  novo: MedidasMes & { porBanco: ConsumoDoBanco[] };
  /** Mês onde começou a diferença de saldo que este mês carrega */
  origemSaldo: MesAno | null;
  /** Até 500 itens com diferença */
  itens: DiferencaItem[];
  itensTotal: number;
  fechamentoLegadoEm: string;
}

/** Grupo dos indicadores da tela: liberada vale mais que validada, e esta mais que a situação */
export type GrupoComparacao = 'conferem' | 'explicada' | 'divergente' | 'validada' | 'liberada';
