/**
 * Serviço de Sincronização Incremental de Tickets
 * 
 * Implementa sincronização inteligente baseada em Data_Ultima_Modificacao
 * com suporte a UPSERT seguro e comparação de timestamps.
 * 
 * Regras:
 * 1. Busca maior Data_Ultima_Modificacao do Supabase
 * 2. Busca TODOS os registros do SQL Server >= (maior_data - 1 dia de folga)
 * 3. Para cada registro:
 *    - Se não existe → INSERT
 *    - Se existe e data SQL > data Supabase → UPDATE
 *    - Se existe e data SQL <= data Supabase → SKIP (não sobrescrever)
 * 
 * MELHORIAS APLICADAS:
 * - Folga de 1 dia garante que nenhum registro seja perdido
 * - Busca TODOS os registros modificados (sem limite)
 * - Filtro SQL usa CAST e >= para comparação correta
 * - Lógica de comparação de timestamps evita sobrescrever dados mais recentes
 */

import sql from 'mssql';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Validar variáveis de ambiente
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL não está definida no arquivo .env');
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY não está definida no arquivo .env');
}

// Cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Interface dos dados de tickets (estrutura da tabela AMSticketsabertos)
interface DadosTicketSqlServer {
  Nro_Solicitacao: string;
  Cod_Tipo: string;
  Ticket_Externo: string;
  Numero_Pai: string;
  Caso_Pai: string;
  Organizacao: string;
  Empresa: string;
  Cliente: string;
  Usuario_Final: string;
  Resumo: string;
  Descricao: string;
  Autor: string;
  Solicitante: string;
  Nome_Grupo: string;
  Nome_Responsavel: string;
  Categoria: string;
  Item_Configuracao: string;
  Data_Abertura: Date | null;
  Data_Solucao: Date | null;
  Data_Fechamento: Date | null;
  Data_Ultima_Modificacao: Date | null; // ✅ Campo principal para sincronização incremental
  Ultima_Modificacao: string;
  Data_Prevista_Entrega: Date | null;
  Data_Aprovacao: Date | null;
  Data_Real_Entrega: Date | null;
  Data_Ultima_Nota: Date | null;
  Data_Ultimo_Comentario: Date | null;
  Status: string;
  Prioridade: string;
  Urgencia: string;
  Impacto: string;
  Chamado_Reaberto: string;
  Criado_Via: string;
  Relatado: string;
  Solucao: string;
  Causa_Raiz: string;
  Desc_Ultima_Nota: string;
  Desc_Ultimo_Comentario: string;
  LOG: string;
  Tempo_Gasto_Dias: number | null;
  Tempo_Gasto_Horas: number | null;
  Tempo_Gasto_Minutos: number | null;
  Cod_Resolucao: string;
  Violacao_SLA: string;
  TDA_Cumprido: string;
  TDS_Cumprido: string;
  Data_Prevista_TDA: Date | null;
  Data_Prevista_TDS: Date | null;
  Tempo_Restante_TDA: string;
  Tempo_Restante_TDS: string;
  Tempo_Restante_TDS_em_Minutos: number | null;
  Tempo_Real_TDA: string;
  Total_Orcamento: number | null;
}

/**
 * Formata data para ISO string preservando o horário local
 * @param date Data a ser formatada
 * @returns String no formato ISO ou null
 */
function formatarDataSemTimezone(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  
  try {
    const dataObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dataObj.getTime())) {
      console.error('❌ Data inválida:', date);
      return null;
    }
    
    const year = dataObj.getFullYear();
    const month = String(dataObj.getMonth() + 1).padStart(2, '0');
    const day = String(dataObj.getDate()).padStart(2, '0');
    const hours = String(dataObj.getHours()).padStart(2, '0');
    const minutes = String(dataObj.getMinutes()).padStart(2, '0');
    const seconds = String(dataObj.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  } catch (erro) {
    console.error('❌ Erro ao formatar data:', erro);
    return null;
  }
}

