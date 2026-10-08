import type { InconsistenciaChamado, TipoInconsistencia } from '@/types/inconsistenciasChamados';

export interface ColunaDataInconsistencia {
  /** Chave i18n do título da coluna */
  tituloKey: 'inconsistencias.activityDate' | 'inconsistencias.publicNoteDate';
  valor: (item: InconsistenciaChamado) => string | null;
}

/**
 * Coluna de data da tabela de inconsistências conforme o filtro de tipo.
 * Filtrando só "Sem Atualização 16+ dias", mostra a última nota pública do chamado
 * (a referência da regra); nos demais casos, a Data Atividade.
 */
export function colunaDataInconsistencia(tipoFiltro?: TipoInconsistencia | 'all'): ColunaDataInconsistencia {
  if (tipoFiltro === 'sem_atualizacao') {
    return {
      tituloKey: 'inconsistencias.publicNoteDate',
      valor: item => item.data_ultima_nota_publica ?? null,
    };
  }
  return {
    tituloKey: 'inconsistencias.activityDate',
    valor: item => item.data_atividade,
  };
}
