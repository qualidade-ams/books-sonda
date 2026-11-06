import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequerimentoBancoService } from '../requerimentoBancoService';

const rpc = vi.fn();
const select = vi.fn();
const from = vi.fn(() => ({ select }));
const cliente = { rpc, from } as any;

const opcaoDoBanco = {
  bancoId: 'b-comex',
  bancoNome: 'COMEX',
  bancoOrdem: 3,
  inicioVigencia: '2026-07-01',
  fimVigencia: null,
  produtoId: 'p-ceplus',
  produtoNome: 'CE PLUS',
  produtoOrdem: 2,
  moduloId: 'm-export',
  moduloNome: 'Exportação',
  moduloOrdem: 3,
  totalModulos: 4,
};

describe('RequerimentoBancoService', () => {
  let service: RequerimentoBancoService;

  beforeEach(() => {
    rpc.mockReset();
    select.mockReset();
    from.mockClear();
    service = new RequerimentoBancoService(cliente);
  });

  describe('destinos', () => {
    it('lista produto/módulo/banco pela função do banco, no formato da tela', async () => {
      rpc.mockResolvedValue({
        data: {
          liberada: true,
          escolhido: { produtoId: 'p-ceplus', moduloId: 'm-export', bancoId: 'b-comex' },
          opcoes: [opcaoDoBanco],
        },
        error: null,
      });

      const destinos = await service.destinos('empresa-1', 'req-1');

      expect(rpc).toHaveBeenCalledWith('requerimento_destinos', {
        p_empresa_id: 'empresa-1',
        p_requerimento_id: 'req-1',
      });
      expect(destinos).toEqual({
        liberada: true,
        escolhido: { produtoId: 'p-ceplus', moduloId: 'm-export', bancoId: 'b-comex' },
        opcoes: [opcaoDoBanco],
      });
    });

    it('sem requerimento (lançamento novo), manda nulo; legado vem sem opções', async () => {
      rpc.mockResolvedValue({
        data: { liberada: false, escolhido: null, opcoes: [] },
        error: null,
      });

      const destinos = await service.destinos('empresa-1');

      expect(rpc).toHaveBeenCalledWith('requerimento_destinos', {
        p_empresa_id: 'empresa-1',
        p_requerimento_id: null,
      });
      expect(destinos).toEqual({ liberada: false, escolhido: null, opcoes: [] });
    });

    it('propaga a falha do banco com a mensagem', async () => {
      rpc.mockResolvedValue({ data: null, error: { message: 'Sem permissão' } });

      await expect(service.destinos('empresa-1')).rejects.toThrow(
        'Erro ao carregar os produtos do requerimento: Sem permissão'
      );
    });
  });

  describe('definirDestino', () => {
    it('grava o produto/módulo pela função do banco e devolve o banco', async () => {
      rpc.mockResolvedValue({ data: 'b-comex', error: null });

      const banco = await service.definirDestino('req-1', {
        produtoId: 'p-ceplus',
        moduloId: 'm-export',
      });

      expect(rpc).toHaveBeenCalledWith('requerimento_definir_destino', {
        p_requerimento_id: 'req-1',
        p_produto_id: 'p-ceplus',
        p_modulo_id: 'm-export',
      });
      expect(banco).toBe('b-comex');
    });

    it('produto inteiro manda o módulo nulo', async () => {
      rpc.mockResolvedValue({ data: 'b-gallery', error: null });

      await service.definirDestino('req-1', { produtoId: 'p-gallery', moduloId: null });

      expect(rpc).toHaveBeenCalledWith('requerimento_definir_destino', {
        p_requerimento_id: 'req-1',
        p_produto_id: 'p-gallery',
        p_modulo_id: null,
      });
    });

    it('propaga a recusa do banco com a mensagem', async () => {
      rpc.mockResolvedValue({
        data: null,
        error: { message: 'Nenhum banco do cliente cobre esse produto/módulo no mês de cobrança.' },
      });

      await expect(
        service.definirDestino('req-1', { produtoId: 'p-ceplus', moduloId: 'm-cambio' })
      ).rejects.toThrow(
        'Erro ao gravar o produto do requerimento: Nenhum banco do cliente cobre esse produto/módulo no mês de cobrança.'
      );
    });
  });

  describe('produtosDosModulosLegados', () => {
    it('lê o de-para do campo Módulo antigo para produto/módulo', async () => {
      select.mockResolvedValue({
        data: [
          { modulo_requerimento: 'Comex', produto_id: 'p-ceplus', modulo_id: null },
          { modulo_requerimento: 'Comply e-DOCS', produto_id: 'p-comply', modulo_id: 'm-edocs' },
        ],
        error: null,
      });

      const dePara = await service.produtosDosModulosLegados();

      expect(from).toHaveBeenCalledWith('modulos_requerimento_produto');
      expect(select).toHaveBeenCalledWith('modulo_requerimento, produto_id, modulo_id');
      expect(dePara).toEqual({
        Comex: { produtoId: 'p-ceplus', moduloId: null },
        'Comply e-DOCS': { produtoId: 'p-comply', moduloId: 'm-edocs' },
      });
    });

    it('propaga a falha com a mensagem', async () => {
      select.mockResolvedValue({ data: null, error: { message: 'falhou' } });

      await expect(service.produtosDosModulosLegados()).rejects.toThrow(
        'Erro ao carregar os módulos de requerimento: falhou'
      );
    });
  });
});
