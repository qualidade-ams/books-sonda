/**
 * Cadastro dos bancos de horas na tela Empresas (Modelagem_Fase3.md, seção 4).
 * Datas no formato do banco (AAAA-MM-DD, sempre dia 1 nas vigências).
 */

import type { Autoria } from '@/types/catalogo';

export type TipoContrato = 'horas' | 'tickets' | 'ambos';

export interface EscopoBancoCadastro {
  produtoId: string;
  /** Nulo = produto inteiro, inclusive módulos criados depois */
  moduloId: string | null;
}

export interface FiltroIc {
  operador: 'contem' | 'igual';
  valor: string;
}

export interface VigenciaBaselineCadastro extends Autoria {
  id: string;
  dataInicio: string;
  /** Nulo = vigente */
  dataFim: string | null;
  baselineMinutos: number | null;
  baselineTickets: number | null;
  /** mensal: todo mês · anual: só no mês de início, todo ano */
  credito: 'mensal' | 'anual';
  motivo: string | null;
}

export interface VigenciaRepasseCadastro extends Autoria {
  id: string;
  dataInicio: string;
  dataFim: string | null;
  percentualMensal: number;
  percentualDentroPeriodo: number | null;
  percentualEntrePeriodos: number | null;
  motivo: string | null;
}

/** Campos editáveis de um banco */
export interface ParametrosBanco {
  nome: string;
  descricao: string | null;
  padrao: boolean;
  tipoContrato: TipoContrato;
  periodoApuracao: number;
  inicioVigencia: string;
  /** Último mês em que o banco vale; nulo = tempo indeterminado */
  fimVigencia: string | null;
  /** 1 a 28 */
  diaInicioApuracao: number;
  /** 0 = último dia do mês */
  diaFimApuracao: number;
  taxaProduto: 'GALLERY' | 'OUTROS';
  taxaTipoHora: 'excedente' | 'normal';
  repasseEspecial: 'nenhum' | 'por_periodo';
  duracaoPeriodoMeses: number | null;
  periodosAteZerar: number | null;
  consomeOutrosBancos: boolean;
  filtroIc: FiltroIc | null;
  escopo: EscopoBancoCadastro[];
}

export interface BancoCadastro extends Autoria, ParametrosBanco {
  id: string;
  empresaId: string;
  ordem: number;
  ativo: boolean;
  visivelCliente: boolean;
  /** Banco padrão da carga que ainda acompanha o legado; editar desliga */
  espelhaLegado: boolean;
  baselines: VigenciaBaselineCadastro[];
  repasses: VigenciaRepasseCadastro[];
}

export interface ValoresBaseline {
  baselineMinutos: number | null;
  baselineTickets: number | null;
  credito: 'mensal' | 'anual';
}

export interface ValoresRepasse {
  percentualMensal: number;
  percentualDentroPeriodo: number | null;
  percentualEntrePeriodos: number | null;
}

export interface NovoBancoInput extends ParametrosBanco {
  empresaId: string;
  baseline: ValoresBaseline;
  repasse: ValoresRepasse;
}

export type NovaVigenciaInput =
  | { bancoId: string; tipo: 'baseline'; desde: string; valores: ValoresBaseline; motivo: string }
  | { bancoId: string; tipo: 'repasse'; desde: string; valores: ValoresRepasse; motivo: string };
