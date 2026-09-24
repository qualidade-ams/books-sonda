import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { InconsistenciaChamado } from '@/types/inconsistenciasChamados';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { inconsistenciasChamadosService } from '../inconsistenciasChamadosService';

function criarInconsistencia(overrides: Partial<InconsistenciaChamado> = {}): InconsistenciaChamado {
  return {
    id: 'inc-1',
    origem: 'tickets',
    nro_chamado: 'RF 123',
    nro_tarefa: null,
    data_abertura: '2026-09-01T10:00:00Z',
    data_atividade: '2026-09-01T10:00:00Z',
    data_sistema: null,
    tempo_gasto_horas: null,
    tempo_gasto_minutos: null,
    empresa: 'EMPA',
    analista: 'Analista Teste',
    tipo_chamado: 'RF',
    item_configuracao: null,
    cod_resolucao: null,
    tipo_inconsistencia: 'sem_atualizacao',
    descricao_inconsistencia: 'Descrição',
    ...overrides,
  };
}

describe('inconsistenciasChamadosService.buscarEnviosPorInconsistencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna objeto vazio sem consultar o banco quando não há ids', async () => {
    const resultado = await inconsistenciasChamadosService.buscarEnviosPorInconsistencia([]);

    expect(resultado).toEqual({});
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('agrupa os envios por inconsistência, do mais recente para o mais antigo', async () => {
    const inMock = vi.fn().mockResolvedValue({
      data: [
        { inconsistencia_id: 'inc-1', email_analista: 'a@x.com', email_cc: null, data_envio: '2026-09-10T12:00:00Z' },
        { inconsistencia_id: 'inc-2', email_analista: 'b@x.com', email_cc: 'c@x.com', data_envio: '2026-09-11T12:00:00Z' },
        { inconsistencia_id: 'inc-1', email_analista: 'a@x.com, d@x.com', email_cc: null, data_envio: '2026-09-15T12:00:00Z' },
      ],
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ in: inMock });
    (supabase.from as any).mockReturnValue({ select: selectMock });

    const resultado = await inconsistenciasChamadosService.buscarEnviosPorInconsistencia(['inc-1', 'inc-2']);

    expect(supabase.from).toHaveBeenCalledWith('historico_inconsistencias_chamados');
    expect(inMock).toHaveBeenCalledWith('inconsistencia_id', ['inc-1', 'inc-2']);
    expect(resultado['inc-1']).toEqual([
      { email_para: 'a@x.com, d@x.com', email_cc: null, data_envio: '2026-09-15T12:00:00Z' },
      { email_para: 'a@x.com', email_cc: null, data_envio: '2026-09-10T12:00:00Z' },
    ]);
    expect(resultado['inc-2']).toEqual([
      { email_para: 'b@x.com', email_cc: 'c@x.com', data_envio: '2026-09-11T12:00:00Z' },
    ]);
  });

  it('propaga o erro do banco', async () => {
    const inMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'falhou' } });
    (supabase.from as any).mockReturnValue({ select: vi.fn().mockReturnValue({ in: inMock }) });

    await expect(
      inconsistenciasChamadosService.buscarEnviosPorInconsistencia(['inc-1'])
    ).rejects.toEqual({ message: 'falhou' });
  });
});

