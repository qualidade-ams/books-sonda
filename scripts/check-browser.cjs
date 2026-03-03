/**
 * Script para verificar se Chrome ou Edge está instalado
 * Execute: node scripts/check-browser.js
 */

const { existsSync } = require('fs');
const os = require('os');

const BROWSER_PATHS = {
  win32: [
    // Chrome
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    // Edge
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.LOCALAPPDATA + '\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/microsoft-edge',
  ],
};

console.log('🔍 Verificando navegadores instalados...\n');
console.log('Sistema operacional:', os.platform());
console.log('Arquitetura:', os.arch());
console.log('');

const platform = os.platform();
const paths = BROWSER_PATHS[platform] || [];

let found = false;

console.log('Caminhos verificados:');
for (const path of paths) {
  const exists = existsSync(path);
  const status = exists ? '✅ ENCONTRADO' : '❌ Não encontrado';
  console.log(`${status}: ${path}`);
  
  if (exists && !found) {
    found = true;
    console.log('\n🎉 Navegador encontrado! A geração de PDF deve funcionar.\n');
  }
}

if (!found) {
  console.log('\n❌ ERRO: Nenhum navegador encontrado!\n');
  console.log('Para gerar PDFs, você precisa instalar:');
  console.log('- Chrome: https://www.google.com/chrome/');
  console.log('- Edge: https://www.microsoft.com/edge');
  console.log('');
  process.exit(1);
}
