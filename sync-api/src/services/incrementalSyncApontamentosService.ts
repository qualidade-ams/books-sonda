/**
 * Serviço de Sincronização Incremental de Apontamentos
 * 
 * Implementa sincronização inteligente baseada em Data_Ult_Modificacao_Geral
 * com suporte a UPSERT seguro e comparação de timestamps.
 * 
 * Regras:
 * 1. Busca maior Data_Ult_Modificacao_Geral do Supabase
 * 2. Busca TODOS os registros do SQL Server >= (maior_data - 1 dia de folga)
 * 3. Para cada registro:
 *    - Se não existe → INSERT
 *    - Se existe e data SQL > data Supabase → UPDATE
 *    - Se existe e data SQL <= data Supabase → SKIP (não sobrescrever)
 * 
 * MELHORIAS APLICADAS:
 * - Folga de 1 dia garante que nenhum registro seja perdido
 * - Busca TODOS os registros modificados (sem limite de 500)
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

// Interface dos dados de apontamentos
interface DadosApontamentoSqlServer {
  Nro_Chamado: string;
  Tipo_Chamado: string;
  Org_Us_Final: string;
  categoria: string;
  Causa_Raiz: string;
  Solicitante: string;
  Us_Final_Afetado: string;
  Data_Abertura: Date | null;
  Data_Sistema: Date | null;
  Data_Atividade: Date | null;
  Data_Fechamento: Date | null;
  Data_Ult_Modificacao: Date | null;
  Data_Ult_Modificacao_Geral: Date | null; // ✅ Campo principal para sincronização incremental
  Data_Ult_Modificacao_tarefa: Date | null;
  Ativi_Interna: string;
  Caso_Estado: string;
  Caso_Grupo: string;
  Nro_Tarefa: string;
  Descricao_Tarefa: string;
  Tempo_Gasto_Segundos: number | null;
  Tempo_Gasto_Minutos: number | null;
  Tempo_Gasto_Horas: string;
  Item_Configuracao: string;
  Analista_Tarefa: string;
  Analista_Caso: string;
  Estado_Tarefa: string;
  Resumo_Tarefa: string;
  Grupo_Tarefa: string;
  Problema: string;
  Cod_Resolucao: string;
  LOG: Date | null;
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
 * Gerar ID único para registro de apontamento
 */
function gerarIdUnicoApontamento(registro: DadosApontamentoSqlServer): string {
  if (!registro.Nro_Chamado || registro.Nro_Chamado.trim() === '') {
    throw new Error(`Nro_Chamado é obrigatório. Registro: ${JSON.stringify(registro)}`);
  }
  
  if (!registro.Nro_Tarefa || registro.Nro_Tarefa.trim() === '') {
    throw new Error(`Nro_Tarefa é obrigatório. Registro: ${JSON.stringify(registro)}`);
  }
  
  const partes = [
    'AMSapontamento',
    registro.Nro_Chamado.trim(),
    registro.Nro_Tarefa.trim(),
    registro.Data_Atividade?.toISOString() || 'sem_data'
  ].filter(Boolean);
  
  return partes.join('|');
}

/**
 * Busca a maior Data_Ult_Modificacao_Geral já sincronizada no Supabase
 */
