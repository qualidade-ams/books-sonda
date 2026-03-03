#!/usr/bin/env node

/**
 * Script auxiliar para encontrar o caminho do navegador instalado
 * Execute: node scripts/find-browser.cjs
 */

const { existsSync } = require('fs');
const { platform } = require('process');

// Caminhos comuns do Chrome/Edge por sistema operacional
const BROWSER_PATHS = {
  win32: [
    // Edge (mais comum no Windows 11)
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.LOCALAPPDATA + '\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.PROGRAMFILES + '\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env['PROGRAMFILES(X86)'] + '\\Microsoft\\Edge\\Application\\msedge.exe',
    // Chrome
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
    // Chromium
    process.env.LOCALAPPDATA + '\\Chromium\\Application\\chrome.exe',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/microsoft-edge',
    '/snap/bin/chromium',
  ],
};

console.log('🔍 Procurando navegadores instalados...\n');
console.log(`📍 Sistema operacional: ${platform}\n`);

const paths = BROWSER_PATHS[platform] || [];
const foundBrowsers = [];

for (const path of paths) {
  try {
    if (path && existsSync(path)) {
      foundBrowsers.push(path);
      console.log('✅ Encontrado:', path);
    }
  } catch (e) {
    // Ignorar erros
  }
}

if (foundBrowsers.length === 0) {
  console.log('\n❌ Nenhum navegador encontrado nos caminhos padrão.');
  console.log('\n📥 Instale um dos navegadores:');
  console.log('   - Chrome: https://www.google.com/chrome/');
  console.log('   - Edge: https://www.microsoft.com/edge');
  process.exit(1);
}

console.log('\n✅ Navegadores encontrados:', foundBrowsers.length);
console.log('\n📝 Adicione esta linha ao seu .env.local:\n');

// Usar o primeiro navegador encontrado
const browserPath = foundBrowsers[0];
const escapedPath = platform === 'win32' 
  ? browserPath.replace(/\\/g, '\\\\')  // Escapar barras no Windows
  : browserPath;

console.log(`BROWSER_PATH="${escapedPath}"`);
console.log('\n💡 Dica: Copie e cole a linha acima no arquivo .env.local');
console.log('   Isso vai acelerar MUITO a geração de PDFs! ⚡\n');
