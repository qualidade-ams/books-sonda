/**
 * Detecção de ajustes retroativos do banco de horas (quarentena).
 *
 * Port de `executarDeteccaoRecente` / `executarDeteccaoCompleta` de
 * src/services/bancoHorasQuarentenaService.ts (frontend) para rodar após a
 * sincronização de apontamentos, inclusive nas execuções agendadas.
 * A lógica precisa continuar idêntica à do frontend — ao mudar uma, mude a outra.
 *
 * Datas de período usam o relógio local do servidor (mesmo comportamento do
 * navegador, que roda em America/Sao_Paulo).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

interface FechamentoPeriodo {
  id: string;
  empresa_id: string;
  mes: number;
  ano: number;
  snapshot_consumo_horas: string | null;
  snapshot_consumo_tickets: number | null;
  apontamentos_ids: string[] | null;
  tickets_ids: string[] | null;
}

interface DeteccaoResult {
  temDiferenca: boolean;
  tipo: 'apontamento_horas' | 'apontamento_tickets';
  valorAnterior: string;
  valorNovo: string;
  diferenca: string;
  diferencaMinutos: number;
  novosApontamentos: any[];
  apontamentosRemovidos: any[];
}

const CODIGOS_RESOLUCAO_VALIDOS = [
  'Alocação', 'Alocação (Banco=S |SLA=N)', 'Alocação (Banco=S| SLA=N)',
  'Alocação - T&M', 'Alocação T&M',
  'Alocação - T&M Banco de Horas (Banco=S |SLA=N)', 'Alocação - T&M (Banco=S| SLA=N)',
  'AMS SAP', 'AMS SAP (Banco=S |SLA=S)', 'AMS SAP (Banco=S| SLA=S)',
  'Aplicação de Nota / Licença - Contratados',
  'Aplicação de Nota / Licença (Banco=S |SLA=N)',
  'Consultoria', 'Consultoria (Banco=S |SLA=S)', 'Consultoria (Banco=S| SLA=S)',
  'Consultoria - Banco de Dados',
  'Consultoria - Banco de Dados (Banco=S |SLA=S)', 'Consultoria - Banco de Dados (Banco=S| SLA=S)',
  'Consultoria - Nota Publicada',
  'Consultoria - Nota Publicada (Banco=S |SLA=S)', 'Consultoria - Nota Publicada (Banco=S| SLA=S)',
  'Consultoria - Solução Paliativa',
  'Consultoria - Solução Paliativa (Banco=S |SLA=S)', 'Consultoria - Solução Paliativa (Banco=S| SLA=S)',
  'Dúvida', 'Dúvida (Banco=S |SLA=N)',
  'Erro de classificação na abertura',
  'Erro de classificação na abertura (Banco=S |SLA=N)', 'Erro de classificação na abertura (Banco=S| SLA=N)',
  'Erro de programa especifico (SEM SLA)',
  'Erro de programa especifico (Banco=S |SLA=N)', 'Erro de programa especifico (Banco=S| SLA=N)',
  'Levantamento de Versão / Orçamento',
  'Levantamento de Versão / Orçamento (Banco=S |SLA=N)',
  'Levantamento de Versão /Orçamento (Banco=S |SLA=N)',
  'Monitoramento DBA', 'Monitoramento DBA (Banco=S |SLA=N)',
  'Nota Publicada', 'Nota Publicada (Banco=S |SLA=N)', 'Nota Publicada (Banco=S| SLA=N)',
  'Parametrização / Cadastro', 'Parametrização / Cadastro (Banco=S |SLA=N)',
  'Parametrização / Funcionalidade',
  'Parametrização / Funcionalidade (Banco=S |SLA=N)',
  'Parametrização / Funcionalidade (Banco=S| SLA=N)',
  'Validação de Arquivo',
  'Validação de Arquivo (Banco=S |SLA=N)', 'Validação de Arquivo (Banco=S| SLA=N)',
];

// Mesmas regras de src/utils/horasUtils.ts
function converterHorasParaMinutos(horasString: string): number {
  if (!horasString || horasString.trim() === '' || ['null', 'undefined', 'NaN'].includes(horasString)) return 0;
  const valor = horasString.trim();
  if (valor.includes(':')) {
    const isNegativo = valor.startsWith('-');
    const [horasStr, minutosStr] = valor.replace(/-/g, '').split(':');
    const horas = parseInt(horasStr);
    const minutos = parseInt(minutosStr);
    if (isNaN(horas) || isNaN(minutos)) return 0;
    const total = horas * 60 + minutos;
    return isNegativo ? -total : total;
  }
  const horasInteiras = parseInt(valor);
  return isNaN(horasInteiras) ? 0 : horasInteiras * 60;
}

function converterMinutosParaHoras(totalMinutos: number): string {
  const abs = Math.abs(totalMinutos);
  const formatado = `${Math.floor(abs / 60)}:${(abs % 60).toString().padStart(2, '0')}`;
  return totalMinutos < 0 ? `-${formatado}` : formatado;
}

/** Período de apuração da empresa (padrão: mês calendário; ou dia X até dia Y do mês seguinte) */
function periodoApuracao(empresa: any, mes: number, ano: number) {
  const diaInicioApuracao = empresa?.dia_inicio_apuracao ?? 1;
  const diaFimApuracao = empresa?.dia_fim_apuracao ?? 0;

  if (diaInicioApuracao > 1) {
    const mesSeguinte = mes === 12 ? 1 : mes + 1;
    const anoSeguinte = mes === 12 ? ano + 1 : ano;
    const diaFimReal = diaFimApuracao > 0 ? diaFimApuracao : diaInicioApuracao - 1;
    return {
      dataInicio: new Date(ano, mes - 1, diaInicioApuracao),
      dataFim: new Date(anoSeguinte, mesSeguinte - 1, diaFimReal, 23, 59, 59, 999),
    };
  }
  return {
    dataInicio: new Date(ano, mes - 1, 1),
    dataFim: new Date(ano, mes, 0, 23, 59, 59, 999),
  };
}

