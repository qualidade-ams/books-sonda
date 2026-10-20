/**
 * Consumo entre bancos no fechamento do período (RN-17 a RN-24; Modelagem_Fase2.md 5.1).
 * Roda depois do saldo de todos os bancos da empresa no mês e antes da regra de
 * fim de período de cada um (RN-23). Funções puras.
 */

import type { TipoContrato, Unidade } from './calculo';

export interface BancoNoFechamento {
  bancoId: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  tipoContrato: TipoContrato;
  periodoApuracao: number;
  /** O mês calculado é o fim de período deste banco */
  fimPeriodo: boolean;
  consomeOutrosBancos: boolean;
  /** Saldo do mês, já descontado o próprio consumo, por unidade do contrato */
  saldos: Partial<Record<Unidade, number>>;
}

export interface Transferencia {
  cedenteId: string;
  consumidorId: string;
  unidade: Unidade;
  quantidade: number;
}

export interface MovimentoUnidade {
  consumidoDeOutros: number;
  cedidoAOutros: number;
  saldoAposConsumoEntreBancos: number;
}

export interface ResultadoConsumoEntreBancos {
  transferencias: Transferencia[];
  porBanco: Record<string, Partial<Record<Unidade, MovimentoUnidade>>>;
}

const UNIDADES: Unidade[] = ['horas', 'tickets'];

/** Bancos que podem ceder ao consumidor (RN-19, 9.3-6) */
const podeCeder = (cedente: BancoNoFechamento, consumidor: BancoNoFechamento) =>
  cedente.bancoId !== consumidor.bancoId &&
  cedente.ativo &&
  cedente.fimPeriodo &&
  cedente.tipoContrato === consumidor.tipoContrato &&
  cedente.periodoApuracao === consumidor.periodoApuracao;

export function calcularConsumoEntreBancos(
  bancos: BancoNoFechamento[]
): ResultadoConsumoEntreBancos {
  const porOrdem = [...bancos].sort((a, b) => a.ordem - b.ordem);
  const porBanco: ResultadoConsumoEntreBancos['porBanco'] = {};
  for (const b of bancos) {
    porBanco[b.bancoId] = {};
    for (const u of UNIDADES) {
      if (b.saldos[u] === undefined) continue;
      porBanco[b.bancoId][u] = {
        consumidoDeOutros: 0,
        cedidoAOutros: 0,
        saldoAposConsumoEntreBancos: b.saldos[u],
      };
    }
  }

  const transferencias: Transferencia[] = [];
  // RN-21: consumidores na ordem do cadastro; RN-18: só no fim do período
  for (const consumidor of porOrdem.filter(
    (b) => b.ativo && b.consomeOutrosBancos && b.fimPeriodo
  )) {
    for (const unidade of UNIDADES) {
      const mov = porBanco[consumidor.bancoId][unidade];
      if (!mov || mov.saldoAposConsumoEntreBancos >= 0) continue;

      // RN-20: cedentes na ordem do cadastro, até o próprio saldo positivo
      for (const cedente of porOrdem.filter((b) => podeCeder(b, consumidor))) {
        const deficit = -mov.saldoAposConsumoEntreBancos;
        if (deficit === 0) break;
        const movCedente = porBanco[cedente.bancoId][unidade];
        if (!movCedente || movCedente.saldoAposConsumoEntreBancos <= 0) continue;

        const quantidade = Math.min(deficit, movCedente.saldoAposConsumoEntreBancos);
        movCedente.saldoAposConsumoEntreBancos -= quantidade;
        movCedente.cedidoAOutros += quantidade;
        mov.saldoAposConsumoEntreBancos += quantidade;
        mov.consumidoDeOutros += quantidade;
        transferencias.push({
          cedenteId: cedente.bancoId,
          consumidorId: consumidor.bancoId,
          unidade,
          quantidade,
        });
      }
    }
  }

  return { transferencias, porBanco };
}

const formatarHoras = (minutos: number) =>
  `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

/** "do Banco FISCAL" ou "do banco NIQUEL": não repete a palavra quando o nome já começa com ela */
const referenciaBanco = (preposicao: 'do' | 'ao', nome: string) =>
  /^banco\b/i.test(nome.trim()) ? `${preposicao} ${nome}` : `${preposicao} banco ${nome}`;

/** Observações automáticas dos dois bancos (RN-24); não editáveis */
export function observacoesDaTransferencia(
  t: Pick<Transferencia, 'unidade' | 'quantidade'>,
  nomes: { cedente: string; consumidor: string }
): { consumidor: string; cedente: string } {
  if (t.unidade === 'horas') {
    const q = formatarHoras(t.quantidade);
    return {
      consumidor: `${q} horas consumidas ${referenciaBanco('do', nomes.cedente)}`,
      cedente: `${q} horas cedidas ${referenciaBanco('ao', nomes.consumidor)}`,
    };
  }
  const plural = t.quantidade === 1 ? '' : 's';
  return {
    consumidor: `${t.quantidade} ticket${plural} consumido${plural} ${referenciaBanco('do', nomes.cedente)}`,
    cedente: `${t.quantidade} ticket${plural} cedido${plural} ${referenciaBanco('ao', nomes.consumidor)}`,
  };
}
