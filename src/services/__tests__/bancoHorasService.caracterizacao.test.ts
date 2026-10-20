/**
 * Testes de CARACTERIZAÇÃO do motor de cálculo atual (bancoHorasService.calcularMes).
 *
 * Registram o comportamento de HOJE, inclusive os defeitos catalogados no
 * Inventário de Regras e Funcionalidades Atuais (códigos RC-xx). Servem de linha
 * de base para a comparação Legado x Novo da reconstrução do banco de horas
 * (Especificação v2.0, Fase 0). Um teste marcado com RC-xx NÃO descreve o
 * comportamento desejado: no sistema novo a regra é corrigida (ver
 * docs/especificacoes/Decisoes_Negocio_Bancos_de_Horas.md).
 *
 * Roda o motor real (orquestração, repasse e excedentes) sobre um Supabase em
 * memória. Consumo/requerimentos (bancoHorasIntegracaoService) e fechamento
 * (bancoHorasQuarentenaService) são simulados: as consultas de consumo têm
 * caracterização própria.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { criarSupabaseEmMemoria, type SupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';

const estado = vi.hoisted(() => ({
  supabase: null as any,
  consumo: new Map<string, { horas: string; tickets: number }>(),
  requerimentos: new Map<string, { horas: string; tickets: number }>(),
  fechamentos: new Map<string, any>(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: new Proxy({}, { get: (_alvo, prop) => estado.supabase[prop] }),
}));

vi.mock('../bancoHorasIntegracaoService', () => ({
  bancoHorasIntegracaoService: {
    buscarConsumo: vi.fn(async (_empresaId: string, mes: number, ano: number) =>
      estado.consumo.get(`${mes}/${ano}`) ?? { horas: '0:00', tickets: 0 }
    ),
    buscarRequerimentos: vi.fn(async (_empresaId: string, mes: number, ano: number) =>
      estado.requerimentos.get(`${mes}/${ano}`) ?? { horas: '0:00', tickets: 0 }
    ),
  },
}));

vi.mock('../bancoHorasQuarentenaService', () => ({
  bancoHorasQuarentenaService: {
    buscarFechamento: vi.fn(async (_empresaId: string, mes: number, ano: number) => estado.fechamentos.get(`${mes}/${ano}`) ?? null),
  },
}));

import { bancoHorasService, CalculationError } from '../bancoHorasService';
import { bancoHorasIntegracaoService } from '../bancoHorasIntegracaoService';

const EMPRESA = 'emp-1';

interface OpcoesCenario {
  empresa?: Record<string, any>;
  /** Linhas de get_baseline_vigente; [] = sem histórico */
  baseline?: Record<string, any>[];
  /** Linhas de get_percentual_repasse_vigente; [] = sem histórico */
  percentual?: Record<string, any>[];
  /** false = cliente sem taxa cadastrada */
  comTaxa?: boolean;
  reajustes?: Record<string, any>[];
  calculos?: Record<string, any>[];
}

let banco: SupabaseEmMemoria;

function montarCenario(opcoes: OpcoesCenario = {}) {
  const empresa = {
    id: EMPRESA,
    nome_abreviado: 'ACME',
    nome_completo: 'ACME INDÚSTRIA S.A.',
    tipo_contrato: 'horas',
    periodo_apuracao: 3,
    inicio_vigencia: '2026-01-01',
    baseline_horas_mensal: '8:00',
    baseline_tickets_mensal: null,
    possui_repasse_especial: false,
    tipo_repasse_especial: 'simples',
    ciclos_para_zerar: 1,
    percentual_repasse_mensal: 100,
    percentual_repasse_especial: null,
    duracao_periodo_meses: null,
    percentual_dentro_periodo: null,
    percentual_entre_periodos: null,
    periodos_ate_zerar: null,
    ciclo_atual: 1,
    dia_inicio_apuracao: 1,
    dia_fim_apuracao: 0,
    ...opcoes.empresa,
  };

  const comTaxa = opcoes.comTaxa !== false;
  banco = criarSupabaseEmMemoria(
    {
      empresas_clientes: [empresa],
      banco_horas_calculos: opcoes.calculos ?? [],
      banco_horas_reajustes: opcoes.reajustes ?? [],
      taxas_clientes: comTaxa
        ? [
            {
              id: 'taxa-1',
              cliente_id: EMPRESA,
              vigencia_inicio: '2025-01-01',
              vigencia_fim: null,
              tipo_produto: 'COMEX',
              tipo_calculo_adicional: 'normal',
              valor_ticket_excedente: 99,
              ticket_excedente_2: null,
              ticket_excedente: null,
            },
          ]
        : [],
      // Funcional 200,00 + 15% = 230,00 por hora excedente
      valores_taxas_funcoes: comTaxa
        ? [{ taxa_id: 'taxa-1', tipo_hora: 'remota', funcao: 'Funcional', valor_base: 200, valor_adicional: null }]
        : [],
    },
    {
      get_baseline_vigente: () =>
        opcoes.baseline ?? [
          { baseline_horas: 10, baseline_tickets: null, data_inicio: '2026-01-01', data_fim: null, tipo_banco: 'mensal' },
        ],
      get_percentual_repasse_vigente: () =>
        opcoes.percentual ?? [{ percentual: 50, data_inicio: '2026-01-01', data_fim: null, motivo: 'inicial' }],
    }
  );
  estado.supabase = banco;
}

