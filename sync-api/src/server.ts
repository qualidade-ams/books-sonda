/**
 * API Node.js para sincronização de pesquisas do SQL Server
 * Conecta ao banco Aranda (172.26.2.136) e sincroniza tabela AMSpesquisa
 */

import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { sincronizarApontamentosIncremental } from './services/incrementalSyncApontamentosService';
import { sincronizarTicketsIncremental } from './services/incrementalSyncTicketsService';

dotenv.config();

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
 */
function gerarIdUnico(registro: DadosSqlServer): string {
  const partes = [
    registro.Empresa,
    registro.Cliente,
    registro.Nro_Caso,
    // Para registros sem resposta, usar 'PENDENTE' como identificador
    registro.Data_Resposta?.toISOString() || 'PENDENTE'
  ].filter(Boolean);
  
  return partes.join('|');
}

/**
 * Gerar ID único para registro de especialista
 */
function gerarIdUnicoEspecialista(registro: DadosEspecialistaSqlServer): string {
  // Validar se os campos obrigatórios existem
  if (!registro.user_name || registro.user_name.trim() === '') {
    console.error('Erro: user_name é obrigatório para gerar ID único', registro);
    throw new Error(`user_name é obrigatório para gerar ID único. Registro: ${JSON.stringify(registro)}`);
  }
  
  const partes = [
    'AMSespecialistas', // Prefixo para diferenciar de outras tabelas
    registro.user_name.trim(),
    registro.user_email?.trim() || 'sem_email'
  ].filter(Boolean);
  
  return partes.join('|');
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
    registro.Nro_Tarefa.trim(),
    registro.Data_Atividade?.toISOString() || 'sem_data'
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
 */
app.post('/api/sync-pesquisas', async (req, res) => {
  await sincronizarPesquisas(req, res, false);
});

/**
 * Sincronização completa (todos os registros)
 */
app.post('/api/sync-pesquisas-full', async (req, res) => {
  await sincronizarPesquisas(req, res, true);
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

        // Verificar se já existe
        const { data: existente, error: erroConsulta } = await supabase
          .from('pesquisas_satisfacao')
          .select('id')
          .eq('id_externo', idUnico)
          .maybeSingle();
        
        if (erroConsulta) {
          console.error('Erro ao consultar registro existente:', erroConsulta);
          throw erroConsulta;
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
          // ✅ Registro já existe - ATUALIZAR apenas os novos campos
          console.log(`🔄 [PESQUISAS] Registro ${i + 1} já existe - atualizando novos campos (ID: ${idUnico})`);
          
          // Atualizar APENAS os 11 novos campos, preservando os outros
          const { error } = await supabase
            .from('pesquisas_satisfacao')
            .update({
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
            .eq('id_externo', idUnico);

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
    
    console.log(`📊 [ESPECIALISTAS] ${registros.length} registros encontrados`);
    resultado.total_processados = registros.length;
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
    console.log('🔄 [ESPECIALISTAS] Iniciando processamento de registros...');
    resultado.mensagens.push('Iniciando processamento de registros...');
    
    for (let i = 0; i < registros.length; i++) {
      const registro = registros[i];
      
      if (i % 10 === 0) {
        console.log(`📝 [ESPECIALISTAS] Processando registro ${i + 1}/${registros.length}...`);
      }
      
      try {
        // Validar dados do registro antes de processar
        if (!registro.user_name || registro.user_name.trim() === '') {
          console.error(`❌ [ESPECIALISTAS] Registro ${i + 1} tem user_name inválido:`, registro);
          resultado.erros++;
          resultado.detalhes_erros.push({
            registro: {
              user_name: registro.user_name,
              user_email: registro.user_email
            },
            erro: 'user_name é obrigatório mas está vazio/nulo'
          });
          continue; // Pular este registro
        }
        
        console.log(`🔍 [ESPECIALISTAS] Gerando ID único para registro ${i + 1}...`);
        const idUnico = gerarIdUnicoEspecialista(registro);
        idsProcessados.add(idUnico);

        // Verificar se já existe
        const jaExiste = idsExistentes.has(idUnico);
        console.log(`🔍 [ESPECIALISTAS] Registro ${i + 1} - ID: ${idUnico}, Existe: ${jaExiste}`);

        const dadosEspecialista = {
          origem: 'sql_server' as const,
          id_externo: idUnico,
          codigo: null, // Não há mais user_id na tabela
          nome: registro.user_name || '',
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

        console.log(`💾 [ESPECIALISTAS] Preparando dados para registro ${i + 1}:`, {
          id_externo: dadosEspecialista.id_externo,
          nome: dadosEspecialista.nome,
          email: dadosEspecialista.email,
          status: dadosEspecialista.status
        });

        if (jaExiste) {
          // Atualizar registro existente
          console.log(`🔄 [ESPECIALISTAS] Atualizando registro ${i + 1}...`);
          const { error } = await supabase
            .from('especialistas')
            .update(dadosEspecialista)
            .eq('id_externo', idUnico);

          if (error) {
            console.error(`❌ [ESPECIALISTAS] Erro ao atualizar registro ${i + 1}:`, error);
            throw new Error(`Erro ao atualizar: ${error.message}`);
          }
          resultado.atualizados++;
          console.log(`✅ [ESPECIALISTAS] Registro ${i + 1} atualizado com sucesso`);
        } else {
          // Inserir novo registro
          console.log(`➕ [ESPECIALISTAS] Inserindo novo registro ${i + 1}...`);
          const { error } = await supabase
            .from('especialistas')
            .insert(dadosEspecialista);

          if (error) {
            console.error(`❌ [ESPECIALISTAS] Erro ao inserir registro ${i + 1}:`, error);
            throw new Error(`Erro ao inserir: ${error.message}`);
          }
          resultado.novos++;
          console.log(`✅ [ESPECIALISTAS] Registro ${i + 1} inserido com sucesso`);
        }
      } catch (erro) {
        console.error(`💥 [ESPECIALISTAS] Erro no registro ${i + 1}:`, erro);
        resultado.erros++;
        const erroMsg = erro instanceof Error ? erro.message : 'Erro desconhecido';
        resultado.detalhes_erros.push({
          registro: {
            user_name: registro.user_name,
            user_email: registro.user_email
          },
          erro: erroMsg
        });
        
        // Log detalhado do erro
        console.error(`🔍 [ESPECIALISTAS] Erro detalhado no registro ${i + 1}:`, {
          registro: registro,
          erro: erro,
          stack: erro instanceof Error ? erro.stack : 'N/A'
        });
        
        // Se houver muitos erros, parar
        if (resultado.erros >= 10) {
          console.log('🛑 [ESPECIALISTAS] Muitos erros detectados, parando sincronização...');
          resultado.mensagens.push('Sincronização interrompida devido a múltiplos erros');
          break;
        }
      }
    }

    console.log('✅ [ESPECIALISTAS] Processamento concluído');

    resultado.sucesso = resultado.erros === 0;
    resultado.mensagens.push(
      `Sincronização concluída: ${resultado.novos} novos, ${resultado.atualizados} atualizados, ${resultado.removidos} removidos, ${resultado.erros} erros`
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
    
    res.json(resultado);
    
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
    
    res.json(resultado);
    
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

        // Verificar se já existe
        const { data: existente, error: erroConsulta } = await supabase
          .from('apontamentos_tickets_aranda')
          .select('id')
          .eq('nro_solicitacao', registro.Nro_Solicitacao)
          .eq('data_abertura', formatarDataSemTimezone(registro.Data_Abertura))
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
