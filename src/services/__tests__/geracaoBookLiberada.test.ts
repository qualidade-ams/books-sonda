import { describe, expect, it, vi } from 'vitest';
import { criarSupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import { GeracaoBookLiberada } from '../geracaoBookLiberada';
import type { MesAno } from '@/services/bancosHoras/calculo';

const SET: MesAno = { mes: 9, ano: 2026 };

function cenario(v: { modelo?: string; transicao?: MesAno | null } = {}) {
  const transicao = v.transicao === undefined ? { mes: 7, ano: 2026 } : v.transicao;
  const fake = criarSupabaseEmMemoria({
    empresas: [{ id: 'e1', modelo_calculo: v.modelo ?? 'multiplo' }],
    bancos_horas: [
      { id: 'b1', empresa_id: 'e1' },
      { id: 'b2', empresa_id: 'e1' },
      { id: 'b9', empresa_id: 'e9' },
    ],
    bancos_horas_fechamentos: [
      ...(transicao
        ? [{ id: 'f-tr', banco_id: 'b1', ...transicao, motivo: 'transicao', vigente: true }]
        : []),
      { id: 'f-set-b1', banco_id: 'b1', mes: 9, ano: 2026, motivo: 'geracao_book', vigente: true },
      { id: 'f-set-b2', banco_id: 'b2', mes: 9, ano: 2026, motivo: 'retificacao', vigente: true },
      {
        id: 'f-set-b2-v1',
        banco_id: 'b2',
        mes: 9,
        ano: 2026,
        motivo: 'geracao_book',
        vigente: false,
      },
      { id: 'f-set-b9', banco_id: 'b9', mes: 9, ano: 2026, motivo: 'geracao_book', vigente: true },
    ],
  });
  const consumo = {
    montar: vi.fn(async () => [{ banco_id: 'b1' }]),
    gravar: vi.fn(async () => undefined),
  };
  const fechar = vi.fn(async () => ({ acao: 'criado' as const, fechamentos: [] }));
  const repo = { repositorio: true };
  const servico = new GeracaoBookLiberada(fake as any, consumo as any, () => repo as any, fechar);
  return { servico, consumo, fechar, repo };
}

describe('GeracaoBookLiberada.noModeloNovo', () => {
  it('empresa liberada, mês depois do fechamento de transição: modelo novo', async () => {
    expect(await cenario().servico.noModeloNovo('e1', SET)).toBe(true);
  });

  it('o mês da transição e os anteriores são do legado (o Book foi gerado por ele)', async () => {
    const { servico } = cenario();
    expect(await servico.noModeloNovo('e1', { mes: 7, ano: 2026 })).toBe(false);
    expect(await servico.noModeloNovo('e1', { mes: 6, ano: 2026 })).toBe(false);
  });

  it('empresa em Legado: legado', async () => {
    expect(await cenario({ modelo: 'legado' }).servico.noModeloNovo('e1', SET)).toBe(false);
  });

  it('liberada sem transição (sem mês fechado no legado): modelo novo em todos os meses', async () => {
    expect(
      await cenario({ transicao: null }).servico.noModeloNovo('e1', { mes: 1, ano: 2026 })
    ).toBe(true);
  });

  it('empresa que não existe no cadastro novo: legado', async () => {
    expect(await cenario().servico.noModeloNovo('e-x', SET)).toBe(false);
  });
});

describe('GeracaoBookLiberada.preparar', () => {
  it('primeira geração: fecha o mês (geracao_book) e monta o snapshot com as versões vigentes', async () => {
    const { servico, fechar, consumo, repo } = cenario();
    const linhas = await servico.preparar('e1', SET, false);

    expect(fechar).toHaveBeenCalledWith(repo, 'e1', SET, 'geracao_book');
    expect(consumo.montar).toHaveBeenCalledWith('e1', SET, { b1: 'f-set-b1', b2: 'f-set-b2' });
    expect(linhas).toEqual([{ banco_id: 'b1' }]);
  });

  it('retificação do Book: grava nova versão do fechamento (D-11)', async () => {
    const { servico, fechar, repo } = cenario();
    await servico.preparar('e1', SET, true);
    expect(fechar).toHaveBeenCalledWith(repo, 'e1', SET, 'retificacao');
  });
});

describe('GeracaoBookLiberada.gravar', () => {
  it('grava o snapshot do Book', async () => {
    const { servico, consumo } = cenario();
    await servico.gravar('book1', [{ banco_id: 'b1' }] as any);
    expect(consumo.gravar).toHaveBeenCalledWith('book1', [{ banco_id: 'b1' }]);
  });
});
