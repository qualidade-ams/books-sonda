import { describe, it, expect } from 'vitest';
import { criarSupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import {
  BancosHorasCadastroService,
  conflitoDeEscopo,
  validarParametros,
} from '../bancosHorasCadastroService';
import type { ParametrosBanco } from '@/types/bancosHorasCadastro';

const autoria = { updated_at: '2026-10-22T12:00:00Z', updated_by: 'u1' };

const PARAMETROS: ParametrosBanco = {
  nome: 'Banco COMEX',
  descricao: null,
  padrao: false,
  tipoContrato: 'horas',
  periodoApuracao: 3,
  inicioVigencia: '2026-10-01',
  fimVigencia: null,
  diaInicioApuracao: 1,
  diaFimApuracao: 0,
  taxaProduto: 'OUTROS',
  taxaTipoHora: 'excedente',
  repasseEspecial: 'nenhum',
  duracaoPeriodoMeses: null,
  periodosAteZerar: null,
  consomeOutrosBancos: false,
  filtroIc: null,
  escopo: [{ produtoId: 'p-ce', moduloId: null }],
};

const linhaBanco = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  empresa_id: 'e1',
  nome: id,
  descricao: null,
  padrao: false,
  visivel_cliente: true,
  ordem: 1,
  ativo: true,
  tipo_contrato: 'horas',
  periodo_apuracao: 3,
  inicio_vigencia: '2026-07-01',
  fim_vigencia: null,
  dia_inicio_apuracao: 1,
  dia_fim_apuracao: 0,
  taxa_produto: 'OUTROS',
  taxa_tipo_hora: 'excedente',
  repasse_especial: 'nenhum',
  duracao_periodo_meses: null,
  periodos_ate_zerar: null,
  consome_outros_bancos: false,
  filtro_ic_operador: null,
  filtro_ic_valor: null,
  espelha_legado: false,
  ...autoria,
  ...extra,
});

function cenario() {
  return criarSupabaseEmMemoria(
    {
      bancos_horas: [
        linhaBanco('b-fiscal', {
          nome: 'Banco FISCAL',
          padrao: true,
          ordem: 2,
          espelha_legado: true,
        }),
        linhaBanco('b-edocs', {
          nome: 'FISCAL – e-DOCS',
          ordem: 1,
          fim_vigencia: '2027-06-01',
          filtro_ic_operador: 'contem',
          filtro_ic_valor: 'NIQUEL',
        }),
        linhaBanco('b-antigo', { nome: 'Antigo', ordem: 3, ativo: false }),
        linhaBanco('b-outra', { empresa_id: 'e2', nome: 'Outra empresa' }),
      ],
      bancos_horas_escopo: [
        { id: 'x1', banco_id: 'b-edocs', produto_id: 'p-comply', modulo_id: 'm-nfe' },
        { id: 'x2', banco_id: 'b-edocs', produto_id: 'p-edocs', modulo_id: null },
        { id: 'x3', banco_id: 'b-antigo', produto_id: 'p-ce', modulo_id: null },
      ],
      bancos_horas_baseline: [
        {
          id: 'v1',
          banco_id: 'b-edocs',
          data_inicio: '2026-07-01',
          data_fim: '2026-09-30',
          baseline_minutos: 1200,
          baseline_tickets: null,
          credito: 'mensal',
          motivo: 'Carga',
          ...autoria,
        },
        {
          id: 'v2',
          banco_id: 'b-edocs',
          data_inicio: '2026-10-01',
          data_fim: null,
          baseline_minutos: 1800,
          baseline_tickets: null,
          credito: 'mensal',
          motivo: 'Renovação',
          ...autoria,
        },
      ],
      bancos_horas_repasse: [
        {
          id: 'r1',
          banco_id: 'b-edocs',
          data_inicio: '2026-07-01',
          data_fim: null,
          percentual_mensal: '100.00',
          percentual_dentro_periodo: null,
          percentual_entre_periodos: null,
          motivo: 'Carga',
          ...autoria,
        },
      ],
    },
    {
      bancos_horas_criar: () => 'b-novo',
      bancos_horas_inativar: () => null,
      bancos_horas_nova_vigencia: () => 'v-novo',
    }
  );
}

