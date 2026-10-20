/**
 * Redireciona um endereço antigo para o novo mantendo a query string (ex.: ?aba=books),
 * para links já salvos (favoritos, notificações) continuarem abrindo no lugar certo.
 */

import { Navigate, useLocation } from 'react-router-dom';

export function RedirecionarPreservandoBusca({ para }: { para: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: para, search, hash }} replace />;
}
