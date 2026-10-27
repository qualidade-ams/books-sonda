import { describe, it, expect } from 'vitest';
import { matrizDaAba } from '@/utils/exportarTabela';
import { descreverRecorrencia } from '@/utils/descreverRecorrencia';
import {
  exportacaoSaldoParcial,
  SEM_FILTRO_HISTORICO,
  filtrarHistorico,
  ordenarAgendamentos,
  receberamHoje,
  totaisSaldoParcial,
} from '../saldoParcialTela';
import type { AgendamentoSaldoParcial, ExecucaoSaldoParcial } from '@/types/envioSaldoParcial';

// 26/10/2026 10:00 em Brasília
const AGORA = new Date('2026-10-26T13:00:00Z');

const execucao = (id: string, extra: Partial<ExecucaoSaldoParcial> = {}): ExecucaoSaldoParcial => ({
  id,
  agendamento_id: 'a1',
  empresa_id: 'e1',
  origem: 'agendado',
  disparado_por: null,
  executado_para: '2026-10-26T12:00:00Z',
  status: 'sucesso',
  qtd_destinatarios: 2,
  qtd_emails: 1,
  erro: null,
  iniciado_em: '2026-10-26T12:00:00Z',
  finalizado_em: '2026-10-26T12:01:00Z',
  agendamento: { nome: 'Semanal' },
  empresa: { nome_abreviado: 'EMPRESA ALFA' },
  ...extra,
});

const agendamento = (
  id: string,
  extra: Partial<AgendamentoSaldoParcial> = {}
): AgendamentoSaldoParcial => ({
  id,
  nome: `Agendamento ${id}`,
  ativo: true,
  emails_cc: [],
  proxima_execucao: null,
  ultima_execucao: null,
  ultimo_status: null,
  created_by: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  empresas: [{ empresa_id: 'e1' }],
  frequencia: 'diario',
  dias_semana: [],
  dias_mes: [],
  ultimo_dia_mes: false,
  modo_horario: 'horarios',
  horarios: ['09:00'],
  intervalo_horas: null,
  hora_inicio: null,
  hora_fim: null,
  ...extra,
});

describe('receberamHoje', () => {
  it('empresas com envio bem-sucedido hoje (Brasília), de qualquer origem', () => {
    const execucoes = [
      execucao('x1'),
      execucao('x2', { empresa_id: 'e2', origem: 'manual', agendamento_id: null }),
      // 25/10 22:00 em Brasília: ontem
      execucao('x3', { empresa_id: 'e3', iniciado_em: '2026-10-26T01:00:00Z' }),
      execucao('x4', { empresa_id: 'e4', status: 'erro' }),
    ];
    expect(receberamHoje(['e1', 'e2', 'e3', 'e4', 'e5'], execucoes, AGORA)).toEqual(['e1', 'e2']);
  });
});

describe('totaisSaldoParcial', () => {
  it('agendamentos ativos, empresas agendadas e envios dos últimos 7 dias', () => {
    const agendamentos = [
      agendamento('a1', { empresas: [{ empresa_id: 'e1' }, { empresa_id: 'e2' }] }),
      agendamento('a2', { ativo: false, empresas: [{ empresa_id: 'e3' }] }),
    ];
    const execucoes = [
      execucao('x1'),
      execucao('x2', { status: 'erro' }),
      execucao('x3', { status: 'interrompida' }),
      execucao('x4', { status: 'pulado' }),
      execucao('x5', { iniciado_em: '2026-10-18T12:00:00Z' }),
    ];
    expect(totaisSaldoParcial(agendamentos, execucoes, AGORA)).toEqual({
      ativos: 1,
      empresas: 3,
      enviados: 1,
      falhas: 2,
    });
  });
});

describe('filtrarHistorico', () => {
  const execucoes = [
    execucao('x1', { empresa: { nome_abreviado: 'EMPRESA ÁGUIA' } }),
    execucao('x2', { origem: 'manual', status: 'erro' }),
    execucao('x3', { origem: 'manual', agendamento_id: null }),
  ];
  const ids = (filtro: Partial<typeof SEM_FILTRO_HISTORICO>) =>
    filtrarHistorico(execucoes, { ...SEM_FILTRO_HISTORICO, ...filtro }).map((e) => e.id);

  it('pela empresa sem acento, pela situação e pela origem', () => {
    expect(ids({})).toEqual(['x1', 'x2', 'x3']);
    expect(ids({ busca: 'aguia' })).toEqual(['x1']);
    expect(ids({ situacoes: ['erro'] })).toEqual(['x2']);
    expect(ids({ origens: ['executar_agora'] })).toEqual(['x2']);
    expect(ids({ origens: ['controle', 'agendamento'] })).toEqual(['x1', 'x3']);
  });
});

