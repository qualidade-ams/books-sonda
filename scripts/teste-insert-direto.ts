/**
 * Script de Teste - Insert Direto no Supabase
 * 
 * Este script testa o insert direto no Supabase para verificar se o problema
 * está no código TypeScript ou no banco de dados.
 * 
 * COMO USAR:
 * 1. Abra o console do navegador (F12)
 * 2. Copie e cole este código no console
 * 3. Execute e veja o resultado
 */

import { supabase } from '@/integrations/supabase/client';

async function testarInsertDireto() {
  console.log('🧪 Iniciando teste de insert direto...');
  
  // Dados de teste
  const dadosTeste = {
    nome_completo: 'EMPRESA TESTE SEGMENTACAO DIRETO',
    nome_abreviado: 'TESTE_SEG_DIR',
    email_gestor: 'teste@sonda.com',
    status: 'ativo',
    baseline_segmentado: true,
    segmentacao_config: {
      empresas: [
        {
          nome: 'NÍQUEL',
          percentual: 60,
          filtro_tipo: 'contem',
          filtro_valor: 'NIQUEL',
          ordem: 1
        },
        {
          nome: 'IOB',
          percentual: 40,
          filtro_tipo: 'nao_contem',
          filtro_valor: 'NIQUEL',
          ordem: 2
        }
      ]
    }
  };
  
  console.log('📤 Dados que serão enviados:', dadosTeste);
  console.log('📊 Tipo de segmentacao_config:', typeof dadosTeste.segmentacao_config);
  console.log('📋 JSON stringified:', JSON.stringify(dadosTeste.segmentacao_config));
  
  try {
    // Tentar insert
    const { data, error } = await supabase
      .from('empresas_clientes')
      .insert(dadosTeste)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro no insert:', error);
      console.error('📋 Detalhes do erro:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return { success: false, error };
    }
    
    console.log('✅ Insert realizado com sucesso!');
    console.log('📊 Dados salvos:', data);
    console.log('🔍 baseline_segmentado:', data.baseline_segmentado);
    console.log('🔍 segmentacao_config:', data.segmentacao_config);
    
    // Verificar se os dados foram salvos corretamente
    const { data: verificacao, error: errorVerificacao } = await supabase
      .from('empresas_clientes')
      .select('id, nome_abreviado, baseline_segmentado, segmentacao_config')
      .eq('id', data.id)
      .single();
    
    if (errorVerificacao) {
      console.error('❌ Erro ao verificar dados:', errorVerificacao);
      return { success: false, error: errorVerificacao };
    }
    
    console.log('✅ Verificação dos dados salvos:', verificacao);
    
    // Limpar dados de teste
    console.log('🧹 Limpando dados de teste...');
    const { error: errorDelete } = await supabase
      .from('empresas_clientes')
      .delete()
      .eq('id', data.id);
    
    if (errorDelete) {
      console.warn('⚠️ Não foi possível limpar dados de teste:', errorDelete);
      console.warn('⚠️ Limpe manualmente a empresa:', data.nome_abreviado);
    } else {
      console.log('✅ Dados de teste limpos com sucesso!');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    return { success: false, error };
  }
}

// Executar teste
testarInsertDireto().then(result => {
  if (result.success) {
    console.log('🎉 TESTE PASSOU! O problema NÃO está no banco de dados.');
    console.log('🔍 Investigar: Código TypeScript do formulário ou serviço.');
  } else {
    console.log('❌ TESTE FALHOU! O problema ESTÁ no banco de dados.');
    console.log('🔍 Investigar: Migration, trigger ou validação no banco.');
  }
});

export { testarInsertDireto };
