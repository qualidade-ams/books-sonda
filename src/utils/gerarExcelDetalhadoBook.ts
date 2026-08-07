/**
 * Utilitário para gerar arquivo Excel com detalhamento completo do book
 * Gera planilha com 8 abas obrigatórias:
 * - Abertos: Chamados abertos no período
 * - Fechados: Chamados fechados no período
 * - SLA: Dados de SLA (incidentes e violações)
 * - Backlog: Chamados em aberto (pendências)
 * - Horas: Consumo de horas (apontamentos detalhados)
 * - Pesquisas_Enviadas: Pesquisas enviadas no período
 * - Pesquisas_Respondidas: Pesquisas respondidas
 * - Enviadas_E_Não_Respondidas: Pesquisas sem resposta
 *
 * @module utils/gerarExcelDetalhadoBook
 */

import * as XLSX from 'xlsx-js-style';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// INTERFACES
// ============================================================================

interface TicketAranda {
  nro_solicitacao: string | null;
  cod_tipo: string | null;
  ticket_externo: string | null;
  numero_pai: string | null;
  organizacao: string | null;
  empresa: string | null;
  categoria: string | null;
  item_configuracao: string | null;
  status: string | null;
  nome_grupo: string | null;
  nome_responsavel: string | null;
  solicitante: string | null;
  data_abertura: string | null;
  data_solucao: string | null;
  data_fechamento: string | null;
  cod_resolucao: string | null;
  tds_cumprido: string | null;
  prioridade: string | null;
  resumo: string | null;
}

interface PesquisaSatisfacao {
  nro_caso: string | null;
  tipo_caso: string | null;
  empresa: string | null;
  grupo: string | null;
  cliente: string | null;
  prestador: string | null;
  solicitante: string | null;
  data_fechamento: string | null;
  data_resposta: string | null;
  resposta: string | null;
  comentario_pesquisa: string | null;
  categoria: string | null;
  servico: string | null;
  pergunta: string | null;
  descricao: string | null;
}

interface ApontamentoHoras {
  nro_chamado: string | null;
  cod_resolucao: string | null;
  org_us_final: string | null;
  item_configuracao: string | null;
  categoria: string | null;
  caso_estado: string | null;
  nro_tarefa: string | null;
  tipo_chamado: string | null;
  data_sistema: string | null;
  data_atividade: string | null;
  data_abertura: string | null;
  data_fechamento: string | null;
  analista_tarefa: string | null;
  analista_caso: string | null;
  solicitante: string | null;
  tempo_gasto_horas: string | null;
  tempo_gasto_minutos: number | null;
  ativi_interna: string | null;
  grupo_tarefa: string | null;
  descricao_tarefa: string | null;
}

interface ExcelDetalhadoBookParams {
  empresaId: string;
  empresaNome: string;
  mes: number;
  ano: number;
  diaInicioApuracao?: number;
  diaFimApuracao?: number;
  tipoContrato?: 'horas' | 'tickets' | 'ambos';
}

// ============================================================================
// UTILIDADES
// ============================================================================

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/** Estilo padrão para headers (azul Sonda com texto branco) */
const HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  fill: { fgColor: { rgb: '2563EB' } },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
};

/** Estilo para mensagem de "sem dados" */
const MSG_STYLE = {
  font: { bold: true, sz: 12, color: { rgb: '6B7280' } },
  alignment: { horizontal: 'left' as const, vertical: 'center' as const },
};

/** Formata data ISO para DD/MM/YYYY */
function formatarData(dataISO: string | null): string {
  if (!dataISO) return '';
  try {
    const data = new Date(dataISO);
    if (isNaN(data.getTime())) return '';
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  } catch {
    return '';
  }
}

/**
 * Trunca texto para o limite máximo de caracteres do Excel (.xlsx = 32767).
 * Campos como "resumo", "descricao_tarefa" e "comentario_pesquisa" podem vir
 * do banco com tamanho arbitrário e precisam ser truncados antes do write.
 */
const EXCEL_MAX_CHARS = 32767;
function truncarTexto(valor: string | null | undefined, limite = EXCEL_MAX_CHARS): string {
  if (!valor) return '';
  if (valor.length <= limite) return valor;
  return valor.substring(0, limite - 3) + '...';
}

/** Converte tempo para valor numérico nativo do Excel (fração de dia) */
function horasParaExcelNumerico(tempoHoras: string | null, tempoMinutos: number | null): number {
  if (tempoHoras) {
    const partes = tempoHoras.split(':');
    if (partes.length >= 2) {
      const h = parseInt(partes[0]) || 0;
      const m = parseInt(partes[1]) || 0;
      return (h * 60 + m) / (24 * 60);
    }
  }
  if (tempoMinutos != null && tempoMinutos > 0) {
    return tempoMinutos / (24 * 60);
  }
  return 0;
}

/** Aplica header style a todas as colunas de um sheet */
function aplicarHeaderStyle(sheet: XLSX.WorkSheet, numCols: number): void {
  for (let col = 0; col < numCols; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (sheet[cellRef]) {
      sheet[cellRef].s = HEADER_STYLE;
    }
  }
}

/** Cria uma sheet com mensagem de "sem dados" */
function criarSheetSemDados(headers: string[], mesNome: string, ano: number): XLSX.WorkSheet {
  const msgRow = [`Não houve registros no período de ${mesNome}/${ano}.`];
  const sheetData = [headers, [], msgRow];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  aplicarHeaderStyle(sheet, headers.length);

  // Estilo na mensagem
  const msgCellRef = XLSX.utils.encode_cell({ r: 2, c: 0 });
  if (sheet[msgCellRef]) {
    sheet[msgCellRef].s = MSG_STYLE;
  }

  // Merge da célula da mensagem para ocupar todas as colunas
  sheet['!merges'] = [{ s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } }];

  return sheet;
}

