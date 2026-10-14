/**
 * Supabase falso em memória para testes de caracterização.
 *
 * Implementa só o subconjunto do query builder usado pelos services do banco
 * de horas: select/insert/upsert/update/delete, filtros eq/neq/lt/lte/gt/gte/
 * in/is, order, limit, single/maybeSingle e rpc. As gravações ficam nas tabelas
 * em memória, de modo que um mês calculado alimenta o seguinte (como no banco).
 */

type Linha = Record<string, any>;
type Filtro = (linha: Linha) => boolean;
type Rpc = (args: Record<string, any>) => any;

interface Resultado {
  data: any;
  error: { message: string; code?: string } | null;
}

export interface SupabaseEmMemoria {
  from(tabela: string): any;
  rpc(nome: string, args?: Record<string, any>): Promise<Resultado>;
  /** Tabelas em memória (para preparar dados e conferir gravações) */
  tabelas: Record<string, Linha[]>;
  /** Chamadas de rpc feitas, na ordem */
  chamadasRpc: { nome: string; args: Record<string, any> }[];
}

let sequencia = 0;

class Consulta implements PromiseLike<Resultado> {
  private filtros: Filtro[] = [];
  private ordens: { coluna: string; ascendente: boolean }[] = [];
  private limite: number | null = null;
  private modo: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select';
  private payload: Linha | Linha[] | null = null;
  private conflito: string[] = [];
  private unico: 'single' | 'maybe' | null = null;

  constructor(
    private readonly tabelas: Record<string, Linha[]>,
    private readonly nome: string
  ) {}

  private get linhas(): Linha[] {
    if (!this.tabelas[this.nome]) this.tabelas[this.nome] = [];
    return this.tabelas[this.nome];
  }

  /** Colunas são ignoradas: devolve a linha inteira */
  select() {
    return this;
  }

  insert(payload: Linha | Linha[]) {
    this.modo = 'insert';
    this.payload = payload;
    return this;
  }

  upsert(payload: Linha | Linha[], opcoes?: { onConflict?: string }) {
    this.modo = 'upsert';
    this.payload = payload;
    this.conflito = (opcoes?.onConflict ?? 'id').split(',').map((c) => c.trim());
    return this;
  }

  update(payload: Linha) {
    this.modo = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.modo = 'delete';
    return this;
  }

  eq(coluna: string, valor: any) {
    this.filtros.push((l) => l[coluna] === valor);
    return this;
  }

  neq(coluna: string, valor: any) {
    this.filtros.push((l) => l[coluna] !== valor);
    return this;
  }

  lt(coluna: string, valor: any) {
    this.filtros.push((l) => l[coluna] != null && l[coluna] < valor);
    return this;
  }

  lte(coluna: string, valor: any) {
    this.filtros.push((l) => l[coluna] != null && l[coluna] <= valor);
    return this;
  }

  gt(coluna: string, valor: any) {
    this.filtros.push((l) => l[coluna] != null && l[coluna] > valor);
    return this;
  }

  gte(coluna: string, valor: any) {
    this.filtros.push((l) => l[coluna] != null && l[coluna] >= valor);
    return this;
  }

  in(coluna: string, valores: any[]) {
    this.filtros.push((l) => valores.includes(l[coluna]));
    return this;
  }

  is(coluna: string, valor: any) {
    this.filtros.push((l) => (valor === null ? l[coluna] == null : l[coluna] === valor));
    return this;
  }

  order(coluna: string, opcoes?: { ascending?: boolean }) {
    this.ordens.push({ coluna, ascendente: opcoes?.ascending !== false });
    return this;
  }

  limit(n: number) {
    this.limite = n;
    return this;
  }

  single() {
    this.unico = 'single';
    return this;
  }

  maybeSingle() {
    this.unico = 'maybe';
    return this;
  }

  then<T1 = Resultado, T2 = never>(
    ok?: ((valor: Resultado) => T1 | PromiseLike<T1>) | null,
    falha?: ((motivo: any) => T2 | PromiseLike<T2>) | null
  ): PromiseLike<T1 | T2> {
    return Promise.resolve(this.executar()).then(ok, falha);
  }

  private filtrar(): Linha[] {
    return this.linhas.filter((l) => this.filtros.every((f) => f(l)));
  }

  private executar(): Resultado {
    let resultado: Linha[];

    if (this.modo === 'insert' || this.modo === 'upsert') {
      const novas = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Linha[];
      resultado = novas.map((nova) => {
        const existente =
          this.modo === 'upsert' ? this.linhas.find((l) => this.conflito.every((c) => l[c] === nova[c])) : undefined;
        if (existente) {
          Object.assign(existente, nova);
          return { ...existente };
        }
        const linha = { id: nova.id ?? `fake-${++sequencia}`, ...nova };
        this.linhas.push(linha);
        return { ...linha };
      });
    } else if (this.modo === 'update') {
      resultado = this.filtrar().map((l) => Object.assign(l, this.payload) && { ...l });
    } else if (this.modo === 'delete') {
      const removidas = this.filtrar();
      this.tabelas[this.nome] = this.linhas.filter((l) => !removidas.includes(l));
      resultado = removidas;
    } else {
      resultado = this.filtrar().map((l) => ({ ...l }));
      for (const { coluna, ascendente } of [...this.ordens].reverse()) {
        resultado.sort((a, b) => (a[coluna] < b[coluna] ? -1 : a[coluna] > b[coluna] ? 1 : 0) * (ascendente ? 1 : -1));
      }
      if (this.limite !== null) resultado = resultado.slice(0, this.limite);
    }

    if (this.unico === null) return { data: resultado, error: null };
    if (resultado.length > 1) {
      return { data: null, error: { message: 'Mais de uma linha retornada', code: 'PGRST116' } };
    }
    if (resultado.length === 0) {
      return this.unico === 'maybe'
        ? { data: null, error: null }
        : { data: null, error: { message: 'Nenhuma linha retornada', code: 'PGRST116' } };
    }
    return { data: resultado[0], error: null };
  }
}

export function criarSupabaseEmMemoria(
  tabelas: Record<string, Linha[]> = {},
  rpcs: Record<string, Rpc> = {}
): SupabaseEmMemoria {
  const chamadasRpc: SupabaseEmMemoria['chamadasRpc'] = [];
  return {
    tabelas,
    chamadasRpc,
    from: (tabela: string) => new Consulta(tabelas, tabela),
    rpc: async (nome: string, args: Record<string, any> = {}) => {
      chamadasRpc.push({ nome, args });
      const funcao = rpcs[nome];
      if (!funcao) return { data: null, error: { message: `Função ${nome} não existe` } };
      return { data: funcao(args), error: null };
    },
  };
}