export function criarDeteccaoAjustesRetroativos(supabase: SupabaseClient) {
  const db = supabase as any;

  async function buscarFechamento(empresaId: string, mes: number, ano: number): Promise<FechamentoPeriodo | null> {
    const { data } = await db
      .from('banco_horas_fechamentos')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('mes', mes)
      .eq('ano', ano)
      .maybeSingle();
    return data as FechamentoPeriodo | null;
  }

  /** Extemporâneo = data_atividade no período, mas data_sistema em mês POSTERIOR */
  async function buscarIdsApontamentosExtemporaneos(empresaId: string, mes: number, ano: number): Promise<string[]> {
    try {
      const { data: empresa } = await db
        .from('empresas_clientes')
        .select('nome_completo, dia_inicio_apuracao, dia_fim_apuracao')
        .eq('id', empresaId)
        .single();

      if (!empresa?.nome_completo) return [];

      const { dataInicio, dataFim } = periodoApuracao(empresa, mes, ano);

      const { data: apontamentos } = await db
        .from('apontamentos_aranda')
        .select('id_externo, data_atividade, data_sistema')
        .eq('ativi_interna', 'Não')
        .neq('item_configuracao', '000000 - PROJETOS APL')
        .in('tipo_chamado', ['IM', 'RF', 'PM'])
        .or('caso_grupo.ilike.%AMS APL%,caso_grupo.ilike.%AMS - APL%,caso_grupo.ilike.%AMS - ATENDIMENTO%,caso_grupo.ilike.%AMS T&M%')
        .gte('data_atividade', dataInicio.toISOString())
        .lte('data_atividade', dataFim.toISOString())
        .in('cod_resolucao', CODIGOS_RESOLUCAO_VALIDOS)
        .ilike('org_us_final', empresa.nome_completo);

      if (!apontamentos) return [];

      return apontamentos
        .filter((a: any) => {
          if (!a.data_atividade || !a.data_sistema) return false;
          const dAtiv = new Date(a.data_atividade);
          const dSist = new Date(a.data_sistema);
          const mesAtiv = dAtiv.getFullYear() * 12 + dAtiv.getMonth();
          const mesSist = dSist.getFullYear() * 12 + dSist.getMonth();
          return mesSist > mesAtiv;
        })
        .map((a: any) => a.id_externo)
        .filter(Boolean);
    } catch (error) {
      console.error('❌ [RETROATIVOS] Erro ao buscar apontamentos extemporâneos:', (error as Error)?.message);
      return [];
    }
  }

  async function buscarIdsTickets(empresaId: string, mes: number, ano: number): Promise<string[]> {
    try {
      const { data: empresa } = await db
        .from('empresas_clientes')
        .select('nome_abreviado, nome_completo, dia_inicio_apuracao, dia_fim_apuracao')
        .eq('id', empresaId)
        .single();

      if (!empresa) return [];

      const { dataInicio, dataFim } = periodoApuracao(empresa, mes, ano);

      const { data: tickets } = await db
        .from('apontamentos_tickets_aranda')
        .select('nro_solicitacao')
        .gte('data_fechamento', dataInicio.toISOString())
        .lte('data_fechamento', dataFim.toISOString())
        .eq('status', 'Closed')
        .ilike('organizacao', empresa.nome_completo)
        .limit(5000);

      if (!tickets) return [];
      return tickets.map((t: any) => t.nro_solicitacao).filter(Boolean);
    } catch (error) {
      console.error('❌ [RETROATIVOS] Erro ao buscar tickets:', (error as Error)?.message);
      return [];
    }
  }

  async function detectarHoras(empresaId: string, mes: number, ano: number, fechamento: FechamentoPeriodo): Promise<DeteccaoResult | null> {
    const idsExtemporaneos = await buscarIdsApontamentosExtemporaneos(empresaId, mes, ano);
    const idsSnapshot = fechamento.apontamentos_ids || [];
    const novosIds = idsExtemporaneos.filter((id) => !idsSnapshot.includes(id));

    if (novosIds.length === 0) return null;

    const { data } = await db
      .from('apontamentos_aranda')
      .select('id_externo, nro_chamado, data_atividade, data_sistema, tempo_gasto_minutos, synced_at, analista_tarefa, caso_estado')
      .in('id_externo', novosIds);
    const novosApontamentos: any[] = data || [];

    const diferencaMinutos = novosApontamentos.reduce((acc, a) => acc + (a.tempo_gasto_minutos || 0), 0);
    const absMinutos = Math.abs(diferencaMinutos);
    const diferenca = `+${String(Math.floor(absMinutos / 60)).padStart(2, '0')}:${String(absMinutos % 60).padStart(2, '0')}`;

    const snapshotHoras = fechamento.snapshot_consumo_horas || '00:00';
    const valorNovo = converterMinutosParaHoras(converterHorasParaMinutos(snapshotHoras) + diferencaMinutos);

    return {
      temDiferenca: true,
      tipo: 'apontamento_horas',
      valorAnterior: snapshotHoras,
      valorNovo,
      diferenca,
      diferencaMinutos,
      novosApontamentos,
      apontamentosRemovidos: [],
    };
  }

  async function detectarTickets(empresaId: string, mes: number, ano: number, fechamento: FechamentoPeriodo): Promise<DeteccaoResult | null> {
    const idsAtuais = await buscarIdsTickets(empresaId, mes, ano);
    const idsSnapshot = fechamento.tickets_ids || [];

    const novosIds = idsAtuais.filter((id) => !idsSnapshot.includes(id));
    const removidosIds = idsSnapshot.filter((id) => !idsAtuais.includes(id));

    if (novosIds.length === 0 && removidosIds.length === 0) return null;

    const diferencaTickets = novosIds.length - removidosIds.length;
    const snapshotTickets = fechamento.snapshot_consumo_tickets || 0;

    return {
      temDiferenca: true,
      tipo: 'apontamento_tickets',
      valorAnterior: String(snapshotTickets),
      valorNovo: String(snapshotTickets + diferencaTickets),
      diferenca: `${diferencaTickets >= 0 ? '+' : ''}${diferencaTickets}`,
      diferencaMinutos: diferencaTickets,
      novosApontamentos: novosIds.map((id) => ({ nro_solicitacao: id })),
      apontamentosRemovidos: removidosIds.map((id) => ({ nro_solicitacao: id })),
    };
  }

  async function criarAjusteRetroativo(
    empresaId: string,
    fechamentoId: string,
    mes: number,
    ano: number,
    deteccao: DeteccaoResult
  ): Promise<any | null> {
    try {
      // Já resolvido (aprovado/descartado): não recriar como pendente
      const { data: jaResolvido } = await db
        .from('banco_horas_ajustes_retroativos')
        .select('id, status')
        .eq('empresa_id', empresaId)
        .eq('mes_referencia', mes)
        .eq('ano_referencia', ano)
        .eq('tipo_dado', deteccao.tipo)
        .in('status', ['aprovado', 'descartado'])
        .maybeSingle();

      if (jaResolvido) return null;

      const { data: existente } = await db
        .from('banco_horas_ajustes_retroativos')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('mes_referencia', mes)
        .eq('ano_referencia', ano)
        .eq('tipo_dado', deteccao.tipo)
        .eq('status', 'pendente')
        .maybeSingle();

      const detalhes = { novos: deteccao.novosApontamentos, removidos: deteccao.apontamentosRemovidos };

      if (existente) {
        const { data: atualizado, error } = await db
          .from('banco_horas_ajustes_retroativos')
          .update({
            valor_anterior: deteccao.valorAnterior,
            valor_novo: deteccao.valorNovo,
            diferenca: deteccao.diferenca,
            diferenca_minutos: deteccao.diferencaMinutos,
            detalhes_mudanca: detalhes,
            sync_id: null,
          })
          .eq('id', existente.id)
          .select()
          .single();

        if (error) {
          console.error('❌ [RETROATIVOS] Erro ao atualizar ajuste existente:', error.message);
          return null;
        }
        return atualizado;
      }

      const { data: novoAjuste, error } = await db
        .from('banco_horas_ajustes_retroativos')
        .insert({
          empresa_id: empresaId,
          fechamento_id: fechamentoId,
          mes_referencia: mes,
          ano_referencia: ano,
          tipo_dado: deteccao.tipo,
          valor_anterior: deteccao.valorAnterior,
          valor_novo: deteccao.valorNovo,
          diferenca: deteccao.diferenca,
          diferenca_minutos: deteccao.diferencaMinutos,
          detalhes_mudanca: detalhes,
          status: 'pendente',
          sync_id: null,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [RETROATIVOS] Erro ao criar ajuste retroativo:', error.message);
        return null;
      }
      return novoAjuste;
    } catch (error) {
      console.error('❌ [RETROATIVOS] Erro ao criar ajuste retroativo:', (error as Error)?.message);
      return null;
    }
  }

  async function executarDeteccaoCompleta(empresaId: string, mes: number, ano: number): Promise<any[]> {
    const fechamento = await buscarFechamento(empresaId, mes, ano);
    if (!fechamento) return [];

    const { data: empresa } = await db
      .from('empresas_clientes')
      .select('tipo_cobranca')
      .eq('id', empresaId)
      .single();

    const cobraPorTicket = (empresa?.tipo_cobranca || 'banco_horas') === 'ticket';

    const [resultHoras, resultTickets] = await Promise.all([
      detectarHoras(empresaId, mes, ano, fechamento),
      cobraPorTicket ? detectarTickets(empresaId, mes, ano, fechamento) : Promise.resolve(null),
    ]);

    const ajustes: any[] = [];
    for (const deteccao of [resultHoras, resultTickets]) {
      if (!deteccao?.temDiferenca) continue;
      const ajuste = await criarAjusteRetroativo(empresaId, fechamento.id, mes, ano, deteccao);
      if (ajuste) ajustes.push(ajuste);
    }
    return ajustes;
  }

  /** Detecção para os fechamentos dos últimos N meses (padrão 3), em lotes paralelos de 5 */
  async function executarDeteccaoRecente(mesesAtras: number = 3): Promise<any[]> {
    try {
      const hoje = new Date();
      const periodos: { mes: number; ano: number }[] = [];
      for (let i = 0; i < mesesAtras; i++) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        periodos.push({ mes: d.getMonth() + 1, ano: d.getFullYear() });
      }

      const orFilter = periodos.map((p) => `and(mes.eq.${p.mes},ano.eq.${p.ano})`).join(',');

      const { data: fechamentos, error } = await db
        .from('banco_horas_fechamentos')
        .select('empresa_id, mes, ano')
        .or(orFilter);

      if (error || !fechamentos || fechamentos.length === 0) return [];

      const BATCH_SIZE = 5;
      const todosAjustes: any[] = [];

      for (let i = 0; i < fechamentos.length; i += BATCH_SIZE) {
        const batch = fechamentos.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((f: any) => executarDeteccaoCompleta(f.empresa_id, f.mes, f.ano))
        );
        for (const result of results) {
          if (result.status === 'fulfilled') todosAjustes.push(...result.value);
          else console.warn('⚠️ [RETROATIVOS] Erro em detecção paralela:', (result.reason as Error)?.message);
        }
      }

      return todosAjustes;
    } catch (error) {
      console.error('❌ [RETROATIVOS] Erro na detecção recente:', (error as Error)?.message);
      return [];
    }
  }

  return { executarDeteccaoRecente };
}
