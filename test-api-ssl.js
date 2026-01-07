#!/usr/bin/env node

/**
 * Script para testar conectividade SSL da API
 */

const https = require('https');
const http = require('http');

const hostname = 'SAPSERVDB.sondait.com.br';
const port = 3001;

console.log('🔍 Testando conectividade da API...\n');

// Teste HTTPS
console.log('📡 Testando HTTPS...');
const httpsOptions = {
  hostname,
  port,
  path: '/health',
  method: 'GET',
  timeout: 5000,
  rejectUnauthorized: false // Aceita certificados auto-assinados
};

const httpsReq = https.request(httpsOptions, (res) => {
  console.log(`✅ HTTPS Status: ${res.statusCode}`);
  console.log(`✅ HTTPS Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`✅ HTTPS Response:`, data);
  });
});

httpsReq.on('error', (err) => {
  console.log(`❌ HTTPS Error:`, err.message);
  
  // Se HTTPS falhar, testa HTTP
  console.log('\n📡 Testando HTTP como fallback...');
  
  const httpOptions = {
    hostname,
    port,
    path: '/health',
    method: 'GET',
    timeout: 5000
  };
  
  const httpReq = http.request(httpOptions, (res) => {
    console.log(`✅ HTTP Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`✅ HTTP Response:`, data);
      console.log('\n💡 Recomendação: Configure HTTPS no servidor para produção');
    });
  });
  
  httpReq.on('error', (err) => {
    console.log(`❌ HTTP Error:`, err.message);
    console.log('\n🚨 Servidor não está acessível via HTTP nem HTTPS');
  });
  
  httpReq.on('timeout', () => {
    console.log('❌ HTTP Timeout');
    httpReq.destroy();
  });
  
  httpReq.end();
});

httpsReq.on('timeout', () => {
  console.log('❌ HTTPS Timeout');
  httpsReq.destroy();
});

httpsReq.end();