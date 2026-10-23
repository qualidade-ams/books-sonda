/**
 * Lançamentos do Controle de Banco de Horas (Modelagem_Fase3.md, seção 7):
 * reajustes e observações de cada banco, por mês.
 */

import type { MesAno } from '@/services/bancosHoras/calculo';

/** entrada abate do consumo; saída soma ao consumo (RC-24) */
export type TipoReajuste = 'entrada' | 'saida';

export interface ReajusteControle {
  id: string;
  bancoId: string;
  mes: MesAno;
  tipo: TipoReajuste;
  minutos: number;
  tickets: number;
  /** Vai ao cliente como observação do mês */
  justificativa: string;
  /** Só para a equipe: nunca vai ao Book, ao Saldo Parcial ou a e-mails */
  anotacaoInterna: string | null;
  origem: 'manual' | 'ajuste_retroativo' | 'carga_legado';
  ativo: boolean;
  motivoInativacao: string | null;
  inativadoEm: string | null;
  criadoEm: string;
  criadoPor: string | null;
  /**
   * Mês fechado ainda sem a mudança: ativo fora dos itens do fechamento vigente,
   * ou inativado que continua nos itens (calculado, não gravado)
   */
  aguardandoRetificacao: boolean;
}

export interface NovoReajusteInput {
  bancoId: string;
  mes: MesAno;
  tipo: TipoReajuste;
  minutos: number;
  tickets: number;
  justificativa: string;
  anotacaoInterna: string | null;
}

export type OrigemObservacao = 'manual' | 'ajuste' | 'consumo_entre_bancos' | 'faturamento';

export interface ObservacaoControle {
  id: string;
  bancoId: string;
  mes: MesAno;
  texto: string;
  origem: OrigemObservacao;
  reajusteId: string | null;
  criadoEm: string;
  criadoPor: string | null;
  /** Alterada depois de criada */
  editada: boolean;
}

export interface ObservacaoInput {
  /** Ausente = observação nova */
  id?: string;
  bancoId: string;
  mes: MesAno;
  texto: string;
}
