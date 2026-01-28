/**
 * Script para testar sincronização diretamente
 */

const http = require('http');

function testEndpoint(path, method = 'POST') {
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

    console.log(`\n🔍 Testando: ${method} ${path}`);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        try {
          const json = JSON.parse(data);
          console.log('Resposta:', JSON.stringify(json, null, 2));
          resolve(json);
        } catch (e) {
          console.log('Resposta (texto):', data);
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Erro:', error.message);
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  try {
    // Testar health
    await testEndpoint('/health', 'GET');

    // Testar conexão apontamentos
    await testEndpoint('/api/test-connection-apontamentos', 'GET');

    // Testar conexão tickets
    await testEndpoint('/api/test-connection-tickets', 'GET');

    // Testar sincronização apontamentos
    await testEndpoint('/api/sync-apontamentos', 'POST');

    // Testar sincronização tickets
    await testEndpoint('/api/sync-tickets', 'POST');

    console.log('\n✅ Todos os testes concluídos!');
  } catch (error) {
    console.error('\n❌ Erro nos testes:', error);
  }
}

runTests();
