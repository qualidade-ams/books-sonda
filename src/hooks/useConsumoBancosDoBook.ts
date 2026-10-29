/**
 * Snapshot do consumo do Book por banco (Fase 5). Vazio para Book de empresa em Legado: a
 * página de consumo atual continua. Usado pelo visualizador e pela rota de impressão do PDF,
 * que espera `carregado` antes de avisar que a página está pronta.
 */
import { useQuery } from '@tanstack/react-query';
import {
  bookConsumoBancosService,
  type LinhaConsumoBook,
} from '@/services/bookConsumoBancosService';

const SEM_BANCOS: LinhaConsumoBook[] = [];

export function useConsumoBancosDoBook(bookId: string | null) {
  const query = useQuery({
    queryKey: ['book-consumo-bancos', bookId],
    queryFn: () => bookConsumoBancosService.doBook(bookId!),
    enabled: !!bookId,
    // Book gerado não muda: a página lê o que foi gravado na geração
    staleTime: 5 * 60 * 1000,
    // Uma nova tentativa curta: a impressão do PDF espera esta leitura
    retry: 1,
    retryDelay: 500,
  });
  return {
    bancos: query.data ?? SEM_BANCOS,
    carregado: !!bookId && (query.isSuccess || query.isError),
    erro: query.error,
  };
}
