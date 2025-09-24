// Teste de integração para verificar se a tabela anexos_temporarios está funcionando

import { supabase } from '@/integrations/supabase/client';

export async function testarIntegracaoAnexos() {
  console.log('🧪 Testando integração com tabela anexos_temporarios...');

  try {
    // 1. Verificar se conseguimos fazer uma consulta básica
    console.log('1. Testando consulta básica...');
    const { data: count, error: countError } = await supabase
      .from('anexos_temporarios')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Erro na consulta básica:', countError);
      return false;
    }

    console.log('✅ Consulta básica funcionando. Total de registros:', count);

    // 2. Buscar uma empresa para teste
    console.log('2. Buscando empresa para teste...');
    const { data: empresas, error: empresasError } = await supabase
      .from('empresas_clientes')
      .select('id, nome_completo')
      .limit(1);

    if (empresasError || !empresas || empresas.length === 0) {
      console.error('❌ Erro ao buscar empresa ou nenhuma empresa encontrada:', empresasError);
      return false;
    }

    const empresaTeste = empresas[0];
    console.log('✅ Empresa encontrada:', empresaTeste.nome_completo);

    // 3. Tentar inserir um registro de teste
    console.log('3. Testando inserção...');
    const anexoTeste = {
      empresa_id: empresaTeste.id,
      nome_original: 'teste_integracao.pdf',
      nome_arquivo: `teste_${Date.now()}.pdf`,
      tipo_mime: 'application/pdf',
      tamanho_bytes: 1024,
      url_temporaria: 'https://exemplo.com/teste.pdf',
      token_acesso: 'token_teste_123',
      status: 'pendente'
    };

    const { data: anexoInserido, error: insertError } = await supabase
      .from('anexos_temporarios')
      .insert(anexoTeste)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro na inserção:', insertError);
      return false;
    }

    console.log('✅ Inserção bem-sucedida:', anexoInserido.id);

    // 4. Verificar se conseguimos buscar o registro inserido
    console.log('4. Testando busca do registro inserido...');
    const { data: anexoBuscado, error: selectError } = await supabase
      .from('anexos_temporarios')
      .select('*')
      .eq('id', anexoInserido.id)
      .single();

    if (selectError) {
      console.error('❌ Erro na busca:', selectError);
      return false;
    }

    console.log('✅ Busca bem-sucedida:', anexoBuscado.nome_original);

    // 5. Limpar o registro de teste
    console.log('5. Limpando registro de teste...');
    const { error: deleteError } = await supabase
      .from('anexos_temporarios')
      .delete()
      .eq('id', anexoInserido.id);

    if (deleteError) {
      console.error('⚠️ Erro ao limpar registro de teste:', deleteError);
      // Não retornar false aqui, pois o teste principal funcionou
    } else {
      console.log('✅ Registro de teste removido');
    }

    console.log('🎉 Todos os testes passaram! A integração está funcionando.');
    return true;

  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
    return false;
  }
}

// Para executar o teste, chame esta função no console do navegador:
// testarIntegracaoAnexos().then(resultado => console.log('Resultado:', resultado));