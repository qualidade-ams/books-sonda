/**
 * Detecção de retroativos do modelo novo (Fase 5, Modelagem_Fase5.md seção 9; Modelagem_Fase3.md
 * seção 8.2). Roda no sync-api, pelo pacote vendor/comparacao.cjs, depois da sincronização de
 * apontamentos, só para as empresas liberadas.
 *
 * Para cada banco e mês do período de apuração aberto (D-10) já fechado pelo modelo novo, compara
 * os itens do fechamento vigente com a classificação de agora e chama
 * bancos_horas_registrar_retroativo, que cria, atualiza ou descarta sozinha o registro aberto.
 *
 * O mês da transição fica de fora: os itens dele são os do último Book do legado.
 */

import { estaVigente, type MesAno } from './calculo';
import { criarClassificador } from './classificacao';
import { itensDeConsumoPorBanco, type RepositorioFechamento } from './fechamento';
import { periodosDoBanco } from './periodos';

type Fonte = 'apontamento' | 'ticket';

export interface ItemRetroativo {
  tipo: Fonte;
  itemId: string;
  minutos: number;
  tickets: number;
}

export interface FechamentoVigente {
  id: string;
  bancoId: string;
  mes: MesAno;
  motivo: 'geracao_book' | 'retificacao' | 'transicao';
}

export interface PayloadRetroativo {
  banco_id: string;
  ano: number;
  mes: number;
  fechamento_id: string;
  consumo_antes_minutos: number;
  consumo_depois_minutos: number;
  consumo_antes_tickets: number;
  consumo_depois_tickets: number;
  itens: { tipo: Fonte; item_id: string; minutos: number; tickets: number }[];
}

export interface RepositorioRetroativos {
  empresasLiberadas(): Promise<string[]>;
  fechamentosVigentes(bancoIds: string[], meses: MesAno[]): Promise<FechamentoVigente[]>;
  /** Apontamentos e tickets dos fechamentos */
  itensDoFechamento(
    fechamentoIds: string[]
  ): Promise<(ItemRetroativo & { fechamentoId: string })[]>;
  registrar(payload: PayloadRetroativo): Promise<void>;
}

const indice = (m: MesAno) => m.ano * 12 + (m.mes - 1);
const chave = (m: MesAno) => `${m.ano}-${m.mes}`;

/** Lançado depois (+), alterado (diferença) e removido (−) no Aranda */
export function diferencaDosItens(
  antes: ItemRetroativo[],
  depois: ItemRetroativo[]
): PayloadRetroativo['itens'] {
  const id = (i: ItemRetroativo) => `${i.tipo}:${i.itemId}`;
  const doFechamento = new Map(antes.map((i) => [id(i), i]));
  const agora = new Set(depois.map(id));
  const itens: PayloadRetroativo['itens'] = [];
  for (const d of depois) {
    const a = doFechamento.get(id(d));
    const minutos = d.minutos - (a?.minutos ?? 0);
    const tickets = d.tickets - (a?.tickets ?? 0);
    if (minutos !== 0 || tickets !== 0)
      itens.push({ tipo: d.tipo, item_id: d.itemId, minutos, tickets });
  }
  for (const a of antes) {
    if (!agora.has(id(a))) {
      // 0 - x evita o -0 quando o item não tem tickets (ou minutos)
      itens.push({
        tipo: a.tipo,
        item_id: a.itemId,
        minutos: 0 - a.minutos,
        tickets: 0 - a.tickets,
      });
    }
  }
  return itens;
}

const soma = (itens: ItemRetroativo[], campo: 'minutos' | 'tickets') =>
  itens.reduce((s, i) => s + i[campo], 0);

/** Devolve quantos bancos e meses foram enviados para a função do banco */
export async function detectarRetroativosEmpresa(
  motor: RepositorioFechamento,
  repo: RepositorioRetroativos,
  empresaId: string,
  hoje: MesAno
): Promise<number> {
  const cadastros = (await motor.bancos(empresaId)).filter((b) => b.ativo);
  if (cadastros.length === 0) return 0;

  // Meses já passados do período aberto de cada banco (D-10)
  const meses = new Map<string, MesAno>();
  for (const b of cadastros) {
    for (const m of periodosDoBanco(b, hoje).at(-1)?.meses ?? []) {
      if (indice(m) < indice(hoje)) meses.set(chave(m), m);
    }
  }
  if (meses.size === 0) return 0;
  const ordenados = [...meses.values()].sort((a, b) => indice(a) - indice(b));

  const fechamentos = (
    await repo.fechamentosVigentes(
      cadastros.map((b) => b.bancoId),
      ordenados
    )
  ).filter((f) => f.motivo !== 'transicao');
  if (fechamentos.length === 0) return 0;

  const itens = await repo.itensDoFechamento(fechamentos.map((f) => f.id));
  const porId = new Map(cadastros.map((b) => [b.bancoId, b]));
  const dePara = await motor.dePara();

  let enviados = 0;
  for (const mes of ordenados) {
    const doMes = fechamentos.filter((f) => chave(f.mes) === chave(mes));
    if (doMes.length === 0) continue;
    // Todos os bancos vigentes classificam, para cada item cair no mesmo banco do fechamento
    const bancosDoMes = cadastros.filter((b) => estaVigente(b, mes)).map((b) => b.bancoId);
    const classificador = criarClassificador(cadastros, dePara, mes);
    const agora = await itensDeConsumoPorBanco(
      motor,
      empresaId,
      mes,
      porId,
      classificador,
      bancosDoMes
    );

    for (const f of doMes) {
      const antes = itens.filter((i) => i.fechamentoId === f.id);
      const depois: ItemRetroativo[] = (agora.get(f.bancoId) ?? []).map((i) => ({
        tipo: i.fonte as Fonte,
        itemId: i.itemId,
        minutos: i.minutos,
        tickets: i.tickets,
      }));
      await repo.registrar({
        banco_id: f.bancoId,
        ano: mes.ano,
        mes: mes.mes,
        fechamento_id: f.id,
        consumo_antes_minutos: soma(antes, 'minutos'),
        consumo_depois_minutos: soma(depois, 'minutos'),
        consumo_antes_tickets: soma(antes, 'tickets'),
        consumo_depois_tickets: soma(depois, 'tickets'),
        itens: diferencaDosItens(antes, depois),
      });
      enviados++;
    }
  }
  return enviados;
}

export interface ResumoRetroativos {
  empresas: number;
  registrados: number;
  erros: number;
}

/** Todas as empresas liberadas, uma por vez; a falha de uma não para as outras */
export async function executarDeteccaoRetroativos(
  deps: {
    motor: (empresaId: string) => RepositorioFechamento;
    retroativos: RepositorioRetroativos;
  },
  hoje: MesAno
): Promise<ResumoRetroativos> {
  const empresas = await deps.retroativos.empresasLiberadas();
  const resumo: ResumoRetroativos = { empresas: empresas.length, registrados: 0, erros: 0 };
  for (const empresaId of empresas) {
    try {
      resumo.registrados += await detectarRetroativosEmpresa(
        deps.motor(empresaId),
        deps.retroativos,
        empresaId,
        hoje
      );
    } catch {
      resumo.erros++;
    }
  }
  return resumo;
}
