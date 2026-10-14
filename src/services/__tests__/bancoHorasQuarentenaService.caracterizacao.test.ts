/**
 * Testes de CARACTERIZAÇÃO do fechamento de período e da quarentena de ajustes
 * retroativos (bancoHorasQuarentenaService).
 *
 * Registram o comportamento de HOJE, inclusive os defeitos catalogados no
 * Inventário de Regras e Funcionalidades Atuais (códigos RC-xx, RO-xx, T-x).
 * Servem de linha de base para a comparação Legado x Novo da reconstrução do
 * banco de horas (Especificação v2.0, Fase 0). Um teste marcado com código NÃO
 * descreve o comportamento desejado: no sistema novo a regra é corrigida (ver
 * docs/especificacoes/Decisoes_Negocio_Bancos_de_Horas.md, D-09 e D-11).
 *
 * Tabelas do banco de horas (fechamentos, ajustes, cálculos, reajustes) rodam
 * num Supabase em memória, para conferir o que é gravado e apagado. As consultas
 * ao Aranda (apontamentos_aranda / apontamentos_tickets_aranda) são REGISTRADAS
 * (filtros exatos) e devolvem as linhas configuradas, sem aplicar os filtros.
 * Para comparar com o motor, a regra de consumo real
 * (bancoHorasIntegracaoService.buscarConsumo) roda sobre o mesmo simulador.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { criarSupabaseEmMemoria, type SupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';

const estado = vi.hoisted(() => ({
  supabase: null as any,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: new Proxy({}, { get: (_alvo, prop) => estado.supabase[prop] }),
}));

import { BancoHorasQuarentenaService } from '../bancoHorasQuarentenaService';
import { bancoHorasIntegracaoService } from '../bancoHorasIntegracaoService';

const EMPRESA = 'emp-1';
const NOME_COMPLETO = 'ACME INDÚSTRIA S.A.';
const ANALISTA = 'analista-1';
const TABELAS_ARANDA = ['apontamentos_aranda', 'apontamentos_tickets_aranda'];
const GRUPOS_AMS_APONTAMENTOS =
  'caso_grupo.ilike.%AMS APL%,caso_grupo.ilike.%AMS - APL%,caso_grupo.ilike.%AMS - ATENDIMENTO%,caso_grupo.ilike.%AMS T&M%';

type Chamada = [string, any[]];

let banco: SupabaseEmMemoria;
let consultasAranda: { tabela: string; chamadas: Chamada[] }[];
let linhasAranda: Record<string, any[]>;
let servico: BancoHorasQuarentenaService;

/** Builder do Aranda: registra as chamadas; só aplica o filtro in(id_externo) da busca de detalhes */
function fromAranda(tabela: string) {
  const consulta = { tabela, chamadas: [] as Chamada[] };
  consultasAranda.push(consulta);
  const builder: any = new Proxy(
    {},
    {
      get(_alvo, prop: string) {
        if (prop === 'then') {
          let linhas = linhasAranda[tabela] ?? [];
          const porId = consulta.chamadas.find(
            ([m, args]) => m === 'in' && args[0] === 'id_externo'
          );
          if (porId) linhas = linhas.filter((l) => porId[1][1].includes(l.id_externo));
          return (ok: any, falha: any) =>
            Promise.resolve({ data: linhas, error: null }).then(ok, falha);
        }
        return (...args: any[]) => {
          consulta.chamadas.push([prop, args]);
          return builder;
        };
      },
    }
  );
  return builder;
}

function montarCenario(tabelas: Record<string, any[]> = {}, empresa: Record<string, any> = {}) {
  banco = criarSupabaseEmMemoria({
    empresas_clientes: [
      {
        id: EMPRESA,
        nome_abreviado: 'ACME',
        nome_completo: NOME_COMPLETO,
        tipo_cobranca: 'banco_horas',
        dia_inicio_apuracao: 1,
        dia_fim_apuracao: 0,
        ...empresa,
      },
    ],
    banco_horas_fechamentos: [],
    banco_horas_ajustes_retroativos: [],
    banco_horas_calculos: [],
    banco_horas_reajustes: [],
    ...tabelas,
  });
  estado.supabase = {
    from: (tabela: string) =>
      TABELAS_ARANDA.includes(tabela) ? fromAranda(tabela) : banco.from(tabela),
    rpc: banco.rpc,
    auth: { getUser: async () => ({ data: { user: { id: ANALISTA } } }) },
  };
}

