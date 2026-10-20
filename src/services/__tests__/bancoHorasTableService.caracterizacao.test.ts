/**
 * Testes de CARACTERIZAÇÃO da tabela do banco de horas enviada por e-mail
 * (bancoHorasTableService).
 *
 * Registram o comportamento de HOJE, inclusive os defeitos catalogados no
 * Inventário de Regras e Funcionalidades Atuais (códigos RC-xx, RB-xx, RO-xx,
 * BUG-xx). Servem de linha de base para a comparação Legado x Novo da
 * reconstrução do banco de horas (Especificação v2.0, Fase 0). Um teste marcado
 * com código NÃO descreve o comportamento desejado: no sistema novo a regra é
 * corrigida (ver docs/especificacoes/Decisoes_Negocio_Bancos_de_Horas.md).
 *
 * Duas partes:
 * - buscarDadosEGerarTabelaBancoHoras: lê banco_horas_calculos e REFAZ o cálculo
 *   em memória com regras próprias antes de montar o HTML. Hoje quem a usa é
 *   gerarImagemBancoHoras → booksDisparoService (imagem {{bancoHoras.imagemUrl}}
 *   do e-mail do Book). O e-mail de Saldo Parcial (saldoParcial/emailSaldoParcial)
 *   NÃO passa por ela: usa só os geradores puros abaixo, com os cálculos da tela.
 * - Geradores puros de HTML (gerarTabelaBancoHoras, gerarSecaoObservacoes,
 *   gerarTabelaRequerimentos, gerarSecaoExcedentes), compartilhados pelos dois
 *   e-mails.
 *
 * Roda a lógica real do service sobre um Supabase simulado (filtra só por
 * eq/in; demais filtros são registrados e ignorados). O motor
 * (bancoHorasService.calcularMes) é simulado: aqui só importa QUE é chamado e
 * para quais meses. A data do sistema é fixada, porque o corte "mês atual" usa
 * o calendário.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const estado = vi.hoisted(() => ({
  tabelas: {} as Record<string, any[]>,
  /** Linhas devolvidas por get_percentual_repasse_vigente */
  percentualVigente: [] as any[],
  consultas: [] as { tabela: string; chamadas: [string, any[]][] }[],
  rpcs: [] as { nome: string; args: any }[],
}));

vi.mock('@/integrations/supabase/client', () => {
  /** Builder que registra cada chamada; filtra as linhas da tabela só por eq/in */
  const from = (tabela: string) => {
    const consulta = { tabela, chamadas: [] as [string, any[]][] };
    estado.consultas.push(consulta);
    let unico: 'single' | 'maybe' | null = null;
    const builder: any = new Proxy(
      {},
      {
        get(_alvo, prop: string) {
          if (prop === 'then') {
            let linhas = estado.tabelas[tabela] ?? [];
            for (const [metodo, args] of consulta.chamadas) {
              if (metodo === 'eq') linhas = linhas.filter((l) => l[args[0]] === args[1]);
              if (metodo === 'in') linhas = linhas.filter((l) => args[1].includes(l[args[0]]));
            }
            const resultado =
              unico === null
                ? { data: linhas.map((l) => ({ ...l })), error: null }
                : linhas.length
                  ? { data: { ...linhas[0] }, error: null }
                  : {
                      data: null,
                      error: unico === 'single' ? { message: 'não encontrado' } : null,
                    };
            return (ok: any, falha: any) => Promise.resolve(resultado).then(ok, falha);
          }
          return (...args: any[]) => {
            if (prop === 'single') unico = 'single';
            if (prop === 'maybeSingle') unico = 'maybe';
            consulta.chamadas.push([prop, args]);
            return builder;
          };
        },
      }
    );
    return builder;
  };
  const rpc = async (nome: string, args: any) => {
    estado.rpcs.push({ nome, args });
    return { data: estado.percentualVigente, error: null };
  };
  return { supabase: { from, rpc } };
});

vi.mock('@/services/bancoHorasService', () => ({
  bancoHorasService: { calcularMes: vi.fn(async () => ({})) },
}));

import {
  buscarDadosEGerarTabelaBancoHoras,
  gerarTabelaBancoHoras,
  gerarSecaoObservacoes,
  gerarTabelaRequerimentos,
  gerarSecaoExcedentes,
} from '../bancoHorasTableService';
import { bancoHorasService } from '@/services/bancoHorasService';

