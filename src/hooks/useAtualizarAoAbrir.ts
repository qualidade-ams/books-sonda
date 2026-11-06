import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Ao abrir a tela, dá o cache dela por vencido: o que está na tela é buscado de novo e o resto
 * é buscado quando aparecer. Os dados das telas novas mudam fora delas (requerimento lançado em
 * outra tela, sincronização do Aranda, cadastro antigo) e sem isso só apareciam com o Ctrl+R.
 *
 * Cada prefixo é o primeiro item da queryKey (ex.: 'controle-bh'). Roda só na abertura; uma busca
 * que já estiver em andamento não é cancelada.
 */
export function useAtualizarAoAbrir(...prefixos: string[]) {
  const queryClient = useQueryClient();
  const assinatura = prefixos.join('\n');

  useEffect(() => {
    for (const prefixo of assinatura.split('\n')) {
      void queryClient.invalidateQueries({ queryKey: [prefixo] }, { cancelRefetch: false });
    }
  }, [queryClient, assinatura]);
}