// ============================================================================
// BUSCA DE DADOS
// ============================================================================

/** Calcula período de datas baseado na periodicidade da empresa */
function calcularPeriodo(mes: number, ano: number, diaInicioApuracao: number, diaFimApuracao: number) {
  let dataInicioStr: string;
  let dataFimStr: string;

  if (diaInicioApuracao > 1) {
    const mesSeguinte = mes === 12 ? 1 : mes + 1;
    const anoSeguinte = mes === 12 ? ano + 1 : ano;
    const mesStr = String(mes).padStart(2, '0');
    const mesSeguinteStr = String(mesSeguinte).padStart(2, '0');
    const diaFimReal = diaFimApuracao > 0 ? diaFimApuracao : diaInicioApuracao - 1;
    dataInicioStr = `${ano}-${mesStr}-${String(diaInicioApuracao).padStart(2, '0')}T00:00:00.000Z`;
    dataFimStr = `${anoSeguinte}-${mesSeguinteStr}-${String(diaFimReal).padStart(2, '0')}T23:59:59.999Z`;
  } else {
    const mesStr = String(mes).padStart(2, '0');
    const ultimoDia = new Date(ano, mes, 0).getDate();
    dataInicioStr = `${ano}-${mesStr}-01T00:00:00.000Z`;
    dataFimStr = `${ano}-${mesStr}-${String(ultimoDia).padStart(2, '0')}T23:59:59.999Z`;
  }

  return { dataInicio: new Date(dataInicioStr), dataFim: new Date(dataFimStr) };
}

/** Busca tickets abertos no período (exclui Cancelled) */
async function buscarTicketsAbertos(nomeCompleto: string, dataInicio: Date, dataFim: Date): Promise<TicketAranda[]> {
  const { data, error } = await supabase
    .from('apontamentos_tickets_aranda')
    .select('nro_solicitacao, cod_tipo, ticket_externo, numero_pai, organizacao, empresa, categoria, item_configuracao, status, nome_grupo, nome_responsavel, solicitante, data_abertura, data_solucao, data_fechamento, cod_resolucao, tds_cumprido, prioridade, resumo')
    .ilike('organizacao', nomeCompleto) // match exato case-insensitive (sem %) para evitar capturar organizações com nome similar
    .gte('data_abertura', dataInicio.toISOString())
    .lte('data_abertura', dataFim.toISOString())
    .neq('cod_tipo', 'Problema')
    .neq('status', 'Cancelled')
    .or('item_configuracao.is.null,item_configuracao.neq.000000 - PROJETOS APL')
    .eq('caso_pai', 'SIM')
    .not('nome_grupo', 'in', '("AMS APL - TÉCNICO","CA SDM","PROJETOS APL - PLSQL")')
    .order('data_abertura', { ascending: true })
    .limit(10000);

  if (error) {
    console.error('❌ Erro ao buscar tickets abertos para Excel:', error);
    return [];
  }
  return (data || []) as unknown as TicketAranda[];
}

/** Busca tickets fechados no período (exclui Cancelled) */
async function buscarTicketsFechados(nomeCompleto: string, dataInicio: Date, dataFim: Date): Promise<TicketAranda[]> {
  const proximoMesInicio = new Date(dataFim);
  proximoMesInicio.setDate(proximoMesInicio.getDate() + 1);
  proximoMesInicio.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('apontamentos_tickets_aranda')
    .select('nro_solicitacao, cod_tipo, ticket_externo, numero_pai, organizacao, empresa, categoria, item_configuracao, status, nome_grupo, nome_responsavel, solicitante, data_abertura, data_solucao, data_fechamento, cod_resolucao, tds_cumprido, prioridade, resumo')
    .ilike('organizacao', nomeCompleto) // match exato case-insensitive (sem %) para evitar capturar organizações com nome similar
    .gte('data_solucao', dataInicio.toISOString())
    .lt('data_solucao', proximoMesInicio.toISOString())
    .neq('cod_tipo', 'Problema')
    .neq('status', 'Cancelled')
    .or('item_configuracao.is.null,item_configuracao.neq.000000 - PROJETOS APL')
    .eq('caso_pai', 'SIM')
    .not('nome_grupo', 'in', '("AMS APL - TÉCNICO","CA SDM","PROJETOS APL - PLSQL")')
    .order('data_solucao', { ascending: true })
    .limit(10000);

  if (error) {
    console.error('❌ Erro ao buscar tickets fechados para Excel:', error);
    return [];
  }
  return (data || []) as unknown as TicketAranda[];
}

/** Busca tickets em backlog (abertos até o período, não fechados, exclui Cancelled) */
async function buscarTicketsBacklog(nomeCompleto: string, dataFim: Date): Promise<TicketAranda[]> {
  const { data, error } = await supabase
    .from('apontamentos_tickets_aranda')
    .select('nro_solicitacao, cod_tipo, ticket_externo, numero_pai, organizacao, empresa, categoria, item_configuracao, status, nome_grupo, nome_responsavel, solicitante, data_abertura, data_solucao, data_fechamento, cod_resolucao, tds_cumprido, prioridade, resumo')
    .ilike('organizacao', nomeCompleto) // match exato case-insensitive (sem %) para evitar capturar organizações com nome similar
    .lte('data_abertura', dataFim.toISOString())
    .not('status', 'in', '("Closed","Resolved","Canceled","Cancelled")')
    .neq('cod_tipo', 'Problema')
    .or('item_configuracao.is.null,item_configuracao.neq.000000 - PROJETOS APL')
    .eq('caso_pai', 'SIM')
    .not('nome_grupo', 'in', '("AMS APL - TÉCNICO","CA SDM","PROJETOS APL - PLSQL")')
    .order('data_abertura', { ascending: true })
    .limit(10000);

  if (error) {
    console.error('❌ Erro ao buscar tickets backlog para Excel:', error);
    return [];
  }
  return (data || []) as unknown as TicketAranda[];
}

