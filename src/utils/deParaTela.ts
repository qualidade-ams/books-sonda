/**
 * Regras da tela De-para de Grupos que não dependem de componente: filtros da lista,
 * totais dos indicadores, Grupos do Book já usados e empresas afetadas por uma mudança.
 */

import type {
  ClassificacaoGrupo,
  DestinoGrupo,
  GrupoNaoMapeado,
  MapeamentoGrupo,
  UsoGrupo,
} from '@/types/dePara';
import type { Catalogo } from '@/types/catalogo';
import type { Exportacao, Traduzir } from '@/utils/exportarTabela';

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

export function filtrarMapeamentos(
  lista: MapeamentoGrupo[],
  filtro: FiltroMapeamentos
): MapeamentoGrupo[] {
  const termo = filtro.busca.trim().toLowerCase();
  return lista.filter(
    (m) =>
      (!termo || `${m.grupoAranda} ${m.grupoBook}`.toLowerCase().includes(termo)) &&
      passa(filtro.solucoes, m.solucaoId) &&
      passa(filtro.produtos, m.produtoId) &&
      passa(filtro.modulos, m.moduloId) &&
      passa(filtro.situacao, m.classificacao)
  );
}

export function totaisDePara(mapeamentos: MapeamentoGrupo[], naoMapeados: GrupoNaoMapeado[]) {
  const comModulo = mapeamentos.filter((m) => m.classificacao === 'modulo').length;
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

/** Exportação dos mapeamentos, com o destino pelo nome e o uso dos últimos 6 meses */
export function exportacaoMapeamentos(
  mapeamentos: MapeamentoGrupo[],
  catalogo: Catalogo,
  uso: Record<string, UsoGrupo>,
  t: Traduzir
): Exportacao {
  const nome = (lista: { id: string; nome: string }[], id: string | null) =>
    lista.find((x) => x.id === id)?.nome;
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
          coluna('deParaGrupos.lista.colunaApontamentos', (m) => uso[m.id]?.apontamentos ?? 0),
          coluna('deParaGrupos.exportar.tickets', (m) => uso[m.id]?.tickets ?? 0),
        ],
      },
    ],
  };
}
