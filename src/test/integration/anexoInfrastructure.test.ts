/**
 * Testes de Integração para Infraestrutura de Anexos
 * Verifica se todos os componentes estão configurados corretamente
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AnexoStorageService } from '@/services/anexoStorageService';
import { AnexoInfrastructureUtils } from '@/utils/anexoInfrastructureUtils';

describe('Infraestrutura de Anexos', () => {
  describe('AnexoStorageService', () => {
    it('deve ter configurações válidas', () => {
      const bucketInfo = AnexoStorageService.getBucketInfo();
      
      expect(bucketInfo.temporario).toBe('anexos-temporarios');
      expect(bucketInfo.permanente).toBe('anexos-permanentes');
      expect(bucketInfo.limiteArquivo).toBe(10 * 1024 * 1024); // 10MB
      expect(bucketInfo.limiteTotalEmpresa).toBe(25 * 1024 * 1024); // 25MB
      expect(bucketInfo.tiposPermitidos).toContain('application/pdf');
    });

    it('deve validar tipos de arquivo corretamente', () => {
      expect(AnexoStorageService.validarTipoArquivo('application/pdf')).toBe(true);
      expect(AnexoStorageService.validarTipoArquivo('application/msword')).toBe(true);
      expect(AnexoStorageService.validarTipoArquivo('image/jpeg')).toBe(false);
      expect(AnexoStorageService.validarTipoArquivo('text/plain')).toBe(false);
    });

    it('deve validar tamanho de arquivo corretamente', () => {
      expect(AnexoStorageService.validarTamanhoArquivo(5 * 1024 * 1024)).toBe(true); // 5MB
      expect(AnexoStorageService.validarTamanhoArquivo(10 * 1024 * 1024)).toBe(true); // 10MB
      expect(AnexoStorageService.validarTamanhoArquivo(15 * 1024 * 1024)).toBe(false); // 15MB
    });

    it('deve gerar nomes únicos para arquivos', () => {
      const nome1 = AnexoStorageService.gerarNomeUnico('documento.pdf');
      const nome2 = AnexoStorageService.gerarNomeUnico('documento.pdf');
      
      expect(nome1).not.toBe(nome2);
      expect(nome1).toMatch(/documento_\d+_[a-z0-9]+\.pdf/);
      expect(nome2).toMatch(/documento_\d+_[a-z0-9]+\.pdf/);
    });

    it('deve gerar caminhos organizados corretamente', () => {
      const empresaId = 'test-empresa-123';
      const nomeArquivo = 'documento_123.pdf';
      
      const caminhoTemp = AnexoStorageService.gerarCaminhoArquivo(empresaId, nomeArquivo, true);
      const caminhoPerm = AnexoStorageService.gerarCaminhoArquivo(empresaId, nomeArquivo, false);
      
      expect(caminhoTemp).toMatch(/test-empresa-123\/\d{4}-\d{2}\/temp\/documento_123\.pdf/);
      expect(caminhoPerm).toMatch(/test-empresa-123\/\d{4}-\d{2}\/processed\/documento_123\.pdf/);
    });
  });

  describe('AnexoInfrastructureUtils', () => {
    it('deve verificar infraestrutura sem erros', async () => {
      const status = await AnexoInfrastructureUtils.verificarInfraestrutura();
      
      expect(status).toHaveProperty('bucketsExistem');
      expect(status).toHaveProperty('tabelasExistem');
      expect(status).toHaveProperty('politicasConfiguradas');
      expect(status).toHaveProperty('funcoesExistem');
      expect(status).toHaveProperty('pronto');
      expect(status).toHaveProperty('erros');
      expect(Array.isArray(status.erros)).toBe(true);
    });

    it('deve gerar relatório de infraestrutura', async () => {
      const relatorio = await AnexoInfrastructureUtils.gerarRelatorioInfraestrutura();
      
      expect(relatorio).toContain('RELATÓRIO DA INFRAESTRUTURA DE ANEXOS');
      expect(relatorio).toContain('Status Geral:');
      expect(relatorio).toContain('Componentes:');
      expect(relatorio).toContain('Configurações:');
    });

    it('deve testar infraestrutura e retornar resultados', async () => {
      const resultado = await AnexoInfrastructureUtils.testarInfraestrutura();
      
      expect(resultado).toHaveProperty('sucesso');
      expect(resultado).toHaveProperty('testes');
      expect(resultado).toHaveProperty('erros');
      expect(typeof resultado.sucesso).toBe('boolean');
      expect(Array.isArray(resultado.erros)).toBe(true);
    });
  });

  describe('Validações de Segurança', () => {
    it('deve rejeitar tipos de arquivo perigosos', () => {
      const tiposPerigosos = [
        'application/x-executable',
        'application/x-msdownload',
        'text/javascript',
        'application/javascript',
        'text/html'
      ];

      tiposPerigosos.forEach(tipo => {
        expect(AnexoStorageService.validarTipoArquivo(tipo)).toBe(false);
      });
    });

    it('deve aceitar apenas tipos de documento permitidos', () => {
      const tiposPermitidos = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      tiposPermitidos.forEach(tipo => {
        expect(AnexoStorageService.validarTipoArquivo(tipo)).toBe(true);
      });
    });
  });

  describe('Estrutura de Pastas', () => {
    it('deve organizar arquivos por empresa e data', () => {
      const empresaId = 'empresa-abc-123';
      const arquivo = 'relatorio.pdf';
      
      const caminho = AnexoStorageService.gerarCaminhoArquivo(empresaId, arquivo, true);
      
      // Deve conter: empresa/YYYY-MM/temp/arquivo
      expect(caminho).toMatch(/^empresa-abc-123\/\d{4}-\d{2}\/temp\/relatorio\.pdf$/);
    });

    it('deve limpar caracteres especiais do nome da empresa', () => {
      const empresaComEspeciais = 'Empresa & Cia. Ltda!';
      const arquivo = 'documento.pdf';
      
      const caminho = AnexoStorageService.gerarCaminhoArquivo(empresaComEspeciais, arquivo, true);
      
      // Caracteres especiais devem ser substituídos por underscore
      expect(caminho).toMatch(/^Empresa___Cia__Ltda_\/\d{4}-\d{2}\/temp\/documento\.pdf$/);
    });

    it('deve separar arquivos temporários e processados', () => {
      const empresaId = 'test-empresa';
      const arquivo = 'teste.pdf';
      
      const caminhoTemp = AnexoStorageService.gerarCaminhoArquivo(empresaId, arquivo, true);
      const caminhoPerm = AnexoStorageService.gerarCaminhoArquivo(empresaId, arquivo, false);
      
      expect(caminhoTemp).toContain('/temp/');
      expect(caminhoPerm).toContain('/processed/');
    });
  });
});

// Testes de integração que requerem conexão com Supabase
describe('Integração com Supabase (requer configuração)', () => {
  // Estes testes só rodam se a infraestrutura estiver configurada
  it.skip('deve verificar buckets no Supabase', async () => {
    const bucketsExistem = await AnexoStorageService.verificarBuckets();
    expect(typeof bucketsExistem).toBe('boolean');
  });

  it.skip('deve calcular uso de storage', async () => {
    const empresaId = 'test-empresa-id';
    const uso = await AnexoStorageService.calcularUsoStorage(empresaId);
    
    expect(uso).toHaveProperty('temporario');
    expect(uso).toHaveProperty('permanente');
    expect(uso).toHaveProperty('total');
    expect(typeof uso.temporario).toBe('number');
    expect(typeof uso.permanente).toBe('number');
    expect(typeof uso.total).toBe('number');
  });
});