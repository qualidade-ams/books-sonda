import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executarGeracaoAutomaticaBooks,
  periodoReferenciaBooks,
  empresaLiberadaParaGeracao
} from '../executarGeracaoAutomaticaBooks';
import { gerarEEnviarBook } from '../gerarEnviarBook';
import { booksService } from '@/services/booksService';

vi.mock('@/services/booksService', () => ({
  booksService: { listarBooks: vi.fn() }
}));
vi.mock('../gerarEnviarBook', () => ({
  gerarEEnviarBook: vi.fn()
}));

// 13/10/2026 06:00 em São Paulo → período Outubro/2026, referência Setembro/2026
const AGORA = new Date('2026-10-13T09:00:00Z');

const item = (extra: any) => ({
  id: `b-${extra.empresa_id}`,
  empresa_nome: `Empresa ${extra.empresa_id}`,
  mes: 9,
  ano: 2026,
  status: 'pendente',
  tem_dados: true,
  dia_inicio_apuracao: 1,
  dia_fim_apuracao: 0,
  ...extra
});

describe('periodoReferenciaBooks', () => {
  it('referência é o mês anterior, no fuso de São Paulo', () => {
    expect(periodoReferenciaBooks(AGORA)).toEqual({ mes: 9, ano: 2026, diaHoje: 13 });
    // 01/10 01:00 UTC ainda é 30/09 em São Paulo
    expect(periodoReferenciaBooks(new Date('2026-10-01T01:00:00Z'))).toEqual({ mes: 8, ano: 2026, diaHoje: 30 });
  });

  it('em janeiro a referência é dezembro do ano anterior', () => {
    expect(periodoReferenciaBooks(new Date('2027-01-05T12:00:00Z'))).toEqual({ mes: 12, ano: 2026, diaHoje: 5 });
  });
});

describe('empresaLiberadaParaGeracao', () => {
  it('período padrão (dia 1) sempre liberado; customizado só a partir do dia de início', () => {
    expect(empresaLiberadaParaGeracao(undefined, 1)).toBe(true);
    expect(empresaLiberadaParaGeracao(1, 1)).toBe(true);
    expect(empresaLiberadaParaGeracao(15, 14)).toBe(false);
    expect(empresaLiberadaParaGeracao(15, 15)).toBe(true);
  });
});

