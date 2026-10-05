import { describe, it, expect, vi, beforeEach } from 'vitest';
import { envioSaldoParcialService } from '../envioSaldoParcialService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
      getSession: vi.fn(async () => ({ data: { session: { access_token: 'token' } } }))
    }
  }
}));

type Chamada = [string, unknown[]];

interface Consulta {
  tabela: string;
  chamadas: Chamada[];
}

/** Fake encadeável: cada from() registra as chamadas e resolve com responder(tabela, chamadas) */
function configurarSupabase(responder: (tabela: string, chamadas: Chamada[]) => { data: unknown; error: unknown }) {
  const consultas: Consulta[] = [];
  (supabase.from as any).mockImplementation((tabela: string) => {
    const chamadas: Chamada[] = [];
    consultas.push({ tabela, chamadas });
    const q: any = new Proxy({}, {
      get(_a, prop) {
        if (prop === 'then') return (res: any, rej: any) => Promise.resolve(responder(tabela, chamadas)).then(res, rej);
        return (...args: unknown[]) => {
          chamadas.push([String(prop), args]);
          return q;
        };
      }
    });
    return q;
  });
  return consultas;
}

const de = (consultas: Consulta[], tabela: string, metodo: string) =>
  consultas.filter(c => c.tabela === tabela).flatMap(c => c.chamadas).filter(([m]) => m === metodo).map(([, a]) => a);

const regra = {
  frequencia: 'mensal' as const,
  dias_semana: [],
  dias_mes: [15],
  ultimo_dia_mes: false,
  modo_horario: 'horarios' as const,
  horarios: ['07:00'],
  intervalo_horas: null,
  hora_inicio: null,
  hora_fim: null
};

describe('envioSaldoParcialService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista agendamentos com os clientes vinculados', async () => {
    const consultas = configurarSupabase(() => ({ data: [{ id: 'ag-1', empresas: [{ empresa_id: 'e1' }] }], error: null }));

    const lista = await envioSaldoParcialService.listarAgendamentos();

    expect(lista[0].empresas).toEqual([{ empresa_id: 'e1' }]);
    expect(String(de(consultas, 'banco_horas_envio_agendamentos', 'select')[0][0])).toContain('banco_horas_envio_agendamento_empresas');
  });

  it('cria o agendamento e vincula os clientes', async () => {
    const consultas = configurarSupabase((tabela) =>
      tabela === 'banco_horas_envio_agendamentos' ? { data: { id: 'ag-novo' }, error: null } : { data: null, error: null }
    );

    await envioSaldoParcialService.criarAgendamento({
      nome: 'Quinzenal', ativo: true, emails_cc: ['cc@sonda.com'], empresaIds: ['e1', 'e2'], ...regra
    });

    const insercao = de(consultas, 'banco_horas_envio_agendamentos', 'insert')[0][0] as Record<string, unknown>;
    expect(insercao).toMatchObject({ nome: 'Quinzenal', emails_cc: ['cc@sonda.com'], created_by: 'user-1', dias_mes: [15] });
    expect(insercao).not.toHaveProperty('empresaIds');
    expect(de(consultas, 'banco_horas_envio_agendamento_empresas', 'insert')[0][0]).toEqual([
      { agendamento_id: 'ag-novo', empresa_id: 'e1' },
      { agendamento_id: 'ag-novo', empresa_id: 'e2' }
    ]);
  });

  it('desfaz o agendamento e explica quando o cliente já está em outro agendamento', async () => {
    const consultas = configurarSupabase((tabela, chamadas) => {
      if (tabela === 'banco_horas_envio_agendamentos' && chamadas.some(([m]) => m === 'insert')) return { data: { id: 'ag-novo' }, error: null };
      if (tabela === 'banco_horas_envio_agendamento_empresas') return { data: null, error: { code: '23505', message: 'duplicate key' } };
      return { data: null, error: null };
    });

    await expect(
      envioSaldoParcialService.criarAgendamento({ nome: 'X', ativo: true, emails_cc: [], empresaIds: ['e1'], ...regra })
    ).rejects.toThrow(/já está em outro agendamento/);
    expect(de(consultas, 'banco_horas_envio_agendamentos', 'delete')).toHaveLength(1);
  });

  it('na edição remove só os clientes desmarcados e vincula só os novos', async () => {
    const consultas = configurarSupabase((tabela, chamadas) => {
      if (tabela === 'banco_horas_envio_agendamento_empresas' && chamadas.some(([m]) => m === 'select')) {
        return { data: [{ empresa_id: 'e1' }, { empresa_id: 'e2' }], error: null };
      }
      return { data: { id: 'ag-1' }, error: null };
    });

    await envioSaldoParcialService.atualizarAgendamento('ag-1', {
      nome: 'X', ativo: true, emails_cc: [], empresaIds: ['e2', 'e3'], ...regra
    });

    const remocao = consultas.find(c => c.tabela === 'banco_horas_envio_agendamento_empresas' && c.chamadas.some(([m]) => m === 'delete'))!;
    expect(remocao.chamadas).toContainEqual(['in', ['empresa_id', ['e1']]]);
    expect(de(consultas, 'banco_horas_envio_agendamento_empresas', 'insert')[0][0]).toEqual([{ agendamento_id: 'ag-1', empresa_id: 'e3' }]);
  });

  it('lista o histórico com o nome do agendamento e do cliente, mais recentes primeiro', async () => {
    const consultas = configurarSupabase(() => ({ data: [], error: null }));

    await envioSaldoParcialService.listarExecucoes(20);

    const select = String(de(consultas, 'banco_horas_envio_execucoes', 'select')[0][0]);
    expect(select).toContain('banco_horas_envio_agendamentos(nome)');
    expect(select).toContain('empresas_clientes(nome_abreviado)');
    expect(de(consultas, 'banco_horas_envio_execucoes', 'order')[0]).toEqual(['iniciado_em', { ascending: false }]);
    expect(de(consultas, 'banco_horas_envio_execucoes', 'limit')[0]).toEqual([20]);
  });

  it('lista os clientes elegíveis (ativos com AMS) com a quantidade de contatos de Saldo Parcial', async () => {
    configurarSupabase((tabela) => {
      if (tabela === 'empresas_clientes') {
        return { data: [{ id: 'e1', nome_abreviado: 'A' }, { id: 'e2', nome_abreviado: 'B' }], error: null };
      }
      return { data: [{ empresa_id: 'e1' }, { empresa_id: 'e1' }], error: null };
    });

    const clientes = await envioSaldoParcialService.listarClientesElegiveis();

    expect(clientes).toEqual([
      { id: 'e1', nome: 'A', qtdContatosSaldoParcial: 2 },
      { id: 'e2', nome: 'B', qtdContatosSaldoParcial: 0 }
    ]);
  });

  it('propaga erro do Supabase', async () => {
    configurarSupabase(() => ({ data: null, error: { message: 'falhou' } }));

    await expect(envioSaldoParcialService.listarAgendamentos()).rejects.toBeTruthy();
  });

  it('executar agora chama o sync-api com o agendamento', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 202, json: async () => ({ iniciado: true }) }) as any;

    await envioSaldoParcialService.executarAgora('ag-1');

    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toMatch(/\/api\/saldo-parcial\/executar$/);
    expect(JSON.parse(init.body)).toEqual({ agendamentoId: 'ag-1' });
    expect(init.headers.Authorization).toBe('Bearer token');
  });
});
