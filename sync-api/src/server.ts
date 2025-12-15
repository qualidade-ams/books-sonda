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
  user_id: number;
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
  const partes = [
    'AMSespecialistas', // Prefixo para diferenciar de outras tabelas
    registro.user_id.toString(),
    registro.user_name,
    registro.user_email
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
 * Debug: Testar query de especialistas
 */
app.get('/api/debug-especialistas', async (req, res) => {
  try {
    console.log('Testando query de especialistas...');
    const pool = await sql.connect(sqlConfig);
    
    const query = `
      SELECT TOP 5
        user_id,
        user_name,
        user_email,
        user_active
      FROM AMSespecialistas
      ORDER BY user_name ASC
    `;
    
    const result = await pool.request().query(query);
    await pool.close();
    
    res.json({
      success: true,
      message: 'Query executada com sucesso',
      sample_records: result.recordset,
      total_found: result.recordset.length
    });
    
  } catch (error) {
    console.error('Erro no debug:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
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
      .gte('data_resposta', '2024-01-01T00:00:00.000Z');

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
        : new Date('2024-01-01T00:00:00.000Z'); // Data inicial: 01/01/2024

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
    console.log('Iniciando sincronização de especialistas...');
    resultado.mensagens.push('Iniciando sincronização com SQL Server (AMSespecialistas)...');

    // Conectar ao SQL Server
    const pool = await sql.connect(sqlConfig);
    console.log('Conectado ao SQL Server');
    resultado.mensagens.push('Conectado ao SQL Server');

    // Buscar todos os registros da tabela AMSespecialistas
    const query = `
      SELECT
        user_id,
        user_name,
        user_email,
        user_active
      FROM AMSespecialistas
      ORDER BY user_name ASC
    `;

    const result = await pool.request().query(query);
    const registros = result.recordset as DadosEspecialistaSqlServer[];
    
    resultado.total_processados = registros.length;
    resultado.mensagens.push(`${registros.length} registros encontrados no SQL Server`);
    console.log(`${registros.length} registros encontrados`);

    await pool.close();

    if (registros.length === 0) {
      resultado.sucesso = true;
      resultado.mensagens.push('Nenhum registro para sincronizar');
      return res.json(resultado);
    }

    // Buscar todos os especialistas existentes no Supabase (origem sql_server)
    const { data: especialistasExistentes, error: erroConsulta } = await supabase
      .from('especialistas')
      .select('id, id_externo')
      .eq('origem', 'sql_server');

    if (erroConsulta) {
      console.error('Erro ao consultar especialistas existentes:', erroConsulta);
      throw erroConsulta;
    }

    const idsExistentes = new Set(especialistasExistentes?.map(e => e.id_externo) || []);
    const idsProcessados = new Set<string>();

    // Processar cada registro
    console.log('Iniciando processamento de registros...');
    resultado.mensagens.push('Iniciando processamento de registros...');
    
    for (let i = 0; i < registros.length; i++) {
      const registro = registros[i];
      
      if (i % 10 === 0) {
        console.log(`Processando registro ${i + 1}/${registros.length}...`);
      }
      
      try {
        const idUnico = gerarIdUnicoEspecialista(registro);
        idsProcessados.add(idUnico);

        // Verificar se já existe
        const jaExiste = idsExistentes.has(idUnico);

        const dadosEspecialista = {
          origem: 'sql_server' as const,
          id_externo: idUnico,
          codigo: registro.user_id?.toString() || null,
          nome: registro.user_name || '',
          email: registro.user_email || null,
          telefone: null, // Campo não existe na tabela AMSespecialistas
          cargo: null, // Campo não existe na tabela AMSespecialistas
          departamento: null, // Campo não existe na tabela AMSespecialistas
          empresa: null, // Campo não existe na tabela AMSespecialistas
          especialidade: null, // Campo não existe na tabela AMSespecialistas
          nivel: null, // Campo não existe na tabela AMSespecialistas
          observacoes: null, // Campo não existe na tabela AMSespecialistas
          status: (registro.user_active ? 'ativo' : 'inativo') as 'ativo' | 'inativo',
          autor_id: null,
          autor_nome: 'SQL Server Sync'
        };

        if (jaExiste) {
          // Atualizar registro existente
          const { error } = await supabase
            .from('especialistas')
            .update(dadosEspecialista)
            .eq('id_externo', idUnico);

          if (error) {
            console.error('Erro ao atualizar:', error);
            throw error;
          }
          resultado.atualizados++;
        } else {
          // Inserir novo registro
          const { error } = await supabase
            .from('especialistas')
            .insert(dadosEspecialista);

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
            user_id: registro.user_id,
            user_name: registro.user_name,
            user_email: registro.user_email
          },
          erro: erroMsg
        });
        
        // Log detalhado do erro
        console.error(`Erro detalhado no registro ${i + 1}:`, {
          registro: registro,
          erro: erro,
          stack: erro instanceof Error ? erro.stack : 'N/A'
        });
        
        // Se houver muitos erros, parar
        if (resultado.erros >= 10) {
          console.log('Muitos erros detectados, parando sincronização...');
          resultado.mensagens.push('Sincronização interrompida devido a múltiplos erros');
          break;
        }
      }
    }

    // Remover registros que não existem mais no SQL Server (TEMPORARIAMENTE DESABILITADO)
    /*
    const idsParaRemover = Array.from(idsExistentes).filter(id => !idsProcessados.has(id));
    
    if (idsParaRemover.length > 0) {
      console.log(`Removendo ${idsParaRemover.length} registros que não existem mais no SQL Server...`);
      
      const { error: erroRemocao } = await supabase
        .from('especialistas')
        .delete()
        .in('id_externo', idsParaRemover);

      if (erroRemocao) {
        console.error('Erro ao remover registros:', erroRemocao);
        resultado.erros++;
        resultado.detalhes_erros.push({
          registro: { acao: 'remover_registros_obsoletos' },
          erro: erroRemocao.message
        });
      } else {
        resultado.removidos = idsParaRemover.length;
        resultado.mensagens.push(`${idsParaRemover.length} registros obsoletos removidos`);
      }
    }
    */
    console.log('Remoção de registros obsoletos desabilitada temporariamente');
    
    console.log('Processamento concluído');

    resultado.sucesso = resultado.erros === 0;
    resultado.mensagens.push(
      `Sincronização concluída: ${resultado.novos} novos, ${resultado.atualizados} atualizados, ${resultado.removidos} removidos, ${resultado.erros} erros`
    );

    console.log('Sincronização de especialistas concluída:', resultado);
    res.json(resultado);

  } catch (error) {
    console.error('Erro na sincronização de especialistas:', error);
    resultado.sucesso = false;
    resultado.mensagens.push(`Erro na sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    res.status(500).json(resultado);
  }
}

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
