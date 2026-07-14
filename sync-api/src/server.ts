/**
 * API Node.js para sincronização de pesquisas do SQL Server
 * Conecta ao banco Aranda (172.26.2.136) e sincroniza tabela AMSpesquisa
 */

import dotenv from 'dotenv';

// ⚠️ IMPORTANTE: Carregar variáveis de ambiente ANTES de importar os serviços
dotenv.config();

import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { sincronizarApontamentosIncremental } from './services/incrementalSyncApontamentosService';
import { sincronizarTicketsIncremental } from './services/incrementalSyncTicketsService';
import { sincronizarPesquisasIncremental } from './services/incrementalSyncPesquisasService';

const app = express();
app.use(cors());
app.use(express.json());

// Configuração SQL Server
const sqlConfig: sql.config = {
  server: process.env.SQL_SERVER || '172.26.2.136',
  port: parseInt(process.env.SQL_PORT || '10443'),
  database: process.env.SQL_DATABASE || 'Aranda',
  user: process.env.SQL_USER || 'amsconsulta',
  password: process.env.SQL_PASSWORD || 'ams@2023',
  options: {
    encrypt: false, // Para SQL Server local
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000, // 30 segundos
    requestTimeout: 30000,
    useUTC: false // IMPORTANTE: Não converter datas para UTC
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * Formata data para ISO string preservando o horário local
 * Extrai componentes da data sem conversão de timezone
 * @param date Data a ser formatada (pode ser Date ou string)
 * @returns String no formato ISO (YYYY-MM-DDTHH:mm:ss) ou null
 */
function formatarDataSemTimezone(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  
  try {
    // Converter para Date se for string
    const dataObj = date instanceof Date ? date : new Date(date);
    
    // Verificar se é uma data válida
    if (isNaN(dataObj.getTime())) {
      console.error('❌ Data inválida:', date);
      return null;
    }
    
    // Extrai componentes da data no horário local (sem conversão UTC)
    const year = dataObj.getFullYear();
    const month = String(dataObj.getMonth() + 1).padStart(2, '0');
    const day = String(dataObj.getDate()).padStart(2, '0');
    const hours = String(dataObj.getHours()).padStart(2, '0');
    const minutes = String(dataObj.getMinutes()).padStart(2, '0');
    const seconds = String(dataObj.getSeconds()).padStart(2, '0');
    
    // Retorna formato ISO preservando horário local
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  } catch (erro) {
    console.error('❌ Erro ao formatar data:', erro);
    return null;
  }
}

// Interface dos dados de pesquisas
interface DadosSqlServer {
  Empresa: string;
  Categoria: string;
  Grupo: string;
  Cliente: string;
  Email_Cliente: string;
  Prestador: string;
  Solicitante: string; // NOVO CAMPO ADICIONADO
  Nro_Caso: string;
  Tipo_Caso: string;
  Ano_Abertura: string;
  Mes_abertura: string;
  Data_Resposta: Date | null; // Pode ser null para pesquisas não respondidas
  Resposta: string;
  Comentario_Pesquisa: string;
  Servico: string | null;
  Nome_Pesquisa: string | null;
  Data_Fechamento: Date | null;
  Data_Ultima_Modificacao: Date | null;
  Autor_Notificacao: string | null;
  Estado: string | null;
  Descricao: string | null;
  Pesquisa_Recebida: string | null;
  Pergunta: string | null;
  SequenciaPregunta: string | null;
  LOG: Date | null;
}

// Interface dos dados de especialistas (estrutura real da tabela AMSespecialistas)
interface DadosEspecialistaSqlServer {
  user_name: string;
  user_email: string;
  user_active: boolean;
}

// Interface dos dados de apontamentos (estrutura da tabela AMSapontamento)
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
  Data_Ult_Modificacao_Geral: Date | null;
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
  Data_Ultima_Modificacao: Date | null;
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
 * Aplica transformação automática para clientes com "-AMS"
 */
function aplicarTransformacaoAMS(dados: {
  empresa: string;
  cliente: string;
  solicitante?: string | null;
}): {
  empresa: string;
  cliente: string;
  solicitante?: string | null;
  foiTransformado: boolean;
  motivoTransformacao?: string;
} {
  // Verificar se cliente contém "-AMS"
  const clienteContemAMS = dados.cliente && dados.cliente.includes('-AMS');
  
  if (!clienteContemAMS) {
    return {
      ...dados,
      foiTransformado: false
    };
  }

  // Verificar se há solicitante para substituir o cliente
  if (!dados.solicitante || dados.solicitante.trim() === '') {
    console.warn('⚠️ [TRANSFORMAÇÃO] Cliente contém "-AMS" mas solicitante está vazio:', {
      cliente: dados.cliente,
      solicitante: dados.solicitante
    });
    
    return {
      ...dados,
      foiTransformado: false,
      motivoTransformacao: 'Solicitante vazio - transformação não aplicada'
    };
  }

  // Aplicar transformação
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

  return {
    ...dadosTransformados,
    foiTransformado: true,
    motivoTransformacao: `Cliente "${dados.cliente}" contém "-AMS" - transformado para SONDA INTERNO`
  };
}

/**
 * Gerar ID único para registro de pesquisa
 * Padrão: Empresa|Cliente|Nro_Caso
 * IMPORTANTE: Não incluir Data_Resposta para evitar duplicação quando pesquisa for respondida
 */
function gerarIdUnico(registro: DadosSqlServer): string {
  const partes = [
    registro.Empresa,
    registro.Cliente,
    registro.Nro_Caso
  ].filter(Boolean);
  
  return partes.join('|');
}

/**
 * Converter texto para Mixed Case (Title Case) respeitando preposições em português
 * Ex: "VICTORIA HELENA DA SILVA ABREU" → "Victoria Helena da Silva Abreu"
 */
function toMixedCase(text: string): string {
  const preposicoes = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos']);
  return text.toLowerCase().split(' ').map((palavra, index) => {
    if (index > 0 && preposicoes.has(palavra)) return palavra;
    return palavra.charAt(0).toUpperCase() + palavra.slice(1);
  }).join(' ');
}

/**
 * Gerar ID único para registro de especialista
 * 
 * FORMATO: "AMSespecialistas|email_em_lowercase"
 * 
 * Usa EMAIL como chave principal para evitar duplicatas quando o nome 
 * muda no SQL Server (ex: casamento, correção de grafia).
 * Para registros sem email, usa nome + "sem_email" como fallback.
 */
function gerarIdUnicoEspecialista(registro: DadosEspecialistaSqlServer): string {
  // Se tem email, usar como chave principal (case-insensitive)
  if (registro.user_email && registro.user_email.trim() !== '') {
    return `AMSespecialistas|${registro.user_email.trim().toLowerCase()}`;
  }
  
  // Fallback para registros sem email: usar nome
  if (!registro.user_name || registro.user_name.trim() === '') {
    console.error('Erro: user_name e user_email são ambos vazios', registro);
    throw new Error(`user_name e user_email são ambos vazios. Registro: ${JSON.stringify(registro)}`);
  }
  
  return `AMSespecialistas|${toMixedCase(registro.user_name.trim()).toLowerCase()}|sem_email`;
}

/**
 * Gerar ID único para registro de apontamento
 */
function gerarIdUnicoApontamento(registro: DadosApontamentoSqlServer): string {
  // Validar se os campos obrigatórios existem
  if (!registro.Nro_Chamado || registro.Nro_Chamado.trim() === '') {
    console.error('Erro: Nro_Chamado é obrigatório para gerar ID único', registro);
    throw new Error(`Nro_Chamado é obrigatório para gerar ID único. Registro: ${JSON.stringify(registro)}`);
  }
  
  if (!registro.Nro_Tarefa || registro.Nro_Tarefa.trim() === '') {
    console.error('Erro: Nro_Tarefa é obrigatório para gerar ID único', registro);
    throw new Error(`Nro_Tarefa é obrigatório para gerar ID único. Registro: ${JSON.stringify(registro)}`);
  }
  
  const partes = [
    'AMSapontamento', // Prefixo para diferenciar de outras tabelas
    registro.Nro_Chamado.trim(),
    registro.Nro_Tarefa.trim()
  ].filter(Boolean);
  
  return partes.join('|');
}

/**
 * Gerar ID único para registro de ticket
 */
function gerarIdUnicoTicket(registro: DadosTicketSqlServer): string {
  // Validar se os campos obrigatórios existem
  if (!registro.Nro_Solicitacao || registro.Nro_Solicitacao.trim() === '') {
    console.error('Erro: Nro_Solicitacao é obrigatório para gerar ID único', registro);
    throw new Error(`Nro_Solicitacao é obrigatório para gerar ID único. Registro: ${JSON.stringify(registro)}`);
  }
  
  const partes = [
    'AMSticketsabertos', // Prefixo para diferenciar de outras tabelas
    registro.Nro_Solicitacao.trim(),
    registro.Data_Abertura?.toISOString() || 'sem_data'
  ].filter(Boolean);
  
  return partes.join('|');
}

/**
 * Debug: Remover registros antigos com cliente de teste
 */
app.post('/api/limpar-cliente-teste', async (req, res) => {
  try {
    console.log('🧹 [LIMPEZA] Removendo registros antigos com cliente de teste...');
    
    // Remover registros com cliente "User - Ams - Teste" do Supabase
    const { data, error } = await supabase
      .from('pesquisas_satisfacao')
      .delete()
      .eq('cliente', 'User - Ams - Teste');

    if (error) {
      console.error('❌ [LIMPEZA] Erro ao remover registros:', error);
      throw error;
    }

    console.log('✅ [LIMPEZA] Registros removidos com sucesso');
    
    res.json({
      success: true,
      message: 'Registros com cliente de teste removidos com sucesso'
    });
    
  } catch (error) {
    console.error('❌ [LIMPEZA] Erro na limpeza:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Debug: Verificar registros com cliente específico
 */
app.get('/api/debug-cliente-teste', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Verificando registros com cliente de teste...');
    const pool = await sql.connect(sqlConfig);
    
    const query = `
      SELECT TOP 10
        Cliente,
        Nro_Caso,
        LEN(Cliente) as tamanho_cliente,
        ASCII(SUBSTRING(Cliente, 1, 1)) as primeiro_char_ascii,
        ASCII(SUBSTRING(Cliente, LEN(Cliente), 1)) as ultimo_char_ascii
      FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
      WHERE Cliente LIKE '%User%Ams%Teste%'
      ORDER BY [Data_Resposta (Date-Hour-Minute-Second)] DESC
    `;
    
    const result = await pool.request().query(query);
    await pool.close();
    
    console.log('🔍 [DEBUG] Registros encontrados:', result.recordset);
    
    res.json({
      success: true,
      message: 'Debug de cliente de teste',
      registros: result.recordset,
      total_encontrados: result.recordset.length
    });
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro no debug:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Endpoint de health check
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    config: {
      server: sqlConfig.server,
      port: sqlConfig.port,
      database: sqlConfig.database,
      table: process.env.SQL_TABLE
    },
    warning: '⚠️ VPN necessária para conectar ao SQL Server'
  });
});

/**
 * Endpoint de validação da sincronização
 * Compara contagem de registros no SQL Server vs Supabase
 * Retorna diferenças e possíveis registros faltantes
 */
app.get('/api/validate-sync', async (req, res) => {
  const resultado = {
    timestamp: new Date().toISOString(),
    tabelas: {} as Record<string, any>,
    resumo: {
      total_tabelas: 0,
      tabelas_ok: 0,
      tabelas_com_diferenca: 0,
      tabelas_com_erro: 0
    }
  };

  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('🔍 [VALIDATE] Iniciando validação de sincronização...');
    
    // Conectar ao SQL Server
    pool = await sql.connect(sqlConfig);
    console.log('✅ [VALIDATE] Conectado ao SQL Server');

    // ==========================================
    // 1. VALIDAR PESQUISAS (AMSpesquisa)
    // ==========================================
    try {
      console.log('📊 [VALIDATE] Validando pesquisas...');
      
      // Contar no SQL Server (com os mesmos filtros do sync)
      const querySqlPesquisas = `
        SELECT COUNT(*) as total
        FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
        WHERE (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
          AND [Data_Fechamento (Date-Hour-Minute-Second)] >= '2026-01-01 00:00:00'
          AND LOWER(LTRIM(RTRIM(Cliente))) != 'user - ams - teste'
      `;
      const resultSqlPesquisas = await pool.request().query(querySqlPesquisas);
      const totalSqlPesquisas = resultSqlPesquisas.recordset[0].total;

      // Contar registros sem Data_Ultima_Modificacao (possíveis perdidos)
      const querySemModificacao = `
        SELECT COUNT(*) as total
        FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
        WHERE [Data_Ultima_Modificacao (Year)] IS NULL
          AND (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
          AND [Data_Fechamento (Date-Hour-Minute-Second)] >= '2026-01-01 00:00:00'
          AND LOWER(LTRIM(RTRIM(Cliente))) != 'user - ams - teste'
      `;
      const resultSemModificacao = await pool.request().query(querySemModificacao);
      const totalSemModificacao = resultSemModificacao.recordset[0].total;

      // Contar no Supabase
      const { count: totalSupabasePesquisas, error: errPesquisas } = await supabase
        .from('pesquisas_satisfacao')
        .select('*', { count: 'exact', head: true })
        .eq('origem', 'sql_server');
      
      if (errPesquisas) throw errPesquisas;

      const diferenca = totalSqlPesquisas - (totalSupabasePesquisas || 0);
      
      resultado.tabelas['pesquisas'] = {
        sql_server: totalSqlPesquisas,
        supabase: totalSupabasePesquisas || 0,
        diferenca: diferenca,
        sem_data_modificacao: totalSemModificacao,
        status: diferenca === 0 ? '✅ OK' : diferenca > 0 ? `⚠️ Faltam ${diferenca} registros` : `🔄 Supabase tem ${Math.abs(diferenca)} a mais`,
        nota: totalSemModificacao > 0 
          ? `⚠️ ${totalSemModificacao} registros no SQL Server sem Data_Ultima_Modificacao (não são capturados pelo sync incremental)` 
          : null
      };
      
      resultado.resumo.total_tabelas++;
      if (diferenca === 0) resultado.resumo.tabelas_ok++;
      else resultado.resumo.tabelas_com_diferenca++;
      
    } catch (error) {
      console.error('❌ [VALIDATE] Erro ao validar pesquisas:', error);
      resultado.tabelas['pesquisas'] = { 
        status: '❌ ERRO', 
        erro: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
      resultado.resumo.total_tabelas++;
      resultado.resumo.tabelas_com_erro++;
    }

    // ==========================================
    // 2. VALIDAR ESPECIALISTAS (AMSespecialistas)
    // ==========================================
    try {
      console.log('📊 [VALIDATE] Validando especialistas...');
      
      const resultSqlEsp = await pool.request().query('SELECT COUNT(*) as total FROM AMSespecialistas');
      const totalSqlEsp = resultSqlEsp.recordset[0].total;

      // Contar ativos no SQL
      const resultSqlEspAtivos = await pool.request().query("SELECT COUNT(*) as total FROM AMSespecialistas WHERE user_active = 1");
      const totalSqlEspAtivos = resultSqlEspAtivos.recordset[0].total;

      const { count: totalSupabaseEsp, error: errEsp } = await supabase
        .from('especialistas')
        .select('*', { count: 'exact', head: true })
        .eq('origem', 'sql_server');
      
      if (errEsp) throw errEsp;

      // Especialistas sincroniza TODOS (ativos + inativos) mas marca inativos
      const diferenca = totalSqlEsp - (totalSupabaseEsp || 0);
      
      resultado.tabelas['especialistas'] = {
        sql_server_total: totalSqlEsp,
        sql_server_ativos: totalSqlEspAtivos,
        supabase: totalSupabaseEsp || 0,
        diferenca: diferenca,
        status: diferenca === 0 ? '✅ OK' : diferenca > 0 ? `⚠️ Faltam ${diferenca} registros` : `🔄 Supabase tem ${Math.abs(diferenca)} a mais`
      };
      
      resultado.resumo.total_tabelas++;
      if (diferenca === 0) resultado.resumo.tabelas_ok++;
      else resultado.resumo.tabelas_com_diferenca++;
      
    } catch (error) {
      console.error('❌ [VALIDATE] Erro ao validar especialistas:', error);
      resultado.tabelas['especialistas'] = { 
        status: '❌ ERRO', 
        erro: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
      resultado.resumo.total_tabelas++;
      resultado.resumo.tabelas_com_erro++;
    }

    // ==========================================
    // 3. VALIDAR APONTAMENTOS (AMSapontamento)
    // ==========================================
    try {
      console.log('📊 [VALIDATE] Validando apontamentos...');
      
      const querySqlAp = `
        SELECT COUNT(*) as total
        FROM AMSapontamento
        WHERE Data_Ult_Modificacao_Geral IS NOT NULL
          AND (Caso_Grupo NOT LIKE 'AMS SAP%' OR Caso_Grupo IS NULL)
      `;
      const resultSqlAp = await pool.request().query(querySqlAp);
      const totalSqlAp = resultSqlAp.recordset[0].total;

      const { count: totalSupabaseAp, error: errAp } = await supabase
        .from('apontamentos_aranda')
        .select('*', { count: 'exact', head: true })
        .eq('origem', 'sql_server');
      
      if (errAp) throw errAp;

      const diferenca = totalSqlAp - (totalSupabaseAp || 0);
      
      resultado.tabelas['apontamentos'] = {
        sql_server: totalSqlAp,
        supabase: totalSupabaseAp || 0,
        diferenca: diferenca,
        status: diferenca === 0 ? '✅ OK' : diferenca > 0 ? `⚠️ Faltam ${diferenca} registros` : `🔄 Supabase tem ${Math.abs(diferenca)} a mais`
      };
      
      resultado.resumo.total_tabelas++;
      if (diferenca === 0) resultado.resumo.tabelas_ok++;
      else resultado.resumo.tabelas_com_diferenca++;
      
    } catch (error) {
      console.error('❌ [VALIDATE] Erro ao validar apontamentos:', error);
      resultado.tabelas['apontamentos'] = { 
        status: '❌ ERRO', 
        erro: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
      resultado.resumo.total_tabelas++;
      resultado.resumo.tabelas_com_erro++;
    }

    // ==========================================
    // 4. VALIDAR TICKETS (AMSticketsabertos)
    // ==========================================
    try {
      console.log('📊 [VALIDATE] Validando tickets...');
      
      const resultSqlTickets = await pool.request().query(`
        SELECT COUNT(*) as total FROM AMSticketsabertos
        WHERE Data_Ultima_Modificacao IS NOT NULL
          AND (Nome_grupo NOT LIKE 'AMS SAP%' OR Nome_grupo IS NULL)
      `);
      const totalSqlTickets = resultSqlTickets.recordset[0].total;

      const { count: totalSupabaseTickets, error: errTickets } = await supabase
        .from('apontamentos_tickets_aranda')
        .select('*', { count: 'exact', head: true });
      
      if (errTickets) throw errTickets;

      const diferenca = totalSqlTickets - (totalSupabaseTickets || 0);
      
      resultado.tabelas['tickets'] = {
        sql_server: totalSqlTickets,
        supabase: totalSupabaseTickets || 0,
        diferenca: diferenca,
        status: diferenca === 0 ? '✅ OK' : diferenca > 0 ? `⚠️ Faltam ${diferenca} registros` : `🔄 Supabase tem ${Math.abs(diferenca)} a mais`
      };
      
      resultado.resumo.total_tabelas++;
      if (diferenca === 0) resultado.resumo.tabelas_ok++;
      else resultado.resumo.tabelas_com_diferenca++;
      
    } catch (error) {
      console.error('❌ [VALIDATE] Erro ao validar tickets:', error);
      resultado.tabelas['tickets'] = { 
        status: '❌ ERRO', 
        erro: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
      resultado.resumo.total_tabelas++;
      resultado.resumo.tabelas_com_erro++;
    }

    // Fechar conexão
    await pool.close();

    console.log('✅ [VALIDATE] Validação concluída:', resultado.resumo);
    res.json(resultado);

  } catch (error) {
    console.error('❌ [VALIDATE] Erro fatal na validação:', error);
    if (pool) {
      try { await pool.close(); } catch (e) { /* ignore */ }
    }
    res.status(500).json({
      ...resultado,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Testar conexão SQL Server
 */
app.get('/api/test-connection', async (req, res) => {
  try {
    console.log('Testando conexão com SQL Server...');
    const pool = await sql.connect(sqlConfig);
    
    const result = await pool.request().query('SELECT @@VERSION as version');
    
    await pool.close();
    
    res.json({
      success: true,
      message: 'Conexão estabelecida com sucesso',
      version: result.recordset[0].version
    });
    
  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Consultar estrutura da tabela SQL Server
 */
app.get('/api/table-structure', async (req, res) => {
  try {
    console.log('Consultando estrutura da tabela...');
    const pool = await sql.connect(sqlConfig);
    
    const query = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${process.env.SQL_TABLE || 'AMSpesquisa'}'
      ORDER BY ORDINAL_POSITION
    `;
    
    const result = await pool.request().query(query);
    await pool.close();
    
    res.json({
      success: true,
      table: process.env.SQL_TABLE || 'AMSpesquisa',
      columns: result.recordset
    });
    
  } catch (error) {
    console.error('Erro ao consultar estrutura:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Sincronizar pesquisas do SQL Server (incremental)
 * NOTA: Temporariamente usando a função antiga até resolver o problema do serviço incremental
 */
app.post('/api/sync-pesquisas', async (req, res) => {
  // Usar a função antiga temporariamente
  await sincronizarPesquisas(req, res, false);
});

/**
 * Sincronização completa (todos os registros)
 */
app.post('/api/sync-pesquisas-full', async (req, res) => {
  await sincronizarPesquisas(req, res, true);
});

/**
 * Sincronizar pesquisas por lista de números de chamado (Nro_Caso)
 * Útil para trazer registros específicos que não foram capturados pelo sync incremental
 * 
 * Body: { chamados: ["8783877", "8784377", ...] }
 */
app.post('/api/sync-pesquisas-por-chamados', async (req, res) => {
  const { chamados } = req.body;
  
  if (!chamados || !Array.isArray(chamados) || chamados.length === 0) {
    return res.status(400).json({ 
      sucesso: false, 
      mensagem: 'Body deve conter "chamados" como array de strings. Ex: { "chamados": ["8783877", "8784377"] }' 
    });
  }

  const resultado = {
    sucesso: false,
    total_processados: 0,
    novos: 0,
    atualizados: 0,
    erros: 0,
    ignorados: 0,
    mensagens: [] as string[],
    detalhes_erros: [] as any[]
  };

  try {
    console.log(`🔄 [SYNC-CHAMADOS] Sincronizando ${chamados.length} chamados específicos...`);
    resultado.mensagens.push(`Buscando ${chamados.length} chamados específicos no SQL Server...`);

    const pool = await sql.connect(sqlConfig);
    console.log('✅ [SYNC-CHAMADOS] Conectado ao SQL Server');

    // Construir lista de chamados para a query IN
    const chamadosLista = chamados.map((c: string) => `'${c.trim()}'`).join(',');

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
      WHERE Nro_Caso IN (${chamadosLista})
      ORDER BY Nro_Caso ASC
    `;

    const result = await pool.request().query(query);
    const registros = result.recordset as DadosSqlServer[];
    
    resultado.total_processados = registros.length;
    console.log(`📊 [SYNC-CHAMADOS] ${registros.length} registros encontrados no SQL Server`);
    resultado.mensagens.push(`${registros.length} registros encontrados no SQL Server (de ${chamados.length} solicitados)`);

    await pool.close();

    if (registros.length === 0) {
      resultado.sucesso = true;
      resultado.mensagens.push('Nenhum registro encontrado com os chamados informados');
      return res.json(resultado);
    }

    // Chamados encontrados vs solicitados
    const chamadosEncontrados = new Set(registros.map(r => r.Nro_Caso?.trim()));
    const chamadosNaoEncontrados = chamados.filter((c: string) => !chamadosEncontrados.has(c.trim()));
    if (chamadosNaoEncontrados.length > 0) {
      resultado.mensagens.push(`⚠️ ${chamadosNaoEncontrados.length} chamados não encontrados no SQL Server: ${chamadosNaoEncontrados.slice(0, 10).join(', ')}${chamadosNaoEncontrados.length > 10 ? '...' : ''}`);
    }

    // Processar cada registro (mesma lógica do sync normal)
    for (let i = 0; i < registros.length; i++) {
      const registro = registros[i];
      
      try {
        const idUnico = gerarIdUnico(registro);
        
        // Verificar se já existe
        let existente: { id: string; status: string } | null = null;
        
        const nroCasoTrimmed = (registro.Nro_Caso || '').trim();
        
        if (nroCasoTrimmed) {
          const { data: existentePorCaso } = await supabase
            .from('pesquisas_satisfacao')
            .select('id, status, id_externo')
            .eq('nro_caso', nroCasoTrimmed)
            .eq('origem', 'sql_server')
            .maybeSingle();
          
          if (existentePorCaso) {
            existente = existentePorCaso;
          }
        }
        
        if (!existente) {
          const { data: existentePorId } = await supabase
            .from('pesquisas_satisfacao')
            .select('id, status')
            .eq('id_externo', idUnico)
            .maybeSingle();
          existente = existentePorId;
        }

        // Transformação AMS
        const transformacao = aplicarTransformacaoAMS({
          empresa: registro.Empresa || '',
          cliente: registro.Cliente || '',
          solicitante: registro.Solicitante || null
        });

        const dadosPesquisa = {
          origem: 'sql_server' as const,
          id_externo: idUnico,
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

        if (existente) {
          if (existente.status !== 'pendente') {
            console.log(`🔒 [SYNC-CHAMADOS] Chamado ${nroCasoTrimmed} BLOQUEADO - status '${existente.status}'`);
            resultado.ignorados++;
            continue;
          }
          
          const { error } = await supabase
            .from('pesquisas_satisfacao')
            .update({
              ...dadosPesquisa,
              autor_nome: 'SQL Server Sync (por chamado)'
            })
            .eq('id', existente.id);

          if (error) throw error;
          resultado.atualizados++;
          console.log(`✅ [SYNC-CHAMADOS] Chamado ${nroCasoTrimmed} atualizado`);
        } else {
          const { error } = await supabase
            .from('pesquisas_satisfacao')
            .insert({
              ...dadosPesquisa,
              autor_id: null,
              autor_nome: 'SQL Server Sync (por chamado)'
            });

          if (error) throw error;
          resultado.novos++;
          console.log(`✅ [SYNC-CHAMADOS] Chamado ${nroCasoTrimmed} inserido`);
        }
      } catch (erro) {
        resultado.erros++;
        resultado.detalhes_erros.push({
          chamado: registro.Nro_Caso,
          erro: erro instanceof Error ? erro.message : 'Erro desconhecido'
        });
        console.error(`❌ [SYNC-CHAMADOS] Erro no chamado ${registro.Nro_Caso}:`, erro);
      }
    }

    resultado.sucesso = resultado.erros === 0;
    resultado.mensagens.push(`Concluído: ${resultado.novos} novos, ${resultado.atualizados} atualizados, ${resultado.ignorados} ignorados, ${resultado.erros} erros`);
    
    console.log(`📊 [SYNC-CHAMADOS] Resultado:`, resultado);
    return res.json(resultado);

  } catch (erro) {
    console.error('💥 [SYNC-CHAMADOS] Erro fatal:', erro);
    resultado.mensagens.push(`Erro: ${erro instanceof Error ? erro.message : 'Erro desconhecido'}`);
    resultado.erros++;
    return res.status(500).json(resultado);
  }
});

/**
 * NOVO: Endpoint de teste para sincronização incremental COM LOGS EM TEMPO REAL
 * Usa o novo serviço incremental (mesmo padrão de apontamentos)
 * Envia logs em tempo real via Server-Sent Events (SSE)
 */
app.post('/api/sync-pesquisas-incremental-test', async (req, res) => {
  // Modificar console.log ANTES de qualquer coisa
  const originalLog = console.log;
  
  // Ler data inicial customizada do body (se fornecida)
  const dataInicialCustomizada = req.body?.dataInicial || null;
  
  try {
    // Configurar headers para Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Desabilitar buffering do Nginx
    
    // Função para enviar log em tempo real
    const enviarLog = (mensagem: string) => {
      res.write(`data: ${JSON.stringify({ tipo: 'log', mensagem })}\n\n`);
    };
    
    // Interceptar console.log ANTES de iniciar
    console.log = (...args: any[]) => {
      const mensagem = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Enviar log em tempo real
      enviarLog(mensagem);
      
      // Chamar console.log original
      originalLog(...args);
    };
    
    enviarLog('🧪 [TEST] Iniciando sincronização incremental de pesquisas...');
    enviarLog(`� [TEST] Body recebido: ${JSON.stringify(req.body || {})}`);
    
    if (dataInicialCustomizada) {
      enviarLog(`� [TEST] Data inicial customizada: ${dataInicialCustomizada}`);
    } else {
      enviarLog('📅 [TEST] Sem data customizada — usando sincronização incremental automática');
    }
    
    // Conectar ao SQL Server
    enviarLog('🔌 [TEST] Conectando ao SQL Server...');
    const pool = await sql.connect(sqlConfig);
    enviarLog('✅ [TEST] Conectado ao SQL Server');
    
    // Executar sincronização incremental
    enviarLog('🔄 [TEST] Executando sincronização incremental...');
    
    const resultado = await sincronizarPesquisasIncremental(pool, dataInicialCustomizada);
    
    enviarLog('✅ [TEST] Sincronização incremental concluída');
    
    // Fechar conexão
    await pool.close();
    enviarLog('🔌 [TEST] Conexão SQL Server fechada');
    
    // ⚠️ NÃO RESTAURAR console.log AQUI - deixar para o final
    
    // Enviar resultado final
    const resultadoFinal = {
      tipo: 'resultado',
      sucesso: resultado.sucesso,
      total_processados: resultado.total_processados,
      novos: resultado.inseridos,
      atualizados: resultado.atualizados,
      ignorados: resultado.ignorados,
      erros: resultado.erros,
      mensagens: resultado.mensagens
    };
    
    res.write(`data: ${JSON.stringify(resultadoFinal)}\n\n`);
    
    // ✅ Restaurar console.log SOMENTE DEPOIS de enviar resultado final
    console.log = originalLog;
    
    res.end();
    
  } catch (error) {
    // Restaurar console.log em caso de erro
    console.log = originalLog;
    
    console.error('💥 [TEST] Erro na sincronização incremental:', error);
    console.error('💥 [TEST] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    
    const erroFinal = {
      tipo: 'erro',
      sucesso: false,
      total_processados: 0,
      novos: 0,
      atualizados: 0,
      ignorados: 0,
      erros: 1,
      mensagens: [
        'Erro fatal: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
        'Stack: ' + (error instanceof Error ? error.stack : 'N/A')
      ],
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : 'N/A'
    };
    
    res.write(`data: ${JSON.stringify(erroFinal)}\n\n`);
    res.end();
  }
});

// ============================================
// ENDPOINTS PARA ESPECIALISTAS
// ============================================

/**
 * Testar conexão com tabela AMSespecialistas
 */
app.get('/api/test-connection-especialistas', async (req, res) => {
  try {
    console.log('Testando conexão com tabela AMSespecialistas...');
    const pool = await sql.connect(sqlConfig);
    
    const result = await pool.request().query('SELECT TOP 1 * FROM AMSespecialistas');
    
    await pool.close();
    
    res.json({
      success: true,
      message: 'Conexão com AMSespecialistas estabelecida com sucesso',
      sample_record: result.recordset[0] || null
    });
    
  } catch (error) {
    console.error('Erro ao testar conexão AMSespecialistas:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Consultar estrutura da tabela AMSespecialistas
 */
app.get('/api/table-structure-especialistas', async (req, res) => {
  try {
    console.log('Consultando estrutura da tabela AMSespecialistas...');
    const pool = await sql.connect(sqlConfig);
    
    const query = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'AMSespecialistas'
      ORDER BY ORDINAL_POSITION
    `;
    
    const result = await pool.request().query(query);
    await pool.close();
    
    res.json({
      success: true,
      table: 'AMSespecialistas',
      columns: result.recordset
    });
    
  } catch (error) {
    console.error('Erro ao consultar estrutura AMSespecialistas:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Sincronizar especialistas do SQL Server
 */
app.post('/api/sync-especialistas', async (req, res) => {
  await sincronizarEspecialistas(req, res);
});

/**
 * Teste simples de especialistas
 */
app.get('/api/test-especialistas-simple', async (req, res) => {
  try {
    console.log('🧪 [TEST] Teste simples de especialistas...');
    
    // Teste 1: Conectar ao SQL Server
    console.log('🧪 [TEST] Teste 1: Conectando ao SQL Server...');
    const pool = await sql.connect(sqlConfig);
    console.log('✅ [TEST] SQL Server conectado');
    
    // Teste 2: Query simples
    console.log('🧪 [TEST] Teste 2: Executando query simples...');
    const result = await pool.request().query('SELECT COUNT(*) as total FROM AMSespecialistas');
    const total = result.recordset[0].total;
    console.log(`✅ [TEST] Total de registros na tabela: ${total}`);
    
    await pool.close();
    console.log('✅ [TEST] Conexão SQL Server fechada');
    
    // Teste 3: Conectar ao Supabase
    console.log('🧪 [TEST] Teste 3: Testando Supabase...');
    const { data, error } = await supabase
      .from('especialistas')
      .select('count')
      .eq('origem', 'sql_server');
    
    if (error) {
      console.error('❌ [TEST] Erro no Supabase:', error);
      throw error;
    }
    
    console.log('✅ [TEST] Supabase conectado');
    
    res.json({
      success: true,
      message: 'Todos os testes passaram',
      sql_server_total: total,
      supabase_connected: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TEST] Erro no teste:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : 'N/A',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Debug: Testar query de especialistas
 */
app.get('/api/debug-especialistas', async (req, res) => {
  try {
    console.log('Testando query de especialistas...');
    const pool = await sql.connect(sqlConfig);
    
    const query = `
      SELECT TOP 10
        user_name,
        user_email,
        user_active,
        CASE 
          WHEN user_name IS NULL THEN 'user_name_null'
          WHEN user_name = '' THEN 'user_name_empty'
          ELSE 'ok'
        END as status_validacao
      FROM AMSespecialistas
      ORDER BY user_name ASC
    `;
    
    const result = await pool.request().query(query);
    await pool.close();
    
    // Verificar se há registros com problemas
    const registrosComProblema = result.recordset.filter(r => r.status_validacao !== 'ok');
    
    res.json({
      success: true,
      message: 'Query executada com sucesso',
      sample_records: result.recordset,
      total_found: result.recordset.length,
      registros_com_problema: registrosComProblema.length,
      detalhes_problemas: registrosComProblema
    });
    
  } catch (error) {
    console.error('Erro no debug:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : 'N/A'
    });
  }
});

/**
 * Limpar dados e forçar sincronização desde 01/01/2025
 */
app.post('/api/reset-sync-2025', async (req, res) => {
  try {
    console.log('Limpando dados de 2025 para ressincronizar...');
    
    // Deletar todos os registros de 2025 do Supabase
    const { error } = await supabase
      .from('pesquisas_satisfacao')
      .delete()
      .gte('data_resposta', '2026-01-01T00:00:00.000Z');

    if (error) {
      throw error;
    }

    res.json({
      sucesso: true,
      mensagem: 'Dados de 2025 limpos. Execute /api/sync-pesquisas-2025 para ressincronizar tudo.'
    });

  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    res.status(500).json({
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Sincronizar TODOS os dados de 2025 em lotes
 */
app.post('/api/sync-pesquisas-2025', async (req, res) => {
  const resultadoGeral = {
    sucesso: false,
    total_lotes: 0,
    total_processados: 0,
    total_novos: 0,
    total_atualizados: 0,
    total_erros: 0,
    mensagens: [] as string[],
    lotes: [] as any[]
  };

  try {
    console.log('Iniciando sincronização completa de 2025...');
    resultadoGeral.mensagens.push('Iniciando sincronização completa de 2025...');

    let lote = 1;
    let continuar = true;

    while (continuar) {
      console.log(`\n=== LOTE ${lote} ===`);
      resultadoGeral.mensagens.push(`Processando lote ${lote}...`);

      // Criar uma requisição fake para reutilizar a função
      const fakeReq = { body: {} };
      const fakeRes = {
        json: (data: any) => data,
        status: (code: number) => ({ json: (data: any) => data })
      };

      // Executar sincronização incremental
      const resultado = await new Promise<any>((resolve) => {
        const originalJson = fakeRes.json;
        fakeRes.json = (data: any) => {
          resolve(data);
          return data;
        };
        sincronizarPesquisas(fakeReq, fakeRes as any, false);
      });

      // Acumular resultados
      resultadoGeral.total_lotes++;
      resultadoGeral.total_processados += resultado.total_processados;
      resultadoGeral.total_novos += resultado.novos;
      resultadoGeral.total_atualizados += resultado.atualizados;
      resultadoGeral.total_erros += resultado.erros;
      
      resultadoGeral.lotes.push({
        lote,
        processados: resultado.total_processados,
        novos: resultado.novos,
        atualizados: resultado.atualizados,
        erros: resultado.erros
      });

      console.log(`Lote ${lote}: ${resultado.novos} novos, ${resultado.atualizados} atualizados, ${resultado.erros} erros`);

      // Parar se não houver mais registros ou se houver muitos erros
      if (resultado.total_processados === 0 || resultado.erros >= 5) {
        continuar = false;
        if (resultado.total_processados === 0) {
          resultadoGeral.mensagens.push('Todos os registros de 2025 foram sincronizados!');
        } else {
          resultadoGeral.mensagens.push('Sincronização interrompida devido a erros');
        }
      }

      lote++;

      // Limite de segurança: máximo 100 lotes (50.000 registros)
      if (lote > 100) {
        continuar = false;
        resultadoGeral.mensagens.push('Limite de 100 lotes atingido');
      }

      // Aguardar 1 segundo entre lotes para não sobrecarregar
      if (continuar) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    resultadoGeral.sucesso = resultadoGeral.total_erros === 0;
    resultadoGeral.mensagens.push(
      `Sincronização completa: ${resultadoGeral.total_lotes} lotes, ${resultadoGeral.total_novos} novos, ${resultadoGeral.total_atualizados} atualizados, ${resultadoGeral.total_erros} erros`
    );

    console.log('\n=== RESUMO FINAL ===');
    console.log(resultadoGeral);

    res.json(resultadoGeral);

  } catch (error) {
    console.error('Erro na sincronização completa:', error);
    resultadoGeral.sucesso = false;
    resultadoGeral.mensagens.push(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    res.status(500).json(resultadoGeral);
  }
});

/**
 * Função principal de sincronização
 */
async function sincronizarPesquisas(req: any, res: any, sincronizacaoCompleta: boolean = false) {
  const resultado = {
    sucesso: false,
    total_processados: 0,
    novos: 0,
    atualizados: 0,
    erros: 0,
    filtrados: 0, // Novo campo para contar registros filtrados
    ignorados: 0, // Novo campo para contar registros ignorados (status bloqueado)
    mensagens: [] as string[],
    detalhes_erros: [] as any[]
  };

  try {
    console.log('Iniciando sincronização de pesquisas...');
    resultado.mensagens.push('Iniciando sincronização com SQL Server...');

    // Conectar ao SQL Server
    const pool = await sql.connect(sqlConfig);
    console.log('Conectado ao SQL Server');
    resultado.mensagens.push('Conectado ao SQL Server');

    let query: string;
    let ultimaDataSincronizacao: Date | null = null;

    if (sincronizacaoCompleta) {
      // Sincronização completa - buscar todos os registros (limitado a 1000)
      console.log('Modo: Sincronização COMPLETA');
      resultado.mensagens.push('Modo: Sincronização COMPLETA (até 1000 registros)');
      
      query = `
        SELECT TOP 100016
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
        WHERE (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
          AND [Data_Fechamento (Date-Hour-Minute-Second)] >= '2026-01-01 00:00:00'
          AND LOWER(LTRIM(RTRIM(Cliente))) != 'user - ams - teste'
        ORDER BY [Data_Resposta (Date-Hour-Minute-Second)] ASC
      `;
    } else {
      // Sincronização incremental - buscar apenas registros novos
      console.log('Modo: Sincronização INCREMENTAL');
      resultado.mensagens.push('Modo: Sincronização INCREMENTAL');

      // Buscar última data de sincronização no Supabase
      const { data: ultimoRegistro } = await supabase
        .from('pesquisas_satisfacao')
        .select('data_resposta')
        .eq('origem', 'sql_server')
        .order('data_resposta', { ascending: false })
        .limit(1)
        .maybeSingle();

      ultimaDataSincronizacao = ultimoRegistro?.data_resposta 
        ? new Date(ultimoRegistro.data_resposta)
        : new Date('2026-01-01T00:00:00.000Z'); // Data inicial: 01/01/2026

      console.log('Última sincronização:', ultimaDataSincronizacao.toISOString());
      resultado.mensagens.push(`Última sincronização: ${ultimaDataSincronizacao.toISOString()}`);

      query = `
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
        WHERE (
          -- Registros com resposta após a última sincronização
          ([Data_Resposta (Date-Hour-Minute-Second)] IS NOT NULL 
           AND [Data_Resposta (Date-Hour-Minute-Second)] > @ultimaData)
          OR
          -- Registros sem resposta (pesquisas enviadas mas não respondidas)
          [Data_Resposta (Date-Hour-Minute-Second)] IS NULL
        )
        AND (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
        AND [Data_Fechamento (Date-Hour-Minute-Second)] >= '2026-01-01 00:00:00'
        AND LOWER(LTRIM(RTRIM(Cliente))) != 'user - ams - teste'
        ORDER BY [Data_Resposta (Date-Hour-Minute-Second)] ASC
      `;
    }

    const request = pool.request();
    
    // Adicionar parâmetro apenas para sincronização incremental
    if (!sincronizacaoCompleta && ultimaDataSincronizacao) {
      request.input('ultimaData', sql.DateTime, ultimaDataSincronizacao);
    }
    
    const result = await request.query(query);
    const registros = result.recordset as DadosSqlServer[];
    
    resultado.total_processados = registros.length;
    resultado.mensagens.push(`${registros.length} registros encontrados no SQL Server`);
    console.log(`${registros.length} registros encontrados`);

    await pool.close();

    if (registros.length === 0) {
      console.log('⚠️ [PESQUISAS] Nenhum registro novo encontrado no SQL Server');
      
      // Buscar total de registros no Supabase para exibir no modal
      try {
        const { count: totalSupabase } = await supabase
          .from('pesquisas_satisfacao')
          .select('*', { count: 'exact', head: true })
          .eq('origem', 'sql_server');
        
        console.log(`📊 [PESQUISAS] Total de registros no Supabase: ${totalSupabase || 0}`);
        resultado.total_processados = totalSupabase || 0;
      } catch (error) {
        console.warn('⚠️ [PESQUISAS] Erro ao buscar total do Supabase:', error);
      }
      
      resultado.sucesso = true;
      resultado.mensagens.push('Nenhum registro novo para sincronizar');
      return res.json(resultado);
    }

    // Processar cada registro
    console.log('Iniciando processamento de registros...');
    resultado.mensagens.push('Iniciando processamento de registros...');
    
    for (let i = 0; i < registros.length; i++) {
      const registro = registros[i];
      
      if (i % 10 === 0) {
        console.log(`Processando registro ${i + 1}/${registros.length}...`);
      }
      
      try {
        // 🔍 DEBUG: Log do cliente para debug
        if (i < 5) { // Log apenas os primeiros 5 para não poluir
          console.log(`🔍 [DEBUG] Registro ${i + 1}: Cliente = "${registro.Cliente}" | Caso = "${registro.Nro_Caso}"`);
        }
        
        // 🚫 FILTRO: Pular registros com cliente "User - Ams - Teste"
        const clienteNormalizado = (registro.Cliente || '').trim().toLowerCase();
        const clienteTesteBloqueado = 'user - ams - teste';
        
        if (clienteNormalizado === clienteTesteBloqueado) {
          console.log(`⚠️ [FILTRO] Registro pulado - Cliente de teste: "${registro.Cliente}" (Caso: ${registro.Nro_Caso})`);
          console.log(`⚠️ [FILTRO] Cliente original: "${registro.Cliente}" | Normalizado: "${clienteNormalizado}"`);
          resultado.filtrados++; // Incrementar contador de filtrados
          continue; // Pular este registro
        }

        const idUnico = gerarIdUnico(registro);

        // Verificar se já existe - BUSCA POR nro_caso (chave natural no sistema Aranda)
        // O Nro_Caso é único no sistema de chamados, não precisa filtrar por empresa
        let existente: { id: string; status: string } | null = null;
        
        const nroCasoTrimmed = (registro.Nro_Caso || '').trim();
        
        if (nroCasoTrimmed && nroCasoTrimmed !== '') {
          const { data: existentePorCaso, error: erroCaso } = await supabase
            .from('pesquisas_satisfacao')
            .select('id, status, id_externo')
            .eq('nro_caso', nroCasoTrimmed)
            .eq('origem', 'sql_server')
            .maybeSingle();
          
          if (!erroCaso && existentePorCaso) {
            existente = existentePorCaso;
            // NÃO alterar id_externo - manter o original para evitar duplicatas
          }
        }
        
        // FALLBACK: busca por id_externo (se não encontrou por nro_caso)
        if (!existente) {
          const { data: existentePorId, error: erroConsulta } = await supabase
            .from('pesquisas_satisfacao')
            .select('id, status')
            .eq('id_externo', idUnico)
            .maybeSingle();
          
          if (erroConsulta) {
            console.error('Erro ao consultar registro existente:', erroConsulta);
            throw erroConsulta;
          }
          existente = existentePorId;
        }

        // Log dos tamanhos dos campos para debug
        if (i < 10) {
          console.log(`\nRegistro ${i + 1} - Tamanhos dos campos:`);
          console.log(`  Empresa: ${registro.Empresa?.length || 0} chars`);
          console.log(`  Categoria: ${registro.Categoria?.length || 0} chars`);
          console.log(`  Grupo: ${registro.Grupo?.length || 0} chars`);
          console.log(`  Cliente: ${registro.Cliente?.length || 0} chars`);
          console.log(`  Email_Cliente: ${registro.Email_Cliente?.length || 0} chars`);
          console.log(`  Prestador: ${registro.Prestador?.length || 0} chars`);
          console.log(`  Solicitante: ${registro.Solicitante?.length || 0} chars`);
          console.log(`  Nro_Caso: ${registro.Nro_Caso?.length || 0} chars`);
          console.log(`  Tipo_Caso: ${registro.Tipo_Caso?.length || 0} chars`);
          console.log(`  Resposta: ${registro.Resposta?.length || 0} chars`);
          console.log(`  Comentario_Pesquisa: ${registro.Comentario_Pesquisa?.length || 0} chars`);
          console.log(`  Ano_Abertura (raw): "${registro.Ano_Abertura}" (tipo: ${typeof registro.Ano_Abertura})`);
          console.log(`  Mes_abertura (raw): "${registro.Mes_abertura}" (tipo: ${typeof registro.Mes_abertura})`);
        }

        // Usar apenas 'pendente' por enquanto até descobrir os valores aceitos no enum
        const statusPesquisa = 'pendente' as const;

        // Aplicar transformação automática para clientes com "-AMS"
        const transformacao = aplicarTransformacaoAMS({
          empresa: registro.Empresa || '',
          cliente: registro.Cliente || '',
          solicitante: registro.Solicitante || null
        });

        const dadosPesquisa = {
          origem: 'sql_server' as const,
          id_externo: idUnico,
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
          status: statusPesquisa,
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

        // Validar valores numéricos antes de inserir
        if (dadosPesquisa.ano_abertura !== null) {
          if (isNaN(dadosPesquisa.ano_abertura) || dadosPesquisa.ano_abertura < 2000 || dadosPesquisa.ano_abertura > 2100) {
            console.error(`❌ [VALIDAÇÃO] Registro ${i + 1} - ano_abertura inválido: ${registro.Ano_Abertura} (convertido: ${dadosPesquisa.ano_abertura})`);
            throw new Error(`ano_abertura inválido: ${registro.Ano_Abertura}`);
          }
        }
        
        if (dadosPesquisa.mes_abertura !== null) {
          if (isNaN(dadosPesquisa.mes_abertura) || dadosPesquisa.mes_abertura < 1 || dadosPesquisa.mes_abertura > 12) {
            console.error(`❌ [VALIDAÇÃO] Registro ${i + 1} - mes_abertura inválido: ${registro.Mes_abertura} (convertido: ${dadosPesquisa.mes_abertura})`);
            throw new Error(`mes_abertura inválido: ${registro.Mes_abertura}`);
          }
        }

        // Log da transformação se aplicada
        if (transformacao.foiTransformado) {
          console.log(`🔄 [SYNC] Registro ${i + 1} - ${transformacao.motivoTransformacao}`);
        }

        if (existente) {
          // 🔒 VALIDAÇÃO: Só atualizar se status = 'pendente'
          if (existente.status !== 'pendente') {
            console.log(`🔒 [PESQUISAS] Registro ${i + 1} BLOQUEADO - Status '${existente.status}' não permite atualização (ID: ${idUnico})`);
            resultado.ignorados = (resultado.ignorados || 0) + 1;
            continue; // Pular este registro
          }
          
          // ✅ Registro já existe e status = 'pendente' - ATUALIZAR apenas os novos campos
          console.log(`🔄 [PESQUISAS] Registro ${i + 1} já existe - atualizando novos campos (ID: ${existente.id})`);
          
          // Atualizar APENAS os 11 novos campos + id_externo (corrigir para valor original do SQL Server)
          const { error } = await supabase
            .from('pesquisas_satisfacao')
            .update({
              id_externo: idUnico,
              empresa: transformacao.empresa,
              servico: dadosPesquisa.servico,
              nome_pesquisa: dadosPesquisa.nome_pesquisa,
              data_fechamento: dadosPesquisa.data_fechamento,
              data_ultima_modificacao: dadosPesquisa.data_ultima_modificacao,
              autor_notificacao: dadosPesquisa.autor_notificacao,
              estado: dadosPesquisa.estado,
              descricao: dadosPesquisa.descricao,
              pesquisa_recebida: dadosPesquisa.pesquisa_recebida,
              pergunta: dadosPesquisa.pergunta,
              sequencia_pergunta: dadosPesquisa.sequencia_pergunta,
              log: dadosPesquisa.log
            })
            .eq('id', existente.id);

          if (error) {
            console.error('Erro ao atualizar:', error);
            throw error;
          }
          resultado.atualizados++;
        } else {
          // ✅ Inserir novo registro
          const { error } = await supabase
            .from('pesquisas_satisfacao')
            .insert({
              ...dadosPesquisa,
              autor_id: null,
              autor_nome: 'SQL Server Sync'
            });

          if (error) {
            console.error('Erro ao inserir:', error);
            throw error;
          }
          resultado.novos++;
        }
      } catch (erro) {
        console.error(`Erro no registro ${i + 1}:`, erro);
        resultado.erros++;
        
        // Capturar detalhes completos do erro
        let erroMsg = 'Erro desconhecido';
        let erroDetalhes = {};
        
        if (erro instanceof Error) {
          erroMsg = erro.message;
          erroDetalhes = {
            message: erro.message,
            stack: erro.stack,
            name: erro.name
          };
        } else if (typeof erro === 'object' && erro !== null) {
          erroMsg = JSON.stringify(erro);
          erroDetalhes = erro;
        }
        
        console.error(`🔍 Detalhes completos do erro:`, erroDetalhes);
        
        resultado.detalhes_erros.push({
          registro: {
            Empresa: registro.Empresa,
            Cliente: registro.Cliente,
            Nro_Caso: registro.Nro_Caso
          },
          erro: erroMsg,
          detalhes: erroDetalhes
        });
        
        // Se houver muitos erros, parar
        if (resultado.erros >= 5) {
          console.log('Muitos erros detectados, parando sincronização...');
          resultado.mensagens.push('Sincronização interrompida devido a múltiplos erros');
          break;
        }
      }
    }
    
    console.log('Processamento concluído');

    resultado.sucesso = resultado.erros === 0;
    
    // Mensagem principal de resultado
    let mensagemResultado = `Sincronização concluída: ${resultado.novos} novos, ${resultado.atualizados} atualizados, ${resultado.erros} erros`;
    
    // Adicionar informação sobre registros filtrados se houver
    if (resultado.filtrados > 0) {
      mensagemResultado += `, ${resultado.filtrados} filtrados (cliente de teste)`;
      console.log(`🚫 [FILTRO] Total de registros filtrados: ${resultado.filtrados} (cliente "User - Ams - Teste")`);
    }
    
    // Adicionar informação sobre registros ignorados (status bloqueado) se houver
    if (resultado.ignorados > 0) {
      mensagemResultado += `, ${resultado.ignorados} ignorados (status bloqueado)`;
      console.log(`🔒 [BLOQUEIO] Total de registros ignorados: ${resultado.ignorados} (status diferente de 'pendente')`);
    }
    
    resultado.mensagens.push(mensagemResultado);

    console.log('Sincronização concluída:', resultado);
    res.json(resultado);

  } catch (error) {
    console.error('Erro na sincronização:', error);
    resultado.sucesso = false;
    resultado.mensagens.push(`Erro na sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    res.status(500).json(resultado);
  }
}

/**
 * Função principal de sincronização de especialistas
 */
async function sincronizarEspecialistas(req: any, res: any) {
  const resultado = {
    sucesso: false,
    total_processados: 0,
    novos: 0,
    atualizados: 0,
    removidos: 0,
    erros: 0,
    mensagens: [] as string[],
    detalhes_erros: [] as any[]
  };

  try {
    console.log('🔄 [ESPECIALISTAS] Iniciando sincronização de especialistas...');
    resultado.mensagens.push('Iniciando sincronização com SQL Server (AMSespecialistas)...');

    // Conectar ao SQL Server
    console.log('🔌 [ESPECIALISTAS] Tentando conectar ao SQL Server...');
    const pool = await sql.connect(sqlConfig);
    console.log('✅ [ESPECIALISTAS] Conectado ao SQL Server');
    resultado.mensagens.push('Conectado ao SQL Server');

    // Buscar todos os registros da tabela AMSespecialistas
    console.log('📋 [ESPECIALISTAS] Executando query...');
    const query = `
      SELECT
        user_name,
        user_email,
        user_active
      FROM AMSespecialistas
      WHERE user_name IS NOT NULL
        AND user_name != ''
      ORDER BY user_name ASC
    `;

    const result = await pool.request().query(query);
    const registros = result.recordset as DadosEspecialistaSqlServer[];
    
    console.log(`📊 [ESPECIALISTAS] ${registros.length} registros encontrados no SQL Server (antes da deduplicação)`);
    resultado.mensagens.push(`${registros.length} registros encontrados no SQL Server`);

    await pool.close();
    console.log('🔌 [ESPECIALISTAS] Conexão SQL Server fechada');

    if (registros.length === 0) {
      console.log('⚠️ [ESPECIALISTAS] Nenhum registro para sincronizar');
      resultado.sucesso = true;
      resultado.mensagens.push('Nenhum registro para sincronizar');
      return res.json(resultado);
    }

    // Buscar todos os especialistas existentes no Supabase (origem sql_server)
    console.log('🔍 [ESPECIALISTAS] Consultando especialistas existentes no Supabase...');
    const { data: especialistasExistentes, error: erroConsulta } = await supabase
      .from('especialistas')
      .select('id, id_externo')
      .eq('origem', 'sql_server');

    if (erroConsulta) {
      console.error('❌ [ESPECIALISTAS] Erro ao consultar especialistas existentes:', erroConsulta);
      throw new Error(`Erro ao consultar Supabase: ${erroConsulta.message}`);
    }

    console.log(`📊 [ESPECIALISTAS] ${especialistasExistentes?.length || 0} especialistas existentes no Supabase`);
    const idsExistentes = new Set(especialistasExistentes?.map(e => e.id_externo) || []);
    const idsProcessados = new Set<string>();

    // Processar cada registro
    // DEDUPLICAÇÃO: Agrupar por email (ou nome se sem email), priorizando user_active = true
    console.log('🔄 [ESPECIALISTAS] Deduplicando registros...');
    const registrosPorChave = new Map<string, DadosEspecialistaSqlServer>();
    let registrosSemEmail = 0;
    
    for (const registro of registros) {
      const emailKey = registro.user_email?.trim().toLowerCase() || '';
      
      // Usar email como chave; se não tiver email, usar nome como chave
      let chave: string;
      if (emailKey) {
        chave = `email:${emailKey}`;
      } else {
        registrosSemEmail++;
        chave = `nome:${registro.user_name.trim().toLowerCase()}`;
      }
      
      const existente = registrosPorChave.get(chave);
      if (!existente) {
        registrosPorChave.set(chave, registro);
      } else {
        // Se o novo registro está ativo e o existente não, substituir
        if (registro.user_active && !existente.user_active) {
          registrosPorChave.set(chave, registro);
        }
        // Se ambos têm mesmo status, manter o último retornado pelo SQL Server (sobrescreve)
        else if (registro.user_active === existente.user_active) {
          registrosPorChave.set(chave, registro);
        }
      }
    }
    
    const registrosDeduplicados = Array.from(registrosPorChave.values());
    console.log(`📊 [ESPECIALISTAS] ${registrosDeduplicados.length} registros únicos (${registrosSemEmail} sem email usaram nome como chave, ${registros.length - registrosDeduplicados.length} duplicatas removidas)`);
    resultado.total_processados = registrosDeduplicados.length;
    resultado.mensagens.push(`${registrosDeduplicados.length} registros únicos (${registros.length - registrosDeduplicados.length} duplicatas removidas, ${registrosSemEmail} identificados por nome)`);
    
    console.log('🔄 [ESPECIALISTAS] Iniciando processamento de registros...');
    resultado.mensagens.push('Iniciando processamento de registros...');

    // Configuração de batch e threshold dinâmico
    const BATCH_SIZE = 200; // Registros por lote de upsert
    const PARALLEL_CHUNKS = 5; // Lotes processados em paralelo
    const ERROR_THRESHOLD_PERCENT = 5; // Parar se >5% dos registros derem erro
    const maxErrosPermitidos = Math.max(10, Math.ceil(registrosDeduplicados.length * ERROR_THRESHOLD_PERCENT / 100));
    console.log(`📊 [ESPECIALISTAS] Threshold de erros: ${maxErrosPermitidos} (${ERROR_THRESHOLD_PERCENT}% de ${registrosDeduplicados.length} registros)`);

    // Preparar todos os dados para upsert
    console.log('📋 [ESPECIALISTAS] Preparando dados para batch upsert...');
    const registrosParaUpsert: any[] = [];
    const registrosParaInsert: any[] = [];
    const registrosParaUpdate: any[] = [];

    for (const registro of registrosDeduplicados) {
      const idUnico = gerarIdUnicoEspecialista(registro);
      idsProcessados.add(idUnico);

      const dadosEspecialista = {
        origem: 'sql_server' as const,
        id_externo: idUnico,
        codigo: null,
        nome: toMixedCase(registro.user_name || ''),
        email: registro.user_email || null,
        telefone: null,
        cargo: null,
        departamento: null,
        empresa: null,
        especialidade: null,
        nivel: null,
        observacoes: null,
        status: (registro.user_active ? 'ativo' : 'inativo') as 'ativo' | 'inativo',
        autor_id: null,
        autor_nome: 'SQL Server Sync'
      };

      if (idsExistentes.has(idUnico)) {
        registrosParaUpdate.push(dadosEspecialista);
      } else {
        registrosParaInsert.push(dadosEspecialista);
      }
    }

    console.log(`📊 [ESPECIALISTAS] ${registrosParaInsert.length} para inserir, ${registrosParaUpdate.length} para atualizar`);

    // Função para processar um lote de inserts via upsert
    async function processarBatchInsert(batch: any[]): Promise<{ novos: number; erros: number; detalhes: any[] }> {
      const result = { novos: 0, erros: 0, detalhes: [] as any[] };
      
      const { error } = await supabase
        .from('especialistas')
        .upsert(batch, { onConflict: 'id_externo' });

      if (error) {
        console.error(`❌ [ESPECIALISTAS] Erro no batch insert (${batch.length} registros):`, error);
        // Fallback: tentar um por um para identificar registros problemáticos
        for (const registro of batch) {
          const { error: errIndividual } = await supabase
            .from('especialistas')
            .upsert(registro, { onConflict: 'id_externo' });

          if (errIndividual) {
            result.erros++;
            result.detalhes.push({
              registro: { id_externo: registro.id_externo, nome: registro.nome, email: registro.email },
              erro: errIndividual.message
            });
          } else {
            result.novos++;
          }
        }
      } else {
        result.novos = batch.length;
      }
      
      return result;
    }

    // Função para processar um lote de updates via upsert
    async function processarBatchUpdate(batch: any[]): Promise<{ atualizados: number; erros: number; detalhes: any[] }> {
      const result = { atualizados: 0, erros: 0, detalhes: [] as any[] };
      
      const { error } = await supabase
        .from('especialistas')
        .upsert(batch, { onConflict: 'id_externo' });

      if (error) {
        console.error(`❌ [ESPECIALISTAS] Erro no batch update (${batch.length} registros):`, error);
        // Fallback: tentar um por um
        for (const registro of batch) {
          const { error: errIndividual } = await supabase
            .from('especialistas')
            .upsert(registro, { onConflict: 'id_externo' });

          if (errIndividual) {
            result.erros++;
            result.detalhes.push({
              registro: { id_externo: registro.id_externo, nome: registro.nome, email: registro.email },
              erro: errIndividual.message
            });
          } else {
            result.atualizados++;
          }
        }
      } else {
        result.atualizados = batch.length;
      }
      
      return result;
    }

    // Dividir em batches
    function dividirEmBatches<T>(array: T[], tamanho: number): T[][] {
      const batches: T[][] = [];
      for (let i = 0; i < array.length; i += tamanho) {
        batches.push(array.slice(i, i + tamanho));
      }
      return batches;
    }

    // Processar INSERTS em paralelo por chunks
    if (registrosParaInsert.length > 0) {
      console.log(`➕ [ESPECIALISTAS] Processando ${registrosParaInsert.length} inserts em batches de ${BATCH_SIZE}...`);
      const batchesInsert = dividirEmBatches(registrosParaInsert, BATCH_SIZE);
      
      for (let i = 0; i < batchesInsert.length; i += PARALLEL_CHUNKS) {
        const chunksParalelos = batchesInsert.slice(i, i + PARALLEL_CHUNKS);
        const resultados = await Promise.all(chunksParalelos.map(batch => processarBatchInsert(batch)));
        
        for (const res of resultados) {
          resultado.novos += res.novos;
          resultado.erros += res.erros;
          resultado.detalhes_erros.push(...res.detalhes);
        }

        const processados = Math.min((i + PARALLEL_CHUNKS) * BATCH_SIZE, registrosParaInsert.length);
        console.log(`📝 [ESPECIALISTAS] Inserts: ${processados}/${registrosParaInsert.length} processados`);

        // Verificar threshold dinâmico
        if (resultado.erros >= maxErrosPermitidos) {
          console.log(`🛑 [ESPECIALISTAS] Threshold de erros atingido (${resultado.erros}/${maxErrosPermitidos}), parando inserts...`);
          resultado.mensagens.push(`Inserts interrompidos: ${resultado.erros} erros (threshold: ${maxErrosPermitidos})`);
          break;
        }
      }
    }

    // Processar UPDATES em paralelo por chunks (se não atingiu threshold)
    if (registrosParaUpdate.length > 0 && resultado.erros < maxErrosPermitidos) {
      console.log(`🔄 [ESPECIALISTAS] Processando ${registrosParaUpdate.length} updates em batches de ${BATCH_SIZE}...`);
      const batchesUpdate = dividirEmBatches(registrosParaUpdate, BATCH_SIZE);
      
      for (let i = 0; i < batchesUpdate.length; i += PARALLEL_CHUNKS) {
        const chunksParalelos = batchesUpdate.slice(i, i + PARALLEL_CHUNKS);
        const resultados = await Promise.all(chunksParalelos.map(batch => processarBatchUpdate(batch)));
        
        for (const res of resultados) {
          resultado.atualizados += res.atualizados;
          resultado.erros += res.erros;
          resultado.detalhes_erros.push(...res.detalhes);
        }

        const processados = Math.min((i + PARALLEL_CHUNKS) * BATCH_SIZE, registrosParaUpdate.length);
        console.log(`📝 [ESPECIALISTAS] Updates: ${processados}/${registrosParaUpdate.length} processados`);

        // Verificar threshold dinâmico
        if (resultado.erros >= maxErrosPermitidos) {
          console.log(`🛑 [ESPECIALISTAS] Threshold de erros atingido (${resultado.erros}/${maxErrosPermitidos}), parando updates...`);
          resultado.mensagens.push(`Updates interrompidos: ${resultado.erros} erros (threshold: ${maxErrosPermitidos})`);
          break;
        }
      }
    }

    console.log('✅ [ESPECIALISTAS] Processamento concluído');

    // ============================================================
    // MANUTENÇÃO: Inativar especialistas que não existem mais no SQL Server
    // ============================================================
    console.log('🧹 [ESPECIALISTAS] Verificando especialistas obsoletos para inativação...');
    resultado.mensagens.push('Verificando especialistas obsoletos...');

    // Buscar todos os especialistas ativos de origem sql_server no Supabase
    const { data: especialistasAtivos, error: erroAtivos } = await supabase
      .from('especialistas')
      .select('id, id_externo, nome, email')
      .eq('origem', 'sql_server')
      .eq('status', 'ativo');

    if (erroAtivos) {
      console.error('❌ [ESPECIALISTAS] Erro ao buscar especialistas ativos:', erroAtivos);
      resultado.mensagens.push(`Erro ao verificar obsoletos: ${erroAtivos.message}`);
    } else if (especialistasAtivos && especialistasAtivos.length > 0) {
      // Encontrar especialistas que não foram processados (não existem mais no SQL Server)
      const especialistasObsoletos = especialistasAtivos.filter(
        esp => esp.id_externo && !idsProcessados.has(esp.id_externo)
      );

      if (especialistasObsoletos.length > 0) {
        console.log(`⚠️ [ESPECIALISTAS] ${especialistasObsoletos.length} especialista(s) não encontrado(s) no SQL Server - inativando...`);
        resultado.mensagens.push(`${especialistasObsoletos.length} especialista(s) obsoleto(s) encontrado(s)`);

        for (const espObsoleto of especialistasObsoletos) {
          try {
            console.log(`🔄 [ESPECIALISTAS] Inativando: ${espObsoleto.nome} (${espObsoleto.email})`);

            // Verificar se existe outro especialista ativo com o mesmo nome para transferir relacionamentos
            const { data: especialistasComMesmoNome } = await supabase
              .from('especialistas')
              .select('id, nome, email, status')
              .eq('nome', espObsoleto.nome)
              .eq('status', 'ativo')
              .neq('id', espObsoleto.id);

            if (especialistasComMesmoNome && especialistasComMesmoNome.length > 0) {
              const substituto = especialistasComMesmoNome[0];
              console.log(`🔀 [ESPECIALISTAS] Encontrado substituto com mesmo nome: ${substituto.nome} (${substituto.email}) - transferindo relacionamentos...`);

              // Transferir relacionamentos de pesquisa_especialistas
              const { data: relPesquisas } = await supabase
                .from('pesquisa_especialistas')
                .select('id, pesquisa_id')
                .eq('especialista_id', espObsoleto.id);

              if (relPesquisas && relPesquisas.length > 0) {
                for (const rel of relPesquisas) {
                  // Verificar se o substituto já tem relacionamento com essa pesquisa
                  const { data: jaExisteRel } = await supabase
                    .from('pesquisa_especialistas')
                    .select('id')
                    .eq('pesquisa_id', rel.pesquisa_id)
                    .eq('especialista_id', substituto.id)
                    .maybeSingle();

                  if (jaExisteRel) {
                    // Já existe, apenas remover o antigo
                    await supabase.from('pesquisa_especialistas').delete().eq('id', rel.id);
                  } else {
                    // Transferir para o substituto
                    await supabase.from('pesquisa_especialistas').update({ especialista_id: substituto.id }).eq('id', rel.id);
                  }
                }
                console.log(`  ✅ ${relPesquisas.length} relacionamento(s) de pesquisa transferido(s)`);
              }

              // Transferir relacionamentos de elogio_especialistas
              const { data: relElogios } = await supabase
                .from('elogio_especialistas')
                .select('id, elogio_id')
                .eq('especialista_id', espObsoleto.id);

              if (relElogios && relElogios.length > 0) {
                for (const rel of relElogios) {
                  // Verificar se o substituto já tem relacionamento com esse elogio
                  const { data: jaExisteRel } = await supabase
                    .from('elogio_especialistas')
                    .select('id')
                    .eq('elogio_id', rel.elogio_id)
                    .eq('especialista_id', substituto.id)
                    .maybeSingle();

                  if (jaExisteRel) {
                    // Já existe, apenas remover o antigo
                    await supabase.from('elogio_especialistas').delete().eq('id', rel.id);
                  } else {
                    // Transferir para o substituto
                    await supabase.from('elogio_especialistas').update({ especialista_id: substituto.id }).eq('id', rel.id);
                  }
                }
                console.log(`  ✅ ${relElogios.length} relacionamento(s) de elogio transferido(s)`);
              }

              resultado.mensagens.push(`Relacionamentos de "${espObsoleto.nome}" transferidos para registro ativo (${substituto.email})`);
            }

            // Inativar o especialista obsoleto
            const { error: erroInativar } = await supabase
              .from('especialistas')
              .update({ status: 'inativo' })
              .eq('id', espObsoleto.id);

            if (erroInativar) {
              console.error(`❌ [ESPECIALISTAS] Erro ao inativar ${espObsoleto.nome}:`, erroInativar);
              resultado.erros++;
            } else {
              resultado.removidos++;
              console.log(`✅ [ESPECIALISTAS] Inativado: ${espObsoleto.nome} (${espObsoleto.email})`);
              resultado.mensagens.push(`Inativado: ${espObsoleto.nome} (${espObsoleto.email})`);
            }
          } catch (erroInativacao) {
            console.error(`❌ [ESPECIALISTAS] Erro ao processar inativação de ${espObsoleto.nome}:`, erroInativacao);
            resultado.erros++;
          }
        }
      } else {
        console.log('✅ [ESPECIALISTAS] Nenhum especialista obsoleto encontrado');
        resultado.mensagens.push('Nenhum especialista obsoleto encontrado');
      }
    }

    resultado.sucesso = resultado.erros === 0;
    resultado.mensagens.push(
      `Sincronização concluída: ${resultado.novos} novos, ${resultado.atualizados} atualizados, ${resultado.removidos} inativados, ${resultado.erros} erros`
    );

    console.log('📊 [ESPECIALISTAS] Sincronização de especialistas concluída:', resultado);
    res.json(resultado);

  } catch (error) {
    console.error('💥 [ESPECIALISTAS] Erro crítico na sincronização de especialistas:', error);
    console.error('🔍 [ESPECIALISTAS] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    
    resultado.sucesso = false;
    resultado.mensagens.push(`Erro na sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    
    // Adicionar detalhes do erro para debug
    resultado.detalhes_erros.push({
      registro: { acao: 'sincronizacao_geral' },
      erro: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : 'N/A'
    });
    
    res.status(500).json(resultado);
  }
}

/**
 * Buscar estatísticas de pesquisas (enviadas vs respondidas) com filtros
 */
app.get('/api/stats-pesquisas', async (req, res) => {
  try {
    const { ano, grupo } = req.query;
    
    // Validar ano
    const anoFiltro = ano ? parseInt(ano as string) : new Date().getFullYear();
    
    console.log(`Buscando estatísticas de pesquisas para ano ${anoFiltro}${grupo ? ` e grupo ${grupo}` : ''}...`);
    
    // Conectar ao SQL Server
    const pool = await sql.connect(sqlConfig);
    
    let whereClause = `
      WHERE Ano_Abertura = @ano
        AND (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
    `;
    
    // Adicionar filtro de grupo se especificado
    if (grupo && grupo !== 'todos') {
      // Mapear grupos principais para padrões de busca
      const grupoPatterns: Record<string, string> = {
        'FISCAL': '%FISCAL%',
        'COMEX': '%COMEX%',
        'QUALIDADE': '%QUALIDADE%',
        'BPO': '%BPO%'
      };
      
      const pattern = grupoPatterns[grupo as string] || `%${grupo}%`;
      whereClause += ` AND Grupo LIKE @grupoPattern`;
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_enviadas,
        COUNT([Data_Resposta (Date-Hour-Minute-Second)]) as total_respondidas,
        COUNT(CASE WHEN [Data_Resposta (Date-Hour-Minute-Second)] IS NULL THEN 1 END) as total_nao_respondidas
      FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
      ${whereClause}
    `;
    
    const request = pool.request();
    request.input('ano', sql.Int, anoFiltro);
    
    if (grupo && grupo !== 'todos') {
      const grupoPatterns: Record<string, string> = {
        'FISCAL': '%FISCAL%',
        'COMEX': '%COMEX%',
        'QUALIDADE': '%QUALIDADE%',
        'BPO': '%BPO%'
      };
      const pattern = grupoPatterns[grupo as string] || `%${grupo}%`;
      request.input('grupoPattern', sql.VarChar, pattern);
    }
    
    const result = await request.query(query);
    const stats = result.recordset[0];
    
    await pool.close();
    
    // Calcular taxa de resposta
    const taxaResposta = stats.total_enviadas > 0 
      ? ((stats.total_respondidas / stats.total_enviadas) * 100).toFixed(1)
      : '0.0';
    
    const response = {
      success: true,
      ano: anoFiltro,
      grupo: grupo || 'todos',
      estatisticas: {
        total_enviadas: stats.total_enviadas || 0,
        total_respondidas: stats.total_respondidas || 0,
        total_nao_respondidas: stats.total_nao_respondidas || 0,
        taxa_resposta: parseFloat(taxaResposta)
      }
    };
    
    console.log('Estatísticas calculadas:', response);
    res.json(response);
    
  } catch (error) {
    console.error('Erro ao buscar estatísticas de pesquisas:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Buscar estatísticas
 */
app.get('/api/stats', async (req, res) => {
  try {
    const { count: total } = await supabase
      .from('pesquisas_satisfacao')
      .select('*', { count: 'exact', head: true });

    const { count: sqlServer } = await supabase
      .from('pesquisas_satisfacao')
      .select('*', { count: 'exact', head: true })
      .eq('origem', 'sql_server');

    const { count: manuais } = await supabase
      .from('pesquisas_satisfacao')
      .select('*', { count: 'exact', head: true })
      .eq('origem', 'manual');

    res.json({
      total: total || 0,
      sql_server: sqlServer || 0,
      manuais: manuais || 0
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Debug: Analisar distribuição de grupos para entender discrepâncias
 */
app.get('/api/debug-grupos', async (req, res) => {
  try {
    const { ano } = req.query;
    const anoFiltro = ano ? parseInt(ano as string) : new Date().getFullYear();
    
    console.log(`Analisando distribuição de grupos para ano ${anoFiltro}...`);
    
    // Conectar ao SQL Server
    const pool = await sql.connect(sqlConfig);
    
    // Query para analisar todos os grupos
    const query = `
      SELECT 
        Grupo,
        COUNT(*) as total_enviadas,
        COUNT([Data_Resposta (Date-Hour-Minute-Second)]) as total_respondidas,
        COUNT(CASE WHEN [Data_Resposta (Date-Hour-Minute-Second)] IS NULL THEN 1 END) as total_nao_respondidas
      FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
      WHERE Ano_Abertura = @ano
        AND (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
      GROUP BY Grupo
      ORDER BY COUNT(*) DESC
    `;
    
    const request = pool.request();
    request.input('ano', sql.Int, anoFiltro);
    
    const result = await request.query(query);
    const grupos = result.recordset;
    
    // Query para total geral
    const queryTotal = `
      SELECT 
        COUNT(*) as total_enviadas,
        COUNT([Data_Resposta (Date-Hour-Minute-Second)]) as total_respondidas,
        COUNT(CASE WHEN [Data_Resposta (Date-Hour-Minute-Second)] IS NULL THEN 1 END) as total_nao_respondidas
      FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
      WHERE Ano_Abertura = @ano
        AND (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
    `;
    
    const resultTotal = await request.query(queryTotal);
    const totalGeral = resultTotal.recordset[0];
    
    await pool.close();
    
    // Calcular soma dos grupos principais
    const gruposPrincipais = ['FISCAL', 'COMEX', 'QUALIDADE', 'BPO'];
    let somaGruposPrincipais = {
      total_enviadas: 0,
      total_respondidas: 0,
      total_nao_respondidas: 0
    };
    
    grupos.forEach(grupo => {
      const nomeGrupo = grupo.Grupo || 'NULL';
      const pertenceAosPrincipais = gruposPrincipais.some(principal => 
        nomeGrupo.toUpperCase().includes(principal)
      );
      
      if (pertenceAosPrincipais) {
        somaGruposPrincipais.total_enviadas += grupo.total_enviadas;
        somaGruposPrincipais.total_respondidas += grupo.total_respondidas;
        somaGruposPrincipais.total_nao_respondidas += grupo.total_nao_respondidas;
      }
    });
    
    const response = {
      success: true,
      ano: anoFiltro,
      total_geral: totalGeral,
      soma_grupos_principais: somaGruposPrincipais,
      discrepancia: {
        enviadas: totalGeral.total_enviadas - somaGruposPrincipais.total_enviadas,
        respondidas: totalGeral.total_respondidas - somaGruposPrincipais.total_respondidas,
        nao_respondidas: totalGeral.total_nao_respondidas - somaGruposPrincipais.total_nao_respondidas
      },
      grupos_detalhados: grupos.map(g => ({
        grupo: g.Grupo || 'NULL',
        enviadas: g.total_enviadas,
        respondidas: g.total_respondidas,
        nao_respondidas: g.total_nao_respondidas,
        pertence_aos_principais: gruposPrincipais.some(principal => 
          (g.Grupo || '').toUpperCase().includes(principal)
        )
      }))
    };
    
    console.log('Análise de grupos:', response);
    res.json(response);
    
  } catch (error) {
    console.error('Erro ao analisar grupos:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// ============================================
// ENDPOINTS PARA APONTAMENTOS
// ============================================

/**
 * Testar conexão com tabela AMSapontamento
 */
app.get('/api/test-connection-apontamentos', async (req, res) => {
  try {
    console.log('Testando conexão com tabela AMSapontamento...');
    const pool = await sql.connect(sqlConfig);
    
    const result = await pool.request().query(`
      SELECT TOP 1 * 
      FROM AMSapontamento 
      WHERE Data_Abertura >= '2025-08-01 00:00:00'
    `);
    
    await pool.close();
    
    res.json({
      success: true,
      message: 'Conexão com AMSapontamento estabelecida com sucesso',
      sample_record: result.recordset[0] || null
    });
    
  } catch (error) {
    console.error('Erro ao testar conexão AMSapontamento:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Consultar estrutura da tabela AMSapontamento
 */
app.get('/api/table-structure-apontamentos', async (req, res) => {
  try {
    console.log('Consultando estrutura da tabela AMSapontamento...');
    const pool = await sql.connect(sqlConfig);
    
    const query = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'AMSapontamento'
      ORDER BY ORDINAL_POSITION
    `;
    
    const result = await pool.request().query(query);
    await pool.close();
    
    res.json({
      success: true,
      table: 'AMSapontamento',
      columns: result.recordset
    });
    
  } catch (error) {
    console.error('Erro ao consultar estrutura AMSapontamento:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Sincronizar apontamentos do SQL Server (incremental)
 * NOTA: Este endpoint agora usa o serviço incremental inteligente
 */
app.post('/api/sync-apontamentos', async (req, res) => {
  try {
    console.log('🚀 [API] Sincronização incremental de apontamentos (endpoint legado)...');
    
    // Conectar ao SQL Server
    const pool = await sql.connect(sqlConfig);
    console.log('✅ [API] Conectado ao SQL Server');
    
    // Executar sincronização incremental
    const resultado = await sincronizarApontamentosIncremental(pool);
    
    // Fechar conexão
    await pool.close();
    console.log('🔌 [API] Conexão SQL Server fechada');
    
    // Retornar resultado
    res.json({
      sucesso: resultado.sucesso,
      total_processados: resultado.total_processados,
      novos: resultado.inseridos,
      atualizados: resultado.atualizados,
      ignorados: resultado.ignorados,
      deletados: resultado.deletados,
      erros: resultado.erros,
      mensagens: resultado.mensagens
    });
    
  } catch (error) {
    console.error('💥 [API] Erro na sincronização:', error);
    res.status(500).json({
      sucesso: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : 'N/A'
    });
  }
});

/**
 * Sincronização completa de apontamentos
 * NOTA: Endpoint obsoleto - use /api/sync-apontamentos-incremental
 * Mantido apenas para compatibilidade
 */
app.post('/api/sync-apontamentos-full', async (req, res) => {
  try {
    console.log('⚠️ [API] Endpoint /api/sync-apontamentos-full está obsoleto');
    console.log('🚀 [API] Redirecionando para sincronização incremental...');
    
    // Conectar ao SQL Server
    const pool = await sql.connect(sqlConfig);
    console.log('✅ [API] Conectado ao SQL Server');
    
    // Executar sincronização incremental
    const resultado = await sincronizarApontamentosIncremental(pool);
    
    // Fechar conexão
    await pool.close();
    console.log('🔌 [API] Conexão SQL Server fechada');
    
    // Retornar resultado
    res.json({
      sucesso: resultado.sucesso,
      total_processados: resultado.total_processados,
      novos: resultado.inseridos,
      atualizados: resultado.atualizados,
      ignorados: resultado.ignorados,
      deletados: resultado.deletados,
      erros: resultado.erros,
      mensagens: [
        '⚠️ Este endpoint está obsoleto. Use /api/sync-apontamentos-incremental',
        ...resultado.mensagens
      ]
    });
    
  } catch (error) {
    console.error('💥 [API] Erro na sincronização:', error);
    res.status(500).json({
      sucesso: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : 'N/A'
    });
  }
});

/**
 * Sincronização incremental inteligente baseada em Data_Ult_Modificacao_Geral
 * 
 * Esta é a nova implementação que:
 * 1. Busca a maior Data_Ult_Modificacao_Geral do Supabase
 * 2. Busca registros do SQL Server >= (maior_data - 1 dia de folga)
 * 3. Para cada registro:
 *    - Se não existe → INSERT
 *    - Se existe e data SQL > data Supabase → UPDATE
 *    - Se existe e data SQL <= data Supabase → SKIP
 */
app.post('/api/sync-apontamentos-incremental', async (req, res) => {
  try {
    console.log('🚀 [API] Iniciando sincronização incremental de apontamentos...');
    
    // Conectar ao SQL Server
    const pool = await sql.connect(sqlConfig);
    console.log('✅ [API] Conectado ao SQL Server');
    
    // Executar sincronização incremental (busca TODOS os registros modificados)
    const resultado = await sincronizarApontamentosIncremental(pool);
    
    // Fechar conexão
    await pool.close();
    console.log('🔌 [API] Conexão SQL Server fechada');
    
    // Retornar resultado
    res.json({
      sucesso: resultado.sucesso,
      total_processados: resultado.total_processados,
      novos: resultado.inseridos,
      atualizados: resultado.atualizados,
      ignorados: resultado.ignorados,
      deletados: resultado.deletados,
      erros: resultado.erros,
      mensagens: resultado.mensagens
    });
    
  } catch (error) {
    console.error('💥 [API] Erro na sincronização incremental:', error);
    res.status(500).json({
      sucesso: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : 'N/A'
    });
  }
});

// ============================================
// ENDPOINT DE TESTE: RECONCILIAÇÃO POR CHAMADOS ESPECÍFICOS
// ============================================

/**
 * Teste de reconciliação de deleções para chamados específicos
 * 
 * POST /api/test-reconciliacao
 * Body: { chamados: ["6226725", "6461312", ...] }
 * 
 * Para cada chamado informado:
 * 1. Busca todas as tarefas no SQL Server
 * 2. Busca todas as tarefas no Supabase
 * 3. Identifica tarefas que existem APENAS no Supabase (foram deletadas na origem)
 * 4. Remove (hard-delete) essas tarefas do Supabase
 */
app.post('/api/test-reconciliacao', async (req, res) => {
  const { chamados, dryRun = false } = req.body;
  
  if (!chamados || !Array.isArray(chamados) || chamados.length === 0) {
    return res.status(400).json({
      sucesso: false,
      mensagem: 'Body deve conter "chamados" como array de strings. Ex: { "chamados": ["6226725", "6461312"] }. Opcional: "dryRun": true para apenas listar sem deletar.'
    });
  }

  const resultado = {
    sucesso: false,
    dryRun,
    total_chamados: chamados.length,
    total_chamados_verificados: 0,
    total_tarefas_sql_server: 0,
    total_tarefas_supabase: 0,
    total_orfaos_encontrados: 0,
    total_deletados: 0,
    erros: 0,
    detalhes_por_chamado: [] as any[],
    mensagens: [] as string[]
  };

  let pool: sql.ConnectionPool | null = null;

  try {
    console.log(`🔍 [TEST-RECONCILIAÇÃO] Iniciando teste para ${chamados.length} chamados (dryRun: ${dryRun})...`);
    resultado.mensagens.push(`Testando reconciliação para ${chamados.length} chamados`);
    if (dryRun) {
      resultado.mensagens.push('⚠️ MODO DRY-RUN: Nenhum registro será deletado');
    }

    // Conectar ao SQL Server
    pool = await sql.connect(sqlConfig);
    console.log('✅ [TEST-RECONCILIAÇÃO] Conectado ao SQL Server');

    // Processar em lotes de 50
    const BATCH_SIZE = 50;
    
    for (let batchStart = 0; batchStart < chamados.length; batchStart += BATCH_SIZE) {
      const batch = chamados.slice(batchStart, batchStart + BATCH_SIZE).map((c: string) => c.trim());

      try {
        // 1. Buscar todas as tarefas desses chamados no SQL Server
        const chamadosLista = batch.map((c: string) => `'${c.replace(/'/g, "''")}'`).join(',');
        
        const querySql = `
          SELECT Nro_Chamado, Nro_Tarefa
          FROM AMSapontamento
          WHERE Nro_Chamado IN (${chamadosLista})
            AND (Caso_Grupo NOT LIKE 'AMS SAP%' OR Caso_Grupo IS NULL)
        `;
        
        const resultSql = await pool.request().query(querySql);
        
        // Criar mapa: chamado → set de tarefas no SQL Server
        const tarefasPorChamadoSql = new Map<string, Set<string>>();
        for (const row of resultSql.recordset) {
          if (row.Nro_Chamado && row.Nro_Tarefa) {
            const chamado = row.Nro_Chamado.trim();
            if (!tarefasPorChamadoSql.has(chamado)) {
              tarefasPorChamadoSql.set(chamado, new Set());
            }
            tarefasPorChamadoSql.get(chamado)!.add(row.Nro_Tarefa.trim());
          }
        }

        resultado.total_tarefas_sql_server += resultSql.recordset.length;

        // 2. Buscar todas as tarefas desses chamados no Supabase
        const { data: registrosSupabase, error: errSupabase } = await supabase
          .from('apontamentos_aranda')
          .select('id, id_externo, nro_chamado, nro_tarefa')
          .in('nro_chamado', batch)
          .eq('origem', 'sql_server');

        if (errSupabase) {
          console.error('❌ [TEST-RECONCILIAÇÃO] Erro ao buscar Supabase:', errSupabase);
          resultado.erros++;
          resultado.mensagens.push(`Erro Supabase: ${errSupabase.message}`);
          continue;
        }

        resultado.total_tarefas_supabase += (registrosSupabase || []).length;

        // 3. Para cada chamado do batch, comparar
        for (const chamado of batch) {
          const tarefasSql = tarefasPorChamadoSql.get(chamado) || new Set();
          const registrosChamadoSupabase = (registrosSupabase || []).filter(r => r.nro_chamado === chamado);
          
          // Identificar órfãos
          const orfaos: any[] = [];
          for (const reg of registrosChamadoSupabase) {
            const nroTarefa = reg.nro_tarefa?.trim();
            if (nroTarefa && !tarefasSql.has(nroTarefa)) {
              orfaos.push({
                id: reg.id,
                id_externo: reg.id_externo,
                nro_tarefa: reg.nro_tarefa
              });
            }
          }

          if (orfaos.length > 0 || registrosChamadoSupabase.length > 0) {
            resultado.detalhes_por_chamado.push({
              chamado,
              tarefas_sql_server: tarefasSql.size,
              tarefas_supabase: registrosChamadoSupabase.length,
              orfaos_encontrados: orfaos.length,
              orfaos: orfaos.map(o => ({
                nro_tarefa: o.nro_tarefa,
                id_externo: o.id_externo
              }))
            });
          }

          resultado.total_orfaos_encontrados += orfaos.length;

          // 4. Deletar órfãos (se não for dry run)
          if (orfaos.length > 0 && !dryRun) {
            const idsParaDeletar = orfaos.map(o => o.id);
            
            const { error: errDelete } = await supabase
              .from('apontamentos_aranda')
              .delete()
              .in('id', idsParaDeletar);

            if (errDelete) {
              console.error(`❌ [TEST-RECONCILIAÇÃO] Erro ao deletar tarefas do chamado ${chamado}:`, errDelete);
              resultado.erros++;
              resultado.mensagens.push(`Erro ao deletar chamado ${chamado}: ${errDelete.message}`);
            } else {
              resultado.total_deletados += idsParaDeletar.length;
              console.log(`🗑️ [TEST-RECONCILIAÇÃO] Chamado ${chamado}: ${idsParaDeletar.length} tarefas removidas`);
            }
          }

          resultado.total_chamados_verificados++;
        }

      } catch (erro) {
        console.error(`❌ [TEST-RECONCILIAÇÃO] Erro no batch ${batchStart}:`, erro);
        resultado.erros++;
        resultado.mensagens.push(`Erro no batch: ${erro instanceof Error ? erro.message : 'Erro desconhecido'}`);
      }
    }

    // Fechar conexão
    await pool.close();

    // Resultado final
    resultado.sucesso = resultado.erros === 0;
    resultado.mensagens.push(
      `✅ Concluído: ${resultado.total_chamados_verificados} chamados verificados, ` +
      `${resultado.total_tarefas_sql_server} tarefas no SQL Server, ` +
      `${resultado.total_tarefas_supabase} tarefas no Supabase, ` +
      `${resultado.total_orfaos_encontrados} órfãos encontrados` +
      (dryRun ? ' (nenhum deletado - dry run)' : `, ${resultado.total_deletados} deletados`)
    );

    console.log(`✅ [TEST-RECONCILIAÇÃO] ${resultado.mensagens[resultado.mensagens.length - 1]}`);
    res.json(resultado);

  } catch (error) {
    console.error('💥 [TEST-RECONCILIAÇÃO] Erro fatal:', error);
    if (pool) {
      try { await pool.close(); } catch (e) { /* ignore */ }
    }
    res.status(500).json({
      ...resultado,
      sucesso: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// ============================================
// ENDPOINT PARA CORRIGIR CAMPOS NULL
// ============================================

/**
 * Corrigir campos NULL em apontamentos
 * 
 * Atualiza registros no Supabase que têm data_ult_modificacao_geral NULL
 * buscando os dados corretos do SQL Server
 * 
 * POST /api/fix-null-fields-apontamentos
 * Body (opcional):
 *   - limite: número máximo de registros a processar (padrão: 1000)
 * 
 * Retorna:
 *   - sucesso: boolean
 *   - total_processados: número de registros processados
 *   - atualizados: número de registros atualizados
 *   - nao_encontrados: número de registros não encontrados no SQL Server
 *   - erros: número de erros
 *   - mensagens: array de mensagens
 */
app.post('/api/fix-null-fields-apontamentos', async (req, res) => {
  try {
    console.log('🔧 [API] Iniciando correção de campos NULL em apontamentos...');
    
    // Importar serviço
    const { corrigirCamposNull } = await import('./services/fixNullFieldsService');
    
    // Conectar ao SQL Server
    const pool = await sql.connect(sqlConfig);
    console.log('✅ [API] Conectado ao SQL Server');
    
    // Executar correção
    const limite = req.body.limite || 1000; // Limite configurável via body
    const resultado = await corrigirCamposNull(pool, limite);
    
    // Fechar conexão
    await pool.close();
    console.log('🔌 [API] Conexão SQL Server fechada');
    
    // Retornar resultado
    res.json({
      sucesso: resultado.sucesso,
      total_processados: resultado.total_processados,
      atualizados: resultado.atualizados,
      nao_encontrados: resultado.nao_encontrados,
      erros: resultado.erros,
      mensagens: resultado.mensagens
    });
    
  } catch (error) {
    console.error('💥 [API] Erro na correção de campos NULL:', error);
    res.status(500).json({
      sucesso: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : 'N/A'
    });
  }
});

// ============================================
// ENDPOINT PARA SINCRONIZAR APONTAMENTOS POR CHAMADOS ESPECÍFICOS
// ============================================

/**
 * Sincronizar apontamentos de chamados específicos do SQL Server
 * 
 * POST /api/sync-apontamentos-por-chamados
 * Body: { chamados: ["2839891", "2852621", "2859886"] }
 * 
 * Busca TODOS os registros (tarefas) desses chamados no SQL Server,
 * independente da Data_Ult_Modificacao_Geral, e insere/atualiza no Supabase.
 */
app.post('/api/sync-apontamentos-por-chamados', async (req, res) => {
  const { chamados } = req.body;
  
  if (!chamados || !Array.isArray(chamados) || chamados.length === 0) {
    return res.status(400).json({ 
      sucesso: false, 
      erro: 'Body deve conter um array "chamados" com pelo menos 1 número de chamado' 
    });
  }

  const resultado = {
    sucesso: false,
    total_sql_server: 0,
    novos: 0,
    atualizados: 0,
    erros: 0,
    detalhes: [] as any[],
    mensagens: [] as string[]
  };

  let pool: sql.ConnectionPool | null = null;

  try {
    console.log(`🔍 [SYNC-POR-CHAMADO] Buscando ${chamados.length} chamados: ${chamados.join(', ')}`);
    resultado.mensagens.push(`Buscando chamados: ${chamados.join(', ')}`);

    // Conectar ao SQL Server
    pool = await sql.connect(sqlConfig);
    console.log('✅ [SYNC-POR-CHAMADO] Conectado ao SQL Server');

    // Buscar TODOS os registros desses chamados (sem filtro de data ou grupo)
    const placeholders = chamados.map((_: string, i: number) => `@chamado${i}`).join(', ');
    const query = `
      SELECT
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
      WHERE Nro_Chamado IN (${placeholders})
      ORDER BY Nro_Chamado, Nro_Tarefa
    `;

    const request = pool.request();
    chamados.forEach((chamado: string, i: number) => {
      request.input(`chamado${i}`, sql.VarChar, chamado.trim());
    });

    const sqlResult = await request.query(query);
    const registros = sqlResult.recordset;
    resultado.total_sql_server = registros.length;

    console.log(`📊 [SYNC-POR-CHAMADO] ${registros.length} registros encontrados no SQL Server`);
    resultado.mensagens.push(`${registros.length} registros (tarefas) encontrados no SQL Server`);

    if (registros.length === 0) {
      resultado.mensagens.push('⚠️ Nenhum registro encontrado para esses chamados no SQL Server');
      resultado.sucesso = true;
      await pool.close();
      return res.json(resultado);
    }

    // Log dos chamados encontrados
    const chamadosEncontrados = [...new Set(registros.map((r: any) => r.Nro_Chamado))];
    const chamadosNaoEncontrados = chamados.filter((c: string) => !chamadosEncontrados.includes(c));
    
    if (chamadosNaoEncontrados.length > 0) {
      resultado.mensagens.push(`⚠️ Chamados NÃO encontrados no SQL Server: ${chamadosNaoEncontrados.join(', ')}`);
    }

    // Processar cada registro
    for (const registro of registros) {
      try {
        const nroChamado = (registro.Nro_Chamado || '').trim();
        const nroTarefa = (registro.Nro_Tarefa || '').trim();
        
        if (!nroChamado || !nroTarefa) {
          console.warn(`⚠️ [SYNC-POR-CHAMADO] Registro sem Nro_Chamado ou Nro_Tarefa, pulando...`);
          resultado.erros++;
          continue;
        }

        const idExterno = `AMSapontamento|${nroChamado}|${nroTarefa}`;

        // Formatar datas
        const formatDate = (d: any) => {
          if (!d) return null;
          try {
            const dataObj = d instanceof Date ? d : new Date(d);
            if (isNaN(dataObj.getTime())) return null;
            const year = dataObj.getFullYear();
            const month = String(dataObj.getMonth() + 1).padStart(2, '0');
            const day = String(dataObj.getDate()).padStart(2, '0');
            const hours = String(dataObj.getHours()).padStart(2, '0');
            const minutes = String(dataObj.getMinutes()).padStart(2, '0');
            const seconds = String(dataObj.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
          } catch { return null; }
        };

        const dados = {
          origem: 'sql_server',
          id_externo: idExterno,
          nro_chamado: nroChamado,
          tipo_chamado: registro.Tipo_Chamado || null,
          org_us_final: registro.Org_Us_Final || null,
          categoria: registro.categoria || null,
          causa_raiz: registro.Causa_Raiz || null,
          solicitante: registro.Solicitante || null,
          us_final_afetado: registro.Us_Final_Afetado || null,
          data_abertura: formatDate(registro.Data_Abertura),
          data_sistema: formatDate(registro.Data_Sistema),
          data_atividade: formatDate(registro.Data_Atividade),
          data_fechamento: formatDate(registro.Data_Fechamento),
          data_ult_modificacao: formatDate(registro.Data_Ult_Modificacao),
          data_ult_modificacao_geral: formatDate(registro.Data_Ult_Modificacao_Geral),
          data_ult_modificacao_tarefa: formatDate(registro.Data_Ult_Modificacao_tarefa),
          ativi_interna: registro.Ativi_Interna || null,
          caso_estado: registro.Caso_Estado || null,
          caso_grupo: registro.Caso_Grupo || null,
          nro_tarefa: nroTarefa,
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
          log: formatDate(registro.LOG),
          autor_id: null,
          autor_nome: 'Sync Manual (por chamado)',
          source_updated_at: formatDate(registro.Data_Ult_Modificacao_Geral),
          synced_at: new Date().toISOString()
        };

        // Verificar se já existe no Supabase
        const { data: existente } = await supabase
          .from('apontamentos_aranda')
          .select('id')
          .eq('id_externo', idExterno)
          .maybeSingle();

        if (existente) {
          // Atualizar
          const { error } = await supabase
            .from('apontamentos_aranda')
            .update(dados)
            .eq('id_externo', idExterno);

          if (error) throw error;
          resultado.atualizados++;
          resultado.detalhes.push({ chamado: nroChamado, tarefa: nroTarefa, acao: 'atualizado' });
        } else {
          // Inserir
          const { error } = await supabase
            .from('apontamentos_aranda')
            .insert(dados);

          if (error) throw error;
          resultado.novos++;
          resultado.detalhes.push({ chamado: nroChamado, tarefa: nroTarefa, acao: 'inserido' });
        }

        console.log(`✅ [SYNC-POR-CHAMADO] ${nroChamado}/${nroTarefa} - ${existente ? 'atualizado' : 'inserido'}`);

      } catch (erro) {
        console.error(`❌ [SYNC-POR-CHAMADO] Erro:`, erro);
        resultado.erros++;
        resultado.detalhes.push({ 
          chamado: registro.Nro_Chamado, 
          tarefa: registro.Nro_Tarefa, 
          acao: 'erro', 
          erro: erro instanceof Error ? erro.message : 'Erro desconhecido' 
        });
      }
    }

    await pool.close();

    resultado.sucesso = resultado.erros === 0;
    resultado.mensagens.push(
      `Concluído: ${resultado.novos} inseridos, ${resultado.atualizados} atualizados, ${resultado.erros} erros`
    );

    console.log(`🏁 [SYNC-POR-CHAMADO] Resultado:`, resultado);
    res.json(resultado);

  } catch (error) {
    console.error('💥 [SYNC-POR-CHAMADO] Erro fatal:', error);
    if (pool) { try { await pool.close(); } catch (e) { /* ignore */ } }
    resultado.mensagens.push(`Erro fatal: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    res.status(500).json(resultado);
  }
});

// ============================================
// ENDPOINTS PARA TICKETS
// ============================================

/**
 * Testar conexão com tabela AMSticketsabertos
 */
app.get('/api/test-connection-tickets', async (req, res) => {
  try {
    console.log('Testando conexão com tabela AMSticketsabertos...');
    const pool = await sql.connect(sqlConfig);
    
    const result = await pool.request().query(`
      SELECT TOP 1 * 
      FROM AMSticketsabertos 
      WHERE Data_Abertura >= '2025-08-01 00:00:00'
    `);
    
    await pool.close();
    
    res.json({
      success: true,
      message: 'Conexão com AMSticketsabertos estabelecida com sucesso',
      sample_record: result.recordset[0] || null
    });
    
  } catch (error) {
    console.error('Erro ao testar conexão AMSticketsabertos:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Consultar estrutura da tabela AMSticketsabertos
 */
app.get('/api/table-structure-tickets', async (req, res) => {
  try {
    console.log('Consultando estrutura da tabela AMSticketsabertos...');
    const pool = await sql.connect(sqlConfig);
    
    const query = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'AMSticketsabertos'
      ORDER BY ORDINAL_POSITION
    `;
    
    const result = await pool.request().query(query);
    await pool.close();
    
    res.json({
      success: true,
      table: 'AMSticketsabertos',
      columns: result.recordset
    });
    
  } catch (error) {
    console.error('Erro ao consultar estrutura AMSticketsabertos:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Sincronizar tickets do SQL Server (incremental)
 * NOTA: Este endpoint agora usa o serviço incremental inteligente
 */
app.post('/api/sync-tickets', async (req, res) => {
  try {
    console.log('🚀 [API] Sincronização incremental de tickets (endpoint legado)...');
    
    // Conectar ao SQL Server
    const pool = await sql.connect(sqlConfig);
    
    // Usar novo serviço incremental
    const resultado = await sincronizarTicketsIncremental(pool);
    
    await pool.close();
    
    // Retornar resultado com mapeamento inseridos → novos (consistência com frontend)
    res.json({
      sucesso: resultado.sucesso,
      total_processados: resultado.total_processados,
      novos: resultado.inseridos,
      atualizados: resultado.atualizados,
      ignorados: resultado.ignorados,
      erros: resultado.erros,
      mensagens: resultado.mensagens
    });
    
  } catch (error) {
    console.error('❌ [API] Erro na sincronização de tickets:', error);
    res.status(500).json({
      sucesso: false,
      total_processados: 0,
      inseridos: 0,
      atualizados: 0,
      ignorados: 0,
      erros: 1,
      mensagens: [`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]
    });
  }
});

/**
 * Sincronização completa de tickets
 * NOTA: Endpoint obsoleto - use /api/sync-tickets-incremental
 * Mantido apenas para compatibilidade
 */
app.post('/api/sync-tickets-full', async (req, res) => {
  try {
    console.log('⚠️ [API] Endpoint /api/sync-tickets-full está obsoleto');
    console.log('🚀 [API] Redirecionando para sincronização incremental...');
    
    // Conectar ao SQL Server
    const pool = await sql.connect(sqlConfig);
    
    // Usar serviço incremental (mesmo para "full")
    const resultado = await sincronizarTicketsIncremental(pool);
    
    await pool.close();
    
    res.json({
      sucesso: resultado.sucesso,
      total_processados: resultado.total_processados,
      novos: resultado.inseridos,
      atualizados: resultado.atualizados,
      ignorados: resultado.ignorados,
      erros: resultado.erros,
      mensagens: [
        '⚠️ Este endpoint está obsoleto. Use /api/sync-tickets-incremental',
        ...resultado.mensagens
      ]
    });
    
  } catch (error) {
    console.error('❌ [API] Erro na sincronização de tickets:', error);
    res.status(500).json({
      sucesso: false,
      total_processados: 0,
      novos: 0,
      atualizados: 0,
      ignorados: 0,
      erros: 1,
      mensagens: [`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]
    });
  }
});

/**
 * Sincronização incremental de tickets (endpoint principal)
 * 
 * Lógica inteligente de UPSERT:
 * - Busca maior Data_Ultima_Modificacao do Supabase
 * - Aplica folga de 1 dia para segurança
 * - Busca TODOS os registros modificados do SQL Server
 * - Para cada registro:
 *    - Se não existe → INSERT
 *    - Se existe e data SQL > data Supabase → UPDATE
 *    - Se existe e data SQL <= data Supabase → SKIP
 */
app.post('/api/sync-tickets-incremental', async (req, res) => {
  try {
    console.log('🚀 [API] Iniciando sincronização incremental de tickets...');
    
    // Conectar ao SQL Server
    const pool = await sql.connect(sqlConfig);
    
    // Executar sincronização incremental
    const resultado = await sincronizarTicketsIncremental(pool);
    
    await pool.close();
    
    // Retornar resultado com mapeamento inseridos → novos (consistência com frontend)
    res.json({
      sucesso: resultado.sucesso,
      total_processados: resultado.total_processados,
      novos: resultado.inseridos,
      atualizados: resultado.atualizados,
      ignorados: resultado.ignorados,
      erros: resultado.erros,
      mensagens: resultado.mensagens
    });
    
  } catch (error) {
    console.error('❌ [API] Erro na sincronização incremental de tickets:', error);
    res.status(500).json({
      sucesso: false,
      total_processados: 0,
      inseridos: 0,
      atualizados: 0,
      ignorados: 0,
      erros: 1,
      mensagens: [`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]
    });
  }
});

/**
 * Sincronizar tickets específicos por número de solicitação
 * 
 * POST /api/sync-tickets-by-ids
 * Body: { "nro_solicitacoes": ["2834622", "2836343", "2839891"] }
 * 
 * Busca os chamados específicos no SQL Server e insere/atualiza no Supabase.
 */
app.post('/api/sync-tickets-by-ids', async (req, res) => {
  try {
    const { nro_solicitacoes } = req.body;

    if (!nro_solicitacoes || !Array.isArray(nro_solicitacoes) || nro_solicitacoes.length === 0) {
      return res.status(400).json({
        sucesso: false,
        mensagens: ['Body deve conter "nro_solicitacoes" como array de strings não vazio']
      });
    }

    console.log(`🎯 [TICKETS-BY-IDS] Sincronizando ${nro_solicitacoes.length} tickets específicos:`, nro_solicitacoes);

    // Conectar ao SQL Server
    const pool = await sql.connect(sqlConfig);
    console.log('✅ [TICKETS-BY-IDS] Conectado ao SQL Server');

    // Montar a lista de IDs para a query IN
    const idsFormatados = nro_solicitacoes.map((id: string) => `'${id.replace(/'/g, "''")}'`).join(', ');

    const query = `
      SELECT
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
      WHERE Nro_Solicitacao IN (${idsFormatados})
    `;

    const result = await pool.request().query(query);
    const registros = result.recordset;

    await pool.close();
    console.log(`📊 [TICKETS-BY-IDS] ${registros.length} registros encontrados no SQL Server`);

    if (registros.length === 0) {
      return res.json({
        sucesso: true,
        total_processados: 0,
        inseridos: 0,
        atualizados: 0,
        ignorados: 0,
        erros: 0,
        nao_encontrados: nro_solicitacoes,
        mensagens: ['Nenhum dos chamados informados foi encontrado no SQL Server']
      });
    }

    // Processar cada registro
    let inseridos = 0;
    let atualizados = 0;
    let erros = 0;
    const detalhes: any[] = [];

    for (const registro of registros) {
      try {
        const dadosTicket = {
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
          log: formatarDataSemTimezone(registro.LOG),
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
          source_updated_at: formatarDataSemTimezone(registro.Data_Ultima_Modificacao),
          synced_at: new Date().toISOString()
        };

        // Verificar se já existe
        const { data: existente } = await supabase
          .from('apontamentos_tickets_aranda')
          .select('id')
          .eq('nro_solicitacao', registro.Nro_Solicitacao)
          .maybeSingle();

        if (existente) {
          // Atualizar
          const { error } = await supabase
            .from('apontamentos_tickets_aranda')
            .update(dadosTicket)
            .eq('nro_solicitacao', registro.Nro_Solicitacao);

          if (error) throw error;
          atualizados++;
          detalhes.push({ nro: registro.Nro_Solicitacao, acao: 'atualizado' });
          console.log(`🔄 [TICKETS-BY-IDS] ${registro.Nro_Solicitacao} - ATUALIZADO`);
        } else {
          // Inserir
          const { error } = await supabase
            .from('apontamentos_tickets_aranda')
            .insert(dadosTicket);

          if (error) throw error;
          inseridos++;
          detalhes.push({ nro: registro.Nro_Solicitacao, acao: 'inserido' });
          console.log(`✅ [TICKETS-BY-IDS] ${registro.Nro_Solicitacao} - INSERIDO`);
        }
      } catch (erro) {
        erros++;
        detalhes.push({ nro: registro.Nro_Solicitacao, acao: 'erro', erro: erro instanceof Error ? erro.message : 'Erro desconhecido' });
        console.error(`❌ [TICKETS-BY-IDS] ${registro.Nro_Solicitacao} - ERRO:`, erro);
      }
    }

    // Identificar quais não foram encontrados no SQL Server
    const encontrados = registros.map((r: any) => r.Nro_Solicitacao);
    const naoEncontrados = nro_solicitacoes.filter((id: string) => !encontrados.includes(id));

    res.json({
      sucesso: erros === 0,
      total_processados: registros.length,
      inseridos,
      atualizados,
      ignorados: 0,
      erros,
      nao_encontrados: naoEncontrados,
      detalhes,
      mensagens: [
        `${registros.length} de ${nro_solicitacoes.length} chamados encontrados no SQL Server`,
        `${inseridos} inseridos, ${atualizados} atualizados, ${erros} erros`,
        ...(naoEncontrados.length > 0 ? [`Não encontrados: ${naoEncontrados.join(', ')}`] : [])
      ]
    });

  } catch (error) {
    console.error('❌ [TICKETS-BY-IDS] Erro:', error);
    res.status(500).json({
      sucesso: false,
      mensagens: [`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]
    });
  }
});

// ============================================
// FUNÇÃO REMOVIDA: sincronizarApontamentos()
// ============================================
// Esta função foi movida para incrementalSyncApontamentosService.ts
// Use sincronizarApontamentosIncremental() em vez disso
// ============================================

/**
 * Função principal de sincronização de tickets
 */
async function sincronizarTickets(req: any, res: any, sincronizacaoCompleta: boolean = false) {
  const resultado = {
    sucesso: false,
    total_processados: 0,
    novos: 0,
    atualizados: 0,
    erros: 0,
    mensagens: [] as string[],
    detalhes_erros: [] as any[]
  };

  try {
    console.log('🎫 [TICKETS] Iniciando sincronização de tickets...');
    resultado.mensagens.push('Iniciando sincronização com SQL Server (AMSticketsabertos)...');

    // Conectar ao SQL Server
    console.log('🔌 [TICKETS] Tentando conectar ao SQL Server...');
    const pool = await sql.connect(sqlConfig);
    console.log('✅ [TICKETS] Conectado ao SQL Server');
    resultado.mensagens.push('Conectado ao SQL Server');

    let query: string;
    let ultimaDataSincronizacao: Date | null = null;

    if (sincronizacaoCompleta) {
      // Sincronização completa - buscar todos os registros desde 01/08/2025 (limitado a 5000 por vez)
      console.log('📋 [TICKETS] Modo: Sincronização COMPLETA (desde 28/02/2024)');
      resultado.mensagens.push('Modo: Sincronização COMPLETA (até 50000 registros por vez)');
      
      query = `
        SELECT TOP 50000
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
        WHERE Data_Abertura >= '2024-02-28 00:00:00'
        ORDER BY Data_Abertura ASC
      `;
    } else {
      // Sincronização incremental - buscar apenas registros novos
      console.log('📋 [TICKETS] Modo: Sincronização INCREMENTAL');
      resultado.mensagens.push('Modo: Sincronização INCREMENTAL');

      // Buscar última data de sincronização no Supabase
      const { data: ultimoRegistro } = await supabase
        .from('apontamentos_tickets_aranda')
        .select('data_abertura')
        .order('data_abertura', { ascending: false })
        .limit(1)
        .maybeSingle();

      ultimaDataSincronizacao = ultimoRegistro?.data_abertura 
        ? new Date(ultimoRegistro.data_abertura)
        : new Date('2024-02-28T00:00:00.000Z'); // Data inicial: 28/02/2024

      console.log('📅 [TICKETS] Última sincronização:', ultimaDataSincronizacao.toISOString());
      resultado.mensagens.push(`Última sincronização: ${ultimaDataSincronizacao.toISOString()}`);

      query = `
        SELECT
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
        WHERE Data_Abertura >= '2024-02-28 00:00:00'
        ORDER BY Data_Abertura ASC
      `;
    }

    const request = pool.request();
    
    // Adicionar parâmetro apenas para sincronização incremental
    if (!sincronizacaoCompleta && ultimaDataSincronizacao) {
      request.input('ultimaData', sql.DateTime, ultimaDataSincronizacao);
    }
    
    const result = await request.query(query);
    const registros = result.recordset as DadosTicketSqlServer[];
    
    resultado.total_processados = registros.length;
    resultado.mensagens.push(`${registros.length} registros encontrados no SQL Server`);
    console.log(`📊 [TICKETS] ${registros.length} registros encontrados`);

    await pool.close();
    console.log('🔌 [TICKETS] Conexão SQL Server fechada');

    if (registros.length === 0) {
      console.log('⚠️ [TICKETS] Nenhum registro novo encontrado no SQL Server');
      
      // Buscar total de registros no Supabase para exibir no modal
      try {
        const { count: totalSupabase } = await supabase
          .from('apontamentos_tickets_aranda')
          .select('*', { count: 'exact', head: true });
        
        console.log(`📊 [TICKETS] Total de registros no Supabase: ${totalSupabase || 0}`);
        resultado.total_processados = totalSupabase || 0;
      } catch (error) {
        console.warn('⚠️ [TICKETS] Erro ao buscar total do Supabase:', error);
      }
      
      resultado.sucesso = true;
      resultado.mensagens.push('Nenhum registro novo para sincronizar');
      return res.json(resultado);
    }

    // Processar cada registro
    console.log('🔄 [TICKETS] Iniciando processamento de registros...');
    resultado.mensagens.push('Iniciando processamento de registros...');
    
    for (let i = 0; i < registros.length; i++) {
      const registro = registros[i];
      
      if (i % 50 === 0) {
        console.log(`📝 [TICKETS] Processando registro ${i + 1}/${registros.length}...`);
      }
      
      try {
        // Validar dados do registro antes de processar
        if (!registro.Nro_Solicitacao || registro.Nro_Solicitacao.trim() === '') {
          console.error(`❌ [TICKETS] Registro ${i + 1} tem Nro_Solicitacao inválido:`, registro);
          resultado.erros++;
          resultado.detalhes_erros.push({
            registro: {
              Nro_Solicitacao: registro.Nro_Solicitacao
            },
            erro: 'Nro_Solicitacao é obrigatório mas está vazio/nulo'
          });
          continue; // Pular este registro
        }
        
        const idUnico = gerarIdUnicoTicket(registro);

        // Verificar se já existe (APENAS por nro_solicitacao - constraint unique corrigida)
        const { data: existente, error: erroConsulta } = await supabase
          .from('apontamentos_tickets_aranda')
          .select('id')
          .eq('nro_solicitacao', registro.Nro_Solicitacao)
          .maybeSingle();
        
        if (erroConsulta) {
          console.error('❌ [TICKETS] Erro ao consultar registro existente:', erroConsulta);
          throw erroConsulta;
        }

        const dadosTicket = {
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
          log: formatarDataSemTimezone(registro.LOG),
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
          total_orcamento: registro.Total_Orcamento || null
        };

        if (existente) {
          // ✅ Registro já existe - PULAR (não atualizar para preservar edições manuais)
          console.log(`⏭️ [TICKETS] Registro ${i + 1} já existe - pulando (Nro: ${registro.Nro_Solicitacao})`);
          // Não incrementar nenhum contador - registro ignorado
          continue;
        } else {
          // ✅ Inserir novo registro
          const { error } = await supabase
            .from('apontamentos_tickets_aranda')
            .insert(dadosTicket);

          if (error) {
            console.error('❌ [TICKETS] Erro ao inserir:', error);
            throw error;
          }
          resultado.novos++;
        }
      } catch (erro) {
        console.error(`💥 [TICKETS] Erro no registro ${i + 1}:`, erro);
        resultado.erros++;
        
        // Capturar detalhes completos do erro
        let erroMsg = 'Erro desconhecido';
        let erroDetalhes = {};
        
        if (erro instanceof Error) {
          erroMsg = erro.message;
          erroDetalhes = {
            message: erro.message,
            stack: erro.stack,
            name: erro.name
          };
        } else if (typeof erro === 'object' && erro !== null) {
          erroMsg = JSON.stringify(erro);
          erroDetalhes = erro;
        }
        
        console.error(`🔍 [TICKETS] Detalhes completos do erro:`, erroDetalhes);
        
        resultado.detalhes_erros.push({
          registro: {
            Nro_Solicitacao: registro.Nro_Solicitacao
          },
          erro: erroMsg,
          detalhes: erroDetalhes
        });
        
        // Se houver muitos erros, parar
        if (resultado.erros >= 10) {
          console.log('🛑 [TICKETS] Muitos erros detectados, parando sincronização...');
          resultado.mensagens.push('Sincronização interrompida devido a múltiplos erros');
          break;
        }
      }
    }
    
    console.log('✅ [TICKETS] Processamento concluído');

    resultado.sucesso = resultado.erros === 0;
    resultado.mensagens.push(
      `Sincronização concluída: ${resultado.novos} novos, ${resultado.atualizados} atualizados, ${resultado.erros} erros`
    );

    console.log('📊 [TICKETS] Sincronização de tickets concluída:', resultado);
    res.json(resultado);

  } catch (error) {
    console.error('💥 [TICKETS] Erro crítico na sincronização de tickets:', error);
    console.error('🔍 [TICKETS] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    
    resultado.sucesso = false;
    resultado.mensagens.push(`Erro na sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    
    // Adicionar detalhes do erro para debug
    resultado.detalhes_erros.push({
      registro: { acao: 'sincronizacao_geral' },
      erro: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : 'N/A'
    });
    
    res.status(500).json(resultado);
  }
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  API de Sincronização de Pesquisas                          ║
║  Porta: ${PORT}                                           ║
║  SQL Server: ${sqlConfig.server}                          ║
║  Database: ${sqlConfig.database}                          ║
║  Tabela: ${process.env.SQL_TABLE || 'AMSpesquisa'}        ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
