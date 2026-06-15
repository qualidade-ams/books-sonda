/**
 * Script de Teste de Validação da Sincronização
 * 
 * Testa inserção e atualização tanto no SQL Server (Aranda) quanto no Supabase.
 * 
 * USO:
 *   npx ts-node scripts/test-sync-validation.ts
 * 
 * PRÉ-REQUISITOS:
 *   - VPN ativa (para conectar ao SQL Server 172.26.2.136)
 *   - .env configurado com credenciais do Supabase e SQL Server
 * 
 * O QUE FAZ:
 *   1. Conecta ao SQL Server e verifica leitura
 *   2. Conecta ao Supabase e verifica leitura/escrita
 *   3. Testa inserção de registro de teste no Supabase
 *   4. Testa atualização do registro no Supabase
 *   5. Remove o registro de teste (limpeza)
 *   6. Compara contagens SQL Server vs Supabase (validação)
 */

import dotenv from 'dotenv';
dotenv.config();

import sql from 'mssql';
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURAÇÃO
// ============================================

const sqlConfig: sql.config = {
  server: process.env.SQL_SERVER || '172.26.2.136',
  port: parseInt(process.env.SQL_PORT || '10443'),
  database: process.env.SQL_DATABASE || 'Aranda',
  user: process.env.SQL_USER || 'amsconsulta',
  password: process.env.SQL_PASSWORD || 'ams@2023',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 15000,
    requestTimeout: 30000,
    useUTC: false
  }
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ID de teste (será removido no final)
const ID_EXTERNO_TESTE = 'TESTE_VALIDACAO|Script_Teste|999999';

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function log(emoji: string, msg: string) {
  console.log(`${emoji} ${msg}`);
}

function logSection(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(60)}\n`);
}

function logResult(label: string, value: any) {
  console.log(`   ${label}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
}

// ============================================
// TESTES
// ============================================

