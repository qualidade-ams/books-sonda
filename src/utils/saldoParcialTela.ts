// Regras de exibição da aba Saldo Parcial de Rotinas Automáticas (Modelagem_Fase3.md, seção 11):
// indicadores, quem já recebeu hoje, filtros do histórico e a ordem dos agendamentos.
import { origemDaExecucao } from '@/services/envioSaldoParcialService';
import { preverProximaExecucao } from '@/utils/proximaExecucao';
import { descreverRecorrencia } from '@/utils/descreverRecorrencia';
import { dataHoraPlanilha, type Exportacao, type Traduzir } from '@/utils/exportarTabela';
import type { TFunction } from 'i18next';
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

type AgendamentoOrdenado = ReturnType<typeof ordenarAgendamentos>[number];

/** Exportação da aba: os agendamentos na ordem da tela e o histórico de envios carregado */
export function exportacaoSaldoParcial(
  agendamentos: AgendamentoOrdenado[],
  execucoes: ExecucaoSaldoParcial[],
  nomeDaEmpresa: (id: string) => string,
  t: Traduzir
): Exportacao {
  const r = (chave: string, valores?: Record<string, unknown>) =>
    t(`rotinasSaldoParcial.${chave}`, valores);
  const situacao = (status: string | null) => (status ? r(`situacoes.${status}`) : null);
  const origem = (e: ExecucaoSaldoParcial) => {
    const tipo = origemDaExecucao(e);
    if (tipo === 'controle') return r('historico.controle');
    const nome = e.agendamento?.nome ?? '';
    return tipo === 'executar_agora' ? r('historico.executadoAgora', { nome }) : nome;
  };
  return {
    arquivo: r('exportar.arquivo'),
    titulo: r('exportar.titulo'),
    abas: [
      {
        nome: r('abas.agendamentos'),
        linhas: agendamentos,
        colunas: [
          {
            rotulo: r('exportar.colunas.nome'),
            valor: (l: AgendamentoOrdenado) => l.agendamento.nome,
          },
          {
            rotulo: t('fase3Comum.situacao'),
            valor: (l: AgendamentoOrdenado) =>
              t(l.agendamento.ativo ? 'fase3Comum.ativo' : 'fase3Comum.inativo'),
          },
          {
            rotulo: r('exportar.colunas.recorrencia'),
            valor: (l: AgendamentoOrdenado) =>
              descreverRecorrencia(l.agendamento, t as unknown as TFunction),
          },
          {
            rotulo: r('exportar.colunas.empresas'),
            valor: (l: AgendamentoOrdenado) =>
              (l.agendamento.empresas ?? []).map((e) => nomeDaEmpresa(e.empresa_id)).join(', '),
          },
          {
            rotulo: r('exportar.colunas.copia'),
            valor: (l: AgendamentoOrdenado) => l.agendamento.emails_cc.join(', '),
          },
          {
            rotulo: r('cartao.proximo'),
            valor: (l: AgendamentoOrdenado) => dataHoraPlanilha(l.proximoEnvio),
          },
          {
            rotulo: r('cartao.ultimo'),
            valor: (l: AgendamentoOrdenado) => dataHoraPlanilha(l.agendamento.ultima_execucao),
          },
          {
            rotulo: r('exportar.colunas.ultimoStatus'),
            valor: (l: AgendamentoOrdenado) => situacao(l.agendamento.ultimo_status),
          },
        ],
      },
      {
        nome: r('abas.historico'),
        linhas: execucoes,
        colunas: [
          {
            rotulo: r('historico.colunas.quando'),
            valor: (e: ExecucaoSaldoParcial) => dataHoraPlanilha(e.iniciado_em),
          },
          {
            rotulo: r('historico.colunas.empresa'),
            valor: (e: ExecucaoSaldoParcial) =>
              e.empresa?.nome_abreviado ?? nomeDaEmpresa(e.empresa_id),
          },
          { rotulo: r('historico.colunas.origem'), valor: origem },
          {
            rotulo: r('historico.colunas.situacao'),
            valor: (e: ExecucaoSaldoParcial) => situacao(e.status),
          },
          {
            rotulo: r('historico.colunas.destinatarios'),
            valor: (e: ExecucaoSaldoParcial) => e.qtd_destinatarios,
          },
          {
            rotulo: r('historico.colunas.emails'),
            valor: (e: ExecucaoSaldoParcial) => e.qtd_emails,
          },
          { rotulo: r('exportar.colunas.erro'), valor: (e: ExecucaoSaldoParcial) => e.erro },
        ],
      },
    ],
  };
}
