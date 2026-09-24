import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { criarAgendador } from '../agendador';
import { criarSupabaseFake, chamadasDe, tem } from '../../__tests__/helpers/supabaseFake';

// 24/09/2026 08:00 em São Paulo
const AGORA = new Date('2026-09-24T11:00:00Z');

const agendamento = (extra: any = {}) => ({
  id: 'ag-1',
  nome: 'Diário 07h e 12h',
  ativo: true,
  tabelas: { pesquisas: true },
  frequencia: 'diario',
  dias_semana: [],
  dias_mes: [],
  ultimo_dia_mes: false,
  modo_horario: 'horarios',
  horarios: ['07:00', '12:00'],
  intervalo_horas: null,
  hora_inicio: null,
  hora_fim: null,
  proxima_execucao: null,
  ...extra,
});

describe('agendador', () => {
  let orquestrador: { iniciar: ReturnType<typeof vi.fn>; emExecucao: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    orquestrador = {
      iniciar: vi.fn(async () => ({ status: 'iniciada', execucaoId: 'exec-1', conclusao: Promise.resolve('sucesso') })),
      emExecucao: vi.fn(() => false),
    };
  });

  afterEach(() => vi.restoreAllMocks());

  function criar(linhas: any[]) {
    const fake = criarSupabaseFake((tabela, chamadas) => {
      if (tabela === 'sync_agendamentos' && chamadas.some(([m]) => m === 'select')) {
        return { data: linhas, error: null };
      }
      return { data: null, error: null };
    });
    const agendador = criarAgendador({ supabase: fake.cliente, orquestrador: orquestrador as any, agora: () => AGORA });
    return { fake, agendador };
  }

  const updatesDe = (fake: ReturnType<typeof criarSupabaseFake>) =>
    fake.consultas
      .filter((c) => c.tabela === 'sync_agendamentos' && c.chamadas.some(([m]) => m === 'update'))
      .map((c) => ({
        dados: c.chamadas.find(([m]) => m === 'update')![1][0],
        id: c.chamadas.find(([m, a]) => m === 'eq' && a[0] === 'id')?.[1][1],
      }));

  it('só lê agendamentos ativos', async () => {
    const { fake, agendador } = criar([]);
    await agendador.ciclo();
    const select = fake.consultas.find((c) => c.tabela === 'sync_agendamentos');
    expect(tem(select!.chamadas, 'eq', 'ativo', true)).toBe(true);
  });

  it('calcula proxima_execucao quando está vazia, sem disparar', async () => {
    const { fake, agendador } = criar([agendamento()]);
    await agendador.ciclo();

    expect(orquestrador.iniciar).not.toHaveBeenCalled();
    expect(updatesDe(fake)).toEqual([
      { id: 'ag-1', dados: { proxima_execucao: '2026-09-24T15:00:00.000Z' } }, // 12:00 SP
    ]);
  });

  it('dispara agendamento vencido e já agenda o próximo', async () => {
    const { fake, agendador } = criar([agendamento({ proxima_execucao: '2026-09-24T10:00:00Z' })]);
    await agendador.ciclo();

    expect(orquestrador.iniciar).toHaveBeenCalledWith({
      tabelas: { pesquisas: true },
      origem: 'agendado',
      agendamentoId: 'ag-1',
    });

    const updates = updatesDe(fake).map((u) => u.dados);
    expect(updates[0]).toMatchObject({
      proxima_execucao: '2026-09-24T15:00:00.000Z',
      ultima_execucao: AGORA.toISOString(),
      ultimo_status: 'executando',
    });
    await vi.waitFor(() => expect(updatesDe(fake).map((u) => u.dados)).toContainEqual({ ultimo_status: 'sucesso' }));
  });

  it('execução perdida (serviço desligado) roda só uma vez e recalcula a partir de agora', async () => {
    // venceu há 3 dias
    const { fake, agendador } = criar([agendamento({ proxima_execucao: '2026-09-21T10:00:00Z' })]);
    await agendador.ciclo();

    expect(orquestrador.iniciar).toHaveBeenCalledTimes(1);
    expect(updatesDe(fake)[0].dados.proxima_execucao).toBe('2026-09-24T15:00:00.000Z');
  });

  it('não dispara agendamento que ainda não venceu', async () => {
    const { fake, agendador } = criar([agendamento({ proxima_execucao: '2026-09-24T15:00:00Z' })]);
    await agendador.ciclo();
    expect(orquestrador.iniciar).not.toHaveBeenCalled();
    expect(updatesDe(fake)).toEqual([]);
  });

  it('com sincronização em andamento, adia o vencido para o próximo ciclo', async () => {
    orquestrador.emExecucao.mockReturnValue(true);
    const { fake, agendador } = criar([agendamento({ proxima_execucao: '2026-09-24T10:00:00Z' })]);
    await agendador.ciclo();

    expect(orquestrador.iniciar).not.toHaveBeenCalled();
    expect(updatesDe(fake)).toEqual([]);
  });

  it('dispara só um por ciclo quando vários vencem juntos (o mais antigo primeiro)', async () => {
    const { agendador } = criar([
      agendamento({ id: 'ag-2', proxima_execucao: '2026-09-24T10:30:00Z' }),
      agendamento({ id: 'ag-1', proxima_execucao: '2026-09-24T10:00:00Z' }),
    ]);
    await agendador.ciclo();

    expect(orquestrador.iniciar).toHaveBeenCalledTimes(1);
    expect(orquestrador.iniciar.mock.calls[0][0].agendamentoId).toBe('ag-1');
  });

  it('registra ignorada quando o orquestrador recusa', async () => {
    orquestrador.iniciar.mockResolvedValue({ status: 'ignorada', execucaoId: 'x' });
    const { fake, agendador } = criar([agendamento({ proxima_execucao: '2026-09-24T10:00:00Z' })]);
    await agendador.ciclo();
    expect(updatesDe(fake).map((u) => u.dados)).toContainEqual({ ultimo_status: 'ignorada' });
  });

  it('ignora regra inválida sem quebrar o ciclo', async () => {
    const { fake, agendador } = criar([
      agendamento({ id: 'ruim', frequencia: 'semanal', dias_semana: [] }),
      agendamento({ id: 'ag-1' }),
    ]);
    await agendador.ciclo();
    expect(updatesDe(fake).map((u) => u.id)).toEqual(['ag-1']);
  });

  it('marca como interrompidas as execuções que ficaram executando', async () => {
    const { fake, agendador } = criar([]);
    await agendador.recuperarInterrompidas();

    const [dados] = chamadasDe(fake.consultas, 'sync_execucoes', 'update')[0];
    expect(dados.status).toBe('interrompida');
    const consulta = fake.consultas.find((c) => c.tabela === 'sync_execucoes');
    expect(tem(consulta!.chamadas, 'eq', 'status', 'executando')).toBe(true);
  });
});
