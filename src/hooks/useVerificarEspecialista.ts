/**
 * Hook para verificar se um nome está cadastrado na tabela especialistas
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Tipos locais para a tabela especialistas (não está nos tipos gerados)
interface Especialista {
  id: string;
  nome: string;
  status?: string;
}

/**
 * Hook para verificar se um nome específico está cadastrado na tabela especialistas
 */
export function useVerificarEspecialista(nome: string | undefined) {
  return useQuery({
    queryKey: ['verificar-especialista', nome],
    queryFn: async (): Promise<boolean> => {
      if (!nome || nome.trim() === '') {
        console.log('🔍 [useVerificarEspecialista] Nome vazio ou undefined:', nome);
        return false;
      }

      try {
        console.log('🔍 [useVerificarEspecialista] Buscando especialista com nome:', nome);
        
        // Buscar por correspondência exata (case-insensitive)
        // Usando any para contornar problema de tipos
        const { data: dataExata, error: errorExata } = await (supabase as any)
          .from('especialistas')
          .select('id, nome')
          .eq('status', 'ativo')
          .ilike('nome', nome.trim())
          .limit(1);

        if (errorExata) {
          console.error('❌ [useVerificarEspecialista] Erro na busca exata:', errorExata);
        } else if (dataExata && dataExata.length > 0) {
          console.log('✅ [useVerificarEspecialista] Encontrado por busca exata:', dataExata[0]);
          return true;
        }

        // Se não encontrou por busca exata, tentar busca parcial por palavras
        const palavras = nome.toLowerCase().trim().split(' ').filter(p => p.length > 2);
        
        if (palavras.length > 0) {
          console.log('🔍 [useVerificarEspecialista] Tentando busca parcial com palavras:', palavras);
          
          const { data: dataParcial, error: errorParcial } = await (supabase as any)
            .from('especialistas')
            .select('id, nome')
            .eq('status', 'ativo')
            .limit(20); // Buscar mais registros para análise

          if (errorParcial) {
            console.error('❌ [useVerificarEspecialista] Erro na busca parcial:', errorParcial);
            return false;
          }

          console.log('🔍 [useVerificarEspecialista] Todos os especialistas ativos encontrados:', dataParcial?.length || 0);

          if (dataParcial && dataParcial.length > 0) {
            // Verificar se algum especialista contém as palavras do nome buscado
            const encontrado = dataParcial.some((especialista: Especialista) => {
              const nomeEspecialista = especialista.nome.toLowerCase();
              
              // Verificar se pelo menos 2 palavras do nome buscado estão no nome do especialista
              const palavrasEncontradas = palavras.filter(palavra => 
                nomeEspecialista.includes(palavra)
              );
              
              const match = palavrasEncontradas.length >= Math.min(2, palavras.length);
              
              if (match) {
                console.log('✅ [useVerificarEspecialista] Match encontrado:', {
                  buscado: nome,
                  encontrado: especialista.nome,
                  palavrasBuscadas: palavras,
                  palavrasEncontradas: palavrasEncontradas
                });
              }
              
              return match;
            });

            return encontrado;
          }
        }

        console.log('❌ [useVerificarEspecialista] Nenhum especialista encontrado para:', nome);
        return false;
      } catch (error) {
        console.error('❌ [useVerificarEspecialista] Erro geral:', error);
        return false;
      }
    },
    enabled: !!nome && nome.trim() !== '',
    staleTime: 1000 * 60 * 10, // 10 minutos (dados estáveis)
    refetchOnWindowFocus: false
  });
}

/**
 * Hook para verificar múltiplos nomes de uma vez (otimizado para listas)
 */
export function useVerificarMultiplosEspecialistas(nomes: string[]) {
  return useQuery({
    queryKey: ['verificar-multiplos-especialistas', nomes],
    queryFn: async (): Promise<Record<string, boolean>> => {
      if (!nomes || nomes.length === 0) {
        return {};
      }

      try {
        // Buscar todos os especialistas ativos de uma vez
        // Usando any para contornar problema de tipos
        const { data, error } = await (supabase as any)
          .from('especialistas')
          .select('nome')
          .eq('status', 'ativo');

        if (error) {
          console.error('Erro ao buscar especialistas:', error);
          return {};
        }

        const nomesEspecialistas = data?.map((e: Especialista) => e.nome.toLowerCase()) || [];
        const resultado: Record<string, boolean> = {};

        // Verificar cada nome da lista
        nomes.forEach(nome => {
          if (nome && nome.trim() !== '') {
            const nomeNormalizado = nome.toLowerCase().trim();
            resultado[nome] = nomesEspecialistas.some((nomeEsp: string) => 
              nomeEsp.includes(nomeNormalizado) || nomeNormalizado.includes(nomeEsp)
            );
          } else {
            resultado[nome] = false;
          }
        });

        return resultado;
      } catch (error) {
        console.error('Erro ao verificar múltiplos especialistas:', error);
        return {};
      }
    },
    enabled: nomes && nomes.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutos
    refetchOnWindowFocus: false
  });
}