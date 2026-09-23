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
