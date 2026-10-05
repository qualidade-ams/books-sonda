import { describe, it, expect, vi, beforeEach } from 'vitest';
import { coletorSaldoParcialService } from '../coletorSaldoParcial';
import { supabase } from '@/integrations/supabase/client';
import { bancoHorasService } from '@/services/bancoHorasService';
import { requerimentosService } from '@/services/requerimentosService';
import { bancoHorasObservacoesService } from '@/services/bancoHorasObservacoesService';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() }
}));
vi.mock('@/services/bancoHorasService', () => ({
  bancoHorasService: { calcularMes: vi.fn() }
}));
vi.mock('@/services/requerimentosService', () => ({
  requerimentosService: { listarRequerimentos: vi.fn() }
}));
vi.mock('@/services/bancoHorasObservacoesService', () => ({
  bancoHorasObservacoesService: { listarObservacoesUnificadas: vi.fn() }
}));

/** Query encadeável que resolve com o resultado configurado */
function query(resultado: { data: unknown; error: unknown }) {
  const q: any = new Proxy({}, {
    get(_a, prop) {
      if (prop === 'then') return (res: any, rej: any) => Promise.resolve(resultado).then(res, rej);
      return () => q;
    }
  });
  return q;
}

const emSaoPaulo = (ano: number, mes: number, dia: number, hora: number) =>
  new Date(Date.UTC(ano, mes - 1, dia, hora + 3, 0, 0));

const empresaBase = {
  id: 'empresa-1',
  nome_abreviado: 'EMPRESA',
  nome_completo: 'Empresa Completa',
  tipo_contrato: 'horas',
  periodo_apuracao: 3,
  inicio_vigencia: '2025-08-01',
  percentual_repasse_mensal: 30,
  dia_inicio_apuracao: 1,
  dia_fim_apuracao: 0,
  template_padrao: 'template-1'
};

function configurar(empresa: Record<string, unknown>, opcoes: { percentualRpc?: number | null; templateNome?: string } = {}) {
  (supabase.from as any).mockImplementation((tabela: string) => {
    if (tabela === 'empresas_clientes') return query({ data: empresa, error: null });
    if (tabela === 'email_templates') return query({ data: { nome: opcoes.templateNome ?? 'Template Padrão' }, error: null });
    return query({ data: null, error: null });
  });
  (supabase.rpc as any).mockResolvedValue({
    data: opcoes.percentualRpc === null || opcoes.percentualRpc === undefined ? [] : [{ percentual: opcoes.percentualRpc }],
    error: null
  });
}

describe('coletorSaldoParcialService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (bancoHorasService.calcularMes as any).mockImplementation(async (_e: string, mes: number, ano: number) => ({ id: `c-${mes}`, mes, ano }));
    (requerimentosService.listarRequerimentos as any).mockResolvedValue([
      { chamado: 'PERIODO', mes_cobranca: '10/2026', enviado_faturamento: true, status: 'faturado', tipo_cobranca: 'Banco de Horas' },
      { chamado: 'DESENV', status: 'lancado', enviado_faturamento: false, data_envio: '2026-10-05' },
      { chamado: 'FORA', mes_cobranca: '07/2026', enviado_faturamento: true, status: 'faturado', tipo_cobranca: 'Banco de Horas' }
    ]);
    (bancoHorasObservacoesService.listarObservacoesUnificadas as any).mockResolvedValue([
      { observacao: 'No período', tipo: 'manual', mes: 9, ano: 2026 },
      { observacao: 'Fora', tipo: 'manual', mes: 5, ano: 2026 }
    ]);
  });

  it('monta os dados do período do mês de ontem, recalculando os meses em sequência', async () => {
    configurar(empresaBase, { percentualRpc: 50 });

    const [preparado] = await coletorSaldoParcialService.coletar('empresa-1', emSaoPaulo(2026, 10, 15, 8));

    expect(preparado.mesAno).toEqual({ mes: 10, ano: 2026 });
    expect(preparado.empresaNome).toBe('EMPRESA');
    expect((bancoHorasService.calcularMes as any).mock.calls.map((c: any[]) => [c[1], c[2]])).toEqual([[8, 2026], [9, 2026], [10, 2026]]);
    expect(preparado.dados.calculos.map(c => c.mes)).toEqual([8, 9, 10]);
    expect(preparado.dados.percentualRepasse).toBe(50);
    expect(preparado.dados.requerimentos.map(r => r.chamado)).toEqual(['PERIODO']);
    expect(preparado.dados.requerimentosEmDesenvolvimento.map(r => r.chamado)).toEqual(['DESENV']);
    expect(preparado.dados.observacoes.map(o => o.texto)).toEqual(['No período']);
    expect(preparado.dados.tipoCobranca).toBe('horas');
    expect(preparado.dados.isEnglish).toBe(false);
    expect(preparado.dados.nomePeriodo).toBeTruthy();
    expect(supabase.rpc).toHaveBeenCalledWith('get_percentual_repasse_vigente', { p_empresa_id: 'empresa-1', p_data: '2026-10-01' });
  });

  it('usa o percentual da empresa quando não há vigência no histórico', async () => {
    configurar(empresaBase, { percentualRpc: null });

    const [preparado] = await coletorSaldoParcialService.coletar('empresa-1', emSaoPaulo(2026, 10, 15, 8));

    expect(preparado.dados.percentualRepasse).toBe(30);
  });

  it('no dia 1 usa o mês que acabou de fechar', async () => {
    configurar(empresaBase);

    const [preparado] = await coletorSaldoParcialService.coletar('empresa-1', emSaoPaulo(2026, 10, 1, 8));

    expect(preparado.mesAno).toEqual({ mes: 9, ano: 2026 });
  });

  it('detecta inglês pelo nome do template padrão da empresa', async () => {
    configurar(empresaBase, { templateNome: 'Book English Template' });

    const [preparado] = await coletorSaldoParcialService.coletar('empresa-1', emSaoPaulo(2026, 10, 15, 8));

    expect(preparado.dados.isEnglish).toBe(true);
  });

  it('para contrato "ambos" prepara dois envios: tickets e horas', async () => {
    configurar({ ...empresaBase, tipo_contrato: 'ambos' });

    const preparados = await coletorSaldoParcialService.coletar('empresa-1', emSaoPaulo(2026, 10, 15, 8));

    expect(preparados.map(p => p.dados.tipoCobranca)).toEqual(['ticket', 'horas']);
    expect(bancoHorasService.calcularMes).toHaveBeenCalledTimes(3);
  });

  it('falha com mensagem clara quando a empresa não existe', async () => {
    (supabase.from as any).mockImplementation(() => query({ data: null, error: { message: 'não encontrada' } }));

    await expect(coletorSaldoParcialService.coletar('x', emSaoPaulo(2026, 10, 15, 8))).rejects.toThrow(/Empresa não encontrada/);
  });
});