/**
 * Busca a maior Data_Ultima_Modificacao já sincronizada no Supabase
 */
async function buscarUltimaDataSincronizada(): Promise<Date> {
  console.log('📅 [SYNC-TICKETS] Buscando última data de sincronização no Supabase...');
  
  const { data, error } = await supabase
    .from('apontamentos_tickets_aranda')
    .select('source_updated_at')
    .not('source_updated_at', 'is', null)
    .order('source_updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('❌ [SYNC-TICKETS] Erro ao buscar última data:', error);
    throw error;
  }

  if (!data || !data.source_updated_at) {
    // Se não houver registros, começar de 01/01/2024
    const dataInicial = new Date('2024-01-01T00:00:00.000Z');
    console.log('⚠️ [SYNC-TICKETS] Nenhum registro encontrado. Usando data inicial:', dataInicial.toISOString());
    return dataInicial;
  }

  const ultimaData = new Date(data.source_updated_at);
  console.log('✅ [SYNC-TICKETS] Última data sincronizada encontrada:', ultimaData.toISOString());
  console.log('🔍 [DEBUG] Tipo da última data:', typeof ultimaData);
  console.log('🔍 [DEBUG] Valor raw do Supabase:', data.source_updated_at);
  
  return ultimaData;
}

/**
 * Calcula data de início da sincronização com 1 dia de folga
 * IMPORTANTE: Subtrai 1 dia para garantir que nenhum registro seja perdido
 * devido a diferenças de timezone ou atualizações simultâneas
 */
function calcularDataInicioComFolga(ultimaData: Date): Date {
  const dataComFolga = new Date(ultimaData);
  dataComFolga.setDate(dataComFolga.getDate() - 1); // Subtrair 1 dia de folga
  
  console.log('📅 [SYNC-TICKETS] ========================================');
  console.log('📅 [SYNC-TICKETS] CÁLCULO DE DATA DE INÍCIO:');
  console.log(`📅 [SYNC-TICKETS] Última sincronização real: ${ultimaData.toISOString()}`);
  console.log(`📅 [SYNC-TICKETS] Data de início (com folga): ${dataComFolga.toISOString()}`);
  console.log('📅 [SYNC-TICKETS] ⚠️ Folga de 1 dia garante que nenhum registro seja perdido');
  console.log('📅 [SYNC-TICKETS] ========================================');
  
  return dataComFolga;
}

/**
 * Busca registros do SQL Server modificados após a data especificada
 * IMPORTANTE: Busca TODOS os registros modificados (sem limite)
 */
