// Script de teste para executar migração
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (você precisa ajustar com suas credenciais)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'sua-url-aqui';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sua-chave-aqui';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executarMigracao() {
  try {
    console.log('🚀 Executando migração...');
    
    // Executar a migração
    const { data, error } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE planos_acao ADD COLUMN IF NOT EXISTS comentario_cliente TEXT;
        
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'planos_acao' 
        AND column_name = 'comentario_cliente';
      `
    });
    
    if (error) {
      console.error('❌ Erro na migração:', error);
    } else {
      console.log('✅ Migração executada com sucesso!', data);
    }
  } catch (err) {
    console.error('❌ Erro:', err);
  }
}

executarMigracao();