// Regras de exibição da aba Saldo Parcial de Rotinas Automáticas (Modelagem_Fase3.md, seção 11):
// indicadores, quem já recebeu hoje, filtros do histórico e a ordem dos agendamentos.
import { origemDaExecucao } from '@/services/envioSaldoParcialService';
import { preverProximaExecucao } from '@/utils/proximaExecucao';
import type {
  AgendamentoSaldoParcial,
  ExecucaoSaldoParcial,
  OrigemEnvioSaldoParcial,
  StatusExecucaoSaldoParcial,
} from '@/types/envioSaldoParcial';

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;
const FALHAS: StatusExecucaoSaldoParcial[] = ['erro', 'interrompida'];

/** AAAA-MM-DD no horário de Brasília */
const diaBrasilia = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);

/** Das empresas, as que já receberam o Saldo Parcial hoje: o "Executar agora" pula essas */
export function receberamHoje(
  empresaIds: string[],
  execucoes: ExecucaoSaldoParcial[],
  agora: Date = new Date()
): string[] {
  const hoje = diaBrasilia(agora);
  const receberam = new Set(
    execucoes
      .filter((e) => e.status === 'sucesso' && diaBrasilia(new Date(e.iniciado_em)) === hoje)
      .map((e) => e.empresa_id)
  );
  return empresaIds.filter((id) => receberam.has(id));
}

export function totaisSaldoParcial(
  agendamentos: AgendamentoSaldoParcial[],
  execucoes: ExecucaoSaldoParcial[],
  agora: Date = new Date()
) {
  const recentes = execucoes.filter(
    (e) => agora.getTime() - new Date(e.iniciado_em).getTime() <= SETE_DIAS_MS
  );
  return {
    ativos: agendamentos.filter((a) => a.ativo).length,
    empresas: agendamentos.reduce((soma, a) => soma + (a.empresas?.length ?? 0), 0),
    enviados: recentes.filter((e) => e.status === 'sucesso').length,
    falhas: recentes.filter((e) => FALHAS.includes(e.status)).length,
  };
}

export interface FiltroHistorico {
  busca: string;
  situacoes: StatusExecucaoSaldoParcial[];
  origens: OrigemEnvioSaldoParcial[];
}

export const SEM_FILTRO_HISTORICO: FiltroHistorico = { busca: '', situacoes: [], origens: [] };

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function filtrarHistorico(execucoes: ExecucaoSaldoParcial[], filtro: FiltroHistorico) {
  const termo = normalizar(filtro.busca.trim());
  return execucoes.filter(
    (e) =>
      (!termo || normalizar(e.empresa?.nome_abreviado ?? '').includes(termo)) &&
      (!filtro.situacoes.length || filtro.situacoes.includes(e.status)) &&
      (!filtro.origens.length || filtro.origens.includes(origemDaExecucao(e)))
  );
}

/**
 * Próximo envio de cada agendamento, o mais próximo primeiro e os sem data por último. Logo após
 * salvar o servidor ainda não recalculou: usa a previsão, com a mesma regra do agendador.
 */
export function ordenarAgendamentos(
  agendamentos: AgendamentoSaldoParcial[],
  agendadorDesligado: boolean,
  agora: Date = new Date()
): { agendamento: AgendamentoSaldoParcial; proximoEnvio: string | null }[] {
  return agendamentos
    .map((agendamento) => ({
      agendamento,
      proximoEnvio: !agendamento.ativo
        ? null
        : agendamento.proxima_execucao ||
          (agendadorDesligado ? null : preverProximaExecucao(agendamento, agora)),
    }))
    .sort((a, b) => {
      if (a.proximoEnvio !== b.proximoEnvio) {
        if (!a.proximoEnvio) return 1;
        if (!b.proximoEnvio) return -1;
        return Date.parse(a.proximoEnvio) - Date.parse(b.proximoEnvio);
      }
      return a.agendamento.nome.localeCompare(b.agendamento.nome, 'pt-BR');
    });
}
