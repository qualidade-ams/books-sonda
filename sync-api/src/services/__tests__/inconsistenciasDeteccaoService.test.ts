import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executarDeteccaoInconsistencias } from '../inconsistenciasDeteccaoService';
import { criarSupabaseFake, tem, Chamada } from '../../__tests__/helpers/supabaseFake';

const CHAVE = 'apontamentos-RF 9468598-tempo_excessivo-2026-10-02-TK-9495307';

function detectada(sobrescrever: Record<string, any> = {}) {
  return {
    origem: 'apontamentos',
    nro_chamado: 'RF 9468598',
    nro_tarefa: 'TK-9495307',
    tipo_chamado: 'RF',
    item_configuracao: 'IC 1',
    tipo_inconsistencia: 'tempo_excessivo',
    descricao_inconsistencia: 'Tempo gasto (13:00) excede o limite de 10 horas',
    data_abertura: '2026-09-28T10:00:00-03:00',
    data_atividade: '2026-10-02T00:00:00-03:00',
    data_sistema: '2026-10-02T08:52:02-03:00',
    tempo_gasto_horas: '13:00',
    tempo_gasto_minutos: 780,
    empresa: 'SUZANO',
    analista: 'Elvis Ferreira Duarte',
    status_chamado: null,
    cod_resolucao: 'Alocação',
    chave_unica: CHAVE,
    ...sobrescrever,
  };
}

/** Linha como o banco devolve (todas as colunas): timestamps em UTC e números como double */
function ativaNoBanco(sobrescrever: Record<string, any> = {}) {
  return {
    id: 'inc-1',
    chave_unica: CHAVE,
    origem: 'apontamentos',
    nro_chamado: 'RF 9468598',
    nro_tarefa: 'TK-9495307',
    tipo_chamado: 'RF',
    tipo_inconsistencia: 'tempo_excessivo',
    data_atividade: '2026-10-02T03:00:00+00:00',
    status: 'ativa',
    data_deteccao: '2026-10-02T12:33:12+00:00',
    data_resolucao: null,
    arquivado_manualmente: false,
    created_at: '2026-10-02T12:33:12+00:00',
    updated_at: '2026-10-02T12:33:12+00:00',
    item_configuracao: 'IC 1',
    descricao_inconsistencia: 'Tempo gasto (13:00) excede o limite de 10 horas',
    data_abertura: '2026-09-28T13:00:00+00:00',
    data_sistema: '2026-10-02T11:52:02+00:00',
    tempo_gasto_horas: '13:00',
    tempo_gasto_minutos: 780,
    empresa: 'SUZANO',
    analista: 'Elvis Ferreira Duarte',
    status_chamado: null,
    cod_resolucao: 'Alocação',
    cod_resolucao_anterior: null,
    ...sobrescrever,
  };
}

function cenario(detectadas: any[], ativas: any[]) {
  const fake = criarSupabaseFake((tabela, chamadas: Chamada[]) => {
    if (tabela !== 'inconsistencias_chamados') return null;
    if (chamadas.some(([m]) => m === 'update' || m === 'upsert')) return { data: null, error: null };
    if (tem(chamadas, 'eq', 'status', 'ativa')) return { data: ativas, error: null };
    return { data: [], error: null };
  });

  const rpc = vi.fn().mockResolvedValue({
    data: {
      ic_999999: [],
      sem_atualizacao: [],
      mes_diferente: [],
      tempo_excessivo: detectadas,
      troca_codigo_resolucao: [],
      totais: { tempo_excessivo: detectadas.length, total: detectadas.length },
    },
    error: null,
  });

  const supabase = { ...fake.cliente, rpc } as any;
  const updates = () =>
    fake.consultas
      .filter((c) => c.tabela === 'inconsistencias_chamados' && c.chamadas.some(([m]) => m === 'update'))
      .map((c) => ({
        campos: c.chamadas.find(([m]) => m === 'update')![1][0],
        eq: c.chamadas.filter(([m]) => m === 'eq').map(([, a]) => a),
      }));

  return { supabase, updates };
}

