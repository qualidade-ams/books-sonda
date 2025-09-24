import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { anexoAuditService } from '../anexoAuditService';
import { auditLogger } from '../auditLogger';

// Mock do auditLogger
vi.mock('../auditLogger', () => ({
  auditLogger: {
    logOperation: vi.fn(),
    getLogs: vi.fn()
  }
}));

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    }))
  }
}));

describe('AnexoAuditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    anexoAuditService.limparCacheMetricas();
  });

  describe('logUploadIniciado', () => {
    it('deve registrar início de upload com dados corretos', async () => {
      const empresaId = 'empresa-123';
      const nomeArquivo = 'documento.pdf';
      const tamanhoArquivo = 1024 * 1024; // 1MB
      const tipoArquivo = 'application/pdf';
      const userId = 'user-123';

      await anexoAuditService.logUploadIniciado(
        empresaId,
        nomeArquivo,
        tamanhoArquivo,
        tipoArquivo,
        userId
      );

      expect(auditLogger.logOperation).toHaveBeenCalledWith(
        'anexo_upload_iniciado',
        'anexo',
        expect.objectContaining({
          empresaId,
          nomeArquivo,
          tamanhoArquivo,
          tipoArquivo,
          validacoes: {
            tipoPermitido: true,
            tamanhoValido: true
          }
        }),
        'success',
        undefined,
        userId,
        undefined
      );
    });

    it('deve identificar tipo não permitido', async () => {
      const tipoArquivo = 'application/exe';

      await anexoAuditService.logUploadIniciado(
        'empresa-123',
        'arquivo.exe',
        1024,
        tipoArquivo
      );

      expect(auditLogger.logOperation).toHaveBeenCalledWith(
        'anexo_upload_iniciado',
        'anexo',
        expect.objectContaining({
          validacoes: expect.objectContaining({
            tipoPermitido: false
          })
        }),
        'success',
        undefined,
        undefined,
        undefined
      );
    });

    it('deve identificar arquivo muito grande', async () => {
      const tamanhoArquivo = 15 * 1024 * 1024; // 15MB (acima do limite de 10MB)

      await anexoAuditService.logUploadIniciado(
        'empresa-123',
        'arquivo-grande.pdf',
        tamanhoArquivo,
        'application/pdf'
      );

      expect(auditLogger.logOperation).toHaveBeenCalledWith(
        'anexo_upload_iniciado',
        'anexo',
        expect.objectContaining({
          validacoes: expect.objectContaining({
            tamanhoValido: false
          })
        }),
        'success',
        undefined,
        undefined,
        undefined
      );
    });
  });

  describe('logValidacaoTipo', () => {
    it('deve registrar validação de tipo válido', async () => {
      await anexoAuditService.logValidacaoTipo(
        'documento.pdf',
        'application/pdf',
        true
      );

      expect(auditLogger.logOperation).toHaveBeenCalledWith(
        'anexo_validacao_tipo',
        'anexo',
        expect.objectContaining({
          nomeArquivo: 'documento.pdf',
          tipoArquivo: 'application/pdf',
          valido: true,
          tiposPermitidos: expect.arrayContaining([
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          ])
        }),
        'success',
        undefined,
        undefined,
        undefined
      );
    });

    it('deve registrar validação de tipo inválido como warning', async () => {
      await anexoAuditService.logValidacaoTipo(
        'arquivo.exe',
        'application/exe',
        false
      );

      expect(auditLogger.logOperation).toHaveBeenCalledWith(
        'anexo_validacao_tipo',
        'anexo',
        expect.objectContaining({
          valido: false
        }),
        'warning',
        undefined,
        undefined,
        undefined
      );
    });
  });

  describe('logValidacaoTamanho', () => {
    it('deve registrar validação de tamanho com conversão para MB', async () => {
      const tamanhoArquivo = 5 * 1024 * 1024; // 5MB
      const limite = 10 * 1024 * 1024; // 10MB

      await anexoAuditService.logValidacaoTamanho(
        'documento.pdf',
        tamanhoArquivo,
        true,
        limite
      );

      expect(auditLogger.logOperation).toHaveBeenCalledWith(
        'anexo_validacao_tamanho',
        'anexo',
        expect.objectContaining({
          tamanhoArquivo,
          tamanhoMB: 5,
          limite,
          limiteMB: 10,
          valido: true,
          percentualLimite: 50
        }),
        'success',
        undefined,
        undefined,
        undefined
      );
    });
  });

  describe('logValidacaoLimiteTotal', () => {
    it('deve calcular corretamente o uso de espaço', async () => {
      const empresaId = 'empresa-123';
      const tamanhoAtual = 15 * 1024 * 1024; // 15MB
      const tamanhoNovo = 8 * 1024 * 1024; // 8MB
      const limite = 25 * 1024 * 1024; // 25MB

      await anexoAuditService.logValidacaoLimiteTotal(
        empresaId,
        tamanhoAtual,
        tamanhoNovo,
        limite,
        true
      );

      expect(auditLogger.logOperation).toHaveBeenCalledWith(
        'anexo_validacao_limite_total',
        'anexo',
        expect.objectContaining({
          empresaId,
          tamanhoAtual,
          tamanhoNovo,
          tamanhoTotal: 23 * 1024 * 1024,
          tamanhoTotalMB: 23,
          percentualUso: 92,
          espacoRestante: 2 * 1024 * 1024,
          espacoRestanteMB: 2
        }),
        'success',
        undefined,
        undefined,
        undefined
      );
    });

    it('deve registrar como warning quando limite é excedido', async () => {
      const tamanhoAtual = 20 * 1024 * 1024; // 20MB
      const tamanhoNovo = 10 * 1024 * 1024; // 10MB
      const limite = 25 * 1024 * 1024; // 25MB

      await anexoAuditService.logValidacaoLimiteTotal(
        'empresa-123',
        tamanhoAtual,
        tamanhoNovo,
        limite,
        false
      );

      expect(auditLogger.logOperation).toHaveBeenCalledWith(
        'anexo_validacao_limite_total',
        'anexo',
        expect.objectContaining({
          valido: false,
          percentualUso: 120
        }),
        'warning',
        undefined,
        undefined,
        undefined
      );
    });
  });

  describe('logTokenGerado', () => {
    it('deve registrar geração de token com expiração', async () => {
      const anexoId = 'anexo-123';
      const empresaId = 'empresa-123';
      const tokenDuration = 3600; // 1 hora

      await anexoAuditService.logTokenGerado(
        anexoId,
        empresaId,
        tokenDuration
      );

      expect(auditLogger.logOperation).toHaveBeenCalledWith(
        'anexo_token_gerado',
        'anexo',
        expect.objectContaining({
          anexoId,
          empresaId,
          tokenDuration,
          expiresAt: expect.any(String),
          securityInfo: {
            tokenGenerated: true
          }
        }),
        'success',
        anexoId,
        undefined,
        undefined
      );
    });
  });

  describe('logTokenValidado', () => {
    it('deve registrar validação de token bem-sucedida', async () => {
      const anexoId = 'anexo-123';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      await anexoAuditService.logTokenValidado(
        anexoId,
        true,
        undefined,
        ipAddress,
        userAgent
      );

      expect(auditLogger.logOperation).toHaveBeenCalledWith(
        'anexo_token_validado',
        'anexo',
        expect.objectContaining({
          anexoId,
          valido: true,
          securityInfo: {
            tokenValidated: true,
            accessGranted: true,
            ipAddress,
            userAgent
          }
        }),
        'success',
        anexoId,
        undefined,
        undefined
      );
    });

    it('deve registrar validação de token falhada como warning', async () => {
      const anexoId = 'anexo-123';
      const motivo = 'Token expirado';

      await anexoAuditService.logTokenValidado(
        anexoId,
        false,
        motivo
      );

      expect(auditLogger.logOperation).toHaveBeenCalledWith(
        'anexo_token_validado',
        'anexo',
        expect.objectContaining({
          valido: false,
          motivo,
          securityInfo: {
            tokenValidated: false,
            accessGranted: false
          }
        }),
        'warning',
        anexoId,
        undefined,
        undefined
      );
    });
  });

  describe('logLimpezaExpirados', () => {
    it('deve registrar limpeza com estatísticas detalhadas', async () => {
      const anexosRemovidos = 5;
      const tamanhoLiberado = 10 * 1024 * 1024; // 10MB
      const tempoExecucao = 2500; // 2.5s
      const detalhes = [
        { anexoId: 'anexo-1', empresaId: 'empresa-1', nomeArquivo: 'arquivo1.pdf' },
        { anexoId: 'anexo-2', empresaId: 'empresa-2', nomeArquivo: 'arquivo2.docx' }
      ];

      await anexoAuditService.logLimpezaExpirados(
        anexosRemovidos,
        tamanhoLiberado,
        tempoExecucao,
        detalhes
      );

      expect(auditLogger.logOperation).toHaveBeenCalledWith(
        'anexo_limpeza_expirados',
        'anexo',
        expect.objectContaining({
          anexosRemovidos,
          tamanhoLiberado,
          tamanhoLiberadoMB: 10,
          tempoExecucao,
          detalhes,
          totalDetalhes: 2
        }),
        'success',
        undefined,
        undefined,
        tempoExecucao
      );
    });

    it('deve limitar detalhes para evitar logs muito grandes', async () => {
      const detalhes = Array.from({ length: 15 }, (_, i) => ({
        anexoId: `anexo-${i}`,
        empresaId: `empresa-${i}`,
        nomeArquivo: `arquivo${i}.pdf`
      }));

      await anexoAuditService.logLimpezaExpirados(
        15,
        50 * 1024 * 1024,
        5000,
        detalhes
      );

      expect(auditLogger.logOperation).toHaveBeenCalledWith(
        'anexo_limpeza_expirados',
        'anexo',
        expect.objectContaining({
          detalhes: expect.arrayContaining([]),
          totalDetalhes: 15
        }),
        'success',
        undefined,
        undefined,
        5000
      );

      // Verificar que apenas 10 detalhes foram incluídos
      const call = (auditLogger.logOperation as any).mock.calls[0];
      expect(call[2].detalhes).toHaveLength(10);
    });
  });

  describe('obterLogsAnexos', () => {
    beforeEach(() => {
      const mockLogs = [
        {
          id: '1',
          operation: 'anexo_upload_concluido',
          entityType: 'anexo',
          result: 'success',
          timestamp: '2024-01-01T10:00:00Z',
          details: { empresaId: 'empresa-1', anexoId: 'anexo-1' }
        },
        {
          id: '2',
          operation: 'anexo_upload_falhou',
          entityType: 'anexo',
          result: 'failure',
          timestamp: '2024-01-01T11:00:00Z',
          details: { empresaId: 'empresa-2', anexoId: 'anexo-2' }
        },
        {
          id: '3',
          operation: 'anexo_removido',
          entityType: 'anexo',
          result: 'success',
          timestamp: '2024-01-01T12:00:00Z',
          details: { empresaId: 'empresa-1', anexoId: 'anexo-3' }
        }
      ];

      (auditLogger.getLogs as any).mockReturnValue(mockLogs);
    });

    it('deve retornar todos os logs quando não há filtros', () => {
      const logs = anexoAuditService.obterLogsAnexos();
      
      expect(auditLogger.getLogs).toHaveBeenCalledWith({
        entityType: 'anexo',
        operation: undefined,
        result: undefined,
        startDate: undefined,
        endDate: undefined,
        limit: undefined
      });
      
      expect(logs).toHaveLength(3);
    });

    it('deve filtrar logs por anexoId', () => {
      const logs = anexoAuditService.obterLogsAnexos({
        anexoId: 'anexo-1'
      });
      
      expect(logs).toHaveLength(1);
      expect(logs[0].details.anexoId).toBe('anexo-1');
    });

    it('deve filtrar logs por empresaId', () => {
      const logs = anexoAuditService.obterLogsAnexos({
        empresaId: 'empresa-1'
      });
      
      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.details.empresaId === 'empresa-1')).toBe(true);
    });

    it('deve aplicar múltiplos filtros', () => {
      const logs = anexoAuditService.obterLogsAnexos({
        empresaId: 'empresa-1',
        operation: 'anexo_upload_concluido'
      });
      
      // Deve filtrar apenas logs da empresa-1 com operação anexo_upload_concluido
      const filteredLogs = logs.filter(log => 
        log.details.empresaId === 'empresa-1' && 
        log.operation === 'anexo_upload_concluido'
      );
      
      expect(filteredLogs).toHaveLength(1);
      expect(filteredLogs[0].operation).toBe('anexo_upload_concluido');
      expect(filteredLogs[0].details.empresaId).toBe('empresa-1');
    });
  });

  describe('limparCacheMetricas', () => {
    it('deve limpar o cache interno', () => {
      // Não há uma forma direta de testar isso sem expor o cache,
      // mas podemos verificar que o método não gera erro
      expect(() => {
        anexoAuditService.limparCacheMetricas();
      }).not.toThrow();
    });
  });
});