async function buscarRegistrosModificados(
  pool: sql.ConnectionPool,
  dataInicio: Date,
  limite: number = 0 // 0 = sem limite, busca todos
): Promise<DadosTicketSqlServer[]> {
  console.log(`📊 [SYNC-TICKETS] Buscando TODOS os registros modificados após ${dataInicio.toISOString()}...`);
  
  // ✅ DEBUG: Verificar tipo e valor do parâmetro
  console.log('🔍 [DEBUG] Tipo de dataInicio:', typeof dataInicio);
  console.log('🔍 [DEBUG] Valor de dataInicio:', dataInicio);
  console.log('🔍 [DEBUG] dataInicio.toISOString():', dataInicio.toISOString());
  
  // ✅ TESTE: Verificar tipo de dado do campo Data_Ultima_Modificacao
  const queryTipoDado = `
    SELECT TOP 1
      Data_Ultima_Modificacao,
      SQL_VARIANT_PROPERTY(Data_Ultima_Modificacao, 'BaseType') as tipo_dado
    FROM AMSticketsabertos
    WHERE Data_Ultima_Modificacao IS NOT NULL
  `;
  
  const tipoDadoResult = await pool.request().query(queryTipoDado);
  if (tipoDadoResult.recordset.length > 0) {
    console.log(`🔍 [DEBUG] Tipo de dado do campo Data_Ultima_Modificacao: ${tipoDadoResult.recordset[0].tipo_dado}`);
    console.log(`🔍 [DEBUG] Exemplo de valor: ${tipoDadoResult.recordset[0].Data_Ultima_Modificacao}`);
  }
  
  // ✅ TESTE: Primeiro vamos contar quantos registros existem com data >= dataInicio
  const queryCount = `
    SELECT COUNT(*) as total
    FROM AMSticketsabertos
    WHERE CAST(Data_Ultima_Modificacao AS DATETIME) >= @dataInicio
      AND Data_Ultima_Modificacao IS NOT NULL
      AND (Nome_Grupo NOT LIKE 'AMS SAP%' OR Nome_Grupo IS NULL)
  `;
  
  const countResult = await pool.request()
    .input('dataInicio', sql.DateTime, dataInicio)
    .query(queryCount);
  
  const totalRegistros = countResult.recordset[0].total;
  console.log(`🔍 [DEBUG] Total de registros com Data_Ultima_Modificacao >= ${dataInicio.toISOString()}: ${totalRegistros}`);
  
  // ✅ TESTE: Buscar o menor e maior valor de Data_Ultima_Modificacao
  const queryMinMax = `
    SELECT 
      MIN(CAST(Data_Ultima_Modificacao AS DATETIME)) as menor_data,
      MAX(CAST(Data_Ultima_Modificacao AS DATETIME)) as maior_data
    FROM AMSticketsabertos
    WHERE Data_Ultima_Modificacao IS NOT NULL
  `;
  
  const minMaxResult = await pool.request().query(queryMinMax);
  console.log(`🔍 [DEBUG] Menor data no SQL Server: ${minMaxResult.recordset[0].menor_data}`);
  console.log(`🔍 [DEBUG] Maior data no SQL Server: ${minMaxResult.recordset[0].maior_data}`);
  console.log(`🔍 [DEBUG] Data de filtro (dataInicio): ${dataInicio.toISOString()}`);
  
  // ✅ CORREÇÃO CRÍTICA: Buscar TODOS os registros (sem TOP/limite)
  // Se limite = 0, busca todos; caso contrário, usa o limite especificado
  const topClause = limite > 0 ? `TOP ${limite}` : '';
  
  const query = `
    SELECT ${topClause}
      Nro_Solicitacao,
      Cod_Tipo,
      Ticket_Externo,
      Numero_Pai,
      Caso_Pai,
      Organizacao,
      Empresa,
      cliente as Cliente,
      [Usuario Final] as Usuario_Final,
      Resumo,
      Descricao,
      autor as Autor,
      Solicitante,
      Nome_grupo as Nome_Grupo,
      Nome_responsavel as Nome_Responsavel,
      Categoria,
      Item_Configuracao,
      Data_Abertura,
      Data_Solucao,
      Data_Fechamento,
      Data_Ultima_Modificacao,
      Ultima_Modificacao,
      [Data Prevista Entrega] as Data_Prevista_Entrega,
      [Data da aprovação (somente se aprovado)] as Data_Aprovacao,
      [Data Real da Entrega] as Data_Real_Entrega,
      [data_ultima_nota (Date-Hour-Minute-Second)] as Data_Ultima_Nota,
      [data_ultimo_comentario (Date-Hour-Minute-Second)] as Data_Ultimo_Comentario,
      Status,
      Prioridade,
      Urgencia,
      Impacto,
      Chamado_reaberto as Chamado_Reaberto,
      Criado_Via,
      Relatado,
      Solucao,
      Causa_Raiz,
      desc_ultima_nota as Desc_Ultima_Nota,
      desc_ultimo_comentario as Desc_Ultimo_Comentario,
      LOG,
      Tempo_Gasto_Dias,
      Tempo_Gasto_Horas,
      Tempo_Gasto_Minutos,
      Cod_Resolucao,
      Violacao_Sla as Violacao_SLA,
      Tda_Cumprido as TDA_Cumprido,
      Tds_Cumprido as TDS_Cumprido,
      [data_prevista_tda (Date-Hour-Minute-Second)] as Data_Prevista_TDA,
      [data_prevista_tds (Date-Hour-Minute-Second)] as Data_Prevista_TDS,
      Tempo_Restante_Tda as Tempo_Restante_TDA,
      Tempo_Restante_Tds as Tempo_Restante_TDS,
      [tempo_restante_tds_em_minutos (Sum)] as Tempo_Restante_TDS_em_Minutos,
      tempo_real_tda as Tempo_Real_TDA,
      [Total Orçamento (em decimais)] as Total_Orcamento
    FROM AMSticketsabertos
    WHERE CAST(Data_Ultima_Modificacao AS DATETIME) >= @dataInicio
      AND Data_Ultima_Modificacao IS NOT NULL
      AND (Nome_Grupo NOT LIKE 'AMS SAP%' OR Nome_Grupo IS NULL)
    ORDER BY CAST(Data_Ultima_Modificacao AS DATETIME) ASC
  `;

  console.log(`🔍 [DEBUG] Executando query principal ${limite > 0 ? `com limite de ${limite}` : 'SEM LIMITE (todos os registros)'}...`);
  
  const result = await pool.request()
    .input('dataInicio', sql.DateTime, dataInicio)
    .query(query);

  console.log(`✅ [SYNC-TICKETS] ${result.recordset.length} registros encontrados no SQL Server (de ${totalRegistros} total)`);
  console.log(`📅 [SYNC-TICKETS] Filtro aplicado: CAST(Data_Ultima_Modificacao AS DATETIME) >= ${dataInicio.toISOString()}`);
  
  // Log dos primeiros 3 e últimos 3 registros para debug
  if (result.recordset.length > 0) {
    console.log('📋 [SYNC-TICKETS] Primeiros 3 registros encontrados:');
    result.recordset.slice(0, 3).forEach((reg: any, idx: number) => {
      console.log(`   ${idx + 1}. ${reg.Nro_Solicitacao} - Data: ${reg.Data_Ultima_Modificacao}`);
    });
    
    if (result.recordset.length > 3) {
      console.log('📋 [SYNC-TICKETS] Últimos 3 registros encontrados:');
      result.recordset.slice(-3).forEach((reg: any, idx: number) => {
        console.log(`   ${result.recordset.length - 2 + idx}. ${reg.Nro_Solicitacao} - Data: ${reg.Data_Ultima_Modificacao}`);
      });
    }
  }
  
  return result.recordset as DadosTicketSqlServer[];
}

