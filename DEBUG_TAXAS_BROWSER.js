// Script para executar no console do navegador para debug das taxas da EXXONMOBIL
// Abra o DevTools (F12) e cole este código no console

// 1. Verificar se o Supabase está disponível
console.log('🔍 Verificando Supabase client...');
if (typeof window !== 'undefined' && window.supabase) {
  console.log('✅ Supabase client encontrado');
} else {
  console.log('❌ Supabase client não encontrado');
}

// 2. Função para buscar empresas EXXONMOBIL
async function buscarExxonmobil() {
  try {
    console.log('🔍 Buscando empresas EXXONMOBIL...');
    
    // Assumindo que o supabase está disponível globalmente ou através de import
    const { createClient } = await import('/src/integrations/supabase/client.js');
    const supabase = createClient();
    
    const { data: empresas, error: errorEmpresas } = await supabase
      .from('empresas_clientes')
      .select('id, nome_abreviado, nome_completo, status, tem_ams, template_padrao')
      .or('nome_abreviado.ilike.%EXXON%,nome_completo.ilike.%EXXON%');
    
    if (errorEmpresas) {
      console.error('❌ Erro ao buscar empresas:', errorEmpresas);
      return;
    }
    
    console.log('✅ Empresas EXXONMOBIL encontradas:', empresas);
    
    if (empresas && empresas.length > 0) {
      const empresa = empresas[0];
      console.log('🏢 Empresa selecionada:', empresa);
      
      // 3. Buscar taxas específicas para esta empresa
      console.log('🔍 Buscando taxas específicas...');
      const { data: taxas, error: errorTaxas } = await supabase
        .from('taxas_clientes')
        .select('*')
        .eq('cliente_id', empresa.id);
      
      if (errorTaxas) {
        console.error('❌ Erro ao buscar taxas:', errorTaxas);
        return;
      }
      
      console.log('✅ Taxas encontradas:', taxas);
      
      if (taxas && taxas.length > 0) {
        const taxa = taxas[0];
        console.log('💰 Taxa específica:', {
          id: taxa.id,
          cliente_id: taxa.cliente_id,
          ticket_excedente_simples: taxa.ticket_excedente_simples,
          valor_formatado: taxa.ticket_excedente_simples ? 
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(taxa.ticket_excedente_simples) : 
            'Não definido'
        });
      } else {
        console.log('⚠️ Nenhuma taxa específica encontrada para esta empresa');
        
        // Verificar se a tabela existe e tem dados
        const { data: todasTaxas, error: errorTodasTaxas } = await supabase
          .from('taxas_clientes')
          .select('id, cliente_id, ticket_excedente_simples')
          .limit(5);
        
        console.log('📊 Primeiras 5 taxas da tabela:', todasTaxas);
      }
    } else {
      console.log('⚠️ Nenhuma empresa EXXONMOBIL encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// 4. Executar a função
console.log('🚀 Iniciando debug das taxas EXXONMOBIL...');
buscarExxonmobil();

// 5. Função para verificar estrutura da tabela
async function verificarEstruturaTaxas() {
  try {
    console.log('🔍 Verificando estrutura da tabela taxas_clientes...');
    
    const { createClient } = await import('/src/integrations/supabase/client.js');
    const supabase = createClient();
    
    const { data, error } = await supabase
      .rpc('get_table_columns', { table_name: 'taxas_clientes' });
    
    if (error) {
      console.log('⚠️ Não foi possível verificar estrutura via RPC, tentando query direta...');
      
      // Tentar buscar um registro para ver os campos
      const { data: sample, error: sampleError } = await supabase
        .from('taxas_clientes')
        .select('*')
        .limit(1);
      
      if (sample && sample.length > 0) {
        console.log('📋 Campos disponíveis na tabela:', Object.keys(sample[0]));
        console.log('📄 Exemplo de registro:', sample[0]);
      }
    } else {
      console.log('📋 Estrutura da tabela:', data);
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error);
  }
}

// Executar verificação de estrutura também
verificarEstruturaTaxas();