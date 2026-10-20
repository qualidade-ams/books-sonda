/**
 * Motor novo de bancos de horas: calcula o mês de uma empresa, com todos os
 * bancos (Modelagem_Fase2.md, seção 2). Nada é gravado: o mês aberto é sempre
 * calculado na hora; o mês fechado devolve o resultado congelado (A2, D-11).
 *
 * Os dados chegam por um repositório (RepositorioBancosHoras), para o motor ser
 * testado sem banco e reaproveitado pelo sync-api.
 */

import {
  aplicarRegraDeSaida,
  calcularSaldo,
  ehFimDePeriodo,
  inicioDoCiclo,
  mesesDesdeVigencia,
  valorExcedente,
  type EntradaUnidade,
  type MesAno,
  type ParametrosCalculo,
  type SaldoUnidade,
  type Unidade,
} from './calculo';
import {
  baselineDoMes,
  percentualDoMes,
  type VigenciaBaseline,
  type VigenciaRepasse,
} from './vigencias';
import {
  criarClassificador,
  type BancoClassificavel,
  type Classificador,
  type GrupoDePara,
  type Quantidades,
} from './classificacao';
import {
  calcularConsumoEntreBancos,
  observacoesDaTransferencia,
  type Transferencia,
} from './consumoEntreBancos';
import {
  ALERTA_SEM_TAXA,
  descricaoFaturamento,
  escolherTaxa,
  taxaHora,
  taxaTicket,
  type TaxaCliente,
} from './taxas';

// ---------------------------------------------------------------------------
// Dados de entrada
// ---------------------------------------------------------------------------

export interface BancoCadastro extends BancoClassificavel, ParametrosCalculo {
  nome: string;
  visivelCliente: boolean;
  diaInicioApuracao: number;
  diaFimApuracao: number;
  taxaProduto: string;
  taxaTipoHora: 'excedente' | 'normal';
  consomeOutrosBancos: boolean;
  baselines: VigenciaBaseline[];
  repasses: VigenciaRepasse[];
}

export interface LinhaConsumo extends Quantidades {
  fonte: 'apontamento' | 'ticket';
  grupo: string | null;
  itemConfiguracao: string | null;
}

export interface LinhaRequerimento {
  requerimentoId: string;
  produtoId: string | null;
  moduloId: string | null;
  bancoAjustadoId: string | null;
  /** Horas decimais (funcional + técnico) */
  horas: number;
  tickets: number;
}

export interface ReajusteBanco {
  id?: string;
  bancoId: string;
  mes: number;
  ano: number;
  tipo: 'entrada' | 'saida';
  minutos: number;
  tickets: number;
}

export interface RepositorioBancosHoras {
  bancos(empresaId: string): Promise<BancoCadastro[]>;
  dePara(): Promise<GrupoDePara[]>;
  consumo(
    empresaId: string,
    mes: MesAno,
    diaInicio: number,
    diaFim: number
  ): Promise<LinhaConsumo[]>;
  requerimentos(empresaId: string, mes: MesAno): Promise<LinhaRequerimento[]>;
  /** Reajustes ativos dos bancos entre os dois meses, inclusive */
  reajustes(bancoIds: string[], de: MesAno, ate: MesAno): Promise<ReajusteBanco[]>;
  /** Versões vigentes dos fechamentos entre os dois meses, inclusive */
  fechamentos(bancoIds: string[], de: MesAno, ate: MesAno): Promise<ResultadoBancoMes[]>;
  taxas(empresaId: string): Promise<TaxaCliente[]>;
}

// ---------------------------------------------------------------------------
// Resultado
// ---------------------------------------------------------------------------

export interface ResultadoUnidade extends SaldoUnidade {
  consumidoDeOutros: number;
  cedidoAOutros: number;
  /** Saldo depois do consumo entre bancos */
  saldoFinal: number;
  repasse: number;
  excedente: number;
  valorExcedente: number;
  taxa: number | null;
}

export interface ObservacaoAutomatica {
  origem: 'consumo_entre_bancos' | 'faturamento';
  texto: string;
}

export interface ResultadoBancoMes {
  bancoId: string;
  nome: string;
  mes: MesAno;
  fechado: boolean;
  fimPeriodo: boolean;
  transicaoPeriodo: boolean;
  percentualRepasse: number;
  horas: ResultadoUnidade | null;
  tickets: ResultadoUnidade | null;
  valorAFaturar: number;
  observacoes: ObservacaoAutomatica[];
  alertas: string[];
}