describe('inconsistenciasChamadosService.enviarNotificacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function prepararMocks() {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'user-1', email: 'user@x.com' } } });
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    (supabase.from as any).mockImplementation((tabela: string) => {
      if (tabela === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { full_name: 'Usuário' } }),
            }),
          }),
        };
      }
      return { insert: insertMock };
    });
    return insertMock;
  }

  it('grava o id da inconsistência, todos os destinatários e o CC', async () => {
    const insertMock = prepararMocks();

    await inconsistenciasChamadosService.enviarNotificacao({
      inconsistencias: [criarInconsistencia({ id: 'inc-1' }), criarInconsistencia({ id: 'inc-2', nro_chamado: 'RF 456' })],
      mes_referencia: 9,
      ano_referencia: 2026,
      email_analista: 'a@x.com, b@x.com',
      email_cc: 'c@x.com',
    });

    expect(insertMock).toHaveBeenCalledTimes(1);
    const registros = insertMock.mock.calls[0][0];
    expect(registros).toHaveLength(2);
    expect(registros[0]).toMatchObject({
      inconsistencia_id: 'inc-1',
      email_analista: 'a@x.com, b@x.com',
      email_cc: 'c@x.com',
      mes_referencia: 9,
      ano_referencia: 2026,
      data_sistema: null,
    });
    expect(registros[1].inconsistencia_id).toBe('inc-2');
  });

  it('usa o mês atual como mes_referencia quando não informado', async () => {
    const insertMock = prepararMocks();

    await inconsistenciasChamadosService.enviarNotificacao({
      inconsistencias: [criarInconsistencia()],
      ano_referencia: 2026,
      email_analista: 'a@x.com',
    });

    const registros = insertMock.mock.calls[0][0];
    expect(registros[0].mes_referencia).toBe(new Date().getMonth() + 1);
    expect(registros[0].email_cc).toBeNull();
  });

  it('lança erro quando a gravação falha', async () => {
    const insertMock = prepararMocks();
    insertMock.mockResolvedValue({ error: { message: 'violou constraint' } });

    await expect(
      inconsistenciasChamadosService.enviarNotificacao({
        inconsistencias: [criarInconsistencia()],
        ano_referencia: 2026,
        email_analista: 'a@x.com',
      })
    ).rejects.toEqual({ message: 'violou constraint' });
  });
});

describe('inconsistenciasChamadosService.buscarEstatisticas', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('conta a troca de código de resolução por tipo e por origem', async () => {
    vi.spyOn(inconsistenciasChamadosService, 'buscarInconsistencias').mockResolvedValue([
      criarInconsistencia({ id: '1', tipo_inconsistencia: 'troca_codigo_resolucao' }),
      criarInconsistencia({ id: '2', tipo_inconsistencia: 'troca_codigo_resolucao' }),
      criarInconsistencia({ id: '3', tipo_inconsistencia: 'sem_atualizacao' }),
    ]);

    const estatisticas = await inconsistenciasChamadosService.buscarEstatisticas();

    expect(estatisticas.total).toBe(3);
    expect(estatisticas.por_tipo.troca_codigo_resolucao).toBe(2);
    expect(estatisticas.por_tipo.sem_atualizacao).toBe(1);
    expect(estatisticas.por_origem.tickets).toBe(3);
  });
});

