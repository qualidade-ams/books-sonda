import { describe, expect, it, vi } from 'vitest';
import { enviarSaldoParcialDeTeste, type DependenciasTeste } from '../envioTeste';
import { semHistorico, type DependenciasEnvio } from '../envioControle';
import type { SaldoParcialBanco } from '@/services/controleSaldoParcialService';

// 29/10/2026, 10h em São Paulo
const AGORA = new Date('2026-10-29T13:00:00Z');
const BANCO = { bancoId: 'b1', nome: 'Banco COMEX' } as SaldoParcialBanco;

function deps(v: Partial<DependenciasTeste> = {}): DependenciasTeste {
  return {
    emailDoUsuario: vi.fn(async () => 'usuario.teste@exemplo.com'),
    bancos: vi.fn(async () => [BANCO]),
    idioma: vi.fn(async () => 'pt-BR' as const),
    enviar: vi.fn(async () => undefined),
    ...v,
  };
}

describe('enviarSaldoParcialDeTeste', () => {
  it('só para o e-mail de quem pediu, com o conteúdo do modelo novo e o assunto marcado como teste', async () => {
    const d = deps();
    await enviarSaldoParcialDeTeste('e1', 'EMPRESA ALFA', d, AGORA);

    expect(d.bancos).toHaveBeenCalledWith('e1', { mes: 10, ano: 2026 });
    const [entrada] = vi.mocked(d.enviar).mock.calls[0];
    expect(entrada).toMatchObject({
      empresaId: 'e1',
      empresaNome: 'EMPRESA ALFA',
      bancos: [BANCO],
      destinatarios: ['usuario.teste@exemplo.com'],
      copia: [],
      idioma: 'pt-BR',
      agora: AGORA,
    });
    expect(entrada.assunto).toBe('[TESTE] EMPRESA ALFA - Saldo Parcial 28.10');
    expect(entrada.texto).toMatch(/^Bom dia!/);
    expect(typeof entrada.t).toBe('function');
  });

  it('empresa com e-mail em inglês: assunto e texto em inglês', async () => {
    const d = deps({ idioma: vi.fn(async () => 'en' as const) });
    await enviarSaldoParcialDeTeste('e1', 'EMPRESA ALFA', d, AGORA);
    const [entrada] = vi.mocked(d.enviar).mock.calls[0];
    expect(entrada.assunto).toMatch(/^\[TEST\] /);
    expect(entrada.idioma).toBe('en');
    expect(entrada.texto).toMatch(/^Good morning!/);
  });

  it('sem e-mail do usuário: não envia', async () => {
    const d = deps({ emailDoUsuario: vi.fn(async () => null) });
    await expect(enviarSaldoParcialDeTeste('e1', 'EMPRESA ALFA', d, AGORA)).rejects.toMatchObject({
      chave: 'erros.saldoParcial.semEmailDoUsuario',
    });
    expect(d.enviar).not.toHaveBeenCalled();
  });

  it('sem banco que o cliente vê: não envia', async () => {
    const d = deps({ bancos: vi.fn(async () => []) });
    await expect(enviarSaldoParcialDeTeste('e1', 'EMPRESA ALFA', d, AGORA)).rejects.toMatchObject({
      chave: 'erros.saldoParcial.semBancos',
    });
    expect(d.enviar).not.toHaveBeenCalled();
  });
});

describe('semHistorico', () => {
  it('o envio de teste não entra no histórico de envios da empresa', async () => {
    const registrar = vi.fn(async () => undefined);
    const base = { registrar } as unknown as DependenciasEnvio;
    await semHistorico(base).registrar('e1', { sucesso: true, destinatarios: 1 });
    expect(registrar).not.toHaveBeenCalled();
  });
});
