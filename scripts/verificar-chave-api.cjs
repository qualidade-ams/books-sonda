#!/usr/bin/env node

/**
 * Script para verificar se a chave API do Supabase está correta
 * 
 * Uso:
 *   node scripts/verificar-chave-api.cjs
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuração do Supabase...\n');

// Ler arquivo .env.local
const envPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ Arquivo .env.local não encontrado!');
  console.log('📝 Crie o arquivo .env.local na raiz do projeto');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');

let supabaseUrl = null;
let supabaseKey = null;

// Extrair variáveis
lines.forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.split('=')[1];
  }
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseKey = trimmed.split('=')[1];
  }
});

// Verificar URL
console.log('📡 Supabase URL:');
if (supabaseUrl) {
  console.log(`   ✅ ${supabaseUrl}`);
} else {
  console.log('   ❌ VITE_SUPABASE_URL não encontrada');
}

console.log('');

// Verificar chave
console.log('🔑 Supabase Anon Key:');
if (!supabaseKey) {
  console.log('   ❌ VITE_SUPABASE_ANON_KEY não encontrada');
  console.log('');
  console.log('📝 Adicione a chave no arquivo .env.local:');
  console.log('   VITE_SUPABASE_ANON_KEY=sua_chave_aqui');
  process.exit(1);
}

// Verificar tipo de chave
const keyPreview = supabaseKey.substring(0, 50) + '...';
console.log(`   ${keyPreview}`);
console.log('');

if (supabaseKey.startsWith('sb_publishable_')) {
  console.log('❌ ERRO: Você está usando uma chave PUBLISHABLE!');
  console.log('');
  console.log('🔧 Solução:');
  console.log('   1. Acesse: https://supabase.com/dashboard/project/qiahexepsdggkzgmklhq/settings/api');
  console.log('   2. Copie a chave "anon / public" (começa com eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9)');
  console.log('   3. Substitua no .env.local');
  console.log('   4. Reinicie o servidor: npm run dev');
  console.log('');
  console.log('📚 Documentação: docs/SOLUCAO-DEFINITIVA-ERRO-406.md');
  process.exit(1);
}

if (supabaseKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')) {
  console.log('✅ Chave ANON correta (JWT)');
  
  // Tentar decodificar JWT para verificar
  try {
    const parts = supabaseKey.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('');
      console.log('📊 Informações da chave:');
      console.log(`   - Projeto: ${payload.ref || 'N/A'}`);
      console.log(`   - Role: ${payload.role || 'N/A'}`);
      
      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000);
        const now = new Date();
        const isExpired = expDate < now;
        
        console.log(`   - Expira em: ${expDate.toLocaleDateString('pt-BR')}`);
        
        if (isExpired) {
          console.log('');
          console.log('⚠️  AVISO: Chave expirada!');
          console.log('   Gere uma nova chave no Supabase Dashboard');
        } else {
          console.log('   - Status: ✅ Válida');
        }
      }
    }
  } catch (error) {
    console.log('   (Não foi possível decodificar JWT)');
  }
  
  console.log('');
  console.log('🎉 Configuração correta!');
  console.log('');
  console.log('📝 Próximos passos:');
  console.log('   1. Reinicie o servidor se ainda não fez: npm run dev');
  console.log('   2. Acesse: http://localhost:8080/admin/geracao-books');
  console.log('   3. Verifique se os erros 406 sumiram');
  
} else {
  console.log('⚠️  Formato de chave desconhecido');
  console.log('');
  console.log('🔧 Verifique se:');
  console.log('   - A chave está completa (sem quebras de linha)');
  console.log('   - Não há espaços extras');
  console.log('   - É a chave "anon / public" do Supabase Dashboard');
}

console.log('');
