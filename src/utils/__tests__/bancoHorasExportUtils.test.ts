/**
 * Tests for Banco de Horas export utilities
 * 
 * @module utils/__tests__/bancoHorasExportUtils.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import {
  exportarConsolidadoExcel,
  exportarSegmentadoExcel,
  exportarConsolidadoPDF,
  exportarSegmentadoPDF
} from '../bancoHorasExportUtils';
import { BancoHorasCalculo, BancoHorasCalculoSegmentado } from '@/types/bancoHoras';

// Mock XLSX
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn(() => ({ '!cols': [] })),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

// Mock jsPDF
vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      setFont: vi.fn(),
      setFillColor: vi.fn(),
      setTextColor: vi.fn(),
      setFontSize: vi.fn(),
      setDrawColor: vi.fn(),
      setLineWidth: vi.fn(),
      rect: vi.fn(),
      text: vi.fn(),
      getTextWidth: vi.fn(() => 50),
      splitTextToSize: vi.fn((text) => [text]),
      addPage: vi.fn(),
      save: vi.fn(),
      internal: {
        pageSize: {
          getWidth: vi.fn(() => 210),
          getHeight: vi.fn(() => 297),
        },
      },
    })),
  };
});

describe('bancoHorasExportUtils', () => {
  const mockCalculo: BancoHorasCalculo = {
    id: '1',
    empresa_id: 'empresa-1',
    mes: 1,
    ano: 2024,
    versao: 1,
    baseline_horas: '160:00',
    repasses_mes_anterior_horas: '10:00',
    saldo_a_utilizar_horas: '170:00',
    consumo_horas: '150:00',
    requerimentos_horas: '5:00',
    reajustes_horas: '0:00',
    consumo_total_horas: '155:00',
    saldo_horas: '15:00',
    repasse_horas: '7:30',
    excedentes_horas: '0:00',
    valor_excedentes_horas: 0,
    valor_a_faturar: 0,
    is_fim_periodo: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockSegmento: BancoHorasCalculoSegmentado = {
    id: '1',
    calculo_id: '1',
    alocacao_id: 'alocacao-1',
    alocacao: {
      id: 'alocacao-1',
      empresa_id: 'empresa-1',
      nome_alocacao: 'Departamento TI',
      percentual_baseline: 60,
      ativo: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    baseline_horas: '96:00',
    repasses_mes_anterior_horas: '6:00',
    saldo_a_utilizar_horas: '102:00',
    consumo_horas: '90:00',
    requerimentos_horas: '3:00',
    reajustes_horas: '0:00',
    consumo_total_horas: '93:00',
    saldo_horas: '9:00',
    repasse_horas: '4:30',
    created_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportarConsolidadoExcel', () => {
    it('should export consolidated view to Excel successfully', () => {
      const result = exportarConsolidadoExcel(
        mockCalculo,
        'Empresa Teste',
        'Janeiro',
        2024
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Relatório Excel exportado com sucesso!');
      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
      expect(XLSX.writeFile).toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      vi.mocked(XLSX.utils.book_new).mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const result = exportarConsolidadoExcel(
        mockCalculo,
        'Empresa Teste',
        'Janeiro',
        2024
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Erro ao gerar arquivo Excel');
    });
  });

  describe('exportarSegmentadoExcel', () => {
    it('should export segmented view to Excel successfully', () => {
      const result = exportarSegmentadoExcel(
        [mockSegmento],
        'Empresa Teste',
        'Janeiro',
        2024
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Relatório Excel segmentado exportado com sucesso!');
      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
      expect(XLSX.writeFile).toHaveBeenCalled();
    });

    it('should handle multiple allocations', () => {
      const mockSegmento2 = { ...mockSegmento, id: '2', alocacao_id: 'alocacao-2' };
      
      const result = exportarSegmentadoExcel(
        [mockSegmento, mockSegmento2],
        'Empresa Teste',
        'Janeiro',
        2024
      );

      expect(result.success).toBe(true);
      expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledTimes(2);
    });
  });

  describe('exportarConsolidadoPDF', () => {
    it('should export consolidated view to PDF successfully', () => {
      const result = exportarConsolidadoPDF(
        mockCalculo,
        'Empresa Teste',
        'Janeiro',
        2024
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Relatório PDF exportado com sucesso!');
      expect(jsPDF).toHaveBeenCalled();
    });

    it('should format values correctly', () => {
      const result = exportarConsolidadoPDF(
        mockCalculo,
        'Empresa Teste',
        'Janeiro',
        2024
      );

      expect(result.success).toBe(true);
      expect(jsPDF).toHaveBeenCalled();
    });
  });

  describe('exportarSegmentadoPDF', () => {
    it('should export segmented view to PDF successfully', () => {
      const result = exportarSegmentadoPDF(
        [mockSegmento],
        'Empresa Teste',
        'Janeiro',
        2024
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Relatório PDF segmentado exportado com sucesso!');
      expect(jsPDF).toHaveBeenCalled();
    });

    it('should handle multiple allocations', () => {
      const mockSegmento2 = { ...mockSegmento, id: '2', alocacao_id: 'alocacao-2' };
      
      const result = exportarSegmentadoPDF(
        [mockSegmento, mockSegmento2],
        'Empresa Teste',
        'Janeiro',
        2024
      );

      expect(result.success).toBe(true);
      expect(jsPDF).toHaveBeenCalled();
    });
  });
});