describe('validarParametros', () => {
  it('aceita um banco completo', () => {
    expect(() => validarParametros(PARAMETROS)).not.toThrow();
  });

  it.each<[string, Partial<ParametrosBanco>, string]>([
    ['nome', { nome: '  ' }, 'Informe o nome do banco.'],
    ['escopo', { escopo: [] }, 'Escolha ao menos um produto, módulo ou filtro.'],
    [
      'padrão com escopo',
      { padrao: true },
      'O Banco padrão não tem escopo nem filtro: recebe o que não se encaixa nos outros.',
    ],
    [
      'início no dia 1',
      { inicioVigencia: '2026-10-15' },
      'O início da vigência é no dia 1 do mês.',
    ],
    [
      'fim antes do início',
      { fimVigencia: '2026-09-01' },
      'O fim não pode ser anterior ao início da vigência.',
    ],
    ['dia de início', { diaInicioApuracao: 29 }, 'O dia de início da apuração vai de 1 a 28.'],
    ['dia de fim', { diaFimApuracao: 29 }, 'O dia de fim da apuração vai de 0 (último dia) a 28.'],
    [
      'repasse por período',
      { repasseEspecial: 'por_periodo', duracaoPeriodoMeses: 2, periodosAteZerar: 2 },
      'Duração × períodos precisa ser igual ao período de apuração (3 meses).',
    ],
    [
      'filtro vazio',
      { escopo: [], filtroIc: { operador: 'contem', valor: ' ' } },
      'Informe o valor do filtro.',
    ],
  ])('recusa %s', (_caso, mudanca, mensagem) => {
    expect(() => validarParametros({ ...PARAMETROS, ...mudanca })).toThrow(mensagem);
  });

  it('só com filtro, sem escopo, é aceito (Q2); o padrão não precisa de escopo', () => {
    expect(() =>
      validarParametros({ ...PARAMETROS, escopo: [], filtroIc: { operador: 'igual', valor: 'X' } })
    ).not.toThrow();
    expect(() => validarParametros({ ...PARAMETROS, padrao: true, escopo: [] })).not.toThrow();
  });
});

describe('conflitoDeEscopo (RN-05)', () => {
  const outros = [
    {
      nome: 'e-DOCS',
      escopo: [
        { produtoId: 'p-comply', moduloId: 'm-nfe' },
        { produtoId: 'p-edocs', moduloId: null },
      ],
    },
  ];
  it('mesmo módulo, ou produto inteiro contra qualquer módulo dele, conflita', () => {
    expect(conflitoDeEscopo([{ produtoId: 'p-comply', moduloId: 'm-nfe' }], outros)).toBe('e-DOCS');
    expect(conflitoDeEscopo([{ produtoId: 'p-comply', moduloId: null }], outros)).toBe('e-DOCS');
    expect(conflitoDeEscopo([{ produtoId: 'p-edocs', moduloId: 'm-qualquer' }], outros)).toBe(
      'e-DOCS'
    );
  });
  it('outro módulo do mesmo produto não conflita', () => {
    expect(conflitoDeEscopo([{ produtoId: 'p-comply', moduloId: 'm-cte' }], outros)).toBeNull();
  });
});

describe('BancosHorasCadastroService.listar', () => {
  it('devolve os bancos da empresa na ordem, com escopo e vigências (mais recente primeiro)', async () => {
    const bancos = await new BancosHorasCadastroService(cenario() as any).listar('e1');
    expect(bancos.map((b) => b.id)).toEqual(['b-edocs', 'b-fiscal', 'b-antigo']);
    expect(bancos[0]).toMatchObject({
      nome: 'FISCAL – e-DOCS',
      empresaId: 'e1',
      ordem: 1,
      ativo: true,
      fimVigencia: '2027-06-01',
      filtroIc: { operador: 'contem', valor: 'NIQUEL' },
      escopo: [
        { produtoId: 'p-comply', moduloId: 'm-nfe' },
        { produtoId: 'p-edocs', moduloId: null },
      ],
      espelhaLegado: false,
      atualizadoEm: '2026-10-22T12:00:00Z',
    });
    expect(bancos[0].baselines.map((v) => v.id)).toEqual(['v2', 'v1']);
    expect(bancos[0].repasses[0]).toMatchObject({ percentualMensal: 100, motivo: 'Carga' });
    expect(bancos[1]).toMatchObject({
      padrao: true,
      espelhaLegado: true,
      escopo: [],
      filtroIc: null,
    });
  });
});

