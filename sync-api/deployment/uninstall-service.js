/**
 * Script para desinstalar serviço Windows da sync-api
 * 
 * Uso:
 * node uninstall-service.js
 */

const Service = require('node-windows').Service;
const path = require('path');

// Caminho absoluto para o servidor
const scriptPath = path.join(__dirname, '..', 'dist', 'server.js');

console.log('🗑️  Desinstalando Books SND Sync API...');

// Criar objeto de serviço
const svc = new Service({
  name: 'Books SND Sync API',
  script: scriptPath
});

// Eventos do serviço
svc.on('uninstall', function() {
  console.log('✅ Serviço desinstalado com sucesso!');
});

svc.on('alreadyuninstalled', function() {
  console.log('⚠️  Serviço não está instalado!');
});

svc.on('error', function(err) {
  console.error('❌ Erro ao desinstalar serviço:', err);
});

// Desinstalar serviço
console.log('⏳ Desinstalando...');
svc.uninstall();