/**
 * Verifica se registro existe no Supabase e retorna data de modificação
 */
async function buscarRegistroExistente(nroSolicitacao: string, dataAbertura: Date | null): Promise<{
  existe: boolean;
  dataModificacao: Date | null;
}> {
  // Buscar APENAS por nro_solicitacao (constraint unique corrigida)
  // CORREÇÃO: Não usar data_abertura na busca pois timezone pode variar entre importações
  const { data, error } = await supabase
    .from('apontamentos_tickets_aranda')
    .select('source_updated_at')
    .eq('nro_solicitacao', nroSolicitacao)
    .maybeSingle();

  if (error) {
    console.error('❌ [SYNC-TICKETS] Erro ao buscar registro existente:', error);
    throw error;
  }

  if (!data) {
    return { existe: false, dataModificacao: null };
  }

  const dataModificacao = data.source_updated_at 
    ? new Date(data.source_updated_at)
    : null;

  return { existe: true, dataModificacao };
}

/**
 * Compara datas considerando timezone UTC
 * Retorna true se dataSqlServer > dataSupabase
 */
function deveAtualizar(dataSqlServer: Date | null, dataSupabase: Date | null): boolean {
  // Se não houver data no SQL Server, não atualizar
  if (!dataSqlServer) {
    return false;
  }

  // Se não houver data no Supabase, atualizar
  if (!dataSupabase) {
    return true;
  }

  // Comparar timestamps em UTC
  const timestampSqlServer = dataSqlServer.getTime();
  const timestampSupabase = dataSupabase.getTime();

  return timestampSqlServer > timestampSupabase;
}

