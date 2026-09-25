/**
 * Script para instalar sync-api como serviço Windows
 *
 * Uso (terminal como Administrador, na pasta da sync-api):
 * 1. npm install -g node-windows
 * 2. npm link node-windows        (sem isto o require abaixo não encontra o pacote)
 * 3. npm run build                (o serviço roda dist/server.js, não o src)
 * 4. node deployment\install-service.js
 *
 * Depois de qualquer atualização do código: npm run build + reiniciar o serviço.
 * Logs: dist\daemon\*.out.log (saída) e *.err.log (erros).
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
  // Roda com a conta do sistema (LocalSystem). Não usar allowServiceLogon: sem
  // usuário definido, o WinSW tenta dar a permissão a uma conta vazia do domínio
  // e a instalação falha com "LookupAccountName failed: 1788".
  workingDirectory: path.join(__dirname, '..')
});

// Eventos do serviço
svc.on('install', function() {
  console.log('✅ Serviço instalado com sucesso!');
  console.log('🚀 Iniciando serviço...');
  svc.start();
});

svc.on('alreadyinstalled', function() {
  console.log('⚠️  Serviço já está instalado!');
  console.log('💡 Para reinstalar, execute: node deployment\\uninstall-service.js');
});

svc.on('start', function() {
  console.log('✅ Serviço iniciado com sucesso!');
  console.log('');
  console.log('📊 Comandos úteis:');
  console.log('   - Parar:     net stop "Books SND Sync API"');
  console.log('   - Iniciar:   net start "Books SND Sync API"');
  console.log('   - Status:    sc query bookssndsyncapi.exe');
  console.log('   - Logs:      ' + path.join(__dirname, '..', 'dist', 'daemon') + '\\*.out.log e *.err.log');
});

svc.on('error', function(err) {
  console.error('❌ Erro ao instalar serviço:', err);
});

// Instalar serviço
console.log('⏳ Instalando...');
svc.install();
