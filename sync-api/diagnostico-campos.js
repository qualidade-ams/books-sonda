/**
 * Script de Diagnóstico - Verificar Campos no Supabase
 * 
 * Este script verifica se os campos necessários existem
 * na tabela apontamentos_aranda do Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function diagnosticar() {
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║        DIAGNÓSTICO DE CAMPOS - APONTAMENTOS ARANDA        ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  log('');

  // Verificar variáveis de ambiente
  logInfo('Verificando variáveis de ambiente...');
  
  if (!process.env.SUPABASE_URL) {
    logError('SUPABASE_URL não está definida no .env');
    process.exit(1);
  }
  
  if (!process.env.SUPABASE_SERVICE_KEY) {
    logError('SUPABASE_SERVICE_KEY não está definida no .env');
    process.exit(1);
  }
  
  logSuccess('Variáveis de ambiente OK');
  log('');

  // Conectar ao Supabase
  logInfo('Conectando ao Supabase...');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  logSuccess('Conectado ao Supabase');
  log('');

  // Verificar estrutura da tabela
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log('VERIFICANDO ESTRUTURA DA TABELA', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log('');

  try {
    // Buscar informações das colunas
    const { data: columns, error } = await supabase
      .rpc('get_table_columns', { table_name: 'apontamentos_aranda' })
      .catch(() => {
        // Se RPC não existir, tentar query direta
        return supabase
          .from('apontamentos_aranda')
          .select('*')
          .limit(1);
      });

    if (error) {
      logWarning('Não foi possível obter estrutura via RPC, tentando método alternativo...');
    }

    // Buscar um registro para ver os campos
    logInfo('Buscando registro de exemplo...');
    const { data: registros, error: erroRegistros } = await supabase
      .from('apontamentos_aranda')
      .select('*')
      .eq('origem', 'sql_server')
      .order('created_at', { ascending: false })
      .limit(1);

    if (erroRegistros) {
      logError(`Erro ao buscar registros: ${erroRegistros.message}`);
      process.exit(1);
    }

    if (!registros || registros.length === 0) {
      logWarning('Nenhum registro encontrado na tabela');
      log('');
      logInfo('Execute uma sincronização primeiro para popular a tabela');
      process.exit(0);
    }

    const registro = registros[0];
    const campos = Object.keys(registro);

    logSuccess(`Encontrado registro de exemplo (ID: ${registro.id})`);
    log('');

    // Verificar campos críticos
    log('═══════════════════════════════════════════════════════════', 'cyan');
    log('VERIFICANDO CAMPOS CRÍTICOS', 'cyan');
    log('═══════════════════════════════════════════════════════════', 'cyan');
    log('');

    const camposCriticos = [
      'data_ult_modificacao',
      'data_ult_modificacao_geral',
      'data_ult_modificacao_tarefa'
    ];

    let camposFaltando = [];

    camposCriticos.forEach(campo => {
      if (campos.includes(campo)) {
        const valor = registro[campo];
        if (valor) {
          logSuccess(`${campo}: ${valor}`);
        } else {
          logWarning(`${campo}: NULL (campo existe mas está vazio)`);
        }
      } else {
        logError(`${campo}: CAMPO NÃO EXISTE`);
        camposFaltando.push(campo);
      }
    });

    log('');

    // Estatísticas
    log('═══════════════════════════════════════════════════════════', 'cyan');
    log('ESTATÍSTICAS DOS CAMPOS', 'cyan');
    log('═══════════════════════════════════════════════════════════', 'cyan');
    log('');

    // Contar registros com campos populados
    const { count: totalRegistros } = await supabase
      .from('apontamentos_aranda')
      .select('*', { count: 'exact', head: true })
      .eq('origem', 'sql_server');

    logInfo(`Total de registros: ${totalRegistros || 0}`);
    log('');

    // Verificar campos populados
    for (const campo of camposCriticos) {
      if (campos.includes(campo)) {
        const { count } = await supabase
          .from('apontamentos_aranda')
          .select('*', { count: 'exact', head: true })
          .eq('origem', 'sql_server')
          .not(campo, 'is', null);

        const percentual = totalRegistros > 0 
          ? ((count / totalRegistros) * 100).toFixed(1)
          : 0;

        if (count === 0) {
          logError(`${campo}: 0 registros (0%)`);
        } else if (count < totalRegistros) {
          logWarning(`${campo}: ${count} registros (${percentual}%)`);
        } else {
          logSuccess(`${campo}: ${count} registros (100%)`);
        }
      }
    }

    log('');

    // Recomendações
    log('═══════════════════════════════════════════════════════════', 'cyan');
    log('RECOMENDAÇÕES', 'cyan');
    log('═══════════════════════════════════════════════════════════', 'cyan');
    log('');

    if (camposFaltando.length > 0) {
      logError('CAMPOS FALTANDO NA TABELA:');
      camposFaltando.forEach(campo => {
        logError(`  • ${campo}`);
      });
      log('');
      logInfo('SOLUÇÃO:');
      logInfo('1. Execute o script SQL: fix-data-ult-modificacao-geral.sql');
      logInfo('2. No Supabase SQL Editor, execute:');
      log('');
      log('   ALTER TABLE apontamentos_aranda', 'yellow');
      log('   ADD COLUMN data_ult_modificacao_geral TIMESTAMP WITH TIME ZONE;', 'yellow');
      log('');
      log('   ALTER TABLE apontamentos_aranda', 'yellow');
      log('   ADD COLUMN data_ult_modificacao_tarefa TIMESTAMP WITH TIME ZONE;', 'yellow');
      log('');
    } else {
      logSuccess('Todos os campos críticos existem!');
      log('');

      // Verificar se campos estão populados
      const { count: comDataModGeral } = await supabase
        .from('apontamentos_aranda')
        .select('*', { count: 'exact', head: true })
        .eq('origem', 'sql_server')
        .not('data_ult_modificacao_geral', 'is', null);

      if (comDataModGeral === 0) {
        logWarning('Campo data_ult_modificacao_geral existe mas está vazio em todos os registros');
        log('');
        logInfo('POSSÍVEIS CAUSAS:');
        logInfo('1. Campo não existe no SQL Server');
        logInfo('2. Campo está NULL no SQL Server');
        logInfo('3. Sincronização antiga não salvava este campo');
        log('');
        logInfo('SOLUÇÃO:');
        logInfo('1. Verificar se campo existe no SQL Server:');
        log('');
        log('   SELECT TOP 10 Data_Ult_Modificacao_Geral', 'yellow');
        log('   FROM AMSapontamento', 'yellow');
        log('   WHERE Data_Ult_Modificacao_Geral IS NOT NULL;', 'yellow');
        log('');
        logInfo('2. Se campo não existir no SQL Server, criar:');
        log('');
        log('   ALTER TABLE AMSapontamento', 'yellow');
        log('   ADD Data_Ult_Modificacao_Geral DATETIME;', 'yellow');
        log('');
        logInfo('3. Popular campo com dados existentes:');
        log('');
        log('   UPDATE AMSapontamento', 'yellow');
        log('   SET Data_Ult_Modificacao_Geral = [Data_Ult_Modificacao (Date-Hour-Minute-Second)]', 'yellow');
        log('   WHERE Data_Ult_Modificacao_Geral IS NULL;', 'yellow');
        log('');
        logInfo('4. Executar nova sincronização');
      } else {
        logSuccess(`${comDataModGeral} registros têm data_ult_modificacao_geral populada`);
        log('');
        logSuccess('Sistema está funcionando corretamente!');
      }
    }

    log('');
    log('═══════════════════════════════════════════════════════════', 'cyan');
    log('DIAGNÓSTICO CONCLUÍDO', 'cyan');
    log('═══════════════════════════════════════════════════════════', 'cyan');

  } catch (erro) {
    log('');
    logError(`Erro durante diagnóstico: ${erro.message}`);
    console.error(erro);
    process.exit(1);
  }
}

// Executar diagnóstico
diagnosticar().catch(error => {
  logError(`Erro fatal: ${error.message}`);
  process.exit(1);
});
