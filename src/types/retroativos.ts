/**
 * Apontamentos Retroativos, modelo novo por banco (Modelagem_Fase3.md, seção 8):
 * o que chegou do Aranda depois do fechamento do mês.
 */

import type { MesAno } from '@/services/bancosHoras/calculo';

/**
 * pendente: detectado, aguardando análise · aprovado: aguardando a retificação do
 * Book do mês (D-09) · aplicado: entrou na retificação · descartado: não conta
 */
export type SituacaoRetroativo = 'pendente' | 'aprovado' | 'aplicado' | 'descartado';

export interface Autor {
  em: string;
  porId: string | null;
  /** Nome pelo cadastro de usuários; nulo sem permissão ou sem cadastro */
  por: string | null;
}

export interface ItemRetroativo {
  id: string;
  tipo: 'apontamento' | 'ticket';
  /** apontamentos_aranda.id ou apontamentos_tickets_aranda.id */
  itemId: string;
  chamado: string | null;
  tarefa: string | null;
  consultor: string | null;
  /** Data do trabalho, no mês já fechado */
  dataAtividade: string | null;
  /** Quando foi lançado no Aranda, depois do fechamento */
  lancadoEm: string | null;
  /** Estado do chamado no Aranda, como vem de lá */
  statusChamado: string | null;
  /** Negativo: alterado ou removido no Aranda depois do fechamento */
  minutos: number;
  tickets: number;
  aviso: Autor | null;
}

export interface Retroativo {
  id: string;
  empresaId: string;
  empresa: string;
  bancoId: string;
  banco: string;
  mes: MesAno;
  consumoAntesMinutos: number;
  consumoDepoisMinutos: number;
  consumoAntesTickets: number;
  consumoDepoisTickets: number;
  detectadoEm: string;
  atualizadoEm: string;
  situacao: SituacaoRetroativo;
  decisao: (Autor & { justificativa: string }) | null;
  retificacao: Autor | null;
  itens: ItemRetroativo[];
}