export interface ResultadoEmpresaMes {
  empresaId: string;
  mes: MesAno;
  bancos: ResultadoBancoMes[];
  transferencias: Transferencia[];
  /** Consumo que não coube em nenhum banco (empresa sem Banco padrão vigente) */
  semBanco: Quantidades;
  alertas: string[];
}

// ---------------------------------------------------------------------------
// Apoio
// ---------------------------------------------------------------------------

const indice = (m: MesAno) => m.ano * 12 + (m.mes - 1);
const doIndice = (i: number): MesAno => ({ mes: (i % 12) + 1, ano: Math.floor(i / 12) });
const chave = (m: MesAno) => `${m.ano}-${m.mes}`;

const unidadesDoContrato = (b: BancoCadastro): Unidade[] =>
  b.tipoContrato === 'ambos' ? ['horas', 'tickets'] : [b.tipoContrato];

/** Consumo, requerimentos e reajustes de cada banco num mês */
interface MovimentoMes {
  consumo: Quantidades;
  requerimentosHoras: number;
  requerimentosTickets: number;
  entrada: Quantidades;
  saida: Quantidades;
}

const movimentoVazio = (): MovimentoMes => ({
  consumo: { minutos: 0, tickets: 0 },
  requerimentosHoras: 0,
  requerimentosTickets: 0,
  entrada: { minutos: 0, tickets: 0 },
  saida: { minutos: 0, tickets: 0 },
});

function entradaDaUnidade(
  b: BancoCadastro,
  m: MesAno,
  mov: MovimentoMes,
  unidade: Unidade
): EntradaUnidade {
  const baseline = baselineDoMes(b.baselines, m);
  if (unidade === 'horas') {
    return {
      baseline: baseline.horas,
      // D-02: em "ambos", os chamados não consomem horas
      consumo: b.tipoContrato === 'ambos' ? 0 : mov.consumo.minutos,
      requerimentos: Math.round(mov.requerimentosHoras * 60),
      reajusteEntrada: mov.entrada.minutos,
      reajusteSaida: mov.saida.minutos,
    };
  }
  return {
    baseline: baseline.tickets,
    consumo: mov.consumo.tickets,
    requerimentos: mov.requerimentosTickets,
    reajusteEntrada: mov.entrada.tickets,
    reajusteSaida: mov.saida.tickets,
  };
}

// ---------------------------------------------------------------------------
// Motor
// ---------------------------------------------------------------------------

/**
 * Banco do requerimento: o ajuste manual prevalece, se o banco participa do mês;
 * senão, a classificação pelo produto/módulo (RN-09).
 */
export function bancoDoRequerimento(
  r: LinhaRequerimento,
  classificador: Classificador,
  bancosDoMes: string[]
): string | null {
  if (r.bancoAjustadoId && bancosDoMes.includes(r.bancoAjustadoId)) return r.bancoAjustadoId;
  return classificador.porProdutoModulo(r.produtoId, r.moduloId, null);
}

export interface OpcoesCalculo {
  /** Retificação: recalcula o próprio mês mesmo fechado (os anteriores continuam congelados) */
  recalcularMesFechado?: boolean;
}

