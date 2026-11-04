import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequerimentoBancoService } from '../requerimentoBancoService';

const rpc = vi.fn();
const cliente = { rpc } as any;

describe('RequerimentoBancoService', () => {
  let service: RequerimentoBancoService;

  beforeEach(() => {
    rpc.mockReset();
    service = new RequerimentoBancoService(cliente);
  });

  describe('bancosDisponiveis', () => {
    it('lista os bancos da empresa pela função do banco, no formato da tela', async () => {
      rpc.mockResolvedValue({
        data: [
          {
            banco_id: 'b1',
            nome: 'Banco padrão',
            padrao: true,
            ordem: 1,
            inicio_vigencia: '2026-07-01',
            fim_vigencia: null,
            escolhido: false,
          },
          {
            banco_id: 'b2',
            nome: 'FISCAL',
            padrao: false,
            ordem: 2,
            inicio_vigencia: '2026-07-01',
            fim_vigencia: '2026-12-01',
            escolhido: true,
          },
        ],
        error: null,
      });

      const bancos = await service.bancosDisponiveis('empresa-1', 'req-1');

      expect(rpc).toHaveBeenCalledWith('requerimento_bancos_disponiveis', {
        p_empresa_id: 'empresa-1',
        p_requerimento_id: 'req-1',
      });
      expect(bancos).toEqual([
        {
          id: 'b1',
          nome: 'Banco padrão',
          padrao: true,
          ordem: 1,
          inicioVigencia: '2026-07-01',
          fimVigencia: null,
          escolhido: false,
        },
        {
          id: 'b2',
          nome: 'FISCAL',
          padrao: false,
          ordem: 2,
          inicioVigencia: '2026-07-01',
          fimVigencia: '2026-12-01',
          escolhido: true,
        },
      ]);
    });

    it('sem requerimento (lançamento novo), manda nulo', async () => {
      rpc.mockResolvedValue({ data: [], error: null });

      const bancos = await service.bancosDisponiveis('empresa-1');

      expect(rpc).toHaveBeenCalledWith('requerimento_bancos_disponiveis', {
        p_empresa_id: 'empresa-1',
        p_requerimento_id: null,
      });
      expect(bancos).toEqual([]);
    });

    it('propaga a falha do banco com a mensagem', async () => {
      rpc.mockResolvedValue({ data: null, error: { message: 'Sem permissão' } });

      await expect(service.bancosDisponiveis('empresa-1')).rejects.toThrow(
        'Erro ao carregar os bancos do requerimento: Sem permissão'
      );
    });
  });

  describe('definirBanco', () => {
    it('grava o banco escolhido pela função do banco', async () => {
      rpc.mockResolvedValue({ data: null, error: null });

      await service.definirBanco('req-1', 'b2');

      expect(rpc).toHaveBeenCalledWith('requerimento_definir_banco', {
        p_requerimento_id: 'req-1',
        p_banco_id: 'b2',
      });
    });

    it('propaga a recusa do banco com a mensagem', async () => {
      rpc.mockResolvedValue({
        data: null,
        error: {
          message: 'O banco escolhido não está vigente no mês de cobrança do requerimento.',
        },
      });

      await expect(service.definirBanco('req-1', 'b2')).rejects.toThrow(
        'Erro ao gravar o banco do requerimento: O banco escolhido não está vigente no mês de cobrança do requerimento.'
      );
    });
  });
});