describe('inconsistenciasChamadosService.buscarTarefasAntesDaTroca', () => {
  function mockConsulta(resultado: { data: any; error: any }) {
    const orderMock = vi.fn().mockResolvedValue(resultado);
    const ltMock = vi.fn().mockReturnValue({ order: orderMock });
    const eqMock = vi.fn().mockReturnValue({ lt: ltMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as any).mockReturnValue({ select: selectMock });
    return { selectMock, eqMock, ltMock, orderMock };
  }

  const troca = criarInconsistencia({
    tipo_inconsistencia: 'troca_codigo_resolucao',
    nro_chamado: 'RF 9420236',
    data_atividade: '2026-10-02T14:30:00Z',
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('busca as tarefas do chamado (sem prefixo) lançadas antes da troca, em ordem de data_sistema', async () => {
    const { eqMock, ltMock, orderMock } = mockConsulta({ data: [], error: null });

    await inconsistenciasChamadosService.buscarTarefasAntesDaTroca(troca);

    expect(supabase.from).toHaveBeenCalledWith('apontamentos_aranda');
    expect(eqMock).toHaveBeenCalledWith('nro_chamado', '9420236');
    expect(ltMock).toHaveBeenCalledWith('data_sistema', '2026-10-02T14:30:00Z');
    expect(orderMock).toHaveBeenCalledWith('data_sistema', { ascending: true });
  });

  it('retorna cada tarefa com tempo em HH:MM e o total somado', async () => {
    mockConsulta({
      data: [
        { nro_tarefa: '111', data_sistema: '2026-09-10T12:00:00Z', analista_tarefa: 'Ana', tempo_gasto_minutos: 90 },
        { nro_tarefa: '222', data_sistema: '2026-09-15T12:00:00Z', analista_tarefa: 'Bia', tempo_gasto_minutos: 6000 },
        { nro_tarefa: '333', data_sistema: '2026-09-20T12:00:00Z', analista_tarefa: null, tempo_gasto_minutos: null },
      ],
      error: null,
    });

    const resultado = await inconsistenciasChamadosService.buscarTarefasAntesDaTroca(troca);

    expect(resultado.tarefas).toEqual([
      { nro_tarefa: '111', data_sistema: '2026-09-10T12:00:00Z', analista: 'Ana', tempo_gasto_minutos: 90, tempo_gasto_horas: '01:30' },
      { nro_tarefa: '222', data_sistema: '2026-09-15T12:00:00Z', analista: 'Bia', tempo_gasto_minutos: 6000, tempo_gasto_horas: '100:00' },
      { nro_tarefa: '333', data_sistema: '2026-09-20T12:00:00Z', analista: null, tempo_gasto_minutos: 0, tempo_gasto_horas: '00:00' },
    ]);
    expect(resultado.total_minutos).toBe(6090);
    expect(resultado.total_horas).toBe('101:30');
  });

  it('não consulta o banco quando a inconsistência não tem data da troca', async () => {
    const resultado = await inconsistenciasChamadosService.buscarTarefasAntesDaTroca({ ...troca, data_atividade: null });

    expect(supabase.from).not.toHaveBeenCalled();
    expect(resultado).toEqual({ tarefas: [], total_minutos: 0, total_horas: '00:00' });
  });

  it('propaga o erro do banco', async () => {
    mockConsulta({ data: null, error: { message: 'falhou' } });

    await expect(inconsistenciasChamadosService.buscarTarefasAntesDaTroca(troca)).rejects.toEqual({ message: 'falhou' });
  });
});

describe('inconsistenciasChamadosService - filtro por tipos da tela', () => {
  // Builder encadeável: todo método devolve o próprio builder; range/await resolvem vazio
  function mockBuilder() {
    const builder: any = {};
    for (const metodo of ['select', 'eq', 'neq', 'in', 'or', 'order', 'ilike']) {
      builder[metodo] = vi.fn().mockReturnValue(builder);
    }
    builder.range = vi.fn().mockResolvedValue({ data: [], error: null });
    builder.then = (resolve: any) => resolve({ data: [], error: null });
    (supabase.from as any).mockReturnValue(builder);
    return builder;
  }

  beforeEach(() => {
    // restaura o spy de buscarInconsistencias criado em buscarEstatisticas
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('buscarInconsistencias restringe aos tipos informados', async () => {
    const builder = mockBuilder();

    await inconsistenciasChamadosService.buscarInconsistencias({ tipos: ['troca_codigo_resolucao'] });

    expect(builder.in).toHaveBeenCalledWith('tipo_inconsistencia', ['troca_codigo_resolucao']);
  });

  it('buscarResolvidas restringe aos tipos informados', async () => {
    const builder = mockBuilder();

    await inconsistenciasChamadosService.buscarResolvidas({ tipos: ['mes_diferente', 'ic_999999'] });

    expect(builder.in).toHaveBeenCalledWith('tipo_inconsistencia', ['mes_diferente', 'ic_999999']);
  });

  it('não restringe tipos quando a lista não é informada', async () => {
    const builder = mockBuilder();

    await inconsistenciasChamadosService.buscarInconsistencias({});

    expect(builder.in).not.toHaveBeenCalledWith('tipo_inconsistencia', expect.anything());
  });
});
