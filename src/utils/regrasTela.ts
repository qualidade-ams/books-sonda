/**
 * Regras da tela Regras de contagem: o que mudou desde a última gravação, o que mandar
 * salvar, filtros que impedem a contagem, totais e busca nos códigos de resolução.
 */

import type {
  CodigoResolucao,
  FiltrosContagem,
  RegrasContagem,
  SalvarRegrasInput,
} from '@/types/regrasContagem';
import type { Exportacao, Traduzir } from '@/utils/exportarTabela';

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

type LinhaFiltro = { filtro: string; valor: string };

/** Exportação das regras gravadas: códigos, códigos sem regra e filtros, uma aba cada */
export function exportacaoRegras(
  regras: Pick<RegrasContagem, 'codigos' | 'codigosSemRegra' | 'filtros'>,
  t: Traduzir
): Exportacao {
  const simNao = (sim: boolean) =>
    t(sim ? 'regrasContagem.codigos.sim' : 'regrasContagem.codigos.nao');
  const f = regras.filtros;
  const filtros: LinhaFiltro[] = [
    { filtro: t('regrasContagem.filtros.grupos'), valor: f.gruposQueContam.join(', ') },
    { filtro: t('regrasContagem.filtros.tipos'), valor: f.tiposChamado.join(', ') },
    {
      filtro: t('regrasContagem.filtros.atividade'),
      valor: t(
        f.ignorarAtividadeInterna
          ? 'regrasContagem.exportar.atividadeNaoConta'
          : 'regrasContagem.exportar.atividadeConta'
      ),
    },
    { filtro: t('regrasContagem.filtros.itens'), valor: f.itensExcluidos.join(', ') },
    {
      filtro: t('regrasContagem.filtros.tickets'),
      valor: t(
        f.soTicketsFechados
          ? 'regrasContagem.exportar.soFechados'
          : 'regrasContagem.exportar.abertos'
      ),
    },
  ];
  const apontamentos = {
    rotulo: t('regrasContagem.semRegra.colunaApontamentos'),
    valor: (c: { apontamentos6m: number }) => c.apontamentos6m,
  };
  const tickets = {
    rotulo: t('regrasContagem.semRegra.colunaTickets'),
    valor: (c: { tickets6m: number }) => c.tickets6m,
  };
  return {
    arquivo: t('regrasContagem.exportar.arquivo'),
    titulo: t('regrasContagem.titulo'),
    abas: [
      {
        nome: t('regrasContagem.abas.codigos'),
        linhas: regras.codigos,
        colunas: [
          {
            rotulo: t('regrasContagem.codigos.colunaCodigo'),
            valor: (c: CodigoResolucao) => c.codigo,
          },
          {
            rotulo: t('regrasContagem.codigos.colunaHoras'),
            valor: (c: CodigoResolucao) => simNao(c.contaHoras),
          },
          {
            rotulo: t('regrasContagem.codigos.colunaTickets'),
            valor: (c: CodigoResolucao) => simNao(c.contaTickets),
          },
          apontamentos,
          tickets,
        ],
      },
      {
        nome: t('regrasContagem.abas.semRegra'),
        linhas: regras.codigosSemRegra,
        colunas: [
          {
            rotulo: t('regrasContagem.codigos.colunaCodigo'),
            valor: (c: { codigo: string }) => c.codigo,
          },
          apontamentos,
          tickets,
          {
            rotulo: t('regrasContagem.semRegra.colunaPrimeira'),
            valor: (c: { primeiraOcorrencia: string | null }) => c.primeiraOcorrencia,
          },
        ],
      },
      {
        nome: t('regrasContagem.abas.filtros'),
        linhas: filtros,
        colunas: [
          { rotulo: t('regrasContagem.exportar.filtro'), valor: (l: LinhaFiltro) => l.filtro },
          { rotulo: t('regrasContagem.exportar.valor'), valor: (l: LinhaFiltro) => l.valor },
        ],
      },
    ],
  };
}
