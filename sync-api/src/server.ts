/**
 * API Node.js para sincronização de pesquisas do SQL Server
 * Conecta ao banco Aranda (172.26.2.136) e sincroniza tabela AMSpesquisa
 */

import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

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
    requestTimeout: 30000
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

// Interface dos dados de pesquisas
interface DadosSqlServer {
  Empresa: string;
  Categoria: string;
  Grupo: string;
  Cliente: string;
  Email_Cliente: string;
  Prestador: string;
  Nro_Caso: string;
  Tipo_Caso: string;
  Ano_Abertura: string;
  Mes_abertura: string;
  Data_Resposta: Date;
  Resposta: string;
  Comentario_Pesquisa: string;
}

// Interface dos dados de especialistas (estrutura real da tabela AMSespecialistas)
interface DadosEspecialistaSqlServer {
  user_name: string;
  user_email: string;
  user_active: boolean;
}

/**
 * Gerar ID único para registro de pesquisa
 */
function gerarIdUnico(registro: DadosSqlServer): string {
  const partes = [
    registro.Empresa,
    registro.Cliente,
    registro.Nro_Caso,
    registro.Data_Resposta?.toISOString()
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
          Nro_Caso,
          Tipo_Caso,
          Ano_Abertura,
          Mes_abertura,
          [Data_Resposta (Date-Hour-Minute-Second)] as Data_Resposta,
          Resposta,
          Comentario_Pesquisa
        FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
        WHERE [Data_Resposta (Date-Hour-Minute-Second)] IS NOT NULL
          AND (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
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
          Nro_Caso,
          Tipo_Caso,
          Ano_Abertura,
          Mes_abertura,
          [Data_Resposta (Date-Hour-Minute-Second)] as Data_Resposta,
          Resposta,
          Comentario_Pesquisa
        FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
        WHERE [Data_Resposta (Date-Hour-Minute-Second)] IS NOT NULL
          AND [Data_Resposta (Date-Hour-Minute-Second)] > @ultimaData
          AND (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
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
      resultado.sucesso = true;
      resultado.mensagens.push('Nenhum registro para sincronizar');
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
          console.log(`  Nro_Caso: ${registro.Nro_Caso?.length || 0} chars`);
          console.log(`  Tipo_Caso: ${registro.Tipo_Caso?.length || 0} chars`);
          console.log(`  Resposta: ${registro.Resposta?.length || 0} chars`);
          console.log(`  Comentario_Pesquisa: ${registro.Comentario_Pesquisa?.length || 0} chars`);
        }

        const dadosPesquisa = {
          origem: 'sql_server' as const,
          id_externo: idUnico,
          empresa: registro.Empresa || '',
          categoria: registro.Categoria || null,
          grupo: registro.Grupo || null,
          cliente: registro.Cliente || '',
          email_cliente: registro.Email_Cliente || null,
          prestador: registro.Prestador || null,
          nro_caso: registro.Nro_Caso || null,
          tipo_caso: registro.Tipo_Caso || null,
          ano_abertura: registro.Ano_Abertura ? parseInt(registro.Ano_Abertura) : null,
          mes_abertura: registro.Mes_abertura ? parseInt(registro.Mes_abertura) : null,
          data_resposta: registro.Data_Resposta?.toISOString() || null,
          resposta: registro.Resposta || null,
          comentario_pesquisa: registro.Comentario_Pesquisa || null,
          status: 'pendente' as const
        };

        if (existente) {
          // Atualizar registro existente
          const { error } = await supabase
            .from('pesquisas_satisfacao')
            .update(dadosPesquisa)
            .eq('id', existente.id);

          if (error) {
            console.error('Erro ao atualizar:', error);
            throw error;
          }
          resultado.atualizados++;
        } else {
          // Inserir novo registro
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
        const erroMsg = erro instanceof Error ? erro.message : 'Erro desconhecido';
        resultado.detalhes_erros.push({
          registro: {
            Empresa: registro.Empresa,
            Cliente: registro.Cliente,
            Nro_Caso: registro.Nro_Caso
          },
          erro: erroMsg
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
    resultado.mensagens.push(
      `Sincronização concluída: ${resultado.novos} novos, ${resultado.atualizados} atualizados, ${resultado.erros} erros`
    );

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