export async function calcularEmpresaMes(
  repo: RepositorioBancosHoras,
  empresaId: string,
  mes: MesAno,
  opcoes: OpcoesCalculo = {}
): Promise<ResultadoEmpresaMes> {
  const todos = await repo.bancos(empresaId);
  const vigentes = todos
    .filter((b) => b.ativo && mesesDesdeVigencia(b, mes) >= 0)
    .sort((a, b) => a.ordem - b.ordem);
  const vazio: ResultadoEmpresaMes = {
    empresaId,
    mes,
    bancos: [],
    transferencias: [],
    semBanco: { minutos: 0, tickets: 0 },
    alertas: [],
  };
  if (vigentes.length === 0) return vazio;

  // Ponto de partida de cada banco: início do período ou o mês seguinte ao último fechado
  const inicioMaisAntigo = Math.min(...vigentes.map((b) => indice(inicioDoCiclo(b, mes))));
  const fechados = await repo.fechamentos(
    vigentes.map((b) => b.bancoId),
    doIndice(inicioMaisAntigo),
    mes
  );
  const fechadoEm = new Map(fechados.map((f) => [`${f.bancoId}|${chave(f.mes)}`, f]));

  const partida = new Map<string, { inicio: number; repasse: Record<Unidade, number> }>();
  const congelados: ResultadoBancoMes[] = [];
  for (const b of vigentes) {
    const doMes = opcoes.recalcularMesFechado
      ? undefined
      : fechadoEm.get(`${b.bancoId}|${chave(mes)}`);
    if (doMes) {
      congelados.push(doMes);
      continue;
    }
    let inicio = indice(inicioDoCiclo(b, mes));
    let repasse: Record<Unidade, number> = { horas: 0, tickets: 0 };
    for (let i = indice(mes) - 1; i >= inicio; i--) {
      const f = fechadoEm.get(`${b.bancoId}|${chave(doIndice(i))}`);
      if (f) {
        inicio = i + 1;
        repasse = { horas: f.horas?.repasse ?? 0, tickets: f.tickets?.repasse ?? 0 };
        break;
      }
    }
    partida.set(b.bancoId, { inicio, repasse });
  }

  const abertos = vigentes.filter((b) => partida.has(b.bancoId));
  if (abertos.length === 0) {
    return { ...vazio, bancos: congelados };
  }

  // Movimento de cada mês necessário, classificado por banco
  const primeiro = Math.min(...abertos.map((b) => partida.get(b.bancoId)!.inicio));
  const [dePara, reajustes, taxas] = await Promise.all([
    repo.dePara(),
    repo.reajustes(
      abertos.map((b) => b.bancoId),
      doIndice(primeiro),
      mes
    ),
    repo.taxas(empresaId),
  ]);

  const movimentos = new Map<string, MovimentoMes>(); // bancoId|ano-mes
  const movimentoDe = (bancoId: string, m: MesAno) => {
    const k = `${bancoId}|${chave(m)}`;
    if (!movimentos.has(k)) movimentos.set(k, movimentoVazio());
    return movimentos.get(k)!;
  };
  let semBanco: Quantidades = { minutos: 0, tickets: 0 };

  for (let i = primeiro; i <= indice(mes); i++) {
    const m = doIndice(i);
    const precisam = abertos.filter((b) => partida.get(b.bancoId)!.inicio <= i);
    if (precisam.length === 0) continue;
    const classificador = criarClassificador(todos, dePara, m);
    const semBancoMes: Quantidades = { minutos: 0, tickets: 0 };

    // Uma consulta por janela de apuração distinta
    const janelas = new Map<string, BancoCadastro[]>();
    for (const b of precisam) {
      const k = `${b.diaInicioApuracao}-${b.diaFimApuracao}`;
      janelas.set(k, [...(janelas.get(k) ?? []), b]);
    }
    let primeiraJanela = true;
    for (const [k, bancosDaJanela] of janelas) {
      const [di, df] = k.split('-').map(Number);
      const ids = new Set(bancosDaJanela.map((b) => b.bancoId));
      for (const l of await repo.consumo(empresaId, m, di, df)) {
        const bancoId = classificador.porGrupo(l.grupo, l.itemConfiguracao);
        if (bancoId === null) {
          // Sem banco não tem janela própria: conta só na primeira, para não duplicar
          if (!primeiraJanela) continue;
          semBancoMes.minutos += l.minutos;
          semBancoMes.tickets += l.tickets;
        } else if (ids.has(bancoId)) {
          const mov = movimentoDe(bancoId, m);
          mov.consumo.minutos += l.minutos;
          mov.consumo.tickets += l.tickets;
        }
      }
      primeiraJanela = false;
    }

    for (const r of await repo.requerimentos(empresaId, m)) {
      const bancoId = bancoDoRequerimento(
        r,
        classificador,
        precisam.map((b) => b.bancoId)
      );
      if (bancoId === null) {
        semBancoMes.minutos += Math.round(r.horas * 60);
        semBancoMes.tickets += r.tickets;
        continue;
      }
      const mov = movimentoDe(bancoId, m);
      mov.requerimentosHoras += r.horas;
      mov.requerimentosTickets += r.tickets;
    }
    if (i === indice(mes)) semBanco = semBancoMes;
  }

  for (const r of reajustes) {
    const mov = movimentoDe(r.bancoId, { mes: r.mes, ano: r.ano });
    const destino = r.tipo === 'entrada' ? mov.entrada : mov.saida;
    destino.minutos += r.minutos;
    destino.tickets += r.tickets;
  }

  // Cadeia de cada banco até o mês anterior; saldo do mês pedido
  const saldosDoMes = new Map<string, Partial<Record<Unidade, SaldoUnidade>>>();
  for (const b of abertos) {
    const { inicio, repasse } = partida.get(b.bancoId)!;
    const repasseAnterior = { ...repasse };
    const saldos: Partial<Record<Unidade, SaldoUnidade>> = {};
    for (let i = inicio; i <= indice(mes); i++) {
      const m = doIndice(i);
      const mov = movimentos.get(`${b.bancoId}|${chave(m)}`) ?? movimentoVazio();
      for (const u of unidadesDoContrato(b)) {
        const saldo = calcularSaldo(entradaDaUnidade(b, m, mov, u), repasseAnterior[u]);
        if (i < indice(mes)) {
          repasseAnterior[u] = aplicarRegraDeSaida(
            b,
            m,
            saldo.saldo,
            percentualDoMes(b.repasses, m),
            u
          ).repasse;
        } else {
          saldos[u] = saldo;
        }
      }
    }
    saldosDoMes.set(b.bancoId, saldos);
  }

  // Consumo entre bancos (só no fim do período) e regra de saída
  const entreBancos = calcularConsumoEntreBancos(
    abertos.map((b) => ({
      bancoId: b.bancoId,
      nome: b.nome,
      ordem: b.ordem,
      ativo: b.ativo,
      tipoContrato: b.tipoContrato,
      periodoApuracao: b.periodoApuracao,
      fimPeriodo: ehFimDePeriodo(b, mes),
      consomeOutrosBancos: b.consomeOutrosBancos,
      saldos: Object.fromEntries(
        Object.entries(saldosDoMes.get(b.bancoId)!).map(([u, s]) => [u, s.saldo])
      ) as Partial<Record<Unidade, number>>,
    }))
  );
  const nomes = new Map(todos.map((b) => [b.bancoId, b.nome]));

  const calculados = abertos.map((b): ResultadoBancoMes => {
    const percentuais = percentualDoMes(b.repasses, mes);
    const taxa = escolherTaxa(taxas, mes, b.taxaProduto);
    const taxaPorUnidade = {
      horas: taxa ? taxaHora(taxa, b.taxaTipoHora) : null,
      tickets: taxa ? taxaTicket(taxa) : null,
    };
    const resultado: ResultadoBancoMes = {
      bancoId: b.bancoId,
      nome: b.nome,
      mes,
      fechado: false,
      fimPeriodo: ehFimDePeriodo(b, mes),
      transicaoPeriodo: false,
      percentualRepasse: percentuais.mensal,
      horas: null,
      tickets: null,
      valorAFaturar: 0,
      observacoes: [],
      alertas: [],
    };

    for (const u of unidadesDoContrato(b)) {
      const saldo = saldosDoMes.get(b.bancoId)![u]!;
      const mov = entreBancos.porBanco[b.bancoId][u]!;
      const saida = aplicarRegraDeSaida(b, mes, mov.saldoAposConsumoEntreBancos, percentuais, u);
      const valor = valorExcedente(saida.excedente, u, taxaPorUnidade[u]);
      resultado.transicaoPeriodo = saida.transicaoPeriodo;
      resultado[u] = {
        ...saldo,
        consumidoDeOutros: mov.consumidoDeOutros,
        cedidoAOutros: mov.cedidoAOutros,
        saldoFinal: mov.saldoAposConsumoEntreBancos,
        repasse: saida.repasse,
        excedente: saida.excedente,
        valorExcedente: valor,
        taxa: taxaPorUnidade[u],
      };
      if (saida.excedente > 0) {
        if (taxaPorUnidade[u] === null) {
          if (!resultado.alertas.includes(ALERTA_SEM_TAXA)) resultado.alertas.push(ALERTA_SEM_TAXA);
        } else {
          resultado.observacoes.push({
            origem: 'faturamento',
            texto: descricaoFaturamento(saida.excedente, u, mes, valor),
          });
        }
      }
      resultado.valorAFaturar = Math.round((resultado.valorAFaturar + valor) * 100) / 100;
    }

    for (const t of entreBancos.transferencias) {
      if (t.consumidorId !== b.bancoId && t.cedenteId !== b.bancoId) continue;
      const textos = observacoesDaTransferencia(t, {
        cedente: nomes.get(t.cedenteId)!,
        consumidor: nomes.get(t.consumidorId)!,
      });
      resultado.observacoes.unshift({
        origem: 'consumo_entre_bancos',
        texto: t.consumidorId === b.bancoId ? textos.consumidor : textos.cedente,
      });
    }
    return resultado;
  });

  const alertas: string[] = [];
  if (semBanco.minutos > 0 || semBanco.tickets > 0) {
    alertas.push(
      'Há consumo sem banco no mês: a empresa não tem Banco padrão vigente para receber o que não se encaixa nos outros bancos.'
    );
  }

  const bancos = [...congelados, ...calculados].sort(
    (a, b) =>
      vigentes.findIndex((v) => v.bancoId === a.bancoId) -
      vigentes.findIndex((v) => v.bancoId === b.bancoId)
  );
  return { empresaId, mes, bancos, transferencias: entreBancos.transferencias, semBanco, alertas };
}