describe('BancosHorasCadastroService.criar', () => {
  it('cria pela função do banco, numa chamada só', async () => {
    const fake = cenario();
    const id = await new BancosHorasCadastroService(fake as any).criar({
      ...PARAMETROS,
      nome: ' Banco COMEX ',
      descricao: ' ',
      empresaId: 'e1',
      baseline: { baselineMinutos: 2400, baselineTickets: null, credito: 'mensal' },
      repasse: {
        percentualMensal: 50,
        percentualDentroPeriodo: null,
        percentualEntrePeriodos: null,
      },
    });
    expect(id).toBe('b-novo');
    expect(fake.chamadasRpc.at(-1)).toEqual({
      nome: 'bancos_horas_criar',
      args: {
        p_banco: {
          empresa_id: 'e1',
          nome: 'Banco COMEX',
          descricao: null,
          padrao: false,
          tipo_contrato: 'horas',
          periodo_apuracao: 3,
          inicio_vigencia: '2026-10-01',
          fim_vigencia: null,
          dia_inicio_apuracao: 1,
          dia_fim_apuracao: 0,
          taxa_produto: 'OUTROS',
          taxa_tipo_hora: 'excedente',
          repasse_especial: 'nenhum',
          duracao_periodo_meses: null,
          periodos_ate_zerar: null,
          consome_outros_bancos: false,
          filtro_ic_operador: null,
          filtro_ic_valor: null,
        },
        p_escopo: [{ produto_id: 'p-ce', modulo_id: null }],
        p_baseline: { baseline_minutos: 2400, baseline_tickets: null, credito: 'mensal' },
        p_repasse: {
          percentual_mensal: 50,
          percentual_dentro_periodo: null,
          percentual_entre_periodos: null,
        },
      },
    });
  });

  it('avisa o conflito de escopo com outro banco ativo antes de gravar (banco inativo não conta)', async () => {
    const fake = cenario();
    const s = new BancosHorasCadastroService(fake as any);
    const novo = {
      ...PARAMETROS,
      empresaId: 'e1',
      baseline: { baselineMinutos: 60, baselineTickets: null, credito: 'mensal' as const },
      repasse: {
        percentualMensal: 50,
        percentualDentroPeriodo: null,
        percentualEntrePeriodos: null,
      },
    };
    await expect(
      s.criar({ ...novo, escopo: [{ produtoId: 'p-edocs', moduloId: null }] })
    ).rejects.toMatchObject({
      message: 'Conflito de escopo: o banco "FISCAL – e-DOCS" já cobre este produto ou módulo.',
      chave: 'erros.bancos.conflitoEscopo',
      valores: { banco: 'FISCAL – e-DOCS' },
    });
    expect(fake.chamadasRpc).toHaveLength(0);
    // p-ce está só no banco inativo
    await expect(s.criar(novo)).resolves.toBe('b-novo');
  });
});

describe('BancosHorasCadastroService.salvar', () => {
  it('atualiza os parâmetros e troca só o escopo que mudou', async () => {
    const fake = cenario();
    await new BancosHorasCadastroService(fake as any).salvar(
      { id: 'b-edocs', empresaId: 'e1' },
      {
        ...PARAMETROS,
        nome: 'FISCAL – e-DOCS',
        fimVigencia: '2027-12-01',
        filtroIc: null,
        escopo: [
          { produtoId: 'p-edocs', moduloId: null },
          { produtoId: 'p-comply', moduloId: 'm-cte' },
        ],
      }
    );
    expect(fake.tabelas.bancos_horas.find((b) => b.id === 'b-edocs')).toMatchObject({
      fim_vigencia: '2027-12-01',
      filtro_ic_operador: null,
      filtro_ic_valor: null,
      inicio_vigencia: '2026-10-01',
    });
    const escopo = fake.tabelas.bancos_horas_escopo.filter((e) => e.banco_id === 'b-edocs');
    expect(escopo.map((e) => `${e.produto_id}|${e.modulo_id}`).sort()).toEqual([
      'p-comply|m-cte',
      'p-edocs|null',
    ]);
    // A linha que continuou é a mesma
    expect(escopo.some((e) => e.id === 'x2')).toBe(true);
  });

  it('o próprio escopo não conta como conflito', async () => {
    const fake = cenario();
    await expect(
      new BancosHorasCadastroService(fake as any).salvar(
        { id: 'b-edocs', empresaId: 'e1' },
        { ...PARAMETROS, escopo: [{ produtoId: 'p-edocs', moduloId: null }] }
      )
    ).resolves.toBeUndefined();
  });
});

