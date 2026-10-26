import { describe, it, expect, vi } from 'vitest';
import { enviarSaldoParcialControle, type DependenciasEnvio } from '../envioControle';
import type { SaldoParcialBanco } from '@/services/controleSaldoParcialService';

const t = (chave: string, valores?: Record<string, unknown>) =>
  valores ? `${chave} ${JSON.stringify(valores)}` : chave;

const BANCOS = [
  {
    bancoId: 'b1',
    nome: 'BANCO COMEX',
    tipoContrato: 'horas',
    consomeOutrosBancos: false,
    meses: [
      { mes: { ano: 2026, mes: 10 }, chave: '2026-10', situacao: 'aberto', resultado: undefined },
    ],
    requerimentos: [],
    reajustes: [],
    observacoes: [],
  },
] as SaldoParcialBanco[];

const entrada = {
  empresaId: 'e1',
  empresaNome: 'ALFA',
  bancos: BANCOS,
  destinatarios: ['a@cliente.com', 'b@cliente.com'],
  copia: ['gestor@sonda.com'],
  assunto: 'ALFA - Saldo Parcial 25.10',
  texto: 'Bom dia!\n\nSegue o saldo.',
  idioma: 'pt-BR' as const,
  t,
  agora: new Date('2026-10-26T12:00:00Z'),
};

function dependencias(extra: Partial<DependenciasEnvio> = {}) {
  return {
    chamados: vi.fn(async () => ({ b1: [] })),
    renderizarImagem: vi.fn(async () => 'BASE64'),
    subirImagem: vi.fn(async () => 'https://img/tabelas.png'),
    subirAnexos: vi.fn(async (arquivos: File[]) => ({
      totalArquivos: arquivos.length,
      tamanhoTotal: 10,
      arquivos: arquivos.map((a) => ({
        url: 'u',
        nome: a.name,
        tipo: a.type,
        tamanho: 10,
        token: 'k',
      })),
    })),
    enviarEmail: vi.fn(async () => ({ success: true })),
    registrar: vi.fn(async () => undefined),
    ...extra,
  } satisfies DependenciasEnvio;
}

describe('enviarSaldoParcialControle', () => {
  it('chamados, Excel, tabelas em imagem, e-mail e registro no histórico', async () => {
    const d = dependencias();

    await enviarSaldoParcialControle(entrada, d);

    expect(d.chamados).toHaveBeenCalledWith('e1', BANCOS);
    const [htmlImagem] = vi.mocked(d.renderizarImagem).mock.calls[0];
    expect(htmlImagem).toContain('BANCO COMEX');
    expect(d.subirImagem).toHaveBeenCalledWith('BASE64', 'ALFA');
    const [anexos] = vi.mocked(d.subirAnexos).mock.calls[0];
    // Nome do arquivo sem os caracteres proibidos (a chave falsa tem aspas e dois-pontos)
    expect(anexos[0].name).toMatch(/^controleBancoHoras\.saldoParcial\.arquivo .*ALFA.*26\.10/);
    expect(anexos[0].name).not.toMatch(/[\\/:*?"<>|]/);
    const [email] = vi.mocked(d.enviarEmail).mock.calls[0];
    expect(email).toMatchObject({
      to: ['a@cliente.com', 'b@cliente.com'],
      cc: ['gestor@sonda.com'],
      subject: 'ALFA - Saldo Parcial 25.10',
      anexos: { totalArquivos: 1 },
    });
    expect(email.html).toContain('https://img/tabelas.png');
    expect(email.html).toContain('Segue o saldo.');
    expect(d.registrar).toHaveBeenCalledWith('e1', { sucesso: true, destinatarios: 3 });
  });

  it('sem a imagem, as tabelas vão em HTML', async () => {
    const d = dependencias({ renderizarImagem: vi.fn(async () => null) });
    await enviarSaldoParcialControle(entrada, d);
    expect(d.subirImagem).not.toHaveBeenCalled();
    const [email] = vi.mocked(d.enviarEmail).mock.calls[0];
    expect(email.html).toContain('BANCO COMEX');
    expect(email.html).not.toContain('<img src="https://img');
  });

  it('falha no envio: registra a falha e avisa', async () => {
    const d = dependencias({
      enviarEmail: vi.fn(async () => ({ success: false, error: 'Servidor de e-mail fora' })),
    });
    await expect(enviarSaldoParcialControle(entrada, d)).rejects.toThrow('Servidor de e-mail fora');
    expect(d.registrar).toHaveBeenCalledWith('e1', {
      sucesso: false,
      destinatarios: 3,
      erro: 'Servidor de e-mail fora',
    });
  });

  it('e-mail enviado mas o registro falhou: avisa sem dizer que o envio falhou', async () => {
    const d = dependencias({ registrar: vi.fn(async () => Promise.reject(new Error('sem rede'))) });
    await expect(enviarSaldoParcialControle(entrada, d)).rejects.toThrow(
      /enviado, mas não ficou no histórico/
    );
    expect(d.registrar).toHaveBeenCalledTimes(1);
  });
});