async function buscarUltimaDataSincronizada(): Promise<Date> {
  console.log('📅 [SYNC] Buscando última data de sincronização no Supabase...');
  
  const { data, error } = await supabase
    .from('apontamentos_aranda')
    .select('data_ult_modificacao_geral')
    .eq('origem', 'sql_server')
    .not('data_ult_modificacao_geral', 'is', null)
    .order('data_ult_modificacao_geral', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('❌ [SYNC] Erro ao buscar última data:', error);
    throw error;
  }

  if (!data || !data.data_ult_modificacao_geral) {
    // Se não houver registros, começar de 28/02/2024
    const dataInicial = new Date('2024-02-28T00:00:00.000Z');
    console.log('⚠️ [SYNC] Nenhum registro encontrado. Usando data inicial:', dataInicial.toISOString());
    return dataInicial;
  }

  const ultimaData = new Date(data.data_ult_modificacao_geral);
  console.log('✅ [SYNC] Última data sincronizada encontrada:', ultimaData.toISOString());
  console.log('🔍 [DEBUG] Tipo da última data:', typeof ultimaData);
  console.log('🔍 [DEBUG] Valor raw do Supabase:', data.data_ult_modificacao_geral);
  
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
  
  console.log('📅 [SYNC] ========================================');
  console.log('📅 [SYNC] CÁLCULO DE DATA DE INÍCIO:');
  console.log(`📅 [SYNC] Última sincronização real: ${ultimaData.toISOString()}`);
  console.log(`📅 [SYNC] Data de início (com folga): ${dataComFolga.toISOString()}`);
  console.log('📅 [SYNC] ⚠️ Folga de 1 dia garante que nenhum registro seja perdido');
  console.log('📅 [SYNC] ========================================');
  
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
): Promise<DadosApontamentoSqlServer[]> {
  console.log(`📊 [SYNC] Buscando TODOS os registros modificados após ${dataInicio.toISOString()}...`);
  
  // ✅ DEBUG: Verificar tipo e valor do parâmetro
  console.log('🔍 [DEBUG] Tipo de dataInicio:', typeof dataInicio);
  console.log('🔍 [DEBUG] Valor de dataInicio:', dataInicio);
  console.log('🔍 [DEBUG] dataInicio.toISOString():', dataInicio.toISOString());
  
  // ✅ TESTE: Verificar tipo de dado do campo Data_Ult_Modificacao_Geral
  const queryTipoDado = `
    SELECT TOP 1
      Data_Ult_Modificacao_Geral,
      SQL_VARIANT_PROPERTY(Data_Ult_Modificacao_Geral, 'BaseType') as tipo_dado
    FROM AMSapontamento
    WHERE Data_Ult_Modificacao_Geral IS NOT NULL
  `;
  
  const tipoDadoResult = await pool.request().query(queryTipoDado);
  if (tipoDadoResult.recordset.length > 0) {
    console.log(`🔍 [DEBUG] Tipo de dado do campo Data_Ult_Modificacao_Geral: ${tipoDadoResult.recordset[0].tipo_dado}`);
    console.log(`🔍 [DEBUG] Exemplo de valor: ${tipoDadoResult.recordset[0].Data_Ult_Modificacao_Geral}`);
  }
  
  // ✅ TESTE: Primeiro vamos contar quantos registros existem com data >= dataInicio
  const queryCount = `
    SELECT COUNT(*) as total
    FROM AMSapontamento
    WHERE CAST(Data_Ult_Modificacao_Geral AS DATETIME) >= @dataInicio
      AND Data_Ult_Modificacao_Geral IS NOT NULL
      AND (Caso_Grupo NOT LIKE 'AMS SAP%' OR Caso_Grupo IS NULL)
  `;
  
  const countResult = await pool.request()
    .input('dataInicio', sql.DateTime, dataInicio)
    .query(queryCount);
  
  const totalRegistros = countResult.recordset[0].total;
  console.log(`🔍 [DEBUG] Total de registros com Data_Ult_Modificacao_Geral >= ${dataInicio.toISOString()}: ${totalRegistros}`);
  
  // ✅ TESTE: Buscar o menor e maior valor de Data_Ult_Modificacao_Geral
  const queryMinMax = `
    SELECT 
      MIN(CAST(Data_Ult_Modificacao_Geral AS DATETIME)) as menor_data,
      MAX(CAST(Data_Ult_Modificacao_Geral AS DATETIME)) as maior_data
    FROM AMSapontamento
    WHERE Data_Ult_Modificacao_Geral IS NOT NULL
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
      Nro_Chamado,
      Tipo_Chamado,
      Org_Us_Final,
      categoria,
      Causa_Raiz,
      Solicitante,
      Us_Final_Afetado,
      [Data_Abertura (Date-Hour-Minute-Second)] as Data_Abertura,
      [Data_Sistema (Date-Hour-Minute-Second)] as Data_Sistema,
      [Data_Atividade (Date-Hour-Minute-Second)] as Data_Atividade,
      [Data_Fechamento (Date-Hour-Minute-Second)] as Data_Fechamento,
      [Data_Ult_Modificacao (Date-Hour-Minute-Second)] as Data_Ult_Modificacao,
      Data_Ult_Modificacao_Geral,
      [Data_Ult_Modificacao_tarefa (Date-Hour-Minute-Second)] as Data_Ult_Modificacao_tarefa,
      Ativi_Interna,
      Caso_Estado,
      Caso_Grupo,
      Nro_Tarefa,
      Descricao_Tarefa,
      Tempo_Gasto_Segundos,
      Tempo_Gasto_Minutos,
      Tempo_Gasto_Horas,
      Item_Configuracao,
      Analista_Tarefa,
      Analista_Caso,
      Estado_Tarefa,
      Resumo_Tarefa,
      Grupo_Tarefa,
      Problema,
      Cod_Resolucao,
      LOG
    FROM AMSapontamento
    WHERE CAST(Data_Ult_Modificacao_Geral AS DATETIME) >= @dataInicio
      AND Data_Ult_Modificacao_Geral IS NOT NULL
      AND (Caso_Grupo NOT LIKE 'AMS SAP%' OR Caso_Grupo IS NULL)
    ORDER BY CAST(Data_Ult_Modificacao_Geral AS DATETIME) ASC
  `;

  console.log(`🔍 [DEBUG] Executando query principal ${limite > 0 ? `com limite de ${limite}` : 'SEM LIMITE (todos os registros)'}...`);
  
  const result = await pool.request()
    .input('dataInicio', sql.DateTime, dataInicio)
    .query(query);

  console.log(`✅ [SYNC] ${result.recordset.length} registros encontrados no SQL Server (de ${totalRegistros} total)`);
  console.log(`📅 [SYNC] Filtro aplicado: CAST(Data_Ult_Modificacao_Geral AS DATETIME) >= ${dataInicio.toISOString()}`);
  
  // Log dos primeiros 3 e últimos 3 registros para debug
  if (result.recordset.length > 0) {
    console.log('📋 [SYNC] Primeiros 3 registros encontrados:');
    result.recordset.slice(0, 3).forEach((reg: any, idx: number) => {
      console.log(`   ${idx + 1}. ${reg.Nro_Chamado}/${reg.Nro_Tarefa} - Data: ${reg.Data_Ult_Modificacao_Geral}`);
    });
    
    if (result.recordset.length > 3) {
      console.log('📋 [SYNC] Últimos 3 registros encontrados:');
      result.recordset.slice(-3).forEach((reg: any, idx: number) => {
        console.log(`   ${result.recordset.length - 2 + idx}. ${reg.Nro_Chamado}/${reg.Nro_Tarefa} - Data: ${reg.Data_Ult_Modificacao_Geral}`);
      });
    }
  }
  
  return result.recordset as DadosApontamentoSqlServer[];
}

