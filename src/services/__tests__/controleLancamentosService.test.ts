import { describe, it, expect } from 'vitest';
import { criarSupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import { ControleLancamentosService } from '../controleLancamentosService';

const criado = { created_at: '2026-10-01T12:00:00Z', created_by: 'u1' };

function cenario() {
  return criarSupabaseEmMemoria({
    bancos_horas_reajustes: [
      {
        id: 'rj-ago',
        banco_id: 'b1',
        mes: 8,
        ano: 2026,
        tipo: 'entrada',
        minutos: 60,
        tickets: 0,
        justificativa: 'Atendimento presencial',
        anotacao_interna: 'Combinado com o gestor',
        origem: 'manual',
        ativo: true,
        motivo_inativacao: null,
        inativado_em: null,
        ...criado,
      },
      {
        id: 'rj-set-novo',
        banco_id: 'b1',
        mes: 9,
        ano: 2026,
        tipo: 'saida',
        minutos: 30,
        tickets: 0,
        justificativa: 'Lançado depois do Book',
        anotacao_interna: null,
        origem: 'manual',
        ativo: true,
        motivo_inativacao: null,
        inativado_em: null,
        ...criado,
      },
      {
        id: 'rj-set-inativo',
        banco_id: 'b1',
        mes: 9,
        ano: 2026,
        tipo: 'entrada',
        minutos: 15,
        tickets: 0,
        justificativa: 'Estava no Book',
        anotacao_interna: null,
        origem: 'manual',
        ativo: false,
        motivo_inativacao: 'Duplicado',
        inativado_em: '2026-10-05T10:00:00Z',
        ...criado,
      },
      {
        id: 'rj-out',
        banco_id: 'b1',
        mes: 10,
        ano: 2026,
        tipo: 'entrada',
        minutos: 45,
        tickets: 0,
        justificativa: 'Mês aberto',
        anotacao_interna: null,
        origem: 'manual',
        ativo: true,
        motivo_inativacao: null,
        inativado_em: null,
        ...criado,
      },
      {
        id: 'rj-outro-banco',
        banco_id: 'b9',
        mes: 10,
        ano: 2026,
        tipo: 'entrada',
        minutos: 45,
        tickets: 0,
        justificativa: 'Outro banco',
        anotacao_interna: null,
        origem: 'manual',
        ativo: true,
        ...criado,
      },
    ],
    // Setembro fechado: o Book levou só o reajuste que depois foi inativado
    bancos_horas_fechamentos: [
      { id: 'f-set', banco_id: 'b1', mes: 9, ano: 2026, versao: 1, vigente: true },
      { id: 'f-ago', banco_id: 'b1', mes: 8, ano: 2026, versao: 1, vigente: true },
    ],
    bancos_horas_fechamento_itens: [
      { fechamento_id: 'f-set', tipo: 'reajuste', item_id: 'rj-set-inativo' },
      { fechamento_id: 'f-ago', tipo: 'reajuste', item_id: 'rj-ago' },
    ],
    bancos_horas_observacoes: [
      {
        id: 'ob1',
        banco_id: 'b1',
        mes: 10,
        ano: 2026,
        texto: 'Janela de atualização',
        origem: 'manual',
        reajuste_id: null,
        ativo: true,
        ...criado,
        updated_at: '2026-10-01T12:00:00Z',
      },
      {
        id: 'ob2',
        banco_id: 'b1',
        mes: 9,
        ano: 2026,
        texto: '01:00 horas consumidas do Banco FISCAL',
        origem: 'consumo_entre_bancos',
        reajuste_id: null,
        ativo: true,
        ...criado,
        updated_at: '2026-10-03T08:00:00Z',
      },
      {
        id: 'ob3',
        banco_id: 'b1',
        mes: 10,
        ano: 2026,
        texto: 'Excluída',
        origem: 'manual',
        reajuste_id: null,
        ativo: false,
        ...criado,
        updated_at: '2026-10-01T12:00:00Z',
      },
    ],
  });
}

const periodo = [
  { mes: 8, ano: 2026 },
  { mes: 9, ano: 2026 },
  { mes: 10, ano: 2026 },
];

describe('ControleLancamentosService.reajustes', () => {
  it('lista os reajustes do banco no período, inclusive inativos, com a pendência de retificação', async () => {
    const lista = await new ControleLancamentosService(cenario() as any).reajustes('b1', periodo);
    const porId = Object.fromEntries(lista.map((r) => [r.id, r]));
    expect(Object.keys(porId).sort()).toEqual([
      'rj-ago',
      'rj-out',
      'rj-set-inativo',
      'rj-set-novo',
    ]);

    // Fechado e no Book: aplicado. Fechado fora do Book: aguardando. Inativo ainda no Book: aguardando
    expect(porId['rj-ago'].aguardandoRetificacao).toBe(false);
    expect(porId['rj-set-novo'].aguardandoRetificacao).toBe(true);
    expect(porId['rj-set-inativo'].aguardandoRetificacao).toBe(true);
    expect(porId['rj-out'].aguardandoRetificacao).toBe(false);

    expect(porId['rj-ago']).toMatchObject({
      bancoId: 'b1',
      mes: { mes: 8, ano: 2026 },
      tipo: 'entrada',
      minutos: 60,
      justificativa: 'Atendimento presencial',
      anotacaoInterna: 'Combinado com o gestor',
      ativo: true,
      criadoEm: '2026-10-01T12:00:00Z',
      criadoPor: 'u1',
    });
    expect(porId['rj-set-inativo']).toMatchObject({ motivoInativacao: 'Duplicado', ativo: false });
  });

  it('reajuste fora do período não entra', async () => {
    const lista = await new ControleLancamentosService(cenario() as any).reajustes('b1', [
      { mes: 10, ano: 2026 },
    ]);
    expect(lista.map((r) => r.id)).toEqual(['rj-out']);
  });
});

describe('ControleLancamentosService.lancarReajuste', () => {
  const base = {
    bancoId: 'b1',
    mes: { mes: 10, ano: 2026 },
    tipo: 'saida' as const,
    minutos: 90,
    tickets: 0,
    justificativa: ' Atendimento extra ',
    anotacaoInterna: ' ',
  };

  it('grava o reajuste manual', async () => {
    const fake = cenario();
    await new ControleLancamentosService(fake as any).lancarReajuste(base);
    expect(fake.tabelas.bancos_horas_reajustes.at(-1)).toMatchObject({
      banco_id: 'b1',
      mes: 10,
      ano: 2026,
      tipo: 'saida',
      minutos: 90,
      tickets: 0,
      justificativa: 'Atendimento extra',
      anotacao_interna: null,
      origem: 'manual',
    });
  });

  it.each([
    [{ minutos: 0, tickets: 0 }, 'Informe as horas ou os tickets do reajuste.'],
    [{ minutos: -5 }, 'Informe as horas ou os tickets do reajuste.'],
    [{ justificativa: '  ' }, 'Informe o motivo do reajuste.'],
    [{ justificativa: 'x'.repeat(701) }, 'O motivo passa de 700 caracteres.'],
    [{ anotacaoInterna: 'x'.repeat(701) }, 'As anotações internas passam de 700 caracteres.'],
  ])('recusa %o', async (mudanca, mensagem) => {
    const fake = cenario();
    await expect(
      new ControleLancamentosService(fake as any).lancarReajuste({ ...base, ...mudanca })
    ).rejects.toThrow(mensagem);
    expect(fake.tabelas.bancos_horas_reajustes).toHaveLength(5);
  });
});

describe('ControleLancamentosService.inativarReajuste', () => {
  it('inativa com motivo e data', async () => {
    const fake = cenario();
    await new ControleLancamentosService(fake as any).inativarReajuste(
      'rj-out',
      ' Lançado em duplicidade '
    );
    expect(fake.tabelas.bancos_horas_reajustes.find((r) => r.id === 'rj-out')).toMatchObject({
      ativo: false,
      motivo_inativacao: 'Lançado em duplicidade',
    });
    expect(
      fake.tabelas.bancos_horas_reajustes.find((r) => r.id === 'rj-out')!.inativado_em
    ).toEqual(expect.any(String));
  });

  it('exige o motivo', async () => {
    await expect(
      new ControleLancamentosService(cenario() as any).inativarReajuste('rj-out', ' ')
    ).rejects.toMatchObject({
      message: 'Informe o motivo da inativação.',
      chave: 'erros.controle.motivoInativacao',
    });
  });
});

describe('ControleLancamentosService — observações', () => {
  it('lista as observações ativas do banco no período, das mais recentes', async () => {
    const lista = await new ControleLancamentosService(cenario() as any).observacoes('b1', periodo);
    expect(lista.map((o) => o.id)).toEqual(['ob1', 'ob2']);
    expect(lista[0]).toMatchObject({
      mes: { mes: 10, ano: 2026 },
      texto: 'Janela de atualização',
      origem: 'manual',
      editada: false,
      criadoPor: 'u1',
    });
    expect(lista[1].editada).toBe(true);
  });

  it('cria e edita a observação manual', async () => {
    const fake = cenario();
    const s = new ControleLancamentosService(fake as any);
    await s.salvarObservacao({ bancoId: 'b1', mes: { mes: 9, ano: 2026 }, texto: ' Nova ' });
    expect(fake.tabelas.bancos_horas_observacoes.at(-1)).toMatchObject({
      banco_id: 'b1',
      mes: 9,
      ano: 2026,
      texto: 'Nova',
      origem: 'manual',
    });
    await s.salvarObservacao({
      id: 'ob1',
      bancoId: 'b1',
      mes: { mes: 9, ano: 2026 },
      texto: 'Editada',
    });
    expect(fake.tabelas.bancos_horas_observacoes.find((o) => o.id === 'ob1')).toMatchObject({
      texto: 'Editada',
      mes: 9,
      ano: 2026,
    });
  });

  it('valida o texto', async () => {
    const s = new ControleLancamentosService(cenario() as any);
    await expect(
      s.salvarObservacao({ bancoId: 'b1', mes: { mes: 9, ano: 2026 }, texto: ' ' })
    ).rejects.toMatchObject({
      message: 'Escreva a observação.',
      chave: 'erros.controle.observacaoVazia',
    });
    await expect(
      s.salvarObservacao({ bancoId: 'b1', mes: { mes: 9, ano: 2026 }, texto: 'x'.repeat(701) })
    ).rejects.toMatchObject({
      message: 'A observação passa de 700 caracteres.',
      chave: 'erros.controle.observacaoLonga',
      valores: { limite: 700 },
    });
  });

  it('excluir inativa (fica na auditoria)', async () => {
    const fake = cenario();
    await new ControleLancamentosService(fake as any).excluirObservacao('ob1');
    expect(fake.tabelas.bancos_horas_observacoes.find((o) => o.id === 'ob1')).toMatchObject({
      ativo: false,
    });
  });
});

describe('ControleLancamentosService.salvarAjustesRequerimentos', () => {
  function comAjustes() {
    return criarSupabaseEmMemoria({
      requerimentos_bancos: [
        { requerimento_id: 'r1', banco_id: 'b1', motivo: 'Antigo' },
        { requerimento_id: 'r2', banco_id: 'b2', motivo: 'Antigo' },
      ],
    });
  }

  it('grava a troca de banco com o motivo; nulo volta para o banco automático', async () => {
    const fake = comAjustes();
    await new ControleLancamentosService(fake as any).salvarAjustesRequerimentos(
      [
        { requerimentoId: 'r1', bancoId: 'b3' },
        { requerimentoId: 'r2', bancoId: null },
        { requerimentoId: 'r9', bancoId: 'b1' },
      ],
      ' Atendimento do contrato FISCAL '
    );
    const porId = Object.fromEntries(
      fake.tabelas.requerimentos_bancos.map((r) => [r.requerimento_id, r])
    );
    expect(Object.keys(porId).sort()).toEqual(['r1', 'r9']);
    expect(porId.r1).toMatchObject({ banco_id: 'b3', motivo: 'Atendimento do contrato FISCAL' });
    expect(porId.r9).toMatchObject({ banco_id: 'b1', motivo: 'Atendimento do contrato FISCAL' });
  });

  it('exige o motivo e ao menos uma alteração', async () => {
    const fake = comAjustes();
    const s = new ControleLancamentosService(fake as any);
    await expect(
      s.salvarAjustesRequerimentos([{ requerimentoId: 'r1', bancoId: 'b3' }], ' ')
    ).rejects.toMatchObject({
      message: 'Informe o motivo da troca de banco.',
      chave: 'erros.controle.motivoTroca',
    });
    await expect(s.salvarAjustesRequerimentos([], 'x')).rejects.toMatchObject({
      message: 'Nenhum requerimento com banco alterado.',
      chave: 'erros.controle.semAjustes',
    });
    expect(
      fake.tabelas.requerimentos_bancos.find((r) => r.requerimento_id === 'r1')!.banco_id
    ).toBe('b1');
  });
});

describe('ControleLancamentosService — o que vai ao cliente (Saldo Parcial)', () => {
  /** O falso devolve a linha inteira: registra as colunas pedidas para conferir */
  function comColunas() {
    const fake = cenario();
    const colunas: Record<string, string[]> = {};
    const from = fake.from.bind(fake);
    fake.from = (tabela: string) => {
      const consulta = from(tabela);
      const select = consulta.select.bind(consulta);
      consulta.select = (lista?: string) => {
        (colunas[tabela] ??= []).push(lista ?? '*');
        return select(lista);
      };
      return consulta;
    };
    return { fake, colunas };
  }

  it('reajustes ativos e já valendo, sem anotação interna nem autor', async () => {
    const { fake, colunas } = comColunas();
    const lista = await new ControleLancamentosService(fake as any).reajustesParaCliente(
      'b1',
      periodo
    );
    expect(lista).toEqual([
      {
        mes: { mes: 8, ano: 2026 },
        tipo: 'entrada',
        minutos: 60,
        tickets: 0,
        justificativa: 'Atendimento presencial',
      },
      {
        mes: { mes: 10, ano: 2026 },
        tipo: 'entrada',
        minutos: 45,
        tickets: 0,
        justificativa: 'Mês aberto',
      },
    ]);
    const pedidas = colunas.bancos_horas_reajustes.join(',');
    expect(pedidas).not.toMatch(/\*|anotacao_interna|created_by/);
  });

  it('observações ativas do período, só mês e texto, sem as de reajuste', async () => {
    const { fake, colunas } = comColunas();
    fake.tabelas.bancos_horas_observacoes.push({
      id: 'ob4',
      banco_id: 'b1',
      mes: 8,
      ano: 2026,
      texto: 'Atendimento presencial',
      origem: 'ajuste',
      reajuste_id: 'rj-ago',
      ativo: true,
      ...criado,
    });
    const lista = await new ControleLancamentosService(fake as any).observacoesParaCliente(
      'b1',
      periodo
    );
    expect(lista).toEqual([
      { mes: { mes: 9, ano: 2026 }, texto: '01:00 horas consumidas do Banco FISCAL' },
      { mes: { mes: 10, ano: 2026 }, texto: 'Janela de atualização' },
    ]);
    expect(colunas.bancos_horas_observacoes.join(',')).not.toMatch(/\*|created_by/);
  });
});
