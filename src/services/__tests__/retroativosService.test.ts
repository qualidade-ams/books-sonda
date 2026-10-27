import { describe, it, expect } from 'vitest';
import { criarSupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import { RetroativosService } from '../retroativosService';

function cenario() {
  return criarSupabaseEmMemoria(
    {
      bancos_horas_retroativos: [
        {
          id: 'rt-antigo',
          banco_id: 'b2',
          fechamento_id: 'f-ago',
          mes: 8,
          ano: 2026,
          consumo_antes_minutos: 600,
          consumo_depois_minutos: 660,
          consumo_antes_tickets: 0,
          consumo_depois_tickets: 0,
          situacao: 'aplicado',
          detectado_em: '2026-09-10T08:00:00Z',
          atualizado_em: '2026-09-10T08:00:00Z',
          decidido_por: 'u1',
          decidido_em: '2026-09-11T10:00:00Z',
          justificativa: 'Atendimento real',
          fechamento_aplicado_id: 'f-ago-v2',
          bancos_horas: {
            nome: 'Banco COMEX',
            empresa_id: 'e1',
            empresas: { nome_abreviado: 'EMPRESA ALFA' },
          },
        },
        {
          id: 'rt1',
          banco_id: 'b1',
          fechamento_id: 'f-set',
          mes: 9,
          ano: 2026,
          consumo_antes_minutos: 3150,
          consumo_depois_minutos: 3360,
          consumo_antes_tickets: 4,
          consumo_depois_tickets: 5,
          situacao: 'pendente',
          detectado_em: '2026-10-21T08:15:00Z',
          atualizado_em: '2026-10-21T08:15:00Z',
          decidido_por: null,
          decidido_em: null,
          justificativa: null,
          fechamento_aplicado_id: null,
          bancos_horas: {
            nome: 'Banco FISCAL',
            empresa_id: 'e1',
            empresas: { nome_abreviado: 'EMPRESA ALFA' },
          },
        },
      ],
      bancos_horas_retroativos_itens: [
        {
          id: 'i1',
          retroativo_id: 'rt1',
          tipo: 'apontamento',
          item_id: 'ap1',
          minutos: 150,
          tickets: 0,
          aviso_enviado_em: '2026-10-21T09:00:00Z',
          aviso_enviado_por: 'u2',
        },
        {
          id: 'i2',
          retroativo_id: 'rt1',
          tipo: 'apontamento',
          item_id: 'ap2',
          minutos: -30,
          tickets: 0,
        },
        { id: 'i3', retroativo_id: 'rt1', tipo: 'ticket', item_id: 'tk1', minutos: 90, tickets: 1 },
        {
          id: 'i4',
          retroativo_id: 'rt-antigo',
          tipo: 'apontamento',
          item_id: 'ap9',
          minutos: 60,
          tickets: 0,
        },
      ],
      apontamentos_aranda: [
        {
          id: 'ap1',
          nro_chamado: 'IM-2210431',
          nro_tarefa: 'T-88120',
          analista_tarefa: 'Consultor Teste Um',
          data_atividade: '2026-09-24T10:00:00Z',
          data_sistema: '2026-10-20T15:00:00Z',
          caso_estado: 'Closed',
        },
        {
          id: 'ap2',
          nro_chamado: 'IM-2210500',
          nro_tarefa: 'T-88300',
          analista_tarefa: 'Consultor Teste Dois',
          data_atividade: '2026-09-28T10:00:00Z',
          data_sistema: '2026-10-19T09:00:00Z',
          caso_estado: 'Resolved',
        },
      ],
      apontamentos_tickets_aranda: [
        {
          id: 'tk1',
          nro_solicitacao: 'RF-1050977',
          nome_responsavel: 'Consultor Teste Um',
          data_fechamento: '2026-09-30T18:00:00Z',
          status: 'Closed',
        },
      ],
      bancos_horas_fechamentos: [
        { id: 'f-ago-v2', fechado_em: '2026-10-02T12:00:00Z', fechado_por: 'u1' },
      ],
      especialistas: [
        { nome: 'Consultor Teste Um da Silva', email: 'consultor.um@sonda.com', status: 'ativo' },
        { nome: 'Consultor Teste Dois', email: null, status: 'ativo' },
        { nome: 'Consultor Teste Três', email: 'tres@sonda.com', status: 'inativo' },
      ],
    },
    {
      perfis_resumo: ({ p_ids }: { p_ids: string[] }) =>
        [
          { id: 'u1', email: 'a@sonda.com', full_name: 'Pessoa A' },
          { id: 'u2', email: 'b@sonda.com', full_name: 'Pessoa B' },
        ].filter((p) => p_ids.includes(p.id)),
      decidir_retroativo: () => null,
      registrar_aviso_retroativo: () => null,
    }
  );
}

describe('RetroativosService.listar', () => {
  it('traz os retroativos com empresa, banco, decisão, retificação e itens do Aranda', async () => {
    const lista = await new RetroativosService(cenario() as any).listar();
    expect(lista.map((r) => r.id)).toEqual(['rt1', 'rt-antigo']);

    const [rt1, antigo] = lista;
    expect(rt1).toMatchObject({
      empresaId: 'e1',
      empresa: 'EMPRESA ALFA',
      bancoId: 'b1',
      banco: 'Banco FISCAL',
      mes: { mes: 9, ano: 2026 },
      consumoAntesMinutos: 3150,
      consumoDepoisMinutos: 3360,
      consumoAntesTickets: 4,
      consumoDepoisTickets: 5,
      situacao: 'pendente',
      decisao: null,
      retificacao: null,
    });
    expect(rt1.itens).toEqual([
      {
        id: 'i1',
        tipo: 'apontamento',
        itemId: 'ap1',
        chamado: 'IM-2210431',
        tarefa: 'T-88120',
        consultor: 'Consultor Teste Um',
        dataAtividade: '2026-09-24T10:00:00Z',
        lancadoEm: '2026-10-20T15:00:00Z',
        statusChamado: 'Closed',
        minutos: 150,
        tickets: 0,
        aviso: { em: '2026-10-21T09:00:00Z', porId: 'u2', por: 'Pessoa B' },
      },
      expect.objectContaining({
        id: 'i2',
        minutos: -30,
        aviso: null,
        consultor: 'Consultor Teste Dois',
      }),
      expect.objectContaining({
        id: 'i3',
        tipo: 'ticket',
        chamado: 'RF-1050977',
        tarefa: null,
        consultor: 'Consultor Teste Um',
        dataAtividade: '2026-09-30T18:00:00Z',
        statusChamado: 'Closed',
        tickets: 1,
      }),
    ]);
    expect(antigo).toMatchObject({
      situacao: 'aplicado',
      decisao: {
        em: '2026-09-11T10:00:00Z',
        porId: 'u1',
        por: 'Pessoa A',
        justificativa: 'Atendimento real',
      },
      retificacao: { em: '2026-10-02T12:00:00Z', porId: 'u1', por: 'Pessoa A' },
    });
  });

  it('falha com mensagem descritiva', async () => {
    const fake = cenario();
    const original = fake.from;
    fake.from = (t: string) =>
      t === 'bancos_horas_retroativos'
        ? {
            select: () => ({ order: async () => ({ data: null, error: { message: 'sem rede' } }) }),
          }
        : original(t);
    await expect(new RetroativosService(fake as any).listar()).rejects.toMatchObject({
      message: 'Falha ao carregar os apontamentos retroativos: sem rede',
      chave: 'erros.falhas.carregarOsApontamentosRetroativos',
    });
  });
});

describe('RetroativosService.decidir e registrarAviso', () => {
  it('aprova ou descarta pela função do banco, com a justificativa', async () => {
    const fake = cenario();
    const s = new RetroativosService(fake as any);
    await s.decidir('rt1', 'aprovar', ' Atendimento real ');
    expect(fake.chamadasRpc.at(-1)).toEqual({
      nome: 'decidir_retroativo',
      args: { p_retroativo_id: 'rt1', p_decisao: 'aprovar', p_justificativa: 'Atendimento real' },
    });
  });

  it('exige a justificativa', async () => {
    const fake = cenario();
    await expect(
      new RetroativosService(fake as any).decidir('rt1', 'descartar', ' ')
    ).rejects.toMatchObject({
      message: 'Informe a justificativa.',
      chave: 'erros.retroativos.justificativa',
    });
    expect(fake.chamadasRpc).toHaveLength(0);
  });

  it('registra o aviso dos itens enviados', async () => {
    const fake = cenario();
    await new RetroativosService(fake as any).registrarAviso('rt1', ['ap1', 'tk1']);
    expect(fake.chamadasRpc.at(-1)).toEqual({
      nome: 'registrar_aviso_retroativo',
      args: { p_retroativo_id: 'rt1', p_item_ids: ['ap1', 'tk1'] },
    });
  });
});

describe('RetroativosService.emailsDosConsultores', () => {
  it('acha o e-mail pelo nome nos especialistas ativos, como a tela atual', async () => {
    const emails = await new RetroativosService(cenario() as any).emailsDosConsultores([
      'Consultor Teste Um',
      'Consultor Teste Dois',
      'Consultor Teste Três',
      'Ninguém',
    ]);
    expect(emails).toEqual({
      'Consultor Teste Um': 'consultor.um@sonda.com',
      'Consultor Teste Dois': null,
      'Consultor Teste Três': null,
      Ninguém: null,
    });
  });
});
