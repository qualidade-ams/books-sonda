import { describe, expect, it } from 'vitest';
import { criarSupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import { criarRepositorioSombra } from '../repositorioSombra';

const JAN = { mes: 1, ano: 2026 };

function cenario() {
  return criarSupabaseEmMemoria(
    {
      empresas: [
        { id: 'e1', nome_completo: 'EMPRESA ALFA LTDA', modelo_calculo: 'legado', status: 'ativo' },
        { id: 'e2', nome_completo: 'EMPRESA BETA SA', modelo_calculo: 'multiplo', status: 'ativo' },
        { id: 'e3', nome_completo: 'EMPRESA GAMA', modelo_calculo: 'legado', status: 'inativo' },
      ],
      banco_horas_fechamentos: [
        {
          empresa_id: 'e1',
          mes: 12,
          ano: 2025,
          fechado_em: '2026-01-05T12:00:00+00:00',
          snapshot_calculo: { consumo_horas: '10:00:00' },
          apontamentos_ids: ['EXT1'],
          tickets_ids: null,
        },
        {
          empresa_id: 'e1',
          mes: 3,
          ano: 2025,
          fechado_em: '2025-04-05T12:00:00+00:00',
          snapshot_calculo: {},
          apontamentos_ids: [],
          tickets_ids: [],
        },
        { empresa_id: 'e2', mes: 12, ano: 2025, fechado_em: 'x', snapshot_calculo: {} },
      ],
      bancos_horas: [
        { id: 'b1', empresa_id: 'e1' },
        { id: 'b2', empresa_id: 'e1' },
        { id: 'b9', empresa_id: 'e2' },
      ],
      bancos_horas_fechamentos: [
        {
          id: 'f1',
          banco_id: 'b1',
          mes: 1,
          ano: 2026,
          vigente: true,
          fechado_em: '2026-02-06T00:00:00+00:00',
        },
        {
          id: 'f0',
          banco_id: 'b1',
          mes: 1,
          ano: 2026,
          vigente: false,
          fechado_em: '2026-02-01T00:00:00+00:00',
        },
        {
          id: 'f2',
          banco_id: 'b2',
          mes: 1,
          ano: 2026,
          vigente: true,
          fechado_em: '2026-02-07T00:00:00+00:00',
        },
        {
          id: 'f9',
          banco_id: 'b9',
          mes: 1,
          ano: 2026,
          vigente: true,
          fechado_em: '2026-02-08T00:00:00+00:00',
        },
      ],
      bancos_horas_fechamento_itens: [
        { fechamento_id: 'f1', tipo: 'apontamento', item_id: 'u1', minutos: 60, tickets: 0 },
        { fechamento_id: 'f2', tipo: 'ticket', item_id: 't1', minutos: 0, tickets: 1 },
        { fechamento_id: 'f2', tipo: 'requerimento', item_id: 'r1', minutos: 120, tickets: 0 },
        { fechamento_id: 'f0', tipo: 'apontamento', item_id: 'velho', minutos: 1, tickets: 0 },
      ],
      empresas_organizacoes_aranda: [
        { empresa_id: 'e1', nome_organizacao: 'EMPRESA ALFA LTDA', ativo: true },
        { empresa_id: 'e1', nome_organizacao: 'ALFA FILIAL', ativo: false },
      ],
      codigos_resolucao_banco: [{ codigo: 'RESOLVIDO', conta_horas: true, conta_tickets: false }],
      apontamentos_aranda: [
        {
          id: 'u1',
          id_externo: 'EXT1',
          nro_chamado: 'CH-1',
          data_atividade: '2026-01-15T13:00:00+00:00',
          caso_grupo: 'AMS APL - COMEX',
          org_us_final: 'EMPRESA ALFA LTDA',
          cod_resolucao: 'RESOLVIDO',
          synced_at: '2026-01-15T14:00:00+00:00',
          created_at: '2026-01-16T09:00:00+00:00',
          data_ult_modificacao_geral: '2026-01-15T13:10:00+00:00',
          data_sistema: '2026-02-02T12:00:00+00:00',
          tempo_gasto_horas: '01:30',
          tempo_gasto_minutos: 1530,
        },
        {
          id: 'u2',
          id_externo: 'EXT2',
          nro_chamado: 'CH-2',
          data_atividade: '2026-01-20T13:00:00+00:00',
          caso_grupo: 'AMS APL - COMEX',
          org_us_final: 'EMPRESA ALFA LTDA',
          cod_resolucao: 'RESOLVIDO',
          synced_at: null,
          created_at: '2026-01-30T20:11:36+00:00',
          data_ult_modificacao_geral: '2026-03-05T15:53:30+00:00',
          data_sistema: '2026-01-20T13:00:00+00:00',
          tempo_gasto_horas: '04:00',
          tempo_gasto_minutos: 240,
        },
      ],
      codigo_resolucao_modificacoes_aranda: [
        { item_id: '8207159', created: '2026-03-01T10:00:00+00:00' },
        { item_id: '8207159', created: '2026-05-01T10:00:00+00:00' },
        { item_id: '8648652', created: '2026-07-13T09:00:00+00:00' },
        { item_id: '1111111', created: '2026-07-13T09:00:00+00:00' },
      ],
      bancos_horas_reajustes: [
        // Jan, lançados depois do fechamento (05/02 12:00)
        {
          banco_id: 'b1',
          mes: 1,
          ano: 2026,
          tipo: 'entrada',
          minutos: 540,
          tickets: 0,
          ativo: true,
          created_at: '2026-02-10T12:00:00+00:00',
        },
        {
          banco_id: 'b2',
          mes: 1,
          ano: 2026,
          tipo: 'saida',
          minutos: 60,
          tickets: 0,
          ativo: true,
          created_at: '2026-02-06T08:00:00+00:00',
        },
        {
          banco_id: 'b1',
          mes: 1,
          ano: 2026,
          tipo: 'entrada',
          minutos: 0,
          tickets: 2,
          ativo: true,
          created_at: '2026-03-01T00:00:00+00:00',
        },
        // Fora: antes do fechamento, inativo, outro mês, outra empresa
        {
          banco_id: 'b1',
          mes: 1,
          ano: 2026,
          tipo: 'entrada',
          minutos: 30,
          tickets: 0,
          ativo: true,
          created_at: '2026-01-20T00:00:00+00:00',
        },
        {
          banco_id: 'b1',
          mes: 1,
          ano: 2026,
          tipo: 'entrada',
          minutos: 90,
          tickets: 0,
          ativo: false,
          created_at: '2026-02-10T00:00:00+00:00',
        },
        {
          banco_id: 'b1',
          mes: 2,
          ano: 2026,
          tipo: 'entrada',
          minutos: 90,
          tickets: 0,
          ativo: true,
          created_at: '2026-02-10T00:00:00+00:00',
        },
        {
          banco_id: 'b9',
          mes: 1,
          ano: 2026,
          tipo: 'entrada',
          minutos: 90,
          tickets: 0,
          ativo: true,
          created_at: '2026-02-10T00:00:00+00:00',
        },
      ],
      apontamentos_tickets_aranda: [
        {
          id: 't1',
          nro_solicitacao: 'SOL-9',
          data_fechamento: '2026-01-20T10:00:00+00:00',
          nome_grupo: 'AMS APL - FISCAL',
          organizacao: 'EMPRESA ALFA LTDA',
          cod_resolucao: 'RESOLVIDO',
          synced_at: '2026-01-20T11:00:00+00:00',
        },
      ],
    },
    {
      bancos_horas_gravar_comparacao: () => null,
      bancos_horas_erro_comparacao: () => null,
    }
  );
}

describe('criarRepositorioSombra', () => {
  it('empresas ativas no modelo legado, com o nome que o legado usa no Aranda', async () => {
    const repo = criarRepositorioSombra(cenario());
    expect(await repo.empresasEmLegado()).toEqual([{ id: 'e1', nomeLegado: 'EMPRESA ALFA LTDA' }]);
  });

  it('fechamentos do legado da empresa dentro dos meses pedidos', async () => {
    const repo = criarRepositorioSombra(cenario());
    expect(
      await repo.fechamentosLegado('e1', { mes: 4, ano: 2025 }, { mes: 3, ano: 2026 })
    ).toEqual([
      {
        mes: { mes: 12, ano: 2025 },
        fechadoEm: '2026-01-05T12:00:00+00:00',
        snapshot: { consumo_horas: '10:00:00' },
        apontamentosIds: ['EXT1'],
        ticketsIds: [],
      },
    ]);
  });

  it('fechamentos vigentes do modelo novo, um por banco', async () => {
    const repo = criarRepositorioSombra(cenario());
    expect(await repo.fechamentosNovos('e1', JAN, JAN)).toEqual([
      { mes: JAN, fechadoEm: '2026-02-06T00:00:00+00:00' },
      { mes: JAN, fechadoEm: '2026-02-07T00:00:00+00:00' },
    ]);
  });

  it('itens do fechamento vigente: só apontamentos e tickets', async () => {
    const repo = criarRepositorioSombra(cenario());
    expect(await repo.itensFechados('e1', JAN)).toEqual([
      { chave: 'u1', fonte: 'apontamento', minutos: 60, tickets: 0 },
      { chave: 't1', fonte: 'ticket', minutos: 0, tickets: 1 },
    ]);
  });

  it('organizações ativas da empresa e códigos de resolução', async () => {
    const repo = criarRepositorioSombra(cenario());
    expect(await repo.organizacoes('e1')).toEqual(['EMPRESA ALFA LTDA']);
    expect(await repo.codigos()).toEqual([
      { codigo: 'RESOLVIDO', contaHoras: true, contaTickets: false },
    ]);
  });

  it('itens do legado pelo id que ele guardou, com a duração do texto (sem os dias)', async () => {
    const repo = criarRepositorioSombra(cenario());
    expect(await repo.itensDoLegado(['EXT1', 'SUMIU'], ['SOL-9'])).toEqual([
      {
        chave: 'u1',
        idLegado: 'EXT1',
        fonte: 'apontamento',
        chamado: 'CH-1',
        data: '2026-01-15T13:00:00+00:00',
        grupo: 'AMS APL - COMEX',
        organizacao: 'EMPRESA ALFA LTDA',
        codigoResolucao: 'RESOLVIDO',
        // O mais recente entre sincronização, chegada ao Supabase e alteração no Aranda
        sincronizadoEm: '2026-01-16T09:00:00+00:00',
        lancadoEm: '2026-02-02T12:00:00+00:00',
        codigoTrocadoEm: null,
        minutosTexto: 90,
      },
      {
        chave: 't1',
        idLegado: 'SOL-9',
        fonte: 'ticket',
        chamado: 'SOL-9',
        data: '2026-01-20T10:00:00+00:00',
        grupo: 'AMS APL - FISCAL',
        organizacao: 'EMPRESA ALFA LTDA',
        codigoResolucao: 'RESOLVIDO',
        sincronizadoEm: '2026-01-20T11:00:00+00:00',
        lancadoEm: null,
        codigoTrocadoEm: null,
        minutosTexto: 0,
      },
    ]);
  });

  it('sem synced_at: usa a chegada ao Supabase ou a alteração no Aranda, a mais recente', async () => {
    const repo = criarRepositorioSombra(cenario());
    const [d] = await repo.dadosDosItens({ apontamentos: ['u2'], tickets: [] });
    expect(d.sincronizadoEm).toBe('2026-03-05T15:53:30+00:00');
  });

  it('última troca de código de cada chamado, no horário de Brasília convertido para UTC', async () => {
    const repo = criarRepositorioSombra(cenario());
    const trocas = await repo.trocasDeCodigo(['8207159', 'RF-8648652', 'SEM-NUMERO']);
    expect(Object.fromEntries(trocas)).toEqual({
      '8207159': '2026-05-01T13:00:00.000Z',
      'RF-8648652': '2026-07-13T12:00:00.000Z',
    });
  });

  it('reajustes ativos do mês lançados depois do fechamento, entradas − saídas', async () => {
    const repo = criarRepositorioSombra(cenario());
    expect(await repo.reajustesDepoisDoFechamento('e1', JAN, '2026-02-05T12:00:00+00:00')).toEqual({
      horas: 480,
      tickets: 2,
    });
  });

  it('sem ids, não consulta', async () => {
    const repo = criarRepositorioSombra(cenario());
    expect(await repo.itensDoLegado([], [])).toEqual([]);
    expect(await repo.dadosDosItens({ apontamentos: [], tickets: [] })).toEqual([]);
  });

  it('dados dos itens pelo id do Aranda', async () => {
    const repo = criarRepositorioSombra(cenario());
    const r = await repo.dadosDosItens({ apontamentos: ['u1'], tickets: ['t1'] });
    expect(r.map((d) => [d.chave, d.fonte, d.chamado])).toEqual([
      ['u1', 'apontamento', 'CH-1'],
      ['t1', 'ticket', 'SOL-9'],
    ]);
  });

  it('consulta ids em lotes', async () => {
    const supabase = cenario();
    const repo = criarRepositorioSombra(supabase);
    const ids = Array.from({ length: 320 }, (_, i) => `X${i}`);
    expect(await repo.itensDoLegado(ids, [])).toEqual([]);
  });

  it('grava e registra o erro pelas funções da migration 24', async () => {
    const supabase = cenario();
    const repo = criarRepositorioSombra(supabase);
    await repo.gravar({ empresa_id: 'e1', meses: [] });
    await repo.registrarErro('e1', 'Falha ao ler o fechamento');
    expect(supabase.chamadasRpc).toEqual([
      {
        nome: 'bancos_horas_gravar_comparacao',
        args: { p_comparacao: { empresa_id: 'e1', meses: [] } },
      },
      {
        nome: 'bancos_horas_erro_comparacao',
        args: { p_empresa_id: 'e1', p_erro: 'Falha ao ler o fechamento' },
      },
    ]);
  });
});