/**
 * Verifica se registro existe no Supabase e retorna data de modificação
 */
async function buscarRegistroExistente(idExterno: string): Promise<{
  existe: boolean;
  dataModificacao: Date | null;
}> {
  const { data, error } = await supabase
    .from('apontamentos_aranda')
    .select('data_ult_modificacao_geral')
    .eq('id_externo', idExterno)
    .maybeSingle();

  if (error) {
    console.error('❌ [SYNC] Erro ao buscar registro existente:', error);
    throw error;
  }

  if (!data) {
    return { existe: false, dataModificacao: null };
  }

  const dataModificacao = data.data_ult_modificacao_geral 
    ? new Date(data.data_ult_modificacao_geral)
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
 * Prepara dados do apontamento para inserção/atualização
 */
function prepararDadosApontamento(registro: DadosApontamentoSqlServer) {
  return {
    origem: 'sql_server' as const,
    nro_chamado: registro.Nro_Chamado || null,
    tipo_chamado: registro.Tipo_Chamado || null,
    org_us_final: registro.Org_Us_Final || null,
    categoria: registro.categoria || null,
    causa_raiz: registro.Causa_Raiz || null,
    solicitante: registro.Solicitante || null,
    us_final_afetado: registro.Us_Final_Afetado || null,
    data_abertura: formatarDataSemTimezone(registro.Data_Abertura),
    data_sistema: formatarDataSemTimezone(registro.Data_Sistema),
    data_atividade: formatarDataSemTimezone(registro.Data_Atividade),
    data_fechamento: formatarDataSemTimezone(registro.Data_Fechamento),
    data_ult_modificacao: formatarDataSemTimezone(registro.Data_Ult_Modificacao),
    data_ult_modificacao_geral: formatarDataSemTimezone(registro.Data_Ult_Modificacao_Geral),
    data_ult_modificacao_tarefa: formatarDataSemTimezone(registro.Data_Ult_Modificacao_tarefa),
    ativi_interna: registro.Ativi_Interna || null,
    caso_estado: registro.Caso_Estado || null,
    caso_grupo: registro.Caso_Grupo || null,
    nro_tarefa: registro.Nro_Tarefa || null,
    descricao_tarefa: registro.Descricao_Tarefa || null,
    tempo_gasto_segundos: registro.Tempo_Gasto_Segundos || null,
    tempo_gasto_minutos: registro.Tempo_Gasto_Minutos || null,
    tempo_gasto_horas: registro.Tempo_Gasto_Horas || null,
    item_configuracao: registro.Item_Configuracao || null,
    analista_tarefa: registro.Analista_Tarefa || null,
    analista_caso: registro.Analista_Caso || null,
    estado_tarefa: registro.Estado_Tarefa || null,
    resumo_tarefa: registro.Resumo_Tarefa || null,
    grupo_tarefa: registro.Grupo_Tarefa || null,
    problema: registro.Problema || null,
    cod_resolucao: registro.Cod_Resolucao || null,
    log: formatarDataSemTimezone(registro.LOG)
  };
}

/**
 * Insere novo registro no Supabase
 */
async function inserirRegistro(idExterno: string, dados: any): Promise<void> {
  const { error } = await supabase
    .from('apontamentos_aranda')
    .insert({
      id_externo: idExterno,
      ...dados,
      autor_id: null,
      autor_nome: 'SQL Server Sync (Incremental)'
    });

  if (error) {
    console.error('❌ [SYNC] Erro ao inserir registro:', error);
    throw error;
  }
}

/**
 * Atualiza registro existente no Supabase
 */
async function atualizarRegistro(idExterno: string, dados: any): Promise<void> {
  const { error } = await supabase
    .from('apontamentos_aranda')
    .update(dados)
    .eq('id_externo', idExterno);

  if (error) {
    console.error('❌ [SYNC] Erro ao atualizar registro:', error);
    throw error;
  }
}

/**
 * Processa um único registro (INSERT ou UPDATE)
 */
async function processarRegistro(
  registro: DadosApontamentoSqlServer,
  index: number,
  total: number
): Promise<'inserido' | 'atualizado' | 'ignorado' | 'erro'> {
  try {
    // Validar campos obrigatórios
    if (!registro.Nro_Chamado || registro.Nro_Chamado.trim() === '') {
      console.error(`❌ [SYNC] Registro ${index + 1}/${total}: Nro_Chamado inválido`);
      return 'erro';
    }

    if (!registro.Nro_Tarefa || registro.Nro_Tarefa.trim() === '') {
      console.error(`❌ [SYNC] Registro ${index + 1}/${total}: Nro_Tarefa inválido`);
      return 'erro';
    }

    // Gerar ID único
    const idExterno = gerarIdUnicoApontamento(registro);

    // Verificar se registro existe
    const { existe, dataModificacao } = await buscarRegistroExistente(idExterno);

    // Preparar dados
    const dados = prepararDadosApontamento(registro);

    if (!existe) {
      // ✅ INSERT: Registro não existe
      await inserirRegistro(idExterno, dados);
      console.log(`✅ [SYNC] Registro ${index + 1}/${total}: INSERIDO (${registro.Nro_Chamado}/${registro.Nro_Tarefa})`);
      return 'inserido';
    }

    // Verificar se deve atualizar
    if (deveAtualizar(registro.Data_Ult_Modificacao_Geral, dataModificacao)) {
      // ✅ UPDATE: Data SQL Server > Data Supabase
      await atualizarRegistro(idExterno, dados);
      console.log(`🔄 [SYNC] Registro ${index + 1}/${total}: ATUALIZADO (${registro.Nro_Chamado}/${registro.Nro_Tarefa})`);
      console.log(`   SQL: ${registro.Data_Ult_Modificacao_Geral?.toISOString()} > Supabase: ${dataModificacao?.toISOString()}`);
      return 'atualizado';
    }

    // ⏭️ SKIP: Data SQL Server <= Data Supabase (não sobrescrever)
    console.log(`⏭️ [SYNC] Registro ${index + 1}/${total}: IGNORADO (${registro.Nro_Chamado}/${registro.Nro_Tarefa})`);
    console.log(`   SQL: ${registro.Data_Ult_Modificacao_Geral?.toISOString()} <= Supabase: ${dataModificacao?.toISOString()}`);
    return 'ignorado';

  } catch (erro) {
    console.error(`💥 [SYNC] Erro ao processar registro ${index + 1}/${total}:`, erro);
    return 'erro';
  }
}

/**
 * Função principal de sincronização incremental
 * Busca TODOS os registros modificados (sem limite)
 */
export async function sincronizarApontamentosIncremental(
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
    console.log('🚀 [SYNC] Iniciando sincronização incremental de apontamentos...');
    resultado.mensagens.push('Iniciando sincronização incremental baseada em Data_Ult_Modificacao_Geral');

    // 1. Buscar última data sincronizada
    const ultimaData = await buscarUltimaDataSincronizada();
    console.log(`📅 [SYNC] Última sincronização: ${ultimaData.toISOString()}`);
    resultado.mensagens.push(`✅ Última sincronização: ${ultimaData.toISOString()}`);

    // 2. Calcular data de início com folga de 1 dia
    const dataInicio = calcularDataInicioComFolga(ultimaData);
    console.log(`📅 [SYNC] Data de início (com folga de 1 dia): ${dataInicio.toISOString()}`);
    console.log(`⚠️ [SYNC] Folga de 1 dia garante que nenhum registro seja perdido`);
    resultado.mensagens.push(`🔍 Buscando desde: ${dataInicio.toISOString()} (folga de 1 dia para segurança)`);
    console.log(`📅 [SYNC] Buscando registros com Data_Ult_Modificacao_Geral >= ${dataInicio.toISOString()}`);

    // 3. Buscar TODOS os registros modificados do SQL Server (sem limite)
    const registros = await buscarRegistrosModificados(pool, dataInicio, 0); // 0 = sem limite
    resultado.total_processados = registros.length;
    resultado.mensagens.push(`${registros.length} registros encontrados no SQL Server`);

    if (registros.length === 0) {
      console.log('✅ [SYNC] Nenhum registro novo ou modificado encontrado');
      resultado.sucesso = true;
      resultado.mensagens.push('Nenhum registro novo ou modificado para sincronizar');
      return resultado;
    }

    // 4. Processar cada registro
    console.log(`🔄 [SYNC] Processando ${registros.length} registros...`);
    
    for (let i = 0; i < registros.length; i++) {
      const registro = registros[i];
      
      // Log de progresso a cada 50 registros
      if (i % 50 === 0 && i > 0) {
        console.log(`📊 [SYNC] Progresso: ${i}/${registros.length} registros processados`);
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
        console.log('🛑 [SYNC] Muitos erros detectados, parando sincronização...');
        resultado.mensagens.push('Sincronização interrompida devido a múltiplos erros');
        break;
      }
    }

    // 5. Resultado final
    resultado.sucesso = resultado.erros === 0;
    const mensagemFinal = `Sincronização concluída: ${resultado.inseridos} inseridos, ${resultado.atualizados} atualizados, ${resultado.ignorados} ignorados, ${resultado.erros} erros`;
    resultado.mensagens.push(mensagemFinal);
    
    console.log('✅ [SYNC] ' + mensagemFinal);
    console.log('📊 [SYNC] Resultado detalhado:', resultado);

    return resultado;

  } catch (erro) {
    console.error('💥 [SYNC] Erro crítico na sincronização incremental:', erro);
    resultado.sucesso = false;
    resultado.mensagens.push(`Erro crítico: ${erro instanceof Error ? erro.message : 'Erro desconhecido'}`);
    return resultado;
  }
}
