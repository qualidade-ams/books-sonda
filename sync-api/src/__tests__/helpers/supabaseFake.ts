/**
 * Mock encadeável do supabase-js para testes do sync-api: registra cada
 * chamada e resolve com o que `responder(tabela, chamadas)` devolver.
 */
export type Chamada = [string, any[]];

export interface Consulta {
  tabela: string;
  chamadas: Chamada[];
}

export function criarSupabaseFake(responder: (tabela: string, chamadas: Chamada[]) => any = () => null) {
  const consultas: Consulta[] = [];

  const from = (tabela: string) => {
    const chamadas: Chamada[] = [];
    consultas.push({ tabela, chamadas });
    const resolver = () => Promise.resolve(responder(tabela, chamadas) ?? { data: null, error: null });
    const builder: any = new Proxy(
      {},
      {
        get(_alvo, prop: string) {
          if (prop === 'then') return (ok: any, falha: any) => resolver().then(ok, falha);
          return (...args: any[]) => {
            chamadas.push([prop, args]);
            if (prop === 'single' || prop === 'maybeSingle') return resolver();
            return builder;
          };
        },
      }
    );
    return builder;
  };

  return { cliente: { from } as any, consultas };
}

export const tem = (chamadas: Chamada[], metodo: string, ...args: any[]) =>
  chamadas.some(([m, a]) => m === metodo && JSON.stringify(a) === JSON.stringify(args));

/** Todas as chamadas de um método numa tabela, em ordem */
export const chamadasDe = (consultas: Consulta[], tabela: string, metodo: string) =>
  consultas
    .filter((c) => c.tabela === tabela)
    .flatMap((c) => c.chamadas)
    .filter(([m]) => m === metodo)
    .map(([, a]) => a);
