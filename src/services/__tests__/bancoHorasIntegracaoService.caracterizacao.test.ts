/**
 * Testes de CARACTERIZAÇÃO da regra de consumo atual (bancoHorasIntegracaoService),
 * usada pelo motor de cálculo (bancoHorasService.calcularMes).
 *
 * Registram os filtros exatos que definem o que é hora/ticket AMS válido e como
 * os valores são somados HOJE. É a base da "regra única de consumo" do sistema
 * novo (Especificação v2.0, RN-08; Inventário RC-61 a RC-70 e seção 8). Esta é
 * só UMA das cópias da regra: o Book, o Excel e o Saldo Parcial têm variações
 * (Inventário, seção 8.1), que não estão cobertas aqui.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const estado = vi.hoisted(() => ({
  resultados: {} as Record<string, any[]>,
  consultas: [] as { tabela: string; chamadas: [string, any[]][] }[],
}));

vi.mock('@/integrations/supabase/client', () => {
  /** Builder que registra cada chamada e resolve com as linhas configuradas para a tabela */
  const from = (tabela: string) => {
    const consulta = { tabela, chamadas: [] as [string, any[]][] };
    estado.consultas.push(consulta);
    let unico = false;
    const builder: any = new Proxy(
      {},
      {
        get(_alvo, prop: string) {
          if (prop === 'then') {
            const linhas = estado.resultados[tabela] ?? [];
            const resultado = unico
              ? linhas.length
                ? { data: linhas[0], error: null }
                : { data: null, error: { message: 'não encontrado' } }
              : { data: linhas, error: null };
            return (ok: any, falha: any) => Promise.resolve(resultado).then(ok, falha);
          }
          return (...args: any[]) => {
            if (prop === 'single' || prop === 'maybeSingle') unico = true;
            consulta.chamadas.push([prop, args]);
            return builder;
          };
        },
      }
    );
    return builder;
  };
  return { supabase: { from } };
});

import { bancoHorasIntegracaoService } from '../bancoHorasIntegracaoService';

const EMPRESA = { nome_abreviado: 'ACME', nome_completo: 'ACME INDÚSTRIA S.A.' };
const GRUPOS_AMS_APONTAMENTOS =
  'caso_grupo.ilike.%AMS APL%,caso_grupo.ilike.%AMS - APL%,caso_grupo.ilike.%AMS - ATENDIMENTO%,caso_grupo.ilike.%AMS T&M%';
const GRUPOS_AMS_TICKETS =
  'nome_grupo.ilike.%AMS APL%,nome_grupo.ilike.%AMS - APL%,nome_grupo.ilike.%AMS - ATENDIMENTO%,nome_grupo.ilike.%AMS T&M%';

/** Chamadas de filtro (sem o select) da primeira consulta à tabela */
function filtros(tabela: string) {
  const consulta = estado.consultas.find((c) => c.tabela === tabela);
  if (!consulta) throw new Error(`Nenhuma consulta a ${tabela}`);
  return consulta.chamadas.filter(([metodo]) => metodo !== 'select');
}

function codigosResolucao(tabela: string): string[] {
  return filtros(tabela).find(([metodo, args]) => metodo === 'in' && args[0] === 'cod_resolucao')![1][1];
}

