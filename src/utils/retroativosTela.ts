/**
 * Regras da tela Apontamentos Retroativos que não dependem de componente: a busca e os filtros
 * da lista (dentro da aba de cada situação) e as opções dos filtros.
 */
import type { Retroativo, SituacaoRetroativo } from '@/types/retroativos';

export interface FiltroRetroativos {
  busca: string;
  /** Ids das empresas */
  empresas: string[];
  /** Nomes dos consultores, como vêm do Aranda */
  consultores: string[];
}

export const SEM_FILTRO_RETROATIVOS: FiltroRetroativos = {
  busca: '',
  empresas: [],
  consultores: [],
};

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function filtrarRetroativos(
  lista: Retroativo[],
  situacao: SituacaoRetroativo,
  filtro: FiltroRetroativos
): Retroativo[] {
  const termo = normalizar(filtro.busca.trim());
  return lista.filter(
    (r) =>
      r.situacao === situacao &&
      (!filtro.empresas.length || filtro.empresas.includes(r.empresaId)) &&
      (!filtro.consultores.length ||
        r.itens.some((i) => i.consultor && filtro.consultores.includes(i.consultor))) &&
      (!termo ||
        normalizar(
          [r.empresa, r.banco, ...r.itens.flatMap((i) => [i.chamado ?? '', i.tarefa ?? ''])].join(
            ' '
          )
        ).includes(termo))
  );
}

/** Empresas e consultores que aparecem na lista, para os filtros */
export function opcoesDosRetroativos(lista: Retroativo[]) {
  const empresas = new Map(lista.map((r) => [r.empresaId, r.empresa]));
  const consultores = new Set(lista.flatMap((r) => r.itens.map((i) => i.consultor ?? '')));
  consultores.delete('');
  return {
    empresas: [...empresas]
      .map(([valor, rotulo]) => ({ valor, rotulo }))
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo)),
    consultores: [...consultores].sort((a, b) => a.localeCompare(b)),
  };
}
