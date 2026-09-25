import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { criarHandlersSyncJobs } from '../rotas';

function criarRes() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe('rotas sync-jobs', () => {
  let orquestrador: any;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    orquestrador = {
      iniciar: vi.fn(async () => ({ status: 'iniciada', execucaoId: 'exec-1', conclusao: Promise.resolve('sucesso') })),
      emExecucao: vi.fn(() => false),
    };
  });

  afterEach(() => vi.restoreAllMocks());

  describe('executar', () => {
    it('202 com o id da execução manual', async () => {
      const res = criarRes();
      await criarHandlersSyncJobs({ orquestrador }).executar(
        { body: { tabelas: { pesquisas: true, dataInicial: '2026-09-01' } }, usuarioId: 'u1' } as any,
        res
      );
      expect(orquestrador.iniciar).toHaveBeenCalledWith({
        tabelas: { pesquisas: true, dataInicial: '2026-09-01' },
        origem: 'manual',
        usuarioId: 'u1',
      });
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({ execucaoId: 'exec-1' });
    });

    it('409 quando já existe sincronização em andamento', async () => {
      orquestrador.iniciar.mockResolvedValue({ status: 'ocupado' });
      const res = criarRes();
      await criarHandlersSyncJobs({ orquestrador }).executar({ body: { tabelas: { pesquisas: true } } } as any, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('400 sem nenhuma tabela selecionada', async () => {
      const res = criarRes();
      await criarHandlersSyncJobs({ orquestrador }).executar(
        { body: { tabelas: { pesquisas: false, detectarInconsistencias: true } } } as any,
        res
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(orquestrador.iniciar).not.toHaveBeenCalled();
    });

    it('descarta chaves desconhecidas e dataInicial inválida', async () => {
      const res = criarRes();
      await criarHandlersSyncJobs({ orquestrador }).executar(
        { body: { tabelas: { pesquisas: true, qualquer: true, dataInicial: "1; DROP" } } } as any,
        res
      );
      expect(orquestrador.iniciar.mock.calls[0][0].tabelas).toEqual({ pesquisas: true });
    });

    it('500 quando o orquestrador falha ao registrar', async () => {
      orquestrador.iniciar.mockRejectedValue(new Error('db fora'));
      const res = criarRes();
      await criarHandlersSyncJobs({ orquestrador }).executar({ body: { tabelas: { tickets: true } } } as any, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('proximasExecucoes', () => {
    const regra = {
      frequencia: 'diario',
      dias_semana: [],
      dias_mes: [],
      ultimo_dia_mes: false,
      modo_horario: 'horarios',
      horarios: ['07:00'],
      intervalo_horas: null,
      hora_inicio: null,
      hora_fim: null,
    };

    it('retorna as próximas N execuções', async () => {
      const res = criarRes();
      await criarHandlersSyncJobs({ orquestrador }).proximasExecucoes({ body: { regra, n: 3 } } as any, res);
      const { execucoes } = res.json.mock.calls[0][0];
      expect(execucoes).toHaveLength(3);
      expect(typeof execucoes[0]).toBe('string');
    });

    it('limita N a 20', async () => {
      const res = criarRes();
      await criarHandlersSyncJobs({ orquestrador }).proximasExecucoes({ body: { regra, n: 500 } } as any, res);
      expect(res.json.mock.calls[0][0].execucoes).toHaveLength(20);
    });

    it('400 com os erros de uma regra inválida', async () => {
      const res = criarRes();
      await criarHandlersSyncJobs({ orquestrador }).proximasExecucoes(
        { body: { regra: { ...regra, horarios: [] } } } as any,
        res
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].erros.length).toBeGreaterThan(0);
    });
  });

  it('status informa se há execução em andamento e se o agendador está ligado', () => {
    orquestrador.emExecucao.mockReturnValue(true);
    const res = criarRes();
    criarHandlersSyncJobs({ orquestrador, agendadorAtivo: () => false }).status({} as any, res);
    expect(res.json).toHaveBeenCalledWith({ emExecucao: true, agendadorAtivo: false });
  });

  it('status sem agendador informado considera desligado', () => {
    const res = criarRes();
    criarHandlersSyncJobs({ orquestrador }).status({} as any, res);
    expect(res.json).toHaveBeenCalledWith({ emExecucao: false, agendadorAtivo: false });
  });
});
