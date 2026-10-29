import { describe, it, expect, vi, beforeEach } from 'vitest';
import { criarSupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import { ComparacaoService } from '../comparacaoService';

const chamarSyncApi = vi.fn();
vi.mock('@/services/syncAgendamentosService', () => ({
  chamarSyncApi: (...args: unknown[]) => chamarSyncApi(...args),
}));

const medidas = {
  horas: { consumo: 600, requerimentos: 0, reajustes: 0, saldo: 0, repasse: 0, excedente: 0 },
  tickets: { consumo: 0, requerimentos: 0, reajustes: 0, saldo: 0, repasse: 0, excedente: 0 },
  valorAFaturar: 0,
};

function cenario(rpcs: Record<string, (args: any) => any> = {}) {
  return criarSupabaseEmMemoria(
    {
      bancos_horas_comparacao: [
        {
          empresa_id: 'e2',
          situacao: 'divergente',
          meses_comparados: 12,
          consumo_legado_minutos: 6000,
          consumo_novo_minutos: 6060,
          consumo_legado_tickets: 3,
          consumo_novo_tickets: 3,
          calculado_em: '2026-10-28T09:12:00Z',
          erro: null,
          erro_em: null,
          validada_por: null,
          validada_em: null,
          validacao_situacao: null,
          empresas: {
            nome_abreviado: 'EMPRESA GAMA',
            modelo_calculo: 'legado',
            modelo_alterado_em: null,
            modelo_alterado_por: null,
            bancos_horas: [
              { id: 'b2', ativo: true },
              { id: 'b3', ativo: false },
            ],
          },
        },
        {
          empresa_id: 'e1',
          situacao: 'identico',
          meses_comparados: 4,
          consumo_legado_minutos: 1200,
          consumo_novo_minutos: 1200,
          consumo_legado_tickets: 0,
          consumo_novo_tickets: 0,
          calculado_em: '2026-10-28T09:10:00Z',
          erro: 'Falha ao ler o fechamento',
          erro_em: '2026-10-28T10:00:00Z',
          validada_por: 'u1',
          validada_em: '2026-10-27T15:00:00Z',
          validacao_situacao: 'identico',
          empresas: {
            nome_abreviado: 'EMPRESA ALFA',
            modelo_calculo: 'multiplo',
            modelo_alterado_em: '2026-10-29T12:00:00Z',
            modelo_alterado_por: 'u1',
            bancos_horas: [{ id: 'b1', ativo: true }],
          },
        },
      ],
      bancos_horas_comparacao_meses: [
        {
          empresa_id: 'e2',
          ano: 2026,
          mes: 9,
          situacao: 'divergente',
          legado: medidas,
          novo: { ...medidas, porBanco: [] },
          origem_saldo: { mes: 8, ano: 2026 },
          itens: [{ chave: 'u1', motivo: 'sem_motivo' }],
          itens_total: 1,
          fechamento_legado_em: '2026-10-05T12:00:00Z',
        },
        {
          empresa_id: 'e2',
          ano: 2025,
          mes: 12,
          situacao: 'igual',
          legado: medidas,
          novo: { ...medidas, porBanco: [] },
          origem_saldo: null,
          itens: [],
          itens_total: 0,
          fechamento_legado_em: '2026-01-05T12:00:00Z',
        },
        { empresa_id: 'e1', ano: 2026, mes: 9, situacao: 'igual', legado: medidas, novo: medidas },
      ],
      // e1 foi liberada (transição em Mar), voltou e foi liberada de novo (transição em Set)
      bancos_horas_fechamentos: [
        { banco_id: 'b1', ano: 2026, mes: 3, motivo: 'transicao' },
        { banco_id: 'b1', ano: 2026, mes: 9, motivo: 'transicao' },
        { banco_id: 'b1', ano: 2026, mes: 10, motivo: 'geracao_book' },
        { banco_id: 'b2', ano: 2026, mes: 12, motivo: 'transicao' },
      ],
    },
    {
      perfis_resumo: () => [{ id: 'u1', email: 'x', full_name: 'Usuário Teste' }],
      validar_comparacao: () => null,
      ...rpcs,
    }
  );
}

describe('ComparacaoService', () => {
  beforeEach(() => chamarSyncApi.mockReset());

  it('lista as empresas por nome, com bancos ativos, erro e quem validou', async () => {
    const service = new ComparacaoService(cenario() as any);
    expect(await service.listar()).toEqual([
      {
        empresaId: 'e1',
        empresa: 'EMPRESA ALFA',
        bancosAtivos: 1,
        situacao: 'identico',
        mesesComparados: 4,
        consumoLegadoMinutos: 1200,
        consumoNovoMinutos: 1200,
        consumoLegadoTickets: 0,
        consumoNovoTickets: 0,
        calculadoEm: '2026-10-28T09:10:00Z',
        erro: 'Falha ao ler o fechamento',
        erroEm: '2026-10-28T10:00:00Z',
        validacao: { por: 'Usuário Teste', em: '2026-10-27T15:00:00Z', situacao: 'identico' },
        liberacao: {
          por: 'Usuário Teste',
          em: '2026-10-29T12:00:00Z',
          desde: { mes: 10, ano: 2026 },
        },
      },
      expect.objectContaining({
        empresaId: 'e2',
        empresa: 'EMPRESA GAMA',
        bancosAtivos: 1,
        validacao: null,
        liberacao: null,
      }),
    ]);
  });

  it('sem permissão para ler nomes, a validação fica sem o nome', async () => {
    const service = new ComparacaoService(
      cenario({
        perfis_resumo: () => {
          throw new Error('x');
        },
      }) as any
    );
    const [alfa] = await service.listar();
    expect(alfa.validacao).toEqual({ por: null, em: '2026-10-27T15:00:00Z', situacao: 'identico' });
    expect(alfa.liberacao?.por).toBeNull();
  });

  it('liberada sem transição (sem mês fechado no legado): desde fica nulo', async () => {
    const supabase = cenario();
    supabase.tabelas.bancos_horas_fechamentos = [];
    const [alfa] = await new ComparacaoService(supabase as any).listar();
    expect(alfa.liberacao).toMatchObject({ desde: null });
  });

  it('meses da empresa em ordem', async () => {
    const service = new ComparacaoService(cenario() as any);
    const meses = await service.meses('e2');
    expect(meses.map((m) => m.mes)).toEqual([
      { mes: 12, ano: 2025 },
      { mes: 9, ano: 2026 },
    ]);
    expect(meses[1]).toMatchObject({
      situacao: 'divergente',
      origemSaldo: { mes: 8, ano: 2026 },
      itens: [{ chave: 'u1', motivo: 'sem_motivo' }],
      itensTotal: 1,
      fechamentoLegadoEm: '2026-10-05T12:00:00Z',
    });
  });

  it('valida e desfaz pela função do banco', async () => {
    const supabase = cenario();
    const service = new ComparacaoService(supabase as any);
    await service.validar('e1', true);
    await service.validar('e1', false, 'Book de setembro retificado');
    expect(supabase.chamadasRpc.filter((c) => c.nome === 'validar_comparacao')).toEqual([
      { nome: 'validar_comparacao', args: { p_empresa_id: 'e1', p_validar: true, p_motivo: null } },
      {
        nome: 'validar_comparacao',
        args: { p_empresa_id: 'e1', p_validar: false, p_motivo: 'Book de setembro retificado' },
      },
    ]);
  });

  it('erro do banco ao validar vira erro traduzível', async () => {
    const supabase = cenario();
    supabase.rpc = async () => ({
      data: null,
      error: { message: 'Empresa com divergência não pode ser validada.' },
    });
    const service = new ComparacaoService(supabase as any);
    await expect(service.validar('e2', true)).rejects.toMatchObject({
      chave: 'erros.falhas.validarAComparacao',
    });
  });

  it('liberar monta a transição e grava pela função do banco', async () => {
    const supabase = cenario({ liberar_empresa: () => ({ transicao: { ok: true } }) });
    const transicao = { ano: 2026, mes: 9, motivo: 'transicao', bancos: [] };
    const montar = vi.fn(async () => transicao);
    await new ComparacaoService(supabase as any, montar as any).liberar('e2');
    expect(montar).toHaveBeenCalledWith('e2');
    expect(supabase.chamadasRpc).toEqual([
      { nome: 'liberar_empresa', args: { p_empresa_id: 'e2', p_fechamento: transicao } },
    ]);
  });

  it('liberar sem mês fechado no legado: grava sem transição', async () => {
    const supabase = cenario({ liberar_empresa: () => ({ transicao: null }) });
    await new ComparacaoService(supabase as any, async () => null).liberar('e2');
    expect(supabase.chamadasRpc).toEqual([
      { nome: 'liberar_empresa', args: { p_empresa_id: 'e2', p_fechamento: null } },
    ]);
  });

  it('erro do banco ao liberar vira erro traduzível', async () => {
    const supabase = cenario();
    supabase.rpc = async () => ({
      data: null,
      error: { message: 'Valide a comparação da empresa antes de liberar.' },
    });
    await expect(
      new ComparacaoService(supabase as any, async () => null).liberar('e2')
    ).rejects.toMatchObject({ chave: 'erros.falhas.liberarAEmpresa' });
  });

  it('lançamentos do Controle novo que a volta copia para o legado', async () => {
    const supabase = cenario({ lancamentos_para_legado: () => ({ reajustes: 2, observacoes: 1 }) });
    expect(await new ComparacaoService(supabase as any).lancamentosParaLegado('e1')).toEqual({
      reajustes: 2,
      observacoes: 1,
    });
    expect(supabase.chamadasRpc).toEqual([
      { nome: 'lancamentos_para_legado', args: { p_empresa_id: 'e1' } },
    ]);
  });

  it('voltar para legado com o motivo, pela função do banco', async () => {
    const supabase = cenario({ voltar_para_legado: () => ({ reajustes: 2, observacoes: 1 }) });
    await new ComparacaoService(supabase as any).voltar('e1', '  Book saiu com o banco errado ');
    expect(supabase.chamadasRpc).toEqual([
      {
        nome: 'voltar_para_legado',
        args: { p_empresa_id: 'e1', p_motivo: 'Book saiu com o banco errado' },
      },
    ]);
  });

  it('erro do banco ao voltar vira erro traduzível', async () => {
    const supabase = cenario();
    supabase.rpc = async () => ({ data: null, error: { message: 'Informe o motivo.' } });
    await expect(new ComparacaoService(supabase as any).voltar('e1', '')).rejects.toMatchObject({
      chave: 'erros.falhas.voltarAEmpresaParaOLegado',
    });
  });

  it('recalcular pede ao sync-api', async () => {
    chamarSyncApi.mockResolvedValue({ status: 202, dados: { iniciado: true } });
    const service = new ComparacaoService(cenario() as any);
    await service.recalcular('e2');
    expect(chamarSyncApi).toHaveBeenCalledWith('/api/comparacao/recalcular', { empresaId: 'e2' });
  });
});
