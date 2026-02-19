/**
 * Script Simples - Verificar se campos estão sendo salvos
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function verificar() {
  console.log('🔍 Verificando campos no Supabase...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Buscar últimos 5 registros
  const { data: registros, error } = await supabase
    .from('apontamentos_aranda')
    .select('nro_chamado, nro_tarefa, data_ult_modificacao, data_ult_modificacao_geral, data_ult_modificacao_tarefa, created_at')
    .eq('origem', 'sql_server')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Erro:', error.message);
    return;
  }

  if (!registros || registros.length === 0) {
    console.log('⚠️  Nenhum registro encontrado');
    return;
  }

  console.log('📊 Últimos 5 registros:\n');
  
  registros.forEach((reg, i) => {
    console.log(`${i + 1}. ${reg.nro_chamado}/${reg.nro_tarefa}`);
    console.log(`   data_ult_modificacao: ${reg.data_ult_modificacao || 'NULL'}`);
    console.log(`   data_ult_modificacao_geral: ${reg.data_ult_modificacao_geral || 'NULL ❌'}`);
    console.log(`   data_ult_modificacao_tarefa: ${reg.data_ult_modificacao_tarefa || 'NULL'}`);
    console.log(`   created_at: ${reg.created_at}`);
    console.log('');
  });

  // Contar registros com campos NULL
  const { count: total } = await supabase
    .from('apontamentos_aranda')
    .select('*', { count: 'exact', head: true })
    .eq('origem', 'sql_server');

  const { count: comDataModGeral } = await supabase
    .from('apontamentos_aranda')
    .select('*', { count: 'exact', head: true })
    .eq('origem', 'sql_server')
    .not('data_ult_modificacao_geral', 'is', null);

  console.log('📈 Estatísticas:');
  console.log(`   Total de registros: ${total}`);
  console.log(`   Com data_ult_modificacao_geral: ${comDataModGeral}`);
  console.log(`   Sem data_ult_modificacao_geral: ${total - comDataModGeral} ❌`);
  console.log('');

  if (comDataModGeral === 0) {
    console.log('❌ PROBLEMA: Nenhum registro tem data_ult_modificacao_geral populada!');
    console.log('');
    console.log('🔧 Possíveis causas:');
    console.log('   1. Campo não existe no SQL Server');
    console.log('   2. Campo está NULL no SQL Server');
    console.log('   3. Erro na função formatarDataSemTimezone()');
    console.log('');
    console.log('📝 Próximo passo:');
    console.log('   Execute: node testar-sql-server.js');
  } else {
    console.log('✅ Campos estão sendo salvos corretamente!');
  }
}

verificar().catch(console.error);