/**
 * Códigos de resolução elegíveis para a aba SLA do detalhamento.
 * Apenas incidentes com estes códigos são incluídos no relatório SLA.
 */
const COD_RESOLUCAO_SLA = [
  'Consultoria',
  'Consultoria (Banco=S |SLA=S)',
  'Consultoria (Banco=S| SLA=S)',
  'Consultoria - Banco de Dados',
  'Consultoria - Banco de Dados (Banco=S |SLA=S)',
  'Consultoria - Banco de Dados (Banco=S| SLA=S)',
  'Consultoria - Nota Publicada',
  'Consultoria - Nota Publicada (Banco=S |SLA=S)',
  'Consultoria - Nota Publicada (Banco=S| SLA=S)',
  'Consultoria - Solução Paliativa',
  'Consultoria - Solução Paliativa (Banco=S |SLA=S)',
  'Consultoria - Solução Paliativa (Banco=S| SLA=S)',
];

/** Busca incidentes violados para SLA (exclui Cancelled, retorna apenas TDS Vencido com cod_resolucao elegível) */
async function buscarTicketsSLA(nomeCompleto: string, dataInicio: Date, dataFim: Date): Promise<TicketAranda[]> {
  const proximoMesInicio = new Date(dataFim);
  proximoMesInicio.setDate(proximoMesInicio.getDate() + 1);
  proximoMesInicio.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('apontamentos_tickets_aranda')
    .select('nro_solicitacao, cod_tipo, ticket_externo, numero_pai, organizacao, empresa, categoria, item_configuracao, status, nome_grupo, nome_responsavel, solicitante, data_abertura, data_solucao, data_fechamento, cod_resolucao, tds_cumprido, prioridade, resumo')
    .ilike('organizacao', nomeCompleto) // match exato case-insensitive (sem %) para evitar capturar organizações com nome similar
    .gte('data_solucao', dataInicio.toISOString())
    .lt('data_solucao', proximoMesInicio.toISOString())
    .eq('cod_tipo', 'Incidente')
    .neq('status', 'Cancelled')
    .eq('tds_cumprido', 'TDS Vencido')
    .in('cod_resolucao', COD_RESOLUCAO_SLA)
    .or('item_configuracao.is.null,item_configuracao.neq.000000 - PROJETOS APL')
    .eq('caso_pai', 'SIM')
    .not('nome_grupo', 'in', '("AMS APL - TÉCNICO","CA SDM","PROJETOS APL - PLSQL")')
    .order('data_solucao', { ascending: true })
    .limit(10000);

  if (error) {
    console.error('❌ Erro ao buscar tickets SLA para Excel:', error);
    return [];
  }
  return (data || []) as unknown as TicketAranda[];
}

/** Busca pesquisas de satisfação do período */
async function buscarPesquisas(nomeCompleto: string, mes: number, ano: number): Promise<PesquisaSatisfacao[]> {
  const dataInicio = new Date(ano, mes - 1, 1);
  const dataFim = new Date(ano, mes, 0, 23, 59, 59, 999);

  console.log('🔍 Buscando pesquisas para Excel:', {
    empresa: nomeCompleto,
    periodo: `${mes}/${ano}`,
    dataInicio: dataInicio.toISOString(),
    dataFim: dataFim.toISOString()
  });

  const { data, error } = await supabase
    .from('pesquisas_satisfacao')
    .select('nro_caso, tipo_caso, empresa, grupo, cliente, prestador, solicitante, data_fechamento, data_resposta, resposta, comentario_pesquisa, categoria, servico, pergunta, descricao')
    .ilike('empresa', nomeCompleto) // match exato case-insensitive (sem %) para evitar capturar organizações com nome similar
    .gte('data_fechamento', dataInicio.toISOString())
    .lte('data_fechamento', dataFim.toISOString())
    .not('grupo', 'in', '("AMS APL - TÉCNICO","CA SDM","PROJETOS APL - PLSQL")')
    .neq('tipo_caso', 'PM')
    .order('data_fechamento', { ascending: true })
    .limit(10000);

  if (error) {
    console.error('❌ Erro ao buscar pesquisas para Excel:', error);
    return [];
  }

  console.log(`✅ Pesquisas encontradas para Excel: ${data?.length || 0} registros`);
  return (data || []) as unknown as PesquisaSatisfacao[];
}