describe('ordenarAgendamentos', () => {
  it('pelo próximo envio, os sem data por último; antes de o servidor calcular, usa a previsão', () => {
    const lista = ordenarAgendamentos(
      [
        agendamento('inativo', { ativo: false, nome: 'A' }),
        agendamento('depois', { proxima_execucao: '2026-10-28T12:00:00Z' }),
        agendamento('antes', { proxima_execucao: '2026-10-27T12:00:00Z' }),
        // Sem próxima execução gravada: 08:00 de 27/10 em Brasília pela regra
        agendamento('previsto', { horarios: ['08:00'] }),
      ],
      false,
      AGORA
    );
    expect(lista.map((l) => l.agendamento.id)).toEqual(['previsto', 'antes', 'depois', 'inativo']);
    expect(lista[0].proximoEnvio).not.toBeNull();
    expect(lista[3].proximoEnvio).toBeNull();
  });

  it('com o agendador desligado, não prevê', () => {
    const [item] = ordenarAgendamentos([agendamento('a1')], true, AGORA);
    expect(item.proximoEnvio).toBeNull();
  });
});

describe('exportacaoSaldoParcial', () => {
  const t = (chave: string, valores?: Record<string, unknown>) =>
    valores ? `${chave} ${JSON.stringify(valores)}` : chave;
  const nomes: Record<string, string> = { e1: 'EMPRESA ALFA', e2: 'EMPRESA BETA' };

  it('duas abas: agendamentos, na ordem da tela, e histórico de envios', () => {
    const ag = agendamento('a1', {
      nome: 'Semanal',
      empresas: [{ empresa_id: 'e1' }, { empresa_id: 'e2' }],
      emails_cc: ['gestor@exemplo.com'],
      ultima_execucao: '2026-10-26T12:00:00Z',
      ultimo_status: 'sucesso',
    });
    const exportacao = exportacaoSaldoParcial(
      [
        { agendamento: ag, proximoEnvio: '2026-10-27T12:00:00Z' },
        { agendamento: agendamento('a2', { ativo: false }), proximoEnvio: null },
      ],
      [
        execucao('x1'),
        execucao('x2', {
          origem: 'manual',
          agendamento_id: null,
          status: 'erro',
          erro: 'SMTP fora',
        }),
      ],
      (id) => nomes[id] ?? id,
      t
    );
    expect(exportacao.arquivo).toBe('rotinasSaldoParcial.exportar.arquivo');
    expect(exportacao.abas.map((a) => a.nome)).toEqual([
      'rotinasSaldoParcial.abas.agendamentos',
      'rotinasSaldoParcial.abas.historico',
    ]);
    const [agendamentos, historico] = exportacao.abas.map(matrizDaAba);
    expect(agendamentos[0]).toEqual([
      'rotinasSaldoParcial.exportar.colunas.nome',
      'fase3Comum.situacao',
      'rotinasSaldoParcial.exportar.colunas.recorrencia',
      'rotinasSaldoParcial.exportar.colunas.empresas',
      'rotinasSaldoParcial.exportar.colunas.copia',
      'rotinasSaldoParcial.cartao.proximo',
      'rotinasSaldoParcial.cartao.ultimo',
      'rotinasSaldoParcial.exportar.colunas.ultimoStatus',
    ]);
    expect(agendamentos[1]).toEqual([
      'Semanal',
      'fase3Comum.ativo',
      descreverRecorrencia(ag, t as never),
      'EMPRESA ALFA, EMPRESA BETA',
      'gestor@exemplo.com',
      '2026-10-27 09:00',
      '2026-10-26 09:00',
      'rotinasSaldoParcial.situacoes.sucesso',
    ]);
    expect(agendamentos[2].slice(0, 2)).toEqual(['Agendamento a2', 'fase3Comum.inativo']);
    expect(historico).toEqual([
      [
        'rotinasSaldoParcial.historico.colunas.quando',
        'rotinasSaldoParcial.historico.colunas.empresa',
        'rotinasSaldoParcial.historico.colunas.origem',
        'rotinasSaldoParcial.historico.colunas.situacao',
        'rotinasSaldoParcial.historico.colunas.destinatarios',
        'rotinasSaldoParcial.historico.colunas.emails',
        'rotinasSaldoParcial.exportar.colunas.erro',
      ],
      [
        '2026-10-26 09:00',
        'EMPRESA ALFA',
        'Semanal',
        'rotinasSaldoParcial.situacoes.sucesso',
        2,
        1,
        '',
      ],
      [
        '2026-10-26 09:00',
        'EMPRESA ALFA',
        'rotinasSaldoParcial.historico.controle',
        'rotinasSaldoParcial.situacoes.erro',
        2,
        1,
        'SMTP fora',
      ],
    ]);
  });
});
