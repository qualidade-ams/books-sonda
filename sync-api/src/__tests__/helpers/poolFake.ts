/**
 * Pool fake do mssql para testes do sync-api: registra o texto de cada query
 * e os parâmetros passados via `input`, devolvendo recordset vazio.
 */
export type Entrada = [nome: string, tipo: any, valor: any];

export function criarPoolFake(responder: (query: string) => any[] = () => []) {
  const queries: string[] = [];
  const entradas: Entrada[] = [];

  const request = () => {
    const req: any = {
      input: (nome: string, tipo: any, valor: any) => {
        entradas.push([nome, tipo, valor]);
        return req;
      },
      query: async (texto: string) => {
        queries.push(texto);
        return { recordset: responder(texto), rowsAffected: [0] };
      },
    };
    return req;
  };

  return { pool: { request } as any, queries, entradas };
}
