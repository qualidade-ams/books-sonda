/**
 * Regras da tela De-para de Grupos que não dependem de componente: filtros da lista,
 * totais dos indicadores, Grupos do Book já usados e empresas afetadas por uma mudança.
 */

import type {
  ClassificacaoGrupo,
  DestinoGrupo,
  GrupoNaoMapeado,
  MapeamentoGrupo,
  MapeamentoInput,
  UsoGrupo,
} from '@/types/dePara';
import type { Catalogo } from '@/types/catalogo';
import { classificar } from '@/services/deParaService';
import type { Exportacao, Traduzir } from '@/utils/exportarTabela';
import type { LinhaImportacao, LinhaPlanilha } from '@/utils/importarPlanilha';

export interface FiltroMapeamentos {
  busca: string;
  solucoes: string[];
  produtos: string[];
  modulos: string[];
  situacao: ClassificacaoGrupo[];
}

export const SEM_FILTRO: FiltroMapeamentos = {
  busca: '',
  solucoes: [],
  produtos: [],
  modulos: [],
  situacao: [],
};

/** Lista vazia no filtro = não filtra por ele */
const passa = (lista: string[], valor: string | null) =>
  !lista.length || lista.includes(valor ?? '');

const SEM_LUGAR: DestinoGrupo[] = [{ solucaoId: null, produtoId: null, moduloId: null }];

/** O grupo passa se algum lugar dele atende a todos os filtros de destino ao mesmo tempo */
export function filtrarMapeamentos(
  lista: MapeamentoGrupo[],
  filtro: FiltroMapeamentos
): MapeamentoGrupo[] {
  const termo = filtro.busca.trim().toLowerCase();
  const atende = (l: DestinoGrupo) =>
    passa(filtro.solucoes, l.solucaoId) &&
    passa(filtro.produtos, l.produtoId) &&
    passa(filtro.modulos, l.moduloId) &&
    passa(filtro.situacao, classificar(l));
  return lista.filter(
    (m) =>
      (!termo || `${m.grupoAranda} ${m.grupoBook}`.toLowerCase().includes(termo)) &&
      (m.vinculos.length ? m.vinculos : SEM_LUGAR).some(atende)
  );
}

export function totaisDePara(mapeamentos: MapeamentoGrupo[], naoMapeados: GrupoNaoMapeado[]) {
  const comModulo = mapeamentos.filter((m) => m.vinculos.some((v) => v.moduloId)).length;
  return {
    mapeados: mapeamentos.length,
    comModulo,
    semModulo: mapeamentos.length - comModulo,
    naoMapeados: naoMapeados.length,
  };
}

/** Grupos do Book já usados, para sugerir na edição */
export const gruposDoBook = (mapeamentos: MapeamentoGrupo[]) =>
  [...new Set(mapeamentos.map((m) => m.grupoBook))].sort((a, b) => a.localeCompare(b));

/** Empresas com bancos múltiplos que o consumo dos grupos alcança */
export const empresasAfetadas = (ids: string[], uso: Record<string, UsoGrupo>) =>
  [...new Set(ids.flatMap((id) => uso[id]?.empresasMultiplos ?? []))].sort((a, b) =>
    a.localeCompare(b)
  );

export const grupoJaMapeado = (grupo: string, mapeamentos: MapeamentoGrupo[]) => {
  const chave = grupo.trim().toLowerCase();
  return mapeamentos.some((m) => m.grupoAranda.toLowerCase() === chave);
};

export const destinoMudou = (atual: DestinoGrupo, novo: DestinoGrupo) =>
  atual.solucaoId !== novo.solucaoId ||
  atual.produtoId !== novo.produtoId ||
  atual.moduloId !== novo.moduloId;

/**
 * Exportação dos mapeamentos: o lugar principal pelo nome, nas colunas que a importação lê,
 * os outros lugares em texto e o uso dos últimos 6 meses
 */
export function exportacaoMapeamentos(
  mapeamentos: MapeamentoGrupo[],
  catalogo: Catalogo,
  uso: Record<string, UsoGrupo>,
  t: Traduzir
): Exportacao {
  const nome = (lista: { id: string; nome: string }[], id: string | null) =>
    lista.find((x) => x.id === id)?.nome;
  const lugar = (v: DestinoGrupo) =>
    [
      nome(catalogo.solucoes, v.solucaoId),
      nome(catalogo.produtos, v.produtoId),
      nome(catalogo.modulos, v.moduloId),
    ]
      .filter(Boolean)
      .join(' › ');
  const coluna = (rotulo: string, valor: (m: MapeamentoGrupo) => string | number | undefined) => ({
    rotulo: t(rotulo),
    valor,
  });
  return {
    arquivo: t('deParaGrupos.exportar.arquivo'),
    titulo: t('deParaGrupos.titulo'),
    abas: [
      {
        nome: t('deParaGrupos.titulo'),
        linhas: mapeamentos,
        colunas: [
          coluna('deParaGrupos.lista.colunaGrupo', (m) => m.grupoAranda),
          coluna('deParaGrupos.lista.colunaBook', (m) => m.grupoBook),
          coluna('deParaGrupos.destino.solucao', (m) => nome(catalogo.solucoes, m.solucaoId)),
          coluna('deParaGrupos.destino.produto', (m) => nome(catalogo.produtos, m.produtoId)),
          coluna('deParaGrupos.destino.modulo', (m) => nome(catalogo.modulos, m.moduloId)),
          coluna('fase3Comum.situacao', (m) => t(`deParaGrupos.classificacao.${m.classificacao}`)),
          coluna('deParaGrupos.exportar.outrosLugares', (m) =>
            m.vinculos.slice(1).map(lugar).join('; ')
          ),
          coluna('deParaGrupos.lista.colunaApontamentos', (m) => uso[m.id]?.apontamentos ?? 0),
          coluna('deParaGrupos.exportar.tickets', (m) => uso[m.id]?.tickets ?? 0),
        ],
      },
    ],
  };
}

