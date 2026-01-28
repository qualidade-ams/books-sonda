/**
 * Script para verificar as colunas das tabelas
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

async function checkColumns() {
  try {
    console.log('Conectando ao SQL Server...');
    const pool = await sql.connect(sqlConfig);
    console.log('✅ Conectado!');

    // Verificar colunas de AMSticketsabertos
    console.log('\n📋 Colunas da tabela AMSticketsabertos:');
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'AMSticketsabertos'
      ORDER BY ORDINAL_POSITION
    `);

    result.recordset.forEach(row => {
      console.log(`  - ${row.COLUMN_NAME} (${row.DATA_TYPE})`);
    });

    // Verificar colunas de AMSapontamento
    console.log('\n📋 Colunas da tabela AMSapontamento:');
    const result2 = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'AMSapontamento'
      ORDER BY ORDINAL_POSITION
    `);

    result2.recordset.forEach(row => {
      console.log(`  - ${row.COLUMN_NAME} (${row.DATA_TYPE})`);
    });

    await pool.close();
    console.log('\n✅ Verificação concluída!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkColumns();
