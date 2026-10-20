/**
 * Testes de CARACTERIZAÇÃO das cópias da regra de consumo usadas pelo BOOK
 * (booksDataCollectorService.coletarDadosCompletos).
 *
 * Registram o comportamento de HOJE, inclusive os defeitos catalogados no
 * Inventário de Regras e Funcionalidades Atuais (códigos RC-xx / RB-xx). Servem de
 * linha de base para a comparação Legado x Novo da reconstrução do banco de horas
 * (Especificação v2.0, Fase 0). Um teste marcado com RC-xx NÃO descreve o
 * comportamento desejado: no sistema novo a regra é corrigida (ver
 * docs/especificacoes/Decisoes_Negocio_Bancos_de_Horas.md).
 *
 * Cópias cobertas (Inventário, seção 8.1):
 *  - H   consumo de horas do mês (apontamentos_aranda)
 *  - I   histórico de 6 meses de horas (apontamentos_aranda)
 *  - T-H tickets do mês (apontamentos_tickets_aranda)
 *  - T-I histórico de 6 meses de tickets (apontamentos_tickets_aranda)
 *  - RC-146 requerimentos descontados / histórico de requerimentos
 *  - RB-08 visão por tipo de contrato
 *  - RC-148 fallback do percentual de repasse no consumo segmentado
 *
 * Roda o coletor real sobre um Supabase simulado que REGISTRA cada chamada do
 * query builder e devolve as linhas configuradas por consulta. As listas do
 * motor (bancoHorasIntegracaoService) são obtidas rodando o motor real sobre o
 * mesmo simulador, para comparar as cópias com a fonte.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

interface Consulta {
  tabela: string;
  chamadas: [string, any[]][];
}

const estado = vi.hoisted(() => ({
  empresa: {} as Record<string, any>,
  rpc: {} as Record<string, any[]>,
  /** Respostas por consulta: a primeira cujo predicado casa define as linhas devolvidas */
  respostas: [] as { quando: (c: any) => boolean; linhas: any[] }[],
  consultas: [] as any[],
}));

vi.mock('@/integrations/supabase/client', () => {
  /** Builder que registra cada chamada e resolve, no await, com as linhas da resposta que casar */
  const from = (tabela: string) => {
    const consulta = { tabela, chamadas: [] as [string, any[]][] };
    estado.consultas.push(consulta);
    let modo: 'lista' | 'single' | 'maybeSingle' = 'lista';
    const builder: any = new Proxy(
      {},
      {
        get(_alvo, prop: string) {
          if (prop === 'then') {
            const resposta = estado.respostas.find((r) => r.quando(consulta));
            const linhas = resposta
              ? resposta.linhas
              : tabela === 'empresas_clientes'
                ? [estado.empresa]
                : [];
            const resultado =
              modo === 'single'
                ? linhas.length
                  ? { data: linhas[0], error: null }
                  : { data: null, error: { code: 'PGRST116', message: 'não encontrado' } }
                : modo === 'maybeSingle'
                  ? { data: linhas[0] ?? null, error: null }
                  : { data: linhas, error: null };
            return (ok: any, falha: any) => Promise.resolve(resultado).then(ok, falha);
          }
          return (...args: any[]) => {
            if (prop === 'single' || prop === 'maybeSingle') modo = prop;
            consulta.chamadas.push([prop, args]);
            return builder;
          };
        },
      }
    );
    return builder;
  };
  const rpc = (nome: string, params: any) => {
    estado.consultas.push({ tabela: `rpc:${nome}`, chamadas: [['rpc', [nome, params]]] });
    return Promise.resolve({ data: estado.rpc[nome] ?? [], error: null });
  };
  return { supabase: { from, rpc } };
});

import { booksDataCollectorService } from '../booksDataCollectorService';
import { bancoHorasIntegracaoService } from '../bancoHorasIntegracaoService';

const EMPRESA_ID = 'emp-1';
const EMPRESA_BASE = {
  id: EMPRESA_ID,
  nome_completo: 'ACME INDÚSTRIA S.A.',
  nome_abreviado: 'ACME',
  meta_sla_percentual: 85,
  tipo_contrato: 'horas',
  quantidade_minima_chamados_sla: 0,
  baseline_horas_mensal: '10:00',
  baseline_tickets_mensal: 20,
  dia_inicio_apuracao: 1,
  dia_fim_apuracao: 0,
  periodo_apuracao: 3,
  inicio_vigencia: '2026-01-01',
  baseline_segmentado: false,
  segmentacao_config: null,
  percentual_repasse_mensal: null,
};

