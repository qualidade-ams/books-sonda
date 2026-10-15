/**
 * Classificador: cada apontamento, ticket ou requerimento vai para exatamente um
 * banco (RN-02 a RN-06, RN-09; Modelagem_Fase2.md seção 4). Funções puras.
 *
 * Grupo do Aranda → produto/módulo (de-para) → primeiro banco, na ordem do
 * cadastro, cujo escopo e filtro atendem → senão, Banco padrão.
 */

import { mesesDesdeVigencia, type MesAno } from './calculo';

export interface EscopoBanco {
  produtoId: string;
  /** Nulo = produto inteiro */
  moduloId: string | null;
}

export interface FiltroItemConfiguracao {
  operador: 'contem' | 'igual';
  valor: string;
}

export interface BancoClassificavel {
  bancoId: string;
  ordem: number;
  padrao: boolean;
  ativo: boolean;
  inicioVigencia: MesAno;
  escopo: EscopoBanco[];
  filtroIc: FiltroItemConfiguracao | null;
}

export interface GrupoDePara {
  grupoAranda: string;
  /** Nulo = grupo sem produto (ex.: DEDICADOS, T&M) */
  produtoId: string | null;
  moduloId: string | null;
  ativo: boolean;
}

export interface Classificador {
  porGrupo(grupo: string | null, itemConfiguracao: string | null): string | null;
  porProdutoModulo(
    produtoId: string | null,
    moduloId: string | null,
    itemConfiguracao: string | null
  ): string | null;
}

const normalizar = (texto: string | null | undefined) => (texto ?? '').trim().toLowerCase();

function atendeEscopo(
  banco: BancoClassificavel,
  produtoId: string | null,
  moduloId: string | null
): boolean {
  // Banco sem escopo (só com filtro) cobre qualquer produto (Q2)
  if (banco.escopo.length === 0) return true;
  if (!produtoId) return false;
  return banco.escopo.some(
    (e) => e.produtoId === produtoId && (e.moduloId === null || e.moduloId === moduloId)
  );
}

function atendeFiltro(banco: BancoClassificavel, itemConfiguracao: string | null): boolean {
  if (!banco.filtroIc) return true;
  if (itemConfiguracao === null || itemConfiguracao === undefined) return false;
  const item = normalizar(itemConfiguracao);
  const valor = normalizar(banco.filtroIc.valor);
  return banco.filtroIc.operador === 'igual' ? item === valor : item.includes(valor);
}

/**
 * Monta o classificador de uma empresa num mês. Só participam bancos ativos e
 * já vigentes no mês.
 */
export function criarClassificador(
  bancos: BancoClassificavel[],
  dePara: GrupoDePara[],
  mes: MesAno
): Classificador {
  const vigentes = bancos.filter((b) => b.ativo && mesesDesdeVigencia(b, mes) >= 0);

  const solto = vigentes.find((b) => !b.padrao && b.escopo.length === 0 && !b.filtroIc);
  if (solto) {
    throw new Error(
      `Banco ${solto.bancoId} sem escopo e sem filtro: receberia tudo. Defina o escopo ou o filtro.`
    );
  }

  const candidatos = vigentes.filter((b) => !b.padrao).sort((a, b) => a.ordem - b.ordem);
  const padrao = vigentes.find((b) => b.padrao) ?? null;
  const grupos = new Map(dePara.filter((d) => d.ativo).map((d) => [normalizar(d.grupoAranda), d]));

  const porProdutoModulo: Classificador['porProdutoModulo'] = (
    produtoId,
    moduloId,
    itemConfiguracao
  ) => {
    const banco = candidatos.find(
      (b) => atendeEscopo(b, produtoId, moduloId) && atendeFiltro(b, itemConfiguracao)
    );
    return (banco ?? padrao)?.bancoId ?? null;
  };

  return {
    porProdutoModulo,
    porGrupo(grupo, itemConfiguracao) {
      const d = grupos.get(normalizar(grupo));
      return porProdutoModulo(d?.produtoId ?? null, d?.moduloId ?? null, itemConfiguracao);
    },
  };
}

export interface Quantidades {
  minutos: number;
  tickets: number;
}

/** Soma as linhas por banco; o que não tem banco fica em `semBanco` (RN-02) */
export function distribuirPorBanco<T extends Quantidades>(
  linhas: T[],
  classificar: (linha: T) => string | null
): { porBanco: Record<string, Quantidades>; semBanco: Quantidades } {
  const porBanco: Record<string, Quantidades> = {};
  const semBanco: Quantidades = { minutos: 0, tickets: 0 };
  for (const linha of linhas) {
    const bancoId = classificar(linha);
    const destino = bancoId ? (porBanco[bancoId] ??= { minutos: 0, tickets: 0 }) : semBanco;
    destino.minutos += linha.minutos;
    destino.tickets += linha.tickets;
  }
  return { porBanco, semBanco };
}
