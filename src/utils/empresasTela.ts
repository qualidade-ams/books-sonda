/**
 * Regras da lista da tela Empresas: busca e filtros. Dentro de um filtro vale qualquer
 * opção marcada; entre filtros, todos.
 */

import type { EmpresaLista, ModeloEmpresa } from '@/types/empresas';

export type SimNao = 'sim' | 'nao';

/** Tela atual de empresas, onde a identidade é mantida até a virada (Fase 6) */
export const TELA_ATUAL_EMPRESAS = '/admin/empresas-clientes';

export interface FiltroEmpresas {
  busca: string;
  status: EmpresaLista['status'][];
  solucoes: string[];
  temAms: SimNao[];
  emProjeto: SimNao[];
  modelo: ModeloEmpresa[];
  soPendentes: boolean;
}

export const SEM_FILTRO_EMPRESAS: FiltroEmpresas = {
  busca: '',
  status: [],
  solucoes: [],
  temAms: [],
  emProjeto: [],
  modelo: [],
  soPendentes: false,
};

const casaSimNao = (filtro: SimNao[], valor: boolean) =>
  !filtro.length || filtro.includes(valor ? 'sim' : 'nao');

export function filtrarEmpresas(lista: EmpresaLista[], f: FiltroEmpresas): EmpresaLista[] {
  const termo = f.busca.trim().toLowerCase();
  return lista.filter(
    (e) =>
      (!termo || `${e.nomeAbreviado} ${e.nomeCompleto}`.toLowerCase().includes(termo)) &&
      (!f.status.length || f.status.includes(e.status)) &&
      (!f.solucoes.length || e.solucoes.some((s) => f.solucoes.includes(s.codigo))) &&
      casaSimNao(f.temAms, e.temAms) &&
      casaSimNao(f.emProjeto, e.emProjeto) &&
      (!f.modelo.length || f.modelo.includes(e.modelo)) &&
      (!f.soPendentes || e.pendencias.length > 0)
  );
}

/** Quantos filtros (fora a busca) estão aplicados */
export const filtrosAtivosEmpresas = (f: FiltroEmpresas) =>
  [f.status, f.solucoes, f.temAms, f.emProjeto, f.modelo].filter((x) => x.length).length +
  (f.soPendentes ? 1 : 0);

/** Opções do filtro Solução: as que aparecem nas empresas */
export const codigosDeSolucao = (lista: EmpresaLista[]) =>
  [...new Set(lista.flatMap((e) => e.solucoes.map((s) => s.codigo)))].sort((a, b) =>
    a.localeCompare(b)
  );
