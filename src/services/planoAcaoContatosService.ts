// =====================================================
// SERVIÇO: CONTATOS DO PLANO DE AÇÃO
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import type {
  PlanoAcaoContato,
  PlanoAcaoContatoFormData,
} from '@/types/planoAcaoContatos';

/**
 * Buscar todos os contatos de um plano de ação
 */
export async function buscarContatosPlanoAcao(planoAcaoId: string): Promise<PlanoAcaoContato[]> {
  console.log('🔍 Buscando contatos do plano de ação:', planoAcaoId);
  
  const { data, error } = await supabase
    .from('plano_acao_contatos')
    .select('*')
    .eq('plano_acao_id', planoAcaoId)
    .order('data_contato', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar contatos:', error);
    throw new Error('Erro ao buscar contatos do plano de ação');
  }

  console.log('✅ Contatos encontrados:', data?.length || 0);
  return data as PlanoAcaoContato[];
}

/**
 * Buscar contato por ID
 */
export async function buscarContatoPorId(id: string): Promise<PlanoAcaoContato | null> {
  const { data, error } = await supabase
    .from('plano_acao_contatos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('❌ Erro ao buscar contato:', error);
    return null;
  }

  return data as PlanoAcaoContato;
}

/**
 * Criar novo contato
 */
export async function criarContato(
  planoAcaoId: string,
  dados: PlanoAcaoContatoFormData
): Promise<PlanoAcaoContato> {
  console.log('📝 Criando novo contato:', { planoAcaoId, dados });
  
  // Buscar usuário autenticado
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('plano_acao_contatos')
    .insert({
      plano_acao_id: planoAcaoId,
      ...dados,
      criado_por: user?.id,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao criar contato:', error);
    throw new Error('Erro ao criar contato');
  }

  console.log('✅ Contato criado com sucesso:', data.id);
  return data as PlanoAcaoContato;
}

/**
 * Atualizar contato existente
 */
export async function atualizarContato(
  id: string,
  dados: Partial<PlanoAcaoContatoFormData>
): Promise<PlanoAcaoContato> {
  console.log('🔧 Atualizando contato:', { id, dados });
  
  const { data, error } = await supabase
    .from('plano_acao_contatos')
    .update(dados)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao atualizar contato:', error);
    throw new Error('Erro ao atualizar contato');
  }

  console.log('✅ Contato atualizado com sucesso');
  return data as PlanoAcaoContato;
}

/**
 * Deletar contato
 */
export async function deletarContato(id: string): Promise<void> {
  console.log('🗑️ Deletando contato:', id);
  
  const { error } = await supabase
    .from('plano_acao_contatos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ Erro ao deletar contato:', error);
    throw new Error('Erro ao deletar contato');
  }

  console.log('✅ Contato deletado com sucesso');
}

/**
 * Obter estatísticas de contatos de um plano
 */
export async function obterEstatisticasContatos(planoAcaoId: string) {
  const contatos = await buscarContatosPlanoAcao(planoAcaoId);
  
  return {
    total: contatos.length,
    por_meio: {
      whatsapp: contatos.filter(c => c.meio_contato === 'whatsapp').length,
      email: contatos.filter(c => c.meio_contato === 'email').length,
      ligacao: contatos.filter(c => c.meio_contato === 'ligacao').length,
    },
    por_retorno: {
      aguardando: contatos.filter(c => c.retorno_cliente === 'aguardando').length,
      respondeu: contatos.filter(c => c.retorno_cliente === 'respondeu').length,
      solicitou_mais_informacoes: contatos.filter(c => c.retorno_cliente === 'solicitou_mais_informacoes').length,
    },
    ultimo_contato: contatos.length > 0 ? contatos[0] : null,
  };
}