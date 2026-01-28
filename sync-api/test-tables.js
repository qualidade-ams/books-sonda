/**
 * Script para testar se as tabelas existem no SQL Server
 */

const sql = require('mssql');
require('dotenv').config();

const sqlConfig = {
  server: process.env.SQL_SERVER || '172.26.2.136',
  port: parseInt(process.env.SQL_PORT || '1433'),
  database: process.env.SQL_DATABASE || 'Aranda',
  user: process.env.SQL_USER || 'amsconsulta',
  password: process.env.SQL_PASSWORD || 'ams@2023',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000
  }
};

async function testTables() {
  try {
    console.log('Conectando ao SQL Server...');
    const pool = await sql.connect(sqlConfig);
    console.log('✅ Conectado!');

    // Listar todas as tabelas
    console.log('\n📋 Listando todas as tabelas no banco Aranda:');
    const result = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    result.recordset.forEach(row => {
      console.log(`  - ${row.TABLE_NAME}`);
    });

    // Testar tabelas específicas
    console.log('\n🔍 Testando tabelas específicas:');
    
    const tablesToTest = [
      'AMSpesquisa',
      'AMSespecialistas',
      'AMSapontamento',
      'AMSticketsabertos'
    ];

    for (const tableName of tablesToTest) {
      try {
        const testResult = await pool.request().query(`
          SELECT TOP 1 * FROM ${tableName}
        `);
        console.log(`  ✅ ${tableName} - OK (${testResult.recordset.length} registro encontrado)`);
      } catch (error) {
        console.log(`  ❌ ${tableName} - ERRO: ${error.message}`);
      }
    }

    await pool.close();
    console.log('\n✅ Teste concluído!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  }
}

testTables();
