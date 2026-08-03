/**
 * Serviço de Sincronização Incremental de Pesquisas
 * 
 * Implementa sincronização inteligente baseada em Data_Fechamento (critério primário)
 * com atualização de respostas para registros pendentes (critério secundário).
 * 
 * Fluxo:
 * 1. INSERÇÃO DE NOVOS: Busca pesquisas com Data_Fechamento >= (última data fechamento sincronizada - 1 dia)
 *    - Se não existe no Supabase → INSERT
 *    - Se já existe → SKIP
 * 
 * 2. ATUALIZAÇÃO DE RESPOSTAS: Busca no SQL Server pesquisas que:
 *    - Já existem no Supabase com status = 'pendente' e data_resposta NULL
 *    - No SQL Server agora têm Data_Resposta preenchida
 *    → UPDATE apenas campos de resposta (data_resposta, resposta, comentario_pesquisa)
 * 
 * Filtros obrigatórios:
 * - Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL
 * - Data_Fechamento >= '2026-01-01 00:00:00'
 * - Cliente != 'user - ams - teste'
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
 * Busca a maior Data_Fechamento já sincronizada no Supabase (origem sql_server)
 */
async function buscarUltimaDataFechamento(): Promise<Date> {
  console.log('📅 [SYNC] Buscando última data de fechamento sincronizada no Supabase...');
  
  const { data, error } = await supabase
    .from('pesquisas_satisfacao')
    .select('data_fechamento')
    .eq('origem', 'sql_server')
    .not('data_fechamento', 'is', null)
    .order('data_fechamento', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('❌ [SYNC] Erro ao buscar última data de fechamento:', error);
    throw error;
  }

  if (!data || !data.data_fechamento) {
    // Se não houver registros, começar de 01/01/2026
    const dataInicial = new Date('2026-01-01T00:00:00.000Z');
    console.log('⚠️ [SYNC] Nenhum registro encontrado. Usando data inicial:', dataInicial.toISOString());
    return dataInicial;
  }

  const ultimaData = new Date(data.data_fechamento);
  console.log('✅ [SYNC] Última data de fechamento sincronizada:', ultimaData.toISOString());
  
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
 * Busca registros do SQL Server fechados após a data especificada
 * Critério primário: Data_Fechamento (quando o caso fecha, aparece na tabela)
 */
async function buscarRegistrosFechados(
  pool: sql.ConnectionPool,
  dataInicio: Date
): Promise<DadosPesquisaSqlServer[]> {
  console.log(`📊 [SYNC] Buscando registros fechados após ${dataInicio.toISOString()}...`);
  
  // Contar total de registros elegíveis
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
  
  // Contar registros fechados após dataInicio
  const queryFechados = `
    SELECT COUNT(*) as total_fechados
    FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
    WHERE [Data_Fechamento (Date-Hour-Minute-Second)] >= @dataInicio
      AND (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
      AND LOWER(LTRIM(RTRIM(Cliente))) != 'user - ams - teste'
  `;
  
  const resultFechados = await pool.request()
    .input('dataInicio', sql.DateTime, dataInicio)
    .query(queryFechados);
  const totalFechados = resultFechados.recordset[0].total_fechados;
  console.log(`📊 [SYNC] Registros fechados após ${dataInicio.toISOString()}: ${totalFechados}`);
  
  // Distribuição de fechamentos (últimos 7 dias)
  const queryDistribuicao = `
    SELECT 
      CAST([Data_Fechamento (Date-Hour-Minute-Second)] AS DATE) as data_fechamento,
      COUNT(*) as quantidade
    FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
    WHERE [Data_Fechamento (Date-Hour-Minute-Second)] >= DATEADD(day, -7, GETDATE())
      AND (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
      AND LOWER(LTRIM(RTRIM(Cliente))) != 'user - ams - teste'
    GROUP BY CAST([Data_Fechamento (Date-Hour-Minute-Second)] AS DATE)
    ORDER BY data_fechamento DESC
  `;
  
  const resultDistribuicao = await pool.request().query(queryDistribuicao);
  console.log(`📊 [SYNC] Distribuição de fechamentos (últimos 7 dias):`);
  resultDistribuicao.recordset.forEach((row: any) => {
    console.log(`   📅 ${row.data_fechamento}: ${row.quantidade} registros`);
  });
  
  // Query principal - buscar por Data_Fechamento
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
    WHERE [Data_Fechamento (Date-Hour-Minute-Second)] >= @dataInicio
      AND (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
      AND LOWER(LTRIM(RTRIM(Cliente))) != 'user - ams - teste'
    ORDER BY [Data_Fechamento (Date-Hour-Minute-Second)] DESC
  `;

  console.log(`🔍 [SYNC] Filtros aplicados:`);
  console.log(`   - Data Fechamento: >= ${dataInicio.toISOString()}`);
  console.log(`   - Grupo: Excluindo 'AMS SAP%'`);
  console.log(`   - Cliente: Excluindo 'user - ams - teste'`);
  
  const result = await pool.request()
    .input('dataInicio', sql.DateTime, dataInicio)
    .query(query);

  console.log(`✅ [SYNC] ${result.recordset.length} registros encontrados no SQL Server`);
  
  // Log dos primeiros 5 registros para debug
  if (result.recordset.length > 0) {
    console.log('📋 [SYNC] Primeiros 5 registros (ordenados por data de fechamento):');
    result.recordset.slice(0, 5).forEach((reg: any, idx: number) => {
      console.log(`   ${idx + 1}. ${reg.Nro_Caso} - ${reg.Cliente}`);
      console.log(`      📅 Data Fechamento: ${reg.Data_Fechamento}`);
      console.log(`      💬 Data Resposta: ${reg.Data_Resposta || 'SEM RESPOSTA'}`);
    });
  } else {
    console.log('⚠️ [SYNC] Nenhum registro encontrado com os filtros aplicados');
  }
  
  return result.recordset as DadosPesquisaSqlServer[];
}

/**
 * Verifica se registro existe no Supabase e retorna ID e status.
 * 
 * Estratégia de busca:
 * 1. Busca por nro_caso (chave natural única no sistema Aranda)
 * 2. Fallback: busca por id_externo (compatibilidade com registros antigos)
 */
async function buscarRegistroExistente(idExterno: string, empresa?: string, nroCaso?: string): Promise<{
  existe: boolean;
  id: string | null;
  status: string | null;
}> {
  // 1. Busca primária: nro_caso (sem filtrar empresa - o nro_caso é único no Aranda)
  if (nroCaso && nroCaso !== 'sem_caso' && nroCaso.trim() !== '') {
    const { data, error } = await supabase
      .from('pesquisas_satisfacao')
      .select('id, status')
      .eq('nro_caso', nroCaso)
      .eq('origem', 'sql_server')
      .maybeSingle();

    if (error && !error.message.includes('multiple')) {
      console.error('❌ [SYNC] Erro ao buscar por nro_caso:', error);
      throw error;
    }

    if (data) {
      return { existe: true, id: data.id, status: data.status };
    }
  }

  // 2. Fallback: busca por id_externo (registros sem nro_caso ou compatibilidade)
  const { data, error } = await supabase
    .from('pesquisas_satisfacao')
    .select('id, status')
    .eq('id_externo', idExterno)
    .maybeSingle();

  if (error) {
    console.error('❌ [SYNC] Erro ao buscar registro existente por id_externo:', error);
    throw error;
  }

  if (!data) {
    return { existe: false, id: null, status: null };
  }

  return { existe: true, id: data.id, status: data.status };
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
 * Processa um único registro (INSERT ou SKIP)
 * Na nova lógica baseada em Data_Fechamento, registros existentes são ignorados
 * (a atualização de respostas é feita em etapa separada)
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

    // Verificar se registro existe (busca por nro_caso primeiro, fallback por id_externo)
    const { existe, id, status } = await buscarRegistroExistente(
      idExterno, 
      dados.empresa?.trim(), 
      dados.nro_caso?.trim()
    );

    if (!existe) {
      // ✅ INSERT: Registro não existe
      await inserirRegistro(idExterno, dados);
      console.log(`✅ [SYNC] Registro ${index + 1}/${total}: INSERIDO (${dados.nro_caso} - ${dados.cliente})`);
      return 'inserido';
    }

    // Registro já existe — ignorar (atualização de respostas é feita na etapa 2)
    if (index % 100 === 0) { // Log apenas a cada 100 para não poluir
      console.log(`⏭️ [SYNC] Registro ${index + 1}/${total}: JÁ EXISTE (${dados.nro_caso} - ${dados.cliente})`);
    }
    return 'ignorado';

  } catch (erro) {
    console.error(`💥 [SYNC] Erro ao processar registro ${index + 1}/${total}:`, erro);
    return 'erro';
  }
}

/**
 * Função principal de sincronização incremental
 * 
 * Etapa 1: Inserir novos registros (baseado em Data_Fechamento)
 * Etapa 2: Atualizar respostas de registros pendentes sem resposta
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
  // Verificar se cliente Supabase está disponível
  if (!supabase) {
    console.error('❌ [SYNC] Cliente Supabase está UNDEFINED!');
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
    console.log('🚀 [SYNC] Iniciando sincronização incremental de pesquisas (baseada em Data_Fechamento)...');
    resultado.mensagens.push('Iniciando sincronização baseada em Data_Fechamento');

    // ========================================
    // ETAPA 1: INSERIR NOVOS REGISTROS
    // ========================================
    console.log('\n📥 [SYNC] ═══════════════════════════════════════');
    console.log('📥 [SYNC] ETAPA 1: INSERIR NOVOS REGISTROS');
    console.log('📥 [SYNC] ═══════════════════════════════════════\n');

    // Determinar data de início
    let dataInicio: Date;
    
    if (dataInicialCustomizada) {
      dataInicio = new Date(`${dataInicialCustomizada}T00:00:00.000Z`);
      console.log(`📅 [SYNC] Usando data inicial CUSTOMIZADA: ${dataInicio.toISOString()}`);
      resultado.mensagens.push(`📅 Data inicial customizada: ${dataInicio.toISOString()}`);
    } else {
      const ultimaDataFechamento = await buscarUltimaDataFechamento();
      console.log(`📅 [SYNC] Última data de fechamento sincronizada: ${ultimaDataFechamento.toISOString()}`);
      resultado.mensagens.push(`✅ Última data de fechamento: ${ultimaDataFechamento.toISOString()}`);

      // Calcular data de início com folga de 1 dia
      dataInicio = calcularDataInicioComFolga(ultimaDataFechamento);
    }
    
    console.log(`📅 [SYNC] Data de início efetiva: ${dataInicio.toISOString()}`);
    resultado.mensagens.push(`🔍 Buscando fechamentos desde: ${dataInicio.toISOString()}`);

    // Buscar registros fechados do SQL Server
    const registros = await buscarRegistrosFechados(pool, dataInicio);
    resultado.total_processados = registros.length;
    resultado.mensagens.push(`📊 ${registros.length} registros fechados encontrados no SQL Server`);

    if (registros.length > 0) {
      console.log(`🔄 [SYNC] Processando ${registros.length} registros (etapa 1 - inserção)...`);
      
      const registrosIgnorados: Array<{nro_caso: string; cliente: string; status: string; motivo: string}> = [];
      const camposAtualizados = new Set<string>();
      
      for (let i = 0; i < registros.length; i++) {
        const registro = registros[i];
        
        if (i % 50 === 0 && i > 0) {
          console.log(`📊 [SYNC] Progresso etapa 1: ${i}/${registros.length}`);
        }

        const resultadoProcessamento = await processarRegistro(registro, i, registros.length, registrosIgnorados, camposAtualizados);

        switch (resultadoProcessamento) {
          case 'inserido': resultado.inseridos++; break;
          case 'atualizado': resultado.atualizados++; break;
          case 'ignorado': resultado.ignorados++; break;
          case 'erro': resultado.erros++; break;
        }

        if (resultado.erros >= 10) {
          console.log('🛑 [SYNC] Muitos erros na etapa 1, parando...');
          resultado.mensagens.push('⚠️ Etapa 1 interrompida por erros');
          break;
        }
      }

      resultado.mensagens.push(`📥 Etapa 1 concluída: ${resultado.inseridos} inseridos, ${resultado.ignorados} já existiam`);
    } else {
      resultado.mensagens.push('📥 Etapa 1: Nenhum registro novo para inserir');
    }

    // ========================================
    // ETAPA 2: ATUALIZAR RESPOSTAS PENDENTES
    // ========================================
    console.log('\n📝 [SYNC] ═══════════════════════════════════════');
    console.log('📝 [SYNC] ETAPA 2: ATUALIZAR RESPOSTAS PENDENTES');
    console.log('📝 [SYNC] ═══════════════════════════════════════\n');

    const respostasAtualizadas = await atualizarRespostasPendentes(pool);
    resultado.atualizados += respostasAtualizadas.atualizados;
    resultado.erros += respostasAtualizadas.erros;
    resultado.total_processados += respostasAtualizadas.total_verificados;
    
    resultado.mensagens.push(`📝 Etapa 2: ${respostasAtualizadas.atualizados} respostas atualizadas de ${respostasAtualizadas.total_verificados} pendentes verificados`);

    // Resultado final
    resultado.sucesso = resultado.erros === 0;
    const mensagemFinal = `✅ Sincronização concluída: ${resultado.inseridos} inseridos, ${resultado.atualizados} atualizados, ${resultado.ignorados} ignorados, ${resultado.erros} erros`;
    resultado.mensagens.push(mensagemFinal);
    
    console.log('\n✅ [SYNC] ' + mensagemFinal);

    return resultado;

  } catch (erro) {
    console.error('💥 [SYNC] Erro crítico na sincronização incremental:', erro);
    resultado.sucesso = false;
    resultado.mensagens.push(`❌ Erro crítico: ${erro instanceof Error ? erro.message : 'Erro desconhecido'}`);
    return resultado;
  }
}

/**
 * Etapa 2: Buscar registros pendentes no Supabase sem resposta e verificar se o SQL Server já tem resposta
 * Se sim, atualizar apenas os campos de resposta
 */
async function atualizarRespostasPendentes(pool: sql.ConnectionPool): Promise<{
  total_verificados: number;
  atualizados: number;
  erros: number;
}> {
  const resultado = { total_verificados: 0, atualizados: 0, erros: 0 };

  try {
    // 1. Buscar no Supabase registros pendentes sem resposta (origem sql_server)
    console.log('📝 [SYNC] Buscando registros pendentes sem resposta no Supabase...');
    
    const { data: pendentes, error } = await supabase
      .from('pesquisas_satisfacao')
      .select('id, nro_caso, cliente, empresa')
      .eq('origem', 'sql_server')
      .eq('status', 'pendente')
      .is('data_resposta', null)
      .not('nro_caso', 'is', null);

    if (error) {
      console.error('❌ [SYNC] Erro ao buscar pendentes:', error);
      throw error;
    }

    if (!pendentes || pendentes.length === 0) {
      console.log('✅ [SYNC] Nenhum registro pendente sem resposta encontrado');
      return resultado;
    }

    console.log(`📝 [SYNC] ${pendentes.length} registros pendentes sem resposta encontrados`);
    resultado.total_verificados = pendentes.length;

    // 2. Buscar no SQL Server se esses nro_caso já têm resposta
    const nroCasos = pendentes.map(p => p.nro_caso).filter(Boolean);
    
    if (nroCasos.length === 0) {
      console.log('⚠️ [SYNC] Nenhum nro_caso válido para verificar');
      return resultado;
    }

    // Buscar em lotes de 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < nroCasos.length; i += BATCH_SIZE) {
      const lote = nroCasos.slice(i, i + BATCH_SIZE);
      const loteStr = lote.map(c => `'${c}'`).join(',');

      const query = `
        SELECT 
          Nro_Caso,
          [Data_Resposta (Date-Hour-Minute-Second)] as Data_Resposta,
          Resposta,
          Comentario_Pesquisa
        FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
        WHERE Nro_Caso IN (${loteStr})
          AND [Data_Resposta (Date-Hour-Minute-Second)] IS NOT NULL
          AND LTRIM(RTRIM(Resposta)) != ''
          AND Resposta IS NOT NULL
      `;

      const resultSql = await pool.request().query(query);
      
      if (resultSql.recordset.length === 0) {
        continue;
      }

      console.log(`📝 [SYNC] Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${resultSql.recordset.length} respostas encontradas no SQL Server`);

      // 3. Atualizar no Supabase
      for (const registro of resultSql.recordset) {
        try {
          const pendente = pendentes.find(p => p.nro_caso === registro.Nro_Caso);
          if (!pendente) continue;

          const dadosUpdate = {
            data_resposta: formatarDataSemTimezone(registro.Data_Resposta),
            resposta: registro.Resposta || null,
            comentario_pesquisa: registro.Comentario_Pesquisa || null
          };

          const { error: updateError } = await supabase
            .from('pesquisas_satisfacao')
            .update(dadosUpdate)
            .eq('id', pendente.id);

          if (updateError) {
            console.error(`❌ [SYNC] Erro ao atualizar resposta do caso ${registro.Nro_Caso}:`, updateError);
            resultado.erros++;
          } else {
            console.log(`📝 [SYNC] Resposta atualizada: ${registro.Nro_Caso} - "${registro.Resposta}"`);
            resultado.atualizados++;
          }
        } catch (err) {
          console.error(`💥 [SYNC] Erro ao processar resposta do caso ${registro.Nro_Caso}:`, err);
          resultado.erros++;
        }
      }
    }

    console.log(`✅ [SYNC] Etapa 2 concluída: ${resultado.atualizados} respostas atualizadas, ${resultado.erros} erros`);
    return resultado;

  } catch (erro) {
    console.error('💥 [SYNC] Erro na etapa de atualização de respostas:', erro);
    resultado.erros++;
    return resultado;
  }
}

/**
 * Busca um registro específico do SQL Server pelo Nro_Caso
 */
async function buscarRegistroPorNroCaso(
  pool: sql.ConnectionPool,
  nroCaso: string
): Promise<DadosPesquisaSqlServer | null> {
  console.log(`🔍 [SYNC-CASO] Buscando nro_caso="${nroCaso}" no SQL Server...`);

  // Busca o registro mais recente para esse Nro_Caso (maior Data_Ultima_Modificacao)
  const query = `
    WITH ranked AS (
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
        LOG,
        ROW_NUMBER() OVER (
          PARTITION BY Nro_Caso
          ORDER BY [Data_Ultima_Modificacao (Year)] DESC
        ) as rn
      FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
      WHERE Nro_Caso = @nroCaso
    )
    SELECT * FROM ranked WHERE rn = 1
  `;

  const result = await pool.request()
    .input('nroCaso', sql.VarChar, nroCaso)
    .query(query);

  if (result.recordset.length === 0) {
    console.warn(`⚠️ [SYNC-CASO] Nro_Caso "${nroCaso}" não encontrado no SQL Server`);
    return null;
  }

  if (result.recordset.length > 1) {
    console.warn(`⚠️ [SYNC-CASO] Nro_Caso "${nroCaso}" retornou ${result.recordset.length} registros — usando o primeiro`);
  }

  const registro = result.recordset[0] as DadosPesquisaSqlServer;
  console.log(`✅ [SYNC-CASO] Registro encontrado: ${registro.Nro_Caso} - ${registro.Cliente}`);
  console.log(`   📅 Data Modificação: ${registro.Data_Ultima_Modificacao}`);
  console.log(`   💬 Data Resposta: ${registro.Data_Resposta || 'SEM RESPOSTA'}`);
  console.log(`   📊 Resposta: ${registro.Resposta || 'N/A'}`);

  return registro;
}

/**
 * Força a sincronização de uma pesquisa específica pelo Nro_Caso.
 * Ignora a lógica de comparação de datas — sempre sobrescreve se status = 'pendente',
 * ou insere se o registro ainda não existe.
 */
export async function sincronizarPesquisaPorNroCaso(
  pool: sql.ConnectionPool,
  nroCaso: string
): Promise<{
  sucesso: boolean;
  operacao: 'inserido' | 'atualizado' | 'ignorado' | 'nao_encontrado' | 'erro';
  mensagem: string;
  dados?: any;
}> {
  console.log(`\n🎯 [SYNC-CASO] ========================================`);
  console.log(`🎯 [SYNC-CASO] Forçando sync do nro_caso: ${nroCaso}`);
  console.log(`🎯 [SYNC-CASO] ========================================\n`);

  try {
    // 1. Buscar no SQL Server
    const registro = await buscarRegistroPorNroCaso(pool, nroCaso);

    if (!registro) {
      return {
        sucesso: false,
        operacao: 'nao_encontrado',
        mensagem: `Nro_Caso "${nroCaso}" não encontrado no SQL Server`
      };
    }

    // 2. Preparar dados (aplica transformação AMS se necessário)
    const dados = prepararDadosPesquisa(registro);

    const idExterno = [
      dados.empresa?.trim() || 'sem_empresa',
      dados.cliente?.trim() || 'sem_cliente',
      dados.nro_caso?.trim() || 'sem_caso'
    ].filter(Boolean).join('|');

    // 3. Verificar se já existe no Supabase
    const { existe, id, status } = await buscarRegistroExistente(
      idExterno,
      dados.empresa?.trim(),
      dados.nro_caso?.trim()
    );

    if (!existe) {
      // INSERT
      await inserirRegistro(idExterno, dados);
      console.log(`✅ [SYNC-CASO] Registro INSERIDO com sucesso`);
      return {
        sucesso: true,
        operacao: 'inserido',
        mensagem: `Nro_Caso "${nroCaso}" inserido com sucesso`,
        dados: { id_externo: idExterno, ...dados }
      };
    }

    // 4. Se existe, verificar o status
    if (status !== 'pendente') {
      console.log(`🔒 [SYNC-CASO] Registro BLOQUEADO — status '${status}' não permite atualização`);
      return {
        sucesso: false,
        operacao: 'ignorado',
        mensagem: `Nro_Caso "${nroCaso}" não pode ser atualizado pois o status é '${status}' (somente 'pendente' é atualizável)`,
        dados: { id, status, id_externo: idExterno }
      };
    }

    // 5. Forçar UPDATE (ignora comparação de datas)
    await atualizarRegistro(id!, dados);
    console.log(`🔄 [SYNC-CASO] Registro ATUALIZADO com sucesso (força — sem comparação de datas)`);
    return {
      sucesso: true,
      operacao: 'atualizado',
      mensagem: `Nro_Caso "${nroCaso}" atualizado com sucesso (sync forçado)`,
      dados: { id, id_externo: idExterno, ...dados }
    };

  } catch (erro) {
    console.error(`💥 [SYNC-CASO] Erro ao sincronizar nro_caso "${nroCaso}":`, erro);
    return {
      sucesso: false,
      operacao: 'erro',
      mensagem: `Erro ao sincronizar nro_caso "${nroCaso}": ${erro instanceof Error ? erro.message : 'Erro desconhecido'}`
    };
  }
}
