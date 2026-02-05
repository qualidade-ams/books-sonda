/**
 * Hook para buscar taxas específicas do cliente
 * Usado para casos especiais como EXXONMOBIL que tem taxa de ticket excedente específica
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaxasEspecificasCliente {
  id: string;
  cliente_id: string;
  ticket_excedente_simples?: number;
  // Outros campos específicos podem ser adicionados aqui
}

/**
 * Hook que busca taxas específicas do cliente na tabela taxas_clientes
 */
export function useTaxasEspecificasCliente(empresaId?: string) {
  console.log('🚀 [useTaxasEspecificasCliente] Hook iniciado com empresaId:', empresaId);
  
  const { data: taxasEspecificas, isLoading, error } = useQuery({
    queryKey: ['taxas-especificas-cliente', empresaId],
    queryFn: async () => {
      if (!empresaId) {
        console.log('⚠️ [useTaxasEspecificasCliente] Nenhum empresaId fornecido');
        return null;
      }
      
      console.log('🔍 [useTaxasEspecificasCliente] Buscando taxas específicas para empresa:', empresaId);
      
      // Primeiro, verificar se a empresa existe e pegar informações
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas_clientes')
        .select('id, nome_abreviado, nome_completo')
        .eq('id', empresaId)
        .single();
      
      if (empresaError || !empresa) {
        console.error('❌ [useTaxasEspecificasCliente] Empresa não encontrada:', {
          empresaId,
          error: empresaError
        });
        return null;
      }
      
      console.log('🏢 [useTaxasEspecificasCliente] Empresa encontrada:', {
        id: empresa.id,
        nome_abreviado: empresa.nome_abreviado,
        nome_completo: empresa.nome_completo
      });
      
      // Buscar taxas específicas usando cliente_id (corrigido)
      console.log('🔍 [useTaxasEspecificasCliente] Buscando na tabela taxas_clientes com cliente_id:', empresaId);
      
      const { data, error } = await supabase
        .from('taxas_clientes')
        .select('*') // Buscar todos os campos para debug
        .eq('cliente_id', empresaId) // CORRIGIDO: usar cliente_id
        .maybeSingle();
      
      if (error) {
        console.error('❌ [useTaxasEspecificasCliente] Erro ao buscar taxas específicas:', {
          error,
          empresaId,
          query: 'taxas_clientes.cliente_id = ' + empresaId
        });
        return null;
      }
      
      console.log('✅ [useTaxasEspecificasCliente] Resultado da busca completo:', {
        empresa: {
          id: empresa.id,
          nome_abreviado: empresa.nome_abreviado,
          nome_completo: empresa.nome_completo
        },
        taxas_encontradas: !!data,
        registro_completo: data,
        campos_importantes: data ? {
          cliente_id: data.cliente_id,
          ticket_excedente_simples: data.ticket_excedente_simples,
          tipo_ticket_excedente_simples: typeof data.ticket_excedente_simples,
          tem_campo: 'ticket_excedente_simples' in data,
          valor_numerico: data.ticket_excedente_simples ? Number(data.ticket_excedente_simples) : null
        } : null
      });
      
      // Verificar se encontrou dados
      if (!data) {
        console.log('⚠️ [useTaxasEspecificasCliente] Nenhuma taxa específica encontrada para empresa:', {
          empresaId,
          nomeEmpresa: empresa.nome_abreviado,
          nomeCompleto: empresa.nome_completo
        });
        return null;
      }
      
      // Verificar se tem o campo ticket_excedente_simples
      if (data.ticket_excedente_simples === null || data.ticket_excedente_simples === undefined) {
        console.log('⚠️ [useTaxasEspecificasCliente] Campo ticket_excedente_simples está vazio:', {
          valor: data.ticket_excedente_simples,
          tipo: typeof data.ticket_excedente_simples,
          empresa: empresa.nome_abreviado,
          registro_completo: data
        });
        return data; // Retornar mesmo assim para debug
      }
      
      // Converter para número se necessário
      const valorNumerico = typeof data.ticket_excedente_simples === 'string' 
        ? parseFloat(data.ticket_excedente_simples)
        : data.ticket_excedente_simples;
      
      console.log('🎯 [useTaxasEspecificasCliente] Taxa específica encontrada:', {
        empresa: {
          id: empresa.id,
          nome_abreviado: empresa.nome_abreviado,
          nome_completo: empresa.nome_completo
        },
        valor_original: data.ticket_excedente_simples,
        valor_numerico: valorNumerico,
        valor_formatado: new Intl.NumberFormat('pt-BR', { 
          style: 'currency', 
          currency: 'BRL' 
        }).format(valorNumerico),
        esperado_exxonmobil: 'R$ 2.545,43'
      });
      
      return {
        ...data,
        ticket_excedente_simples: valorNumerico
      } as TaxasEspecificasCliente;
    },
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  });
  
  console.log('📊 [useTaxasEspecificasCliente] Estado final do hook:', {
    empresaId,
    isLoading,
    error: error ? {
      message: error.message,
      code: (error as any).code,
      details: (error as any).details
    } : null,
    taxasEspecificas,
    ticket_excedente_simples: taxasEspecificas?.ticket_excedente_simples,
    tipo_valor: typeof taxasEspecificas?.ticket_excedente_simples,
    valor_formatado: taxasEspecificas?.ticket_excedente_simples ? 
      new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(taxasEspecificas.ticket_excedente_simples) : 'N/A'
  });
  
  return {
    taxasEspecificas,
    isLoading,
    error
  };
}