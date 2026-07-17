/**
 * Hook para buscar taxas específicas do cliente
 * Usado para casos especiais como EXXONMOBIL que tem taxa de ticket excedente específica
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaxasEspecificasCliente {
  id: string;
  cliente_id: string;
  ticket_excedente_simples?: number;    // EXXONMOBIL
  ticket_excedente_complexo?: number;   // EXXONMOBIL
  ticket_excedente?: number;            // NIDEC
  ticket_excedente_1?: number;          // CHIESI
  ticket_excedente_2?: number;          // CHIESI (Ticket Excedente)
  valor_ticket?: number;                // VOTORANTIM, CSN
  valor_ticket_excedente?: number;      // VOTORANTIM, CSN
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
      
      // CORREÇÃO: Usar .limit(1).single() em vez de .maybeSingle()
      // porque pode haver múltiplas taxas (vigente e vencida)
      // Buscar apenas a taxa vigente (mais recente)
      const { data: taxasArray, error: taxasError } = await supabase
        .from('taxas_clientes')
        .select('*') // Buscar todos os campos para debug
        .eq('cliente_id', empresaId)
        .order('vigencia_inicio', { ascending: false }) // Mais recente primeiro
        .limit(1);
      
      if (taxasError) {
        console.error('❌ [useTaxasEspecificasCliente] Erro ao buscar taxas específicas:', {
          error: taxasError,
          errorMessage: taxasError.message,
          errorCode: taxasError.code,
          errorDetails: taxasError.details,
          empresaId,
          query: 'taxas_clientes.cliente_id = ' + empresaId
        });
        return null;
      }
      
      // Pegar primeiro resultado (taxa mais recente)
      const data = taxasArray && taxasArray.length > 0 ? taxasArray[0] : null;
      
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
      
      // Converter campos de ticket excedente para número
      const parseNumero = (val: any): number | undefined => {
        if (val === null || val === undefined) return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      };

      const resultado: TaxasEspecificasCliente = {
        id: data.id,
        cliente_id: data.cliente_id,
        ticket_excedente_simples: parseNumero(data.ticket_excedente_simples),
        ticket_excedente_complexo: parseNumero(data.ticket_excedente_complexo),
        ticket_excedente: parseNumero(data.ticket_excedente),
        ticket_excedente_1: parseNumero(data.ticket_excedente_1),
        ticket_excedente_2: parseNumero(data.ticket_excedente_2),
        valor_ticket: parseNumero(data.valor_ticket),
        valor_ticket_excedente: parseNumero(data.valor_ticket_excedente),
      };

      console.log('🎯 [useTaxasEspecificasCliente] Taxa específica encontrada:', {
        empresa: {
          id: empresa.id,
          nome_abreviado: empresa.nome_abreviado,
          nome_completo: empresa.nome_completo
        },
        campos_ticket: {
          valor_ticket_excedente: resultado.valor_ticket_excedente,
          ticket_excedente_2: resultado.ticket_excedente_2,
          ticket_excedente: resultado.ticket_excedente,
          ticket_excedente_simples: resultado.ticket_excedente_simples,
        }
      });
      
      return resultado;
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
    campos_ticket: taxasEspecificas ? {
      valor_ticket_excedente: taxasEspecificas.valor_ticket_excedente,
      ticket_excedente_2: taxasEspecificas.ticket_excedente_2,
      ticket_excedente: taxasEspecificas.ticket_excedente,
      ticket_excedente_simples: taxasEspecificas.ticket_excedente_simples,
    } : null
  });
  
  return {
    taxasEspecificas,
    isLoading,
    error
  };
}