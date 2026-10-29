import { describe, it, expect, vi, beforeEach } from 'vitest';
import { criarSupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import { ControleSaldoParcialService } from '../controleSaldoParcialService';
import { itensDeConsumoPorBanco } from '@/services/bancosHoras/fechamento';
import type { BancoCadastro } from '@/services/bancosHoras/motorBancosHoras';
import type { MesAno } from '@/services/bancosHoras/calculo';

// A regra de classificação tem teste no fechamento; aqui importa só o que é pedido e usado
vi.mock('@/services/bancosHoras/fechamento', async (original) => ({
  ...(await original<typeof import('@/services/bancosHoras/fechamento')>()),
  itensDeConsumoPorBanco: vi.fn(),
}));
const classificar = vi.mocked(itensDeConsumoPorBanco);

const banco = (bancoId: string, extra: Partial<BancoCadastro> = {}) =>
  ({
    bancoId,
    nome: bancoId.toUpperCase(),
    ordem: 1,
    padrao: false,
    ativo: true,
    visivelCliente: true,
    consomeOutrosBancos: false,
    tipoContrato: 'horas',
    periodoApuracao: 3,
    inicioVigencia: { mes: 8, ano: 2026 },
    fimVigencia: null,
    diaInicioApuracao: 1,
    diaFimApuracao: 0,
    escopo: [],
    filtroIc: null,
    ...extra,
  }) as BancoCadastro;

const CADASTROS = [
  banco('b2', { ordem: 2, escopo: [{ produtoId: 'FISCAL', moduloId: null }] }),
  banco('b1', {
    ordem: 1,
    consomeOutrosBancos: true,
    escopo: [{ produtoId: 'COMEX', moduloId: null }],
  }),
  banco('interno', { visivelCliente: false, padrao: true }),
  banco('inativo', { ativo: false }),
];
const HOJE: MesAno = { mes: 10, ano: 2026 };
const PERIODO: MesAno[] = [
  { mes: 8, ano: 2026 },
  { mes: 9, ano: 2026 },
  { mes: 10, ano: 2026 },
];
const chave = (m: MesAno) => `${m.ano}-${String(m.mes).padStart(2, '0')}`;

function colaboradores() {
  const controle = {
    bancos: vi.fn(async () => CADASTROS),
    // Agosto e setembro já fechados; outubro aberto
    quadro: vi.fn(async (_e: string, meses: MesAno[]) =>
      Object.fromEntries(
        meses.map((m) => [
          chave(m),
          {
            empresaId: 'e1',
            mes: m,
            bancos: ['b1', 'b2', 'interno'].map((bancoId) => ({
              bancoId,
              fechado: m.mes < 10,
              horas: { saldo: 60 },
            })),
          },
        ])
      )
    ),
    requerimentos: vi.fn(async () => [
      {
        id: 'rq1',
        chamado: 'RQ-1',
        titulo: 'Relatório',
        modulo: 'Comex',
        mes: { mes: 9, ano: 2026 },
        minutos: 120,
        tickets: 0,
        situacao: 'enviado',
        bancoAutomaticoId: 'b2',
        bancoId: 'b1',
        ajuste: { bancoId: 'b1', motivo: 'Projeto', atualizadoEm: 'x', atualizadoPor: 'u1' },
      },
      { id: 'rq2', chamado: 'RQ-2', mes: { mes: 9, ano: 2026 }, bancoId: 'interno' },
      { id: 'rq3', chamado: 'RQ-3', mes: { mes: 7, ano: 2026 }, bancoId: 'b1' },
    ]),
  };
  const lancamentos = {
    reajustesParaCliente: vi.fn(async (bancoId: string) =>
      bancoId === 'b1'
        ? [{ mes: PERIODO[1], tipo: 'saida', minutos: 30, tickets: 0, justificativa: 'Visita' }]
        : []
    ),
    observacoesParaCliente: vi.fn(async () => [{ mes: PERIODO[2], texto: 'Janela' }]),
  };
  const repo = { bancos: vi.fn(async () => CADASTROS), dePara: vi.fn(async () => []) };
  return { controle, lancamentos, repo };
}

beforeEach(() => classificar.mockReset());

describe('ControleSaldoParcialService.bancos', () => {
  it('só os bancos que o cliente vê, na ordem, cada um no período atual', async () => {
    const { controle, lancamentos, repo } = colaboradores();
    const s = new ControleSaldoParcialService(
      criarSupabaseEmMemoria() as any,
      controle as any,
      lancamentos as any,
      () => repo as any
    );

    const bancos = await s.bancos('e1', HOJE);

    expect(bancos.map((b) => b.bancoId)).toEqual(['b1', 'b2']);
    expect(bancos.map((b) => b.consomeOutrosBancos)).toEqual([true, false]);
    const b1 = bancos[0];
    expect(b1.meses.map((m) => [m.chave, m.situacao])).toEqual([
      ['2026-08', 'fechado'],
      ['2026-09', 'fechado'],
      ['2026-10', 'aberto'],
    ]);
    expect(controle.quadro).toHaveBeenCalledWith('e1', PERIODO);
    // Requerimento do banco no período, sem o ajuste (autor e motivo são internos)
    expect(b1.requerimentos).toEqual([
      {
        chamado: 'RQ-1',
        titulo: 'Relatório',
        modulo: 'Comex',
        mes: { mes: 9, ano: 2026 },
        minutos: 120,
        tickets: 0,
        situacao: 'enviado',
      },
    ]);
    expect(b1.reajustes).toHaveLength(1);
    expect(b1.observacoes).toEqual([{ mes: PERIODO[2], texto: 'Janela' }]);
    expect(lancamentos.reajustesParaCliente).toHaveBeenCalledWith('b1', PERIODO);
    expect(bancos[1].reajustes).toEqual([]);
  });
});

describe('ControleSaldoParcialService.chamados', () => {
  function cenario() {
    return criarSupabaseEmMemoria({
      bancos_horas_fechamentos: [
        { id: 'f-set', banco_id: 'b1', mes: 9, ano: 2026, vigente: true },
        { id: 'f-set-v1', banco_id: 'b1', mes: 9, ano: 2026, vigente: false },
        { id: 'f-ago', banco_id: 'b1', mes: 8, ano: 2026, vigente: true },
      ],
      bancos_horas_fechamento_itens: [
        { fechamento_id: 'f-set', tipo: 'apontamento', item_id: 'ap1', minutos: 60, tickets: 0 },
        { fechamento_id: 'f-set', tipo: 'ticket', item_id: 'tk1', minutos: 0, tickets: 1 },
        { fechamento_id: 'f-set', tipo: 'requerimento', item_id: 'rq1', minutos: 120, tickets: 0 },
        {
          fechamento_id: 'f-set-v1',
          tipo: 'apontamento',
          item_id: 'ap-velho',
          minutos: 5,
          tickets: 0,
        },
      ],
      apontamentos_aranda: [
        {
          id: 'ap1',
          nro_chamado: 'CH-1',
          nro_tarefa: 'T-1',
          data_atividade: '2026-09-10T12:00:00Z',
          analista_tarefa: 'Analista A',
          solicitante: 'Solicitante A',
          grupo_tarefa: 'G-COMEX',
          item_configuracao: 'IC-1',
          descricao_tarefa: 'Ajuste no relatório',
          tipo_chamado: 'IM',
        },
        {
          id: 'ap2',
          nro_chamado: 'CH-2',
          nro_tarefa: 'T-2',
          data_atividade: '2026-10-02T12:00:00Z',
          analista_tarefa: 'Analista B',
          solicitante: 'Solicitante B',
          grupo_tarefa: 'G-COMEX',
          item_configuracao: null,
          descricao_tarefa: 'Dúvida',
        },
      ],
      apontamentos_tickets_aranda: [
        {
          id: 'tk1',
          nro_solicitacao: 'CH-3',
          data_solucao: '2026-09-20T12:00:00Z',
          data_fechamento: null,
          nome_responsavel: 'Analista C',
          solicitante: 'Solicitante C',
          nome_grupo: 'G-COMEX',
          item_configuracao: 'IC-3',
          cod_tipo: 'Solicitação',
          resumo: 'Acesso',
          descricao: 'Liberar acesso',
          solucao: 'Liberado',
        },
        {
          id: 'tk-ch1',
          nro_solicitacao: 'CH-1',
          resumo: 'Relatório',
          descricao: 'Relatório com erro',
          solucao: 'Corrigido',
        },
      ],
    });
  }

  it('fechado pelos itens congelados; aberto pela classificação do fechamento; futuro não entra', async () => {
    const { controle, lancamentos, repo } = colaboradores();
    const s = new ControleSaldoParcialService(
      cenario() as any,
      controle as any,
      lancamentos as any,
      () => repo as any
    );
    classificar.mockResolvedValue(
      new Map([
        [
          'b1',
          [
            {
              itemId: 'ap2',
              fonte: 'apontamento',
              grupo: 'G-COMEX',
              itemConfiguracao: null,
              minutos: 30,
              tickets: 0,
            },
          ],
        ],
        ['b2', []],
        ['interno', []],
      ]) as any
    );
    const bancos = await s.bancos('e1', HOJE);

    const chamados = await s.chamados('e1', bancos);

    // Só outubro (aberto) é classificado, com todos os bancos vigentes do mês
    expect(classificar).toHaveBeenCalledTimes(1);
    const [, , mes, cadastros, , bancosDoMes] = classificar.mock.calls[0];
    expect(mes).toEqual({ mes: 10, ano: 2026 });
    expect([...(cadastros as Map<string, unknown>).keys()].sort()).toEqual([
      'b1',
      'b2',
      'inativo',
      'interno',
    ]);
    expect([...(bancosDoMes as string[])].sort()).toEqual(['b1', 'b2', 'interno']);

    expect(chamados.b1).toEqual([
      {
        mes: { mes: 9, ano: 2026 },
        fonte: 'apontamento',
        chamado: 'CH-1',
        tarefa: 'T-1',
        data: '2026-09-10T12:00:00Z',
        grupo: 'G-COMEX',
        itemConfiguracao: 'IC-1',
        analista: 'Analista A',
        solicitante: 'Solicitante A',
        descricaoTarefa: 'Ajuste no relatório',
        descricaoChamado: 'Relatório com erro',
        solucaoChamado: 'Corrigido',
        tipoChamado: 'IM',
        minutos: 60,
        tickets: 0,
      },
      {
        mes: { mes: 9, ano: 2026 },
        fonte: 'ticket',
        chamado: 'CH-3',
        tarefa: null,
        data: '2026-09-20T12:00:00Z',
        grupo: 'G-COMEX',
        itemConfiguracao: 'IC-3',
        analista: 'Analista C',
        solicitante: 'Solicitante C',
        descricaoTarefa: null,
        descricaoChamado: 'Liberar acesso',
        solucaoChamado: 'Liberado',
        tipoChamado: 'RF',
        minutos: 0,
        tickets: 1,
      },
      expect.objectContaining({ mes: { mes: 10, ano: 2026 }, chamado: 'CH-2', minutos: 30 }),
    ]);
    expect(chamados.b2).toEqual([]);
  });
});

describe('ControleSaldoParcialService.registrarEnvio', () => {
  it('registra o envio manual pela função do banco (o app não grava direto na tabela)', async () => {
    const fake = criarSupabaseEmMemoria(
      {},
      { registrar_envio_saldo_parcial_controle: () => 'ex1' }
    );
    const { controle, lancamentos, repo } = colaboradores();
    const s = new ControleSaldoParcialService(
      fake as any,
      controle as any,
      lancamentos as any,
      () => repo as any
    );

    await s.registrarEnvio('e1', { sucesso: false, destinatarios: 3, erro: 'Falha no envio' });

    expect(fake.chamadasRpc).toEqual([
      {
        nome: 'registrar_envio_saldo_parcial_controle',
        args: {
          p_empresa_id: 'e1',
          p_sucesso: false,
          p_qtd_destinatarios: 3,
          p_erro: 'Falha no envio',
        },
      },
    ]);
  });

  it('erro do banco vira mensagem clara', async () => {
    const fake = criarSupabaseEmMemoria();
    const { controle, lancamentos, repo } = colaboradores();
    const s = new ControleSaldoParcialService(
      fake as any,
      controle as any,
      lancamentos as any,
      () => repo as any
    );
    await expect(s.registrarEnvio('e1', { sucesso: true, destinatarios: 1 })).rejects.toThrow(
      /Falha ao registrar o envio/
    );
  });
});

describe('ControleSaldoParcialService.idiomaDoEmail', () => {
  const servico = (
    empresas: Record<string, unknown>[],
    templates: Record<string, unknown>[] = []
  ) => {
    const { controle, lancamentos, repo } = colaboradores();
    return new ControleSaldoParcialService(
      criarSupabaseEmMemoria({ empresas, email_templates: templates }) as any,
      controle as any,
      lancamentos as any,
      () => repo as any
    );
  };

  it('pelo template padrão da empresa, como no legado', async () => {
    const s = servico(
      [
        { id: 'pt', template_padrao: 'portugues' },
        { id: 'en', template_padrao: 'ingles' },
        { id: 'sem', template_padrao: null },
        { id: 'tpl-en', template_padrao: 't1' },
        { id: 'tpl-pt', template_padrao: 't2' },
      ],
      [
        { id: 't1', nome: 'Book English' },
        { id: 't2', nome: 'Book Qualidade' },
      ]
    );
    expect(await s.idiomaDoEmail('pt')).toBe('pt-BR');
    expect(await s.idiomaDoEmail('en')).toBe('en');
    expect(await s.idiomaDoEmail('sem')).toBe('pt-BR');
    expect(await s.idiomaDoEmail('tpl-en')).toBe('en');
    expect(await s.idiomaDoEmail('tpl-pt')).toBe('pt-BR');
  });
});
