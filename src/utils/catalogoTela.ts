/**
 * Regras da tela Produtos e Módulos que não dependem de componente: grupos do
 * Aranda em cada nível, bancos que usam cada item, totais e destino dos grupos
 * ao vincular e desvincular.
 */

import type { Catalogo, Modulo, Produto, UsoEmBanco } from '@/types/catalogo';
import type { DestinoGrupo, MapeamentoGrupo } from '@/types/dePara';
import type { Exportacao, Traduzir } from '@/utils/exportarTabela';

/** Onde se vincula um grupo na tela */
export interface AlvoGrupo {
  tipo: 'solucao' | 'produto' | 'modulo';
  id: string;
}

const nomes = (lista: MapeamentoGrupo[]) =>
  lista.map((g) => g.grupoAranda).sort((a, b) => a.localeCompare(b));

export const gruposDoModulo = (mapeamentos: MapeamentoGrupo[], moduloId: string) =>
  nomes(mapeamentos.filter((g) => g.classificacao === 'modulo' && g.moduloId === moduloId));

/** Grupos ligados ao produto inteiro, sem módulo */
export const gruposSoDoProduto = (mapeamentos: MapeamentoGrupo[], produtoId: string) =>
  nomes(mapeamentos.filter((g) => g.classificacao === 'produto' && g.produtoId === produtoId));

/** Grupos de serviço da solução (DBA, Técnico…) */
export const gruposDaSolucao = (mapeamentos: MapeamentoGrupo[], solucaoId: string) =>
  nomes(mapeamentos.filter((g) => g.classificacao === 'solucao' && g.solucaoId === solucaoId));

export const usosDoProdutoInteiro = (usos: UsoEmBanco[], produtoId: string) =>
  usos.filter((u) => u.produtoId === produtoId && u.moduloId === null);

/** Bancos que alcançam o produto: os que o marcaram inteiro e os que marcaram módulos dele */
export const usosQueAlcancamProduto = (usos: UsoEmBanco[], produtoId: string) =>
  usos.filter((u) => u.produtoId === produtoId);

/** Bancos que alcançam o produto, um por banco (o que marcou vários módulos conta uma vez) */
export function bancosDoProduto(usos: UsoEmBanco[], produtoId: string) {
  const alcancam = usosQueAlcancamProduto(usos, produtoId);
  return alcancam
    .filter((u, i) => alcancam.findIndex((x) => x.bancoId === u.bancoId) === i)
    .map((u) => ({ ...u, produtoInteiro: u.moduloId === null }));
}

/** O módulo é usado pelo banco que o marcou e por quem marcou o produto inteiro */
export const usosDoModulo = (usos: UsoEmBanco[], modulo: Modulo) =>
  usos
    .filter(
      (u) => u.produtoId === modulo.produtoId && (u.moduloId === null || u.moduloId === modulo.id)
    )
    .map((u) => ({ ...u, produtoInteiro: u.moduloId === null }));

export function totaisCatalogo(catalogo: Catalogo, mapeamentos: MapeamentoGrupo[]) {
  const modulosAtivos = catalogo.modulos.filter((m) => m.ativo);
  const comGrupo = new Set(
    mapeamentos.filter((g) => g.classificacao === 'modulo').map((g) => g.moduloId)
  );
  return {
    produtos: catalogo.produtos.filter((p) => p.ativo).length,
    modulos: modulosAtivos.length,
    grupos: mapeamentos.filter((g) => g.classificacao !== 'nao_se_aplica').length,
    semGrupo: modulosAtivos.filter((m) => !comGrupo.has(m.id)).length,
  };
}

/** Módulos ativos que ainda estão no produto provisório "A classificar" da solução (P8) */
export function modulosAClassificar(catalogo: Catalogo, solucaoId: string): number {
  const provisorios = new Set(
    catalogo.produtos.filter((p) => p.solucaoId === solucaoId && p.aClassificar).map((p) => p.id)
  );
  return catalogo.modulos.filter((m) => m.ativo && provisorios.has(m.produtoId)).length;
}

