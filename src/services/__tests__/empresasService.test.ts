import { describe, it, expect } from 'vitest';
import { criarSupabaseEmMemoria, type SupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import {
  EmpresasService,
  calcularPendencias,
  modeloDaEmpresa,
  totaisEmpresas,
} from '../empresasService';
import type { ContratoFiscal, InformacoesContrato, SolucaoDaEmpresa } from '@/types/empresas';

const autoria = { updated_at: '2026-10-22T12:00:00Z', updated_by: 'u1' };

const FISCAL_COMPLETO: ContratoFiscal = {
  modalidade: 'on_premise',
  edocs24x7: false,
  atualizacaoContratada: true,
  atualizacoesPorAno: 4,
  dba: 'atendimento',
  minutosAtendimento: 600,
  minutosMonitoramento: null,
  bancoDados: 'sql_server',
};
const FISCAL_VAZIO: ContratoFiscal = {
  modalidade: null,
  edocs24x7: null,
  atualizacaoContratada: null,
  atualizacoesPorAno: null,
  dba: null,
  minutosAtendimento: null,
  minutosMonitoramento: null,
  bancoDados: null,
};

const solucao = (codigo: string, extra: Partial<SolucaoDaEmpresa> = {}): SolucaoDaEmpresa => ({
  id: `es-${codigo}`,
  solucaoId: `s-${codigo}`,
  codigo,
  nome: codigo,
  temAms: true,
  emProjeto: false,
  justificativaProjeto: null,
  ...extra,
});

const informacoes = (extra: Partial<InformacoesContrato> = {}): InformacoesContrato => ({
  ramoId: 'r1',
  ramoSecundarioId: null,
  descricaoAtividade: null,
  fiscal: FISCAL_COMPLETO,
  ...extra,
});

describe('calcularPendencias (RN-35)', () => {
  const base = {
    solucoes: [solucao('COMEX'), solucao('FISCAIS')],
    informacoes: informacoes(),
    organizacoesAtivas: 1,
    emProjeto: false,
  };

  it('empresa completa não tem pendência', () => {
    expect(calcularPendencias(base)).toEqual([]);
  });

  it('ramo é exigido de todas as empresas (RN-27)', () => {
    expect(calcularPendencias({ ...base, informacoes: informacoes({ ramoId: null }) })).toEqual([
      'ramo',
    ]);
  });

  it('sem informações de contrato: ramo e FISCAL pendentes', () => {
    expect(calcularPendencias({ ...base, informacoes: null })).toEqual(['ramo', 'contrato_fiscal']);
  });

  it('Contrato FISCAL só conta para quem tem FISCAIS (RN-28)', () => {
    const vazio = informacoes({ fiscal: FISCAL_VAZIO });
    expect(calcularPendencias({ ...base, informacoes: vazio })).toEqual(['contrato_fiscal']);
    expect(
      calcularPendencias({ ...base, solucoes: [solucao('COMEX')], informacoes: vazio })
    ).toEqual([]);
  });

  it('campos condicionais do FISCAL (RN-31, RN-32 e P2)', () => {
    const com = (f: Partial<ContratoFiscal>) =>
      calcularPendencias({
        ...base,
        informacoes: informacoes({ fiscal: { ...FISCAL_COMPLETO, ...f } }),
      });
    expect(com({ atualizacoesPorAno: null })).toEqual(['contrato_fiscal']);
    expect(com({ atualizacaoContratada: false, atualizacoesPorAno: null })).toEqual([]);
    expect(com({ bancoDados: null })).toEqual(['contrato_fiscal']);
    expect(
      com({ modalidade: 'saas', dba: null, bancoDados: null, minutosAtendimento: null })
    ).toEqual([]);
    expect(com({ minutosAtendimento: null })).toEqual(['contrato_fiscal']);
    expect(com({ dba: 'atendimento_monitoramento' })).toEqual(['contrato_fiscal']);
    expect(com({ dba: 'nao_contratado', minutosAtendimento: null })).toEqual([]);
  });

  it('empresa com AMS precisa de organização do Aranda', () => {
    expect(calcularPendencias({ ...base, organizacoesAtivas: 0 })).toEqual(['organizacao']);
    const semAms = [solucao('COMEX', { temAms: false })];
    expect(calcularPendencias({ ...base, solucoes: semAms, organizacoesAtivas: 0 })).toEqual([]);
  });

  it('em projeto sem solução em projeto (3.2)', () => {
    expect(calcularPendencias({ ...base, emProjeto: true })).toEqual(['projeto_sem_solucao']);
    const emProjeto = [solucao('COMEX', { emProjeto: true, justificativaProjeto: 'x' })];
    expect(calcularPendencias({ ...base, solucoes: emProjeto, emProjeto: true })).toEqual([]);
  });
});

describe('modeloDaEmpresa', () => {
  it('liberada pelo modelo; no legado, mais de um banco ativo é múltiplo em validação', () => {
    expect(modeloDaEmpresa('multiplo', 1)).toBe('liberada');
    expect(modeloDaEmpresa('legado', 1)).toBe('legado');
    expect(modeloDaEmpresa('legado', 0)).toBe('legado');
    expect(modeloDaEmpresa('legado', 2)).toBe('multiplo');
  });
});

// ---------------------------------------------------------------------------

const linhaSolucao = (codigo: string, extra: Record<string, unknown> = {}) => ({
  id: `es-${codigo}`,
  solucao_id: `s-${codigo}`,
  tem_ams: true,
  em_projeto: false,
  justificativa_projeto: null,
  solucoes: { codigo, nome: codigo, ordem: codigo === 'COMEX' ? 1 : 2 },
  ...extra,
});

const contratoCompleto = {
  ramo_atividade_id: 'r1',
  ramo_secundario_id: null,
  descricao_atividade: null,
  fiscal_modalidade: 'saas',
  fiscal_edocs_24x7: false,
  fiscal_atualizacao_contratada: false,
  fiscal_atualizacoes_por_ano: null,
  fiscal_dba: null,
  fiscal_dba_minutos_atendimento: null,
  fiscal_dba_minutos_monitoramento: null,
  fiscal_banco_dados: null,
};

function cenario(rpcs: Record<string, (args: any) => any> = {}) {
  return criarSupabaseEmMemoria(
    {
      empresas: [
        {
          id: 'e2',
          nome_abreviado: 'EMPRESA BETA',
          nome_completo: 'EMPRESA BETA LTDA',
          status: 'inativo',
          modelo_calculo: 'legado',
          email_gestor: 'sem.cadastro@sonda.com',
          email_comercial: null,
          observacao: null,
          em_projeto: false,
          empresas_solucoes: [linhaSolucao('COMEX', { tem_ams: false })],
          empresas_informacoes_contrato: null,
          empresas_organizacoes_aranda: [],
          bancos_horas: [{ ativo: true }],
        },
        {
          id: 'e1',
          nome_abreviado: 'EMPRESA ALFA',
          nome_completo: 'EMPRESA ALFA S.A.',
          grupo_empresarial: 'GRUPO ÔMEGA',
          status: 'ativo',
          modelo_calculo: 'legado',
          vigencia_inicio: '2026-01-01',
          vigencia_fim: null,
          email_gestor: 'CS.Alfa@sonda.com',
          email_comercial: 'comercial@sonda.com',
          email_tm: null,
          observacao: 'Janela trimestral',
          em_projeto: false,
          id_aranda: '123',
          tipo_book: 'qualidade',
          template_padrao: 'portugues',
          link_sharepoint: 'https://exemplo.sharepoint.com/alfa',
          book_personalizado: false,
          book_anexo: true,
          empresa_consolidadora_id: 'e2',
          meta_sla_percentual: '95.00',
          quantidade_minima_chamados_sla: 10,
          ...autoria,
          empresas_solucoes: [linhaSolucao('FISCAIS'), linhaSolucao('COMEX')],
          empresas_informacoes_contrato: [contratoCompleto],
          empresas_organizacoes_aranda: [{ ativo: true }, { ativo: false }],
          bancos_horas: [{ ativo: true }, { ativo: true }, { ativo: false }],
        },
      ],
      empresas_solucoes: [
        { ...linhaSolucao('COMEX'), empresa_id: 'e1' },
        { ...linhaSolucao('FISCAIS'), empresa_id: 'e1' },
      ],
      empresas_informacoes_contrato: [{ empresa_id: 'e1', ...contratoCompleto }],
      empresas_organizacoes_aranda: [
        { id: 'o1', empresa_id: 'e1', nome_organizacao: 'EMPRESA ALFA S.A.', ativo: true },
        { id: 'o2', empresa_id: 'e1', nome_organizacao: 'ALFA ANTIGA', ativo: false },
        {
          id: 'o3',
          empresa_id: 'e2',
          nome_organizacao: 'EMPRESA BETA LTDA',
          ativo: true,
          empresas: { nome_abreviado: 'EMPRESA BETA' },
        },
      ],
      bancos_horas: [
        { empresa_id: 'e1', ativo: true },
        { empresa_id: 'e1', ativo: true },
        { empresa_id: 'e1', ativo: false },
        { empresa_id: 'e2', ativo: true },
      ],
      clientes: [
        {
          id: 'c1',
          empresa_id: 'e1',
          nome_completo: 'Contato Teste',
          email: 'contato@exemplo.com',
          finalidade_envio: 'book',
          principal_contato: true,
          status: 'ativo',
        },
      ],
      empresa_grupos: [
        {
          empresa_id: 'e1',
          grupo_id: 'g1',
          grupos_responsaveis: { id: 'g1', nome: 'Gestão AMS', descricao: null },
        },
      ],
      empresa_anexos: [
        {
          id: 'a1',
          empresa_id: 'e1',
          nome_original: 'Proposta.pdf',
          tamanho_bytes: 1200,
          storage_path: 'e1/proposta.pdf',
          ordem: 1,
        },
      ],
    },
    {
      perfis_resumo: ({ p_emails }: { p_emails: string[] }) =>
        [{ id: 'u9', email: 'cs.alfa@sonda.com', full_name: 'Pessoa CS' }].filter((p) =>
          p_emails.some((e) => e.toLowerCase() === p.email)
        ),
      ...rpcs,
    }
  );
}

function comErro(
  base: SupabaseEmMemoria,
  tabela: string,
  operacao: string,
  erro: { message: string; code?: string }
) {
  const falha: any = new Proxy(
    {},
    {
      get: (_alvo, prop) =>
        prop === 'then'
          ? (ok: (r: unknown) => unknown) => Promise.resolve({ data: null, error: erro }).then(ok)
          : () => falha,
    }
  );
  return {
    ...base,
    from: (t: string) => {
      const consulta = base.from(t);
      if (t !== tabela) return consulta;
      return new Proxy(consulta, {
        get: (alvo, prop) => (prop === operacao ? () => falha : alvo[prop].bind(alvo)),
      });
    },
  };
}

describe('EmpresasService.listar', () => {
  it('lista em ordem alfabética, com soluções, modelo, pendências e nome do CS', async () => {
    const lista = await new EmpresasService(cenario() as any).listar();
    expect(lista.map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(lista[0]).toEqual({
      id: 'e1',
      nomeAbreviado: 'EMPRESA ALFA',
      nomeCompleto: 'EMPRESA ALFA S.A.',
      status: 'ativo',
      modelo: 'multiplo',
      solucoes: [solucao('COMEX'), solucao('FISCAIS')],
      temAms: true,
      emProjeto: false,
      pendencias: [],
      emailCs: 'CS.Alfa@sonda.com',
      emailComercial: 'comercial@sonda.com',
      nomeCs: 'Pessoa CS',
      nomeComercial: null,
      observacao: 'Janela trimestral',
    });
    expect(lista[1]).toMatchObject({
      modelo: 'legado',
      temAms: false,
      nomeCs: null,
      pendencias: ['ramo'],
    });
  });

  it('sem permissão para os nomes, a lista sai só com os e-mails', async () => {
    const fake = cenario();
    const rpc = fake.rpc;
    fake.rpc = async (nome, args) =>
      nome === 'perfis_resumo'
        ? { data: null, error: { message: 'Sem permissão', code: '42501' } }
        : rpc(nome, args);
    const lista = await new EmpresasService(fake as any).listar();
    expect(lista[0]).toMatchObject({ emailCs: 'CS.Alfa@sonda.com', nomeCs: null });
  });

  it('falha com mensagem descritiva', async () => {
    const s = new EmpresasService(
      comErro(cenario(), 'empresas', 'select', { message: 'sem rede' }) as any
    );
    await expect(s.listar()).rejects.toMatchObject({
      message: 'Falha ao carregar as empresas: sem rede',
      chave: 'erros.falhas.carregarAsEmpresas',
    });
  });

  it('totais da lista', () => {
    expect(
      totaisEmpresas([
        { status: 'ativo', pendencias: [] },
        { status: 'ativo', pendencias: ['ramo'] },
        { status: 'inativo', pendencias: ['ramo'] },
      ] as any)
    ).toEqual({ total: 3, ativas: 2, inativas: 1, pendentes: 2 });
  });
});

describe('EmpresasService.carregar', () => {
  it('monta o detalhe da empresa, com os satélites da tela atual', async () => {
    const d = await new EmpresasService(cenario() as any).carregar('e1');
    expect(d).toMatchObject({
      id: 'e1',
      nomeAbreviado: 'EMPRESA ALFA',
      grupoEmpresarial: 'GRUPO ÔMEGA',
      modelo: 'multiplo',
      vigenciaInicio: '2026-01-01',
      vigenciaFim: null,
      emailCs: 'CS.Alfa@sonda.com',
      idAranda: '123',
      organizacoes: [{ id: 'o1', nome: 'EMPRESA ALFA S.A.' }],
      contatos: [
        {
          id: 'c1',
          nome: 'Contato Teste',
          email: 'contato@exemplo.com',
          finalidade: 'book',
          principal: true,
          ativo: true,
        },
      ],
      grupos: [{ id: 'g1', nome: 'Gestão AMS', descricao: null }],
      anexos: [
        { id: 'a1', nome: 'Proposta.pdf', tamanhoBytes: 1200, storagePath: 'e1/proposta.pdf' },
      ],
      book: {
        tipoBook: 'qualidade',
        templatePadrao: 'portugues',
        linkSharepoint: 'https://exemplo.sharepoint.com/alfa',
        bookPersonalizado: false,
        bookAnexo: true,
        consolidadora: { id: 'e2', nomeAbreviado: 'EMPRESA BETA' },
        metaSlaPercentual: 95,
        quantidadeMinimaChamadosSla: 10,
      },
      pendencias: [],
      atualizadoEm: '2026-10-22T12:00:00Z',
      atualizadoPor: 'u1',
    });
    expect(d.solucoes.map((s) => s.codigo)).toEqual(['COMEX', 'FISCAIS']);
    expect(d.informacoes).toEqual({
      ramoId: 'r1',
      ramoSecundarioId: null,
      descricaoAtividade: null,
      fiscal: {
        modalidade: 'saas',
        edocs24x7: false,
        atualizacaoContratada: false,
        atualizacoesPorAno: null,
        dba: null,
        minutosAtendimento: null,
        minutosMonitoramento: null,
        bancoDados: null,
      },
    });
  });

  it('empresa sem informações de contrato vem com tudo vazio e pendente', async () => {
    const d = await new EmpresasService(cenario() as any).carregar('e2');
    expect(d.informacoes).toEqual({
      ramoId: null,
      ramoSecundarioId: null,
      descricaoAtividade: null,
      fiscal: FISCAL_VAZIO,
    });
    expect(d.book.consolidadora).toBeNull();
  });
});

describe('EmpresasService.salvarSolucoes (AMS e projetos)', () => {
  it('grava AMS e projeto de cada solução', async () => {
    const fake = cenario();
    await new EmpresasService(fake as any).salvarSolucoes([
      { id: 'es-COMEX', temAms: false, emProjeto: false, justificativaProjeto: 'sobra' },
      { id: 'es-FISCAIS', temAms: true, emProjeto: true, justificativaProjeto: ' Implantação ' },
    ]);
    const porId = Object.fromEntries(fake.tabelas.empresas_solucoes.map((s) => [s.id, s]));
    expect(porId['es-COMEX']).toMatchObject({
      tem_ams: false,
      em_projeto: false,
      justificativa_projeto: null,
    });
    expect(porId['es-FISCAIS']).toMatchObject({
      tem_ams: true,
      em_projeto: true,
      justificativa_projeto: 'Implantação',
    });
  });

  it('projeto exige justificativa de até 200 caracteres', async () => {
    const s = new EmpresasService(cenario() as any);
    await expect(
      s.salvarSolucoes([
        { id: 'es-COMEX', temAms: true, emProjeto: true, justificativaProjeto: ' ' },
      ])
    ).rejects.toThrow('Explique brevemente o projeto.');
    await expect(
      s.salvarSolucoes([
        { id: 'es-COMEX', temAms: true, emProjeto: true, justificativaProjeto: 'x'.repeat(201) },
      ])
    ).rejects.toThrow('A justificativa do projeto passa de 200 caracteres.');
  });
});

describe('EmpresasService.salvarInformacoes', () => {
  const entrada = {
    idAranda: ' 456 ',
    organizacoes: ['empresa alfa s.a.', ' Alfa Filial ', 'ALFA FILIAL'],
    informacoes: informacoes({ ramoSecundarioId: 'r2', descricaoAtividade: ' Autopeças ' }),
  };

  it('grava ID do Aranda, organizações e informações do contrato', async () => {
    const fake = cenario();
    await new EmpresasService(fake as any).salvarInformacoes('e1', entrada);

    expect(fake.tabelas.empresas.find((e) => e.id === 'e1')!.id_aranda).toBe('456');

    const orgs = fake.tabelas.empresas_organizacoes_aranda.filter((o) => o.empresa_id === 'e1');
    // A linha nova não traz "ativo": vale o DEFAULT true da coluna
    const ativas = orgs.filter((o) => o.ativo !== false);
    expect(ativas.map((o) => o.nome_organizacao).sort()).toEqual([
      'ALFA FILIAL',
      'EMPRESA ALFA S.A.',
    ]);
    // A que já existia continua a mesma linha
    expect(orgs.find((o) => o.id === 'o1')!.ativo).toBe(true);

    expect(
      fake.tabelas.empresas_informacoes_contrato.find((c) => c.empresa_id === 'e1')
    ).toMatchObject({
      ramo_atividade_id: 'r1',
      ramo_secundario_id: 'r2',
      descricao_atividade: 'Autopeças',
      fiscal_modalidade: 'on_premise',
      fiscal_edocs_24x7: false,
      fiscal_atualizacao_contratada: true,
      fiscal_atualizacoes_por_ano: 4,
      fiscal_dba: 'atendimento',
      fiscal_dba_minutos_atendimento: 600,
      fiscal_dba_minutos_monitoramento: null,
      fiscal_banco_dados: 'sql_server',
    });
  });

  it('organização tirada da lista é inativada; a inativa volta se for incluída de novo', async () => {
    const fake = cenario();
    await new EmpresasService(fake as any).salvarInformacoes('e1', {
      ...entrada,
      organizacoes: ['Alfa Antiga'],
    });
    const orgs = Object.fromEntries(
      fake.tabelas.empresas_organizacoes_aranda.map((o) => [o.id, o.ativo])
    );
    expect(orgs).toMatchObject({ o1: false, o2: true });
    expect(fake.tabelas.empresas_organizacoes_aranda).toHaveLength(3);
  });

  it('organização de outra empresa: diz de qual', async () => {
    const s = new EmpresasService(
      comErro(cenario(), 'empresas_organizacoes_aranda', 'insert', {
        code: '23505',
        message:
          'duplicate key value violates unique constraint "empresas_organizacoes_aranda_nome_uq"',
      }) as any
    );
    await expect(
      s.salvarInformacoes('e1', {
        ...entrada,
        organizacoes: ['EMPRESA ALFA S.A.', 'empresa beta ltda'],
      })
    ).rejects.toMatchObject({
      message: 'A organização EMPRESA BETA LTDA já pertence à EMPRESA BETA.',
      chave: 'erros.empresas.organizacaoDeOutra',
      valores: { organizacao: 'EMPRESA BETA LTDA', empresa: 'EMPRESA BETA' },
    });
  });

  it('valida antes de gravar', async () => {
    const fake = cenario();
    const s = new EmpresasService(fake as any);
    await expect(
      s.salvarInformacoes('e1', {
        ...entrada,
        informacoes: informacoes({ ramoSecundarioId: 'r1' }),
      })
    ).rejects.toThrow('O ramo secundário precisa ser diferente do principal.');
    await expect(
      s.salvarInformacoes('e1', {
        ...entrada,
        informacoes: informacoes({ descricaoAtividade: 'x'.repeat(501) }),
      })
    ).rejects.toThrow('A descrição da atividade passa de 500 caracteres.');
    expect(fake.tabelas.empresas.find((e) => e.id === 'e1')!.id_aranda).toBe('123');
  });
});