/**
 * Prepara dados do ticket para inserção/atualização
 */
function prepararDadosTicket(registro: DadosTicketSqlServer) {
  return {
    nro_solicitacao: registro.Nro_Solicitacao || null,
    cod_tipo: registro.Cod_Tipo || null,
    ticket_externo: registro.Ticket_Externo || null,
    numero_pai: registro.Numero_Pai || null,
    caso_pai: registro.Caso_Pai || null,
    organizacao: registro.Organizacao || null,
    empresa: registro.Empresa || null,
    cliente: registro.Cliente || null,
    usuario_final: registro.Usuario_Final || null,
    resumo: registro.Resumo || null,
    descricao: registro.Descricao || null,
    autor: registro.Autor || null,
    solicitante: registro.Solicitante || null,
    nome_grupo: registro.Nome_Grupo || null,
    nome_responsavel: registro.Nome_Responsavel || null,
    categoria: registro.Categoria || null,
    item_configuracao: registro.Item_Configuracao || null,
    data_abertura: formatarDataSemTimezone(registro.Data_Abertura),
    data_solucao: formatarDataSemTimezone(registro.Data_Solucao),
    data_fechamento: formatarDataSemTimezone(registro.Data_Fechamento),
    data_ultima_modificacao: formatarDataSemTimezone(registro.Data_Ultima_Modificacao),
    ultima_modificacao: registro.Ultima_Modificacao || null,
    data_prevista_entrega: formatarDataSemTimezone(registro.Data_Prevista_Entrega),
    data_aprovacao: formatarDataSemTimezone(registro.Data_Aprovacao),
    data_real_entrega: formatarDataSemTimezone(registro.Data_Real_Entrega),
    data_ultima_nota: formatarDataSemTimezone(registro.Data_Ultima_Nota),
    data_ultimo_comentario: formatarDataSemTimezone(registro.Data_Ultimo_Comentario),
    status: registro.Status || null,
    prioridade: registro.Prioridade || null,
    urgencia: registro.Urgencia || null,
    impacto: registro.Impacto || null,
    chamado_reaberto: registro.Chamado_Reaberto || null,
    criado_via: registro.Criado_Via || null,
    relatado: registro.Relatado || null,
    solucao: registro.Solucao || null,
    causa_raiz: registro.Causa_Raiz || null,
    desc_ultima_nota: registro.Desc_Ultima_Nota || null,
    desc_ultimo_comentario: registro.Desc_Ultimo_Comentario || null,
    log: registro.LOG || null,
    tempo_gasto_dias: registro.Tempo_Gasto_Dias || null,
    tempo_gasto_horas: registro.Tempo_Gasto_Horas || null,
    tempo_gasto_minutos: registro.Tempo_Gasto_Minutos || null,
    cod_resolucao: registro.Cod_Resolucao || null,
    violacao_sla: registro.Violacao_SLA || null,
    tda_cumprido: registro.TDA_Cumprido || null,
    tds_cumprido: registro.TDS_Cumprido || null,
    data_prevista_tda: formatarDataSemTimezone(registro.Data_Prevista_TDA),
    data_prevista_tds: formatarDataSemTimezone(registro.Data_Prevista_TDS),
    tempo_restante_tda: registro.Tempo_Restante_TDA || null,
    tempo_restante_tds: registro.Tempo_Restante_TDS || null,
    tempo_restante_tds_em_minutos: registro.Tempo_Restante_TDS_em_Minutos || null,
    tempo_real_tda: registro.Tempo_Real_TDA || null,
    total_orcamento: registro.Total_Orcamento || null,
    // Campos de controle de sincronização
    source_updated_at: formatarDataSemTimezone(registro.Data_Ultima_Modificacao),
    synced_at: new Date().toISOString()
  };
}

