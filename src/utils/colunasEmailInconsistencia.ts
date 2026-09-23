import type { InconsistenciaChamado, TipoInconsistencia } from '@/types/inconsistenciasChamados';

/**
 * Colunas da tabela de cada tipo de inconsistência no email enviado ao analista.
 * Usado tanto no HTML do email quanto na prévia do modal, para os dois ficarem iguais.
 */
export type ChaveColunaEmail =
  | 'empresa' | 'chamado' | 'tarefa' | 'tempo' | 'data_atividade' | 'data_sistema' | 'analista';

export interface ColunaEmail {
  chave: ChaveColunaEmail;
  titulo: string;
  /** Valor exibido em azul (ex.: nº da tarefa) */
  destaque?: boolean;
}

const EMPRESA: ColunaEmail = { chave: 'empresa', titulo: 'Empresa' };
const CHAMADO: ColunaEmail = { chave: 'chamado', titulo: 'Chamado' };
const TAREFA: ColunaEmail = { chave: 'tarefa', titulo: 'Tarefa', destaque: true };
const TEMPO: ColunaEmail = { chave: 'tempo', titulo: 'Tempo' };
const DATA_ATIVIDADE: ColunaEmail = { chave: 'data_atividade', titulo: 'Data Atividade' };
const DATA_SISTEMA: ColunaEmail = { chave: 'data_sistema', titulo: 'Data Sistema' };
const ANALISTA: ColunaEmail = { chave: 'analista', titulo: 'Analista' };

const COLUNAS_POR_TIPO: Record<TipoInconsistencia, ColunaEmail[]> = {
  sem_atualizacao: [EMPRESA, CHAMADO, ANALISTA],
  ic_999999: [EMPRESA, CHAMADO, ANALISTA],
  tempo_excessivo: [EMPRESA, CHAMADO, TAREFA, TEMPO, ANALISTA],
  mes_diferente: [EMPRESA, CHAMADO, TAREFA, DATA_ATIVIDADE, DATA_SISTEMA, ANALISTA],
};

export function colunasEmailPorTipo(tipo: TipoInconsistencia): ColunaEmail[] {
  return COLUNAS_POR_TIPO[tipo];
}

const formatadorData = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function formatarData(dataIso: string | null): string {
  if (!dataIso) return '-';
  const data = new Date(dataIso);
  return isNaN(data.getTime()) ? '-' : formatadorData.format(data);
}

/** Valor de uma coluna para um item. Empresa (nome abreviado) e analista vêm do contexto do envelope. */
export function valorColunaEmail(
  chave: ChaveColunaEmail,
  item: InconsistenciaChamado,
  contexto: { empresa: string; analista: string }
): string {
  switch (chave) {
    case 'empresa': return contexto.empresa;
    case 'chamado': return item.nro_chamado;
    case 'tarefa': return item.nro_tarefa || '-';
    case 'tempo': return item.tempo_gasto_horas || '-';
    case 'data_atividade': return formatarData(item.data_atividade);
    case 'data_sistema': return formatarData(item.data_sistema);
    case 'analista': return contexto.analista;
  }
}
