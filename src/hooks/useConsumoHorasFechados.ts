/**
 * Hook para buscar consumo de horas/tickets por empresa em períodos fechados.
 *
 * Estratégia:
 * - Empresas tipo 'banco_horas' ou 'ambos': calcula consumo real de apontamentos_aranda
 *   (aplica todos os filtros do bancoHorasIntegracaoService: cod_resolucao, caso_grupo,
 *    ativi_interna, item_configuracao, data_atividade, regra data_sistema ≤ data_atividade)
 * - Empresas tipo 'ticket': usa snapshot_consumo_tickets do fechamento (contagem de tickets)
 *   e exibe como "N tickets" na coluna de horas
 *
 * Isso garante que o relatório reflita os dados corretos independentemente do valor
 * que está salvo em banco_horas_calculos (que pode estar desatualizado).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ConsumoHorasEmpresa {
  empresa: string;
  consumo_horas: string;        // HH:MM para horas | "N tickets" para ticket
  consumo_horas_decimal: number; // horas decimais (0 para ticket)
  tipo_cobranca: string;
  fechado_em: string;
}

// ─── Constantes (mesmas do bancoHorasIntegracaoService) ───────────────────────

const CODIGOS_RESOLUCAO_VALIDOS = [
  'Alocação - T&M', 'Alocação T&M',
  'Alocação - T&M (Banco=S |SLA=N)', 'Alocação - T&M (Banco=S| SLA=N)',
  'AMS SAP', 'AMS SAP (Banco=S |SLA=S)', 'AMS SAP (Banco=S| SLA=S)',
  'Aplicação de Nota / Licença - Contratados', 'Aplicação de Nota / Licença (Banco=S |SLA=N)',
  'Consultoria', 'Consultoria (Banco=S |SLA=S)', 'Consultoria (Banco=S| SLA=S)',
  'Consultoria - Banco de Dados', 'Consultoria - Banco de Dados (Banco=S |SLA=S)', 'Consultoria - Banco de Dados (Banco=S| SLA=S)',
  'Consultoria - Nota Publicada', 'Consultoria - Nota Publicada (Banco=S |SLA=S)', 'Consultoria - Nota Publicada (Banco=S| SLA=S)',
  'Consultoria - Solução Paliativa', 'Consultoria - Solução Paliativa (Banco=S |SLA=S)', 'Consultoria - Solução Paliativa (Banco=S| SLA=S)',
  'Dúvida', 'Dúvida (Banco=S |SLA=N)',
  'Erro de classificação na abertura', 'Erro de classificação na abertura (Banco=S |SLA=N)', 'Erro de classificação na abertura (Banco=S| SLA=N)',
  'Erro de programa especifico (SEM SLA)', 'Erro de programa especifico (Banco=S |SLA=N)', 'Erro de programa especifico (Banco=S| SLA=N)',
  'Levantamento de Versão / Orçamento', 'Levantamento de Versão / Orçamento (Banco=S |SLA=N)', 'Levantamento de Versão /Orçamento (Banco=S |SLA=N)',
  'Monitoramento DBA', 'Monitoramento DBA (Banco=S |SLA=S)', 'Monitoramento DBA (Banco=S |SLA=N)',
  'Nota Publicada', 'Nota Publicada (Banco=S |SLA=N)', 'Nota Publicada (Banco=S| SLA=N)',
  'Parametrização / Cadastro', 'Parametrização / Cadastro (Banco=S |SLA=N)',
  'Parametrização / Funcionalidade', 'Parametrização / Funcionalidade (Banco=S |SLA=N)', 'Parametrização / Funcionalidade (Banco=S| SLA=N)',
  'Validação de Arquivo', 'Validação de Arquivo (Banco=S |SLA=N)', 'Validação de Arquivo (Banco=S| SLA=N)',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minutosParaHHMM(totalMinutos: number): string {
  const horas = Math.floor(totalMinutos / 60);
  const mins  = totalMinutos % 60;
  return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function tempoParaMinutos(tempoHoras: string | null, tempoMinutos: number | null): number {
  if (tempoHoras) {
    const match = tempoHoras.match(/^(\d+):(\d+)/);
    if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  return tempoMinutos ? Math.floor(tempoMinutos) : 0;
}

// ─── Cálculo real de horas (apontamentos_aranda) ──────────────────────────────

async function calcularConsumoHoras(
  nomeCompleto: string,
  mes: number,
  ano: number
): Promise<number> {
  const dataInicio = new Date(ano, mes - 1, 1).toISOString();
  const dataFim    = new Date(ano, mes, 0, 23, 59, 59, 999).toISOString();

  // Quebrando a chain para evitar "Type instantiation is excessively deep"
  let query = supabase
    .from('apontamentos_aranda' as any)
    .select('tempo_gasto_horas, tempo_gasto_minutos, data_atividade, data_sistema') as any;

  query = query
    .ilike('org_us_final', nomeCompleto)
    .eq('ativi_interna', 'Não')
    .neq('item_configuracao', '000000 - PROJETOS APL')
    .in('tipo_chamado', ['IM', 'RF', 'PM'])
    .or('caso_grupo.ilike.%AMS APL%,caso_grupo.ilike.%AMS - APL%,caso_grupo.ilike.%AMS - ATENDIMENTO%,caso_grupo.ilike.%AMS T&M%')
    .gte('data_atividade', dataInicio)
    .lte('data_atividade', dataFim)
    .in('cod_resolucao', CODIGOS_RESOLUCAO_VALIDOS)
    .limit(10000);

  const { data, error } = await query;

  if (error || !data) return 0;

  let totalMinutos = 0;
  for (const apt of data) {
    // Regra: descartar se data_sistema é posterior ao mês da data_atividade
    if (apt.data_atividade && apt.data_sistema) {
      const dAtiv = new Date(apt.data_atividade);
      const dSist = new Date(apt.data_sistema);
      const mesAtiv = dAtiv.getFullYear() * 12 + dAtiv.getMonth();
      const mesSist = dSist.getFullYear() * 12 + dSist.getMonth();
      if (mesSist > mesAtiv) continue;
    }
    totalMinutos += tempoParaMinutos(apt.tempo_gasto_horas, apt.tempo_gasto_minutos);
  }

  return totalMinutos;
}

// ─── Fetch principal ──────────────────────────────────────────────────────────

async function fetchConsumoHorasFechados(mes: number, ano: number): Promise<ConsumoHorasEmpresa[]> {
  // 1. Fechamentos do período
  const { data: fechamentos, error: errFechamentos } = await (supabase
    .from('banco_horas_fechamentos' as any)
    .select('empresa_id, mes, ano, fechado_em, snapshot_consumo_tickets')
    .eq('mes', mes)
    .eq('ano', ano) as any);

  if (errFechamentos) throw new Error(errFechamentos.message);
  if (!fechamentos || fechamentos.length === 0) return [];

  const empresaIds = fechamentos.map((f: any) => f.empresa_id);

  // 2. Dados das empresas (nome + tipo_cobranca + nome_completo)
  const { data: empresas, error: errEmpresas } = await (supabase
    .from('empresas_clientes')
    .select('id, nome_abreviado, nome_completo, tipo_cobranca')
    .in('id', empresaIds) as any);

  if (errEmpresas) throw new Error(errEmpresas.message);

  const empresaMap = new Map<string, { nome_abreviado: string; nome_completo: string; tipo_cobranca: string }>();
  (empresas ?? []).forEach((e: any) => {
    empresaMap.set(e.id, {
      nome_abreviado: e.nome_abreviado ?? '',
      nome_completo:  e.nome_completo  ?? '',
      tipo_cobranca:  e.tipo_cobranca  ?? 'banco_horas',
    });
  });

  const fechadoMap = new Map<string, { fechado_em: string; snapshot_consumo_tickets: number }>();
  (fechamentos ?? []).forEach((f: any) => {
    fechadoMap.set(f.empresa_id, {
      fechado_em: f.fechado_em,
      snapshot_consumo_tickets: f.snapshot_consumo_tickets ?? 0,
    });
  });

  // 3. Calcular consumo em paralelo (lotes de 10 para não sobrecarregar)
  const resultados: ConsumoHorasEmpresa[] = [];

  // Separar por tipo
  const idsHoras:   string[] = [];
  const idsTickets: string[] = [];

  empresaIds.forEach((id: string) => {
    const tipo = empresaMap.get(id)?.tipo_cobranca ?? 'banco_horas';
    if (tipo === 'ticket') {
      idsTickets.push(id);
    } else {
      idsHoras.push(id);
    }
  });

  // Empresas de ticket — usa snapshot do fechamento
  for (const id of idsTickets) {
    const empresa = empresaMap.get(id);
    const fechado = fechadoMap.get(id);
    const tickets = fechado?.snapshot_consumo_tickets ?? 0;
    resultados.push({
      empresa: empresa?.nome_abreviado ?? id,
      consumo_horas: `${tickets} tickets`,
      consumo_horas_decimal: 0,
      tipo_cobranca: 'ticket',
      fechado_em: fechado?.fechado_em ?? '',
    });
  }

  // Empresas de horas — calcula em tempo real em lotes
  const BATCH = 10;
  for (let i = 0; i < idsHoras.length; i += BATCH) {
    const lote = idsHoras.slice(i, i + BATCH);
    await Promise.all(
      lote.map(async (id) => {
        const empresa = empresaMap.get(id);
        const fechado = fechadoMap.get(id);
        const nomeCompleto = empresa?.nome_completo ?? '';

        const totalMinutos = await calcularConsumoHoras(nomeCompleto, mes, ano);
        const decimal = Math.round((totalMinutos / 60) * 100) / 100;

        resultados.push({
          empresa: empresa?.nome_abreviado ?? id,
          consumo_horas: minutosParaHHMM(totalMinutos),
          consumo_horas_decimal: decimal,
          tipo_cobranca: empresa?.tipo_cobranca ?? 'banco_horas',
          fechado_em: fechado?.fechado_em ?? '',
        });
      })
    );
  }

  // Ordenar alfabeticamente pelo nome da empresa
  return resultados.sort((a, b) =>
    a.empresa.localeCompare(b.empresa, 'pt-BR', { sensitivity: 'base' })
  );
}

export function useConsumoHorasFechados(mes: number, ano: number) {
  return useQuery({
    queryKey: ['consumo-horas-fechados-realtime', mes, ano],
    queryFn: () => fetchConsumoHorasFechados(mes, ano),
    staleTime: 10 * 60 * 1000, // 10 min — cálculo pesado, cache mais longo
    enabled: mes >= 1 && mes <= 12 && ano >= 2020,
  });
}
