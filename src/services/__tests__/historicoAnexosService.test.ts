/**
 * Testes para funcionalidades de anexos no histórico de disparos
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { historicoService } from '../historicoService';
import { booksDisparoService } from '../booksDisparoService';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    }))
  }
}));

describe('HistoricoService - Funcionalidades de Anexos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buscarHistoricoComAnexos', () => {
    it('deve chamar a função RPC correta com parâmetros', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'hist-1',
            empresa_id: 'emp-1',
            anexo_id: 'anexo-1',
            anexo_processado: true,
            anexo_nome_original: 'documento.pdf'
          }
        ],
        error: null
      });

      const { supabase } = await import('@/integrations/supabase/client');
      supabase.rpc = mockRpc;

      const empresaId = 'empresa-teste';
      const mesReferencia = new Date('2024-01-15');
      const limit = 20;
      const offset = 10;

      await historicoService.buscarHistoricoComAnexos(empresaId, mesReferencia, limit, offset);

      expect(mockRpc).toHaveBeenCalledWith('buscar_historico_com_anexos', {
        p_empresa_id: empresaId,
        p_mes_referencia: '2024-01-15',
        p_limit: limit,
        p_offset: offset
      });
    });

    it('deve retornar array vazio quando não há dados', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: null
      });

      const { supabase } = await import('@/integrations/supabase/client');
      supabase.rpc = mockRpc;

      const resultado = await historicoService.buscarHistoricoComAnexos();

      expect(resultado).toEqual([]);
    });

    it('deve lançar erro quando RPC falha', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Erro na função RPC' }
      });

      const { supabase } = await import('@/integrations/supabase/client');
      supabase.rpc = mockRpc;

      await expect(historicoService.buscarHistoricoComAnexos()).rejects.toThrow('Erro ao buscar histórico com anexos');
    });
  });

  describe('buscarEstatisticasAnexos', () => {
    it('deve chamar a função RPC com datas corretas', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [{
          total_anexos: 10,
          anexos_processados: 8,
          anexos_com_erro: 1,
          anexos_pendentes: 1,
          tamanho_total_mb: 25.5,
          empresas_com_anexos: 5
        }],
        error: null
      });

      const { supabase } = await import('@/integrations/supabase/client');
      supabase.rpc = mockRpc;

      const dataInicio = new Date('2024-01-01');
      const dataFim = new Date('2024-01-31');

      const resultado = await historicoService.buscarEstatisticasAnexos(dataInicio, dataFim);

      expect(mockRpc).toHaveBeenCalledWith('estatisticas_anexos_periodo', {
        p_data_inicio: '2024-01-01',
        p_data_fim: '2024-01-31'
      });

      expect(resultado).toEqual({
        totalAnexos: 10,
        anexosProcessados: 8,
        anexosComErro: 1,
        anexosPendentes: 1,
        tamanhoTotalMb: 25.5,
        empresasComAnexos: 5
      });
    });

    it('deve retornar estatísticas zeradas quando não há dados', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: null
      });

      const { supabase } = await import('@/integrations/supabase/client');
      supabase.rpc = mockRpc;

      const resultado = await historicoService.buscarEstatisticasAnexos(new Date(), new Date());

      expect(resultado).toEqual({
        totalAnexos: 0,
        anexosProcessados: 0,
        anexosComErro: 0,
        anexosPendentes: 0,
        tamanhoTotalMb: 0,
        empresasComAnexos: 0
      });
    });
  });
});

describe('BooksDisparoService - Funcionalidades de Anexos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registrarHistoricoComAnexo', () => {
    it('deve registrar histórico com anexo corretamente', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

      const { supabase } = await import('@/integrations/supabase/client');
      supabase.from = mockFrom;

      await booksDisparoService.registrarHistoricoComAnexo(
        'empresa-1',
        'cliente-1',
        'template-1',
        'enviado',
        'anexo-1',
        {
          assunto: 'Teste com anexo',
          emailsCC: ['cc@test.com'],
          erroDetalhes: null
        }
      );

      expect(mockFrom).toHaveBeenCalledWith('historico_disparos');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          empresa_id: 'empresa-1',
          cliente_id: 'cliente-1',
          template_id: 'template-1',
          status: 'enviado',
          anexo_id: 'anexo-1',
          anexo_processado: false,
          assunto: 'Teste com anexo',
          emails_cc: ['cc@test.com']
        })
      );
    });

    it('deve registrar histórico sem anexo quando anexoId é null', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

      const { supabase } = await import('@/integrations/supabase/client');
      supabase.from = mockFrom;

      await booksDisparoService.registrarHistoricoComAnexo(
        'empresa-1',
        'cliente-1',
        'template-1',
        'enviado'
      );

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          anexo_id: null,
          anexo_processado: false
        })
      );
    });

    it('deve lançar erro quando insert falha', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ 
        error: { message: 'Erro no insert' } 
      });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

      const { supabase } = await import('@/integrations/supabase/client');
      supabase.from = mockFrom;

      await expect(
        booksDisparoService.registrarHistoricoComAnexo(
          'empresa-1',
          'cliente-1',
          'template-1',
          'enviado'
        )
      ).rejects.toThrow('Erro ao registrar histórico');
    });
  });

  describe('atualizarStatusAnexoHistorico', () => {
    it('deve atualizar status do anexo corretamente', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

      const { supabase } = await import('@/integrations/supabase/client');
      supabase.from = mockFrom;

      await booksDisparoService.atualizarStatusAnexoHistorico(
        'historico-1',
        true,
        'Processado com sucesso'
      );

      expect(mockFrom).toHaveBeenCalledWith('historico_disparos');
      expect(mockUpdate).toHaveBeenCalledWith({
        anexo_processado: true,
        erro_detalhes: 'Processado com sucesso'
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'historico-1');
    });

    it('deve atualizar apenas anexo_processado quando não há erro', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

      const { supabase } = await import('@/integrations/supabase/client');
      supabase.from = mockFrom;

      await booksDisparoService.atualizarStatusAnexoHistorico('historico-1', false);

      expect(mockUpdate).toHaveBeenCalledWith({
        anexo_processado: false
      });
    });
  });
});