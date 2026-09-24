import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { criarDeteccaoAjustesRetroativos } from '../deteccaoAjustesRetroativosService';
import { criarSupabaseFake, tem } from '../../__tests__/helpers/supabaseFake';

const EMPRESA = 'emp-1';

describe('deteccaoAjustesRetroativosService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 24, 10, 0, 0)); // 24/09/2026 local
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function cenario(opcoes: {
    tipoCobranca?: string;
    ajusteResolvido?: boolean;
    ajustePendenteId?: string;
    tickets?: string[];
  } = {}) {
    const fechamento = {
      id: 'fech-1',
      empresa_id: EMPRESA,
      mes: 8,
      ano: 2026,
      snapshot_consumo_horas: '10:00',
      snapshot_consumo_tickets: 3,
      apontamentos_ids: ['A1'],
      tickets_ids: ['T1', 'T2', 'T3'],
    };

    return criarSupabaseFake((tabela, chamadas) => {
      if (tabela === 'banco_horas_fechamentos') {
        if (tem(chamadas, 'maybeSingle')) return { data: fechamento, error: null };
        return { data: [{ empresa_id: EMPRESA, mes: 8, ano: 2026 }], error: null };
      }
      if (tabela === 'empresas_clientes') {
        return {
          data: {
            tipo_cobranca: opcoes.tipoCobranca || 'banco_horas',
            nome_completo: 'EMPRESA TESTE LTDA',
            nome_abreviado: 'TESTE',
            dia_inicio_apuracao: 1,
            dia_fim_apuracao: 0,
          },
          error: null,
        };
      }
      if (tabela === 'apontamentos_aranda') {
        if (chamadas.some(([m, a]) => m === 'in' && a[0] === 'id_externo')) {
          return { data: [{ id_externo: 'A2', tempo_gasto_minutos: 90 }], error: null };
        }
        return {
          data: [
            // no snapshot
            { id_externo: 'A1', data_atividade: '2026-08-10T12:00:00', data_sistema: '2026-09-02T12:00:00' },
            // extemporâneo novo
            { id_externo: 'A2', data_atividade: '2026-08-20T12:00:00', data_sistema: '2026-09-05T12:00:00' },
            // lançado no próprio mês: não é extemporâneo
            { id_externo: 'A3', data_atividade: '2026-08-21T12:00:00', data_sistema: '2026-08-22T12:00:00' },
          ],
          error: null,
        };
      }
      if (tabela === 'apontamentos_tickets_aranda') {
        return { data: (opcoes.tickets || ['T1', 'T2', 'T3']).map((n) => ({ nro_solicitacao: n })), error: null };
      }
      if (tabela === 'banco_horas_ajustes_retroativos') {
        if (tem(chamadas, 'in', 'status', ['aprovado', 'descartado'])) {
          return { data: opcoes.ajusteResolvido ? { id: 'aj-x', status: 'aprovado' } : null, error: null };
        }
        if (tem(chamadas, 'eq', 'status', 'pendente') && !chamadas.some(([m]) => m === 'update')) {
          return { data: opcoes.ajustePendenteId ? { id: opcoes.ajustePendenteId } : null, error: null };
        }
        return { data: { id: 'aj-novo' }, error: null };
      }
      return { data: null, error: null };
    });
  }

  it('busca fechamentos dos últimos N meses', async () => {
    const { cliente, consultas } = cenario();
    await criarDeteccaoAjustesRetroativos(cliente).executarDeteccaoRecente(2);

    const lista = consultas.find((c) => c.tabela === 'banco_horas_fechamentos' && tem(c.chamadas, 'or', 'and(mes.eq.9,ano.eq.2026),and(mes.eq.8,ano.eq.2026)'));
    expect(lista).toBeDefined();
  });

  it('cria ajuste pendente só com os extemporâneos fora do snapshot', async () => {
    const { cliente, consultas } = cenario();
    const ajustes = await criarDeteccaoAjustesRetroativos(cliente).executarDeteccaoRecente(2);

    expect(ajustes).toHaveLength(1);
    const insert = consultas
      .filter((c) => c.tabela === 'banco_horas_ajustes_retroativos')
      .flatMap((c) => c.chamadas)
      .find(([m]) => m === 'insert');
    expect(insert).toBeDefined();
    expect(insert![1][0]).toMatchObject({
      empresa_id: EMPRESA,
      fechamento_id: 'fech-1',
      mes_referencia: 8,
      ano_referencia: 2026,
      tipo_dado: 'apontamento_horas',
      valor_anterior: '10:00',
      valor_novo: '11:30',
      diferenca: '+01:30',
      diferenca_minutos: 90,
      status: 'pendente',
    });

    // Só o A2 teve os detalhes buscados
    const detalhes = consultas
      .filter((c) => c.tabela === 'apontamentos_aranda')
      .flatMap((c) => c.chamadas)
      .find(([m, a]) => m === 'in' && a[0] === 'id_externo');
    expect(detalhes![1][1]).toEqual(['A2']);
  });

  it('não recria ajuste já aprovado ou descartado', async () => {
    const { cliente, consultas } = cenario({ ajusteResolvido: true });
    const ajustes = await criarDeteccaoAjustesRetroativos(cliente).executarDeteccaoRecente(2);

    expect(ajustes).toHaveLength(0);
    const gravou = consultas.flatMap((c) => c.chamadas).some(([m]) => m === 'insert' || m === 'update');
    expect(gravou).toBe(false);
  });

  it('atualiza o ajuste pendente existente em vez de inserir outro', async () => {
    const { cliente, consultas } = cenario({ ajustePendenteId: 'aj-pend' });
    await criarDeteccaoAjustesRetroativos(cliente).executarDeteccaoRecente(2);

    const chamadas = consultas.filter((c) => c.tabela === 'banco_horas_ajustes_retroativos').flatMap((c) => c.chamadas);
    expect(chamadas.some(([m]) => m === 'insert')).toBe(false);
    expect(chamadas.some(([m, a]) => m === 'eq' && a[0] === 'id' && a[1] === 'aj-pend')).toBe(true);
  });

  it('detecta tickets só para empresa que cobra por ticket', async () => {
    const semTicket = cenario({ tickets: ['T1', 'T4'] });
    await criarDeteccaoAjustesRetroativos(semTicket.cliente).executarDeteccaoRecente(2);
    expect(semTicket.consultas.some((c) => c.tabela === 'apontamentos_tickets_aranda')).toBe(false);

    const comTicket = cenario({ tipoCobranca: 'ticket', tickets: ['T1', 'T4'] });
    await criarDeteccaoAjustesRetroativos(comTicket.cliente).executarDeteccaoRecente(2);
    const inserts = comTicket.consultas
      .filter((c) => c.tabela === 'banco_horas_ajustes_retroativos')
      .flatMap((c) => c.chamadas)
      .filter(([m]) => m === 'insert')
      .map(([, a]) => a[0]);
    const ajusteTickets = inserts.find((i) => i.tipo_dado === 'apontamento_tickets');
    // +T4, -T2, -T3 => -1
    expect(ajusteTickets).toMatchObject({ valor_anterior: '3', valor_novo: '2', diferenca: '-1', diferenca_minutos: -1 });
  });

  it('retorna lista vazia quando não há fechamentos', async () => {
    const { cliente } = criarSupabaseFake(() => ({ data: [], error: null }));
    expect(await criarDeteccaoAjustesRetroativos(cliente).executarDeteccaoRecente(2)).toEqual([]);
  });
});
