import { useTranslation } from 'react-i18next';
import type { Catalogo } from '@/types/catalogo';
import type { DestinoGrupo } from '@/types/dePara';

/** Para onde vão as horas do grupo, em uma frase, pelo nível mais fundo do destino */
export function useTextoDestino(catalogo: Catalogo) {
  const { t } = useTranslation();
  const nome = <T extends { id: string; nome: string }>(lista: T[], id: string | null) =>
    lista.find((x) => x.id === id)?.nome ?? '';
  return (d: DestinoGrupo) =>
    d.moduloId
      ? t('deParaGrupos.destino.textoModulo', {
          produto: nome(catalogo.produtos, d.produtoId),
          modulo: nome(catalogo.modulos, d.moduloId),
        })
      : d.produtoId
        ? t('deParaGrupos.destino.textoProduto', { produto: nome(catalogo.produtos, d.produtoId) })
        : d.solucaoId
          ? t('deParaGrupos.destino.textoSolucao', {
              solucao: nome(catalogo.solucoes, d.solucaoId),
            })
          : t('deParaGrupos.destino.textoNenhum');
}