/** Busca apontamentos de horas (consumo) - mesma lógica do gerarExcelConsumoHoras */
async function buscarApontamentosHoras(
  nomeCompleto: string,
  dataInicio: Date,
  dataFim: Date,
  empresaId?: string,
  mes?: number,
  ano?: number
): Promise<ApontamentoHoras[]> {
  const codigosResolucaoValidos = [
    'Alocação',
    'Alocação (Banco=S |SLA=N)',
    'Alocação (Banco=S| SLA=N)',
    'Alocação - T&M', 'Alocação T&M',
    'Alocação - T&M (Banco=S |SLA=N)', 'Alocação - T&M (Banco=S| SLA=N)',
    'AMS SAP', 'AMS SAP (Banco=S |SLA=S)', 'AMS SAP (Banco=S| SLA=S)',
    'Aplicação de Nota / Licença - Contratados', 'Aplicação de Nota / Licença (Banco=S |SLA=N)',
    'Consultoria', 'Consultoria (Banco=S| SLA=S)', 'Consultoria (Banco=S |SLA=S)',
    'Consultoria - Banco de Dados', 'Consultoria - Banco de Dados (Banco=S |SLA=S)', 'Consultoria - Banco de Dados (Banco=S| SLA=S)',
    'Consultoria - Nota Publicada', 'Consultoria - Nota Publicada (Banco=S |SLA=S)', 'Consultoria - Nota Publicada (Banco=S| SLA=S)',
    'Consultoria - Solução Paliativa', 'Consultoria - Solução Paliativa (Banco=S |SLA=S)', 'Consultoria - Solução Paliativa (Banco=S| SLA=S)',
    'Dúvida', 'Dúvida (Banco=S |SLA=N)',
    'Erro de classificação na abertura', 'Erro de classificação na abertura (Banco=S |SLA=N)', 'Erro de classificação na abertura (Banco=S| SLA=N)',
    'Erro de programa especifico (SEM SLA)', 'Erro de programa especifico (Banco=S |SLA=N)', 'Erro de programa especifico (Banco=S| SLA=N)',
    'Levantamento de Versão / Orçamento', 'Levantamento de Versão / Orçamento (Banco=S |SLA=N)', 'Levantamento de Versão /Orçamento (Banco=S |SLA=N)',
    'Monitoramento DBA', 'Monitoramento DBA (Banco=S |SLA=N)',
    'Nota Publicada', 'Nota Publicada (Banco=S |SLA=N)', 'Nota Publicada (Banco=S| SLA=N)',
    'Parametrização / Cadastro', 'Parametrização / Cadastro (Banco=S |SLA=N)',
    'Parametrização / Funcionalidade', 'Parametrização / Funcionalidade (Banco=S |SLA=N)', 'Parametrização / Funcionalidade (Banco=S| SLA=N)',
    'Validação de Arquivo', 'Validação de Arquivo (Banco=S |SLA=N)', 'Validação de Arquivo (Banco=S| SLA=N)'
  ];

  const { data: apontamentos, error } = await supabase
    .from('apontamentos_aranda' as any)
    .select('nro_chamado, cod_resolucao, org_us_final, item_configuracao, categoria, caso_estado, nro_tarefa, tipo_chamado, data_sistema, data_atividade, data_abertura, data_fechamento, analista_tarefa, analista_caso, solicitante, tempo_gasto_horas, tempo_gasto_minutos, ativi_interna, grupo_tarefa, descricao_tarefa')
    .eq('ativi_interna', 'Não')
    .neq('item_configuracao', '000000 - PROJETOS APL')
    .in('tipo_chamado', ['IM', 'RF', 'PM'])
    .or('caso_grupo.ilike.%AMS APL%,caso_grupo.ilike.%AMS - APL%,caso_grupo.ilike.%AMS - ATENDIMENTO%,caso_grupo.ilike.%AMS T&M%')
    .gte('data_atividade', dataInicio.toISOString())
    .lte('data_atividade', dataFim.toISOString())
    .ilike('org_us_final', nomeCompleto) // match exato case-insensitive (sem %) para evitar capturar organizações com nome similar
    .order('data_atividade', { ascending: true })
    .limit(10000);

  if (error) {
    console.error('❌ Erro ao buscar apontamentos horas para Excel:', error);
    return [];
  }

  // Filtrar por códigos de resolução válidos
  const comCodigo = (apontamentos || []).filter((apt: any) =>
    apt.cod_resolucao && codigosResolucaoValidos.includes(apt.cod_resolucao)
  );

  // Todos os apontamentos com código válido são incluídos no detalhamento.
  // A detecção de extemporâneos (retroativos pós-fechamento) é feita separadamente
  // pelo bancoHorasQuarentenaService ao comparar synced_at > fechado_em.
  // A regra de data_sistema > data_atividade NÃO se aplica aqui.

  return comCodigo as unknown as ApontamentoHoras[];
}

/** Interface para tickets de consumo (contrato tipo ticket) */
interface TicketConsumo {
  nro_solicitacao: string | null;
  cod_tipo: string | null;
  cod_resolucao: string | null;
  categoria: string | null;
  status: string | null;
  nome_grupo: string | null;
  data_abertura: string | null;
  data_fechamento: string | null;
  nome_responsavel: string | null;
  solicitante: string | null;
  cliente: string | null;
  organizacao: string | null;
}

