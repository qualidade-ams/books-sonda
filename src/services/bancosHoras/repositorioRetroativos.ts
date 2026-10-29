/**
 * Repositório da detecção de retroativos do modelo novo sobre o Supabase (Fase 5). Usado pelo
 * sync-api com a service role: a gravação é por bancos_horas_registrar_retroativo
 * (migration 20261022000007), que só aceita a rotina.
 */

import type { MesAno } from './calculo';
import type { ClienteSupabase } from './repositorioSupabase';
import type { RepositorioRetroativos } from './retroativos';

type Linha = Record<string, any>;

/** Ids por consulta: o filtro .in() vai na URL do PostgREST */
const LOTE = 150;

const indice = (m: MesAno | Linha) => m.ano * 12 + (m.mes - 1);

async function consultar(
  promessa: PromiseLike<{ data: any; error: { message: string } | null }>,
  origem: string
) {
  const { data, error } = await promessa;
  if (error) throw new Error(`Falha ao ler ${origem}: ${error.message}`);
  return (data ?? []) as Linha[];
}

export function criarRepositorioRetroativos(cliente: ClienteSupabase): RepositorioRetroativos {
  return {
    async empresasLiberadas() {
      const linhas = await consultar(
        cliente
          .from('empresas')
          .select('id')
          .eq('modelo_calculo', 'multiplo')
          .eq('status', 'ativo'),
        'empresas liberadas'
      );
      return linhas.map((e) => e.id);
    },

    async fechamentosVigentes(bancoIds, meses) {
      if (bancoIds.length === 0 || meses.length === 0) return [];
      const pedidos = new Set(meses.map(indice));
      const anos = meses.map((m) => m.ano);
      const linhas = await consultar(
        cliente
          .from('bancos_horas_fechamentos')
          .select('id, banco_id, mes, ano, motivo')
          .in('banco_id', bancoIds)
          .eq('vigente', true)
          .gte('ano', Math.min(...anos))
          .lte('ano', Math.max(...anos)),
        'fechamentos vigentes'
      );
      return linhas
        .filter((f) => pedidos.has(indice(f)))
        .map((f) => ({
          id: f.id,
          bancoId: f.banco_id,
          mes: { mes: f.mes, ano: f.ano },
          motivo: f.motivo,
        }));
    },

    async itensDoFechamento(fechamentoIds) {
      const itens: Linha[] = [];
      for (let i = 0; i < fechamentoIds.length; i += LOTE) {
        itens.push(
          ...(await consultar(
            cliente
              .from('bancos_horas_fechamento_itens')
              .select('fechamento_id, tipo, item_id, minutos, tickets')
              .in('fechamento_id', fechamentoIds.slice(i, i + LOTE))
              .in('tipo', ['apontamento', 'ticket']),
            'itens dos fechamentos'
          ))
        );
      }
      return itens.map((i) => ({
        fechamentoId: i.fechamento_id,
        tipo: i.tipo,
        itemId: i.item_id,
        minutos: i.minutos,
        tickets: i.tickets,
      }));
    },

    async registrar(payload) {
      const { error } = await cliente.rpc('bancos_horas_registrar_retroativo', {
        p_retroativo: payload,
      });
      if (error) throw new Error(`Falha ao registrar o retroativo: ${error.message}`);
    },
  };
}