/** Filtros (sem o select) de cada consulta feita à tabela, na ordem */
function filtrosDe(tabela: string): Chamada[][] {
  return consultasAranda
    .filter((c) => c.tabela === tabela)
    .map((c) => c.chamadas.filter(([m]) => m !== 'select'));
}

function codigos(filtros: Chamada[]): string[] {
  return filtros.find(([m, args]) => m === 'in' && args[0] === 'cod_resolucao')![1][1];
}

/** Filtros que o motor usa hoje (bancoHorasIntegracaoService.buscarConsumo) para horas e tickets */
async function filtrosDoMotor(mes = 1, ano = 2026) {
  consultasAranda = [];
  await bancoHorasIntegracaoService.buscarConsumo(EMPRESA, mes, ano);
  const resultado = {
    horas: filtrosDe('apontamentos_aranda')[0],
    tickets: filtrosDe('apontamentos_tickets_aranda')[0],
  };
  consultasAranda = [];
  return resultado;
}

function fechamento(campos: Record<string, any> = {}) {
  return {
    id: 'fech-1',
    empresa_id: EMPRESA,
    mes: 1,
    ano: 2026,
    snapshot_consumo_horas: '3:00',
    snapshot_consumo_tickets: 2,
    snapshot_requerimentos_horas: '0:00',
    snapshot_requerimentos_tickets: 0,
    snapshot_calculo: {},
    apontamentos_ids: [],
    tickets_ids: [],
    fechado_em: '2026-02-01T10:00:00Z',
    ...campos,
  };
}

/** Datas no fuso local, como o service compara (getMonth/getFullYear) */
const local = (ano: number, mes: number, dia: number, hora = 12) =>
  new Date(ano, mes - 1, dia, hora).toISOString();

