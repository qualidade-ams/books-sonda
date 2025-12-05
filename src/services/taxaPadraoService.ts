// =====================================================
// SERVIÇO: TAXAS PADRÃO
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import type { TaxaPadraoData } from '@/components/admin/taxas/TaxaPadraoForm';

export interface TaxaPadraoDB {
  id: string;
  tipo_produto: 'GALLERY' | 'OUTROS';
  vigencia_inicio: string;
  vigencia_fim: string | null;
  tipo_calculo_adicional: 'normal' | 'media';
  valor_remota_funcional: number;
  valor_remota_tecnico: number;
  valor_remota_abap: number | null;
  valor_remota_dba: number;
  valor_remota_gestor: number;
  valor_local_funcional: number;
  valor_local_tecnico: number;
  valor_local_abap: number | null;
  valor_local_dba: number;
  valor_local_gestor: number;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface TaxaPadraoCompleta extends TaxaPadraoData {
  id: string;
  criado_em: string;
  atualizado_em: string;
}

/**
 * Converter dados do banco para formato do formulário
 */
function converterParaFormulario(taxaDB: TaxaPadraoDB): TaxaPadraoData {
  return {
    tipo_produto: taxaDB.tipo_produto,
    vigencia_inicio: new Date(taxaDB.vigencia_inicio + 'T00:00:00'),
    vigencia_fim: taxaDB.vigencia_fim ? new Date(taxaDB.vigencia_fim + 'T00:00:00') : undefined,
    tipo_calculo_adicional: taxaDB.tipo_calculo_adicional || 'media',
    valores_remota: {
      funcional: taxaDB.valor_remota_funcional,
      tecnico: taxaDB.valor_remota_tecnico,
      abap: taxaDB.valor_remota_abap || 0,
      dba: taxaDB.valor_remota_dba,
      gestor: taxaDB.valor_remota_gestor,
    },
    valores_local: {
      funcional: taxaDB.valor_local_funcional,
      tecnico: taxaDB.valor_local_tecnico,
      abap: taxaDB.valor_local_abap || 0,
      dba: taxaDB.valor_local_dba,
      gestor: taxaDB.valor_local_gestor,
    },
  };
}

/**
 * Converter dados do banco para formato completo
 */
function converterParaCompleto(taxaDB: TaxaPadraoDB): TaxaPadraoCompleta {
  return {
    id: taxaDB.id,
    ...converterParaFormulario(taxaDB),
    criado_em: taxaDB.criado_em,
    atualizado_em: taxaDB.atualizado_em,
  };
}

/**
 * Buscar taxa padrão vigente por tipo de produto
 */
export async function buscarTaxaPadrao(tipoProduto: 'GALLERY' | 'OUTROS', dataReferencia?: string): Promise<TaxaPadraoData | null> {
  try {
    const dataRef = dataReferencia || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('taxas_padrao')
      .select('*')
      .eq('tipo_produto', tipoProduto)
      .lte('vigencia_inicio', dataRef)
      .or(`vigencia_fim.is.null,vigencia_fim.gte.${dataRef}`)
      .order('vigencia_inicio', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Nenhum registro encontrado
        return null;
      }
      throw error;
    }

    return data ? converterParaFormulario(data as TaxaPadraoDB) : null;
  } catch (error) {
    console.error('Erro ao buscar taxa padrão:', error);
    return null;
  }
}

/**
 * Buscar histórico de taxas padrão por tipo de produto
 */
