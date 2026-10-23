import { useQuery } from '@tanstack/react-query';
import { perfisResumoService } from '@/services/perfisResumoService';

/** Nomes dos usuários pelos ids (último a alterar, autor), para "Última alteração por <nome>" */
export function useNomesUsuarios(ids: (string | null | undefined)[]): Record<string, string> {
  const unicos = [...new Set(ids.filter((id): id is string => !!id))].sort();
  const query = useQuery({
    queryKey: ['nomes-usuarios', unicos],
    queryFn: () => perfisResumoService.nomes(unicos),
    enabled: unicos.length > 0,
    staleTime: 30 * 60 * 1000,
  });
  return query.data ?? {};
}