/** O que gravar ao salvar a edição: ids dos grupos que entraram e dos que saíram da lista */
export function mudancasDeGrupos(
  inicial: string[],
  final: string[],
  mapeamentos: MapeamentoGrupo[]
): { vincular: string[]; desvincular: string[] } {
  const idDe = (grupo: string) => mapeamentos.find((g) => g.grupoAranda === grupo)?.id;
  const ids = (grupos: string[]) => grupos.map(idDe).filter((id): id is string => !!id);
  return {
    vincular: ids(final.filter((g) => !inicial.includes(g))),
    desvincular: ids(inicial.filter((g) => !final.includes(g))),
  };
}

const NENHUM: DestinoGrupo = { solucaoId: null, produtoId: null, moduloId: null };

/** Para onde vai o grupo vinculado ao item */
export function destinoDoAlvo(alvo: AlvoGrupo, catalogo: Catalogo): DestinoGrupo {
  if (alvo.tipo === 'solucao') return { solucaoId: alvo.id, produtoId: null, moduloId: null };
  const produtoId =
    alvo.tipo === 'produto' ? alvo.id : catalogo.modulos.find((m) => m.id === alvo.id)?.produtoId;
  const produto = catalogo.produtos.find((p) => p.id === produtoId);
  if (!produto) return NENHUM;
  return {
    solucaoId: produto.solucaoId,
    produtoId: produto.id,
    moduloId: alvo.tipo === 'modulo' ? alvo.id : null,
  };
}

/** Desvincular do módulo deixa o grupo no produto; do produto ou da solução, não se aplica */
export function destinoAoDesvincular(alvo: AlvoGrupo, catalogo: Catalogo): DestinoGrupo {
  if (alvo.tipo !== 'modulo') return NENHUM;
  return { ...destinoDoAlvo(alvo, catalogo), moduloId: null };
}

type LinhaCatalogo = {
  solucao: string;
  produto: Produto;
  modulo?: Modulo;
};

const porOrdem = <T extends { ordem: number }>(lista: T[]) =>
  [...lista].sort((a, b) => a.ordem - b.ordem);

/**
 * Exportação do catálogo no formato da importação: cada produto numa linha, seguido
 * dos seus módulos, na ordem das soluções, dos produtos e dos módulos
 */
export function exportacaoCatalogo(catalogo: Catalogo, t: Traduzir): Exportacao {
  const linhas: LinhaCatalogo[] = porOrdem(catalogo.solucoes).flatMap((s) =>
    porOrdem(catalogo.produtos.filter((p) => p.solucaoId === s.id)).flatMap((produto) => [
      { solucao: s.nome, produto },
      ...porOrdem(catalogo.modulos.filter((m) => m.produtoId === produto.id)).map((modulo) => ({
        solucao: s.nome,
        produto,
        modulo,
      })),
    ])
  );
  const coluna = (chave: string, valor: (l: LinhaCatalogo) => string | null | undefined) => ({
    rotulo: t(`produtosModulos.exportar.colunas.${chave}`),
    valor,
  });
  return {
    arquivo: t('produtosModulos.exportar.arquivo'),
    titulo: t('produtosModulos.titulo'),
    abas: [
      {
        nome: t('produtosModulos.titulo'),
        linhas,
        colunas: [
          coluna('solucao', (l) => l.solucao),
          coluna('produto', (l) => l.produto.nome),
          coluna('modulo', (l) => l.modulo?.nome),
          coluna('descricao', (l) => (l.modulo ?? l.produto).descricao),
          {
            rotulo: t('fase3Comum.situacao'),
            valor: (l: LinhaCatalogo) =>
              t((l.modulo ?? l.produto).ativo ? 'fase3Comum.ativo' : 'fase3Comum.inativo'),
          },
        ],
      },
    ],
  };
}