function consumo(mes: number, ano: number, horas: string, tickets = 0) {
  estado.consumo.set(`${mes}/${ano}`, { horas, tickets });
}

function requerimentos(mes: number, ano: number, horas: string, tickets = 0) {
  estado.requerimentos.set(`${mes}/${ano}`, { horas, tickets });
}

/** Linha gravada em banco_horas_calculos */
function gravado(mes: number, ano: number) {
  return banco.tabelas.banco_horas_calculos.find((c) => c.empresa_id === EMPRESA && c.mes === mes && c.ano === ano);
}

async function calcularMeses(...meses: [number, number][]) {
  for (const [mes, ano] of meses) await bancoHorasService.calcularMes(EMPRESA, mes, ano);
}

describe('Caracterização — bancoHorasService.calcularMes', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    estado.consumo.clear();
    estado.requerimentos.clear();
    estado.fechamentos.clear();
    vi.mocked(bancoHorasIntegracaoService.buscarConsumo).mockClear();
  });

  afterEach(() => vi.restoreAllMocks());

  describe('trimestre de horas (repasse mensal 50%, baseline 10h, taxa 230,00)', () => {
    beforeEach(async () => {
      montarCenario();
      consumo(1, 2026, '6:00');
      consumo(2, 2026, '13:00');
      consumo(3, 2026, '11:30');
      await calcularMeses([1, 2026], [2, 2026], [3, 2026], [4, 2026]);
    });

    it('1º mês da vigência: sem repasse anterior; saldo positivo repassa 50%', () => {
      expect(gravado(1, 2026)).toMatchObject({
        baseline_horas: '10:00',
        repasses_mes_anterior_horas: '0:00',
        saldo_a_utilizar_horas: '10:00',
        consumo_horas: '6:00',
        consumo_total_horas: '6:00',
        saldo_horas: '4:00',
        repasse_horas: '2:00',
        is_fim_periodo: false,
        excedentes_horas: '0:00',
        valor_a_faturar: 0,
        taxa_hora_utilizada: 230,
      });
    });

    it('mês intermediário: recebe o repasse anterior; saldo negativo repassa 100% do déficit', () => {
      expect(gravado(2, 2026)).toMatchObject({
        repasses_mes_anterior_horas: '2:00',
        saldo_a_utilizar_horas: '12:00',
        saldo_horas: '-1:00',
        repasse_horas: '-1:00',
        is_fim_periodo: false,
        valor_a_faturar: 0,
      });
    });

    it('fim do período com saldo negativo: gera excedente pela taxa de hora e não repassa', () => {
      const mar = gravado(3, 2026);
      expect(mar).toMatchObject({
        repasses_mes_anterior_horas: '-1:00',
        saldo_a_utilizar_horas: '9:00',
        saldo_horas: '-2:30',
        repasse_horas: '0:00',
        is_fim_periodo: true,
        excedentes_horas: '2:30',
        valor_excedentes_horas: 575,
        valor_a_faturar: 575,
        taxa_hora_utilizada: 230,
      });
      expect(mar.observacao_publica).toBe('Excedente de 2:30 horas no período 03/2026 - Valor: R$ 575,00');
    });

    it('1º mês do período seguinte: não herda nada do fim de período', () => {
      expect(gravado(4, 2026)).toMatchObject({
        repasses_mes_anterior_horas: '0:00',
        saldo_a_utilizar_horas: '10:00',
        is_fim_periodo: false,
      });
    });
  });

  it('fim de período com saldo positivo: zera, sem excedente', async () => {
    montarCenario({ empresa: { periodo_apuracao: 1 } });
    consumo(1, 2026, '4:00');
    await calcularMeses([1, 2026], [2, 2026]);

    expect(gravado(1, 2026)).toMatchObject({
      saldo_horas: '6:00',
      repasse_horas: '0:00',
      is_fim_periodo: true,
      excedentes_horas: '0:00',
      valor_a_faturar: 0,
    });
    expect(gravado(2, 2026)).toMatchObject({ repasses_mes_anterior_horas: '0:00' });
  });

  it('1º mês da vigência ignora cálculo de mês anterior já gravado', async () => {
    montarCenario({
      calculos: [{ empresa_id: EMPRESA, mes: 12, ano: 2025, repasse_horas: '5:00', repasse_tickets: 3, is_fim_periodo: false }],
    });
    await calcularMeses([1, 2026]);

    expect(gravado(1, 2026)).toMatchObject({ repasses_mes_anterior_horas: '0:00', repasses_mes_anterior_tickets: 0 });
  });

  it('[RC-22] mês anterior sem cálculo gravado: repasse vira zero sem aviso', async () => {
    montarCenario();
    consumo(1, 2026, '1:00');
    // Março calculado sem jan/fev gravados: o saldo positivo de jan/fev se perde
    await calcularMeses([3, 2026]);

    expect(gravado(3, 2026)).toMatchObject({ repasses_mes_anterior_horas: '0:00', saldo_a_utilizar_horas: '10:00' });
  });

  it('reajustes: saída soma no consumo total, entrada subtrai; inativos são ignorados', async () => {
    montarCenario({
      reajustes: [
        { empresa_id: EMPRESA, mes: 1, ano: 2026, tipo_reajuste: 'entrada', valor_reajuste_horas: '2:00', valor_reajuste_tickets: 0, ativo: true },
        { empresa_id: EMPRESA, mes: 1, ano: 2026, tipo_reajuste: 'saida', valor_reajuste_horas: '1:00', valor_reajuste_tickets: 0, ativo: true },
        { empresa_id: EMPRESA, mes: 1, ano: 2026, tipo_reajuste: 'entrada', valor_reajuste_horas: '9:00', valor_reajuste_tickets: 0, ativo: false },
      ],
    });
    consumo(1, 2026, '6:00');
    requerimentos(1, 2026, '0:30');
    await calcularMeses([1, 2026]);

    expect(gravado(1, 2026)).toMatchObject({
      requerimentos_horas: '0:30',
      reajustes_horas: '1:00',
      consumo_total_horas: '5:30',
      saldo_horas: '4:30',
    });
  });

  it('período fechado: usa o snapshot do fechamento e não consulta o consumo ao vivo', async () => {
    montarCenario();
    estado.fechamentos.set('1/2026', {
      snapshot_consumo_horas: '3:00',
      snapshot_consumo_tickets: 1,
      snapshot_requerimentos_horas: '1:00',
      snapshot_requerimentos_tickets: 0,
    });
    consumo(1, 2026, '50:00');
    await calcularMeses([1, 2026]);

    expect(gravado(1, 2026)).toMatchObject({ consumo_horas: '3:00', requerimentos_horas: '1:00', saldo_horas: '6:00' });
    expect(bancoHorasIntegracaoService.buscarConsumo).not.toHaveBeenCalled();
  });

  describe('baseline', () => {
    it('converte o baseline decimal do histórico para H:MM', async () => {
      montarCenario({
        baseline: [{ baseline_horas: 10.5, baseline_tickets: null, data_inicio: '2026-01-01', data_fim: null, tipo_banco: 'mensal' }],
      });
      await calcularMeses([1, 2026]);

      expect(gravado(1, 2026).baseline_horas).toBe('10:30');
    });

    it('sem histórico: usa baseline_horas_mensal do cadastro da empresa', async () => {
      montarCenario({ baseline: [] });
      await calcularMeses([1, 2026]);

      expect(gravado(1, 2026).baseline_horas).toBe('8:00');
    });

    it('banco anual: credita o baseline só no mês da vigência do baseline', async () => {
      montarCenario({
        empresa: { periodo_apuracao: 12 },
        baseline: [{ baseline_horas: 120, baseline_tickets: null, data_inicio: '2026-01-01', data_fim: null, tipo_banco: 'anual' }],
      });
      consumo(1, 2026, '10:00');
      await calcularMeses([1, 2026], [2, 2026]);

      expect(gravado(1, 2026)).toMatchObject({ baseline_horas: '120:00', saldo_horas: '110:00', repasse_horas: '55:00' });
      expect(gravado(2, 2026)).toMatchObject({ baseline_horas: '0:00', saldo_a_utilizar_horas: '55:00' });
    });
  });

  describe('percentual de repasse mensal', () => {
    it('0% vindo do histórico é respeitado no repasse mensal', async () => {
      montarCenario({ percentual: [{ percentual: 0, data_inicio: '2026-01-01', data_fim: null }] });
      consumo(1, 2026, '4:00');
      await calcularMeses([1, 2026]);

      expect(gravado(1, 2026)).toMatchObject({ saldo_horas: '6:00', repasse_horas: '0:00' });
    });

    it('sem histórico: usa o percentual do cadastro', async () => {
      montarCenario({ percentual: [], empresa: { percentual_repasse_mensal: 25 } });
      consumo(1, 2026, '2:00');
      await calcularMeses([1, 2026]);

      expect(gravado(1, 2026)).toMatchObject({ saldo_horas: '8:00', repasse_horas: '2:00' });
    });

    it('[RC-10] sem histórico e sem percentual no cadastro: assume 100%', async () => {
      montarCenario({ percentual: [], empresa: { percentual_repasse_mensal: null } });
      consumo(1, 2026, '2:00');
      await calcularMeses([1, 2026]);

      expect(gravado(1, 2026)).toMatchObject({ saldo_horas: '8:00', repasse_horas: '8:00' });
    });
  });

  describe('repasse especial', () => {
    it('[RC-31/RC-166] simples: 0% vira 100% e o repasse do fim de período é descartado no mês seguinte', async () => {
      montarCenario({
        empresa: {
          periodo_apuracao: 1,
          possui_repasse_especial: true,
          tipo_repasse_especial: 'simples',
          ciclos_para_zerar: 2,
          percentual_repasse_especial: 0,
        },
      });
      consumo(1, 2026, '6:00');
      await calcularMeses([1, 2026], [2, 2026]);

      // Ciclo 1 de 2: "repassa" 100% (deveria ser 0%) ...
      expect(gravado(1, 2026)).toMatchObject({ is_fim_periodo: true, saldo_horas: '4:00', repasse_horas: '4:00' });
      // ... mas fevereiro ignora o repasse de um mês de fim de período
      expect(gravado(2, 2026)).toMatchObject({ repasses_mes_anterior_horas: '0:00', saldo_a_utilizar_horas: '10:00' });
    });

    it('[RC-14/RC-166] por período com percentual_dentro_periodo = 0: cai no repasse simples (usa o % mensal)', async () => {
      montarCenario({
        empresa: {
          periodo_apuracao: 6,
          possui_repasse_especial: true,
          tipo_repasse_especial: 'por_periodo',
          duracao_periodo_meses: 3,
          percentual_dentro_periodo: 0,
          percentual_entre_periodos: 70,
          periodos_ate_zerar: 2,
        },
      });
      consumo(1, 2026, '6:00');
      await calcularMeses([1, 2026]);

      // Com 0% dentro do período o esperado seria repasse 0:00; hoje aplica os 50% mensais
      expect(gravado(1, 2026)).toMatchObject({ saldo_horas: '4:00', repasse_horas: '2:00' });
    });
  });

  describe('contrato "ambos"', () => {
    beforeEach(async () => {
      montarCenario({
        empresa: { tipo_contrato: 'ambos', periodo_apuracao: 1 },
        baseline: [{ baseline_horas: 10, baseline_tickets: 5, data_inicio: '2026-01-01', data_fim: null, tipo_banco: 'mensal' }],
      });
      consumo(1, 2026, '8:00', 7);
      requerimentos(1, 2026, '3:00', 0);
      await calcularMeses([1, 2026]);
    });

    it('[RC-04] horas: o consumo dos chamados é zerado; só requerimentos e reajustes movem o saldo', () => {
      expect(gravado(1, 2026)).toMatchObject({
        consumo_horas: '0:00',
        requerimentos_horas: '3:00',
        consumo_total_horas: '3:00',
        saldo_horas: '7:00',
        excedentes_horas: '0:00',
        valor_excedentes_horas: 0,
      });
    });

    it('[RC-74] tickets: o excedente de tickets é faturado pela taxa de HORA (230), não pela de ticket (99)', () => {
      expect(gravado(1, 2026)).toMatchObject({
        consumo_tickets: 7,
        saldo_tickets: -2,
        excedentes_tickets: 2,
        taxa_ticket_utilizada: 230,
        valor_excedentes_tickets: 460,
        valor_a_faturar: 460,
      });
    });
  });

  describe('contrato de tickets', () => {
    beforeEach(async () => {
      montarCenario({
        empresa: { tipo_contrato: 'tickets', baseline_horas_mensal: null },
        baseline: [{ baseline_horas: null, baseline_tickets: 10, data_inicio: '2026-01-01', data_fim: null, tipo_banco: 'mensal' }],
      });
      consumo(1, 2026, '0:00', 5);
      consumo(2, 2026, '0:00', 0);
      consumo(3, 2026, '0:00', 20);
      await calcularMeses([1, 2026], [2, 2026], [3, 2026]);
    });

    it('não busca taxa de hora; usa a taxa de ticket do cadastro', () => {
      expect(gravado(1, 2026)).toMatchObject({ taxa_hora_utilizada: null, taxa_ticket_utilizada: 99 });
    });

    it('[RC-56/RC-177] repasse de tickets passa pela conta de horas: 5 tickets × 50% = "2:30" → grava 2', () => {
      expect(gravado(1, 2026)).toMatchObject({ saldo_tickets: 5, repasse_tickets: 2 });
      expect(gravado(2, 2026)).toMatchObject({ repasses_mes_anterior_tickets: 2, saldo_a_utilizar_tickets: 12, repasse_tickets: 6 });
    });

    it('fim de período com saldo negativo: excedente de tickets pela taxa de ticket', () => {
      expect(gravado(3, 2026)).toMatchObject({
        saldo_a_utilizar_tickets: 16,
        saldo_tickets: -4,
        is_fim_periodo: true,
        excedentes_tickets: 4,
        valor_excedentes_tickets: 396,
        valor_a_faturar: 396,
      });
    });
  });

  it('cliente sem taxa: calcula o excedente, mas valor zero e alerta na observação', async () => {
    montarCenario({ comTaxa: false, empresa: { periodo_apuracao: 1 } });
    consumo(1, 2026, '12:30');
    await calcularMeses([1, 2026]);

    expect(gravado(1, 2026)).toMatchObject({
      saldo_horas: '-2:30',
      excedentes_horas: '2:30',
      valor_excedentes_horas: 0,
      valor_a_faturar: 0,
      taxa_hora_utilizada: null,
      observacao_publica: 'Taxa não encontrada para o período. Excedente não pode ser calculado.',
    });
  });

  describe('erros', () => {
    it('sem tipo de contrato: CalculationError na validação dos parâmetros', async () => {
      montarCenario({ empresa: { tipo_contrato: null } });

      await expect(bancoHorasService.calcularMes(EMPRESA, 1, 2026)).rejects.toMatchObject({
        name: 'CalculationError',
        step: 'validar_parametros',
      });
    });

    it('empresa inexistente: CalculationError na busca dos parâmetros', async () => {
      montarCenario();

      const erro = await bancoHorasService.calcularMes('outra-empresa', 1, 2026).catch((e) => e);
      expect(erro).toBeInstanceOf(CalculationError);
      expect(erro.step).toBe('buscar_parametros');
    });
  });
});
