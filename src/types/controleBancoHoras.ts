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

export interface RequerimentoControle {
  id: string;
  chamado: string;
  titulo: string;
  /** requerimentos.modulo (lista fixa) */
  modulo: string;
  /** Mês de cobrança */
  mes: MesAno;
  /** Funcional + técnico, em minutos (horas de gestor não contam, D-01) */
  minutos: number;
  tickets: number;
  /** enviado: já consome o banco · desenvolvimento: ainda não consome */
  situacao: 'enviado' | 'desenvolvimento';
  /** Banco pelo módulo (Produtos e Módulos › Módulos de requerimento) */
  bancoAutomaticoId: string | null;
  /** Banco que recebe: o ajuste manual, se o banco participa do mês; senão o automático */
  bancoId: string | null;
  ajuste: {
    bancoId: string;
    motivo: string;
    atualizadoEm: string;
    atualizadoPor: string | null;
  } | null;
}

/** bancoId nulo = volta para o banco automático (tira o ajuste) */
export interface AjusteRequerimento {
  requerimentoId: string;
  bancoId: string | null;
}

/** Aba Histórico: auditoria, versões dos meses fechados e consumo entre bancos */
export type EventoHistorico =
  | {
      tipo: 'alteracao';
      id: string;
      em: string;
      usuarioId: string | null;
      usuario: string | null;
      tabela: string;
      acao: 'insert' | 'update' | 'delete';
      campos: string[];
      antes: Record<string, unknown> | null;
      depois: Record<string, unknown> | null;
      motivo: string | null;
      origem: string;
    }
  | {
      tipo: 'versao';
      id: string;
      em: string;
      usuarioId: string | null;
      usuario: string | null;
      mes: MesAno;
      versao: number;
      vigente: boolean;
      motivo: 'geracao_book' | 'retificacao';
      saldoFinalMinutos: number | null;
      saldoFinalTickets: number | null;
      excedenteMinutos: number | null;
    }
  | {
      tipo: 'transferencia';
      id: string;
      em: string;
      mes: MesAno;
      unidade: 'horas' | 'tickets';
      quantidade: number;
      /** consumiu: este banco recebeu do outro · cedeu: este banco deu ao outro */
      papel: 'consumiu' | 'cedeu';
      outroBanco: string;
    };

/** Saldo Parcial: o reajuste como o cliente vê, sem anotação interna nem autor (D-08) */
export interface ReajusteParaCliente {
  mes: MesAno;
  tipo: 'entrada' | 'saida';
  minutos: number;
  tickets: number;
  justificativa: string;
}

/** Saldo Parcial: a observação como o cliente vê, só mês e texto (D-08) */
export interface ObservacaoParaCliente {
  mes: MesAno;
  texto: string;
}

export interface ObservacaoInput {
  /** Ausente = observação nova */
  id?: string;
  bancoId: string;
  mes: MesAno;
  texto: string;
}
