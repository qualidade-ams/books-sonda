/**
 * Regras da tela Ramos de Atividade, que edita a lista como rascunho e salva tudo de uma
 * vez: diferença entre o rascunho e o que está gravado, totais e filtros.
 */

import type { RamoAtividade, RamoRascunho } from '@/types/ramosAtividade';
import type { Exportacao, Traduzir } from '@/utils/exportarTabela';
import type { LinhaImportacao, LinhaPlanilha } from '@/utils/importarPlanilha';

/** Ramo do rascunho; os incluídos na tela ainda não têm id do banco */
export type RamoEdicao = RamoAtividade & { novo?: boolean };

/** Como o ramo está em relação ao que foi salvo */
export type Pendencia = 'novo' | 'alterado' | 'inativado' | 'reativado' | null;

export type SituacaoRamo = 'ativo' | 'inativo';

const normalizar = (nome: string) => nome.trim().toLowerCase();

export const usoDoRamo = (r: RamoAtividade) => r.empresasPrincipal + r.empresasSecundario;

/** Ramo incluído na tela; o número só distingue os novos entre si */
export const novoRamo = (nome: string, numero: number): RamoEdicao => ({
  id: `novo-${numero}`,
  novo: true,
  nome,
  ordem: 0,
  ativo: true,
  empresasPrincipal: 0,
  empresasSecundario: 0,
  atualizadoEm: '',
  atualizadoPor: null,
});

export const nomeRepetido = (nome: string, lista: RamoAtividade[], excetoId?: string) =>
  lista.some((r) => r.id !== excetoId && normalizar(r.nome) === normalizar(nome));

export function pendenciaDoRamo(r: RamoEdicao, salvos: RamoAtividade[]): Pendencia {
  const salvo = salvos.find((s) => s.id === r.id);
  if (!salvo) return 'novo';
  if (salvo.ativo && !r.ativo) return 'inativado';
  if (!salvo.ativo && r.ativo) return 'reativado';
  return salvo.nome !== r.nome ? 'alterado' : null;
}

export function mudancasRamos(rascunho: RamoEdicao[], salvos: RamoAtividade[]) {
  const salvoDe = (id: string) => salvos.find((s) => s.id === id);
  const existentes = rascunho.filter((r) => salvoDe(r.id));
  const incluidos = rascunho.filter((r) => !salvoDe(r.id));
  const excluidos = salvos.filter((s) => !rascunho.some((r) => r.id === s.id));
  const renomeados = existentes.filter((r) => salvoDe(r.id).nome !== r.nome);
  const inativados = existentes.filter((r) => salvoDe(r.id).ativo && !r.ativo);
  const reativados = existentes.filter((r) => !salvoDe(r.id).ativo && r.ativo);
  // Só a ordem relativa dos que continuam: incluir no fim ou excluir não muda a ordem
  const ordemAlterada =
    existentes.map((r) => r.id).join('|') !==
    salvos
      .filter((s) => rascunho.some((r) => r.id === s.id))
      .map((s) => s.id)
      .join('|');
  const algo =
    incluidos.length +
      excluidos.length +
      renomeados.length +
      inativados.length +
      reativados.length >
      0 || ordemAlterada;
  return { incluidos, renomeados, inativados, reativados, excluidos, ordemAlterada, algo };
}

/** O que o service grava: a posição na lista é a ordem */
export const paraRascunho = (lista: RamoEdicao[]): RamoRascunho[] =>
  lista.map((r) => ({ ...(r.novo ? {} : { id: r.id }), nome: r.nome.trim(), ativo: r.ativo }));

export function totaisRamos(lista: RamoAtividade[], totalEmpresas: number) {
  const comRamo = lista.reduce((s, r) => s + r.empresasPrincipal, 0);
  return {
    ativos: lista.filter((r) => r.ativo).length,
    inativos: lista.filter((r) => !r.ativo).length,
    comRamo,
    semRamo: Math.max(0, totalEmpresas - comRamo),
  };
}

export const filtrarRamos = <T extends RamoAtividade>(
  lista: T[],
  busca: string,
  situacao: SituacaoRamo[]
) =>
  lista.filter(
    (r) =>
      (!situacao.length || situacao.includes(r.ativo ? 'ativo' : 'inativo')) &&
      (!busca.trim() || normalizar(r.nome).includes(normalizar(busca)))
  );

/** Exportação dos ramos, na ordem da lista */
export const exportacaoRamos = (ramos: RamoAtividade[], t: Traduzir): Exportacao => ({
  arquivo: t('ramosAtividade.exportar.arquivo'),
  titulo: t('ramosAtividade.titulo'),
  abas: [
    {
      nome: t('ramosAtividade.titulo'),
      linhas: ramos,
      colunas: [
        { rotulo: t('ramosAtividade.exportar.colunas.ramo'), valor: (r: RamoAtividade) => r.nome },
        {
          rotulo: t('fase3Comum.situacao'),
          valor: (r: RamoAtividade) => t(r.ativo ? 'fase3Comum.ativo' : 'fase3Comum.inativo'),
        },
        {
          rotulo: t('ramosAtividade.exportar.colunas.principal'),
          valor: (r: RamoAtividade) => r.empresasPrincipal,
        },
        {
          rotulo: t('ramosAtividade.exportar.colunas.secundario'),
          valor: (r: RamoAtividade) => r.empresasSecundario,
        },
      ],
    },
  ],
});

/** Importação: ramo novo entra; o que já existe (sem diferenciar maiúsculas) é ignorado */
export function conferirRamos(
  linhas: LinhaPlanilha[],
  salvos: RamoAtividade[],
  t: Traduzir
): LinhaImportacao[] {
  const primeira = new Map<string, number>();
  return linhas.map((l) => {
    const nome = l.valores.nome.trim();
    if (!nome) return { ...l, situacao: 'erro', erros: [t('ramosAtividade.importar.erros.vazio')] };
    const chave = normalizar(nome);
    const repetido = primeira.get(chave);
    if (repetido)
      return {
        ...l,
        situacao: 'erro',
        erros: [t('ramosAtividade.importar.erros.repetido', { linha: repetido })],
      };
    primeira.set(chave, l.linha);
    return { ...l, situacao: nomeRepetido(nome, salvos) ? 'igual' : 'novo' };
  });
}

/** A lista gravada com os ramos importados no fim, ativos */
export const rascunhoComImportados = (
  salvos: RamoAtividade[],
  novos: LinhaPlanilha[]
): RamoRascunho[] => [
  ...paraRascunho(salvos),
  ...novos.map((l) => ({ nome: l.valores.nome.trim(), ativo: true })),
];