export async function buscarHistoricoTaxasPadrao(tipoProduto: 'GALLERY' | 'OUTROS'): Promise<TaxaPadraoCompleta[]> {
  try {
    const { data, error } = await supabase
      .from('taxas_padrao')
      .select('*')
      .eq('tipo_produto', tipoProduto)
      .order('vigencia_inicio', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map((taxa) => converterParaCompleto(taxa as TaxaPadraoDB));
  } catch (error) {
    console.error('Erro ao buscar histórico de taxas padrão:', error);
    return [];
  }
}

/**
 * Criar nova taxa padrão
 */
export async function criarTaxaPadrao(dados: TaxaPadraoData): Promise<void> {
  try {
    // Buscar usuário atual
    const { data: { user } } = await supabase.auth.getUser();

    // Converter datas
    const vigenciaInicio = typeof dados.vigencia_inicio === 'string' 
      ? dados.vigencia_inicio 
      : dados.vigencia_inicio.toISOString().split('T')[0];
    
    const vigenciaFim = dados.vigencia_fim 
      ? (typeof dados.vigencia_fim === 'string' 
          ? dados.vigencia_fim 
          : dados.vigencia_fim.toISOString().split('T')[0])
      : null;

    // Preparar dados para o banco
    const dadosDB = {
      tipo_produto: dados.tipo_produto,
      vigencia_inicio: vigenciaInicio,
      vigencia_fim: vigenciaFim,
      tipo_calculo_adicional: dados.tipo_calculo_adicional || 'media',
      valor_remota_funcional: dados.valores_remota.funcional,
      valor_remota_tecnico: dados.valores_remota.tecnico,
      valor_remota_abap: dados.valores_remota.abap || 0,
      valor_remota_dba: dados.valores_remota.dba,
      valor_remota_gestor: dados.valores_remota.gestor,
      valor_local_funcional: dados.valores_local.funcional,
      valor_local_tecnico: dados.valores_local.tecnico,
      valor_local_abap: dados.valores_local.abap || 0,
      valor_local_dba: dados.valores_local.dba,
      valor_local_gestor: dados.valores_local.gestor,
      criado_por: user?.id,
    };

    // Inserir nova taxa
    const { error } = await supabase
      .from('taxas_padrao')
      .insert(dadosDB);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Erro ao criar taxa padrão:', error);
    throw new Error('Erro ao criar taxa padrão');
  }
}

/**
 * Atualizar taxa padrão existente
 * Se houver taxa_reajuste, cria uma nova taxa ao invés de atualizar
 */
export async function atualizarTaxaPadrao(id: string, dados: Partial<TaxaPadraoData>): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Buscar taxa atual
    const { data: taxaAtual, error: taxaError } = await supabase
      .from('taxas_padrao')
      .select('*')
      .eq('id', id)
      .single();

    if (taxaError || !taxaAtual) {
      throw new Error('Taxa padrão não encontrada');
    }

    // Se houver taxa de reajuste, criar nova taxa ao invés de atualizar
    if (dados.taxa_reajuste && dados.taxa_reajuste > 0) {
      // Criar nova taxa com os dados reajustados
      const vigenciaInicio = typeof dados.vigencia_inicio === 'string' 
        ? dados.vigencia_inicio 
        : dados.vigencia_inicio?.toISOString().split('T')[0];
      
      const vigenciaFim = dados.vigencia_fim 
        ? (typeof dados.vigencia_fim === 'string' 
            ? dados.vigencia_fim 
            : dados.vigencia_fim.toISOString().split('T')[0])
        : undefined;

      if (!vigenciaInicio) {
        throw new Error('Vigência início é obrigatória');
      }

      // Preparar valores reajustados
      const dadosNovaTaxa: any = {
        tipo_produto: dados.tipo_produto || taxaAtual.tipo_produto,
        vigencia_inicio: vigenciaInicio,
        vigencia_fim: vigenciaFim || null,
        tipo_calculo_adicional: dados.tipo_calculo_adicional || taxaAtual.tipo_calculo_adicional,
        criado_por: user?.id
      };

      // Adicionar valores reajustados
      if (dados.valores_remota) {
        dadosNovaTaxa.valor_remota_funcional = dados.valores_remota.funcional;
        dadosNovaTaxa.valor_remota_tecnico = dados.valores_remota.tecnico;
        dadosNovaTaxa.valor_remota_abap = dados.valores_remota.abap || 0;
        dadosNovaTaxa.valor_remota_dba = dados.valores_remota.dba;
        dadosNovaTaxa.valor_remota_gestor = dados.valores_remota.gestor;
      }

      if (dados.valores_local) {
        dadosNovaTaxa.valor_local_funcional = dados.valores_local.funcional;
        dadosNovaTaxa.valor_local_tecnico = dados.valores_local.tecnico;
        dadosNovaTaxa.valor_local_abap = dados.valores_local.abap || 0;
        dadosNovaTaxa.valor_local_dba = dados.valores_local.dba;
        dadosNovaTaxa.valor_local_gestor = dados.valores_local.gestor;
      }

      // Criar nova taxa
      const { error: novaTaxaError } = await supabase
        .from('taxas_padrao')
        .insert(dadosNovaTaxa);

      if (novaTaxaError) {
        console.error('Erro ao criar nova taxa padrão:', novaTaxaError);
        throw new Error('Erro ao criar nova taxa padrão com reajuste');
      }

      return;
    }

    // Se não houver reajuste, apenas atualizar a taxa existente
    const dadosDB: any = {};

    if (dados.vigencia_inicio) {
      dadosDB.vigencia_inicio = typeof dados.vigencia_inicio === 'string' 
        ? dados.vigencia_inicio 
        : dados.vigencia_inicio.toISOString().split('T')[0];
    }

    if (dados.vigencia_fim !== undefined) {
      dadosDB.vigencia_fim = dados.vigencia_fim 
        ? (typeof dados.vigencia_fim === 'string' 
            ? dados.vigencia_fim 
            : dados.vigencia_fim.toISOString().split('T')[0])
        : null;
    }

    if (dados.tipo_calculo_adicional) {
      dadosDB.tipo_calculo_adicional = dados.tipo_calculo_adicional;
    }

    if (dados.valores_remota) {
      dadosDB.valor_remota_funcional = dados.valores_remota.funcional;
      dadosDB.valor_remota_tecnico = dados.valores_remota.tecnico;
      dadosDB.valor_remota_abap = dados.valores_remota.abap || 0;
      dadosDB.valor_remota_dba = dados.valores_remota.dba;
      dadosDB.valor_remota_gestor = dados.valores_remota.gestor;
    }

    if (dados.valores_local) {
      dadosDB.valor_local_funcional = dados.valores_local.funcional;
      dadosDB.valor_local_tecnico = dados.valores_local.tecnico;
      dadosDB.valor_local_abap = dados.valores_local.abap || 0;
      dadosDB.valor_local_dba = dados.valores_local.dba;
      dadosDB.valor_local_gestor = dados.valores_local.gestor;
    }

    // Atualizar taxa
    const { error } = await supabase
      .from('taxas_padrao')
      .update(dadosDB)
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Erro ao atualizar taxa padrão:', error);
    throw new Error('Erro ao atualizar taxa padrão');
  }
}

/**
 * Deletar taxa padrão
 */
export async function deletarTaxaPadrao(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('taxas_padrao')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Erro ao deletar taxa padrão:', error);
    throw new Error('Erro ao deletar taxa padrão');
  }
}

/**
 * Verificar se existe taxa padrão para um tipo de produto
 */
export async function existeTaxaPadrao(tipoProduto: 'GALLERY' | 'OUTROS'): Promise<boolean> {
  const taxa = await buscarTaxaPadrao(tipoProduto);
  return taxa !== null;
}

/**
 * Buscar todas as taxas padrão
 */
export async function buscarTodasTaxasPadrao(): Promise<TaxaPadraoData[]> {
  try {
    const { data, error } = await supabase
      .from('taxas_padrao')
      .select('*')
      .order('tipo_produto', { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []).map((taxa) => converterParaFormulario(taxa as TaxaPadraoDB));
  } catch (error) {
    console.error('Erro ao buscar todas as taxas padrão:', error);
    return [];
  }
}
