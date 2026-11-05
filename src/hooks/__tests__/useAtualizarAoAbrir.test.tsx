import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAtualizarAoAbrir } from '../useAtualizarAoAbrir';

function criarClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function comClient(client: QueryClient, children: ReactNode) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Tela de mentira: lê uma chave com cache longo e pede a recarga dos prefixos ao abrir */
function Tela({
  chave,
  prefixos,
  buscar,
}: {
  chave: string[];
  prefixos: string[];
  buscar: () => Promise<string>;
}) {
  useAtualizarAoAbrir(...prefixos);
  const { data } = useQuery({ queryKey: chave, queryFn: buscar, staleTime: 5 * 60 * 1000 });
  return <span>{data ?? 'carregando'}</span>;
}

describe('useAtualizarAoAbrir', () => {
  it('ao abrir a tela, busca de novo o dado que estava em cache', async () => {
    const client = criarClient();
    client.setQueryData(['controle-bh', 'requerimentos', 'alfa'], 'lista antiga');
    const buscar = vi.fn().mockResolvedValue('lista com o requerimento novo');

    render(
      comClient(
        client,
        <Tela
          chave={['controle-bh', 'requerimentos', 'alfa']}
          prefixos={['controle-bh']}
          buscar={buscar}
        />
      )
    );

    expect(await screen.findByText('lista com o requerimento novo')).toBeInTheDocument();
    expect(buscar).toHaveBeenCalledTimes(1);
  });

  it('marca como desatualizado o cache que ainda não está na tela', () => {
    const client = criarClient();
    client.setQueryData(['controle-bh', 'quadro', 'beta'], { velho: true });
    const buscar = vi.fn().mockResolvedValue('x');

    render(
      comClient(client, <Tela chave={['outra']} prefixos={['controle-bh']} buscar={buscar} />)
    );

    expect(client.getQueryState(['controle-bh', 'quadro', 'beta'])?.isInvalidated).toBe(true);
  });

  it('não mexe no cache de outras telas', () => {
    const client = criarClient();
    client.setQueryData(['requerimentos', 'lista'], ['r1']);
    const buscar = vi.fn().mockResolvedValue('x');

    render(
      comClient(client, <Tela chave={['outra']} prefixos={['controle-bh']} buscar={buscar} />)
    );

    expect(client.getQueryState(['requerimentos', 'lista'])?.isInvalidated).toBe(false);
  });

  it('aceita vários prefixos', () => {
    const client = criarClient();
    client.setQueryData(['catalogo'], []);
    client.setQueryData(['grupos-aranda'], []);
    const buscar = vi.fn().mockResolvedValue('x');

    render(
      comClient(
        client,
        <Tela chave={['outra']} prefixos={['catalogo', 'grupos-aranda']} buscar={buscar} />
      )
    );

    expect(client.getQueryState(['catalogo'])?.isInvalidated).toBe(true);
    expect(client.getQueryState(['grupos-aranda'])?.isInvalidated).toBe(true);
  });

  it('sem cache, faz uma busca só (não cancela a primeira para buscar de novo)', async () => {
    const client = criarClient();
    const buscar = vi.fn().mockResolvedValue('dado');

    render(
      comClient(
        client,
        <Tela chave={['controle-bh', 'empresas']} prefixos={['controle-bh']} buscar={buscar} />
      )
    );

    expect(await screen.findByText('dado')).toBeInTheDocument();
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(buscar).toHaveBeenCalledTimes(1);
  });

  it('ao redesenhar a tela, não busca de novo', async () => {
    const client = criarClient();
    const buscar = vi.fn().mockResolvedValue('dado');
    const tela = (
      <Tela chave={['controle-bh', 'empresas']} prefixos={['controle-bh']} buscar={buscar} />
    );

    const { rerender } = render(comClient(client, tela));
    expect(await screen.findByText('dado')).toBeInTheDocument();
    rerender(
      comClient(
        client,
        <Tela chave={['controle-bh', 'empresas']} prefixos={['controle-bh']} buscar={buscar} />
      )
    );
    await waitFor(() => expect(client.isFetching()).toBe(0));

    expect(buscar).toHaveBeenCalledTimes(1);
  });
});
