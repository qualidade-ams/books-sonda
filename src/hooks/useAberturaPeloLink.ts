import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Tela atual de Empresas aberta pela tela nova, na transição: ?editar=<id> abre a edição da
 * empresa (depois de a lista carregar) e ?nova=1 abre o cadastro. O parâmetro sai do endereço
 * em seguida, para voltar ou recarregar não abrir de novo.
 */
export function useAberturaPeloLink<T extends { id: string }>(
  empresas: T[],
  carregando: boolean,
  acoes: { editar: (empresa: T) => void; nova: () => void }
) {
  const [parametros, setParametros] = useSearchParams();
  const ultimasAcoes = useRef(acoes);
  ultimasAcoes.current = acoes;

  useEffect(() => {
    const id = parametros.get('editar');
    const nova = parametros.get('nova');
    if (!id && !nova) return;
    if (id && carregando) return;

    if (id) {
      const empresa = empresas.find((e) => e.id === id);
      if (empresa) ultimasAcoes.current.editar(empresa);
    } else {
      ultimasAcoes.current.nova();
    }
    setParametros(
      (atuais) => {
        atuais.delete('editar');
        atuais.delete('nova');
        return atuais;
      },
      { replace: true }
    );
  }, [parametros, carregando, empresas, setParametros]);
}
