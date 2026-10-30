import { describe, it, expect } from 'vitest';
import { criarSupabaseEmMemoria, type SupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import { DeParaService, classificar } from '../deParaService';

const autoria = { updated_at: '2026-10-22T12:00:00Z', updated_by: 'u1' };

function cenario() {
  return criarSupabaseEmMemoria(
    {
      grupos_aranda: [
        {
          id: 'g2',
          grupo_aranda: 'AMS APL - TECNICO - N2',
          grupo_book: 'COMEX - Técnico',
          solucao_id: 's1',
          produto_id: null,
          modulo_id: null,
          classificacao: 'solucao',
          ativo: true,
          ...autoria,
          grupos_aranda_vinculos: [
            {
              solucao_id: 's1',
              produto_id: null,
              modulo_id: null,
              created_at: '2026-10-01T00:00:00Z',
            },
          ],
        },
        {
          id: 'g1',
          grupo_aranda: 'AMS APL - CAMBIO - N2',
          grupo_book: 'COMEX - Câmbio',
          solucao_id: 's1',
          produto_id: 'p1',
          modulo_id: 'm1',
          classificacao: 'modulo',
          ativo: true,
          ...autoria,
          // O primeiro vínculo (o mais antigo) é o principal, espelhado nas colunas
          grupos_aranda_vinculos: [
            {
              solucao_id: 's2',
              produto_id: 'p9',
              modulo_id: null,
              created_at: '2026-10-29T00:00:00Z',
            },
            {
              solucao_id: 's1',
              produto_id: 'p1',
              modulo_id: 'm1',
              created_at: '2026-10-01T00:00:00Z',
            },
          ],
        },
        {
          id: 'g3',
          grupo_aranda: 'AMS APL - ANTIGO - N2',
          grupo_book: 'COMEX - Antigo',
          solucao_id: null,
          produto_id: null,
          modulo_id: null,
          classificacao: 'nao_se_aplica',
          ativo: false,
          ...autoria,
          grupos_aranda_vinculos: [],
        },
      ],
    },
    {
      grupos_aranda_vincular: () => null,
      grupos_aranda_desvincular: () => null,
      grupos_aranda_uso: () => [
        {
          grupo_aranda_id: 'g1',
          apontamentos: 40,
          tickets: 3,
          empresas_multiplos: ['EMPRESA ALFA'],
        },
      ],
      grupos_aranda_nao_mapeados: () => [
        {
          grupo_aranda: 'AMS APL - NOVO - N2',
          apontamentos: 5,
          tickets: 1,
          empresas: ['EMPRESA BETA'],
          primeira_ocorrencia: '2026-09-01',
        },
      ],
    }
  );
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

const destinoRpc = (solucao: string | null, produto: string | null, modulo: string | null) => ({
  p_solucao: solucao,
  p_produto: produto,
  p_modulo: modulo,
});
const vincular = (
  grupos: string[],
  destino: ReturnType<typeof destinoRpc>,
  substituir: boolean
) => ({
  nome: 'grupos_aranda_vincular',
  args: { p_grupos: grupos, ...destino, p_substituir: substituir },
});

describe('classificar', () => {
  it('a classificação vem do nível mais fundo do destino', () => {
    expect(classificar({ solucaoId: 's', produtoId: 'p', moduloId: 'm' })).toBe('modulo');
    expect(classificar({ solucaoId: 's', produtoId: 'p', moduloId: null })).toBe('produto');
    expect(classificar({ solucaoId: 's', produtoId: null, moduloId: null })).toBe('solucao');
    expect(classificar({ solucaoId: null, produtoId: null, moduloId: null })).toBe('nao_se_aplica');
  });
});

describe('DeParaService.listar', () => {
  it('devolve só os mapeamentos ativos, em ordem alfabética do grupo, com os vínculos', async () => {
    const lista = await new DeParaService(cenario() as any).listar();
    expect(lista.map((m) => m.id)).toEqual(['g1', 'g2']);
    expect(lista[0]).toEqual({
      id: 'g1',
      grupoAranda: 'AMS APL - CAMBIO - N2',
      grupoBook: 'COMEX - Câmbio',
      solucaoId: 's1',
      produtoId: 'p1',
      moduloId: 'm1',
      classificacao: 'modulo',
      vinculos: [
        { solucaoId: 's1', produtoId: 'p1', moduloId: 'm1' },
        { solucaoId: 's2', produtoId: 'p9', moduloId: null },
      ],
      atualizadoEm: '2026-10-22T12:00:00Z',
      atualizadoPor: 'u1',
    });
  });

  it('grupo sem vínculo: não se aplica', async () => {
    const fake = cenario();
    fake.tabelas.grupos_aranda[0].grupos_aranda_vinculos = [];
    const [, g2] = await new DeParaService(fake as any).listar();
    expect(g2).toMatchObject({
      solucaoId: null,
      produtoId: null,
      moduloId: null,
      classificacao: 'nao_se_aplica',
      vinculos: [],
    });
  });

  it('falha com mensagem descritiva', async () => {
    const s = new DeParaService(
      comErro(cenario(), 'grupos_aranda', { message: 'sem rede' }) as any
    );
    await expect(s.listar()).rejects.toThrow('Falha ao carregar o de-para: sem rede');
  });
});

describe('DeParaService.uso e naoMapeados', () => {
  it('uso por grupo, para a coluna Uso', async () => {
    const fake = cenario();
    const uso = await new DeParaService(fake as any).uso();
    expect(uso).toEqual({
      g1: { apontamentos: 40, tickets: 3, empresasMultiplos: ['EMPRESA ALFA'] },
    });
    expect(fake.chamadasRpc).toContainEqual({ nome: 'grupos_aranda_uso', args: { p_meses: 6 } });
  });

  it('grupos sem mapeamento nos últimos 12 meses', async () => {
    const fake = cenario();
    const lista = await new DeParaService(fake as any).naoMapeados();
    expect(lista).toEqual([
      {
        grupoAranda: 'AMS APL - NOVO - N2',
        apontamentos: 5,
        tickets: 1,
        empresas: ['EMPRESA BETA'],
        primeiraOcorrencia: '2026-09-01',
      },
    ]);
    expect(fake.chamadasRpc).toContainEqual({
      nome: 'grupos_aranda_nao_mapeados',
      args: { p_meses: 12 },
    });
  });
});

describe('DeParaService.salvar', () => {
  it('mapeamento novo grava o grupo e troca os vínculos pelo destino', async () => {
    const fake = cenario();
    await new DeParaService(fake as any).salvar({
      grupoAranda: ' AMS APL - NOVO - N2 ',
      grupoBook: ' COMEX - Novo ',
      destino: { solucaoId: 's1', produtoId: 'p1', moduloId: null },
    });
    const novo = fake.tabelas.grupos_aranda.at(-1)!;
    expect(novo).toMatchObject({
      grupo_aranda: 'AMS APL - NOVO - N2',
      grupo_book: 'COMEX - Novo',
      classificacao: 'nao_se_aplica',
    });
    expect(fake.chamadasRpc).toEqual([vincular([novo.id], destinoRpc('s1', 'p1', null), true)]);
  });

  it('grupo excluído antes é reativado, e não duplicado', async () => {
    const fake = cenario();
    await new DeParaService(fake as any).salvar({
      grupoAranda: 'ams apl - antigo - n2',
      grupoBook: 'COMEX - Antigo 2',
      destino: { solucaoId: 's1', produtoId: null, moduloId: null },
    });
    expect(fake.tabelas.grupos_aranda).toHaveLength(3);
    expect(fake.tabelas.grupos_aranda.find((g) => g.id === 'g3')).toMatchObject({
      grupo_aranda: 'AMS APL - ANTIGO - N2',
      grupo_book: 'COMEX - Antigo 2',
      ativo: true,
    });
    expect(fake.chamadasRpc).toEqual([vincular(['g3'], destinoRpc('s1', null, null), true)]);
  });

  it('edição muda Grupo do Book e troca os vínculos; nunca o grupo do Aranda', async () => {
    const fake = cenario();
    await new DeParaService(fake as any).salvar({
      id: 'g1',
      grupoAranda: 'OUTRO',
      grupoBook: 'COMEX - Câmbio 2',
      destino: { solucaoId: null, produtoId: null, moduloId: null },
    });
    const g1 = fake.tabelas.grupos_aranda.find((g) => g.id === 'g1')!;
    expect(g1).toMatchObject({
      grupo_aranda: 'AMS APL - CAMBIO - N2',
      grupo_book: 'COMEX - Câmbio 2',
    });
    // As colunas de destino são o espelho mantido pelo banco: o service não grava nelas
    expect(g1.produto_id).toBe('p1');
    expect(fake.chamadasRpc).toEqual([vincular(['g1'], destinoRpc(null, null, null), true)]);
  });

  it('edição sem destino (grupo em mais de um lugar): os vínculos não mudam', async () => {
    const fake = cenario();
    await new DeParaService(fake as any).salvar({
      id: 'g1',
      grupoAranda: 'AMS APL - CAMBIO - N2',
      grupoBook: 'COMEX - Câmbio 3',
    });
    expect(fake.tabelas.grupos_aranda.find((g) => g.id === 'g1')!.grupo_book).toBe(
      'COMEX - Câmbio 3'
    );
    expect(fake.chamadasRpc).toEqual([]);
  });

  it('traduz grupo já mapeado', async () => {
    const s = new DeParaService(
      comErro(cenario(), 'grupos_aranda', {
        code: '23505',
        message: 'duplicate key value violates unique constraint "grupos_aranda_grupo_aranda_key"',
      }) as any
    );
    await expect(
      s.salvar({
        id: 'g1',
        grupoAranda: 'X',
        grupoBook: 'Y',
        destino: { solucaoId: null, produtoId: null, moduloId: null },
      })
    ).rejects.toMatchObject({
      message: 'Este grupo do Aranda já está no de-para.',
      chave: 'erros.dePara.grupoJaMapeado',
    });
  });

  it('erro ao trocar os vínculos é do salvar', async () => {
    const fake = cenario();
    fake.rpc = async () => ({ data: null, error: { message: 'Produto não encontrado.' } });
    await expect(
      new DeParaService(fake as any).salvar({
        id: 'g1',
        grupoAranda: 'AMS APL - CAMBIO - N2',
        grupoBook: 'B',
        destino: { solucaoId: 's1', produtoId: 'px', moduloId: null },
      })
    ).rejects.toMatchObject({ chave: 'erros.falhas.salvarOMapeamento' });
  });
});

describe('DeParaService — vínculos em lote e exclusão', () => {
  it('atribuir (De-para) troca os vínculos de vários grupos pelo destino', async () => {
    const fake = cenario();
    await new DeParaService(fake as any).atribuirDestino(['g1', 'g2'], {
      solucaoId: 's1',
      produtoId: 'p2',
      moduloId: null,
    });
    expect(fake.chamadasRpc).toEqual([vincular(['g1', 'g2'], destinoRpc('s1', 'p2', null), true)]);
    expect(fake.tabelas.grupos_aranda.find((g) => g.id === 'g1')!.grupo_book).toBe(
      'COMEX - Câmbio'
    );
  });

  it('vincular (Produtos e Módulos) acrescenta o lugar', async () => {
    const fake = cenario();
    await new DeParaService(fake as any).vincular(['g1'], {
      solucaoId: 's1',
      produtoId: 'p2',
      moduloId: 'm7',
    });
    expect(fake.chamadasRpc).toEqual([vincular(['g1'], destinoRpc('s1', 'p2', 'm7'), false)]);
  });

  it('desvincular tira só aquele lugar', async () => {
    const fake = cenario();
    await new DeParaService(fake as any).desvincular(['g1', 'g2'], {
      solucaoId: 's1',
      produtoId: 'p1',
      moduloId: 'm1',
    });
    expect(fake.chamadasRpc).toEqual([
      {
        nome: 'grupos_aranda_desvincular',
        args: { p_grupos: ['g1', 'g2'], ...destinoRpc('s1', 'p1', 'm1') },
      },
    ]);
  });

  it('erro do banco ao vincular, desvincular ou atribuir vira erro traduzível', async () => {
    const fake = cenario();
    fake.rpc = async () => ({ data: null, error: { message: 'Sem permissão' } });
    const s = new DeParaService(fake as any);
    const destino = { solucaoId: 's1', produtoId: 'p1', moduloId: null };
    await expect(s.vincular(['g1'], destino)).rejects.toMatchObject({
      chave: 'erros.falhas.vincularOsGrupos',
    });
    await expect(s.desvincular(['g1'], destino)).rejects.toMatchObject({
      chave: 'erros.falhas.desvincularOsGrupos',
    });
    await expect(s.atribuirDestino(['g1'], destino)).rejects.toMatchObject({
      chave: 'erros.falhas.atribuirODestino',
    });
  });

  it('excluir inativa: o grupo volta para os não mapeados', async () => {
    const fake = cenario();
    await new DeParaService(fake as any).excluir('g2');
    expect(fake.tabelas.grupos_aranda.find((g) => g.id === 'g2')!.ativo).toBe(false);
  });
});

describe('DeParaService.importar', () => {
  it('grava cada linha com a regra do salvar: edição, reativação e novo', async () => {
    const fake = cenario();
    await new DeParaService(fake as any).importar([
      {
        id: 'g1',
        grupoAranda: 'AMS APL - CAMBIO - N2',
        grupoBook: 'COMEX - Câmbio 2',
        destino: { solucaoId: 's1', produtoId: 'p1', moduloId: null },
      },
      {
        grupoAranda: 'AMS APL - ANTIGO - N2',
        grupoBook: 'COMEX - Antigo',
        destino: { solucaoId: null, produtoId: null, moduloId: null },
      },
      {
        grupoAranda: 'AMS APL - NOVO - N2',
        grupoBook: 'COMEX - Novo',
        destino: { solucaoId: 's1', produtoId: null, moduloId: null },
      },
    ]);
    const grupos = fake.tabelas.grupos_aranda;
    expect(grupos.find((g) => g.id === 'g1')!.grupo_book).toBe('COMEX - Câmbio 2');
    expect(grupos.find((g) => g.id === 'g3')!.ativo).toBe(true);
    expect(grupos).toHaveLength(4);
    expect(fake.chamadasRpc.map((c) => c.args.p_grupos)).toEqual([['g1'], ['g3'], [grupos[3].id]]);
  });

  it('erro numa linha diz qual grupo', async () => {
    const fake = comErro(cenario(), 'grupos_aranda', { message: 'sem permissão' });
    await expect(
      new DeParaService(fake as any).importar([
        {
          id: 'g1',
          grupoAranda: 'AMS APL - CAMBIO - N2',
          grupoBook: 'B',
          destino: { solucaoId: null, produtoId: null, moduloId: null },
        },
      ])
    ).rejects.toMatchObject({
      message: 'AMS APL - CAMBIO - N2: Falha ao salvar o mapeamento: sem permissão',
      chave: 'erros.daLinha',
      valores: { linha: 'AMS APL - CAMBIO - N2' },
    });
  });
});
