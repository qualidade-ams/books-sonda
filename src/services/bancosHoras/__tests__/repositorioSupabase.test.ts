import { describe, it, expect } from 'vitest';
import { criarSupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import { criarRepositorioSupabase } from '../repositorioSupabase';

const MES = { mes: 3, ano: 2026 };

function cenario() {
  return criarSupabaseEmMemoria(
    {
      bancos_horas: [
        {
          id: 'b1',
          empresa_id: 'e1',
          nome: 'Banco COMEX',
          padrao: false,
          visivel_cliente: true,
          ordem: 1,
          ativo: true,
          tipo_contrato: 'horas',
          periodo_apuracao: 3,
          inicio_vigencia: '2026-01-01',
          dia_inicio_apuracao: 1,
          dia_fim_apuracao: 0,
          taxa_produto: 'OUTROS',
          taxa_tipo_hora: 'excedente',
          repasse_especial: 'nenhum',
          duracao_periodo_meses: null,
          periodos_ate_zerar: null,
          consome_outros_bancos: true,
          filtro_ic_operador: 'contem',
          filtro_ic_valor: 'NIQUEL',
        },
        {
          id: 'b2',
          empresa_id: 'e1',
          nome: 'Banco de Horas',
          padrao: true,
          visivel_cliente: false,
          ordem: 2,
          ativo: true,
          tipo_contrato: 'ambos',
          periodo_apuracao: 6,
          inicio_vigencia: '2025-07-01',
          dia_inicio_apuracao: 16,
          dia_fim_apuracao: 15,
          taxa_produto: 'GALLERY',
          taxa_tipo_hora: 'normal',
          repasse_especial: 'por_periodo',
          duracao_periodo_meses: 3,
          periodos_ate_zerar: 2,
          consome_outros_bancos: false,
          filtro_ic_operador: null,
          filtro_ic_valor: null,
        },
        {
          id: 'b3',
          empresa_id: 'outra',
          nome: 'Outro',
          padrao: true,
          ordem: 1,
          ativo: true,
          tipo_contrato: 'horas',
          periodo_apuracao: 3,
          inicio_vigencia: '2026-01-01',
        },
      ],
      bancos_horas_escopo: [
        { banco_id: 'b1', produto_id: 'COMEX', modulo_id: null },
        { banco_id: 'b3', produto_id: 'X', modulo_id: null },
      ],
      bancos_horas_baseline: [
        {
          banco_id: 'b1',
          data_inicio: '2026-01-01',
          data_fim: null,
          baseline_minutos: 2400,
          baseline_tickets: null,
          credito: 'mensal',
        },
      ],
      bancos_horas_repasse: [
        {
          banco_id: 'b2',
          data_inicio: '2025-07-01',
          data_fim: null,
          percentual_mensal: '50.00',
          percentual_dentro_periodo: '100.00',
          percentual_entre_periodos: '70.00',
        },
      ],
      grupos_aranda: [
        {
          grupo_aranda: 'AMS APL - CAMBIO',
          produto_id: 'COMEX',
          modulo_id: 'M1',
          ativo: true,
          classificacao: 'modulo',
        },
      ],
      bancos_horas_reajustes: [
        {
          banco_id: 'b1',
          mes: 2,
          ano: 2026,
          tipo: 'entrada',
          minutos: 60,
          tickets: 0,
          ativo: true,
        },
        { banco_id: 'b1', mes: 3, ano: 2026, tipo: 'saida', minutos: 30, tickets: 0, ativo: false },
        { banco_id: 'b1', mes: 12, ano: 2025, tipo: 'saida', minutos: 30, tickets: 0, ativo: true },
        { banco_id: 'b9', mes: 2, ano: 2026, tipo: 'saida', minutos: 30, tickets: 0, ativo: true },
      ],
      bancos_horas_fechamentos: [
        {
          id: 'f1',
          banco_id: 'b1',
          mes: 2,
          ano: 2026,
          versao: 2,
          vigente: true,
          nome_banco: 'Banco COMEX (na época)',
          fim_periodo: false,
          transicao_periodo: false,
          percentual_repasse: '50.00',
          baseline_minutos: 2400,
          repasse_anterior_minutos: 0,
          saldo_a_utilizar_minutos: 2400,
          consumo_minutos: 400,
          requerimentos_minutos: 0,
          reajustes_minutos: 60,
          consumo_total_minutos: 340,
          saldo_minutos: 2060,
          consumido_outros_minutos: 0,
          cedido_outros_minutos: 0,
          saldo_final_minutos: 2060,
          repasse_minutos: 1030,
          excedente_minutos: 0,
          baseline_tickets: null,
          taxa_hora: '150.00',
          taxa_ticket: null,
          valor_excedente_horas: '0.00',
          valor_excedente_tickets: '0.00',
          valor_a_faturar: '0.00',
          alertas: [],
        },
        {
          id: 'f0',
          banco_id: 'b1',
          mes: 2,
          ano: 2026,
          versao: 1,
          vigente: false,
          nome_banco: 'antiga',
        },
      ],
      bancos_horas_observacoes: [
        {
          fechamento_id: 'f1',
          origem: 'consumo_entre_bancos',
          texto: '01:00 horas cedidas ao banco X',
          ativo: true,
        },
        { fechamento_id: 'f1', origem: 'manual', texto: 'manual não entra', ativo: true },
      ],
      taxas_clientes: [
        {
          id: 't1',
          cliente_id: 'e1',
          vigencia_inicio: '2025-01-01',
          tipo_produto: 'OUTROS',
          tipo_calculo_adicional: 'media',
          valor_ticket_excedente: '200.00',
          ticket_excedente_2: null,
          ticket_excedente: null,
        },
        { id: 't2', cliente_id: 'outra', vigencia_inicio: '2025-01-01', tipo_produto: 'OUTROS' },
      ],
      valores_taxas_funcoes: [
        {
          taxa_id: 't1',
          funcao: 'Funcional',
          tipo_hora: 'remota',
          valor_base: '100.00',
          valor_adicional: '150.00',
        },
        {
          taxa_id: 't1',
          funcao: 'Funcional',
          tipo_hora: 'local',
          valor_base: '999.00',
          valor_adicional: null,
        },
      ],
    },
    {
      bancos_horas_consumo: () => [
        {
          fonte: 'apontamento',
          grupo: 'AMS APL - CAMBIO',
          item_configuracao: 'IC',
          minutos: 90,
          tickets: 0,
          itens: 2,
        },
        {
          fonte: 'ticket',
          grupo: 'AMS APL - CAMBIO',
          item_configuracao: null,
          minutos: 0,
          tickets: 1,
          itens: 1,
        },
      ],
      bancos_horas_requerimentos: () => [
        {
          requerimento_id: 'r1',
          chamado: 'C1',
          modulo: 'Comex',
          produto_id: 'COMEX',
          modulo_id: null,
          banco_ajustado_id: 'b2',
          horas: '1.50',
          tickets: 0,
        },
      ],
    }
  );
}

describe('criarRepositorioSupabase', () => {
  it('bancos: parâmetros, escopo, filtro e históricos da empresa, com números convertidos', async () => {
    const repo = criarRepositorioSupabase(cenario());
    const bancos = await repo.bancos('e1');
    expect(bancos.map((b) => b.bancoId)).toEqual(['b1', 'b2']);
    expect(bancos[0]).toMatchObject({
      nome: 'Banco COMEX',
      inicioVigencia: { mes: 1, ano: 2026 },
      escopo: [{ produtoId: 'COMEX', moduloId: null }],
      filtroIc: { operador: 'contem', valor: 'NIQUEL' },
      consomeOutrosBancos: true,
      baselines: [
        {
          dataInicio: '2026-01-01',
          dataFim: null,
          baselineMinutos: 2400,
          baselineTickets: null,
          credito: 'mensal',
        },
      ],
      repasses: [],
    });
    expect(bancos[1]).toMatchObject({
      padrao: true,
      visivelCliente: false,
      tipoContrato: 'ambos',
      diaInicioApuracao: 16,
      diaFimApuracao: 15,
      taxaProduto: 'GALLERY',
      taxaTipoHora: 'normal',
      repasseEspecial: 'por_periodo',
      duracaoPeriodoMeses: 3,
      periodosAteZerar: 2,
      escopo: [],
      filtroIc: null,
      repasses: [
        {
          dataInicio: '2025-07-01',
          dataFim: null,
          percentualMensal: 50,
          percentualDentroPeriodo: 100,
          percentualEntrePeriodos: 70,
        },
      ],
    });
  });

  it('de-para dos grupos', async () => {
    const repo = criarRepositorioSupabase(cenario());
    expect(await repo.dePara()).toEqual([
      { grupoAranda: 'AMS APL - CAMBIO', produtoId: 'COMEX', moduloId: 'M1', ativo: true },
    ]);
  });

  it('consumo pela regra única (rpc), com a janela do banco', async () => {
    const cliente = cenario();
    const linhas = await criarRepositorioSupabase(cliente).consumo('e1', MES, 16, 15);
    expect(cliente.chamadasRpc).toContainEqual({
      nome: 'bancos_horas_consumo',
      args: { p_empresa_id: 'e1', p_ano: 2026, p_mes: 3, p_dia_inicio: 16, p_dia_fim: 15 },
    });
    expect(linhas).toEqual([
      {
        fonte: 'apontamento',
        grupo: 'AMS APL - CAMBIO',
        itemConfiguracao: 'IC',
        minutos: 90,
        tickets: 0,
      },
      {
        fonte: 'ticket',
        grupo: 'AMS APL - CAMBIO',
        itemConfiguracao: null,
        minutos: 0,
        tickets: 1,
      },
    ]);
  });

  it('requerimentos pela rpc, com horas decimais como número', async () => {
    const cliente = cenario();
    const linhas = await criarRepositorioSupabase(cliente).requerimentos('e1', MES);
    expect(cliente.chamadasRpc).toContainEqual({
      nome: 'bancos_horas_requerimentos',
      args: { p_empresa_id: 'e1', p_ano: 2026, p_mes: 3 },
    });
    expect(linhas).toEqual([
      {
        requerimentoId: 'r1',
        produtoId: 'COMEX',
        moduloId: null,
        bancoAjustadoId: 'b2',
        horas: 1.5,
        tickets: 0,
      },
    ]);
  });

  it('reajustes: só ativos, dos bancos pedidos e dentro do intervalo de meses', async () => {
    const r = await criarRepositorioSupabase(cenario()).reajustes(
      ['b1'],
      { mes: 1, ano: 2026 },
      MES
    );
    expect(r).toEqual([
      { bancoId: 'b1', mes: 2, ano: 2026, tipo: 'entrada', minutos: 60, tickets: 0 },
    ]);
  });

  it('fechamentos: só a versão vigente, como resultado congelado com as observações automáticas', async () => {
    const [f] = await criarRepositorioSupabase(cenario()).fechamentos(
      ['b1'],
      { mes: 1, ano: 2026 },
      MES
    );
    expect(f).toEqual({
      bancoId: 'b1',
      nome: 'Banco COMEX (na época)',
      mes: { mes: 2, ano: 2026 },
      fechado: true,
      fimPeriodo: false,
      transicaoPeriodo: false,
      percentualRepasse: 50,
      horas: {
        baseline: 2400,
        repasseAnterior: 0,
        saldoAUtilizar: 2400,
        consumo: 400,
        requerimentos: 0,
        reajustes: 60,
        consumoTotal: 340,
        saldo: 2060,
        consumidoDeOutros: 0,
        cedidoAOutros: 0,
        saldoFinal: 2060,
        repasse: 1030,
        excedente: 0,
        valorExcedente: 0,
        taxa: 150,
      },
      tickets: null,
      valorAFaturar: 0,
      observacoes: [{ origem: 'consumo_entre_bancos', texto: '01:00 horas cedidas ao banco X' }],
      alertas: [],
    });
  });

  it('taxas do cliente com os valores da hora remota', async () => {
    const taxas = await criarRepositorioSupabase(cenario()).taxas('e1');
    expect(taxas).toEqual([
      {
        id: 't1',
        vigenciaInicio: '2025-01-01',
        tipoProduto: 'OUTROS',
        tipoCalculoAdicional: 'media',
        valorTicketExcedente: 200,
        ticketExcedente2: null,
        ticketExcedente: null,
        funcoesRemotas: [{ funcao: 'Funcional', valorBase: 100, valorAdicional: 150 }],
      },
    ]);
  });

  it('erro do Supabase vira exceção com a mensagem', async () => {
    const cliente = criarSupabaseEmMemoria({}, {});
    await expect(criarRepositorioSupabase(cliente).consumo('e1', MES, 1, 0)).rejects.toThrow(
      /bancos_horas_consumo/
    );
  });
});