const chaveTexto = (texto: string) => texto.trim().toLowerCase();
const SEM_DESTINO: DestinoGrupo = { solucaoId: null, produtoId: null, moduloId: null };

type ErroDestino = { chave: string; valores?: Record<string, unknown> };

/** Destino da linha da planilha pelos nomes do catálogo (solução também pelo código), só ativos */
function destinoDaLinha(
  v: Record<string, string>,
  catalogo: Catalogo
): { destino: DestinoGrupo; erro?: ErroDestino } {
  const igual = (a: string, b: string) => chaveTexto(a) === chaveTexto(b);
  if (!v.solucao) {
    if (v.produto) return { destino: SEM_DESTINO, erro: { chave: 'produtoSemSolucao' } };
    if (v.modulo) return { destino: SEM_DESTINO, erro: { chave: 'moduloSemProduto' } };
    return { destino: SEM_DESTINO };
  }
  const solucao = catalogo.solucoes.find(
    (s) => s.ativo && (igual(s.nome, v.solucao) || igual(s.codigo, v.solucao))
  );
  if (!solucao)
    return {
      destino: SEM_DESTINO,
      erro: { chave: 'solucaoNaoExiste', valores: { nome: v.solucao } },
    };
  const soSolucao = { ...SEM_DESTINO, solucaoId: solucao.id };
  if (!v.produto)
    return v.modulo
      ? { destino: soSolucao, erro: { chave: 'moduloSemProduto' } }
      : { destino: soSolucao };

  const produto = catalogo.produtos.find(
    (p) => p.ativo && p.solucaoId === solucao.id && igual(p.nome, v.produto)
  );
  if (!produto)
    return {
      destino: soSolucao,
      erro: { chave: 'produtoNaoExiste', valores: { nome: v.produto, solucao: solucao.nome } },
    };
  const comProduto = { ...soSolucao, produtoId: produto.id };
  if (!v.modulo) return { destino: comProduto };

  const modulo = catalogo.modulos.find(
    (m) => m.ativo && m.produtoId === produto.id && igual(m.nome, v.modulo)
  );
  if (!modulo)
    return {
      destino: comProduto,
      erro: { chave: 'moduloNaoExiste', valores: { nome: v.modulo, produto: produto.nome } },
    };
  return { destino: { ...comProduto, moduloId: modulo.id } };
}

const mapeamentoDoGrupo = (grupo: string, mapeamentos: MapeamentoGrupo[]) =>
  mapeamentos.find((m) => chaveTexto(m.grupoAranda) === chaveTexto(grupo));

/** Importação: o grupo já mapeado (sem diferenciar maiúsculas) que muda Book ou destino é "atualiza" */
export function conferirMapeamentos(
  linhas: LinhaPlanilha[],
  mapeamentos: MapeamentoGrupo[],
  catalogo: Catalogo,
  t: Traduzir
): LinhaImportacao[] {
  const erro = (chave: string, valores?: Record<string, unknown>) =>
    t(`deParaGrupos.importar.erros.${chave}`, valores);
  const primeira = new Map<string, number>();
  return linhas.map((l) => {
    const { grupo, book } = l.valores;
    const erros: string[] = [];
    if (!grupo) erros.push(erro('grupoVazio'));
    if (!book) erros.push(erro('bookVazio'));
    const { destino, erro: erroDestino } = destinoDaLinha(l.valores, catalogo);
    if (erroDestino) erros.push(erro(erroDestino.chave, erroDestino.valores));
    if (grupo) {
      const repetido = primeira.get(chaveTexto(grupo));
      if (repetido) erros.push(erro('repetido', { linha: repetido }));
      else primeira.set(chaveTexto(grupo), l.linha);
    }
    if (erros.length) return { ...l, situacao: 'erro', erros };

    const atual = mapeamentoDoGrupo(grupo, mapeamentos);
    if (!atual) return { ...l, situacao: 'novo' };
    const igual = atual.grupoBook === book && !destinoMudou(atual, destino);
    return { ...l, situacao: igual ? 'igual' : 'atualiza' };
  });
}

/**
 * O que gravar: o grupo novo sem id; o já mapeado com o id dele. O destino da linha troca
 * todos os lugares do grupo, menos quando o grupo está em vários e a linha traz o principal
 * (a planilha exportada só tem esse): aí os lugares ficam como estão
 */
export const mapeamentosImportados = (
  linhas: LinhaImportacao[],
  mapeamentos: MapeamentoGrupo[],
  catalogo: Catalogo
): MapeamentoInput[] =>
  linhas.map((l) => {
    const atual = mapeamentoDoGrupo(l.valores.grupo, mapeamentos);
    const destino = destinoDaLinha(l.valores, catalogo).destino;
    const mantemLugares = !!atual && atual.vinculos.length > 1 && !destinoMudou(atual, destino);
    return {
      ...(atual ? { id: atual.id } : {}),
      grupoAranda: atual?.grupoAranda ?? l.valores.grupo,
      grupoBook: l.valores.book,
      ...(mantemLugares ? {} : { destino }),
    };
  });
