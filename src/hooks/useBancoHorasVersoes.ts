/**
 * Hook para gerenciamento de versões do Banco de Horas
 * 
 * Fornece funcionalidades para buscar, listar e comparar versões de cálculos
 * mensais do banco de horas, integrando com o serviço de versionamento.
 * 
 * @module hooks/useBancoHorasVersoes
 * @requirements 12.4-12.10
 */

import { useQuery } from '@tanstack/react-query';
import { bancoHorasVersionamentoService } from '@/services/bancoHorasVersionamentoService';
import type { BancoHorasVersao, DiferencasVersao } from '@/types/bancoHoras';

/**
 * Hook para buscar histórico de versões de um cálculo
 * 
 * @param empresaId - ID da empresa
 * @param mes - Mês (1-12)
 * @param ano - Ano (ex: 2024)
 * @param enabled - Se a query deve ser executada
 * @returns Query com lista de versões
 * 
 * @example
 * const { data: versoes, isLoading } = useBancoHorasVersoes('uuid-empresa', 1, 2024);
 * 
 * **Validates: Requirements 12.4, 12.5, 12.6**
 */
export function useBancoHorasVersoes(
  empresaId: string,
  mes: number,
  ano: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['banco-horas-versoes', empresaId, mes, ano],
    queryFn: async () => {
      console.log('🔍 Buscando versões:', { empresaId, mes, ano });
      
      const versoes = await bancoHorasVersionamentoService.listarVersoes(
        empresaId,
        mes,
        ano
      );
      
      console.log(`✅ ${versoes.length} versões encontradas`);
      return versoes;
    },
    enabled: enabled && !!empresaId && !!mes && !!ano,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para buscar versões de um cálculo específico
 * 
 * @param calculoId - ID do cálculo
 * @param enabled - Se a query deve ser executada
 * @returns Query com lista de versões do cálculo
 * 
 * @example
 * const { data: versoes } = useBancoHorasVersoesPorCalculo('uuid-calculo');
 */
export function useBancoHorasVersoesPorCalculo(
  calculoId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['banco-horas-versoes-calculo', calculoId],
    queryFn: async () => {
      console.log('🔍 Buscando versões do cálculo:', calculoId);
      
      const versoes = await bancoHorasVersionamentoService.buscarVersoesPorCalculo(
        calculoId
      );
      
      console.log(`✅ ${versoes.length} versões encontradas`);
      return versoes;
    },
    enabled: enabled && !!calculoId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para buscar uma versão específica
 * 
 * @param versaoId - ID da versão
 * @param enabled - Se a query deve ser executada
 * @returns Query com a versão
 * 
 * @example
 * const { data: versao } = useBancoHorasVersao('uuid-versao');
 */
export function useBancoHorasVersao(
  versaoId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['banco-horas-versao', versaoId],
    queryFn: async () => {
      console.log('🔍 Buscando versão:', versaoId);
      
      const versao = await bancoHorasVersionamentoService.buscarVersao(versaoId);
      
      console.log('✅ Versão encontrada');
      return versao;
    },
    enabled: enabled && !!versaoId,
    staleTime: 1000 * 60 * 10, // 10 minutos (versões são imutáveis)
    gcTime: 1000 * 60 * 30, // 30 minutos
  });
}

/**
 * Função auxiliar para comparar versões
 * 
 * Não é um hook, mas uma função utilitária que pode ser usada
 * em conjunto com os hooks acima.
 * 
 * @param versao1 - Primeira versão
 * @param versao2 - Segunda versão
 * @returns Diferenças entre as versões
 * 
 * @example
 * const diff = compararVersoes(versaoAntiga, versaoNova);
 * console.log('Campos modificados:', diff.campos_modificados);
 * 
 * **Validates: Requirements 12.6, 12.9**
 */
export function compararVersoes(
  versao1: BancoHorasVersao,
  versao2: BancoHorasVersao
): DiferencasVersao {
  return bancoHorasVersionamentoService.compararVersoes(versao1, versao2);
}

/**
 * Hook customizado que combina busca de versões e comparação
 * 
 * Fornece tanto a lista de versões quanto a função de comparação
 * em um único hook para facilitar o uso em componentes.
 * 
 * @param empresaId - ID da empresa
 * @param mes - Mês (1-12)
 * @param ano - Ano (ex: 2024)
 * @param enabled - Se a query deve ser executada
 * @returns Objeto com versões e função de comparação
 * 
 * @example
 * const { versoes, isLoading, compararVersoes } = useHistoricoVersoes(
 *   'uuid-empresa',
 *   1,
 *   2024
 * );
 * 
 * const diff = compararVersoes(versao1, versao2);
 */
export function useHistoricoVersoes(
  empresaId: string,
  mes: number,
  ano: number,
  enabled: boolean = true
) {
  const query = useBancoHorasVersoes(empresaId, mes, ano, enabled);

  return {
    versoes: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    compararVersoes: (versao1: BancoHorasVersao, versao2: BancoHorasVersao) => 
      compararVersoes(versao1, versao2),
  };
}