describe('executarDeteccaoInconsistencias — inconsistências já ativas', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('atualiza o analista quando a tarefa mudou de analista depois da detecção', async () => {
    const { supabase, updates } = cenario(
      [detectada()],
      [ativaNoBanco({ analista: 'Elias Gomes de Franca' })]
    );

    const resultado = await executarDeteccaoInconsistencias(supabase);

    expect(resultado.sucesso).toBe(true);
    expect(resultado.atualizadas).toBe(1);
    expect(updates()).toEqual([
      { campos: { analista: 'Elvis Ferreira Duarte' }, eq: [['id', 'inc-1']] },
    ]);
  });

  it('atualiza status do chamado, tempo e código de resolução que mudaram', async () => {
    const { supabase, updates } = cenario(
      [detectada({ status_chamado: 'Closed', tempo_gasto_horas: '14:30', tempo_gasto_minutos: 870, cod_resolucao: 'Dúvida' })],
      [ativaNoBanco({ status_chamado: 'In Progress' })]
    );

    await executarDeteccaoInconsistencias(supabase);

    expect(updates()).toEqual([
      {
        campos: { status_chamado: 'Closed', tempo_gasto_horas: '14:30', tempo_gasto_minutos: 870, cod_resolucao: 'Dúvida' },
        eq: [['id', 'inc-1']],
      },
    ]);
  });

  it('não regrava a linha quando nada mudou, mesmo com timestamps em fuso diferente', async () => {
    const { supabase, updates } = cenario([detectada()], [ativaNoBanco()]);

    const resultado = await executarDeteccaoInconsistencias(supabase);

    expect(updates()).toEqual([]);
    expect(resultado.atualizadas).toBe(0);
    expect(resultado.mantidas).toBe(1);
  });

  it('não mexe em status, data de detecção nem arquivamento da inconsistência', async () => {
    const { supabase, updates } = cenario(
      // mesmo que a detecção passe a devolver esses campos, o ciclo de vida é do sync-api
      [detectada({ analista: 'Outro Analista', status: 'resolvida', data_deteccao: '2026-10-09T10:00:00-03:00', arquivado_manualmente: true })],
      [ativaNoBanco()]
    );

    await executarDeteccaoInconsistencias(supabase);

    const campos = updates()[0].campos;
    expect(campos).not.toHaveProperty('status');
    expect(campos).not.toHaveProperty('data_deteccao');
    expect(campos).not.toHaveProperty('arquivado_manualmente');
    expect(campos).not.toHaveProperty('chave_unica');
  });

  it('atualiza qualquer campo devolvido pela detecção, como a data da atividade', async () => {
    const { supabase, updates } = cenario(
      [detectada({ data_atividade: '2026-10-03T09:15:00-03:00' })],
      [ativaNoBanco()]
    );

    await executarDeteccaoInconsistencias(supabase);

    expect(updates()).toEqual([
      { campos: { data_atividade: '2026-10-03T09:15:00-03:00' }, eq: [['id', 'inc-1']] },
    ]);
  });

  it('ignora campo que a detecção não informa, como o código anterior fora da troca de código', async () => {
    const { supabase, updates } = cenario(
      [detectada({ analista: 'Outro Analista' })],
      [ativaNoBanco({ cod_resolucao_anterior: 'Banco=S' })]
    );

    await executarDeteccaoInconsistencias(supabase);

    expect(updates()[0].campos).not.toHaveProperty('cod_resolucao_anterior');
  });
});

describe('executarDeteccaoInconsistencias — validação do campo Solução', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persiste e contabiliza as inconsistências de validação do campo Solução devolvidas pela RPC', async () => {
    const validacao = detectada({
      origem: 'tickets',
      nro_chamado: 'IM 9500001',
      nro_tarefa: null,
      tipo_chamado: 'IM',
      tipo_inconsistencia: 'validacao_solucao',
      descricao_inconsistencia: 'Palavras faltando no campo Solução: CAUSA, PREVENÇÃO',
      chave_unica: 'tickets-IM 9500001-validacao_solucao',
    });

    const fake = criarSupabaseFake((tabela, chamadas: Chamada[]) => {
      if (tabela !== 'inconsistencias_chamados') return null;
      return { data: chamadas.some(([m]) => m === 'upsert') ? null : [], error: null };
    });
    const rpc = vi.fn().mockResolvedValue({
      data: {
        ic_999999: [],
        sem_atualizacao: [],
        mes_diferente: [],
        tempo_excessivo: [],
        troca_codigo_resolucao: [],
        validacao_solucao: [validacao],
        totais: { validacao_solucao: 1, total: 1 },
      },
      error: null,
    });

    const resultado = await executarDeteccaoInconsistencias({ ...fake.cliente, rpc } as any);

    expect(resultado.por_tipo.validacao_solucao).toBe(1);
    expect(resultado.novas).toBe(1);
    const upsert = fake.consultas
      .flatMap((c) => c.chamadas)
      .find(([m]) => m === 'upsert');
    expect(upsert![1][0]).toEqual([
      expect.objectContaining({ chave_unica: 'tickets-IM 9500001-validacao_solucao', status: 'ativa' }),
    ]);
  });
});