/**
 * Insere novo registro no Supabase
 */
async function inserirRegistro(dados: any): Promise<void> {
  const { error } = await supabase
    .from('apontamentos_tickets_aranda')
    .insert(dados);

  if (error) {
    console.error('❌ [SYNC-TICKETS] Erro ao inserir registro:', error);
    throw error;
  }
}

/**
 * Atualiza registro existente no Supabase
 */
async function atualizarRegistro(nroSolicitacao: string, dataAbertura: Date | null, dados: any): Promise<void> {
  // CORREÇÃO: Atualizar APENAS por nro_solicitacao (constraint unique corrigida)
  const { error } = await supabase
    .from('apontamentos_tickets_aranda')
    .update(dados)
    .eq('nro_solicitacao', nroSolicitacao);

  if (error) {
    console.error('❌ [SYNC-TICKETS] Erro ao atualizar registro:', error);
    throw error;
  }
}

/**
 * Processa um único registro (INSERT ou UPDATE)
 */
async function processarRegistro(
  registro: DadosTicketSqlServer,
  index: number,
  total: number
): Promise<'inserido' | 'atualizado' | 'ignorado' | 'erro'> {
  try {
    // Validar campos obrigatórios
    if (!registro.Nro_Solicitacao || registro.Nro_Solicitacao.trim() === '') {
      console.error(`❌ [SYNC-TICKETS] Registro ${index + 1}/${total}: Nro_Solicitacao inválido`);
      return 'erro';
    }

    // Verificar se registro existe (usando nro_solicitacao + data_abertura)
    const { existe, dataModificacao } = await buscarRegistroExistente(
      registro.Nro_Solicitacao,
      registro.Data_Abertura
    );

    // Preparar dados
    const dados = prepararDadosTicket(registro);

    if (!existe) {
      // ✅ INSERT: Registro não existe
      await inserirRegistro(dados);
      console.log(`✅ [SYNC-TICKETS] Registro ${index + 1}/${total}: INSERIDO (${registro.Nro_Solicitacao})`);
      return 'inserido';
    }

    // Verificar se deve atualizar
    if (deveAtualizar(registro.Data_Ultima_Modificacao, dataModificacao)) {
      // ✅ UPDATE: Data SQL Server > Data Supabase
      await atualizarRegistro(registro.Nro_Solicitacao, registro.Data_Abertura, dados);
      console.log(`🔄 [SYNC-TICKETS] Registro ${index + 1}/${total}: ATUALIZADO (${registro.Nro_Solicitacao})`);
      console.log(`   SQL: ${registro.Data_Ultima_Modificacao?.toISOString()} > Supabase: ${dataModificacao?.toISOString()}`);
      return 'atualizado';
    }

    // ⏭️ SKIP: Data SQL Server <= Data Supabase (não sobrescrever)
    console.log(`⏭️ [SYNC-TICKETS] Registro ${index + 1}/${total}: IGNORADO (${registro.Nro_Solicitacao})`);
    console.log(`   SQL: ${registro.Data_Ultima_Modificacao?.toISOString()} <= Supabase: ${dataModificacao?.toISOString()}`);
    return 'ignorado';

  } catch (erro) {
    console.error(`💥 [SYNC-TICKETS] Erro ao processar registro ${index + 1}/${total}:`, erro);
    return 'erro';
  }
}

/**
 * Função principal de sincronização incremental
 * Busca TODOS os registros modificados (sem limite)
 */
