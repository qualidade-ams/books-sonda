import { describe, it, expect } from 'vitest';
import { criarSupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import { RegrasContagemService } from '../regrasContagemService';

function cenario(rpcs: Record<string, (args: any) => any> = {}) {
  return criarSupabaseEmMemoria(
    {
      regras_contagem: [
        {
          id: 1,
          grupos_que_contam: ['AMS APL', 'AMS T&M'],
          tipos_chamado: ['IM', 'RF', 'PM'],
          ignorar_atividade_interna: true,
          itens_excluidos: ['000000 - PROJETOS APL'],
          so_tickets_fechados: true,
          updated_at: '2026-10-22T12:00:00Z',
          updated_by: 'u1',
        },
      ],
    },
    {
      codigos_resolucao_uso: () => [
        {
          codigo: 'Treinamento (Banco=N |SLA=N)',
          apontamentos: 34,
          tickets: 6,
          primeira_ocorrencia: '2026-05-03',
          tem_regra: false,
          conta_horas: null,
          conta_tickets: null,
        },
        {
          codigo: 'Alocação',
          apontamentos: 807,
          tickets: 103,
          primeira_ocorrencia: '2026-05-01',
          tem_regra: true,
          conta_horas: true,
          conta_tickets: true,
        },
        {
          codigo: 'Sem uso',
          apontamentos: 0,
          tickets: 0,
          primeira_ocorrencia: null,
          tem_regra: true,
          conta_horas: false,
          conta_tickets: true,
        },
      ],
      salvar_regras_contagem: () => null,
      ...rpcs,
    }
  );
}

describe('RegrasContagemService.carregar', () => {
  it('devolve os filtros, os códigos com regra e os sem regra', async () => {
    const fake = cenario();
    const r = await new RegrasContagemService(fake as any).carregar();
    expect(r.filtros).toEqual({
      gruposQueContam: ['AMS APL', 'AMS T&M'],
      tiposChamado: ['IM', 'RF', 'PM'],
      ignorarAtividadeInterna: true,
      itensExcluidos: ['000000 - PROJETOS APL'],
      soTicketsFechados: true,
    });
    expect(r.atualizadoEm).toBe('2026-10-22T12:00:00Z');
    expect(r.atualizadoPor).toBe('u1');
    expect(r.codigos).toEqual([
      {
        codigo: 'Alocação',
        contaHoras: true,
        contaTickets: true,
        apontamentos6m: 807,
        tickets6m: 103,
      },
      { codigo: 'Sem uso', contaHoras: false, contaTickets: true, apontamentos6m: 0, tickets6m: 0 },
    ]);
    expect(r.codigosSemRegra).toEqual([
      {
        codigo: 'Treinamento (Banco=N |SLA=N)',
        apontamentos6m: 34,
        tickets6m: 6,
        primeiraOcorrencia: '2026-05-03',
      },
    ]);
    expect(fake.chamadasRpc).toContainEqual({
      nome: 'codigos_resolucao_uso',
      args: { p_meses: 6 },
    });
  });

  it('falha com mensagem descritiva', async () => {
    const fake = cenario();
    fake.rpc = async () => ({
      data: null,
      error: { message: 'Sem permissão para consultar as regras de contagem.' },
    });
    await expect(new RegrasContagemService(fake as any).carregar()).rejects.toThrow(
      'Falha ao carregar as regras de contagem: Sem permissão para consultar as regras de contagem.'
    );
  });
});

describe('RegrasContagemService.salvar', () => {
  it('manda o motivo, os filtros e a lista completa de códigos numa chamada só', async () => {
    const fake = cenario();
    await new RegrasContagemService(fake as any).salvar({
      motivo: ' Ajuste do setor ',
      filtros: {
        gruposQueContam: ['AMS APL'],
        tiposChamado: ['IM'],
        ignorarAtividadeInterna: false,
        itensExcluidos: [],
        soTicketsFechados: true,
      },
      codigos: [{ codigo: 'Alocação', contaHoras: true, contaTickets: false }],
    });
    expect(fake.chamadasRpc.at(-1)).toEqual({
      nome: 'salvar_regras_contagem',
      args: {
        p_motivo: 'Ajuste do setor',
        p_regras: {
          grupos_que_contam: ['AMS APL'],
          tipos_chamado: ['IM'],
          ignorar_atividade_interna: false,
          itens_excluidos: [],
          so_tickets_fechados: true,
        },
        p_codigos: [{ codigo: 'Alocação', conta_horas: true, conta_tickets: false }],
      },
    });
  });

  it('o que não mudou vai nulo', async () => {
    const fake = cenario();
    await new RegrasContagemService(fake as any).salvar({
      motivo: 'Só códigos',
      codigos: [{ codigo: 'Alocação', contaHoras: true, contaTickets: true }],
    });
    expect(fake.chamadasRpc.at(-1)!.args).toMatchObject({ p_regras: null });
  });

  it('recusa motivo vazio antes de gravar', async () => {
    const fake = cenario();
    await expect(
      new RegrasContagemService(fake as any).salvar({ motivo: '  ', codigos: [] })
    ).rejects.toThrow('Informe o motivo da alteração.');
    expect(fake.chamadasRpc).toHaveLength(0);
  });

  it('repassa a mensagem do banco', async () => {
    const fake = cenario();
    fake.rpc = async () => ({
      data: null,
      error: { message: 'O motivo passa de 500 caracteres.' },
    });
    await expect(
      new RegrasContagemService(fake as any).salvar({ motivo: 'x', codigos: [] })
    ).rejects.toThrow('Falha ao salvar as regras de contagem: O motivo passa de 500 caracteres.');
  });
});
