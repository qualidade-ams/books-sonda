/**
 * Regras do campo Produto/Módulo (banco) no lançamento de requerimento
 * (empresa liberada). O banco sai do produto/módulo pela mesma regra da
 * função requerimento_definir_destino: o primeiro banco na ordem, vigente no
 * mês de cobrança, que cobre o módulo (ou o produto inteiro).
 */

import { converterParaHorasDecimal } from '@/utils/horasUtils';
import type { Destino, OpcaoDestino } from '@/services/requerimentoBancoService';

/**
 * O requerimento desconta de um banco: Banco de Horas, ou Reprovado com horas
 * de análise EF (que gera um requerimento de Banco de Horas para a EF).
 */
export function descontaDoBanco(tipoCobranca: string, horasAnaliseEF?: string | number): boolean {
  if (tipoCobranca === 'Banco de Horas') return true;
  if (tipoCobranca !== 'Reprovado' || !horasAnaliseEF) return false;
  const horas =
    typeof horasAnaliseEF === 'string' ? converterParaHorasDecimal(horasAnaliseEF) : horasAnaliseEF;
  return horas > 0;
}

/** AAAA-MM do mês de cobrança (MM/AAAA); sem ele, o mês atual */
function mesAlvo(mesCobranca: string | undefined, hoje: Date): string {
  const m = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec((mesCobranca ?? '').trim());
  if (m) return `${m[2]}-${m[1]}`;
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

export interface BancoDoDestino {
  id: string;
  nome: string;
}

export interface ModuloDoProduto {
  moduloId: string;
  nome: string;
  banco: BancoDoDestino;
}

export interface ProdutoDoRequerimento {
  produtoId: string;
  nome: string;
  /** Módulos que algum banco vigente cobre, cada um com o seu banco */
  modulos: ModuloDoProduto[];
  /** Os módulos vão para bancos diferentes, ou só alguns têm banco: escolha obrigatória */
  precisaModulo: boolean;
  /** Banco do produto quando não precisa de módulo */
  banco: BancoDoDestino | null;
}

/**
 * Produtos que o requerimento pode escolher no mês de cobrança. Produto sem
 * módulos, ou com todos os módulos no mesmo banco, dispensa o módulo.
 */
export function produtosDoRequerimento(
  opcoes: OpcaoDestino[],
  mesCobranca?: string,
  hoje: Date = new Date()
): ProdutoDoRequerimento[] {
  const alvo = mesAlvo(mesCobranca, hoje);
  const vigentes = opcoes.filter(
    (o) =>
      o.inicioVigencia.slice(0, 7) <= alvo &&
      (o.fimVigencia === null || o.fimVigencia.slice(0, 7) >= alvo)
  );

  const porProduto = new Map<string, OpcaoDestino[]>();
  for (const o of vigentes)
    porProduto.set(o.produtoId, [...(porProduto.get(o.produtoId) ?? []), o]);

  return [...porProduto.values()].map((linhas) => {
    // Primeiro banco na ordem do cadastro para cada módulo (ou para o produto sem módulos)
    const porModulo = new Map<string | null, OpcaoDestino>();
    for (const o of linhas) {
      const atual = porModulo.get(o.moduloId);
      if (!atual || o.bancoOrdem < atual.bancoOrdem) porModulo.set(o.moduloId, o);
    }
    const escolhidos = [...porModulo.values()];
    const banco = (o: OpcaoDestino): BancoDoDestino => ({ id: o.bancoId, nome: o.bancoNome });
    const { produtoId, produtoNome, totalModulos } = linhas[0];

    const semModulos = escolhidos.length === 1 && escolhidos[0].moduloId === null;
    const todosNoMesmoBanco =
      escolhidos.length === totalModulos && new Set(escolhidos.map((o) => o.bancoId)).size === 1;
    const precisaModulo = !semModulos && !todosNoMesmoBanco;

    return {
      produtoId,
      nome: produtoNome,
      modulos: escolhidos
        .filter((o) => o.moduloId !== null)
        .map((o) => ({ moduloId: o.moduloId!, nome: o.moduloNome ?? '', banco: banco(o) })),
      precisaModulo,
      banco: precisaModulo ? null : banco(escolhidos[0]),
    };
  });
}

/** Produto e módulo numa chave só, para o valor do formulário: "produto|módulo" */
export const chaveDestino = (produtoId: string, moduloId: string | null) =>
  `${produtoId}|${moduloId ?? ''}`;

export function lerDestino(chave: string | undefined): Destino | null {
  if (!chave) return null;
  const [produtoId, moduloId] = chave.split('|');
  return produtoId ? { produtoId, moduloId: moduloId || null } : null;
}

/** Empresa liberada, tipo que desconta do banco e nenhum produto/módulo escolhido */
export function faltaBanco(p: {
  liberada: boolean;
  tipoCobranca: string;
  horasAnaliseEF?: string | number;
  destino?: string;
}): boolean {
  return p.liberada && descontaDoBanco(p.tipoCobranca, p.horasAnaliseEF) && !p.destino;
}
