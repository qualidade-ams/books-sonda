/**
 * Script para testar sincronização de tickets
 */

const http = require('http');

function testarEndpoint(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (method === 'POST') {
      req.write('{}');
    }

    req.end();
  });
}

async function main() {
  console.log('🧪 Testando sincronização de tickets...\n');

  try {
    // 1. Testar conexão
    console.log('1️⃣ Testando conexão com SQL Server...');
    const testConn = await testarEndpoint('/api/test-connection-tickets', 'GET');
    console.log(`   Status: ${testConn.status}`);
    console.log(`   Resposta:`, JSON.stringify(testConn.data, null, 2));
    console.log('');

    // 2. Testar estrutura da tabela
    console.log('2️⃣ Verificando estrutura da tabela...');
    const testStruct = await testarEndpoint('/api/table-structure-tickets', 'GET');
    console.log(`   Status: ${testStruct.status}`);
    if (testStruct.data.columns) {
      console.log(`   Colunas encontradas: ${testStruct.data.columns.length}`);
    }
    console.log('');

    // 3. Testar sincronização
    console.log('3️⃣ Executando sincronização de tickets...');
    const testSync = await testarEndpoint('/api/sync-tickets', 'POST');
    console.log(`   Status: ${testSync.status}`);
    console.log(`   Resposta:`, JSON.stringify(testSync.data, null, 2));
    console.log('');

    if (testSync.status === 200) {
      console.log('✅ Sincronização concluída com sucesso!');
    } else {
      console.log('❌ Erro na sincronização');
    }

  } catch (error) {
    console.error('💥 Erro ao testar:', error.message);
    process.exit(1);
  }
}

main();