describe('BancosHorasCadastroService — ordem, situação e vigências', () => {
  it('reordena pela posição na lista', async () => {
    const fake = cenario();
    await new BancosHorasCadastroService(fake as any).reordenar(['b-fiscal', 'b-edocs']);
    const ordem = Object.fromEntries(fake.tabelas.bancos_horas.map((b) => [b.id, b.ordem]));
    expect(ordem).toMatchObject({ 'b-fiscal': 1, 'b-edocs': 2 });
  });

  it('inativa pela função do banco, com o motivo', async () => {
    const fake = cenario();
    await new BancosHorasCadastroService(fake as any).inativar('b-edocs', ' Fim do contrato ');
    expect(fake.chamadasRpc.at(-1)).toEqual({
      nome: 'bancos_horas_inativar',
      args: { p_banco_id: 'b-edocs', p_motivo: 'Fim do contrato' },
    });
  });

  it('inativar exige motivo', async () => {
    const fake = cenario();
    await expect(
      new BancosHorasCadastroService(fake as any).inativar('b-edocs', ' ')
    ).rejects.toMatchObject({ message: 'Informe o motivo da alteração.', chave: 'erros.motivo' });
    expect(fake.chamadasRpc).toHaveLength(0);
  });

  it('reativar limpa quando e quem inativou', async () => {
    const fake = cenario();
    fake.tabelas.bancos_horas.find((b) => b.id === 'b-antigo')!.inativado_em = '2026-09-01';
    await new BancosHorasCadastroService(fake as any).reativar('b-antigo');
    expect(fake.tabelas.bancos_horas.find((b) => b.id === 'b-antigo')).toMatchObject({
      ativo: true,
      inativado_em: null,
      inativado_por: null,
    });
  });

  it('nova vigência de baseline e de repasse pela função do banco', async () => {
    const fake = cenario();
    const s = new BancosHorasCadastroService(fake as any);
    await s.novaVigencia({
      bancoId: 'b-edocs',
      tipo: 'baseline',
      desde: '2027-01-01',
      valores: { baselineMinutos: 2400, baselineTickets: null, credito: 'mensal' },
      motivo: 'Renovação',
    });
    await s.novaVigencia({
      bancoId: 'b-edocs',
      tipo: 'repasse',
      desde: '2027-01-01',
      valores: {
        percentualMensal: 0,
        percentualDentroPeriodo: null,
        percentualEntrePeriodos: null,
      },
      motivo: 'Sem repasse',
    });
    expect(fake.chamadasRpc).toEqual([
      {
        nome: 'bancos_horas_nova_vigencia',
        args: {
          p_banco_id: 'b-edocs',
          p_tipo: 'baseline',
          p_desde: '2027-01-01',
          p_valores: { baseline_minutos: 2400, baseline_tickets: null, credito: 'mensal' },
          p_motivo: 'Renovação',
        },
      },
      {
        nome: 'bancos_horas_nova_vigencia',
        args: {
          p_banco_id: 'b-edocs',
          p_tipo: 'repasse',
          p_desde: '2027-01-01',
          p_valores: {
            percentual_mensal: 0,
            percentual_dentro_periodo: null,
            percentual_entre_periodos: null,
          },
          p_motivo: 'Sem repasse',
        },
      },
    ]);
  });

  it('repassa a mensagem do banco', async () => {
    const fake = cenario();
    fake.rpc = async () => ({
      data: null,
      error: { message: 'O mês 12/2026 está fechado: a vigência nova começa depois dele.' },
    });
    await expect(
      new BancosHorasCadastroService(fake as any).novaVigencia({
        bancoId: 'b-edocs',
        tipo: 'repasse',
        desde: '2026-12-01',
        valores: {
          percentualMensal: 0,
          percentualDentroPeriodo: null,
          percentualEntrePeriodos: null,
        },
        motivo: 'x',
      })
    ).rejects.toThrow('O mês 12/2026 está fechado: a vigência nova começa depois dele.');
  });
});

describe('validarParametros — chave de tradução', () => {
  const capturar = (fn: () => unknown) => {
    try {
      fn();
    } catch (erro) {
      return erro;
    }
    return null;
  };

  it('cada validação leva a chave e os valores para a tela traduzir', () => {
    expect(capturar(() => validarParametros({ ...PARAMETROS, nome: '  ' }))).toMatchObject({
      chave: 'erros.bancos.nome',
    });
    expect(
      capturar(() =>
        validarParametros({
          ...PARAMETROS,
          repasseEspecial: 'por_periodo',
          duracaoPeriodoMeses: 2,
          periodosAteZerar: 2,
        })
      )
    ).toMatchObject({ chave: 'erros.bancos.duracaoPeriodos', valores: { meses: 3 } });
  });
});
