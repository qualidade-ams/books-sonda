import { describe, it, expect } from 'vitest';
import { criarSupabaseEmMemoria, type SupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import { CatalogoService } from '../catalogoService';

const autoria = { updated_at: '2026-10-22T12:00:00Z', updated_by: 'u1' };

function cenario() {
  return criarSupabaseEmMemoria({
    solucoes: [
      { id: 's2', codigo: 'FISCAIS', nome: 'FISCAIS', ordem: 2, ativo: true, ...autoria },
      { id: 's1', codigo: 'COMEX', nome: 'COMEX', ordem: 1, ativo: true, ...autoria },
    ],
    produtos: [
      {
        id: 'p2',
        solucao_id: 's1',
        codigo: 'FCI',
        nome: 'FCI',
        descricao: null,
        ordem: 2,
        ativo: true,
        a_classificar: false,
        ...autoria,
      },
      {
        id: 'p1',
        solucao_id: 's1',
        codigo: 'CE_PLUS',
        nome: 'CE PLUS',
        descricao: 'Comércio exterior',
        ordem: 1,
        ativo: true,
        a_classificar: false,
        ...autoria,
      },
      {
        id: 'pa',
        solucao_id: 's1',
        codigo: 'COMEX_A_CLASSIFICAR',
        nome: 'A classificar',
        descricao: null,
        ordem: 9,
        ativo: true,
        a_classificar: true,
        ...autoria,
      },
    ],
    produto_modulos: [
      {
        id: 'm2',
        produto_id: 'p1',
        nome: 'Drawback',
        descricao: null,
        ordem: 2,
        ativo: true,
        ...autoria,
      },
      {
        id: 'm1',
        produto_id: 'p1',
        nome: 'Câmbio',
        descricao: null,
        ordem: 1,
        ativo: true,
        ...autoria,
      },
      {
        id: 'ma',
        produto_id: 'pa',
        nome: 'ABAP',
        descricao: null,
        ordem: 1,
        ativo: true,
        ...autoria,
      },
      {
        id: 'mb',
        produto_id: 'pa',
        nome: 'LEGEM',
        descricao: null,
        ordem: 2,
        ativo: true,
        ...autoria,
      },
    ],
    bancos_horas_escopo: [
      {
        banco_id: 'b1',
        produto_id: 'p1',
        modulo_id: 'm1',
        bancos_horas: {
          id: 'b1',
          nome: 'Banco COMEX',
          ativo: true,
          empresas: { nome_abreviado: 'EMPRESA ALFA' },
        },
      },
      {
        banco_id: 'b2',
        produto_id: 'p2',
        modulo_id: null,
        bancos_horas: {
          id: 'b2',
          nome: 'Banco antigo',
          ativo: false,
          empresas: { nome_abreviado: 'EMPRESA BETA' },
        },
      },
    ],
    modulos_requerimento_produto: [
      { id: 'r2', modulo_requerimento: 'Gallery', produto_id: 'p9', modulo_id: null },
      { id: 'r1', modulo_requerimento: 'Comex', produto_id: 'p1', modulo_id: null },
    ],
  });
}

/** Supabase em que toda operação na tabela devolve o erro informado */
function comErro(
  base: SupabaseEmMemoria,
  tabela: string,
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
  return { ...base, from: (t: string) => (t === tabela ? falha : base.from(t)) };
}

describe('CatalogoService.carregar', () => {
  it('devolve soluções, produtos e módulos na ordem da tela, com nomes do domínio', async () => {
    const c = await new CatalogoService(cenario() as any).carregar();
    expect(c.solucoes.map((s) => s.codigo)).toEqual(['COMEX', 'FISCAIS']);
    expect(c.produtos.map((p) => p.id)).toEqual(['p1', 'p2', 'pa']);
    expect(c.modulos.filter((m) => m.produtoId === 'p1').map((m) => m.nome)).toEqual([
      'Câmbio',
      'Drawback',
    ]);
    expect(c.produtos[0]).toEqual({
      id: 'p1',
      solucaoId: 's1',
      codigo: 'CE_PLUS',
      nome: 'CE PLUS',
      descricao: 'Comércio exterior',
      ordem: 1,
      ativo: true,
      aClassificar: false,
      atualizadoEm: '2026-10-22T12:00:00Z',
      atualizadoPor: 'u1',
    });
    expect(c.produtos[2].aClassificar).toBe(true);
  });

  it('falha com mensagem descritiva', async () => {
    const s = new CatalogoService(comErro(cenario(), 'produtos', { message: 'sem rede' }) as any);
    await expect(s.carregar()).rejects.toMatchObject({
      message: 'Falha ao carregar o catálogo: sem rede',
      chave: 'erros.falhas.carregarOCatalogo',
      valores: { detalhe: 'sem rede' },
    });
  });
});

describe('CatalogoService.salvarSolucao', () => {
  it('cria com o código em maiúsculas e no fim da ordem', async () => {
    const fake = cenario();
    await new CatalogoService(fake as any).salvarSolucao({
      codigo: ' financeiras ',
      nome: ' FINANCEIRAS ',
      ativo: true,
    });
    expect(fake.tabelas.solucoes.at(-1)).toMatchObject({
      codigo: 'FINANCEIRAS',
      nome: 'FINANCEIRAS',
      ordem: 3,
      ativo: true,
    });
  });

  it('altera só nome e situação: o código não muda depois de criado', async () => {
    const fake = cenario();
    await new CatalogoService(fake as any).salvarSolucao({
      id: 's1',
      codigo: 'OUTRO',
      nome: 'Comércio Exterior',
      ativo: false,
    });
    expect(fake.tabelas.solucoes.find((s) => s.id === 's1')).toMatchObject({
      codigo: 'COMEX',
      nome: 'Comércio Exterior',
      ativo: false,
    });
  });

  it('traduz nome ou código repetido', async () => {
    const s = new CatalogoService(
      comErro(cenario(), 'solucoes', {
        code: '23505',
        message: 'duplicate key value violates unique constraint "solucoes_nome_uq"',
      }) as any
    );
    await expect(s.salvarSolucao({ id: 's1', nome: 'FISCAIS', ativo: true })).rejects.toThrow(
      'Já existe uma solução com este nome.'
    );
  });
});

describe('CatalogoService.salvarProduto', () => {
  it('cria com o código gerado do nome e no fim da solução', async () => {
    const fake = cenario();
    await new CatalogoService(fake as any).salvarProduto({
      solucaoId: 's1',
      nome: ' Catálogo de Produtos ',
      descricao: '',
      ativo: true,
    });
    expect(fake.tabelas.produtos.at(-1)).toMatchObject({
      solucao_id: 's1',
      codigo: 'CATALOGO_DE_PRODUTOS',
      nome: 'Catálogo de Produtos',
      descricao: null,
      ordem: 10,
      ativo: true,
    });
    expect(fake.tabelas.produtos.at(-1)).not.toHaveProperty('a_classificar');
  });

  it('código já usado ganha sufixo', async () => {
    const fake = cenario();
    await new CatalogoService(fake as any).salvarProduto({
      solucaoId: 's2',
      nome: 'FCI',
      descricao: null,
      ativo: true,
    });
    expect(fake.tabelas.produtos.at(-1)).toMatchObject({ codigo: 'FCI_2', ordem: 1 });
  });

  it('altera solução, nome, descrição e situação, sem tocar no código', async () => {
    const fake = cenario();
    await new CatalogoService(fake as any).salvarProduto({
      id: 'p2',
      solucaoId: 's2',
      nome: 'FCI Novo',
      descricao: 'Ficha',
      ativo: false,
    });
    expect(fake.tabelas.produtos.find((p) => p.id === 'p2')).toMatchObject({
      solucao_id: 's2',
      codigo: 'FCI',
      nome: 'FCI Novo',
      descricao: 'Ficha',
      ativo: false,
    });
  });

  it('repassa a mensagem das regras do banco', async () => {
    const s = new CatalogoService(
      comErro(cenario(), 'produtos', {
        code: 'P0001',
        message: 'O código do produto não muda depois de criado.',
      }) as any
    );
    await expect(
      s.salvarProduto({ id: 'p1', solucaoId: 's1', nome: 'X', descricao: null, ativo: true })
    ).rejects.toThrow('Falha ao salvar o produto: O código do produto não muda depois de criado.');
  });
});

describe('CatalogoService.reordenarProdutos', () => {
  it('grava a posição de cada produto na ordem recebida', async () => {
    const fake = cenario();
    await new CatalogoService(fake as any).reordenarProdutos(['p2', 'pa', 'p1']);
    const ordem = Object.fromEntries(fake.tabelas.produtos.map((p) => [p.id, p.ordem]));
    expect(ordem).toEqual({ p2: 1, pa: 2, p1: 3 });
  });
});

describe('CatalogoService.salvarModulo', () => {
  it('cria no fim do produto', async () => {
    const fake = cenario();
    await new CatalogoService(fake as any).salvarModulo({
      produtoId: 'p1',
      nome: ' Exportação ',
      descricao: null,
      ativo: true,
    });
    expect(fake.tabelas.produto_modulos.at(-1)).toMatchObject({
      produto_id: 'p1',
      nome: 'Exportação',
      ordem: 3,
    });
  });

  it('altera nome, descrição e situação; o produto muda só por "Mover para produto"', async () => {
    const fake = cenario();
    await new CatalogoService(fake as any).salvarModulo({
      id: 'm1',
      produtoId: 'p2',
      nome: 'Câmbio Pronto',
      descricao: 'd',
      ativo: false,
    });
    expect(fake.tabelas.produto_modulos.find((m) => m.id === 'm1')).toMatchObject({
      produto_id: 'p1',
      nome: 'Câmbio Pronto',
      descricao: 'd',
      ativo: false,
    });
  });

  it('traduz módulo repetido no produto', async () => {
    const s = new CatalogoService(
      comErro(cenario(), 'produto_modulos', {
        code: '23505',
        message: 'duplicate key value violates unique constraint "produto_modulos_nome_uq"',
      }) as any
    );
    await expect(
      s.salvarModulo({ produtoId: 'p1', nome: 'Câmbio', descricao: null, ativo: true })
    ).rejects.toMatchObject({
      message: 'Já existe um módulo com este nome no produto.',
      chave: 'erros.catalogo.moduloRepetido',
    });
  });
});

describe('CatalogoService.moverModulo (P8)', () => {
  it('leva o módulo "A classificar" para o produto escolhido', async () => {
    const fake = cenario();
    const r = await new CatalogoService(fake as any).moverModulo('ma', 'p1');
    expect(fake.tabelas.produto_modulos.find((m) => m.id === 'ma')!.produto_id).toBe('p1');
    expect(r).toEqual({ provisorioInativado: false });
    expect(fake.tabelas.produtos.find((p) => p.id === 'pa')!.ativo).toBe(true);
  });

  it('inativa o produto "A classificar" que fica sem módulos ativos', async () => {
    const fake = cenario();
    const s = new CatalogoService(fake as any);
    await s.moverModulo('ma', 'p1');
    const r = await s.moverModulo('mb', 'p2');
    expect(r).toEqual({ provisorioInativado: true });
    expect(fake.tabelas.produtos.find((p) => p.id === 'pa')!.ativo).toBe(false);
  });
});

describe('CatalogoService.usosEmBancos', () => {
  it('lista só os bancos ativos, com o nome da empresa', async () => {
    const usos = await new CatalogoService(cenario() as any).usosEmBancos();
    expect(usos).toEqual([
      {
        produtoId: 'p1',
        moduloId: 'm1',
        bancoId: 'b1',
        banco: 'Banco COMEX',
        empresa: 'EMPRESA ALFA',
      },
    ]);
  });
});

describe('CatalogoService — módulos de requerimento', () => {
  it('lista em ordem alfabética', async () => {
    const lista = await new CatalogoService(cenario() as any).modulosRequerimento();
    expect(lista).toEqual([
      { id: 'r1', moduloRequerimento: 'Comex', produtoId: 'p1', moduloId: null },
      { id: 'r2', moduloRequerimento: 'Gallery', produtoId: 'p9', moduloId: null },
    ]);
  });

  it('muda para onde o valor aponta', async () => {
    const fake = cenario();
    await new CatalogoService(fake as any).salvarModuloRequerimento('r1', 'p1', 'm2');
    expect(fake.tabelas.modulos_requerimento_produto.find((r) => r.id === 'r1')).toMatchObject({
      produto_id: 'p1',
      modulo_id: 'm2',
    });
  });
});

describe('CatalogoService.importar', () => {
  it('na ordem das linhas: cria produto e módulo, atualiza a descrição, e o que está igual fica', async () => {
    const fake = cenario();
    await new CatalogoService(fake as any).importar([
      { solucaoId: 's2', produto: 'COMPLY', modulo: null, descricao: 'Obrigações fiscais' },
      { solucaoId: 's2', produto: 'comply', modulo: 'ETL', descricao: 'Extração e carga' },
      { solucaoId: 's1', produto: 'ce plus', modulo: 'câmbio', descricao: 'Câmbio e remessas' },
      { solucaoId: 's1', produto: 'CE PLUS', modulo: null, descricao: null },
    ]);
    const { produtos, produto_modulos: modulos } = fake.tabelas;
    const comply = produtos.find((p) => p.nome === 'COMPLY')!;
    expect(comply).toMatchObject({
      solucao_id: 's2',
      descricao: 'Obrigações fiscais',
      ativo: true,
    });
    expect(modulos.find((m) => m.nome === 'ETL')).toMatchObject({
      produto_id: comply.id,
      descricao: 'Extração e carga',
    });
    expect(modulos.find((m) => m.id === 'm1')!.descricao).toBe('Câmbio e remessas');
    expect(produtos.find((p) => p.id === 'p1')!.descricao).toBe('Comércio exterior');
    expect(produtos).toHaveLength(4);
    expect(modulos).toHaveLength(5);
  });

  it('erro numa linha diz o produto e o módulo', async () => {
    const fake = comErro(cenario(), 'produto_modulos', { message: 'sem permissão' });
    await expect(
      new CatalogoService(fake as any).importar([
        { solucaoId: 's1', produto: 'CE PLUS', modulo: 'Novo', descricao: null },
      ])
    ).rejects.toThrow(/^CE PLUS › Novo: /);
  });
});
