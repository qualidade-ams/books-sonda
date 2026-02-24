/**
 * Script para consultar a estrutura completa da tabela AMSpesquisa no SQL Server
 * e comparar com os campos atualmente sincronizados
 */

const API_URL = 'http://localhost:3001';

async function getTableStructure() {
  try {
    console.log('🔍 Consultando estrutura da tabela AMSpesquisa...\n');
    
    const response = await fetch(`${API_URL}/api/table-structure`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Erro ao consultar estrutura');
    }
    
    console.log(`✅ Tabela: ${data.table}`);
    console.log(`📊 Total de colunas: ${data.columns.length}\n`);
    
    // Campos atualmente sincronizados
    const camposSincronizados = [
      'Empresa',
      'Categoria',
      'Grupo',
      'Cliente',
      'Email_Cliente',
      'Prestador',
      'Solicitante',
      'Nro_Caso',
      'Tipo_Caso',
      'Ano_Abertura',
      'Mes_abertura',
      'Data_Resposta (Date-Hour-Minute-Second)',
      'Resposta',
      'Comentario_Pesquisa'
    ];
    
    console.log('='.repeat(80));
    console.log('CAMPOS ATUALMENTE SINCRONIZADOS');
    console.log('='.repeat(80));
    
    const camposSincronizadosEncontrados = [];
    data.columns.forEach(col => {
      const isSynced = camposSincronizados.some(campo => 
        col.COLUMN_NAME === campo || col.COLUMN_NAME.includes(campo.split(' ')[0])
      );
      
      if (isSynced) {
        camposSincronizadosEncontrados.push(col.COLUMN_NAME);
        console.log(`✅ ${col.COLUMN_NAME.padEnd(50)} ${col.DATA_TYPE.padEnd(15)} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('CAMPOS NÃO SINCRONIZADOS (FALTANDO)');
    console.log('='.repeat(80));
    
    const camposNaoSincronizados = [];
    data.columns.forEach(col => {
      const isSynced = camposSincronizadosEncontrados.some(campo => 
        col.COLUMN_NAME === campo || campo.includes(col.COLUMN_NAME)
      );
      
      if (!isSynced) {
        camposNaoSincronizados.push(col);
        console.log(`❌ ${col.COLUMN_NAME.padEnd(50)} ${col.DATA_TYPE.padEnd(15)} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('RESUMO');
    console.log('='.repeat(80));
    console.log(`Total de campos na tabela AMSpesquisa: ${data.columns.length}`);
    console.log(`Campos sincronizados: ${camposSincronizadosEncontrados.length}`);
    console.log(`Campos NÃO sincronizados: ${camposNaoSincronizados.length}`);
    
    if (camposNaoSincronizados.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('CAMPOS FALTANDO - DETALHES PARA MIGRATION');
      console.log('='.repeat(80));
      
      camposNaoSincronizados.forEach(col => {
        const sqlType = mapSqlServerTypeToPostgres(col.DATA_TYPE, col.CHARACTER_MAXIMUM_LENGTH);
        const nullable = col.IS_NULLABLE === 'YES' ? '' : 'NOT NULL';
        
        console.log(`\nALTER TABLE pesquisas_satisfacao`);
        console.log(`ADD COLUMN IF NOT EXISTS ${col.COLUMN_NAME.toLowerCase().replace(/[^a-z0-9_]/g, '_')} ${sqlType} ${nullable};`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('\n⚠️ Certifique-se de que:');
    console.error('   1. A API de sincronização está rodando (npm run dev no diretório sync-api)');
    console.error('   2. Você está conectado à VPN');
    console.error('   3. O SQL Server está acessível');
  }
}

/**
 * Mapear tipos do SQL Server para PostgreSQL
 */
function mapSqlServerTypeToPostgres(sqlType, maxLength) {
  const typeMap = {
    'varchar': maxLength ? `VARCHAR(${maxLength})` : 'TEXT',
    'nvarchar': maxLength ? `VARCHAR(${maxLength})` : 'TEXT',
    'char': maxLength ? `CHAR(${maxLength})` : 'CHAR(1)',
    'nchar': maxLength ? `CHAR(${maxLength})` : 'CHAR(1)',
    'text': 'TEXT',
    'ntext': 'TEXT',
    'int': 'INTEGER',
    'bigint': 'BIGINT',
    'smallint': 'SMALLINT',
    'tinyint': 'SMALLINT',
    'bit': 'BOOLEAN',
    'decimal': 'DECIMAL',
    'numeric': 'NUMERIC',
    'float': 'DOUBLE PRECISION',
    'real': 'REAL',
    'money': 'DECIMAL(19,4)',
    'smallmoney': 'DECIMAL(10,4)',
    'datetime': 'TIMESTAMP WITH TIME ZONE',
    'datetime2': 'TIMESTAMP WITH TIME ZONE',
    'smalldatetime': 'TIMESTAMP WITH TIME ZONE',
    'date': 'DATE',
    'time': 'TIME',
    'datetimeoffset': 'TIMESTAMP WITH TIME ZONE',
    'uniqueidentifier': 'UUID',
    'xml': 'XML',
    'binary': 'BYTEA',
    'varbinary': 'BYTEA',
    'image': 'BYTEA'
  };
  
  return typeMap[sqlType.toLowerCase()] || 'TEXT';
}

// Executar
getTableStructure();
