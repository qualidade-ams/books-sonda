import { describe, it, expect } from 'vitest';
import { criarSupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import { AuditoriaService, AREAS, areaDaTabela, camposAlterados } from '../auditoriaService';

const linha = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  tabela: 'bancos_horas_reajustes',
  registro_id: `r${id}`,
  empresa_id: 'e1',
  banco_id: 'b1',
  acao: 'update',
  campos_alterados: ['ativo'],
  dados_antes: { ativo: true, updated_at: 'x' },
  dados_depois: { ativo: false, updated_at: 'y' },
  usuario_id: 'u1',
  origem: 'app',
  motivo: null,
  created_at: `2026-10-${String(10 + (id % 20)).padStart(2, '0')}T12:00:00Z`,
  ...extra,
});

function cenario(quantidade = 3, rpcs: Record<string, (args: any) => any> = {}) {
  return criarSupabaseEmMemoria(
    {
      auditoria_alteracoes: Array.from({ length: quantidade }, (_, i) => linha(i + 1)),
      empresas: [{ id: 'e1', nome_abreviado: 'EMPRESA ALFA' }],
      bancos_horas: [{ id: 'b1', nome: 'Banco COMEX' }],
    },
    {
      perfis_resumo: ({ p_ids }: { p_ids: string[] }) =>
        [{ id: 'u1', email: 'a@sonda.com', full_name: 'Pessoa A' }].filter((p) =>
          p_ids.includes(p.id)
        ),
      ...rpcs,
    }
  );
}

describe('áreas da auditoria', () => {
  it('agrupa as tabelas pelo nome da tela', () => {
    expect(areaDaTabela('bancos_horas_baseline')).toBe('Baseline do banco');
    expect(areaDaTabela('produto_modulos')).toBe('Produtos e módulos');
    expect(areaDaTabela('empresas_solucoes')).toBe('Empresas');
    expect(areaDaTabela('tabela_nova')).toBe('tabela_nova');
    expect(AREAS).toContain('Regras de contagem');
  });
});

describe('camposAlterados', () => {
  it('alteração: só os campos que mudaram, sem autoria', () => {
    expect(
      camposAlterados(
        'update',
        ['ativo', 'updated_at'],
        { ativo: true, updated_at: 'x' },
        { ativo: false, updated_at: 'y' }
      )
    ).toEqual([{ campo: 'ativo', antes: true, depois: false }]);
  });

  it('inclusão e exclusão: os campos preenchidos da linha', () => {
    expect(
      camposAlterados('insert', null, null, {
        nome: 'Varejo',
        ordem: 3,
        descricao: null,
        created_by: 'u',
      })
    ).toEqual([
      { campo: 'nome', antes: null, depois: 'Varejo' },
      { campo: 'ordem', antes: null, depois: 3 },
    ]);
    expect(camposAlterados('delete', null, { nome: 'Varejo' }, null)).toEqual([
      { campo: 'nome', antes: 'Varejo', depois: null },
    ]);
  });
});

describe('AuditoriaService.buscar', () => {
  it('traz os registros mais recentes com nomes de usuário, empresa e banco', async () => {
    const pagina = await new AuditoriaService(cenario() as any).buscar({});
    expect(pagina.temMais).toBe(false);
    expect(pagina.registros.map((r) => r.id)).toEqual([3, 2, 1]);
    expect(pagina.registros[0]).toEqual({
      id: 3,
      em: '2026-10-13T12:00:00Z',
      usuarioId: 'u1',
      usuario: 'Pessoa A',
      origem: 'app',
      tabela: 'bancos_horas_reajustes',
      area: 'Reajustes',
      registroId: 'r3',
      empresaId: 'e1',
      empresa: 'EMPRESA ALFA',
      bancoId: 'b1',
      banco: 'Banco COMEX',
      acao: 'update',
      campos: [{ campo: 'ativo', antes: true, depois: false }],
      dados: { ativo: false, updated_at: 'y' },
      motivo: null,
    });
  });

  it('pagina pelo momento do último registro', async () => {
    const s = new AuditoriaService(cenario(5) as any, 2);
    const primeira = await s.buscar({});
    expect(primeira.registros.map((r) => r.id)).toEqual([5, 4]);
    expect(primeira.temMais).toBe(true);
    const segunda = await s.buscar({ antesDe: primeira.registros.at(-1)!.em });
    expect(segunda.registros.map((r) => r.id)).toEqual([3, 2]);
    const ultima = await s.buscar({ antesDe: segunda.registros.at(-1)!.em });
    expect(ultima).toMatchObject({ temMais: false });
    expect(ultima.registros.map((r) => r.id)).toEqual([1]);
  });

  it('aplica os filtros no banco: período em Brasília, empresa, banco, área, ação, origem e quem', async () => {
    const fake = cenario(0);
    fake.tabelas.auditoria_alteracoes.push(
      linha(1, { created_at: '2026-10-01T02:59:00Z' }), // 30/09 em Brasília
      linha(2, { created_at: '2026-10-01T03:00:00Z' }),
      linha(3, {
        created_at: '2026-10-01T04:00:00Z',
        tabela: 'ramos_atividade',
        empresa_id: null,
        banco_id: null,
      }),
      linha(4, {
        created_at: '2026-10-01T05:00:00Z',
        acao: 'insert',
        origem: 'sincronizacao',
        usuario_id: null,
      }),
      linha(5, { created_at: '2026-10-02T03:00:00Z' }) // 02/10 em Brasília
    );
    const s = new AuditoriaService(fake as any);
    const ids = async (f: object) =>
      (await s.buscar({ desde: '2026-10-01', ate: '2026-10-01', ...f })).registros.map((r) => r.id);

    expect(await ids({})).toEqual([4, 3, 2]);
    expect(await ids({ areas: ['Ramos de atividade'] })).toEqual([3]);
    expect(await ids({ acoes: ['insert'] })).toEqual([4]);
    expect(await ids({ origens: ['app'] })).toEqual([3, 2]);
    expect(await ids({ usuarioId: 'u1' })).toEqual([3, 2]);
    expect(await ids({ empresaId: 'e1', bancoId: 'b1' })).toEqual([4, 2]);
  });

  it('sem permissão para nomes, mostra os registros sem eles', async () => {
    const fake = cenario();
    fake.rpc = async () => ({ data: null, error: { message: 'Sem permissão', code: '42501' } });
    const pagina = await new AuditoriaService(fake as any).buscar({});
    expect(pagina.registros[0]).toMatchObject({
      usuarioId: 'u1',
      usuario: null,
      empresa: 'EMPRESA ALFA',
    });
  });
});