/** Busca tickets de consumo para empresas com contrato tipo ticket */
async function buscarTicketsConsumo(nomeCompleto: string, mes: number, ano: number): Promise<TicketConsumo[]> {
  const codigosResolucaoValidos = [
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
    'Monitoramento DBA', 'Monitoramento DBA (Banco=S |SLA=N)',
    'Nota Publicada', 'Nota Publicada (Banco=S |SLA=N)', 'Nota Publicada (Banco=S| SLA=N)',
    'Parametrização / Cadastro', 'Parametrização / Cadastro (Banco=S |SLA=N)',
    'Parametrização / Funcionalidade', 'Parametrização / Funcionalidade (Banco=S |SLA=S)', 'Parametrização / Funcionalidade (Banco=S |SLA=N)', 'Parametrização / Funcionalidade (Banco=S| SLA=N)',
    'Validação de Arquivo', 'Validação de Arquivo (Banco=S |SLA=N)', 'Validação de Arquivo (Banco=S| SLA=N)',
  ];

  // Calcular primeiro e último dia do mês
  const mesStr = String(mes).padStart(2, '0');
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dataInicioStr = `${ano}-${mesStr}-01T00:00:00.000Z`;
  const dataFimStr = `${ano}-${mesStr}-${String(ultimoDia).padStart(2, '0')}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('apontamentos_tickets_aranda')
    .select('nro_solicitacao, cod_tipo, cod_resolucao, categoria, status, nome_grupo, data_abertura, data_fechamento, nome_responsavel, solicitante, cliente, organizacao')
    .ilike('organizacao', nomeCompleto) // match exato case-insensitive (sem %) para evitar capturar organizações com nome similar
    .or('nome_grupo.ilike.%AMS APL%,nome_grupo.ilike.%AMS - APL%,nome_grupo.ilike.%AMS - ATENDIMENTO%,nome_grupo.ilike.%AMS T&M%')
    .eq('status', 'Closed')
    .neq('item_configuracao', '000000 - PROJETOS APL')
    .gte('data_fechamento', dataInicioStr)
    .lte('data_fechamento', dataFimStr)
    .in('cod_resolucao', codigosResolucaoValidos)
    .order('nro_solicitacao', { ascending: true })
    .limit(10000);

  if (error) {
    console.error('❌ Erro ao buscar tickets de consumo para Excel:', error);
    return [];
  }

  return (data || []) as unknown as TicketConsumo[];
}

// ============================================================================
// GERAÇÃO DAS ABAS
// ============================================================================

/** Headers padrão para abas de tickets (Abertos, Fechados, SLA, Backlog) */
const TICKET_HEADERS = [
  'TIPO', 'CHAMADO', 'SOLICITANTE', 'CATEGORIA',
  'GRUPO DE SOLUÇÃO', 'RESPONSÁVEL', 'CÓDIGO RESOLUÇÃO',
  'ESTADO', 'DATA ABERTURA', 'DATA SOLUÇÃO',
  'TICKET EXTERNO', 'NÚMERO PAI', 'STATUS TDS',
  'VIOLADO', 'DESCRIÇÃO',
];

/** Larguras para colunas de tickets */
const TICKET_COL_WIDTHS = [
  { width: 12 }, { width: 12 }, { width: 25 }, { width: 30 },
  { width: 25 }, { width: 25 }, { width: 35 },
  { width: 12 }, { width: 14 }, { width: 14 },
  { width: 14 }, { width: 14 }, { width: 14 },
  { width: 10 }, { width: 60 },
];

/** Converte ticket em linha para Excel */
function ticketParaRow(t: TicketAranda): any[] {
  // Limpar cod_resolucao removendo parênteses e seu conteúdo
  const codResolucaoLimpo = t.cod_resolucao
    ? t.cod_resolucao.replace(/\s*\(.*\)$/, '').trim()
    : '';

  return [
    t.cod_tipo || '',
    t.nro_solicitacao || '',
    t.solicitante || '',
    t.categoria || '',
    t.nome_grupo || '',
    t.nome_responsavel || '',
    codResolucaoLimpo,
    t.status || '',
    formatarData(t.data_abertura),
    formatarData(t.data_solucao),
    t.ticket_externo || '',
    t.numero_pai || '',
    t.tds_cumprido || '',
    t.tds_cumprido === 'TDS Vencido' ? 'SIM' : 'NÃO',
    truncarTexto(t.resumo),
  ];
}

/** Cria sheet de tickets (usado para Abertos, Fechados, SLA, Backlog) */
function criarSheetTickets(tickets: TicketAranda[], mesNome: string, ano: number): XLSX.WorkSheet {
  if (tickets.length === 0) {
    const sheet = criarSheetSemDados(TICKET_HEADERS, mesNome, ano);
    sheet['!cols'] = TICKET_COL_WIDTHS;
    return sheet;
  }

  // Ordenar por número de chamado (menor para maior)
  const ticketsOrdenados = [...tickets].sort((a, b) => {
    const numA = parseInt(a.nro_solicitacao || '0', 10) || 0;
    const numB = parseInt(b.nro_solicitacao || '0', 10) || 0;
    return numA - numB;
  });

  const rows = ticketsOrdenados.map(ticketParaRow);
  const sheetData = [TICKET_HEADERS, ...rows];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  aplicarHeaderStyle(sheet, TICKET_HEADERS.length);
  sheet['!cols'] = TICKET_COL_WIDTHS;
  return sheet;
}

/** Cria sheet de SLA (mesmo layout das outras abas de tickets) */
function criarSheetSLA(tickets: TicketAranda[], mesNome: string, ano: number): XLSX.WorkSheet {
  return criarSheetTickets(tickets, mesNome, ano);
}

/** Traduz código de tipo de chamado para nome legível */
function traduzirTipoChamado(tipo: string | null): string {
  if (!tipo) return '';
  switch (tipo.toUpperCase()) {
    case 'IM': return 'Incidente';
    case 'RF': return 'Solicitação';
    case 'PM': return 'Problema';
    default: return tipo;
  }
}

/** Cria sheet de Horas (Consumo) */
function criarSheetHoras(apontamentos: ApontamentoHoras[], mesNome: string, ano: number): XLSX.WorkSheet {
  const HORAS_HEADERS = [
    'TIPO', 'CHAMADO', 'TAREFA', 'SOLICITANTE',
    'CATEGORIA', 'GRUPO DE SOLUÇÃO', 'ANALISTA', 'RESPONSÁVEL PELO CHAMADO',
    'CÓDIGO RESOLUÇÃO', 'ESTADO', 'DATA SISTEMA', 'DATA ATIVIDADE',
    'DATA ABERTURA', 'DATA SOLUÇÃO', 'HORAS', 'TEMPO (MINUTOS)',
    'DESCRIÇÃO TAREFA',
  ];

  const HORAS_COL_WIDTHS = [
    { width: 14 }, { width: 12 }, { width: 14 }, { width: 25 },
    { width: 30 }, { width: 25 }, { width: 30 }, { width: 30 },
    { width: 35 }, { width: 10 }, { width: 14 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 10 }, { width: 16 },
    { width: 60 },
  ];

  if (apontamentos.length === 0) {
    const sheet = criarSheetSemDados(HORAS_HEADERS, mesNome, ano);
    sheet['!cols'] = HORAS_COL_WIDTHS;
    return sheet;
  }

  // Ordenar por número de chamado (menor para maior)
  const apontamentosOrdenados = [...apontamentos].sort((a, b) => {
    const numA = parseInt(a.nro_chamado || '0', 10) || 0;
    const numB = parseInt(b.nro_chamado || '0', 10) || 0;
    return numA - numB;
  });

  const rows = apontamentosOrdenados.map(apt => [
    traduzirTipoChamado(apt.tipo_chamado),
    apt.nro_chamado || '',
    apt.nro_tarefa || '',
    apt.solicitante || '',
    apt.categoria || '',
    apt.grupo_tarefa || '',
    apt.analista_tarefa || '',
    apt.analista_caso || apt.analista_tarefa || '',
    apt.cod_resolucao ? apt.cod_resolucao.replace(/\s*\(.*\)$/, '').trim() : '',
    apt.caso_estado || '',
    formatarData(apt.data_sistema),
    formatarData(apt.data_atividade),
    formatarData(apt.data_abertura),
    formatarData(apt.data_fechamento),
    horasParaExcelNumerico(apt.tempo_gasto_horas, apt.tempo_gasto_minutos),
    apt.tempo_gasto_minutos || 0,
    truncarTexto(apt.descricao_tarefa),
  ]);

  // Calcular total de horas
  let totalMinutos = 0;
  apontamentosOrdenados.forEach(apt => {
    if (apt.tempo_gasto_horas) {
      const partes = apt.tempo_gasto_horas.split(':');
      if (partes.length >= 2) {
        totalMinutos += parseInt(partes[0]) * 60 + parseInt(partes[1]);
      }
    } else if (apt.tempo_gasto_minutos) {
      totalMinutos += apt.tempo_gasto_minutos;
    }
  });
  const totalExcelNumerico = totalMinutos / (24 * 60);

  // Linha de total
  const linhaTotal = Array(HORAS_HEADERS.length).fill('');
  const colHoras = HORAS_HEADERS.indexOf('HORAS');
  linhaTotal[colHoras - 1] = 'Total de Horas:';
  linhaTotal[colHoras] = totalExcelNumerico;

  const sheetData = [HORAS_HEADERS, ...rows, [], linhaTotal];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  aplicarHeaderStyle(sheet, HORAS_HEADERS.length);
  sheet['!cols'] = HORAS_COL_WIDTHS;

  // Formatar coluna HORAS com [h]:mm:ss
  const timeStyle = { numFmt: '[h]:mm:ss', alignment: { horizontal: 'center' as const } };
  for (let r = 1; r <= apontamentosOrdenados.length; r++) {
    const cellRef = XLSX.utils.encode_cell({ r, c: colHoras });
    if (sheet[cellRef]) {
      sheet[cellRef].t = 'n';
      sheet[cellRef].s = timeStyle;
    }
  }

  // Formatar célula do total
  const rowTotal = apontamentosOrdenados.length + 2;
  const cellRefTotal = XLSX.utils.encode_cell({ r: rowTotal, c: colHoras });
  if (!sheet[cellRefTotal]) {
    sheet[cellRefTotal] = { t: 'n', v: totalExcelNumerico };
  }
  sheet[cellRefTotal].t = 'n';
  sheet[cellRefTotal].v = totalExcelNumerico;
  sheet[cellRefTotal].s = { numFmt: '[h]:mm:ss', font: { bold: true }, alignment: { horizontal: 'center' as const } };

  return sheet;
}

/** Cria sheet de Tickets (consumo por ticket - empresas com contrato tipo ticket) */
function criarSheetTicketsConsumo(tickets: TicketConsumo[], mesNome: string, ano: number): XLSX.WorkSheet {
  const TICKETS_HEADERS = [
    'TIPO', 'CHAMADO', 'SOLICITANTE', 'CLIENTE',
    'CATEGORIA', 'GRUPO SOLUÇÃO', 'ANALISTA', 'RESPONSÁVEL PELO CHAMADO',
    'CÓDIGO RESOLUÇÃO', 'ESTADO', 'DATA ABERTURA', 'DATA FECHAMENTO',
  ];

  const TICKETS_COL_WIDTHS = [
    { width: 14 }, { width: 12 }, { width: 25 }, { width: 25 },
    { width: 30 }, { width: 25 }, { width: 25 }, { width: 30 },
    { width: 35 }, { width: 12 }, { width: 14 }, { width: 14 },
  ];

  if (tickets.length === 0) {
    const sheet = criarSheetSemDados(TICKETS_HEADERS, mesNome, ano);
    sheet['!cols'] = TICKETS_COL_WIDTHS;
    return sheet;
  }

  // Ordenar por número de chamado (menor para maior)
  const ticketsOrdenados = [...tickets].sort((a, b) => {
    const numA = parseInt(a.nro_solicitacao || '0', 10) || 0;
    const numB = parseInt(b.nro_solicitacao || '0', 10) || 0;
    return numA - numB;
  });

  const rows = ticketsOrdenados.map(t => [
    traduzirTipoChamado(t.cod_tipo),
    t.nro_solicitacao || '',
    t.solicitante || '',
    t.cliente || '',
    t.categoria || '',
    t.nome_grupo || '',
    t.nome_responsavel || '',
    t.nome_responsavel || '',
    t.cod_resolucao ? t.cod_resolucao.replace(/\s*\(.*\)$/, '').trim() : '',
    t.status || '',
    formatarData(t.data_abertura),
    formatarData(t.data_fechamento),
  ]);

  const sheetData = [TICKETS_HEADERS, ...rows];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  aplicarHeaderStyle(sheet, TICKETS_HEADERS.length);
  sheet['!cols'] = TICKETS_COL_WIDTHS;
  return sheet;
}

/** Cria sheet de Pesquisas Enviadas (sem DATA RESPOSTA, COMENTÁRIO DA PERGUNTA, RESPOSTA) */
function criarSheetPesquisasEnviadas(pesquisas: PesquisaSatisfacao[], mesNome: string, ano: number): XLSX.WorkSheet {
  const PESQ_HEADERS = [
    'TIPO', 'CHAMADO', 'CLIENTE', 'SOLICITANTE',
    'GRUPO DE SOLUÇÃO', 'RESPONSÁVEL', 'DATA FECHAMENTO', 'DESCRIÇÃO',
    'PERGUNTA',
  ];

  const PESQ_COL_WIDTHS = [
    { width: 14 }, { width: 12 }, { width: 25 }, { width: 25 },
    { width: 25 }, { width: 25 }, { width: 16 }, { width: 50 },
    { width: 40 },
  ];

  if (pesquisas.length === 0) {
    const sheet = criarSheetSemDados(PESQ_HEADERS, mesNome, ano);
    sheet['!cols'] = PESQ_COL_WIDTHS;
    return sheet;
  }

  // Ordenar por número de chamado (menor para maior)
  const pesquisasOrdenadas = [...pesquisas].sort((a, b) => {
    const numA = parseInt(a.nro_caso || '0', 10) || 0;
    const numB = parseInt(b.nro_caso || '0', 10) || 0;
    return numA - numB;
  });

  const rows = pesquisasOrdenadas.map(p => [
    traduzirTipoChamado(p.tipo_caso),
    p.nro_caso || '',
    p.cliente || '',
    p.solicitante || '',
    p.grupo || '',
    p.prestador || '',
    formatarData(p.data_fechamento),
    truncarTexto(p.descricao),
    truncarTexto(p.pergunta),
  ]);

  const sheetData = [PESQ_HEADERS, ...rows];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  aplicarHeaderStyle(sheet, PESQ_HEADERS.length);
  sheet['!cols'] = PESQ_COL_WIDTHS;
  return sheet;
}

/** Cria sheet de Pesquisas Respondidas (mantém DATA RESPOSTA, PERGUNTA, COMENTÁRIO, RESPOSTA) */
function criarSheetPesquisasRespondidas(pesquisas: PesquisaSatisfacao[], mesNome: string, ano: number): XLSX.WorkSheet {
  const PESQ_HEADERS = [
    'TIPO', 'CHAMADO', 'CLIENTE', 'SOLICITANTE',
    'GRUPO DE SOLUÇÃO', 'RESPONSÁVEL', 'DATA FECHAMENTO', 'DESCRIÇÃO',
    'DATA RESPOSTA', 'PERGUNTA', 'COMENTÁRIO DA PERGUNTA', 'RESPOSTA',
  ];

  const PESQ_COL_WIDTHS = [
    { width: 14 }, { width: 12 }, { width: 25 }, { width: 25 },
    { width: 25 }, { width: 25 }, { width: 16 }, { width: 50 },
    { width: 16 }, { width: 40 }, { width: 50 }, { width: 20 },
  ];

  if (pesquisas.length === 0) {
    const sheet = criarSheetSemDados(PESQ_HEADERS, mesNome, ano);
    sheet['!cols'] = PESQ_COL_WIDTHS;
    return sheet;
  }

  // Ordenar por número de chamado (menor para maior)
  const pesquisasOrdenadas = [...pesquisas].sort((a, b) => {
    const numA = parseInt(a.nro_caso || '0', 10) || 0;
    const numB = parseInt(b.nro_caso || '0', 10) || 0;
    return numA - numB;
  });

  const rows = pesquisasOrdenadas.map(p => [
    traduzirTipoChamado(p.tipo_caso),
    p.nro_caso || '',
    p.cliente || '',
    p.solicitante || '',
    p.grupo || '',
    p.prestador || '',
    formatarData(p.data_fechamento),
    truncarTexto(p.descricao),
    formatarData(p.data_resposta),
    truncarTexto(p.pergunta),
    truncarTexto(p.comentario_pesquisa),
    truncarTexto(p.resposta),
  ]);

  const sheetData = [PESQ_HEADERS, ...rows];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  aplicarHeaderStyle(sheet, PESQ_HEADERS.length);
  sheet['!cols'] = PESQ_COL_WIDTHS;
  return sheet;
}

/** Cria sheet de Pesquisas Enviadas e Não Respondidas (sem DATA RESPOSTA, COMENTÁRIO, RESPOSTA) */
function criarSheetPesquisasNaoRespondidas(pesquisas: PesquisaSatisfacao[], mesNome: string, ano: number): XLSX.WorkSheet {
  const PESQ_HEADERS = [
    'TIPO', 'CHAMADO', 'CLIENTE', 'SOLICITANTE',
    'GRUPO DE SOLUÇÃO', 'RESPONSÁVEL', 'DATA FECHAMENTO', 'DESCRIÇÃO',
    'PERGUNTA',
  ];

  const PESQ_COL_WIDTHS = [
    { width: 14 }, { width: 12 }, { width: 25 }, { width: 25 },
    { width: 25 }, { width: 25 }, { width: 16 }, { width: 50 },
    { width: 40 },
  ];

  if (pesquisas.length === 0) {
    const sheet = criarSheetSemDados(PESQ_HEADERS, mesNome, ano);
    sheet['!cols'] = PESQ_COL_WIDTHS;
    return sheet;
  }

  // Ordenar por número de chamado (menor para maior)
  const pesquisasOrdenadas = [...pesquisas].sort((a, b) => {
    const numA = parseInt(a.nro_caso || '0', 10) || 0;
    const numB = parseInt(b.nro_caso || '0', 10) || 0;
    return numA - numB;
  });

  const rows = pesquisasOrdenadas.map(p => [
    traduzirTipoChamado(p.tipo_caso),
    p.nro_caso || '',
    p.cliente || '',
    p.solicitante || '',
    p.grupo || '',
    p.prestador || '',
    formatarData(p.data_fechamento),
    truncarTexto(p.descricao),
    truncarTexto(p.pergunta),
  ]);

  const sheetData = [PESQ_HEADERS, ...rows];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  aplicarHeaderStyle(sheet, PESQ_HEADERS.length);
  sheet['!cols'] = PESQ_COL_WIDTHS;
  return sheet;
}

// ============================================================================
// FUNÇÃO PRINCIPAL EXPORTADA
// ============================================================================

/**
 * Gera Excel completo com 8 abas obrigatórias para detalhamento do book.
 * Se não houver dados em alguma aba, a aba é criada com mensagem informativa.
 *
 * @returns File pronto para upload/anexo, ou null em caso de erro crítico
 */
export async function gerarExcelDetalhadoBook(params: ExcelDetalhadoBookParams): Promise<File | null> {
  const {
    empresaId,
    empresaNome,
    mes,
    ano,
    diaInicioApuracao = 1,
    diaFimApuracao = 0,
    tipoContrato,
  } = params;

  try {
    console.log('📊 Gerando Excel detalhado do book (8 abas)...', { empresaId, empresaNome, mes, ano });

    // Buscar nome completo e tipo de contrato da empresa
    const { data: empresaData } = await supabase
      .from('empresas_clientes')
      .select('nome_completo, tipo_contrato')
      .eq('id', empresaId)
      .single();

    const nomeCompleto = empresaData?.nome_completo || empresaNome;
    const tipoContratoEmpresa = tipoContrato || empresaData?.tipo_contrato || 'horas';

    // Calcular período
    const { dataInicio, dataFim } = calcularPeriodo(mes, ano, diaInicioApuracao, diaFimApuracao);
    const mesNome = MESES_PT[mes - 1];

    console.log('📅 Período calculado:', {
      dataInicio: dataInicio.toISOString(),
      dataFim: dataFim.toISOString(),
      periodicidade: diaInicioApuracao > 1 ? 'customizada' : 'padrão'
    });

    // Buscar todos os dados em paralelo
    const [
      ticketsAbertos,
      ticketsFechados,
      ticketsSLA,
      ticketsBacklog,
      apontamentosHoras,
      ticketsConsumo,
      pesquisas,
    ] = await Promise.all([
      buscarTicketsAbertos(nomeCompleto, dataInicio, dataFim),
      buscarTicketsFechados(nomeCompleto, dataInicio, dataFim),
      buscarTicketsSLA(nomeCompleto, dataInicio, dataFim),
      buscarTicketsBacklog(nomeCompleto, dataFim),
      tipoContratoEmpresa !== 'tickets' ? buscarApontamentosHoras(nomeCompleto, dataInicio, dataFim, empresaId, mes, ano) : Promise.resolve([]),
      tipoContratoEmpresa === 'tickets' || tipoContratoEmpresa === 'ambos' ? buscarTicketsConsumo(nomeCompleto, mes, ano) : Promise.resolve([]),
      buscarPesquisas(nomeCompleto, mes, ano),
    ]);

    // Separar pesquisas
    const pesquisasEnviadas = pesquisas; // Todas são "enviadas"
    const pesquisasRespondidas = pesquisas.filter(p => p.data_resposta !== null);
    const pesquisasNaoRespondidas = pesquisas.filter(p => p.data_resposta === null);

    console.log('📊 Dados coletados:', {
      abertos: ticketsAbertos.length,
      fechados: ticketsFechados.length,
      sla: ticketsSLA.length,
      backlog: ticketsBacklog.length,
      horas: apontamentosHoras.length,
      ticketsConsumo: ticketsConsumo.length,
      pesquisasEnviadas: pesquisasEnviadas.length,
      pesquisasRespondidas: pesquisasRespondidas.length,
      pesquisasNaoRespondidas: pesquisasNaoRespondidas.length,
      tipoContrato: tipoContratoEmpresa,
    });

    // Criar workbook com as 8 abas
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, criarSheetTickets(ticketsAbertos, mesNome, ano), 'Abertos');
    XLSX.utils.book_append_sheet(workbook, criarSheetTickets(ticketsFechados, mesNome, ano), 'Fechados');
    XLSX.utils.book_append_sheet(workbook, criarSheetSLA(ticketsSLA, mesNome, ano), 'SLA');
    XLSX.utils.book_append_sheet(workbook, criarSheetTickets(ticketsBacklog, mesNome, ano), 'Backlog');

    // Aba de consumo: "Tickets" para contrato tipo ticket, "Horas" para contrato tipo horas
    if (tipoContratoEmpresa === 'tickets') {
      XLSX.utils.book_append_sheet(workbook, criarSheetTicketsConsumo(ticketsConsumo, mesNome, ano), 'Tickets');
    } else if (tipoContratoEmpresa === 'ambos') {
      XLSX.utils.book_append_sheet(workbook, criarSheetHoras(apontamentosHoras, mesNome, ano), 'Horas');
      XLSX.utils.book_append_sheet(workbook, criarSheetTicketsConsumo(ticketsConsumo, mesNome, ano), 'Tickets');
    } else {
      XLSX.utils.book_append_sheet(workbook, criarSheetHoras(apontamentosHoras, mesNome, ano), 'Horas');
    }

    XLSX.utils.book_append_sheet(workbook, criarSheetPesquisasEnviadas(pesquisasEnviadas, mesNome, ano), 'Pesquisas_Enviadas');
    XLSX.utils.book_append_sheet(workbook, criarSheetPesquisasRespondidas(pesquisasRespondidas, mesNome, ano), 'Pesquisas_Respondidas');
    XLSX.utils.book_append_sheet(workbook, criarSheetPesquisasNaoRespondidas(pesquisasNaoRespondidas, mesNome, ano), 'Enviadas_E_Não_Respondidas');

    // Converter para buffer
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Nome do arquivo
    const nomeArquivo = `Detalhamento ${empresaNome} - ${mesNome} ${ano}.xlsx`;

    const file = new File([blob], nomeArquivo, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    console.log(`✅ Excel detalhado gerado: ${nomeArquivo} (${(file.size / 1024).toFixed(1)} KB)`);
    return file;
  } catch (error) {
    console.error('❌ Erro ao gerar Excel detalhado do book:', error);
    return null;
  }
}
