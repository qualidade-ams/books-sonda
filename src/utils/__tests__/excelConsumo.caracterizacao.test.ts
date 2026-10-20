/**
 * Testes de CARACTERIZAÇÃO das cópias da regra de consumo usadas pelas PLANILHAS
 * EXCEL (Inventário de Regras e Funcionalidades Atuais, seção 8.1):
 *
 * - E   — gerarExcelConsumoHoras (anexo do Saldo Parcial / consumo de horas);
 * - F   — gerarExcelDetalhadoBook, aba "Horas";
 * - T-F — gerarExcelDetalhadoBook, aba "Tickets";
 * - RB-08 / FB-20 — quais abas de consumo o Excel detalhado gera por tipo de contrato.
 *
 * Registram o comportamento de HOJE, inclusive defeitos e divergências em relação
 * ao motor (bancoHorasIntegracaoService, caracterizado à parte). Servem de linha
 * de base para a comparação Legado x Novo da reconstrução do banco de horas
 * (Especificação v2.0, Fase 0). Um teste marcado com código do Inventário NÃO
 * descreve o comportamento desejado: no sistema novo a regra de consumo é única
 * (Especificação v2.0, RN-08). Testes marcados "[novo]" registram comportamento
 * observado no código que não está descrito no Inventário.
 *
 * Só o Supabase é simulado (builder que registra as chamadas e devolve linhas
 * configuradas, respeitando o limit). A geração da planilha (xlsx-js-style) é a
 * real: o arquivo gerado é relido em memória para inspecionar abas e linhas.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as XLSX from 'xlsx-js-style';

type Chamada = [string, any[]];
interface Consulta {
  tabela: string;
  chamadas: Chamada[];
}
type Resultado = any[] | ((consulta: Consulta) => any[]);

const estado = vi.hoisted(() => ({
  resultados: {} as Record<string, any>,
  consultas: [] as { tabela: string; chamadas: [string, any[]][] }[],
}));

vi.mock('@/integrations/supabase/client', () => {
  /** Builder que registra cada chamada e resolve com as linhas configuradas para a tabela (respeitando o limit) */
  const from = (tabela: string) => {
    const consulta = { tabela, chamadas: [] as [string, any[]][] };
    estado.consultas.push(consulta);
    let unico = false;
    const builder: any = new Proxy(
      {},
      {
        get(_alvo, prop: string) {
          if (prop === 'then') {
            const configurado = estado.resultados[tabela];
            let linhas: any[] = (typeof configurado === 'function' ? configurado(consulta) : configurado) ?? [];
            const limite = consulta.chamadas.find(([metodo]) => metodo === 'limit');
            if (limite) linhas = linhas.slice(0, limite[1][0]);
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

import { gerarExcelConsumoHoras } from '../gerarExcelConsumoHoras';
import { gerarExcelDetalhadoBook } from '../gerarExcelDetalhadoBook';
import { bancoHorasIntegracaoService } from '@/services/bancoHorasIntegracaoService';

const EMPRESA = { nome_abreviado: 'ACME', nome_completo: 'ACME INDÚSTRIA S.A.', tipo_contrato: 'horas' };
const GRUPOS_AMS_APONTAMENTOS =
  'caso_grupo.ilike.%AMS APL%,caso_grupo.ilike.%AMS - APL%,caso_grupo.ilike.%AMS - ATENDIMENTO%,caso_grupo.ilike.%AMS T&M%';
const GRUPOS_AMS_TICKETS =
  'nome_grupo.ilike.%AMS APL%,nome_grupo.ilike.%AMS - APL%,nome_grupo.ilike.%AMS - ATENDIMENTO%,nome_grupo.ilike.%AMS T&M%';
const SELECT_APONTAMENTOS =
  'nro_chamado, cod_resolucao, org_us_final, item_configuracao, categoria, caso_estado, nro_tarefa, tipo_chamado, data_sistema, data_atividade, data_abertura, data_fechamento, analista_tarefa, analista_caso, solicitante, tempo_gasto_horas, tempo_gasto_minutos, ativi_interna, grupo_tarefa, descricao_tarefa';
const ABAS_FIXAS_ANTES = ['Abertos', 'Fechados', 'SLA', 'Backlog'];
const ABAS_FIXAS_DEPOIS = ['Pesquisas_Enviadas', 'Pesquisas_Respondidas', 'Enviadas_E_Não_Respondidas'];
const ALOCACAO_SEM_TM = ['Alocação', 'Alocação (Banco=S |SLA=N)', 'Alocação (Banco=S| SLA=N)'];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** Consulta de tickets de CONSUMO do Excel detalhado (a única com o filtro de grupos AMS em nome_grupo) */
function ehConsultaTicketsConsumo(consulta: Consulta): boolean {
  return consulta.chamadas.some(([metodo, args]) => metodo === 'or' && String(args[0]).startsWith('nome_grupo.ilike'));
}

function consultasDe(tabela: string): Consulta[] {
  return estado.consultas.filter((c) => c.tabela === tabela);
}

/** Chamadas (sem o select) de uma consulta */
function semSelect(consulta: Consulta): Chamada[] {
  return consulta.chamadas.filter(([metodo]) => metodo !== 'select');
}

/** Chamadas de filtro (sem o select) da única consulta à tabela */
function filtros(tabela: string): Chamada[] {
  const consultas = consultasDe(tabela);
  if (consultas.length !== 1) throw new Error(`Esperada 1 consulta a ${tabela}, houve ${consultas.length}`);
  return semSelect(consultas[0]);
}

function consultaTicketsConsumo(): Consulta {
  const consulta = consultasDe('apontamentos_tickets_aranda').find(ehConsultaTicketsConsumo);
  if (!consulta) throw new Error('Nenhuma consulta de tickets de consumo');
  return consulta;
}

function datas(chamadas: Chamada[]): Chamada[] {
  return chamadas.filter(([metodo]) => metodo === 'gte' || metodo === 'lte' || metodo === 'lt');
}

/** Listas de códigos de resolução do MOTOR (bancoHorasIntegracaoService.buscarConsumo), lidas da consulta real */
async function listasDoMotor(): Promise<{ horas: string[]; tickets: string[] }> {
  const anteriores = estado.consultas;
  estado.consultas = [];
  await bancoHorasIntegracaoService.buscarConsumo('emp-1', 1, 2026);
  const codigos = (tabela: string): string[] =>
    filtros(tabela).find(([metodo, args]) => metodo === 'in' && args[0] === 'cod_resolucao')![1][1];
  const listas = { horas: codigos('apontamentos_aranda'), tickets: codigos('apontamentos_tickets_aranda') };
  estado.consultas = anteriores;
  return listas;
}

async function lerPlanilha(arquivo: File | null): Promise<XLSX.WorkBook> {
  if (!arquivo) throw new Error('Planilha não gerada');
  const conteudo = await new Promise<ArrayBuffer>((ok, falha) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(leitor.result as ArrayBuffer);
    leitor.onerror = () => falha(leitor.error);
    leitor.readAsArrayBuffer(arquivo);
  });
  return XLSX.read(new Uint8Array(conteudo), { type: 'array' });
}

/** Todas as linhas da aba (a primeira é o cabeçalho) */
function linhasDaAba(planilha: XLSX.WorkBook, aba: string): any[][] {
  return XLSX.utils.sheet_to_json(planilha.Sheets[aba], { header: 1, defval: '', blankrows: true, raw: true }) as any[][];
}

/** Valores da coluna CHAMADO nas linhas de dados (linhas com chamado preenchido) */
function chamadosDaAba(planilha: XLSX.WorkBook, aba: string): string[] {
  const [cabecalho, ...linhas] = linhasDaAba(planilha, aba);
  const coluna = cabecalho.indexOf('CHAMADO');
  return linhas.map((linha) => String(linha[coluna] ?? '')).filter((chamado) => /^\d+$/.test(chamado));
}

function apontamento(extra: Record<string, any> = {}) {
  return {
    nro_chamado: '1001',
    cod_resolucao: 'Consultoria',
    org_us_final: EMPRESA.nome_completo,
    item_configuracao: 'SISTEMA X',
    categoria: 'Categoria',
    caso_estado: 'Closed',
    nro_tarefa: 'T-1',
    tipo_chamado: 'IM',
    data_sistema: '2026-01-10T12:00:00.000Z',
    data_atividade: '2026-01-10T12:00:00.000Z',
    data_abertura: '2026-01-09T12:00:00.000Z',
    data_fechamento: '2026-01-11T12:00:00.000Z',
    analista_tarefa: 'Analista',
    analista_caso: 'Responsável',
    solicitante: 'Solicitante',
    tempo_gasto_horas: '1:00',
    tempo_gasto_minutos: 60,
    ativi_interna: 'Não',
    grupo_tarefa: 'AMS APL',
    descricao_tarefa: 'Tarefa',
    ...extra,
  };
}

function ticketConsumo(extra: Record<string, any> = {}) {
  return {
    nro_solicitacao: '5001',
    cod_tipo: 'Incidente',
    cod_resolucao: 'Consultoria (Banco=S |SLA=S)',
    categoria: 'Categoria',
    status: 'Closed',
    nome_grupo: 'AMS APL - FUNCIONAL',
    data_abertura: '2026-01-05T12:00:00.000Z',
    data_fechamento: '2026-01-12T12:00:00.000Z',
    nome_responsavel: 'Responsável',
    solicitante: 'Solicitante',
    cliente: 'Cliente',
    organizacao: EMPRESA.nome_completo,
    ...extra,
  };
}

/** Uma linha por código candidato, com chamado numérico distinto, para descobrir a lista aceita pelo filtro em JS */
function linhasPorCodigo(codigos: string[]) {
  return codigos.map((cod_resolucao, i) => apontamento({ nro_chamado: String(2000 + i), cod_resolucao }));
}

function codigosAceitos(candidatos: string[], chamados: string[]): string[] {
  return [...new Set(chamados.map((chamado) => candidatos[Number(chamado) - 2000]))].sort();
}

const unicosOrdenados = (lista: string[]) => [...new Set(lista)].sort();

function gerarDetalhado(extra: Record<string, any> = {}) {
  return gerarExcelDetalhadoBook({ empresaId: 'emp-1', empresaNome: 'ACME', mes: 1, ano: 2026, ...extra });
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('Caracterização — regra de consumo nas planilhas Excel', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    estado.consultas = [];
    estado.resultados = {
      empresas_clientes: [EMPRESA],
      apontamentos_aranda: [],
      apontamentos_tickets_aranda: [],
      pesquisas_satisfacao: [],
    } satisfies Record<string, Resultado>;
  });

  afterEach(() => vi.restoreAllMocks());

  describe('E — gerarExcelConsumoHoras (anexo do Saldo Parcial / consumo)', () => {
    it('filtros exatos da consulta de apontamentos (mês civil)', async () => {
      await gerarExcelConsumoHoras('emp-1', 'ACME', 1, 2026);

      expect(filtros('empresas_clientes')).toEqual([
        ['eq', ['id', 'emp-1']],
        ['single', []],
      ]);
      expect(consultasDe('apontamentos_aranda')[0].chamadas[0]).toEqual(['select', [SELECT_APONTAMENTOS]]);
      expect(filtros('apontamentos_aranda')).toEqual([
        ['eq', ['ativi_interna', 'Não']],
        ['neq', ['item_configuracao', '000000 - PROJETOS APL']],
        ['in', ['tipo_chamado', ['IM', 'RF', 'PM']]],
        ['or', [GRUPOS_AMS_APONTAMENTOS]],
        ['gte', ['data_atividade', '2026-01-01T00:00:00.000Z']],
        ['lte', ['data_atividade', '2026-01-31T23:59:59.999Z']],
        ['ilike', ['org_us_final', 'ACME INDÚSTRIA S.A.']],
        ['order', ['data_atividade', { ascending: true }]],
        ['limit', [10000]],
      ]);
    });

    it('[Inv. 8.1-E] liga a empresa ao Aranda pelo NOME COMPLETO exato (ilike sem curinga)', async () => {
      await gerarExcelConsumoHoras('emp-1', 'ACME', 1, 2026);

      const ilike = filtros('apontamentos_aranda').filter(([metodo]) => metodo === 'ilike');
      expect(ilike).toEqual([['ilike', ['org_us_final', EMPRESA.nome_completo]]]);
    });

    it('[novo] sem nome completo no cadastro: gera a planilha VAZIA, sem consultar apontamentos (o motor lança NOME_COMPLETO_MISSING)', async () => {
      estado.resultados.empresas_clientes = [{ nome_abreviado: 'ACME', nome_completo: null }];

      const planilha = await lerPlanilha(await gerarExcelConsumoHoras('emp-1', 'ACME', 1, 2026));

      expect(consultasDe('apontamentos_aranda')).toHaveLength(0);
      expect(planilha.SheetNames).toEqual(['Consumo de Horas']);
      expect(chamadosDaAba(planilha, 'Consumo de Horas')).toEqual([]);
    });

    it('[Inv. 8.1-E] período em UTC literal ("T00:00:00.000Z"); o motor usa a hora LOCAL convertida para UTC', async () => {
      await gerarExcelConsumoHoras('emp-1', 'ACME', 1, 2026);
      const inicioExcel = filtros('apontamentos_aranda').find(([metodo]) => metodo === 'gte')![1][1];

      expect(inicioExcel).toBe('2026-01-01T00:00:00.000Z');
      // Motor: new Date(2026, 0, 1).toISOString(). Só coincidem quando o processo roda em UTC;
      // em America/Sao_Paulo o motor começa em 2026-01-01T03:00:00.000Z (3h de diferença)
      const inicioMotor = new Date(2026, 0, 1).toISOString();
      expect(inicioExcel === inicioMotor).toBe(new Date(2026, 0, 1).getTimezoneOffset() === 0);
    });

    it('apuração customizada (dia 16 a 15): do dia 16 do mês ao dia 15 do mês seguinte, virando o ano', async () => {
      await gerarExcelConsumoHoras('emp-1', 'ACME', 12, 2026, undefined, undefined, 16, 15);

      expect(datas(filtros('apontamentos_aranda'))).toEqual([
        ['gte', ['data_atividade', '2026-12-16T00:00:00.000Z']],
        ['lte', ['data_atividade', '2027-01-15T23:59:59.999Z']],
      ]);
    });

    it('apuração customizada sem dia de fim (0): fim = dia de início - 1 no mês seguinte', async () => {
      await gerarExcelConsumoHoras('emp-1', 'ACME', 3, 2026, undefined, undefined, 21, 0);

      expect(datas(filtros('apontamentos_aranda'))).toEqual([
        ['gte', ['data_atividade', '2026-03-21T00:00:00.000Z']],
        ['lte', ['data_atividade', '2026-04-20T23:59:59.999Z']],
      ]);
    });

    it('dia de início 1 ignora o dia de fim informado (sempre mês civil)', async () => {
      await gerarExcelConsumoHoras('emp-1', 'ACME', 2, 2026, undefined, undefined, 1, 15);

      expect(datas(filtros('apontamentos_aranda'))).toEqual([
        ['gte', ['data_atividade', '2026-02-01T00:00:00.000Z']],
        ['lte', ['data_atividade', '2026-02-28T23:59:59.999Z']],
      ]);
    });

    it('[novo] dia de fim inexistente no mês seguinte (30/fev) "transborda" para o mês posterior', async () => {
      // dia_inicio 30, sem dia_fim: fim = dia 29 do mês seguinte -> "2026-02-29" não existe e vira 01/03
      await gerarExcelConsumoHoras('emp-1', 'ACME', 1, 2026, undefined, undefined, 30, 0);

      expect(datas(filtros('apontamentos_aranda'))).toEqual([
        ['gte', ['data_atividade', '2026-01-30T00:00:00.000Z']],
        ['lte', ['data_atividade', '2026-03-01T23:59:59.999Z']],
      ]);
    });

    it('[Inv. 8.1-E] código de resolução NÃO vai para a consulta: é filtrado em JS DEPOIS do limit(10000)', async () => {
      // O banco devolve as 10.000 primeiras linhas (todas com código inválido); a linha válida
      // fica além do limite e nunca chega ao filtro em JS
      const invalidas = Array.from({ length: 10000 }, (_, i) =>
        apontamento({ nro_chamado: String(10000 + i), cod_resolucao: 'Código fora da lista' })
      );
      estado.resultados.apontamentos_aranda = [...invalidas, apontamento({ nro_chamado: '99999' })];

      const planilha = await lerPlanilha(await gerarExcelConsumoHoras('emp-1', 'ACME', 1, 2026));

      const colunas = filtros('apontamentos_aranda').map(([, args]) => args[0]);
      expect(colunas).not.toContain('cod_resolucao');
      expect(filtros('apontamentos_aranda')).toContainEqual(['limit', [10000]]);
      expect(chamadosDaAba(planilha, 'Consumo de Horas')).toEqual([]);
    });

    it('[Inv. 8.1-E] linhas devolvidas pela consulta com código fora da lista (ou nulo, ou com caixa diferente) são descartadas', async () => {
      estado.resultados.apontamentos_aranda = [
        apontamento({ nro_chamado: '1001', cod_resolucao: 'Consultoria' }),
        apontamento({ nro_chamado: '1002', cod_resolucao: 'Código fora da lista' }),
        apontamento({ nro_chamado: '1003', cod_resolucao: null }),
        apontamento({ nro_chamado: '1004', cod_resolucao: 'consultoria' }),
        apontamento({ nro_chamado: '1005', cod_resolucao: 'Consultoria ' }),
      ];

      const planilha = await lerPlanilha(await gerarExcelConsumoHoras('emp-1', 'ACME', 1, 2026));

      expect(chamadosDaAba(planilha, 'Consumo de Horas')).toEqual(['1001']);
    });

    it('[Inv. 8.1-E] a lista em JS aceita exatamente os 48 códigos distintos da lista de horas do motor', async () => {
      const motor = await listasDoMotor();
      const candidatos = unicosOrdenados([
        ...motor.horas,
        ...motor.tickets,
        'Parametrização / Funcionalidade (Banco=S |SLA=S)',
        'Outro código qualquer',
      ]);
      estado.resultados.apontamentos_aranda = linhasPorCodigo(candidatos);

      const planilha = await lerPlanilha(await gerarExcelConsumoHoras('emp-1', 'ACME', 1, 2026));
      const aceitos = codigosAceitos(candidatos, chamadosDaAba(planilha, 'Consumo de Horas'));

      expect(aceitos).toHaveLength(48);
      expect(aceitos).toEqual(unicosOrdenados(motor.horas));
    });

    it('planilha: só a aba "Consumo de Horas" quando não há requerimentos nem observações; 22 colunas e linha de total zerada', async () => {
      const arquivo = await gerarExcelConsumoHoras('emp-1', 'ACME', 1, 2026);
      const planilha = await lerPlanilha(arquivo);

      expect(arquivo!.name).toBe('Consumo de Horas ACME - Janeiro 2026.xlsx');
      expect(planilha.SheetNames).toEqual(['Consumo de Horas']);
      const [cabecalho, ...resto] = linhasDaAba(planilha, 'Consumo de Horas');
      expect(cabecalho).toEqual([
        'CHAMADO', 'CÓDIGO RESOLUÇÃO', 'EMPRESA', 'CATEGORIA', 'ESTADO', 'TAREFA', 'TIPO TAREFA',
        'SERVIÇO TAREFA', 'DATA SISTEMA', 'DATA ATIVIDADE', 'DATA ABERTURA', 'DATA SOLUÇÃO', 'ANALISTA',
        'RESPONSÁVEL PELO CHAMADO', 'SOLICITANTE', 'HORAS', 'TEMPO (MINUTOS)', 'ATIVIDADE INTERNA',
        'GRUPO SOLUÇÃO', 'DESCRIÇÃO TAREFA', 'DESCRIÇÃO DA SOLICITAÇÃO', 'SOLUÇÃO',
      ]);
      const total = resto[resto.length - 1];
      expect(total[14]).toBe('Total de Horas:');
      expect(total[15]).toBe(0);
    });

    it('planilha: abas "Requerimentos" e "Observações" só aparecem quando recebidas', async () => {
      const planilha = await lerPlanilha(
        await gerarExcelConsumoHoras('emp-1', 'ACME', 1, 2026, [{ chamado: 'R-1', horas_funcional: 1.5 }], [{ tipo: 'manual', texto: 'obs' }])
      );

      expect(planilha.SheetNames).toEqual(['Consumo de Horas', 'Requerimentos', 'Observações']);
      expect(linhasDaAba(planilha, 'Requerimentos')[1].slice(0, 5)).toEqual(['R-1', '', '', '', '1:30']);
    });

    it('linhas: HORAS em fração de dia priorizando tempo_gasto_horas; código sem o sufixo "(Banco=...)"; descrição/solução vêm dos tickets', async () => {
      estado.resultados.apontamentos_aranda = [
        apontamento({ nro_chamado: '1001', cod_resolucao: 'Consultoria (Banco=S |SLA=S)', tempo_gasto_horas: '1:30', tempo_gasto_minutos: 999 }),
        apontamento({ nro_chamado: '1002', tempo_gasto_horas: null, tempo_gasto_minutos: 45 }),
        apontamento({ nro_chamado: '1001', tempo_gasto_horas: '0:15', tempo_gasto_minutos: 15 }),
      ];
      estado.resultados.apontamentos_tickets_aranda = [{ nro_solicitacao: '1001', descricao: 'Pedido', solucao: 'Resolvido' }];

      const planilha = await lerPlanilha(await gerarExcelConsumoHoras('emp-1', 'ACME', 1, 2026));
      const [, ...linhas] = linhasDaAba(planilha, 'Consumo de Horas');

      // Uma linha por apontamento, na ordem devolvida pela consulta (order data_atividade)
      expect(linhas.slice(0, 3).map((l) => [l[0], l[1], l[15], l[20], l[21]])).toEqual([
        ['1001', 'Consultoria', 90 / 1440, 'Pedido', 'Resolvido'],
        ['1002', 'Consultoria', 45 / 1440, '', ''],
        ['1001', 'Consultoria', 15 / 1440, 'Pedido', 'Resolvido'],
      ]);
      // Linha vazia e, em seguida, o total (90 + 45 + 15 = 150 min)
      expect(linhas[4][15]).toBeCloseTo(150 / 1440, 10);
      // Descrição/solução: consulta extra por número de chamado, sem repetição
      expect(semSelect(consultasDe('apontamentos_tickets_aranda')[0])).toEqual([['in', ['nro_solicitacao', ['1001', '1002']]]]);
    });
  });

  describe('F — gerarExcelDetalhadoBook, aba "Horas"', () => {
    it('[Inv. 8.1-F] consulta de apontamentos IDÊNTICA à do Excel de consumo (E): mesmo select, filtros, ordem e limite', async () => {
      await gerarExcelConsumoHoras('emp-1', 'ACME', 1, 2026, undefined, undefined, 16, 15);
      const consultaE = consultasDe('apontamentos_aranda')[0].chamadas;
      estado.consultas = [];

      await gerarDetalhado({ diaInicioApuracao: 16, diaFimApuracao: 15 });

      expect(consultasDe('apontamentos_aranda')).toHaveLength(1);
      expect(consultasDe('apontamentos_aranda')[0].chamadas).toEqual(consultaE);
    });

    it('[Inv. 8.1-F] período em UTC literal via calcularPeriodo, mês civil', async () => {
      await gerarDetalhado({ mes: 2, ano: 2028 });

      expect(datas(filtros('apontamentos_aranda'))).toEqual([
        ['gte', ['data_atividade', '2028-02-01T00:00:00.000Z']],
        ['lte', ['data_atividade', '2028-02-29T23:59:59.999Z']],
      ]);
    });

    it('apuração customizada respeitada (dia 16 a 15), virando o ano', async () => {
      await gerarDetalhado({ mes: 12, ano: 2026, diaInicioApuracao: 16, diaFimApuracao: 15 });

      expect(datas(filtros('apontamentos_aranda'))).toEqual([
        ['gte', ['data_atividade', '2026-12-16T00:00:00.000Z']],
        ['lte', ['data_atividade', '2027-01-15T23:59:59.999Z']],
      ]);
    });

    it('[novo] dia de fim inexistente no mês seguinte (30/fev) "transborda" para o mês posterior', async () => {
      await gerarDetalhado({ diaInicioApuracao: 30, diaFimApuracao: 0 });

      expect(datas(filtros('apontamentos_aranda'))).toEqual([
        ['gte', ['data_atividade', '2026-01-30T00:00:00.000Z']],
        ['lte', ['data_atividade', '2026-03-01T23:59:59.999Z']],
      ]);
    });

    it('[Inv. 8.1-F] código de resolução filtrado em JS DEPOIS do limit(10000)', async () => {
      const invalidas = Array.from({ length: 10000 }, (_, i) =>
        apontamento({ nro_chamado: String(10000 + i), cod_resolucao: 'Código fora da lista' })
      );
      estado.resultados.apontamentos_aranda = [...invalidas, apontamento({ nro_chamado: '99999' })];

      const planilha = await lerPlanilha(await gerarDetalhado());

      const colunas = filtros('apontamentos_aranda').map(([, args]) => args[0]);
      expect(colunas).not.toContain('cod_resolucao');
      expect(chamadosDaAba(planilha, 'Horas')).toEqual([]);
      expect(linhasDaAba(planilha, 'Horas')[2][0]).toBe('Não houve registros no período de Janeiro/2026.');
    });

    it('[Inv. 8.1-F] a lista em JS aceita exatamente os 48 códigos distintos da lista de horas do motor', async () => {
      const motor = await listasDoMotor();
      const candidatos = unicosOrdenados([
        ...motor.horas,
        ...motor.tickets,
        'Parametrização / Funcionalidade (Banco=S |SLA=S)',
        'Outro código qualquer',
      ]);
      estado.resultados.apontamentos_aranda = linhasPorCodigo(candidatos);

      const planilha = await lerPlanilha(await gerarDetalhado());
      const aceitos = codigosAceitos(candidatos, chamadosDaAba(planilha, 'Horas'));

      expect(aceitos).toHaveLength(48);
      expect(aceitos).toEqual(unicosOrdenados(motor.horas));
    });

    it('linhas ordenadas por número de chamado; TIPO traduzido; código sem parênteses; total ao final', async () => {
      estado.resultados.apontamentos_aranda = [
        apontamento({ nro_chamado: '1002', tipo_chamado: 'RF', tempo_gasto_horas: null, tempo_gasto_minutos: 45 }),
        apontamento({ nro_chamado: '1001', tipo_chamado: 'IM', cod_resolucao: 'Consultoria (Banco=S |SLA=S)', tempo_gasto_horas: '1:30' }),
      ];

      const planilha = await lerPlanilha(await gerarDetalhado());
      const [cabecalho, ...linhas] = linhasDaAba(planilha, 'Horas');

      expect(cabecalho).toEqual([
        'TIPO', 'CHAMADO', 'TAREFA', 'SOLICITANTE', 'CATEGORIA', 'GRUPO DE SOLUÇÃO', 'ANALISTA',
        'RESPONSÁVEL PELO CHAMADO', 'CÓDIGO RESOLUÇÃO', 'ESTADO', 'DATA SISTEMA', 'DATA ATIVIDADE',
        'DATA ABERTURA', 'DATA SOLUÇÃO', 'HORAS', 'TEMPO (MINUTOS)', 'DESCRIÇÃO TAREFA',
      ]);
      expect(linhas.slice(0, 2).map((l) => [l[0], l[1], l[8], l[14]])).toEqual([
        ['Incidente', '1001', 'Consultoria', 90 / 1440],
        ['Solicitação', '1002', 'Consultoria', 45 / 1440],
      ]);
      expect(linhas[3][13]).toBe('Total de Horas:');
      expect(linhas[3][14]).toBeCloseTo(135 / 1440, 10);
    });

    it('[novo] sem nome completo no cadastro: usa o nome recebido (abreviado) para casar com o Aranda', async () => {
      estado.resultados.empresas_clientes = [{ nome_completo: null, tipo_contrato: 'horas' }];

      await gerarDetalhado({ empresaNome: 'ACME' });

      expect(filtros('apontamentos_aranda')).toContainEqual(['ilike', ['org_us_final', 'ACME']]);
    });

    it('[novo] empresa não encontrada: segue com o nome recebido e contrato "horas"', async () => {
      estado.resultados.empresas_clientes = [];

      const planilha = await lerPlanilha(await gerarDetalhado({ empresaNome: 'ACME' }));

      expect(filtros('apontamentos_aranda')).toContainEqual(['ilike', ['org_us_final', 'ACME']]);
      expect(planilha.SheetNames).toContain('Horas');
    });
  });

  describe('T-F — gerarExcelDetalhadoBook, aba "Tickets"', () => {
    beforeEach(() => {
      estado.resultados.empresas_clientes = [{ ...EMPRESA, tipo_contrato: 'tickets' }];
    });

    it('filtros exatos da consulta de tickets de consumo', async () => {
      await gerarDetalhado();

      expect(consultaTicketsConsumo().chamadas[0]).toEqual([
        'select',
        ['nro_solicitacao, cod_tipo, cod_resolucao, categoria, status, nome_grupo, data_abertura, data_fechamento, nome_responsavel, solicitante, cliente, organizacao'],
      ]);
      expect(semSelect(consultaTicketsConsumo())).toEqual([
        ['ilike', ['organizacao', 'ACME INDÚSTRIA S.A.']],
        ['or', [GRUPOS_AMS_TICKETS]],
        ['eq', ['status', 'Closed']],
        ['neq', ['item_configuracao', '000000 - PROJETOS APL']],
        ['gte', ['data_fechamento', '2026-01-01T00:00:00.000Z']],
        ['lte', ['data_fechamento', '2026-01-31T23:59:59.999Z']],
        ['in', ['cod_resolucao', expect.any(Array)]],
        ['order', ['nro_solicitacao', { ascending: true }]],
        ['limit', [10000]],
      ]);
    });

    it('[Inv. 8.1-T-F] 46 códigos: sem as 3 "Alocação" e com 2 a mais que a lista de tickets do motor (47)', async () => {
      const motor = await listasDoMotor();
      await gerarDetalhado();

      const codigos: string[] = semSelect(consultaTicketsConsumo()).find(([metodo]) => metodo === 'in')![1][1];
      const lista = new Set(codigos);
      const motorTickets = new Set(motor.tickets);
      expect(codigos).toHaveLength(46);
      expect(lista.size).toBe(46);
      expect(motorTickets.size).toBe(47);
      expect([...motorTickets].filter((c) => !lista.has(c)).sort()).toEqual([...ALOCACAO_SEM_TM].sort());
      expect([...lista].filter((c) => !motorTickets.has(c)).sort()).toEqual(
        ['Nota Publicada (Banco=S| SLA=N)', 'Parametrização / Funcionalidade (Banco=S |SLA=S)'].sort()
      );
      // Contra a lista de HORAS do motor: faltam as 3 "Alocação" e sobra só a de SLA=S
      const motorHoras = new Set(motor.horas);
      expect([...lista].filter((c) => !motorHoras.has(c))).toEqual(['Parametrização / Funcionalidade (Banco=S |SLA=S)']);
    });

    it('[Inv. 8.1-T-F] período em UTC literal e SÓ mês civil: ignora a apuração customizada (a aba Horas respeita)', async () => {
      estado.resultados.empresas_clientes = [{ ...EMPRESA, tipo_contrato: 'ambos' }];

      await gerarDetalhado({ mes: 12, ano: 2026, diaInicioApuracao: 16, diaFimApuracao: 15 });

      expect(datas(semSelect(consultaTicketsConsumo()))).toEqual([
        ['gte', ['data_fechamento', '2026-12-01T00:00:00.000Z']],
        ['lte', ['data_fechamento', '2026-12-31T23:59:59.999Z']],
      ]);
      expect(datas(filtros('apontamentos_aranda'))).toEqual([
        ['gte', ['data_atividade', '2026-12-16T00:00:00.000Z']],
        ['lte', ['data_atividade', '2027-01-15T23:59:59.999Z']],
      ]);
    });

    it('[novo] código de resolução filtrado NA CONSULTA (não em JS, diferente de E/F): o que o banco devolver vai para a aba', async () => {
      estado.resultados.apontamentos_tickets_aranda = (consulta: Consulta) =>
        ehConsultaTicketsConsumo(consulta) ? [ticketConsumo({ nro_solicitacao: '5001', cod_resolucao: 'Código fora da lista' })] : [];

      const planilha = await lerPlanilha(await gerarDetalhado());

      expect(chamadosDaAba(planilha, 'Tickets')).toEqual(['5001']);
    });

    it('linhas ordenadas por chamado; ANALISTA e RESPONSÁVEL repetem nome_responsavel; código sem parênteses; sem linha de total', async () => {
      estado.resultados.apontamentos_tickets_aranda = (consulta: Consulta) =>
        ehConsultaTicketsConsumo(consulta)
          ? [ticketConsumo({ nro_solicitacao: '5002' }), ticketConsumo({ nro_solicitacao: '5001', cod_tipo: 'IM' })]
          : [];

      const planilha = await lerPlanilha(await gerarDetalhado());
      const [cabecalho, ...linhas] = linhasDaAba(planilha, 'Tickets');

      expect(cabecalho).toEqual([
        'TIPO', 'CHAMADO', 'SOLICITANTE', 'CLIENTE', 'CATEGORIA', 'GRUPO SOLUÇÃO', 'ANALISTA',
        'RESPONSÁVEL PELO CHAMADO', 'CÓDIGO RESOLUÇÃO', 'ESTADO', 'DATA ABERTURA', 'DATA FECHAMENTO',
      ]);
      expect(linhas.map((l) => [l[0], l[1], l[6], l[7], l[8]])).toEqual([
        ['Incidente', '5001', 'Responsável', 'Responsável', 'Consultoria'],
        ['Incidente', '5002', 'Responsável', 'Responsável', 'Consultoria'],
      ]);
    });

    it('sem tickets: aba com a mensagem "Não houve registros no período"', async () => {
      const planilha = await lerPlanilha(await gerarDetalhado());

      expect(chamadosDaAba(planilha, 'Tickets')).toEqual([]);
      expect(linhasDaAba(planilha, 'Tickets')[2][0]).toBe('Não houve registros no período de Janeiro/2026.');
    });
  });

  describe('RB-08 / FB-20 — abas de consumo do Excel detalhado por tipo de contrato', () => {
    it('contrato "horas": aba Horas, sem aba Tickets e sem consulta de tickets de consumo', async () => {
      const planilha = await lerPlanilha(await gerarDetalhado());

      expect(planilha.SheetNames).toEqual([...ABAS_FIXAS_ANTES, 'Horas', ...ABAS_FIXAS_DEPOIS]);
      expect(consultasDe('apontamentos_aranda')).toHaveLength(1);
      expect(consultasDe('apontamentos_tickets_aranda').filter(ehConsultaTicketsConsumo)).toHaveLength(0);
    });

    it('contrato "tickets": aba Tickets no lugar de Horas, sem consulta de apontamentos', async () => {
      estado.resultados.empresas_clientes = [{ ...EMPRESA, tipo_contrato: 'tickets' }];

      const planilha = await lerPlanilha(await gerarDetalhado());

      expect(planilha.SheetNames).toEqual([...ABAS_FIXAS_ANTES, 'Tickets', ...ABAS_FIXAS_DEPOIS]);
      expect(consultasDe('apontamentos_aranda')).toHaveLength(0);
      expect(consultasDe('apontamentos_tickets_aranda').filter(ehConsultaTicketsConsumo)).toHaveLength(1);
    });

    it('contrato "ambos": abas Horas e Tickets (9 abas)', async () => {
      estado.resultados.empresas_clientes = [{ ...EMPRESA, tipo_contrato: 'ambos' }];

      const planilha = await lerPlanilha(await gerarDetalhado());

      expect(planilha.SheetNames).toEqual([...ABAS_FIXAS_ANTES, 'Horas', 'Tickets', ...ABAS_FIXAS_DEPOIS]);
      expect(consultasDe('apontamentos_aranda')).toHaveLength(1);
      expect(consultasDe('apontamentos_tickets_aranda').filter(ehConsultaTicketsConsumo)).toHaveLength(1);
    });

    it('empresa sem tipo de contrato cadastrado: tratada como "horas"', async () => {
      estado.resultados.empresas_clientes = [{ ...EMPRESA, tipo_contrato: null }];

      const planilha = await lerPlanilha(await gerarDetalhado());

      expect(planilha.SheetNames).toEqual([...ABAS_FIXAS_ANTES, 'Horas', ...ABAS_FIXAS_DEPOIS]);
    });

    it('[novo] o tipo de contrato recebido por parâmetro prevalece sobre o do cadastro', async () => {
      estado.resultados.empresas_clientes = [{ ...EMPRESA, tipo_contrato: 'horas' }];

      const planilha = await lerPlanilha(await gerarDetalhado({ tipoContrato: 'tickets' }));

      expect(planilha.SheetNames).toEqual([...ABAS_FIXAS_ANTES, 'Tickets', ...ABAS_FIXAS_DEPOIS]);
    });
  });
});