const EMPRESA = 'emp-1';
const VERMELHO = 'color:#dc2626';
const VERDE = 'color:#16a34a';
const NEUTRO = 'color:#111827';

function empresa(campos: Record<string, any> = {}) {
  return {
    id: EMPRESA,
    nome_abreviado: 'ACME',
    nome_completo: 'ACME INDÚSTRIA S.A.',
    tipo_contrato: 'horas',
    tipo_cobranca: 'banco_horas',
    periodo_apuracao: 3,
    percentual_repasse_mensal: 100,
    dia_inicio_apuracao: 1,
    dia_fim_apuracao: 0,
    inicio_vigencia: '2026-01-01',
    ...campos,
  };
}

function calculo(mes: number, ano: number, campos: Record<string, any> = {}) {
  return {
    id: `calc-${mes}-${ano}`,
    empresa_id: EMPRESA,
    mes,
    ano,
    baseline_horas: '10:00',
    baseline_tickets: null,
    repasses_mes_anterior_horas: '0:00',
    repasses_mes_anterior_tickets: 0,
    saldo_a_utilizar_horas: '10:00',
    saldo_a_utilizar_tickets: 0,
    consumo_horas: '0:00',
    consumo_tickets: 0,
    requerimentos_horas: '0:00',
    requerimentos_tickets: 0,
    reajustes_horas: '0:00',
    reajustes_tickets: 0,
    consumo_total_horas: '0:00',
    consumo_total_tickets: 0,
    saldo_horas: '10:00',
    saldo_tickets: 0,
    repasse_horas: '0:00',
    repasse_tickets: 0,
    excedentes_horas: '0:00',
    excedentes_tickets: 0,
    valor_excedentes_horas: 0,
    valor_excedentes_tickets: 0,
    valor_a_faturar: 0,
    taxa_hora_utilizada: 230,
    taxa_ticket_utilizada: null,
    created_at: '2026-01-01T00:00:00Z',
    ...campos,
  };
}

/** Trimestre jan–mar/2026 gravado pelo motor com valores DIFERENTES dos que o e-mail recalcula */
function trimestreGravado() {
  return [
    calculo(1, 2026, {
      consumo_horas: '6:00',
      requerimentos_horas: '0:30',
      consumo_total_horas: '6:30',
      saldo_horas: '3:30',
      repasse_horas: '3:30', // gravado com outro percentual
    }),
    calculo(2, 2026, {
      repasses_mes_anterior_horas: '3:30',
      saldo_a_utilizar_horas: '13:30',
      consumo_horas: '4:00',
      requerimentos_horas: '1:00',
      reajustes_horas: '0:30',
      consumo_total_horas: '5:30',
      saldo_horas: '8:00',
      repasse_horas: '4:00',
    }),
    calculo(3, 2026, {
      repasses_mes_anterior_horas: '4:00',
      saldo_a_utilizar_horas: '14:00',
      consumo_horas: '15:00',
      consumo_total_horas: '15:00',
      saldo_horas: '-1:00',
      repasse_horas: '0:00',
      excedentes_horas: '1:00',
      valor_excedentes_horas: 230,
      valor_a_faturar: 230,
    }),
  ];
}

function montarCenario(
  opcoes: {
    empresa?: Record<string, any>;
    calculos?: any[];
    percentual?: any[];
    extras?: Record<string, any[]>;
  } = {}
) {
  estado.tabelas = {
    empresas_clientes: [empresa(opcoes.empresa)],
    banco_horas_calculos: opcoes.calculos ?? trimestreGravado(),
    requerimentos: [],
    banco_horas_observacoes: [],
    banco_horas_reajustes: [],
    profiles: [],
    ...opcoes.extras,
  };
  estado.percentualVigente = opcoes.percentual ?? [{ percentual: 50 }];
}

/** Hoje = dia/mês/ano no fuso local (o service usa getMonth/getFullYear locais) */
function hoje(dia: number, mes: number, ano: number) {
  vi.setSystemTime(new Date(ano, mes - 1, dia, 12));
}

async function gerar(mes: number, ano: number) {
  const resultado = await buscarDadosEGerarTabelaBancoHoras(EMPRESA, mes, ano);
  if (!resultado) throw new Error('tabela não gerada');
  return resultado;
}

function mesDe(calculos: any[], mes: number) {
  return calculos.find((c) => c.mes === mes);
}

