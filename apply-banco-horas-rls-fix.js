// Script para aplicar migration de correção de RLS do banco de horas
// Execute com: node apply-banco-horas-rls-fix.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração do Supabase (do .env.local)
const SUPABASE_URL = "https://qiahexepsdggkzgmklhq.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYWhleGVwc2RnZ2t6Z21rbGhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUzMDc4MiwiZXhwIjoyMDczMTA2NzgyfQ.C5KHnIbmGxJPdeEgO5s0h8_c43EtsFwQo9GovFzBH6E";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('🚀 Iniciando aplicação da migration...');
    console.log('');
    
    // Ler arquivo de migration
    const migrationPath = join(__dirname, 'supabase', 'migration', '20260218000001_fix_banco_horas_versoes_rls.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Migration carregada:', migrationPath);
    console.log('');
    
    // Executar migration
    console.log('⚙️ Executando migration...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });
    
    if (error) {
      console.error('❌ Erro ao executar migration:', error);
      
      // Tentar executar diretamente via REST API
      console.log('');
      console.log('🔄 Tentando executar via REST API...');
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ sql_query: migrationSQL })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na REST API:', errorText);
        console.log('');
        console.log('📋 INSTRUÇÕES MANUAIS:');
        console.log('1. Acesse o Supabase Dashboard: https://supabase.com/dashboard/project/qiahexepsdggkzgmklhq');
        console.log('2. Vá em "SQL Editor"');
        console.log('3. Cole o conteúdo do arquivo: supabase/migration/20260218000001_fix_banco_horas_versoes_rls.sql');
        console.log('4. Execute a query');
        return;
      }
      
      const result = await response.json();
      console.log('✅ Migration executada com sucesso via REST API!');
      console.log('');
      console.log('📊 Resultado:', result);
    } else {
      console.log('✅ Migration executada com sucesso!');
      console.log('');
      console.log('📊 Resultado:', data);
    }
    
    console.log('');
    console.log('🎉 Processo concluído!');
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('1. Teste a funcionalidade de reajuste de banco de horas');
    console.log('2. Verifique se não há mais erros de RLS no console');
    console.log('3. Confirme que as versões estão sendo criadas corretamente');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    console.log('');
    console.log('📋 INSTRUÇÕES MANUAIS:');
    console.log('1. Acesse o Supabase Dashboard: https://supabase.com/dashboard/project/qiahexepsdggkzgmklhq');
    console.log('2. Vá em "SQL Editor"');
    console.log('3. Cole o conteúdo do arquivo: supabase/migration/20260218000001_fix_banco_horas_versoes_rls.sql');
    console.log('4. Execute a query');
  }
}

applyMigration();