const GRUPOS_AMS_APONTAMENTOS =
  'caso_grupo.ilike.%AMS APL%,caso_grupo.ilike.%AMS - APL%,caso_grupo.ilike.%AMS - ATENDIMENTO%,caso_grupo.ilike.%AMS T&M%';
const GRUPOS_AMS_TICKETS =
  'nome_grupo.ilike.%AMS APL%,nome_grupo.ilike.%AMS - APL%,nome_grupo.ilike.%AMS - ATENDIMENTO%,nome_grupo.ilike.%AMS T&M%';
const SELECT_HISTORICO_HORAS = 'tempo_gasto_horas, data_atividade, data_sistema, nro_chamado';
const SELECT_HISTORICO_TICKETS =
  'tempo_gasto_dias, tempo_gasto_horas, tempo_gasto_minutos, cod_tipo';
const SELECT_HISTORICO_REQUERIMENTOS = 'horas_funcional, horas_tecnico, quantidade_tickets';
const TRES_ALOCACAO = ['Alocação', 'Alocação (Banco=S |SLA=N)', 'Alocação (Banco=S| SLA=N)'];

// ---------- leitura das consultas registradas ----------

const selectDe = (c: Consulta) => c.chamadas.find(([m]) => m === 'select')?.[1][0];
const tem = (c: Consulta, metodo: string, coluna: string) =>
  c.chamadas.some(([m, a]) => m === metodo && a[0] === coluna);
const valorDe = (c: Consulta, metodo: string, coluna: string) =>
  c.chamadas.find(([m, a]) => m === metodo && a[0] === coluna)?.[1][1];
const filtrosDe = (c: Consulta) => c.chamadas.filter(([m]) => m !== 'select');
const codigosDe = (c: Consulta): string[] => valorDe(c, 'in', 'cod_resolucao');

const ehH = (c: Consulta) => c.tabela === 'apontamentos_aranda' && selectDe(c) === '*';
const ehI = (c: Consulta) =>
  c.tabela === 'apontamentos_aranda' && selectDe(c) === SELECT_HISTORICO_HORAS;
const ehTH = (c: Consulta) =>
  c.tabela === 'apontamentos_tickets_aranda' &&
  tem(c, 'in', 'cod_resolucao') &&
  selectDe(c) === '*';
const ehTI = (c: Consulta) =>
  c.tabela === 'apontamentos_tickets_aranda' &&
  tem(c, 'in', 'cod_resolucao') &&
  selectDe(c) === SELECT_HISTORICO_TICKETS;
const ehDescontados = (c: Consulta) =>
  c.tabela === 'requerimentos' && tem(c, 'order', 'data_envio_faturamento');
const ehHistoricoRequerimentos = (c: Consulta) =>
  c.tabela === 'requerimentos' && selectDe(c) === SELECT_HISTORICO_REQUERIMENTOS;
const ehRequerimentosSegmentados = (c: Consulta) =>
  c.tabela === 'requerimentos' && tem(c, 'eq', 'empresa_segmentacao_nome');
/** Restringe um predicado de consulta ao mês cuja janela (gte na coluna) começa no dia 1 */
const doMesEm =
  (pred: (c: Consulta) => boolean, coluna: string, ano: number, mes: number) => (c: Consulta) =>
    pred(c) && valorDe(c, 'gte', coluna) === new Date(ano, mes - 1, 1).toISOString();

const consultasOnde = (pred: (c: Consulta) => boolean): Consulta[] => estado.consultas.filter(pred);
function unica(pred: (c: Consulta) => boolean): Consulta {
  const encontradas = consultasOnde(pred);
  expect(encontradas).toHaveLength(1);
  return encontradas[0];
}

function responder(quando: (c: Consulta) => boolean, linhas: any[]) {
  estado.respostas.push({ quando, linhas });
}

async function coletar(empresa: Record<string, any> = {}, mes = 1, ano = 2026) {
  estado.empresa = { ...EMPRESA_BASE, ...empresa };
  return booksDataCollectorService.coletarDadosCompletos(EMPRESA_ID, mes, ano);
}