/** Células <td> de uma linha da tabela, identificada pelo rótulo */
function celulas(html: string, rotulo: string): { valor: string; estilo: string }[] {
  const linha = html.split('</tr>').find((tr) => tr.includes(`>${rotulo}</td>`));
  if (!linha) throw new Error(`linha "${rotulo}" não encontrada`);
  return [...linha.matchAll(/<td style="([^"]*)">([^<]*)<\/td>/g)]
    .slice(1)
    .map((m) => ({ estilo: m[1], valor: m[2] }));
}

const escritas = () =>
  estado.consultas.flatMap((c) =>
    c.chamadas
      .filter(([m]) => ['insert', 'update', 'upsert', 'delete'].includes(m))
      .map(([m]) => `${c.tabela}.${m}`)
  );

describe('Caracterização — tabela do banco de horas por e-mail (bancoHorasTableService)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.useFakeTimers({ toFake: ['Date'] });
    estado.consultas = [];
    estado.rpcs = [];
    vi.mocked(bancoHorasService.calcularMes).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('buscarDadosEGerarTabelaBancoHoras — recálculo em memória (hoje = 15/02/2026, disparo 03/2026 → referência fev)', () => {
    let calculos: any[];
    let html: string;

    beforeEach(async () => {
      hoje(15, 2, 2026);
      montarCenario();
      ({ calculos, html } = await gerar(3, 2026));
    });

    it('[RC-111] grava cálculos: chama calcularMes para todos os meses do período EXCETO o de referência — inclusive meses posteriores', () => {
      // O comentário do código fala em "meses anteriores", mas março (posterior à referência fev) também é recalculado
      expect(vi.mocked(bancoHorasService.calcularMes).mock.calls).toEqual([
        [EMPRESA, 1, 2026],
        [EMPRESA, 3, 2026],
      ]);
    });

    it('[RC-112] o recálculo do e-mail não é gravado: nenhuma escrita no banco', () => {
      expect(escritas()).toEqual([]);
    });

    it('lê o percentual do histórico na data do mês de referência e mostra no rótulo do repasse', () => {
      expect(estado.rpcs).toEqual([
        {
          nome: 'get_percentual_repasse_vigente',
          args: { p_empresa_id: EMPRESA, p_data: '2026-02-01' },
        },
      ]);
      expect(html).toContain('>Repasse - 50%</td>');
    });

    it('[RC-112] mês anterior ao mês atual: mantém consumo gravado, mas refaz saldo e repasse', () => {
      expect(mesDe(calculos, 1)).toMatchObject({
        repasses_mes_anterior_horas: '0:00', // 1º mês do array: mantém o valor gravado
        saldo_a_utilizar_horas: '10:00',
        consumo_horas: '6:00',
        requerimentos_horas: '0:30',
        consumo_total_horas: '6:30',
        saldo_horas: '3:30',
        repasse_horas: '1:45', // 50% de 3:30 (o gravado era 3:30)
      });
    });

    it('[RC-112] mês >= mês atual do calendário: consumo, requerimentos e reajustes zerados ("00:00"), mesmo sendo o mês de referência', () => {
      expect(mesDe(calculos, 2)).toMatchObject({
        consumo_horas: '00:00',
        requerimentos_horas: '00:00',
        reajustes_horas: '00:00',
        consumo_total_horas: '00:00',
        excedentes_horas: '00:00',
        valor_a_faturar: 0,
      });
    });

    it('[RC-112] repasse reencadeado: o "repasse mês anterior" é o repasse recalculado em memória, não o gravado', () => {
      // Gravado em fev: 3:30. E-mail: repasse de jan recalculado (1:45)
      expect(mesDe(calculos, 2)).toMatchObject({
        repasses_mes_anterior_horas: '1:45',
        saldo_a_utilizar_horas: '11:45',
        saldo_horas: '11:45',
        repasse_horas: '5:53', // Math.round(705 min × 50%) = 353 min
      });
    });

    it('[RC-112] último mês do período: repasse "00:00" e excedente/valor a faturar zerados (mês futuro)', () => {
      expect(mesDe(calculos, 3)).toMatchObject({
        repasses_mes_anterior_horas: '5:53',
        saldo_a_utilizar_horas: '15:53',
        saldo_horas: '15:53',
        repasse_horas: '00:00',
        excedentes_horas: '00:00',
        valor_a_faturar: 0,
      });
    });

    it('HTML: os valores recalculados aparecem na tabela, com o nome do período e os meses', () => {
      expect(html).toContain('>1º Trimestre</th>');
      expect(html).toContain('>Janeiro/26</th><th');
      expect(celulas(html, 'Saldo').map((c) => c.valor)).toEqual(['3:30', '11:45', '15:53']);
      expect(celulas(html, 'Consumo Chamados').map((c) => c.valor)).toEqual([
        '6:00',
        '00:00',
        '00:00',
      ]);
    });

    it('sem quadro de excedentes quando o último mês é futuro (valor zerado em memória)', () => {
      expect(html).not.toContain('Horas Excedentes');
    });
  });

  it('com hoje depois do período, todos os meses usam o consumo gravado; o quadro de excedentes aparece no último mês', async () => {
    hoje(10, 4, 2026);
    montarCenario();
    const { calculos, html } = await gerar(4, 2026); // referência mar

    expect(vi.mocked(bancoHorasService.calcularMes).mock.calls).toEqual([
      [EMPRESA, 1, 2026],
      [EMPRESA, 2, 2026],
    ]);
    expect(mesDe(calculos, 3)).toMatchObject({
      repasses_mes_anterior_horas: '3:08', // repasse de fev recalculado: Math.round(50% de 6:15 = 187,5 min) = 188 min
      saldo_a_utilizar_horas: '13:08',
      consumo_total_horas: '15:00',
      saldo_horas: '-1:52',
      repasse_horas: '00:00',
      excedentes_horas: '1:00', // gravado pelo motor, não recalculado
      valor_a_faturar: 230,
    });
    expect(html).toContain('Horas Excedentes: 1:00');
    expect(html).toMatch(/Valor total dos Excedentes: R\$\s230,00/);
  });

  it('[RC-141] saldo negativo repassa o déficit inteiro (horas e tickets) — já igual ao motor', async () => {
    hoje(15, 2, 2026);
    montarCenario({
      calculos: [
        calculo(1, 2026, {
          consumo_total_horas: '12:30',
          baseline_tickets: 2,
          consumo_total_tickets: 5,
        }),
        calculo(2, 2026, { baseline_tickets: 2 }),
      ],
    });
    const { calculos } = await gerar(3, 2026);

    expect(mesDe(calculos, 1)).toMatchObject({
      saldo_horas: '-2:30',
      repasse_horas: '-2:30',
      saldo_tickets: -3,
      repasse_tickets: -3,
    });
    expect(mesDe(calculos, 2)).toMatchObject({
      repasses_mes_anterior_horas: '-2:30',
      saldo_a_utilizar_horas: '7:30',
    });
  });

  it('[RC-141] repasse especial e fim de período especial são ignorados: nem lê esses campos da empresa', async () => {
    hoje(15, 2, 2026);
    montarCenario({
      empresa: {
        periodo_apuracao: 1,
        possui_repasse_especial: true,
        tipo_repasse_especial: 'simples',
        ciclos_para_zerar: 2,
        percentual_repasse_especial: 0,
      },
      calculos: [calculo(1, 2026, { consumo_total_horas: '6:00' })],
    });
    const { calculos } = await gerar(2, 2026); // referência jan, mensal

    const select = estado.consultas
      .find((c) => c.tabela === 'empresas_clientes')!
      .chamadas.find(([m]) => m === 'select')![1][0];
    expect(select).toBe(
      'tipo_cobranca, periodo_apuracao, percentual_repasse_mensal, dia_inicio_apuracao, dia_fim_apuracao, inicio_vigencia'
    );
    // O motor (RC-31) repassaria 100% no ciclo 1 de 2; o e-mail zera por ser fim de período
    expect(mesDe(calculos, 1)).toMatchObject({ saldo_horas: '4:00', repasse_horas: '00:00' });
  });

  it('[RC-148] sem percentual no histórico e sem percentual no cadastro: assume 0% (o motor assume 100%)', async () => {
    hoje(15, 2, 2026);
    montarCenario({ empresa: { percentual_repasse_mensal: null }, percentual: [] });
    const { calculos, html } = await gerar(3, 2026);

    expect(mesDe(calculos, 1)).toMatchObject({ saldo_horas: '3:30', repasse_horas: '0:00' });
    expect(html).toContain('>Repasse - 0%</td>');
  });

  it('sem percentual no histórico: usa o percentual_repasse_mensal do cadastro', async () => {
    hoje(15, 2, 2026);
    montarCenario({ empresa: { percentual_repasse_mensal: 100 }, percentual: [] });
    const { calculos } = await gerar(3, 2026);

    expect(mesDe(calculos, 1)).toMatchObject({ repasse_horas: '3:30' });
  });

  describe('tickets', () => {
    function cenarioTickets(campos: Record<string, any> = {}) {
      montarCenario({
        empresa: { tipo_contrato: 'tickets', tipo_cobranca: 'ticket', ...campos },
        calculos: [
          calculo(1, 2026, {
            baseline_horas: null,
            baseline_tickets: 5,
            consumo_total_tickets: 0,
            taxa_hora_utilizada: null,
            taxa_ticket_utilizada: 99,
          }),
          calculo(2, 2026, {
            baseline_horas: null,
            baseline_tickets: 5,
            repasses_mes_anterior_tickets: 2,
            consumo_tickets: 4,
            consumo_total_tickets: 4,
          }),
        ],
      });
    }

    it('[RC-112] repasse de tickets por Math.round: 5 × 50% = 3 (o motor grava 2, RC-56)', async () => {
      hoje(15, 2, 2026);
      cenarioTickets();
      const { calculos } = await gerar(3, 2026);

      expect(mesDe(calculos, 1)).toMatchObject({
        saldo_a_utilizar_tickets: 5,
        saldo_tickets: 5,
        repasse_tickets: 3,
      });
      // Fev (>= mês atual): consumo zerado; repasse anterior reencadeado (3, não os 2 gravados)
      expect(mesDe(calculos, 2)).toMatchObject({
        repasses_mes_anterior_tickets: 3,
        saldo_a_utilizar_tickets: 8,
        consumo_tickets: 0,
        consumo_total_tickets: 0,
        saldo_tickets: 8,
        repasse_tickets: 4,
      });
    });

    it('modo ticket na tabela: rótulo "Tickets Contratados" e valores inteiros', async () => {
      hoje(15, 2, 2026);
      cenarioTickets();
      const { html } = await gerar(3, 2026);

      expect(celulas(html, 'Tickets Contratados').map((c) => c.valor)).toEqual(['5', '5']);
      expect(celulas(html, 'Saldo').map((c) => c.valor)).toEqual(['5', '8']);
    });

    it('o modo ticket vem de tipo_cobranca (enum banco_horas/ticket/outros), não de tipo_contrato: contrato "tickets" com tipo_cobranca padrão sai em horas', async () => {
      hoje(15, 2, 2026);
      cenarioTickets({ tipo_cobranca: 'banco_horas' });
      const { html } = await gerar(3, 2026);

      expect(html).toContain('>Banco Contratado</td>');
      expect(html).not.toContain('Tickets Contratados');
    });
  });

  describe('meses e observações', () => {
    it('meses sem cálculo gravado são omitidos da tabela', async () => {
      hoje(15, 2, 2026);
      montarCenario({ calculos: [calculo(1, 2026), calculo(3, 2026)] });
      const { calculos } = await gerar(3, 2026);

      expect(calculos.map((c) => c.mes)).toEqual([1, 3]);
    });

    it('sem nenhum cálculo gravado: devolve null', async () => {
      hoje(15, 2, 2026);
      montarCenario({ calculos: [] });

      expect(await buscarDadosEGerarTabelaBancoHoras(EMPRESA, 3, 2026)).toBeNull();
    });

    it('empresa não encontrada: devolve null sem recalcular', async () => {
      hoje(15, 2, 2026);
      montarCenario();
      estado.tabelas.empresas_clientes = [];

      expect(await buscarDadosEGerarTabelaBancoHoras(EMPRESA, 3, 2026)).toBeNull();
      expect(bancoHorasService.calcularMes).not.toHaveBeenCalled();
    });

    it('[RO-17] só as observações manuais entram (as de ajuste são buscadas e descartadas) e o texto vai sem escape de HTML', async () => {
      hoje(15, 2, 2026);
      montarCenario({
        extras: {
          banco_horas_observacoes: [
            {
              empresa_id: EMPRESA,
              mes: 1,
              ano: 2026,
              observacao: 'Obs <b>manual</b>',
              created_by: null,
            },
          ],
          banco_horas_reajustes: [
            {
              empresa_id: EMPRESA,
              mes: 1,
              ano: 2026,
              ativo: true,
              observacao: 'Texto do ajuste',
              tipo_reajuste: 'entrada',
              valor_reajuste_horas: '2:00',
            },
          ],
        },
      });
      const { html } = await gerar(3, 2026);

      expect(estado.consultas.filter((c) => c.tabela === 'banco_horas_reajustes')).toHaveLength(3);
      expect(html).toContain('>Obs <b>manual</b></td>');
      expect(html).not.toContain('Texto do ajuste');
    });

    it('requerimentos em desenvolvimento são buscados, mas não entram no HTML', async () => {
      hoje(15, 2, 2026);
      const req = {
        cliente_id: EMPRESA,
        tipo_cobranca: 'Banco de Horas',
        horas_funcional: 1,
        horas_tecnico: 0,
      };
      montarCenario({
        extras: {
          requerimentos: [
            { ...req, chamado: 'RF-FATURADO', mes_cobranca: '01/2026', status: 'faturado' },
            { ...req, chamado: 'RF-DESENV', mes_cobranca: '02/2026', status: 'em_desenvolvimento' },
          ],
        },
      });
      const { html } = await gerar(3, 2026);

      expect(html).toContain('RF-FATURADO');
      expect(html).not.toContain('RF-DESENV');
    });
  });

  describe('formatação (geradores puros)', () => {
    it('[RB-14/BUG-18] zero recalculado vira "0:00" (sem zero à esquerda) e é pintado de VERDE, como positivo', async () => {
      hoje(15, 2, 2026);
      montarCenario({ calculos: [calculo(1, 2026, { consumo_total_horas: '10:00' })] });
      const { html } = await gerar(3, 2026);

      expect(celulas(html, 'Saldo')[0]).toMatchObject({ valor: '0:00' });
      expect(celulas(html, 'Saldo')[0].estilo).toContain(VERDE);
    });

    it('[RB-14] cores nas linhas coloridas: negativo vermelho, positivo verde, "00:00" neutro', () => {
      const html = gerarTabelaBancoHoras(
        [
          calculo(1, 2026, { saldo_horas: '-1:00' }),
          calculo(2, 2026, { saldo_horas: '2:00' }),
          calculo(3, 2026, { saldo_horas: '00:00' }),
        ] as any,
        'banco_horas',
        50,
        '1º Trimestre'
      );

      const saldo = celulas(html, 'Saldo');
      expect(saldo.map((c) => c.valor)).toEqual(['-1:00', '2:00', '00:00']);
      expect(saldo[0].estilo).toContain(VERMELHO);
      expect(saldo[1].estilo).toContain(VERDE);
      expect(saldo[2].estilo).toContain(NEUTRO);
    });

    it('só Repasse mês anterior, Saldo a utilizar, Saldo e Repasse são coloridos; consumo negativo fica neutro', () => {
      const html = gerarTabelaBancoHoras(
        [calculo(1, 2026, { consumo_horas: '-1:00' })] as any,
        'banco_horas',
        50,
        'Mensal'
      );

      expect(celulas(html, 'Consumo Chamados')[0]).toMatchObject({ valor: '-1:00' });
      expect(celulas(html, 'Consumo Chamados')[0].estilo).toContain(NEUTRO);
    });

    it('valores: minutos com 2 dígitos ("1:5" → "1:05"), vazio → "00:00", consumo total sem sinal', () => {
      const html = gerarTabelaBancoHoras(
        [
          calculo(1, 2026, {
            saldo_horas: '1:5',
            reajustes_horas: null,
            consumo_total_horas: '-2:00',
          }),
        ] as any,
        'banco_horas',
        50,
        'Mensal'
      );

      expect(celulas(html, 'Saldo')[0].valor).toBe('1:05');
      expect(celulas(html, 'Reajuste')[0].valor).toBe('00:00');
      expect(celulas(html, 'Consumo Total')[0].valor).toBe('2:00');
    });

    it('tickets: "0" é neutro', () => {
      const html = gerarTabelaBancoHoras(
        [calculo(1, 2026, { saldo_tickets: 0 })] as any,
        'ticket',
        50,
        'Mensal'
      );

      expect(celulas(html, 'Saldo')[0]).toMatchObject({ valor: '0' });
      expect(celulas(html, 'Saldo')[0].estilo).toContain(NEUTRO);
    });

    it('apuração customizada só no cabeçalho, e só se início ≠ 1 E fim ≠ 0', () => {
      const calcs = [calculo(12, 2026)] as any;

      expect(gerarTabelaBancoHoras(calcs, 'banco_horas', 50, 'Mensal', 16, 15)).toContain(
        '>16 Dez/26 à 15 Jan/27</th>'
      );
      expect(gerarTabelaBancoHoras(calcs, 'banco_horas', 50, 'Mensal', 16, 0)).toContain(
        '>Dezembro/26</th>'
      );
    });

    it('mais de 6 meses: divide em tabelas de até 4 meses, com "(i/n)" no nome do período', () => {
      const calcs = Array.from({ length: 7 }, (_, i) => calculo(i + 1, 2026)) as any;
      const html = gerarTabelaBancoHoras(calcs, 'banco_horas', 50, 'Anual');

      expect(html.match(/<table/g)).toHaveLength(2);
      expect(html).toContain('>Anual (1/2)</th>');
      expect(html).toContain('>Anual (2/2)</th>');
    });

    it('rodapé: taxa e valor a faturar do ÚLTIMO mês; taxa cai para o 1º mês que tiver', () => {
      const html = gerarTabelaBancoHoras(
        [
          calculo(1, 2026, { taxa_hora_utilizada: 180, valor_a_faturar: 999 }),
          calculo(2, 2026, { taxa_hora_utilizada: null, valor_a_faturar: 0 }),
        ] as any,
        'banco_horas',
        50,
        'Bimestre'
      );

      const rodape = html.slice(html.indexOf('Taxa/hora Excedente'));
      expect(rodape).toMatch(/R\$\s180,00/);
      expect(rodape).toMatch(/Valor Total<\/td>\s*<td[^>]*>R\$ 0,00</);
    });
  });

  describe('gerarSecaoObservacoes', () => {
    it('[RO-17] texto da observação entra sem escape de HTML', () => {
      const html = gerarSecaoObservacoes([
        { tipo: 'manual', texto: '<script>alert(1)</script>', mes: 1, ano: 2026 },
      ]);

      expect(html).toContain(
        '<td style="padding:6px 5px;text-align:center;font-size:10px;font-family:Inter,sans-serif;color:#111827;font-weight:400;border-bottom:1px solid #e5e7eb;"><script>alert(1)</script></td>'
      );
      expect(html).toContain('>Janeiro/2026</td>');
    });

    it('observação de ajuste aparece com selo "Ajuste" e o valor com sinal (entrada "+", qualquer outro "-")', () => {
      const html = gerarSecaoObservacoes([
        { tipo: 'ajuste', texto: 'A', tipo_ajuste: 'entrada', valor_horas: '2:00' },
        { tipo: 'ajuste', texto: 'B', tipo_ajuste: 'saida', valor_horas: '1:30' },
        { tipo: 'ajuste', texto: 'C', tipo_ajuste: 'entrada', valor_horas: '00:00' },
      ]);

      expect(html.match(/>Ajuste<\/span>/g)).toHaveLength(3);
      expect(html).toContain('🕐 +2:00</span>');
      expect(html).toContain('🕐 -1:30</span>');
      expect(html).not.toContain('🕐 +00:00');
    });

    it('sem observações: string vazia', () => {
      expect(gerarSecaoObservacoes([])).toBe('');
    });
  });

  describe('gerarTabelaRequerimentos e gerarSecaoExcedentes', () => {
    it('requerimentos: total em "HH:MM" com zero à esquerda (horas decimais e texto H:MM)', () => {
      const html = gerarTabelaRequerimentos(
        [{ chamado: 'RF-1', horas_funcional: 1.5, horas_tecnico: '0:45' }],
        'Requerimentos do Período',
        '#2563eb'
      );

      expect(html).toContain('margin-left:6px;">02:15</span>');
      expect(html).toContain('>01:30</td>');
      expect(html).toContain('>00:45</td>');
    });

    it('excedentes: sem valor total, o quadro não aparece', () => {
      expect(
        gerarSecaoExcedentes({
          horasExcedentes: '1:00',
          valorHoraExcedente: 230,
          valorTotalExcedentes: 0,
        })
      ).toBe('');
    });
  });
});