describe('Caracterização — regra de consumo (bancoHorasIntegracaoService)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    estado.consultas = [];
    estado.resultados = { empresas_clientes: [EMPRESA], apontamentos_aranda: [], apontamentos_tickets_aranda: [], requerimentos: [] };
  });

  afterEach(() => vi.restoreAllMocks());

  describe('horas (apontamentos_aranda)', () => {
    it('filtros que definem hora AMS válida', async () => {
      await bancoHorasIntegracaoService.buscarConsumo('emp-1', 1, 2026);

      expect(filtros('apontamentos_aranda')).toEqual([
        ['eq', ['ativi_interna', 'Não']],
        ['neq', ['item_configuracao', '000000 - PROJETOS APL']],
        ['in', ['tipo_chamado', ['IM', 'RF', 'PM']]],
        ['or', [GRUPOS_AMS_APONTAMENTOS]],
        ['gte', ['data_atividade', new Date(2026, 0, 1).toISOString()]],
        ['lte', ['data_atividade', new Date(2026, 0, 31, 23, 59, 59, 999).toISOString()]],
        ['in', ['cod_resolucao', expect.any(Array)]],
        ['ilike', ['org_us_final', 'ACME INDÚSTRIA S.A.']],
        ['limit', [10000]],
      ]);
    });

    it('[Inv. 5] liga a empresa ao Aranda pelo NOME COMPLETO (renomear desliga o consumo)', async () => {
      await bancoHorasIntegracaoService.buscarConsumo('emp-1', 1, 2026);

      expect(filtros('apontamentos_aranda')).toContainEqual(['ilike', ['org_us_final', EMPRESA.nome_completo]]);
    });

    it('[RC-70/D-16] bordas do mês na hora LOCAL do processo, convertidas para UTC', async () => {
      await bancoHorasIntegracaoService.buscarConsumo('emp-1', 1, 2026);

      const gte = filtros('apontamentos_aranda').find(([m]) => m === 'gte')![1][1];
      // Em America/Sao_Paulo vira 2026-01-01T03:00:00.000Z; em UTC, T00:00:00.000Z
      expect(gte).toBe(new Date(2026, 0, 1).toISOString());
    });

    it('apuração customizada (dia 16 a 15): vai do dia 16 do mês ao dia 15 do mês seguinte', async () => {
      await bancoHorasIntegracaoService.buscarConsumo('emp-1', 12, 2026, 16, 15);

      const datas = filtros('apontamentos_aranda').filter(([m]) => m === 'gte' || m === 'lte');
      expect(datas).toEqual([
        ['gte', ['data_atividade', new Date(2026, 11, 16).toISOString()]],
        ['lte', ['data_atividade', new Date(2027, 0, 15, 23, 59, 59, 999).toISOString()]],
      ]);
    });

    it('lista de códigos de resolução: 51 entradas, 48 distintas (3 repetidas)', async () => {
      await bancoHorasIntegracaoService.buscarConsumo('emp-1', 1, 2026);

      const codigos = codigosResolucao('apontamentos_aranda');
      expect(codigos).toHaveLength(51);
      expect(new Set(codigos).size).toBe(48);
    });

    it('soma tempo_gasto_horas e, na falta dele, tempo_gasto_minutos; devolve "HH:MM" com zero à esquerda', async () => {
      estado.resultados.apontamentos_aranda = [
        { tempo_gasto_horas: '1:30', tempo_gasto_minutos: null },
        { tempo_gasto_horas: null, tempo_gasto_minutos: 45 },
        { tempo_gasto_horas: '0:20', tempo_gasto_minutos: 999 },
      ];

      const resultado = await bancoHorasIntegracaoService.buscarConsumo('emp-1', 1, 2026);

      // 90 + 45 + 20 = 155 min. O motor grava esse texto como veio ("02:35"), com zero à esquerda
      expect(resultado.horas).toBe('02:35');
    });

    it('sem nome completo no cadastro: erro NOME_COMPLETO_MISSING', async () => {
      estado.resultados.empresas_clientes = [{ nome_abreviado: 'ACME', nome_completo: null }];

      await expect(bancoHorasIntegracaoService.buscarConsumo('emp-1', 1, 2026)).rejects.toMatchObject({
        code: 'NOME_COMPLETO_MISSING',
      });
    });
  });

  describe('tickets (apontamentos_tickets_aranda)', () => {
    it('conta tickets fechados no mês pela data de fechamento, com os filtros abaixo', async () => {
      estado.resultados.apontamentos_tickets_aranda = [{ nro_solicitacao: 1 }, { nro_solicitacao: 2 }, { nro_solicitacao: 3 }];

      const resultado = await bancoHorasIntegracaoService.buscarConsumo('emp-1', 1, 2026);

      expect(resultado.tickets).toBe(3);
      expect(filtros('apontamentos_tickets_aranda')).toEqual([
        ['gte', ['data_fechamento', new Date(2026, 0, 1).toISOString()]],
        ['lte', ['data_fechamento', new Date(2026, 0, 31, 23, 59, 59, 999).toISOString()]],
        ['eq', ['status', 'Closed']],
        ['ilike', ['organizacao', 'ACME INDÚSTRIA S.A.']],
        ['neq', ['item_configuracao', '000000 - PROJETOS APL']],
        ['in', ['cod_resolucao', expect.any(Array)]],
        ['or', [GRUPOS_AMS_TICKETS]],
        ['limit', [5000]],
      ]);
    });

    it('[Inv. 8.2] tickets aceitam 47 códigos: "Nota Publicada (Banco=S| SLA=N)" só conta em horas', async () => {
      await bancoHorasIntegracaoService.buscarConsumo('emp-1', 1, 2026);

      const horas = new Set(codigosResolucao('apontamentos_aranda'));
      const tickets = new Set(codigosResolucao('apontamentos_tickets_aranda'));
      expect(tickets.size).toBe(47);
      expect([...horas].filter((c) => !tickets.has(c))).toEqual(['Nota Publicada (Banco=S| SLA=N)']);
      expect([...tickets].filter((c) => !horas.has(c))).toEqual([]);
    });

    it('[Inv. 8.2] tickets não filtram tipo de chamado nem atividade interna (apontamentos filtram)', async () => {
      await bancoHorasIntegracaoService.buscarConsumo('emp-1', 1, 2026);

      const colunas = filtros('apontamentos_tickets_aranda').map(([, args]) => args[0]);
      expect(colunas).not.toContain('tipo_chamado');
      expect(colunas).not.toContain('ativi_interna');
    });
  });

  describe('requerimentos', () => {
    it('só "Banco de Horas" enviados para faturamento, pelo mês de cobrança MM/AAAA', async () => {
      await bancoHorasIntegracaoService.buscarRequerimentos('emp-1', 3, 2026);

      expect(filtros('requerimentos')).toEqual([
        ['eq', ['tipo_cobranca', 'Banco de Horas']],
        ['eq', ['mes_cobranca', '03/2026']],
        ['eq', ['cliente_id', 'emp-1']],
        ['eq', ['enviado_faturamento', true]],
        ['in', ['status', ['enviado_faturamento', 'faturado']]],
      ]);
    });

    it('[D-01] soma horas funcional + técnico (gestor não entra) e a quantidade de tickets', async () => {
      estado.resultados.requerimentos = [
        { horas_funcional: 2, horas_tecnico: 0.5, horas_gestor: 10, quantidade_tickets: 1 },
        { horas_funcional: null, horas_tecnico: 1.25, horas_gestor: 3, quantidade_tickets: null },
      ];

      const resultado = await bancoHorasIntegracaoService.buscarRequerimentos('emp-1', 3, 2026);

      expect(resultado).toEqual({ horas: '3:45', tickets: 1 });
      const select = estado.consultas.find((c) => c.tabela === 'requerimentos')!.chamadas.find(([m]) => m === 'select')![1][0];
      expect(select).not.toContain('horas_gestor');
    });
  });
});
