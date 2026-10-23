/**
 * Regras da tela Regras de contagem: o que mudou desde a última gravação, o que mandar
 * salvar, filtros que impedem a contagem, totais e busca nos códigos de resolução.
 */

import type { CodigoResolucao, FiltrosContagem, SalvarRegrasInput } from '@/types/regrasContagem';

export interface RegrasEdicao {
  codigos: CodigoResolucao[];
  filtros: FiltrosContagem;
}

export type ContaCodigo = 'horas' | 'tickets';

/** Tipos de chamado do Aranda (a view de apontamentos traduz só estes) */
export const TIPOS_CHAMADO = ['IM', 'RF', 'PM'] as const;

/** Código incluído na tela: entra contando horas e tickets */
export const codigoNovo = (
  codigo: string,
  uso?: { apontamentos6m: number; tickets6m: number }
): CodigoResolucao => ({
  codigo,
  contaHoras: true,
  contaTickets: true,
  apontamentos6m: uso?.apontamentos6m ?? 0,
  tickets6m: uso?.tickets6m ?? 0,
});

/** As listas valem como conjuntos: a ordem não muda a contagem */
const mesmoConjunto = (a: string[], b: string[]) =>
  [...a].sort().join('\n') === [...b].sort().join('\n');

const filtrosIguais = (a: FiltrosContagem, b: FiltrosContagem) =>
  mesmoConjunto(a.gruposQueContam, b.gruposQueContam) &&
  mesmoConjunto(a.tiposChamado, b.tiposChamado) &&
  mesmoConjunto(a.itensExcluidos, b.itensExcluidos) &&
  a.ignorarAtividadeInterna === b.ignorarAtividadeInterna &&
  a.soTicketsFechados === b.soTicketsFechados;

export function mudancasRegras(atual: RegrasEdicao, salvo: RegrasEdicao) {
  // O código é comparado exatamente como vem do Aranda: espaços contam
  const original = new Map(salvo.codigos.map((c) => [c.codigo, c]));
  const incluidos = atual.codigos.filter((c) => !original.has(c.codigo)).length;
  const retirados = salvo.codigos.filter(
    (c) => !atual.codigos.some((x) => x.codigo === c.codigo)
  ).length;
  const alterados = atual.codigos.filter((c) => {
    const o = original.get(c.codigo);
    return o && (o.contaHoras !== c.contaHoras || o.contaTickets !== c.contaTickets);
  }).length;
  const filtrosAlterados = !filtrosIguais(atual.filtros, salvo.filtros);
  return {
    incluidos,
    retirados,
    alterados,
    filtrosAlterados,
    codigosAlterados: incluidos + retirados + alterados > 0,
    algo: incluidos + retirados + alterados > 0 || filtrosAlterados,
  };
}

/** Só a parte que mudou vai para o banco; os códigos vão como a lista completa */
export function paraSalvar(
  motivo: string,
  atual: RegrasEdicao,
  mudancas: ReturnType<typeof mudancasRegras>
): SalvarRegrasInput {
  return {
    motivo: motivo.trim(),
    ...(mudancas.filtrosAlterados ? { filtros: atual.filtros } : {}),
    ...(mudancas.codigosAlterados
      ? {
          codigos: atual.codigos.map(({ codigo, contaHoras, contaTickets }) => ({
            codigo,
            contaHoras,
            contaTickets,
          })),
        }
      : {}),
  };
}

/** Sem grupo ou sem tipo de chamado nada conta nos bancos; o banco também recusa */
export const problemasDosFiltros = (f: FiltrosContagem) => ({
  semGrupos: !f.gruposQueContam.length,
  semTipos: !f.tiposChamado.length,
});

export const totaisRegras = (codigos: CodigoResolucao[], f: FiltrosContagem, semRegra: number) => ({
  horas: codigos.filter((c) => c.contaHoras).length,
  tickets: codigos.filter((c) => c.contaTickets).length,
  filtros:
    f.gruposQueContam.length +
    f.itensExcluidos.length +
    f.tiposChamado.length +
    (f.ignorarAtividadeInterna ? 1 : 0) +
    (f.soTicketsFechados ? 1 : 0),
  semRegra,
});

export const filtrarCodigos = (lista: CodigoResolucao[], busca: string, conta: ContaCodigo[]) =>
  lista.filter(
    (c) =>
      (!busca || c.codigo.toLowerCase().includes(busca.toLowerCase())) &&
      (!conta.length ||
        (conta.includes('horas') && c.contaHoras) ||
        (conta.includes('tickets') && c.contaTickets))
  );
