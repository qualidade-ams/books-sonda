import { describe, expect, it } from 'vitest';
import { criarSupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import { criarRepositorioRetroativos } from '../repositorioRetroativos';

const AGO = { mes: 8, ano: 2026 };
const SET = { mes: 9, ano: 2026 };

function cenario() {
  return criarSupabaseEmMemoria(
    {
      empresas: [
        { id: 'e1', modelo_calculo: 'multiplo', status: 'ativo' },
        { id: 'e2', modelo_calculo: 'legado', status: 'ativo' },
        { id: 'e3', modelo_calculo: 'multiplo', status: 'inativo' },
      ],
      bancos_horas_fechamentos: [
        { id: 'f-ago', banco_id: 'b1', mes: 8, ano: 2026, motivo: 'geracao_book', vigente: true },
        {
          id: 'f-ago-v1',
          banco_id: 'b1',
          mes: 8,
          ano: 2026,
          motivo: 'geracao_book',
          vigente: false,
        },
        { id: 'f-jul', banco_id: 'b1', mes: 7, ano: 2026, motivo: 'transicao', vigente: true },
        {
          id: 'f-set-b9',
          banco_id: 'b9',
          mes: 9,
          ano: 2026,
          motivo: 'geracao_book',
          vigente: true,
        },
      ],
      bancos_horas_fechamento_itens: [
        { fechamento_id: 'f-ago', tipo: 'apontamento', item_id: 'a1', minutos: 60, tickets: 0 },
        { fechamento_id: 'f-ago', tipo: 'ticket', item_id: 't1', minutos: 0, tickets: 1 },
        { fechamento_id: 'f-ago', tipo: 'requerimento', item_id: 'r1', minutos: 120, tickets: 0 },
      ],
    },
    { bancos_horas_registrar_retroativo: () => 'retro-1' }
  );
}

describe('criarRepositorioRetroativos', () => {
  it('empresas liberadas e ativas', async () => {
    expect(await criarRepositorioRetroativos(cenario()).empresasLiberadas()).toEqual(['e1']);
  });

  it('fechamentos vigentes dos bancos nos meses pedidos', async () => {
    const r = await criarRepositorioRetroativos(cenario()).fechamentosVigentes(['b1'], [AGO, SET]);
    expect(r).toEqual([{ id: 'f-ago', bancoId: 'b1', mes: AGO, motivo: 'geracao_book' }]);
  });

  it('itens do fechamento: só apontamentos e tickets', async () => {
    expect(await criarRepositorioRetroativos(cenario()).itensDoFechamento(['f-ago'])).toEqual([
      { fechamentoId: 'f-ago', tipo: 'apontamento', itemId: 'a1', minutos: 60, tickets: 0 },
      { fechamentoId: 'f-ago', tipo: 'ticket', itemId: 't1', minutos: 0, tickets: 1 },
    ]);
  });

  it('registra pela função do banco (só a service role grava)', async () => {
    const supabase = cenario();
    const payload = {
      banco_id: 'b1',
      ano: 2026,
      mes: 8,
      fechamento_id: 'f-ago',
      consumo_antes_minutos: 60,
      consumo_depois_minutos: 90,
      consumo_antes_tickets: 1,
      consumo_depois_tickets: 1,
      itens: [{ tipo: 'apontamento' as const, item_id: 'a1', minutos: 30, tickets: 0 }],
    };
    await criarRepositorioRetroativos(supabase).registrar(payload);
    expect(supabase.chamadasRpc).toEqual([
      { nome: 'bancos_horas_registrar_retroativo', args: { p_retroativo: payload } },
    ]);
  });

  it('sem ids, não consulta', async () => {
    const repo = criarRepositorioRetroativos(cenario());
    expect(await repo.fechamentosVigentes([], [AGO])).toEqual([]);
    expect(await repo.itensDoFechamento([])).toEqual([]);
  });
});
