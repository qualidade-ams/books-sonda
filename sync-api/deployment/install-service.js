/**
 * Script para instalar sync-api como serviço Windows
 * 
 * Uso:
 * 1. npm install -g node-windows
 * 2. node install-service.js
 */

const Service = require('node-windows').Service;
const path = require('path');

// Caminho absoluto para o servidor
const scriptPath = path.join(__dirname, '..', 'dist', 'server.js');

console.log('📦 Instalando Books SND Sync API como serviço Windows...');
console.log('📂 Script:', scriptPath);

// Criar objeto de serviço
const svc = new Service({
  name: 'Books SND Sync API',
  description: 'API de sincronização de pesquisas do SQL Server para Supabase',
  script: scriptPath,
  nodeOptions: [
    '--max_old_space_size=4096'
  ],
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    }
  ],
  workingDirectory: path.join(__dirname, '..'),
  allowServiceLogon: true
});

// Eventos do serviço
svc.on('install', function() {
  console.log('✅ Serviço instalado com sucesso!');
  console.log('🚀 Iniciando serviço...');
  svc.start();
});

svc.on('alreadyinstalled', function() {
  console.log('⚠️  Serviço já está instalado!');
  console.log('💡 Para reinstalar, execute: node uninstall-service.js');
});

svc.on('start', function() {
  console.log('✅ Serviço iniciado com sucesso!');
  console.log('');
  console.log('📊 Comandos úteis:');
  console.log('   - Parar:     net stop "Books SND Sync API"');
  console.log('   - Iniciar:   net start "Books SND Sync API"');
  console.log('   - Status:    sc query "Books SND Sync API"');
  console.log('   - Logs:      type C:\\apps\\books-sonda-sync-api\\logs\\service.log');
});

svc.on('error', function(err) {
  console.error('❌ Erro ao instalar serviço:', err);
});

// Instalar serviço
console.log('⏳ Instalando...');
svc.install();