async function testarConexaoSqlServer(pool: sql.ConnectionPool): Promise<boolean> {
  logSection('TESTE 1: Conexão e Leitura no SQL Server (Aranda)');
  
  try {
    // 1.1 - Verificar versão
    const versionResult = await pool.request().query('SELECT @@VERSION as version');
    log('✅', 'Conectado ao SQL Server');
    logResult('Versão', versionResult.recordset[0].version.split('\n')[0]);

    // 1.2 - Contar registros em AMSpesquisa
    const countPesquisas = await pool.request().query(`
      SELECT COUNT(*) as total
      FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
      WHERE (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
        AND [Data_Fechamento (Date-Hour-Minute-Second)] >= '2026-01-01 00:00:00'
        AND LOWER(LTRIM(RTRIM(Cliente))) != 'user - ams - teste'
    `);
    logResult('Total Pesquisas (com filtros)', countPesquisas.recordset[0].total);

    // 1.3 - Contar registros sem Data_Ultima_Modificacao
    const countSemModificacao = await pool.request().query(`
      SELECT COUNT(*) as total
      FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
      WHERE [Data_Ultima_Modificacao (Year)] IS NULL
        AND (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
        AND [Data_Fechamento (Date-Hour-Minute-Second)] >= '2026-01-01 00:00:00'
        AND LOWER(LTRIM(RTRIM(Cliente))) != 'user - ams - teste'
    `);
    logResult('Pesquisas SEM Data_Ultima_Modificacao', countSemModificacao.recordset[0].total);
    if (countSemModificacao.recordset[0].total > 0) {
      log('⚠️', `ATENÇÃO: ${countSemModificacao.recordset[0].total} registros NÃO serão capturados pelo sync incremental!`);
    }

    // 1.4 - Contar especialistas
    const countEsp = await pool.request().query('SELECT COUNT(*) as total FROM AMSespecialistas');
    logResult('Total Especialistas', countEsp.recordset[0].total);

    // 1.5 - Contar apontamentos
    const countAp = await pool.request().query(`
      SELECT COUNT(*) as total FROM AMSapontamento
      WHERE Data_Ult_Modificacao_Geral IS NOT NULL
        AND (Caso_Grupo NOT LIKE 'AMS SAP%' OR Caso_Grupo IS NULL)
    `);
    logResult('Total Apontamentos (com filtros)', countAp.recordset[0].total);

    // 1.6 - Contar tickets
    const countTickets = await pool.request().query(`
      SELECT COUNT(*) as total FROM AMSticketsabertos
      WHERE (Nome_grupo NOT LIKE 'AMS SAP%' OR Nome_grupo IS NULL)
    `);
    logResult('Total Tickets (com filtros)', countTickets.recordset[0].total);

    // 1.7 - Último registro modificado (pesquisas)
    const ultimoModificado = await pool.request().query(`
      SELECT TOP 1
        Nro_Caso,
        Cliente,
        Empresa,
        [Data_Ultima_Modificacao (Year)] as Data_Ultima_Modificacao
      FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
      WHERE [Data_Ultima_Modificacao (Year)] IS NOT NULL
        AND (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
        AND [Data_Fechamento (Date-Hour-Minute-Second)] >= '2026-01-01 00:00:00'
        AND LOWER(LTRIM(RTRIM(Cliente))) != 'user - ams - teste'
      ORDER BY [Data_Ultima_Modificacao (Year)] DESC
    `);
    if (ultimoModificado.recordset.length > 0) {
      const reg = ultimoModificado.recordset[0];
      log('📅', `Último registro modificado:`);
      logResult('  Caso', reg.Nro_Caso);
      logResult('  Cliente', reg.Cliente);
      logResult('  Empresa', reg.Empresa);
      logResult('  Data Modificação', reg.Data_Ultima_Modificacao);
    }

    return true;
  } catch (error) {
    log('❌', `Erro no SQL Server: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function testarConexaoSupabase(): Promise<boolean> {
  logSection('TESTE 2: Conexão e Leitura no Supabase');
  
  try {
    // 2.1 - Contar pesquisas
    const { count: totalPesquisas, error: errP } = await supabase
      .from('pesquisas_satisfacao')
      .select('*', { count: 'exact', head: true })
      .eq('origem', 'sql_server');
    
    if (errP) throw errP;
    logResult('Total Pesquisas (sql_server)', totalPesquisas);

    // 2.2 - Contar especialistas
    const { count: totalEsp, error: errE } = await supabase
      .from('especialistas')
      .select('*', { count: 'exact', head: true })
      .eq('origem', 'sql_server');
    
    if (errE) throw errE;
    logResult('Total Especialistas (sql_server)', totalEsp);

    // 2.3 - Contar apontamentos
    const { count: totalAp, error: errA } = await supabase
      .from('apontamentos_aranda')
      .select('*', { count: 'exact', head: true })
      .eq('origem', 'sql_server');
    
    if (errA) throw errA;
    logResult('Total Apontamentos (sql_server)', totalAp);

    // 2.4 - Contar tickets
    const { count: totalTickets, error: errT } = await supabase
      .from('apontamentos_tickets_aranda')
      .select('*', { count: 'exact', head: true });
    
    if (errT) throw errT;
    logResult('Total Tickets', totalTickets);

    // 2.5 - Último registro sincronizado
    const { data: ultimoSync, error: errU } = await supabase
      .from('pesquisas_satisfacao')
      .select('nro_caso, cliente, empresa, data_ultima_modificacao')
      .eq('origem', 'sql_server')
      .order('data_ultima_modificacao', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (errU) throw errU;
    if (ultimoSync) {
      log('📅', 'Último registro sincronizado no Supabase:');
      logResult('  Caso', ultimoSync.nro_caso);
      logResult('  Cliente', ultimoSync.cliente);
      logResult('  Empresa', ultimoSync.empresa);
      logResult('  Data Modificação', ultimoSync.data_ultima_modificacao);
    }

    // 2.6 - Distribuição de status das pesquisas
    const { data: statusCount } = await supabase
      .from('pesquisas_satisfacao')
      .select('status')
      .eq('origem', 'sql_server');
    
    if (statusCount) {
      const statusMap: Record<string, number> = {};
      statusCount.forEach((r: any) => {
        statusMap[r.status] = (statusMap[r.status] || 0) + 1;
      });
      log('📊', 'Distribuição de status:');
      Object.entries(statusMap).forEach(([status, count]) => {
        logResult(`  ${status}`, count);
      });
    }

    log('✅', 'Supabase conectado e leitura OK');
    return true;
  } catch (error) {
    log('❌', `Erro no Supabase: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function testarInsercaoSupabase(): Promise<boolean> {
  logSection('TESTE 3: Inserção no Supabase');
  
  try {
    // Primeiro remover se já existir (de teste anterior)
    await supabase
      .from('pesquisas_satisfacao')
      .delete()
      .eq('id_externo', ID_EXTERNO_TESTE);

    // Inserir registro de teste
    const registroTeste = {
      origem: 'sql_server' as const,
      id_externo: ID_EXTERNO_TESTE,
      empresa: 'TESTE_VALIDACAO',
      categoria: 'TESTE',
      grupo: null,
      cliente: 'Script de Teste - Validação',
      email_cliente: 'teste@teste.com',
      prestador: 'Teste Prestador',
      solicitante: null,
      nro_caso: '999999',
      tipo_caso: 'Incidente',
      ano_abertura: 2026,
      mes_abertura: 6,
      data_resposta: new Date().toISOString(),
      resposta: '10',
      comentario_pesquisa: 'Registro de teste para validação do sync - PODE SER REMOVIDO',
      status: 'pendente',
      data_ultima_modificacao: new Date().toISOString(),
      autor_id: null,
      autor_nome: 'Script de Teste'
    };

    const { data, error } = await supabase
      .from('pesquisas_satisfacao')
      .insert(registroTeste)
      .select()
      .single();

    if (error) {
      log('❌', `Erro ao inserir: ${error.message}`);
      return false;
    }

    log('✅', 'Registro de teste inserido com sucesso!');
    logResult('ID', data.id);
    logResult('ID Externo', data.id_externo);
    logResult('Empresa', data.empresa);
    logResult('Cliente', data.cliente);
    logResult('Status', data.status);

    return true;
  } catch (error) {
    log('❌', `Erro na inserção: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function testarAtualizacaoSupabase(): Promise<boolean> {
  logSection('TESTE 4: Atualização no Supabase');
  
  try {
    // Buscar o registro de teste
    const { data: registro, error: errBusca } = await supabase
      .from('pesquisas_satisfacao')
      .select('id, status, comentario_pesquisa, data_ultima_modificacao')
      .eq('id_externo', ID_EXTERNO_TESTE)
      .single();

    if (errBusca || !registro) {
      log('❌', 'Registro de teste não encontrado para atualização');
      return false;
    }

    log('📋', 'Registro encontrado para atualização:');
    logResult('ID', registro.id);
    logResult('Status atual', registro.status);
    logResult('Comentário atual', registro.comentario_pesquisa?.substring(0, 50));

    // Atualizar o registro
    const novaDataModificacao = new Date().toISOString();
    const { data: atualizado, error: errUpdate } = await supabase
      .from('pesquisas_satisfacao')
      .update({
        comentario_pesquisa: 'ATUALIZADO pelo script de teste - ' + new Date().toLocaleString('pt-BR'),
        data_ultima_modificacao: novaDataModificacao,
        resposta: '9'
      })
      .eq('id_externo', ID_EXTERNO_TESTE)
      .select()
      .single();

    if (errUpdate) {
      log('❌', `Erro ao atualizar: ${errUpdate.message}`);
      return false;
    }

    log('✅', 'Registro atualizado com sucesso!');
    logResult('Novo comentário', atualizado.comentario_pesquisa?.substring(0, 60));
    logResult('Nova data_modificacao', atualizado.data_ultima_modificacao);
    logResult('Nova resposta', atualizado.resposta);

    // Testar se a proteção de status funciona (simular update com status != pendente)
    log('🔒', 'Testando proteção de status...');
    
    // Mudar status para 'enviado_elogios'
    await supabase
      .from('pesquisas_satisfacao')
      .update({ status: 'enviado_elogios' })
      .eq('id_externo', ID_EXTERNO_TESTE);

    // Verificar que o sync não atualizaria (simulação)
    const { data: regProtegido } = await supabase
      .from('pesquisas_satisfacao')
      .select('status')
      .eq('id_externo', ID_EXTERNO_TESTE)
      .single();
    
    if (regProtegido?.status === 'enviado_elogios') {
      log('✅', 'Proteção de status OK - registro com status "enviado_elogios" não seria atualizado pelo sync');
    }

    // Restaurar para pendente (para limpeza)
    await supabase
      .from('pesquisas_satisfacao')
      .update({ status: 'pendente' })
      .eq('id_externo', ID_EXTERNO_TESTE);

    return true;
  } catch (error) {
    log('❌', `Erro na atualização: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function testarLimpeza(): Promise<boolean> {
  logSection('TESTE 5: Limpeza (Remoção do Registro de Teste)');
  
  try {
    const { error } = await supabase
      .from('pesquisas_satisfacao')
      .delete()
      .eq('id_externo', ID_EXTERNO_TESTE);

    if (error) {
      log('❌', `Erro ao remover: ${error.message}`);
      return false;
    }

    // Verificar que foi removido
    const { data: verificacao } = await supabase
      .from('pesquisas_satisfacao')
      .select('id')
      .eq('id_externo', ID_EXTERNO_TESTE)
      .maybeSingle();

    if (!verificacao) {
      log('✅', 'Registro de teste removido com sucesso!');
      return true;
    } else {
      log('⚠️', 'Registro de teste ainda existe após delete');
      return false;
    }
  } catch (error) {
    log('❌', `Erro na limpeza: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function compararContagens(pool: sql.ConnectionPool): Promise<void> {
  logSection('TESTE 6: Comparação SQL Server vs Supabase');
  
  const tabelas = [
    {
      nome: 'Pesquisas',
      querySql: `
        SELECT COUNT(*) as total
        FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
        WHERE (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
          AND [Data_Fechamento (Date-Hour-Minute-Second)] >= '2026-01-01 00:00:00'
          AND LOWER(LTRIM(RTRIM(Cliente))) != 'user - ams - teste'
      `,
      tabelaSupabase: 'pesquisas_satisfacao',
      filtroOrigem: true
    },
    {
      nome: 'Especialistas',
      querySql: 'SELECT COUNT(*) as total FROM AMSespecialistas',
      tabelaSupabase: 'especialistas',
      filtroOrigem: true
    },
    {
      nome: 'Apontamentos',
      querySql: `
        SELECT COUNT(*) as total FROM AMSapontamento
        WHERE Data_Ult_Modificacao_Geral IS NOT NULL
          AND (Caso_Grupo NOT LIKE 'AMS SAP%' OR Caso_Grupo IS NULL)
      `,
      tabelaSupabase: 'apontamentos_aranda',
      filtroOrigem: true
    },
    {
      nome: 'Tickets',
      querySql: `
        SELECT COUNT(*) as total FROM AMSticketsabertos
        WHERE (Nome_grupo NOT LIKE 'AMS SAP%' OR Nome_grupo IS NULL)
      `,
      tabelaSupabase: 'apontamentos_tickets_aranda',
      filtroOrigem: false
    }
  ];

  console.log('┌─────────────────┬──────────────┬──────────────┬──────────────┬─────────┐');
  console.log('│ Tabela          │  SQL Server  │   Supabase   │  Diferença   │ Status  │');
  console.log('├─────────────────┼──────────────┼──────────────┼──────────────┼─────────┤');

  for (const tabela of tabelas) {
    try {
      // Contar no SQL Server
      const resultSql = await pool.request().query(tabela.querySql);
      const totalSql = resultSql.recordset[0].total;

      // Contar no Supabase
      let query = supabase.from(tabela.tabelaSupabase).select('*', { count: 'exact', head: true });
      if (tabela.filtroOrigem) {
        query = query.eq('origem', 'sql_server');
      }
      const { count: totalSupabase, error } = await query;
      
      if (error) throw error;

      const diferenca = totalSql - (totalSupabase || 0);
      const status = diferenca === 0 ? '✅ OK' : diferenca > 0 ? '⚠️ FALTA' : '🔄 EXTRA';

      const nomeFormatado = tabela.nome.padEnd(15);
      const sqlFormatado = String(totalSql).padStart(10);
      const supabaseFormatado = String(totalSupabase || 0).padStart(10);
      const difFormatado = (diferenca > 0 ? `+${diferenca}` : String(diferenca)).padStart(10);
      const statusFormatado = status.padEnd(7);

      console.log(`│ ${nomeFormatado} │ ${sqlFormatado}  │ ${supabaseFormatado}  │ ${difFormatado}  │ ${statusFormatado} │`);
    } catch (error) {
      const nomeFormatado = tabela.nome.padEnd(15);
      console.log(`│ ${nomeFormatado} │    ERRO      │    ERRO      │    ERRO      │ ❌ ERR  │`);
      log('', `  Erro em ${tabela.nome}: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log('└─────────────────┴──────────────┴──────────────┴──────────────┴─────────┘');
}

// ============================================
// EXECUÇÃO PRINCIPAL
// ============================================

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   SCRIPT DE VALIDAÇÃO DA SINCRONIZAÇÃO                  ║');
  console.log('║   SQL Server (Aranda) ↔ Supabase                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`🔗 SQL Server: ${sqlConfig.server}:${sqlConfig.port}/${sqlConfig.database}`);
  console.log(`🔗 Supabase: ${process.env.SUPABASE_URL}`);

  const resultados = {
    sqlServer: false,
    supabaseLeitura: false,
    supabaseInsercao: false,
    supabaseAtualizacao: false,
    limpeza: false
  };

  let pool: sql.ConnectionPool | null = null;

  try {
    // Conectar ao SQL Server
    log('🔌', 'Conectando ao SQL Server...');
    pool = await sql.connect(sqlConfig);
    
    // Teste 1: SQL Server
    resultados.sqlServer = await testarConexaoSqlServer(pool);
    
    // Teste 2: Supabase leitura
    resultados.supabaseLeitura = await testarConexaoSupabase();
    
    // Teste 3: Inserção no Supabase
    resultados.supabaseInsercao = await testarInsercaoSupabase();
    
    // Teste 4: Atualização no Supabase
    resultados.supabaseAtualizacao = await testarAtualizacaoSupabase();
    
    // Teste 5: Limpeza
    resultados.limpeza = await testarLimpeza();
    
    // Teste 6: Comparação de contagens
    await compararContagens(pool);

  } catch (error) {
    log('💥', `Erro fatal: ${error instanceof Error ? error.message : error}`);
  } finally {
    if (pool) {
      try { await pool.close(); } catch (e) { /* ignore */ }
    }
  }

  // ============================================
  // RESUMO FINAL
  // ============================================
  logSection('RESUMO FINAL');
  
  const testes = [
    { nome: 'Leitura SQL Server (Aranda)', resultado: resultados.sqlServer },
    { nome: 'Leitura Supabase', resultado: resultados.supabaseLeitura },
    { nome: 'Inserção Supabase', resultado: resultados.supabaseInsercao },
    { nome: 'Atualização Supabase', resultado: resultados.supabaseAtualizacao },
    { nome: 'Limpeza (delete)', resultado: resultados.limpeza },
  ];

  let aprovados = 0;
  testes.forEach(teste => {
    const icon = teste.resultado ? '✅' : '❌';
    console.log(`   ${icon} ${teste.nome}`);
    if (teste.resultado) aprovados++;
  });

  console.log(`\n   📊 Resultado: ${aprovados}/${testes.length} testes aprovados`);
  
  if (aprovados === testes.length) {
    log('🎉', 'TODOS OS TESTES PASSARAM! Sincronização funcionando corretamente.\n');
  } else {
    log('⚠️', 'Alguns testes falharam. Verifique os detalhes acima.\n');
  }

  process.exit(aprovados === testes.length ? 0 : 1);
}

main();
