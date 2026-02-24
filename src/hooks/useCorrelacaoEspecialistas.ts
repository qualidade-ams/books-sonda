/**
 * Hook para correlacionar nomes de prestadores com especialistas cadastrados
 */

import { useQuery } from '@tanstack/react-query';
import { useEspecialistasComBusca } from './useEspecialistasOtimizado';

/**
 * Hook para encontrar especialistas baseado no nome do prestador
 */
export function useCorrelacaoEspecialistas(nomePrestador: string | undefined) {
  const { todosEspecialistas, isLoading: loadingEspecialistas } = useEspecialistasComBusca();

  return useQuery({
    queryKey: ['correlacao-especialistas', nomePrestador],
    queryFn: async (): Promise<string[]> => {
      if (!nomePrestador || !nomePrestador.trim()) {
        return [];
      }

      console.log('🔍 [Correlação] Buscando especialista para prestador:', nomePrestador);

      // Normalizar o nome do prestador para busca
      const nomeNormalizado = nomePrestador.toLowerCase().trim();
      
      // Buscar especialistas que correspondam ao nome
      const especialistasEncontrados = todosEspecialistas.filter(especialista => {
        const nomeEspecialista = especialista.nome.toLowerCase().trim();
        
        // Busca exata - prioridade máxima
        if (nomeEspecialista === nomeNormalizado) {
          console.log('✅ [Correlação] Match exato encontrado:', especialista.nome);
          return true;
        }
        
        // Busca por partes do nome
        const partesNomePrestador = nomeNormalizado.split(' ').filter(p => p.length > 2);
        const partesNomeEspecialista = nomeEspecialista.split(' ').filter(p => p.length > 2);
        
        // Se tem poucas partes, ser mais rigoroso
        if (partesNomePrestador.length <= 2 && partesNomeEspecialista.length <= 2) {
          // Para nomes curtos, exigir match de pelo menos 2 partes ou nome completo
          let exactMatches = 0;
          for (const partePrestador of partesNomePrestador) {
            for (const parteEspecialista of partesNomeEspecialista) {
              if (partePrestador === parteEspecialista) {
                exactMatches++;
                break;
              }
            }
          }
          
          if (exactMatches >= Math.min(2, partesNomePrestador.length)) {
            console.log('✅ [Correlação] Match de nome curto:', especialista.nome, `(${exactMatches} partes exatas)`);
            return true;
          }
          return false;
        }
        
        // Para nomes longos, usar algoritmo mais flexível
        let matchCount = 0;
        const partesMatched = new Set();
        
        for (const partePrestador of partesNomePrestador) {
          for (const parteEspecialista of partesNomeEspecialista) {
            // Match exato
            if (partePrestador === parteEspecialista) {
              if (!partesMatched.has(parteEspecialista)) {
                matchCount++;
                partesMatched.add(parteEspecialista);
              }
              break;
            }
            // Match por inclusão (apenas para nomes longos)
            else if (partePrestador.length >= 5 && parteEspecialista.length >= 5) {
              if (partePrestador.includes(parteEspecialista) || parteEspecialista.includes(partePrestador)) {
                if (!partesMatched.has(parteEspecialista)) {
                  matchCount += 0.3; // Peso muito menor para matches parciais
                  partesMatched.add(parteEspecialista);
                }
                break;
              }
            }
          }
        }
        
        // Critérios mais rigorosos para nomes longos
        const isMatch = matchCount >= Math.max(2, Math.floor(partesNomePrestador.length * 0.6));
        
        if (isMatch) {
          console.log('✅ [Correlação] Match de nome longo:', especialista.nome, `(score: ${matchCount})`);
          return true;
        }
        
        return false;
      });

      // Ordenar por relevância (match exato primeiro, depois por score)
      const especialistasComScore = especialistasEncontrados.map(especialista => {
        const nomeEspecialista = especialista.nome.toLowerCase().trim();
        
        // Score máximo para match exato
        if (nomeEspecialista === nomeNormalizado) {
          return { especialista, score: 1000 };
        }
        
        // Calcular score baseado em matches
        const partesNomePrestador = nomeNormalizado.split(' ').filter(p => p.length > 2);
        const partesNomeEspecialista = nomeEspecialista.split(' ').filter(p => p.length > 2);
        
        let score = 0;
        for (const partePrestador of partesNomePrestador) {
          for (const parteEspecialista of partesNomeEspecialista) {
            if (partePrestador === parteEspecialista) {
              score += 10;
            } else if (partePrestador.includes(parteEspecialista) || parteEspecialista.includes(partePrestador)) {
              score += 3;
            }
          }
        }
        
        return { especialista, score };
      });
      
      // Ordenar por score (maior primeiro) e pegar apenas os melhores
      const especialistasOrdenados = especialistasComScore
        .sort((a, b) => b.score - a.score)
        .slice(0, 3) // Máximo 3 resultados para evitar muitos falsos positivos
        .map(item => item.especialista);
      
      const idsEncontrados = especialistasOrdenados.map(e => e.id);
      
      console.log('📊 [Correlação] Resultado:', {
        prestador: nomePrestador,
        especialistasEncontrados: especialistasOrdenados.length,
        nomes: especialistasOrdenados.map(e => e.nome),
        ids: idsEncontrados
      });

      return idsEncontrados;
    },
    enabled: !!nomePrestador && !loadingEspecialistas && todosEspecialistas.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutos
    refetchOnWindowFocus: false
  });
}