describe('Caracterização — fechamento e quarentena (bancoHorasQuarentenaService)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    consultasAranda = [];
    linhasAranda = { apontamentos_aranda: [], apontamentos_tickets_aranda: [] };
    servico = new BancoHorasQuarentenaService();
    montarCenario();
  });

  afterEach(() => vi.restoreAllMocks());

  describe('B — IDs de apontamentos do snapshot (fecharPeriodo)', () => {
    it('filtros exatos: os mesmos do motor, na mesma ordem, mas SEM limite (o motor limita a 10000)', async () => {
      const motor = await filtrosDoMotor();
      await servico.fecharPeriodo(EMPRESA, 1, 2026);

      const snapshot = filtrosDe('apontamentos_aranda')[0];
      expect(snapshot).toEqual([
        ['eq', ['ativi_interna', 'Não']],
        ['neq', ['item_configuracao', '000000 - PROJETOS APL']],
        ['in', ['tipo_chamado', ['IM', 'RF', 'PM']]],
        ['or', [GRUPOS_AMS_APONTAMENTOS]],
        ['gte', ['data_atividade', new Date(2026, 0, 1).toISOString()]],
        ['lte', ['data_atividade', new Date(2026, 0, 31, 23, 59, 59, 999).toISOString()]],
        ['in', ['cod_resolucao', expect.any(Array)]],
        ['ilike', ['org_us_final', NOME_COMPLETO]],
      ]);
      expect(motor.horas).toContainEqual(['limit', [10000]]);
      expect(snapshot).toEqual(motor.horas.filter(([m]) => m !== 'limit'));
    });

    it('lista de códigos de resolução: 51 entradas, 48 distintas — a mesma lista do motor', async () => {
      const motor = await filtrosDoMotor();
      await servico.fecharPeriodo(EMPRESA, 1, 2026);

      const lista = codigos(filtrosDe('apontamentos_aranda')[0]);
      expect(lista).toHaveLength(51);
      expect(new Set(lista).size).toBe(48);
      expect(lista).toEqual(codigos(motor.horas));
    });

    it('apuração customizada lida do cadastro (dia 16 a 15): do dia 16 do mês ao dia 15 do mês seguinte', async () => {
      montarCenario({}, { dia_inicio_apuracao: 16, dia_fim_apuracao: 15 });
      await servico.fecharPeriodo(EMPRESA, 12, 2026);

      const datas = filtrosDe('apontamentos_aranda')[0].filter(([m]) => m === 'gte' || m === 'lte');
      expect(datas).toEqual([
        ['gte', ['data_atividade', new Date(2026, 11, 16).toISOString()]],
        ['lte', ['data_atividade', new Date(2027, 0, 15, 23, 59, 59, 999).toISOString()]],
      ]);
    });

    it('apuração customizada sem dia de fim: termina no dia anterior ao de início', async () => {
      montarCenario({}, { dia_inicio_apuracao: 16, dia_fim_apuracao: 0 });
      await servico.fecharPeriodo(EMPRESA, 3, 2026);

      const lte = filtrosDe('apontamentos_aranda')[0].find(([m]) => m === 'lte')!;
      expect(lte).toEqual([
        'lte',
        ['data_atividade', new Date(2026, 3, 15, 23, 59, 59, 999).toISOString()],
      ]);
    });

    it('o snapshot guarda todos os id_externo retornados, descartando vazios', async () => {
      linhasAranda.apontamentos_aranda = [
        { id_externo: 'a1' },
        { id_externo: null },
        { id_externo: 'a2' },
      ];
      const resultado = await servico.fecharPeriodo(EMPRESA, 1, 2026);

      expect(resultado.apontamentos_ids).toEqual(['a1', 'a2']);
    });

    it('sem nome completo no cadastro: snapshot com lista vazia, sem consultar o Aranda', async () => {
      montarCenario({}, { nome_completo: null });
      const resultado = await servico.fecharPeriodo(EMPRESA, 1, 2026);

      expect(resultado.apontamentos_ids).toEqual([]);
      expect(filtrosDe('apontamentos_aranda')).toEqual([]);
    });
  });

  describe('C — detecção de extemporâneos (detectarExtemporaneos)', () => {
    beforeEach(() => {
      montarCenario({ banco_horas_fechamentos: [fechamento()] });
    });

    it('filtros da busca: iguais aos do motor, sem limite', async () => {
      const motor = await filtrosDoMotor();
      await servico.detectarExtemporaneos(EMPRESA, 1, 2026);

      // Iguais exceto o limit e a lista de códigos (comparada no teste seguinte)
      const semLimiteNemCodigos = (filtros: Chamada[]) =>
        filtros.filter(
          ([m, args]) => m !== 'limit' && !(m === 'in' && args[0] === 'cod_resolucao')
        );
      const extemporaneos = filtrosDe('apontamentos_aranda')[0];
      expect(extemporaneos.map(([m]) => m)).not.toContain('limit');
      expect(semLimiteNemCodigos(extemporaneos)).toEqual(semLimiteNemCodigos(motor.horas));
    });

    it('lista de códigos: 48 entradas sem duplicados — o mesmo conjunto do motor (que tem 51 com 3 repetidas)', async () => {
      const motor = await filtrosDoMotor();
      await servico.detectarExtemporaneos(EMPRESA, 1, 2026);

      const lista = codigos(filtrosDe('apontamentos_aranda')[0]);
      expect(lista).toHaveLength(48);
      expect(new Set(lista).size).toBe(48);
      expect([...lista].sort()).toEqual([...new Set(codigos(motor.horas))].sort());
    });

    it('extemporâneo = mês do sistema POSTERIOR ao mês da atividade (e fora do snapshot)', async () => {
      linhasAranda.apontamentos_aranda = [
        {
          id_externo: 'a1',
          data_atividade: local(2026, 1, 31, 22),
          data_sistema: local(2026, 2, 1, 8),
          tempo_gasto_minutos: 30,
        },
        {
          id_externo: 'a2',
          data_atividade: local(2026, 1, 10),
          data_sistema: local(2026, 1, 31, 23),
          tempo_gasto_minutos: 40,
        },
        {
          id_externo: 'a3',
          data_atividade: local(2026, 1, 10),
          data_sistema: local(2025, 12, 20),
          tempo_gasto_minutos: 50,
        },
        {
          id_externo: 'a4',
          data_atividade: local(2026, 1, 10),
          data_sistema: null,
          tempo_gasto_minutos: 60,
        },
        {
          id_externo: 'a5',
          data_atividade: local(2026, 1, 5),
          data_sistema: local(2026, 3, 2),
          tempo_gasto_minutos: 15,
        },
      ];
      const resultado = await servico.detectarExtemporaneos(EMPRESA, 1, 2026);

      expect(resultado!.novosApontamentos.map((a) => a.id_externo)).toEqual(['a1', 'a5']);
      // A busca dos detalhes é uma 2ª consulta, por id_externo
      expect(filtrosDe('apontamentos_aranda')[1]).toEqual([['in', ['id_externo', ['a1', 'a5']]]]);
    });

    it('[RC-145] soma tempo_gasto_minutos (o motor prioriza tempo_gasto_horas); diferença "+HH:MM", valor novo "H:MM"', async () => {
      linhasAranda.apontamentos_aranda = [
        {
          id_externo: 'a1',
          data_atividade: local(2026, 1, 20),
          data_sistema: local(2026, 2, 3),
          tempo_gasto_horas: '1:30',
          tempo_gasto_minutos: 60,
        },
        {
          id_externo: 'a2',
          data_atividade: local(2026, 1, 20),
          data_sistema: local(2026, 2, 3),
          tempo_gasto_horas: '2:00',
          tempo_gasto_minutos: null,
        },
      ];
      const resultado = await servico.detectarExtemporaneos(EMPRESA, 1, 2026);

      // O motor somaria 1:30 + 2:00 = 3:30; aqui entram só os 60 minutos
      expect(resultado).toMatchObject({
        temDiferenca: true,
        tipo: 'apontamento_horas',
        valorAnterior: '3:00',
        valorNovo: '4:00',
        diferenca: '+01:00',
        diferencaMinutos: 60,
        apontamentosRemovidos: [],
      });
    });

    it('extemporâneo já presente no snapshot não é detectado de novo', async () => {
      montarCenario({ banco_horas_fechamentos: [fechamento({ apontamentos_ids: ['a1'] })] });
      linhasAranda.apontamentos_aranda = [
        {
          id_externo: 'a1',
          data_atividade: local(2026, 1, 20),
          data_sistema: local(2026, 2, 3),
          tempo_gasto_minutos: 30,
        },
      ];

      expect(await servico.detectarExtemporaneos(EMPRESA, 1, 2026)).toBeNull();
    });

    it('apontamento fora do snapshot, mas lançado no mesmo mês da atividade, NÃO é extemporâneo', async () => {
      linhasAranda.apontamentos_aranda = [
        {
          id_externo: 'a9',
          data_atividade: local(2026, 1, 20),
          data_sistema: local(2026, 1, 21),
          tempo_gasto_minutos: 30,
        },
      ];

      expect(await servico.detectarExtemporaneos(EMPRESA, 1, 2026)).toBeNull();
    });

    it('período sem fechamento: null, sem consultar o Aranda', async () => {
      montarCenario();

      expect(await servico.detectarExtemporaneos(EMPRESA, 1, 2026)).toBeNull();
      expect(consultasAranda).toEqual([]);
    });
  });

  describe('T-B — IDs de tickets do snapshot', () => {
    it('[T-B] filtros exatos: só Closed + data de fechamento + organização; sem grupo, código de resolução ou item (o motor filtra os três)', async () => {
      const motor = await filtrosDoMotor();
      await servico.fecharPeriodo(EMPRESA, 1, 2026);

      expect(filtrosDe('apontamentos_tickets_aranda')[0]).toEqual([
        ['gte', ['data_fechamento', new Date(2026, 0, 1).toISOString()]],
        ['lte', ['data_fechamento', new Date(2026, 0, 31, 23, 59, 59, 999).toISOString()]],
        ['eq', ['status', 'Closed']],
        ['ilike', ['organizacao', NOME_COMPLETO]],
        ['limit', [5000]],
      ]);
      // O motor, para os mesmos tickets, filtra item, código de resolução e grupo AMS
      expect(motor.tickets).toContainEqual(['neq', ['item_configuracao', '000000 - PROJETOS APL']]);
      expect(motor.tickets).toContainEqual(['in', ['cod_resolucao', expect.any(Array)]]);
      expect(
        motor.tickets.some(
          ([m, args]) => m === 'or' && String(args[0]).includes('nome_grupo.ilike.%AMS APL%')
        )
      ).toBe(true);
    });

    it('[T-B] snapshot de tickets guarda todos os fechados da organização (inclusive fora do AMS)', async () => {
      linhasAranda.apontamentos_tickets_aranda = [
        { nro_solicitacao: 101, nome_grupo: 'AMS APL' },
        { nro_solicitacao: 102, nome_grupo: 'INFRA', cod_resolucao: 'Outro' },
      ];
      const resultado = await servico.fecharPeriodo(EMPRESA, 1, 2026);

      expect(resultado.tickets_ids).toEqual([101, 102]);
    });

    it('[T-B] falso positivo: ticket fora do AMS fechado depois do snapshot vira "+1" sobre o consumo do motor', async () => {
      montarCenario({
        banco_horas_fechamentos: [fechamento({ snapshot_consumo_tickets: 1, tickets_ids: [101] })],
      });
      linhasAranda.apontamentos_tickets_aranda = [
        { nro_solicitacao: 101, nome_grupo: 'AMS APL' },
        { nro_solicitacao: 102, nome_grupo: 'INFRA', cod_resolucao: 'Outro' },
      ];
      const resultado = await servico.detectarExtemporaneosTickets(EMPRESA, 1, 2026);

      expect(resultado).toMatchObject({
        tipo: 'apontamento_tickets',
        valorAnterior: '1',
        valorNovo: '2',
        diferenca: '+1',
        diferencaMinutos: 1,
        novosApontamentos: [{ nro_solicitacao: 102 }],
        apontamentosRemovidos: [],
      });
    });

    it('a detecção completa só olha tickets quando tipo_cobranca = "ticket" (não usa tipo_contrato)', async () => {
      montarCenario(
        { banco_horas_fechamentos: [fechamento()] },
        { tipo_contrato: 'tickets', tipo_cobranca: 'banco_horas' }
      );
      await servico.executarDeteccaoCompleta(EMPRESA, 1, 2026);

      expect(filtrosDe('apontamentos_tickets_aranda')).toEqual([]);
      expect(filtrosDe('apontamentos_aranda')).toHaveLength(1);
    });
  });

  describe('[RO-25/RC-107] fechar e reabrir período', () => {
    it('fecharPeriodo grava o snapshot do cálculo atual, motivo "Geração de Book" e quem fechou', async () => {
      montarCenario({
        banco_horas_calculos: [
          {
            empresa_id: EMPRESA,
            mes: 1,
            ano: 2026,
            consumo_horas: '7:30',
            consumo_tickets: 3,
            requerimentos_horas: '1:00',
            requerimentos_tickets: 0,
          },
        ],
      });
      await servico.fecharPeriodo(EMPRESA, 1, 2026, 'user-9');

      expect(banco.tabelas.banco_horas_fechamentos).toHaveLength(1);
      expect(banco.tabelas.banco_horas_fechamentos[0]).toMatchObject({
        empresa_id: EMPRESA,
        mes: 1,
        ano: 2026,
        snapshot_consumo_horas: '7:30',
        snapshot_consumo_tickets: 3,
        snapshot_requerimentos_horas: '1:00',
        snapshot_requerimentos_tickets: 0,
        snapshot_calculo: expect.objectContaining({ consumo_horas: '7:30' }),
        fechado_por: 'user-9',
        motivo: 'Geração de Book',
      });
    });

    it('sem cálculo gravado: snapshot "00:00" / 0 e cálculo {}', async () => {
      await servico.fecharPeriodo(EMPRESA, 1, 2026);

      expect(banco.tabelas.banco_horas_fechamentos[0]).toMatchObject({
        snapshot_consumo_horas: '00:00',
        snapshot_consumo_tickets: 0,
        snapshot_calculo: {},
        fechado_por: null,
      });
    });

    it('[RO-25] idempotente: com fechamento existente devolve o mesmo, sem gravar nem consultar o Aranda', async () => {
      montarCenario({ banco_horas_fechamentos: [fechamento({ snapshot_consumo_horas: '3:00' })] });
      const resultado = await servico.fecharPeriodo(EMPRESA, 1, 2026);

      expect(resultado).toMatchObject({ id: 'fech-1', snapshot_consumo_horas: '3:00' });
      expect(banco.tabelas.banco_horas_fechamentos).toHaveLength(1);
      expect(consultasAranda).toEqual([]);
    });

    it('[RC-107] reabrirPeriodo apaga (DELETE) o fechamento; fechar de novo cria snapshot novo com os dados atuais', async () => {
      montarCenario({
        banco_horas_fechamentos: [fechamento({ apontamentos_ids: ['velho'] })],
        banco_horas_calculos: [{ empresa_id: EMPRESA, mes: 1, ano: 2026, consumo_horas: '9:00' }],
      });
      linhasAranda.apontamentos_aranda = [{ id_externo: 'novo' }];

      expect(await servico.reabrirPeriodo(EMPRESA, 1, 2026)).toBe(true);
      expect(banco.tabelas.banco_horas_fechamentos).toEqual([]);

      const novo = await servico.fecharPeriodo(EMPRESA, 1, 2026);
      expect(novo).toMatchObject({ snapshot_consumo_horas: '9:00', apontamentos_ids: ['novo'] });
      expect(novo.id).not.toBe('fech-1');
    });

    it('reabrirPeriodo sem fechamento: true, nada a fazer', async () => {
      expect(await servico.reabrirPeriodo(EMPRESA, 1, 2026)).toBe(true);
    });
  });

  describe('[RO-32] aprovarAjuste', () => {
    beforeEach(() => {
      montarCenario({
        banco_horas_fechamentos: [
          fechamento({ apontamentos_ids: ['a0'], snapshot_consumo_horas: '3:00' }),
        ],
        banco_horas_ajustes_retroativos: [
          {
            id: 'aj-1',
            empresa_id: EMPRESA,
            fechamento_id: 'fech-1',
            mes_referencia: 1,
            ano_referencia: 2026,
            tipo_dado: 'apontamento_horas',
            valor_anterior: '3:00',
            valor_novo: '4:00',
            diferenca: '+01:00',
            diferenca_minutos: 60,
            detalhes_mudanca: { novos: [{ id_externo: 'a1' }], removidos: [] },
            status: 'pendente',
            reajuste_gerado_id: null,
          },
        ],
        banco_horas_calculos: [
          { id: 'c-jan', empresa_id: EMPRESA, mes: 1, ano: 2026, consumo_horas: '3:00' },
          { id: 'c-fev', empresa_id: EMPRESA, mes: 2, ano: 2026, consumo_horas: '5:00' },
        ],
      });
    });

    it('incorpora no snapshot do mês de referência: IDs novos e consumo = valor_novo', async () => {
      await servico.aprovarAjuste({
        ajusteId: 'aj-1',
        motivo: 'ok',
        mesAplicacao: 3,
        anoAplicacao: 2026,
      });

      expect(banco.tabelas.banco_horas_fechamentos[0]).toMatchObject({
        apontamentos_ids: ['a0', 'a1'],
        snapshot_consumo_horas: '4:00',
      });
    });

    it('apaga (DELETE) o cálculo do mês de referência e não recalcula; os meses seguintes ficam como estavam', async () => {
      await servico.aprovarAjuste({
        ajusteId: 'aj-1',
        motivo: 'ok',
        mesAplicacao: 3,
        anoAplicacao: 2026,
      });

      expect(banco.tabelas.banco_horas_calculos.map((c) => c.id)).toEqual(['c-fev']);
    });

    it('não gera reajuste: reajuste_gerado_id fica nulo e nada é gravado em banco_horas_reajustes', async () => {
      const resultado = await servico.aprovarAjuste({
        ajusteId: 'aj-1',
        motivo: 'ok',
        mesAplicacao: 3,
        anoAplicacao: 2026,
      });

      expect(resultado.reajuste_gerado_id).toBeNull();
      expect(banco.tabelas.banco_horas_reajustes).toEqual([]);
    });

    it('marca aprovado com analista e motivo; mês/ano de aplicação = mês de referência (o informado é ignorado)', async () => {
      const resultado = await servico.aprovarAjuste({
        ajusteId: 'aj-1',
        motivo: 'ok',
        mesAplicacao: 3,
        anoAplicacao: 2026,
      });

      expect(resultado).toMatchObject({
        status: 'aprovado',
        analisado_por: ANALISTA,
        analisado_em: expect.any(String),
        motivo_decisao: 'ok',
        mes_aplicacao: 1,
        ano_aplicacao: 2026,
      });
    });

    it('ajuste que não está pendente: erro "Ajuste já foi <status>"', async () => {
      banco.tabelas.banco_horas_ajustes_retroativos[0].status = 'descartado';

      await expect(
        servico.aprovarAjuste({
          ajusteId: 'aj-1',
          motivo: 'ok',
          mesAplicacao: 1,
          anoAplicacao: 2026,
        })
      ).rejects.toThrow('Ajuste já foi descartado');
    });

    it('tickets com valor novo "0": o snapshot mantém o consumo anterior (parseInt("0") || anterior)', async () => {
      Object.assign(banco.tabelas.banco_horas_ajustes_retroativos[0], {
        tipo_dado: 'apontamento_tickets',
        valor_anterior: '2',
        valor_novo: '0',
        detalhes_mudanca: { novos: [], removidos: [{ nro_solicitacao: 7 }] },
      });
      await servico.aprovarAjuste({
        ajusteId: 'aj-1',
        motivo: 'ok',
        mesAplicacao: 1,
        anoAplicacao: 2026,
      });

      expect(banco.tabelas.banco_horas_fechamentos[0].snapshot_consumo_tickets).toBe(2);
    });
  });
});
