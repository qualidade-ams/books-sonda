/**
 * Saldo Parcial agendado e "Executar agora" da empresa liberada (Fase 5, Modelagem_Fase5.md
 * seção 8): um e-mail com uma tabela por banco e o Excel com uma aba por banco.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executarEnvioSaldoParcial } from '../executarSaldoParcial';
import { coletorSaldoParcialService } from '../coletorSaldoParcial';
import { controleSaldoParcialService } from '@/services/controleSaldoParcialService';
import { geracaoBookLiberada } from '@/services/geracaoBookLiberada';
import { supabase } from '@/integrations/supabase/client';
import type { SaldoParcialBanco } from '@/services/controleSaldoParcialService';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: vi.fn() }, from: vi.fn() },
}));
vi.mock('../coletorSaldoParcial', () => ({ coletorSaldoParcialService: { coletar: vi.fn() } }));
vi.mock('@/services/geracaoBookLiberada', () => ({
  geracaoBookLiberada: { noModeloNovo: vi.fn() },
}));
vi.mock('@/services/controleSaldoParcialService', () => ({
  controleSaldoParcialService: { bancos: vi.fn(), chamados: vi.fn(), idiomaDoEmail: vi.fn() },
}));

const AGORA = new Date(Date.UTC(2026, 9, 15, 11, 0, 0)); // 15/10/2026 08:00 em São Paulo

const banco = (bancoId: string, nome: string): SaldoParcialBanco => ({
  bancoId,
  nome,
  tipoContrato: 'horas',
  consomeOutrosBancos: false,
  meses: [
    { mes: { mes: 10, ano: 2026 }, chave: '2026-10', situacao: 'aberto', resultado: undefined },
  ],
  requerimentos: [],
  reajustes: [],
  observacoes: [],
});

let uploads: string[];

function deps() {
  return {
    renderizarImagem: vi.fn().mockResolvedValue('iVBORw0KGgo='),
    enviarEmail: vi.fn().mockResolvedValue(undefined),
    agora: AGORA,
  };
}

describe('executarEnvioSaldoParcial — empresa liberada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploads = [];
    vi.mocked(geracaoBookLiberada.noModeloNovo).mockResolvedValue(true);
    vi.mocked(controleSaldoParcialService.bancos).mockResolvedValue([
      banco('b1', 'Banco COMEX'),
      banco('b2', 'Banco FISCAL'),
    ]);
    vi.mocked(controleSaldoParcialService.chamados).mockResolvedValue({ b1: [], b2: [] });
    vi.mocked(controleSaldoParcialService.idiomaDoEmail).mockResolvedValue('pt-BR');
    (supabase.from as any).mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { nome_abreviado: 'EMPRESA ALFA' }, error: null }),
        }),
      }),
    }));
    (supabase.storage.from as any).mockImplementation((bucket: string) => ({
      upload: vi.fn(async (caminho: string) => {
        uploads.push(`${bucket}/${caminho}`);
        return { error: null };
      }),
      getPublicUrl: (caminho: string) => ({
        data: { publicUrl: `https://storage.test/${bucket}/${caminho}` },
      }),
    }));
  });

  it('um e-mail com uma tabela por banco, imagem obrigatória e Excel por banco', async () => {
    const d = deps();
    const r = await executarEnvioSaldoParcial('e1', ['a@cliente.com'], ['cc@sonda.com'], d);

    expect(r.enviados).toBe(1);
    // Mês de referência: o de ontem em São Paulo
    expect(geracaoBookLiberada.noModeloNovo).toHaveBeenCalledWith('e1', { mes: 10, ano: 2026 });
    expect(controleSaldoParcialService.bancos).toHaveBeenCalledWith('e1', { mes: 10, ano: 2026 });
    expect(coletorSaldoParcialService.coletar).not.toHaveBeenCalled();

    const html = d.renderizarImagem.mock.calls[0][0];
    expect(html).toContain('Banco COMEX');
    expect(html).toContain('Banco FISCAL');

    const payload = d.enviarEmail.mock.calls[0][0];
    expect(payload.nome).toBe('EMPRESA ALFA - Saldo Parcial 14.10');
    expect(payload.email).toEqual(['a@cliente.com']);
    expect(payload.email_cc).toEqual(['cc@sonda.com']);
    expect(payload.mensagem).toContain('<img src="https://storage.test/email-images/');
    expect(payload.anexos.totalArquivos).toBe(1);
    expect(uploads.some((u) => u.endsWith('.xlsx'))).toBe(true);
  });

  it('sem a imagem das tabelas o e-mail não sai, como no envio atual', async () => {
    const d = deps();
    d.renderizarImagem.mockResolvedValue(null);
    await expect(executarEnvioSaldoParcial('e1', ['a@cliente.com'], [], d)).rejects.toThrow(
      /imagem das tabelas/
    );
    expect(d.enviarEmail).not.toHaveBeenCalled();
  });

  it('empresa liberada sem banco que o cliente vê: erro com o motivo', async () => {
    vi.mocked(controleSaldoParcialService.bancos).mockResolvedValue([]);
    await expect(executarEnvioSaldoParcial('e1', ['a@cliente.com'], [], deps())).rejects.toThrow(
      /banco/
    );
  });

  it('empresa em Legado: o envio atual', async () => {
    vi.mocked(geracaoBookLiberada.noModeloNovo).mockResolvedValue(false);
    vi.mocked(coletorSaldoParcialService.coletar).mockResolvedValue([]);
    const r = await executarEnvioSaldoParcial('e1', ['a@cliente.com'], [], deps());
    expect(coletorSaldoParcialService.coletar).toHaveBeenCalledWith('e1', AGORA);
    expect(controleSaldoParcialService.bancos).not.toHaveBeenCalled();
    expect(r.enviados).toBe(0);
  });
});