/**
 * Hook para correlacionar múltiplos prestadores (separados por vírgula ou ponto e vírgula)
 */
export function useCorrelacaoMultiplosEspecialistas(prestadores: string | undefined) {
  const { todosEspecialistas, isLoading: loadingEspecialistas } = useEspecialistasComBusca();

  return useQuery({
    queryKey: ['correlacao-multiplos-especialistas', prestadores],
    queryFn: async (): Promise<string[]> => {
      if (!prestadores || !prestadores.trim()) {
        return [];
      }

      // Dividir por vírgula, ponto e vírgula ou quebra de linha
      const nomesPrestadores = prestadores
        .split(/[,;|\n]/)
        .map(nome => nome.trim())
        .filter(nome => nome.length > 0);

      console.log('🔍 [Correlação Múltipla] Nomes separados:', nomesPrestadores);

      const todosIdsEncontrados = new Set<string>();
      const detalhesMatches: any[] = [];

      for (const nomePrestador of nomesPrestadores) {
        console.log(`\n🔍 [Correlação Múltipla] Processando: "${nomePrestador}"`);
        const nomeNormalizado = nomePrestador.toLowerCase().trim();
        
        const especialistasEncontrados = todosEspecialistas.filter(especialista => {
          const nomeEspecialista = especialista.nome.toLowerCase().trim();
          
          // Busca exata - prioridade máxima
          if (nomeEspecialista === nomeNormalizado) {
            console.log(`  ✅ Match EXATO: "${especialista.nome}"`);
            return true;
          }
          
          // Busca por partes do nome
          const partesNomePrestador = nomeNormalizado.split(' ').filter(p => p.length > 2);
          const partesNomeEspecialista = nomeEspecialista.split(' ').filter(p => p.length > 2);
          
          // Lista de palavras comuns que devem ser ignoradas
          const palavrasComuns = ['dos', 'das', 'de', 'da', 'do'];
          
          // Filtrar palavras comuns
          const partesRelevantesPrestador = partesNomePrestador.filter(p => !palavrasComuns.includes(p));
          const partesRelevantesEspecialista = partesNomeEspecialista.filter(p => !palavrasComuns.includes(p));
          
          console.log(`  🔍 Comparando partes (sem palavras comuns):`, {
            prestador: partesRelevantesPrestador,
            especialista: partesRelevantesEspecialista,
            nomeEspecialista: especialista.nome
          });
          
          // Se não há partes relevantes suficientes, não é match
          if (partesRelevantesPrestador.length === 0 || partesRelevantesEspecialista.length === 0) {
            return false;
          }
          
          // REGRA CRÍTICA: O primeiro nome (parte relevante) DEVE fazer match
          const primeiroNomePrestador = partesRelevantesPrestador[0];
          const primeiroNomeEspecialista = partesRelevantesEspecialista[0];
          
          if (primeiroNomePrestador !== primeiroNomeEspecialista) {
            // Primeiro nome não bate, não é match
            return false;
          }
          
          // Se tem poucas partes, ser mais rigoroso
          if (partesRelevantesPrestador.length <= 2 && partesRelevantesEspecialista.length <= 2) {
            let exactMatches = 0;
            for (const partePrestador of partesRelevantesPrestador) {
              for (const parteEspecialista of partesRelevantesEspecialista) {
                if (partePrestador === parteEspecialista) {
                  exactMatches++;
                  break;
                }
              }
            }
            
            const isMatch = exactMatches >= Math.min(2, partesRelevantesPrestador.length);
            if (isMatch) {
              console.log(`  ✅ Match de nome CURTO: "${especialista.nome}" (${exactMatches} partes exatas)`);
            }
            return isMatch;
          }
          
          // Para nomes longos, usar algoritmo mais flexível
          let matchCount = 0;
          const partesMatched = new Set();
          
          for (const partePrestador of partesRelevantesPrestador) {
            for (const parteEspecialista of partesRelevantesEspecialista) {
              if (partePrestador === parteEspecialista) {
                if (!partesMatched.has(parteEspecialista)) {
                  matchCount++;
                  partesMatched.add(parteEspecialista);
                }
                break;
              }
              else if (partePrestador.length >= 5 && parteEspecialista.length >= 5) {
                if (partePrestador.includes(parteEspecialista) || parteEspecialista.includes(partePrestador)) {
                  if (!partesMatched.has(parteEspecialista)) {
                    matchCount += 0.3;
                    partesMatched.add(parteEspecialista);
                  }
                  break;
                }
              }
            }
          }
          
          // Exigir pelo menos 60% de match das partes relevantes
          const isMatch = matchCount >= Math.max(2, Math.floor(partesRelevantesPrestador.length * 0.6));
          if (isMatch) {
            console.log(`  ✅ Match de nome LONGO: "${especialista.nome}" (score: ${matchCount})`);
          }
          
          return isMatch;
        });

        console.log(`📊 [Correlação Múltipla] Encontrados ${especialistasEncontrados.length} especialistas para "${nomePrestador}"`);

        // Ordenar por relevância e limitar resultados
        const especialistasComScore = especialistasEncontrados.map(especialista => {
          const nomeEspecialista = especialista.nome.toLowerCase().trim();
          
          if (nomeEspecialista === nomeNormalizado) {
            return { especialista, score: 1000 };
          }
          
          const partesNomePrestador = nomeNormalizado.split(' ').filter(p => p.length > 2);
          const partesNomeEspecialista = nomeEspecialista.split(' ').filter(p => p.length > 2);
          
          let score = 0;
          for (const partePrestador of partesNomePrestador) {
            for (const parteEspecialista of partesNomeEspecialista) {
              if (partePrestador === parteEspecialista) {
                score += 10;
              } else if (partePrestador.includes(parteEspecialista) || parteEspecialista.includes(partePrestador)) {
                score += 3;
              }
            }
          }
          
          return { especialista, score };
        });
        
        const melhoresEspecialistas = especialistasComScore
          .sort((a, b) => b.score - a.score)
          .slice(0, 2) // Máximo 2 por nome para múltiplos
          .map(item => item.especialista);

        console.log(`📝 [Correlação Múltipla] Melhores matches para "${nomePrestador}":`, 
          melhoresEspecialistas.map(e => ({ id: e.id, nome: e.nome }))
        );

        melhoresEspecialistas.forEach(e => {
          todosIdsEncontrados.add(e.id);
          detalhesMatches.push({
            prestador: nomePrestador,
            especialista: e.nome,
            id: e.id
          });
        });
      }

      const resultado = Array.from(todosIdsEncontrados);
      
      console.log('📊 [Correlação Múltipla] === RESULTADO FINAL ===');
      console.log('📊 [Correlação Múltipla] Prestadores:', nomesPrestadores);
      console.log('📊 [Correlação Múltipla] Total de especialistas encontrados:', resultado.length);
      console.log('📊 [Correlação Múltipla] IDs:', resultado);
      console.log('📊 [Correlação Múltipla] Detalhes dos matches:', detalhesMatches);
      console.log('📊 [Correlação Múltipla] === FIM ===');

      return resultado;
    },
    enabled: !!prestadores && !loadingEspecialistas && todosEspecialistas.length > 0,
    staleTime: 0, // DESABILITAR CACHE para debug
    cacheTime: 0, // DESABILITAR CACHE para debug
    refetchOnWindowFocus: false
  });
}