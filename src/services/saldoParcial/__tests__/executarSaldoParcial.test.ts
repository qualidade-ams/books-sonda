import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executarEnvioSaldoParcial, type DependenciasEnvioSaldoParcial } from '../executarSaldoParcial';
import { coletorSaldoParcialService } from '../coletorSaldoParcial';
import { gerarExcelConsumoHoras } from '@/utils/gerarExcelConsumoHoras';
import { supabase } from '@/integrations/supabase/client';
import { calculosFixture, requerimentosFixture } from '@/components/admin/banco-horas/__tests__/fixturesSaldoParcial';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: vi.fn() } }
}));
vi.mock('../coletorSaldoParcial', () => ({
  coletorSaldoParcialService: { coletar: vi.fn() }
}));
vi.mock('@/utils/gerarExcelConsumoHoras', () => ({
  gerarExcelConsumoHoras: vi.fn()
}));

const AGORA = new Date(Date.UTC(2026, 9, 15, 11, 0, 0)); // 15/10/2026 08:00 em São Paulo

const preparado = (tipoCobranca: string) => ({
  empresaId: 'empresa-1',
  empresaNome: 'EMPRESA',
  mesAno: { mes: 10, ano: 2026 },
  dados: {
    calculos: calculosFixture,
    tipoCobranca,
    percentualRepasse: 50,
    nomePeriodo: '4º Trimestre',
    requerimentos: requerimentosFixture,
    requerimentosEmDesenvolvimento: [],
    observacoes: [],
    diaInicioApuracao: 1,
    diaFimApuracao: 0,
    isEnglish: false
  }
});

let uploads: Array<{ bucket: string; caminho: string }>;

function deps(sobrescritas: Partial<DependenciasEnvioSaldoParcial> = {}): DependenciasEnvioSaldoParcial {
  return {
    renderizarImagem: vi.fn().mockResolvedValue('iVBORw0KGgo='),
    enviarEmail: vi.fn().mockResolvedValue(undefined),
    agora: AGORA,
    ...sobrescritas
  };
}

describe('executarEnvioSaldoParcial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploads = [];
    (coletorSaldoParcialService.coletar as any).mockResolvedValue([preparado('horas')]);
    (gerarExcelConsumoHoras as any).mockResolvedValue(
      new File(['excel'], 'consumo.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    );
    (supabase.storage.from as any).mockImplementation((bucket: string) => ({
      upload: vi.fn(async (caminho: string) => {
        uploads.push({ bucket, caminho });
        return { error: null };
      }),
      getPublicUrl: (caminho: string) => ({ data: { publicUrl: `https://storage.test/${bucket}/${caminho}` } })
    }));
  });

  it('envia o e-mail com assunto, destinatários, CC, imagem das tabelas e Excel anexo', async () => {
    const d = deps();

    const resultado = await executarEnvioSaldoParcial('empresa-1', ['a@cliente.com'], ['cc@sonda.com'], d);

    expect(resultado.enviados).toBe(1);
    expect(coletorSaldoParcialService.coletar).toHaveBeenCalledWith('empresa-1', AGORA);
    const payload = (d.enviarEmail as any).mock.calls[0][0];
    expect(payload.nome).toBe('EMPRESA - Saldo Parcial 14.10');
    expect(payload.email).toEqual(['a@cliente.com']);
    expect(payload.email_cc).toEqual(['cc@sonda.com']);
    expect(payload.email_bcc).toEqual([]);
    expect(payload.mensagem).toContain('<img src="https://storage.test/email-images/');
    expect(payload.mensagem).toContain('Bom dia!');
    expect(payload.anexos.totalArquivos).toBe(1);
    expect(payload.anexos.arquivos[0]).toMatchObject({ nome: 'consumo.xlsx', url: expect.stringContaining('anexos-temporarios/banco-horas/') });
    expect(uploads.map(u => u.bucket).sort()).toEqual(['anexos-temporarios', 'email-images']);
  });

  it('não envia e falha com o motivo quando a imagem das tabelas não pode ser gerada (sem fallback em HTML)', async () => {
    const d = deps({ renderizarImagem: vi.fn().mockRejectedValue(new Error('RENDER_IMAGE_URL não configurada')) });

    await expect(executarEnvioSaldoParcial('empresa-1', ['a@cliente.com'], [], d)).rejects.toThrow(
      /imagem das tabelas.*RENDER_IMAGE_URL não configurada/
    );
    expect(d.enviarEmail).not.toHaveBeenCalled();
  });

  it('também falha quando a renderização não devolve imagem', async () => {
    const d = deps({ renderizarImagem: vi.fn().mockResolvedValue(null) });

    await expect(executarEnvioSaldoParcial('empresa-1', ['a@cliente.com'], [], d)).rejects.toThrow(/imagem das tabelas/);
    expect(d.enviarEmail).not.toHaveBeenCalled();
  });

  it('envia sem anexo quando o Excel não pode ser gerado', async () => {
    (gerarExcelConsumoHoras as any).mockResolvedValue(null);
    const d = deps();

    await executarEnvioSaldoParcial('empresa-1', ['a@cliente.com'], [], d);

    expect((d.enviarEmail as any).mock.calls[0][0].anexos).toEqual({ totalArquivos: 0, tamanhoTotal: 0, arquivos: [] });
  });

  it('contrato "ambos" envia dois e-mails', async () => {
    (coletorSaldoParcialService.coletar as any).mockResolvedValue([preparado('ticket'), preparado('horas')]);
    const d = deps();

    const resultado = await executarEnvioSaldoParcial('empresa-1', ['a@cliente.com'], [], d);

    expect(resultado.enviados).toBe(2);
    expect(d.enviarEmail).toHaveBeenCalledTimes(2);
  });

  it('não envia nada sem destinatários', async () => {
    const d = deps();

    await expect(executarEnvioSaldoParcial('empresa-1', [], [], d)).rejects.toThrow(/destinatário/i);
    expect(d.enviarEmail).not.toHaveBeenCalled();
  });

  it('propaga a falha do envio', async () => {
    const d = deps({ enviarEmail: vi.fn().mockRejectedValue(new Error('webhook 500')) });

    await expect(executarEnvioSaldoParcial('empresa-1', ['a@cliente.com'], [], d)).rejects.toThrow('webhook 500');
  });
});