/** Roda o motor real (bancoHorasIntegracaoService) e devolve as listas/filtros que ele usa */
async function regrasDoMotor() {
  const antes = estado.consultas.length;
  estado.empresa = { ...EMPRESA_BASE };
  await bancoHorasIntegracaoService.buscarConsumo(EMPRESA_ID, 1, 2026);
  await bancoHorasIntegracaoService.buscarRequerimentos(EMPRESA_ID, 1, 2026);
  const doMotor: Consulta[] = estado.consultas.slice(antes);
  const horas = doMotor.find((c) => c.tabela === 'apontamentos_aranda')!;
  const tickets = doMotor.find((c) => c.tabela === 'apontamentos_tickets_aranda')!;
  const requerimentos = doMotor.find((c) => c.tabela === 'requerimentos')!;
  return {
    codigosHoras: new Set(codigosDe(horas)),
    codigosTickets: new Set(codigosDe(tickets)),
    filtrosRequerimentos: filtrosDe(requerimentos),
  };
}

const diferenca = (a: Iterable<string>, b: Set<string>) => [...a].filter((x) => !b.has(x));

describe('Caracterização — regra de consumo do BOOK (booksDataCollectorService)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'table').mockImplementation(() => undefined);
    estado.consultas = [];
    estado.respostas = [];
    estado.rpc = {};
    estado.empresa = { ...EMPRESA_BASE };
  });

  afterEach(() => vi.restoreAllMocks());

  describe('H — consumo de horas do mês (contrato "horas")', () => {
    it('filtros exatos: nome completo com ilike sem curingas, IM/RF/PM, 4 grupos AMS, janela [dia 1, próximo mês) e SEM limit', async () => {
      await coletar();

      expect(filtrosDe(unica(ehH))).toEqual([
        ['ilike', ['org_us_final', 'ACME INDÚSTRIA S.A.']],
        ['eq', ['ativi_interna', 'Não']],
        ['in', ['tipo_chamado', ['IM', 'RF', 'PM']]],
        ['neq', ['item_configuracao', '000000 - PROJETOS APL']],
        ['or', [GRUPOS_AMS_APONTAMENTOS]],
        ['in', ['cod_resolucao', expect.any(Array)]],
        ['gte', ['data_atividade', new Date(2026, 0, 1).toISOString()]],
        ['lt', ['data_atividade', new Date(2026, 1, 1).toISOString()]],
      ]);
    });

    it('lista de códigos de resolução: 47 entradas distintas; em relação ao motor falta só "Alocação T&M"', async () => {
      await coletar();
      const codigos = codigosDe(unica(ehH));
      const motor = await regrasDoMotor();

      expect(codigos).toHaveLength(47);
      expect(new Set(codigos).size).toBe(47);
      expect(diferenca(motor.codigosHoras, new Set(codigos))).toEqual(['Alocação T&M']);
      expect(diferenca(codigos, motor.codigosHoras)).toEqual([]);
    });

    it('só mês civil: ignora dia_inicio_apuracao customizado (a volumetria do mesmo book respeita o dia 16)', async () => {
      await coletar({ dia_inicio_apuracao: 16, dia_fim_apuracao: 15 });

      const h = unica(ehH);
      expect(valorDe(h, 'gte', 'data_atividade')).toBe(new Date(2026, 0, 1).toISOString());
      expect(valorDe(h, 'lt', 'data_atividade')).toBe(new Date(2026, 1, 1).toISOString());

      const volumetriaAbertos = estado.consultas.find(
        (c: Consulta) =>
          c.tabela === 'apontamentos_tickets_aranda' && tem(c, 'gte', 'data_abertura')
      );
      expect(valorDe(volumetriaAbertos, 'gte', 'data_abertura')).toBe(
        new Date(2026, 0, 16).toISOString()
      );
    });

    it('soma só tempo_gasto_horas (ignora segundos e NÃO cai para tempo_gasto_minutos, como o motor faz); PM vai para solicitação; formato "HH:MM:00"', async () => {
      responder(ehH, [
        { tempo_gasto_horas: '01:30:59', tempo_gasto_minutos: 999, tipo_chamado: 'IM' },
        { tempo_gasto_horas: '02:15', tempo_gasto_minutos: null, tipo_chamado: 'RF' },
        { tempo_gasto_horas: '0:45', tempo_gasto_minutos: null, tipo_chamado: 'PM' },
        { tempo_gasto_horas: null, tempo_gasto_minutos: 45, tipo_chamado: 'IM' },
      ]);

      const { consumo } = await coletar();

      // 1:30 + 2:15 + 0:45 = 4:30; o registro só com minutos vale 0 mas entra em total_geral
      expect(consumo).toMatchObject({
        horas_consumo: '04:30:00',
        baseline_apl: '10:00:00',
        incidente: '01:30:00',
        solicitacao: '03:00:00',
        percentual_consumido: 45,
        percentual_incidente: 33,
        percentual_solicitacao: 67,
        total_geral: 4,
      });
    });

    it('sem apontamentos: consumo "00:00:00", incidente "--" e distribuição "SEM DADOS"', async () => {
      const { consumo } = await coletar();

      expect(consumo).toMatchObject({
        horas_consumo: '00:00:00',
        incidente: '--',
        solicitacao: '00:00:00',
        percentual_consumido: 0,
        distribuicao_causa: [{ causa: 'SEM DADOS', quantidade: 0, percentual: 0 }],
        total_geral: 0,
      });
    });
  });

  describe('I — histórico de 6 meses de horas (contrato "horas")', () => {
    it('6 consultas, do 5º mês anterior ao mês do book, virando o ano; cada uma [dia 1, próximo mês)', async () => {
      await coletar({}, 2, 2026);

      const janelas = consultasOnde(ehI).map((c) => [
        valorDe(c, 'gte', 'data_atividade'),
        valorDe(c, 'lt', 'data_atividade'),
      ]);
      const meses: [number, number][] = [
        [2025, 9],
        [2025, 10],
        [2025, 11],
        [2025, 12],
        [2026, 1],
        [2026, 2],
      ];
      expect(janelas).toEqual(
        meses.map(([a, m]) => [
          new Date(a, m - 1, 1).toISOString(),
          new Date(a, m, 1).toISOString(),
        ])
      );
    });

    it('= H: mesmos filtros e mesma lista de 47 códigos, mudando só o select', async () => {
      await coletar();

      const h = unica(ehH);
      const atual = unica(doMesEm(ehI, 'data_atividade', 2026, 1));
      expect(filtrosDe(atual)).toEqual(filtrosDe(h));
      expect(selectDe(atual)).toBe(SELECT_HISTORICO_HORAS);
    });

    it('só mês civil: ignora dia_inicio_apuracao customizado', async () => {
      await coletar({ dia_inicio_apuracao: 16, dia_fim_apuracao: 15 });

      expect(consultasOnde(doMesEm(ehI, 'data_atividade', 2026, 1))).toHaveLength(1);
    });

    it('soma horas decimais do mês (ignora segundos e tempo_gasto_minutos); exibe "HH:MM:00" e valor com 2 casas', async () => {
      responder(doMesEm(ehI, 'data_atividade', 2026, 1), [
        { tempo_gasto_horas: '01:30:40' },
        { tempo_gasto_horas: '00:20' },
        { tempo_gasto_horas: null, tempo_gasto_minutos: 60 },
      ]);

      const { consumo } = await coletar();

      expect(consumo.historico_consumo.map((h) => h.mes)).toEqual([
        'AGO',
        'SET',
        'OUT',
        'NOV',
        'DEZ',
        'JAN',
      ]);
      expect(consumo.historico_consumo[5]).toMatchObject({
        mes: 'JAN',
        horas: '01:50:00',
        valor_numerico: 1.83,
      });
      expect(consumo.historico_consumo[0]).toMatchObject({
        mes: 'AGO',
        horas: '00:00:00',
        valor_numerico: 0,
      });
    });
  });

  describe('T-H — tickets do mês (contratos "tickets" e "ambos")', () => {
    it('filtros exatos: nome completo, Closed por data_fechamento [dia 1, último dia 23:59:59.999], 4 grupos AMS e SEM limit', async () => {
      await coletar({ tipo_contrato: 'tickets' });

      expect(filtrosDe(unica(ehTH))).toEqual([
        ['ilike', ['organizacao', 'ACME INDÚSTRIA S.A.']],
        ['gte', ['data_fechamento', new Date(2026, 0, 1).toISOString()]],
        ['lte', ['data_fechamento', new Date(2026, 0, 31, 23, 59, 59, 999).toISOString()]],
        ['eq', ['status', 'Closed']],
        ['neq', ['item_configuracao', '000000 - PROJETOS APL']],
        ['in', ['cod_resolucao', expect.any(Array)]],
        ['or', [GRUPOS_AMS_TICKETS]],
      ]);
    });

    it('lista de 47 códigos = lista de tickets do motor; contra H troca "Nota Publicada (Banco=S| SLA=N)" por "Alocação T&M"', async () => {
      await coletar({ tipo_contrato: 'ambos' });
      const codigosTH = new Set(codigosDe(unica(ehTH)));
      estado.consultas = [];
      await coletar();
      const codigosH = new Set(codigosDe(unica(ehH)));
      const motor = await regrasDoMotor();

      expect(codigosTH.size).toBe(47);
      expect(diferenca(codigosTH, motor.codigosTickets)).toEqual([]);
      expect(diferenca(motor.codigosTickets, codigosTH)).toEqual([]);
      expect(diferenca(codigosTH, codigosH)).toEqual(['Alocação T&M']);
      expect(diferenca(codigosH, codigosTH)).toEqual(['Nota Publicada (Banco=S| SLA=N)']);
    });

    it('só mês civil: ignora dia_inicio_apuracao customizado', async () => {
      await coletar({ tipo_contrato: 'tickets', dia_inicio_apuracao: 16, dia_fim_apuracao: 15 });

      const th = unica(ehTH);
      expect(valorDe(th, 'gte', 'data_fechamento')).toBe(new Date(2026, 0, 1).toISOString());
      expect(valorDe(th, 'lte', 'data_fechamento')).toBe(
        new Date(2026, 0, 31, 23, 59, 59, 999).toISOString()
      );
    });

    it('cada ticket conta 1; incidente = cod_tipo "Incidente"; valores como inteiros em texto; distribuição por cod_resolucao', async () => {
      responder(ehTH, [
        { cod_tipo: 'Incidente', cod_resolucao: 'Dúvida' },
        { cod_tipo: 'Incidente', cod_resolucao: 'Dúvida' },
        { cod_tipo: 'Requisição', cod_resolucao: 'Consultoria' },
      ]);

      const { consumo } = await coletar({ tipo_contrato: 'tickets' });

      // Sem histórico de baseline (RPC vazia): cai no legado baseline_tickets_mensal = 20
      expect(consumo).toMatchObject({
        horas_consumo: '3',
        baseline_apl: '20',
        incidente: '2',
        solicitacao: '1',
        percentual_consumido: 15,
        total_geral: 3,
        distribuicao_causa: [
          { causa: 'Dúvida', quantidade: 2, percentual: 67 },
          { causa: 'Consultoria', quantidade: 1, percentual: 33 },
        ],
      });
    });
  });

  describe('T-I — histórico de 6 meses de tickets (contratos "tickets" e "ambos")', () => {
    it('liga a empresa pelo NOME ABREVIADO (ilike sem curingas), ao contrário de T-H, que usa o nome completo', async () => {
      await coletar({ tipo_contrato: 'tickets' });

      const ti = consultasOnde(ehTI);
      expect(ti).toHaveLength(6);
      ti.forEach((c) => expect(valorDe(c, 'ilike', 'organizacao')).toBe('ACME'));
      expect(valorDe(unica(ehTH), 'ilike', 'organizacao')).toBe('ACME INDÚSTRIA S.A.');
    });

    it('sem nome abreviado, cai para o nome completo', async () => {
      await coletar({ tipo_contrato: 'tickets', nome_abreviado: null });

      expect(consultasOnde(ehTI)).toHaveLength(6);
      consultasOnde(ehTI).forEach((c) =>
        expect(valorDe(c, 'ilike', 'organizacao')).toBe('ACME INDÚSTRIA S.A.')
      );
    });

    it('filtros exatos do mês, só mês civil mesmo com dia_inicio_apuracao 16', async () => {
      await coletar({ tipo_contrato: 'tickets', dia_inicio_apuracao: 16, dia_fim_apuracao: 15 });

      expect(filtrosDe(unica(doMesEm(ehTI, 'data_fechamento', 2026, 1)))).toEqual([
        ['ilike', ['organizacao', 'ACME']],
        ['gte', ['data_fechamento', new Date(2026, 0, 1).toISOString()]],
        ['lte', ['data_fechamento', new Date(2026, 0, 31, 23, 59, 59, 999).toISOString()]],
        ['eq', ['status', 'Closed']],
        ['neq', ['item_configuracao', '000000 - PROJETOS APL']],
        ['in', ['cod_resolucao', expect.any(Array)]],
        ['or', [GRUPOS_AMS_TICKETS]],
      ]);
    });

    it('lista de 44 códigos: a de T-H sem as 3 "Alocação" (a mesma empresa conta tickets diferentes no mês e no histórico)', async () => {
      await coletar({ tipo_contrato: 'tickets' });

      const codigosTI = codigosDe(unica(doMesEm(ehTI, 'data_fechamento', 2026, 1)));
      const codigosTH = new Set(codigosDe(unica(ehTH)));
      expect(codigosTI).toHaveLength(44);
      expect(diferenca(codigosTH, new Set(codigosTI))).toEqual(TRES_ALOCACAO);
      expect(diferenca(codigosTI, codigosTH)).toEqual([]);
    });

    it('conta tickets do mês e exibe como inteiro em texto', async () => {
      responder(doMesEm(ehTI, 'data_fechamento', 2025, 12), [
        { cod_tipo: 'Incidente' },
        { cod_tipo: 'Requisição' },
      ]);

      const { consumo } = await coletar({ tipo_contrato: 'ambos' });

      expect(consumo.historico_consumo[4]).toMatchObject({
        mes: 'DEZ',
        horas: '2',
        valor_numerico: 2,
      });
      expect(consumo.historico_consumo[5]).toMatchObject({
        mes: 'JAN',
        horas: '0',
        valor_numerico: 0,
      });
    });
  });

  describe('[RB-08] visão por tipo de contrato', () => {
    it('contrato "horas": consulta só apontamentos_aranda (H e I), nenhuma consulta de tickets de consumo', async () => {
      await coletar({ tipo_contrato: 'horas' });

      expect(consultasOnde(ehH)).toHaveLength(1);
      expect(consultasOnde(ehI)).toHaveLength(6);
      expect(consultasOnde(ehTH)).toHaveLength(0);
      expect(consultasOnde(ehTI)).toHaveLength(0);
    });

    it.each(['tickets', 'ambos'])(
      'contrato "%s": só a visão de tickets (T-H e T-I); horas não são consultadas',
      async (tipo) => {
        await coletar({ tipo_contrato: tipo });

        expect(consultasOnde(ehH)).toHaveLength(0);
        expect(consultasOnde(ehI)).toHaveLength(0);
        expect(consultasOnde(ehTH)).toHaveLength(1);
        expect(consultasOnde(ehTI)).toHaveLength(6);
      }
    );

    it('"ambos" produz exatamente a mesma saída que "tickets"', async () => {
      responder(ehTH, [{ cod_tipo: 'Incidente', cod_resolucao: 'Dúvida' }]);
      const comTickets = (await coletar({ tipo_contrato: 'tickets' })).consumo;
      const comAmbos = (await coletar({ tipo_contrato: 'ambos' })).consumo;

      expect(comAmbos).toEqual(comTickets);
    });

    it('tipo_contrato fora de horas/tickets/ambos (ex.: null): nenhuma consulta de consumo e saída formatada como horas', async () => {
      const { consumo } = await coletar({ tipo_contrato: null });

      expect(consultasOnde(ehH).length + consultasOnde(ehI).length).toBe(0);
      expect(consultasOnde(ehTH).length + consultasOnde(ehTI).length).toBe(0);
      expect(consumo.horas_consumo).toBe('00:00:00');
      expect(consumo.historico_consumo.every((h) => h.horas === '00:00:00')).toBe(true);
    });
  });

  describe('[RC-146] requerimentos descontados no book', () => {
    it('[RC-146] descontados do mês: status enviado_faturamento/faturado/concluido e SEM filtro enviado_faturamento (o motor exige enviado_faturamento = true)', async () => {
      await coletar();
      const descontados = unica(ehDescontados);
      const motor = await regrasDoMotor();

      expect(filtrosDe(descontados)).toEqual([
        ['eq', ['cliente_id', EMPRESA_ID]],
        ['eq', ['mes_cobranca', '01/2026']],
        ['eq', ['tipo_cobranca', 'Banco de Horas']],
        ['in', ['status', ['enviado_faturamento', 'faturado', 'concluido']]],
        ['order', ['data_envio_faturamento', { ascending: false }]],
      ]);
      expect(motor.filtrosRequerimentos).toContainEqual(['eq', ['enviado_faturamento', true]]);
      expect(motor.filtrosRequerimentos).toContainEqual([
        'in',
        ['status', ['enviado_faturamento', 'faturado']],
      ]);
    });

    it('[RC-146] histórico de requerimentos (6 meses): mesmos status, também sem filtro enviado_faturamento', async () => {
      await coletar({}, 2, 2026);

      const historico = consultasOnde(ehHistoricoRequerimentos);
      expect(historico.map((c) => valorDe(c, 'eq', 'mes_cobranca'))).toEqual([
        '09/2025',
        '10/2025',
        '11/2025',
        '12/2025',
        '01/2026',
        '02/2026',
      ]);
      expect(filtrosDe(historico[5])).toEqual([
        ['eq', ['cliente_id', EMPRESA_ID]],
        ['eq', ['mes_cobranca', '02/2026']],
        ['eq', ['tipo_cobranca', 'Banco de Horas']],
        ['in', ['status', ['enviado_faturamento', 'faturado', 'concluido']]],
      ]);
    });

    it('descontado: total = funcional + técnico em "HH:MM:00"; tickets sempre 0; valor_total 0 se faltar um dos dois valores; ticket externo pelo número sem "RF-"', async () => {
      responder(ehDescontados, [
        {
          id: 'req-1',
          chamado: 'RF-123',
          cliente_id: EMPRESA_ID,
          modulo: 'FI',
          tipo_cobranca: 'Banco de Horas',
          horas_funcional: 1.5,
          horas_tecnico: 0.25,
          quantidade_tickets: 4,
          valor_total_funcional: 300,
          valor_total_tecnico: null,
          mes_cobranca: '01/2026',
          data_envio_faturamento: '2026-01-20',
          data_aprovacao: null,
        },
      ]);
      responder(
        (c) =>
          c.tabela === 'apontamentos_tickets_aranda' &&
          selectDe(c) === 'nro_solicitacao, ticket_externo',
        [{ nro_solicitacao: '123', ticket_externo: ' EXT-9 ' }]
      );

      const { consumo } = await coletar();

      expect(consumo.requerimentos_descontados).toEqual([
        {
          id: 'req-1',
          numero_chamado: 'RF-123',
          ticket_externo: 'EXT-9',
          cliente: EMPRESA_ID,
          modulo: 'FI',
          tipo_cobranca: 'Banco de Horas',
          horas_funcional: '1.5',
          horas_tecnica: '0.25',
          total_horas: '01:45:00',
          tickets: 0,
          data_envio: '2026-01-20',
          data_aprovacao: null,
          valor_total: 0,
          periodo_cobranca: '01/2026',
        },
      ]);
    });

    it('histórico: contrato "horas" soma funcional + técnico (gestor não entra); "tickets" soma quantidade_tickets', async () => {
      const linhas = [
        { horas_funcional: 1.5, horas_tecnico: 0.5, horas_gestor: 10, quantidade_tickets: 2 },
        { horas_funcional: 0.25, horas_tecnico: null, horas_gestor: 3, quantidade_tickets: null },
      ];
      responder(
        (c) => ehHistoricoRequerimentos(c) && valorDe(c, 'eq', 'mes_cobranca') === '01/2026',
        linhas
      );

      const horas = (await coletar({ tipo_contrato: 'horas' })).consumo.historico_consumo[5];
      const tickets = (await coletar({ tipo_contrato: 'tickets' })).consumo.historico_consumo[5];

      expect(horas).toMatchObject({
        mes: 'JAN',
        requerimentos_horas: '02:15:00',
        requerimentos_valor_numerico: 2.25,
      });
      expect(tickets).toMatchObject({
        mes: 'JAN',
        requerimentos_horas: '2',
        requerimentos_valor_numerico: 2,
      });
    });
  });

  describe('abas de requerimentos do book', () => {
    const ehEmDesenvolvimento = (c: Consulta) =>
      c.tabela === 'requerimentos' && valorDe(c, 'eq', 'status') === 'lancado';
    const ehFaturadosDoBook = (c: Consulta) =>
      c.tabela === 'requerimentos' && tem(c, 'in', 'status') && tem(c, 'order', 'chamado');

    it('requerimentos em desenvolvimento levam a descrição', async () => {
      responder(ehEmDesenvolvimento, [
        {
          id: 'req-d',
          chamado: 'RF-1',
          descricao: 'Nova interface',
          data_envio: '2026-01-10',
          horas_funcional: 1,
        },
      ]);

      const { requerimentos_em_desenvolvimento } = await coletar();

      expect(requerimentos_em_desenvolvimento[0]).toMatchObject({
        numero_chamado: 'RF-1',
        descricao: 'Nova interface',
      });
    });

    it('coleta os requerimentos faturados do mês para a aba "Requerimentos Faturados"', async () => {
      responder(ehFaturadosDoBook, [
        {
          id: 'req-f',
          chamado: 'RF-2',
          descricao: 'Ajuste fiscal',
          horas_tecnico: 24,
          mes_cobranca: '01/2026',
        },
      ]);

      const { requerimentos_faturados } = await coletar();

      expect(filtrosDe(unica(ehFaturadosDoBook))).toEqual([
        ['eq', ['cliente_id', EMPRESA_ID]],
        ['eq', ['mes_cobranca', '01/2026']],
        ['eq', ['tipo_cobranca', 'Banco de Horas']],
        ['in', ['status', ['enviado_faturamento', 'faturado', 'concluido']]],
        ['order', ['chamado', { ascending: true }]],
      ]);
      expect(requerimentos_faturados).toEqual([
        expect.objectContaining({
          numero_chamado: 'RF-2',
          descricao: 'Ajuste fiscal',
          total_horas: '24:00',
          status: 'Faturado',
        }),
      ]);
    });
  });

  describe('[RC-148] consumo segmentado — percentual de repasse', () => {
    const SEGMENTADA = {
      baseline_segmentado: true,
      segmentacao_config: {
        empresas: [{ nome: 'SEG A', percentual: 100, filtro_tipo: 'x', filtro_valor: 'y' }],
      },
    };

    beforeEach(() => {
      estado.rpc.get_baseline_vigente = [{ baseline_horas: 10, baseline_tickets: null }];
    });

    it('[RC-148] sem percentual cadastrado, o repasse é 50% (o motor usa 100%)', async () => {
      const { consumo_segmentado } = await coletar({
        ...SEGMENTADA,
        percentual_repasse_mensal: null,
      });

      const [jan, fev] = consumo_segmentado![0].dadosPorMes;
      expect(jan).toMatchObject({ baseline: 600, saldo: 600, repasse: 300 });
      expect(fev).toMatchObject({ repasseMesAnterior: 300, saldoAUtilizar: 900 });
    });

    it('[RC-148] percentual 0 também vira 50% (o fallback usa ||, não ??)', async () => {
      const { consumo_segmentado } = await coletar({ ...SEGMENTADA, percentual_repasse_mensal: 0 });

      expect(consumo_segmentado![0].dadosPorMes[0].repasse).toBe(300);
    });

    it('percentual cadastrado é respeitado (80%)', async () => {
      const { consumo_segmentado } = await coletar({
        ...SEGMENTADA,
        percentual_repasse_mensal: 80,
      });

      expect(consumo_segmentado![0].dadosPorMes[0].repasse).toBe(480);
    });

    it('baseline decimal do histórico (10,5 h) vira 10 h: a fração é descartada ao ler o número como "HH:MM"', async () => {
      estado.rpc.get_baseline_vigente = [{ baseline_horas: 10.5, baseline_tickets: null }];

      const { consumo_segmentado } = await coletar({
        ...SEGMENTADA,
        percentual_repasse_mensal: 100,
      });

      expect(consumo_segmentado![0].baseline).toBe(600);
    });

    it('requerimentos do segmento: status inclui "concluido" e "em_desenvolvimento", sem filtro de tipo_cobranca nem enviado_faturamento', async () => {
      await coletar({ ...SEGMENTADA, percentual_repasse_mensal: 100 });

      const jan = consultasOnde(ehRequerimentosSegmentados).find(
        (c) => valorDe(c, 'eq', 'mes_cobranca') === '01/2026'
      )!;
      expect(filtrosDe(jan)).toEqual([
        ['eq', ['cliente_id', EMPRESA_ID]],
        ['eq', ['mes_cobranca', '01/2026']],
        ['eq', ['empresa_segmentacao_nome', 'SEG A']],
        ['in', ['status', ['enviado_faturamento', 'faturado', 'concluido', 'em_desenvolvimento']]],
      ]);
    });
  });
});