describe('executarGeracaoAutomaticaBooks', () => {
  const gerarPdf = vi.fn();
  const enviarEmail = vi.fn();
  let esperar: ReturnType<typeof vi.fn>;
  let log: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    esperar = vi.fn(async () => {});
    log = vi.fn();
    (gerarEEnviarBook as any).mockResolvedValue({ bookId: 'x' });
    (booksService.listarBooks as any).mockResolvedValue([
      item({ empresa_id: 'enviada', status: 'enviado' }),
      item({ empresa_id: 'dia15', dia_inicio_apuracao: 15 }),
      item({ empresa_id: 'pendente', empresa_nome_abreviado: 'PEND' }),
      item({ empresa_id: 'comerro', status: 'erro' })
    ]);
  });

  const executar = (extra: any = {}) =>
    executarGeracaoAutomaticaBooks({
      gerarPdf,
      enviarEmail,
      responsavelId: 'criador',
      agora: AGORA,
      log,
      esperar,
      intervaloEntreEnviosMs: 10_000,
      ...extra
    });

  it('gera e envia só os liberados e ainda não enviados do período de referência', async () => {
    const resumo = await executar();

    // nunca a lista de exemplo que a tela mostra quando a consulta falha
    expect(booksService.listarBooks).toHaveBeenCalledWith({ mes: 9, ano: 2026 }, { propagarErro: true });
    expect((gerarEEnviarBook as any).mock.calls.map((c: any[]) => c[0].empresa_id)).toEqual(['pendente', 'comerro']);
    expect(gerarEEnviarBook).toHaveBeenCalledWith(
      expect.objectContaining({ empresa_id: 'pendente', empresa_nome_abreviado: 'PEND' }),
      9,
      2026,
      { gerarPdf, enviarEmail, responsavelId: 'criador' }
    );
    expect(resumo).toEqual({
      mes: 9,
      ano: 2026,
      total: 2,
      gerados: 2,
      erros: 0,
      pulados: 2,
      selecionadas: null,
      empresas: [
        { empresa: 'PEND', sucesso: true },
        { empresa: 'Empresa comerro', sucesso: true }
      ]
    });
  });

  it('espera entre um envio e outro (limite do Power Automate)', async () => {
    await executar();
    expect(esperar).toHaveBeenCalledTimes(1);
    expect(esperar).toHaveBeenCalledWith(10_000);
  });

  it('erro em uma empresa não interrompe as demais', async () => {
    (gerarEEnviarBook as any).mockRejectedValueOnce(new Error('Falha ao gerar book: sem dados'));

    const resumo = await executar();

    expect(gerarEEnviarBook).toHaveBeenCalledTimes(2);
    expect(resumo).toMatchObject({ total: 2, gerados: 1, erros: 1 });
    expect(resumo.empresas[0]).toEqual({ empresa: 'PEND', sucesso: false, erro: 'Falha ao gerar book: sem dados' });
    expect(log).toHaveBeenCalledWith('PEND: Falha ao gerar book: sem dados', 'erro');
  });

  it('nada a fazer quando todos já foram enviados', async () => {
    (booksService.listarBooks as any).mockResolvedValue([item({ empresa_id: 'a', status: 'enviado' })]);

    const resumo = await executar();

    expect(gerarEEnviarBook).not.toHaveBeenCalled();
    expect(resumo).toMatchObject({ total: 0, gerados: 0, erros: 0, pulados: 1 });
  });

  it('registra no log o período e o andamento por empresa', async () => {
    await executar();
    const mensagens = log.mock.calls.map((c: any[]) => c[0]);
    expect(mensagens[0]).toBe('Período de referência Setembro/2026: 2 book(s) a gerar, 2 pulado(s) (já enviados ou ainda não liberados)');
    expect(mensagens).toContain('[1/2] PEND: gerado e enviado');
  });

  describe('restrito a empresas selecionadas', () => {
    it('gera só as selecionadas que estão liberadas e não enviadas', async () => {
      const resumo = await executar({ empresaIds: ['pendente'] });

      expect((gerarEEnviarBook as any).mock.calls.map((c: any[]) => c[0].empresa_id)).toEqual(['pendente']);
      expect(resumo).toMatchObject({ total: 1, gerados: 1, erros: 0, pulados: 3, selecionadas: 1 });
    });

    it('explica no log por que uma selecionada foi pulada', async () => {
      const resumo = await executar({ empresaIds: ['enviada', 'dia15', 'inexistente'] });

      expect(gerarEEnviarBook).not.toHaveBeenCalled();
      expect(resumo).toMatchObject({ total: 0, selecionadas: 3 });
      const mensagens = log.mock.calls.map((c: any[]) => c[0]);
      expect(mensagens).toContain('Empresa enviada: book já enviado neste período');
      expect(mensagens).toContain('Empresa dia15: liberada a partir do dia 15');
      expect(mensagens).toContain('1 empresa(s) selecionada(s) não está(ão) na lista de books do período');
    });

    it('lista vazia de selecionadas = todas', async () => {
      const resumo = await executar({ empresaIds: [] });
      expect(gerarEEnviarBook).toHaveBeenCalledTimes(2);
      expect(resumo.selecionadas).toBeNull();
    });
  });

  it('propaga falha ao listar os books (a execução inteira fica com erro)', async () => {
    (booksService.listarBooks as any).mockRejectedValue(new Error('timeout'));
    await expect(executar()).rejects.toThrow('timeout');
  });
});