export async function sincronizarTicketsIncremental(
  pool: sql.ConnectionPool
): Promise<{
  sucesso: boolean;
  total_processados: number;
  inseridos: number;
  atualizados: number;
  ignorados: number;
  erros: number;
  mensagens: string[];
}> {
  const resultado = {
    sucesso: false,
    total_processados: 0,
    inseridos: 0,
    atualizados: 0,
    ignorados: 0,
    erros: 0,
    mensagens: [] as string[]
  };

  try {
    console.log('🚀 [SYNC-TICKETS] Iniciando sincronização incremental de tickets...');
    resultado.mensagens.push('Iniciando sincronização incremental baseada em Data_Ultima_Modificacao');

    // 1. Buscar última data sincronizada
    const ultimaData = await buscarUltimaDataSincronizada();
    console.log(`📅 [SYNC-TICKETS] Última sincronização: ${ultimaData.toISOString()}`);
    resultado.mensagens.push(`✅ Última sincronização: ${ultimaData.toISOString()}`);

    // 2. Calcular data de início com folga de 1 dia
    const dataInicio = calcularDataInicioComFolga(ultimaData);
    console.log(`📅 [SYNC-TICKETS] Data de início (com folga de 1 dia): ${dataInicio.toISOString()}`);
    console.log(`⚠️ [SYNC-TICKETS] Folga de 1 dia garante que nenhum registro seja perdido`);
    resultado.mensagens.push(`🔍 Buscando desde: ${dataInicio.toISOString()} (folga de 1 dia para segurança)`);
    console.log(`📅 [SYNC-TICKETS] Buscando registros com Data_Ultima_Modificacao >= ${dataInicio.toISOString()}`);

    // 3. Buscar TODOS os registros modificados do SQL Server (sem limite)
    const registros = await buscarRegistrosModificados(pool, dataInicio, 0); // 0 = sem limite
    resultado.total_processados = registros.length;
    resultado.mensagens.push(`${registros.length} registros encontrados no SQL Server`);

    if (registros.length === 0) {
      console.log('✅ [SYNC-TICKETS] Nenhum registro novo ou modificado encontrado');
      resultado.sucesso = true;
      resultado.mensagens.push('Nenhum registro novo ou modificado para sincronizar');
      return resultado;
    }

    // 4. Processar cada registro
    console.log(`🔄 [SYNC-TICKETS] Processando ${registros.length} registros...`);
    
    for (let i = 0; i < registros.length; i++) {
      const registro = registros[i];
      
      // Log de progresso a cada 50 registros
      if (i % 50 === 0 && i > 0) {
        console.log(`📊 [SYNC-TICKETS] Progresso: ${i}/${registros.length} registros processados`);
      }

      const resultadoProcessamento = await processarRegistro(registro, i, registros.length);

      switch (resultadoProcessamento) {
        case 'inserido':
          resultado.inseridos++;
          break;
        case 'atualizado':
          resultado.atualizados++;
          break;
        case 'ignorado':
          resultado.ignorados++;
          break;
        case 'erro':
          resultado.erros++;
          break;
      }

      // Parar se houver muitos erros consecutivos
      if (resultado.erros >= 10) {
        console.log('🛑 [SYNC-TICKETS] Muitos erros detectados, parando sincronização...');
        resultado.mensagens.push('Sincronização interrompida devido a múltiplos erros');
        break;
      }
    }

    // 5. Resultado final
    resultado.sucesso = resultado.erros === 0;
    const mensagemFinal = `Sincronização concluída: ${resultado.inseridos} inseridos, ${resultado.atualizados} atualizados, ${resultado.ignorados} ignorados, ${resultado.erros} erros`;
    resultado.mensagens.push(mensagemFinal);
    
    console.log('✅ [SYNC-TICKETS] ' + mensagemFinal);
    console.log('📊 [SYNC-TICKETS] Resultado detalhado:', resultado);

    return resultado;

  } catch (erro) {
    console.error('💥 [SYNC-TICKETS] Erro crítico na sincronização incremental:', erro);
    resultado.sucesso = false;
    resultado.mensagens.push(`Erro crítico: ${erro instanceof Error ? erro.message : 'Erro desconhecido'}`);
    return resultado;
  }
}
