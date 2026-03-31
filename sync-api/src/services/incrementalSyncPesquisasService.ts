/**
 * Serviço de Sincronização Incremental de Pesquisas
 * 
 * Implementa sincronização inteligente baseada em Data_Ultima_Modificacao
 * com suporte a UPSERT seguro e comparação de timestamps.
 * 
 * Regras:
 * 1. Busca maior Data_Ultima_Modificacao do Supabase
 * 2. Busca registros do SQL Server:
 *    - Com Data_Ultima_Modificacao >= (maior_data - 1 dia de folga)
 *    - Inclui pesquisas com e sem resposta (desde que tenham sido modificadas recentemente)
 * 3. Para cada registro:
 *    - Se não existe → INSERT
 *    - Se existe e data SQL > data Supabase → UPDATE
 *    - Se existe e data SQL <= data Supabase → SKIP (não sobrescrever)
 * 
 * Filtros obrigatórios:
 * - Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL
 * - Data_Fechamento >= '2026-01-01 00:00:00'
 * - Cliente != 'user - ams - teste'
 * - Data_Ultima_Modificacao >= (última sincronização - 1 dia)
 */

import sql from 'mssql';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// 🔍 DEBUG: Verificar se variáveis de ambiente estão disponíveis
console.log('🔍 [DEBUG PESQUISAS] Verificando variáveis de ambiente...');
console.log('🔍 [DEBUG PESQUISAS] SUPABASE_URL:', process.env.SUPABASE_URL ? 'DEFINIDA' : 'UNDEFINED');
console.log('🔍 [DEBUG PESQUISAS] SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'DEFINIDA' : 'UNDEFINED');

// Validar variáveis de ambiente
if (!process.env.SUPABASE_URL) {
  console.error('❌ [DEBUG PESQUISAS] SUPABASE_URL não está definida!');
  throw new Error('SUPABASE_URL não está definida no arquivo .env');
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ [DEBUG PESQUISAS] SUPABASE_SERVICE_KEY não está definida!');
  throw new Error('SUPABASE_SERVICE_KEY não está definida no arquivo .env');
}

console.log('✅ [DEBUG PESQUISAS] Variáveis de ambiente validadas com sucesso');
console.log('🔍 [DEBUG PESQUISAS] Criando cliente Supabase...');

// Cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('✅ [DEBUG PESQUISAS] Cliente Supabase criado:', supabase ? 'OK' : 'UNDEFINED');
console.log('🔍 [DEBUG PESQUISAS] Tipo do cliente:', typeof supabase);

// Interface dos dados de pesquisas do SQL Server
interface DadosPesquisaSqlServer {
  Empresa: string;
  Categoria: string;
  Grupo: string;
  Cliente: string;
  Email_Cliente: string;
  Prestador: string;
  Solicitante: string;
  Nro_Caso: string;
  Tipo_Caso: string;
  Ano_Abertura: string;
  Mes_abertura: string;
  Data_Resposta: Date | null;
  Resposta: string;
  Comentario_Pesquisa: string;
  Servico: string;
  Nome_Pesquisa: string;
  Data_Fechamento: Date | null;
  Data_Ultima_Modificacao: Date | null;
  Autor_Notificacao: string;
  Estado: string;
  Descricao: string;
  Pesquisa_Recebida: string;
  Pergunta: string;
  SequenciaPregunta: string;
  LOG: Date | null;
}

/**
 * Formata data para ISO string preservando o horário local
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
 * Aplicar transformação automática para clientes com "-AMS"
 * REGRA: Cliente com "-AMS" → empresa = "SONDA INTERNO", cliente = solicitante
 */
function aplicarTransformacaoAMS(dados: {
  empresa: string;
  cliente: string;
  solicitante: string | null;
}): {
  empresa: string;
  cliente: string;
  solicitante: string | null;
} {
  const clienteOriginal = dados.cliente || '';
  
  // 🔍 DEBUG: Log de entrada
  console.log(`🔍 [TRANSFORMAÇÃO DEBUG] Entrada:`, {
    empresa: dados.empresa,
    cliente: dados.cliente,
    solicitante: dados.solicitante,
    clienteContemAMS: clienteOriginal.includes('-AMS')
  });
  
  // Verificar se cliente contém "-AMS"
  const clienteContemAMS = clienteOriginal.includes('-AMS');
  
  if (!clienteContemAMS) {
    // Sem transformação
    console.log(`⏭️ [TRANSFORMAÇÃO] Cliente não contém "-AMS", sem transformação`);
    return dados;
  }

  console.log(`🔍 [TRANSFORMAÇÃO] Cliente contém "-AMS": "${clienteOriginal}"`);

  // Verificar se há solicitante para substituir o cliente
  if (!dados.solicitante || dados.solicitante.trim() === '') {
    console.warn('⚠️ [TRANSFORMAÇÃO] Cliente contém "-AMS" mas solicitante está vazio:', {
      cliente: dados.cliente,
      solicitante: dados.solicitante
    });
    
    // Sem transformação se solicitante estiver vazio
    return dados;
  }

  // Aplicar transformação: empresa = "SONDA INTERNO", cliente = solicitante
  const dadosTransformados = {
    empresa: 'SONDA INTERNO',
    cliente: dados.solicitante.trim(),
    solicitante: dados.solicitante
  };

  console.log('✅ [TRANSFORMAÇÃO] Aplicada transformação AMS:', {
    original: {
      empresa: dados.empresa,
      cliente: dados.cliente,
      solicitante: dados.solicitante
    },
    transformado: {
      empresa: dadosTransformados.empresa,
      cliente: dadosTransformados.cliente,
      solicitante: dadosTransformados.solicitante
    }
  });

  return dadosTransformados;
}

/**
 * Busca a maior Data_Ultima_Modificacao já sincronizada no Supabase
 */
async function buscarUltimaDataSincronizada(): Promise<Date> {
  console.log('📅 [SYNC] Buscando última data de sincronização no Supabase...');
  
  const { data, error } = await supabase
    .from('pesquisas_satisfacao')
    .select('data_ultima_modificacao')
    .eq('origem', 'sql_server')
    .not('data_ultima_modificacao', 'is', null)
    .order('data_ultima_modificacao', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('❌ [SYNC] Erro ao buscar última data:', error);
    throw error;
  }

  if (!data || !data.data_ultima_modificacao) {
    // Se não houver registros, começar de 01/01/2026
    const dataInicial = new Date('2026-01-01T00:00:00.000Z');
    console.log('⚠️ [SYNC] Nenhum registro encontrado. Usando data inicial:', dataInicial.toISOString());
    return dataInicial;
  }

  const ultimaData = new Date(data.data_ultima_modificacao);
  console.log('✅ [SYNC] Última data sincronizada encontrada:', ultimaData.toISOString());
  
  return ultimaData;
}

/**
 * Calcula data de início da sincronização com 1 dia de folga
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
 * Inclui pesquisas sem resposta que foram modificadas recentemente
 */
async function buscarRegistrosModificados(
  pool: sql.ConnectionPool,
  dataInicio: Date
): Promise<DadosPesquisaSqlServer[]> {
  console.log(`📊 [SYNC] Buscando registros modificados após ${dataInicio.toISOString()}...`);
  console.log(`📊 [SYNC] Incluindo pesquisas sem resposta modificadas após essa data`);
  
  // 🔍 DEBUG: Contar total de registros no SQL Server
  const queryTotal = `
    SELECT COUNT(*) as total
    FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
    WHERE (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
      AND [Data_Fechamento (Date-Hour-Minute-Second)] >= '2026-01-01 00:00:00'
      AND LOWER(LTRIM(RTRIM(Cliente))) != 'user - ams - teste'
  `;
  
  const resultTotal = await pool.request().query(queryTotal);
  const totalRegistros = resultTotal.recordset[0].total;
  console.log(`📊 [SYNC] Total de registros no SQL Server (com filtros básicos): ${totalRegistros}`);
  
  // 🔍 DEBUG: Contar registros modificados após dataInicio
  const queryModificados = `
    SELECT COUNT(*) as total_modificados
    FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
    WHERE [Data_Ultima_Modificacao (Year)] IS NOT NULL 
      AND CAST([Data_Ultima_Modificacao (Year)] AS DATETIME) >= @dataInicio
      AND (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
      AND [Data_Fechamento (Date-Hour-Minute-Second)] >= '2026-01-01 00:00:00'
      AND LOWER(LTRIM(RTRIM(Cliente))) != 'user - ams - teste'
  `;
  
  const resultModificados = await pool.request()
    .input('dataInicio', sql.DateTime, dataInicio)
    .query(queryModificados);
  const totalModificados = resultModificados.recordset[0].total_modificados;
  console.log(`📊 [SYNC] Registros modificados após ${dataInicio.toISOString()}: ${totalModificados}`);
  
  // 🔍 DEBUG: Distribuição de datas de modificação (últimos 7 dias)
  const queryDistribuicao = `
    SELECT 
      CAST([Data_Ultima_Modificacao (Year)] AS DATE) as data_modificacao,
      COUNT(*) as quantidade
    FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
    WHERE [Data_Ultima_Modificacao (Year)] IS NOT NULL 
      AND CAST([Data_Ultima_Modificacao (Year)] AS DATETIME) >= DATEADD(day, -7, GETDATE())
      AND (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
      AND [Data_Fechamento (Date-Hour-Minute-Second)] >= '2026-01-01 00:00:00'
      AND LOWER(LTRIM(RTRIM(Cliente))) != 'user - ams - teste'
    GROUP BY CAST([Data_Ultima_Modificacao (Year)] AS DATE)
    ORDER BY data_modificacao DESC
  `;
  
  const resultDistribuicao = await pool.request().query(queryDistribuicao);
  console.log(`📊 [SYNC] Distribuição de modificações (últimos 7 dias):`);
  resultDistribuicao.recordset.forEach((row: any) => {
    console.log(`   📅 ${row.data_modificacao}: ${row.quantidade} registros`);
  });
  
  // Query principal
  const query = `
    SELECT
      Empresa,
      Categoria,
      Grupo,
      Cliente,
      Email_Cliente,
      Prestador,
      Solicitante,
      Nro_Caso,
      Tipo_Caso,
      Ano_Abertura,
      Mes_abertura,
      [Data_Resposta (Date-Hour-Minute-Second)] as Data_Resposta,
      Resposta,
      Comentario_Pesquisa,
      Servico,
      Nome_Pesquisa,
      [Data_Fechamento (Date-Hour-Minute-Second)] as Data_Fechamento,
      [Data_Ultima_Modificacao (Year)] as Data_Ultima_Modificacao,
      Autor_Notificacao,
      Estado,
      Descricao,
      Pesquisa_Recebida,
      Pergunta,
      SequenciaPregunta,
      LOG
    FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
    WHERE [Data_Ultima_Modificacao (Year)] IS NOT NULL 
      AND CAST([Data_Ultima_Modificacao (Year)] AS DATETIME) >= @dataInicio
      AND (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
      AND [Data_Fechamento (Date-Hour-Minute-Second)] >= '2026-01-01 00:00:00'
      AND LOWER(LTRIM(RTRIM(Cliente))) != 'user - ams - teste'
    ORDER BY [Data_Ultima_Modificacao (Year)] DESC
  `;

  console.log(`🔍 [SYNC] Filtros aplicados:`);
  console.log(`   - Data Modificação: >= ${dataInicio.toISOString()}`);
  console.log(`   - Grupo: Excluindo 'AMS SAP%'`);
  console.log(`   - Data Fechamento: >= 2026-01-01`);
  console.log(`   - Cliente: Excluindo 'user - ams - teste'`);
  
  const result = await pool.request()
    .input('dataInicio', sql.DateTime, dataInicio)
    .query(query);

  console.log(`✅ [SYNC] ${result.recordset.length} registros encontrados no SQL Server`);
  
  // Log dos primeiros 5 registros para debug
  if (result.recordset.length > 0) {
    console.log('📋 [SYNC] Primeiros 5 registros encontrados (ordenados por data de modificação):');
    result.recordset.slice(0, 5).forEach((reg: any, idx: number) => {
      console.log(`   ${idx + 1}. ${reg.Nro_Caso} - ${reg.Cliente}`);
      console.log(`      📅 Data Modificação: ${reg.Data_Ultima_Modificacao}`);
      console.log(`      💬 Data Resposta: ${reg.Data_Resposta || 'SEM RESPOSTA'}`);
    });
  } else {
    console.log('⚠️ [SYNC] Nenhum registro encontrado com os filtros aplicados');
    console.log('⚠️ [SYNC] Isso significa que não há registros modificados após a data de início');
  }
  
  return result.recordset as DadosPesquisaSqlServer[];
}

/**
 * Verifica se registro existe no Supabase e retorna data de modificação e status
 */
async function buscarRegistroExistente(idExterno: string): Promise<{
  existe: boolean;
  dataModificacao: Date | null;
  id: string | null;
  status: string | null;
}> {
  const { data, error } = await supabase
    .from('pesquisas_satisfacao')
    .select('id, data_ultima_modificacao, status')
    .eq('id_externo', idExterno)
    .maybeSingle();

  if (error) {
    console.error('❌ [SYNC] Erro ao buscar registro existente:', error);
    throw error;
  }

  if (!data) {
    return { existe: false, dataModificacao: null, id: null, status: null };
  }

  const dataModificacao = data.data_ultima_modificacao 
    ? new Date(data.data_ultima_modificacao)
    : null;

  return { existe: true, dataModificacao, id: data.id, status: data.status };
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
 * Prepara dados da pesquisa para inserção/atualização
 */
function prepararDadosPesquisa(registro: DadosPesquisaSqlServer) {
  // Aplicar transformação automática para clientes com "-AMS"
  const transformacao = aplicarTransformacaoAMS({
    empresa: registro.Empresa || '',
    cliente: registro.Cliente || '',
    solicitante: registro.Solicitante || null
  });

  return {
    origem: 'sql_server' as const,
    empresa: transformacao.empresa,
    categoria: registro.Categoria || null,
    grupo: registro.Grupo || null,
    cliente: transformacao.cliente,
    email_cliente: registro.Email_Cliente || null,
    prestador: registro.Prestador || null,
    solicitante: transformacao.solicitante || null,
    nro_caso: registro.Nro_Caso || null,
    tipo_caso: registro.Tipo_Caso || null,
    ano_abertura: registro.Ano_Abertura ? parseInt(registro.Ano_Abertura) : null,
    mes_abertura: registro.Mes_abertura ? parseInt(registro.Mes_abertura) : null,
    data_resposta: formatarDataSemTimezone(registro.Data_Resposta),
    resposta: registro.Resposta || null,
    comentario_pesquisa: registro.Comentario_Pesquisa || null,
    status: 'pendente' as const,
    servico: registro.Servico || null,
    nome_pesquisa: registro.Nome_Pesquisa || null,
    data_fechamento: formatarDataSemTimezone(registro.Data_Fechamento),
    data_ultima_modificacao: formatarDataSemTimezone(registro.Data_Ultima_Modificacao),
    autor_notificacao: registro.Autor_Notificacao || null,
    estado: registro.Estado || null,
    descricao: registro.Descricao || null,
    pesquisa_recebida: registro.Pesquisa_Recebida || null,
    pergunta: registro.Pergunta || null,
    sequencia_pergunta: registro.SequenciaPregunta || null,
    log: formatarDataSemTimezone(registro.LOG)
  };
}

/**
 * Insere novo registro no Supabase
 */
async function inserirRegistro(idExterno: string, dados: any): Promise<void> {
  const { error } = await supabase
    .from('pesquisas_satisfacao')
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
async function atualizarRegistro(id: string, dados: any): Promise<void> {
  const { error } = await supabase
    .from('pesquisas_satisfacao')
    .update(dados)
    .eq('id', id);

  if (error) {
    console.error('❌ [SYNC] Erro ao atualizar registro:', error);
    throw error;
  }
}

/**
 * Processa um único registro (INSERT ou UPDATE)
 */
async function processarRegistro(
  registro: DadosPesquisaSqlServer,
  index: number,
  total: number,
  registrosIgnorados: Array<{nro_caso: string; cliente: string; status: string; motivo: string}>,
  camposAtualizados: Set<string>
): Promise<'inserido' | 'atualizado' | 'ignorado' | 'erro'> {
  try {
    // Preparar dados PRIMEIRO (aplica transformação AMS)
    const dados = prepararDadosPesquisa(registro);
    
    // Gerar ID único DEPOIS da transformação (usando dados transformados)
    const idExterno = [
      dados.empresa?.trim() || 'sem_empresa',
      dados.cliente?.trim() || 'sem_cliente',
      dados.nro_caso?.trim() || 'sem_caso'
    ].filter(Boolean).join('|');

    // Verificar se registro existe
    const { existe, dataModificacao, id, status } = await buscarRegistroExistente(idExterno);

    if (!existe) {
      // ✅ INSERT: Registro não existe
      await inserirRegistro(idExterno, dados);
      console.log(`✅ [SYNC] Registro ${index + 1}/${total}: INSERIDO (${dados.nro_caso} - ${dados.cliente})`);
      return 'inserido';
    }

    // 🔒 VALIDAÇÃO: Só atualizar se status = 'pendente'
    if (status !== 'pendente') {
      // Adicionar à lista de ignorados
      registrosIgnorados.push({
        nro_caso: dados.nro_caso || 'N/A',
        cliente: dados.cliente || 'N/A',
        status: status || 'N/A',
        motivo: `Status '${status}' não permite atualização`
      });
      
      console.log(`🔒 [SYNC] Registro ${index + 1}/${total}: BLOQUEADO - Status '${status}' não permite atualização`);
      console.log(`   📋 Nro Caso: ${dados.nro_caso}`);
      console.log(`   👤 Cliente: ${dados.cliente}`);
      console.log(`   🏢 Empresa: ${dados.empresa}`);
      
      return 'ignorado';
    }

    // Verificar se deve atualizar
    if (deveAtualizar(registro.Data_Ultima_Modificacao, dataModificacao)) {
      // ✅ UPDATE: Data SQL Server > Data Supabase E status = 'pendente'
      
      // Registrar campos que serão atualizados
      Object.keys(dados).forEach(campo => camposAtualizados.add(campo));
      
      await atualizarRegistro(id!, dados);
      
      console.log(`🔄 [SYNC] Registro ${index + 1}/${total}: ATUALIZADO (${dados.nro_caso} - ${dados.cliente})`);
      console.log(`   📅 Data SQL: ${registro.Data_Ultima_Modificacao?.toISOString()}`);
      console.log(`   📅 Data Supabase: ${dataModificacao?.toISOString()}`);
      console.log(`   🔑 Campo de comparação: data_ultima_modificacao`);
      
      return 'atualizado';
    }

    // ⏭️ SKIP: Data SQL Server <= Data Supabase (não sobrescrever)
    if (index % 50 === 0) { // Log apenas a cada 50 para não poluir
      console.log(`⏭️ [SYNC] Registro ${index + 1}/${total}: IGNORADO (${dados.nro_caso} - ${dados.cliente})`);
    }
    return 'ignorado';

  } catch (erro) {
    console.error(`💥 [SYNC] Erro ao processar registro ${index + 1}/${total}:`, erro);
    return 'erro';
  }
}

/**
 * Função principal de sincronização incremental
 */
export async function sincronizarPesquisasIncremental(
  pool: sql.ConnectionPool,
  dataInicialCustomizada?: string | null
): Promise<{
  sucesso: boolean;
  total_processados: number;
  inseridos: number;
  atualizados: number;
  ignorados: number;
  erros: number;
  mensagens: string[];
}> {
  // 🔍 DEBUG: Verificar se cliente Supabase está disponível
  console.log('🔍 [DEBUG SYNC] Cliente Supabase:', supabase ? 'OK' : 'UNDEFINED');
  console.log('🔍 [DEBUG SYNC] Tipo do cliente:', typeof supabase);
  
  if (!supabase) {
    console.error('❌ [DEBUG SYNC] Cliente Supabase está UNDEFINED!');
    throw new Error('Cliente Supabase não está disponível');
  }
  
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
    console.log('🚀 [SYNC] Iniciando sincronização incremental de pesquisas...');
    console.log(`🔍 [SYNC] Parâmetro dataInicialCustomizada recebido: "${dataInicialCustomizada}" (tipo: ${typeof dataInicialCustomizada})`);
    resultado.mensagens.push('Iniciando sincronização incremental baseada em Data_Ultima_Modificacao');

    // 1. Determinar data de início
    let dataInicio: Date;
    
    if (dataInicialCustomizada) {
      // Usar data customizada fornecida pelo usuário
      dataInicio = new Date(`${dataInicialCustomizada}T00:00:00.000Z`);
      console.log(`📅 [SYNC] Usando data inicial CUSTOMIZADA: ${dataInicio.toISOString()}`);
      resultado.mensagens.push(`📅 Data inicial customizada: ${dataInicio.toISOString()}`);
    } else {
      // Buscar última data sincronizada (comportamento padrão)
      const ultimaData = await buscarUltimaDataSincronizada();
      console.log(`📅 [SYNC] Última sincronização: ${ultimaData.toISOString()}`);
      resultado.mensagens.push(`✅ Última sincronização: ${ultimaData.toISOString()}`);

      // Calcular data de início com folga de 1 dia
      dataInicio = calcularDataInicioComFolga(ultimaData);
    }
    
    console.log(`📅 [SYNC] Data de início efetiva: ${dataInicio.toISOString()}`);
    resultado.mensagens.push(`🔍 Buscando desde: ${dataInicio.toISOString()}`);
    resultado.mensagens.push(`🔍 Incluindo pesquisas com e sem resposta modificadas após essa data`);

    // 3. Buscar registros modificados do SQL Server
    const registros = await buscarRegistrosModificados(pool, dataInicio);
    resultado.total_processados = registros.length;
    resultado.mensagens.push(`📊 ${registros.length} registros encontrados no SQL Server`);

    if (registros.length === 0) {
      console.log('✅ [SYNC] Nenhum registro novo ou modificado encontrado');
      resultado.sucesso = true;
      resultado.mensagens.push('Nenhum registro novo ou modificado para sincronizar');
      return resultado;
    }

    // 4. Processar cada registro
    console.log(`🔄 [SYNC] Processando ${registros.length} registros...`);
    resultado.mensagens.push(`🔄 Processando ${registros.length} registros...`);
    
    // Arrays para rastrear registros ignorados e campos atualizados
    const registrosIgnorados: Array<{nro_caso: string; cliente: string; status: string; motivo: string}> = [];
    const camposAtualizados = new Set<string>();
    
    for (let i = 0; i < registros.length; i++) {
      const registro = registros[i];
      
      // Log de progresso a cada 50 registros
      if (i % 50 === 0 && i > 0) {
        const mensagemProgresso = `📊 Progresso: ${i}/${registros.length} registros processados`;
        console.log(`📊 [SYNC] ${mensagemProgresso}`);
        resultado.mensagens.push(mensagemProgresso);
      }

      const resultadoProcessamento = await processarRegistro(registro, i, registros.length, registrosIgnorados, camposAtualizados);

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
        resultado.mensagens.push('⚠️ Sincronização interrompida devido a múltiplos erros');
        break;
      }
    }

    // 5. Resultado final
    resultado.sucesso = resultado.erros === 0;
    const mensagemFinal = `✅ Sincronização concluída: ${resultado.inseridos} inseridos, ${resultado.atualizados} atualizados, ${resultado.ignorados} ignorados, ${resultado.erros} erros`;
    resultado.mensagens.push(mensagemFinal);
    
    console.log('✅ [SYNC] ' + mensagemFinal);
    console.log('📊 [SYNC] Resultado detalhado:', resultado);
    
    // 6. Exibir resumo dos registros ignorados
    if (registrosIgnorados.length > 0) {
      console.log('\n🔒 ========================================');
      console.log(`🔒 REGISTROS IGNORADOS (${registrosIgnorados.length} total):`);
      console.log('🔒 ========================================');
      
      registrosIgnorados.forEach((reg, idx) => {
        console.log(`\n🔒 [${idx + 1}/${registrosIgnorados.length}]`);
        console.log(`   📋 Nro Caso: ${reg.nro_caso}`);
        console.log(`   👤 Cliente: ${reg.cliente}`);
        console.log(`   📊 Status: ${reg.status}`);
        console.log(`   ⚠️ Motivo: ${reg.motivo}`);
      });
      
      console.log('\n🔒 ========================================\n');
    }
    
    // 7. Exibir campos que foram atualizados
    if (camposAtualizados.size > 0) {
      console.log('\n📝 ========================================');
      console.log(`📝 CAMPOS ATUALIZADOS (${resultado.atualizados} registros):`);
      console.log('📝 ========================================');
      console.log('🔑 Campo de comparação: data_ultima_modificacao');
      console.log('📋 Campos atualizados em cada registro:');
      
      const camposArray = Array.from(camposAtualizados).sort();
      camposArray.forEach((campo, idx) => {
        console.log(`   ${idx + 1}. ${campo}`);
      });
      
      console.log('\n📝 ========================================\n');
    }

    return resultado;

  } catch (erro) {
    console.error('💥 [SYNC] Erro crítico na sincronização incremental:', erro);
    resultado.sucesso = false;
    resultado.mensagens.push(`❌ Erro crítico: ${erro instanceof Error ? erro.message : 'Erro desconhecido'}`);
    return resultado;
  }
}
