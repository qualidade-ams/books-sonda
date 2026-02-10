import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Interface para empresa de segmentação (baseline)
 */
export interface EmpresaSegmentacao {
  nome: string; // Nome lógico da empresa (ex: "NIQUEL", "IOB")
  percentual: number;
}

/**
 * Hook para buscar empresas de segmentação (baseline) de um cliente
 * 
 * IMPORTANTE: As empresas de segmentação são NOMES LÓGICOS configurados
 * no campo segmentacao_config do cliente, NÃO são empresas cadastradas.
 * 
 * Exemplo para cliente ANGLO:
 * - segmentacao_config: {"empresas": [{"nome": "NIQUEL", "percentual": 50}, {"nome": "IOB", "percentual": 50}]}
 * - Retorna: [{nome: "NIQUEL", percentual: 50}, {nome: "IOB", percentual: 50}]
 * 
 * O nome será salvo no campo empresa_segmentacao_nome (TEXT) do requerimento.
 * 
 * @param clienteId - ID do cliente
 * @returns Query com lista de nomes de empresas extraídos do JSON
 */
export function useEmpresasSegmentacao(clienteId?: string) {
  return useQuery({
    queryKey: ['empresas-segmentacao', clienteId],
    queryFn: async () => {
      if (!clienteId) {
        console.log('⚠️ ClienteId não fornecido, retornando lista vazia');
        return [];
      }

      console.log('🔍 Buscando empresas de segmentação para cliente:', clienteId);

      try {
        // Buscar configuração de segmentação do cliente
        const { data: cliente, error } = await supabase
          .from('empresas_clientes')
          .select('id, nome_abreviado, baseline_segmentado, segmentacao_config')
          .eq('id', clienteId)
          .single();

        if (error) {
          console.error('❌ Erro ao buscar cliente:', error);
          return [];
        }

        console.log('📋 Cliente encontrado:', {
          id: cliente?.id,
          nome: cliente?.nome_abreviado,
          baseline_segmentado: cliente?.baseline_segmentado,
          tem_config: !!cliente?.segmentacao_config
        });

        // Se cliente não tem baseline segmentado, retornar lista vazia
        if (!cliente?.baseline_segmentado || !cliente?.segmentacao_config) {
          console.log('⚠️ Cliente não tem baseline segmentado configurado');
          return [];
        }

        // Extrair empresas do JSON
        const config = cliente.segmentacao_config as any;
        const empresas = config?.empresas || [];

        console.log('📋 Empresas do JSON:', empresas);
        console.log('📋 Total de empresas no JSON:', empresas.length);

        if (empresas.length === 0) {
          console.log('⚠️ Nenhuma empresa encontrada no JSON');
          return [];
        }

        // Mapear empresas do JSON para formato esperado
        const empresasFormatadas: EmpresaSegmentacao[] = empresas
          .map((emp: any) => {
            const nomeEmpresa = emp.nome || '';
            
            if (!nomeEmpresa) {
              console.warn(`⚠️ Empresa sem nome`);
              return null;
            }

            console.log(`✅ Empresa de segmentação:`, {
              nome: nomeEmpresa,
              percentual: emp.percentual || 0
            });

            return {
              nome: nomeEmpresa,
              percentual: emp.percentual || 0
            };
          })
          .filter((e): e is EmpresaSegmentacao => e !== null);

        console.log('✅ Empresas formatadas:', empresasFormatadas);
        console.log('✅ Total de empresas formatadas:', empresasFormatadas.length);

        return empresasFormatadas;
      } catch (error) {
        console.error('❌ Erro inesperado ao buscar empresas de segmentação:', error);
        return [];
      }
    },
    enabled: !!clienteId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    throwOnError: false,
    retry: 1,
  });
}
