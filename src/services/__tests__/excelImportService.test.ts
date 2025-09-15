import { describe, it, expect, vi, beforeEach } from 'vitest';
import { excelImportService } from '../excelImportService';
import * as XLSX from 'xlsx';

// Mock do XLSX
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
    aoa_to_sheet: vi.fn(),
    book_new: vi.fn(),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn(),
}));

// Mock do empresasClientesService
vi.mock('../empresasClientesService', () => ({
  empresasClientesService: {
    criarEmpresa: vi.fn(),
  },
}));

describe('ExcelImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseExcelFile', () => {
    it('deve fazer parse de um arquivo Excel válido', async () => {
      // Arrange
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer)
      } as any;
      
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      };
      const mockJsonData = [
        ['Nome Completo', 'Nome Abreviado', 'Template Padrão', 'Status'],
        ['Empresa Teste', 'Teste', 'portugues', 'ativo']
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockJsonData);

      // Act
      const result = await excelImportService.parseExcelFile(mockFile);

      // Assert
      expect(result).toBeDefined();
      expect(result.headers).toEqual(['Nome Completo', 'Nome Abreviado', 'Template Padrão', 'Status']);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]['Nome Completo']).toBe('Empresa Teste');
    });

    it('deve retornar erro para arquivo vazio', async () => {
      // Arrange
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer)
      } as any;
      
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      };

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([]);

      // Act & Assert
      await expect(excelImportService.parseExcelFile(mockFile)).rejects.toThrow('Arquivo Excel está vazio');
    });
  });

  describe('generateTemplate', () => {
    it('deve gerar um template Excel', () => {
      // Arrange
      const mockWorksheet = {};
      const mockWorkbook = {};
      const mockBuffer = new ArrayBuffer(8);

      vi.mocked(XLSX.utils.aoa_to_sheet).mockReturnValue(mockWorksheet);
      vi.mocked(XLSX.utils.book_new).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.write).mockReturnValue(mockBuffer);

      // Act
      const result = excelImportService.generateTemplate();

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
      expect(XLSX.write).toHaveBeenCalled();
    });
  });

  describe('transformRowToEmpresa', () => {
    it('deve transformar uma linha do Excel em dados de empresa', () => {
      // Arrange
      const row = {
        'Nome Completo': 'Empresa Teste',
        'Nome Abreviado': 'Teste',
        'Link SharePoint': 'https://sharepoint.com/teste',
        'Template Padrão': 'portugues',
        'Status': 'ativo',
        'Email Gestor': 'gestor@teste.com',
        'Produtos': 'CE_PLUS,FISCAL',
        'Grupos': 'CE Plus,Todos'
      };

      // Act
      const result = (excelImportService as any).transformRowToEmpresa(row);

      // Assert
      expect(result).toEqual({
        nomeCompleto: 'Empresa Teste',
        nomeAbreviado: 'Teste',
        linkSharepoint: 'https://sharepoint.com/teste',
        templatePadrao: 'portugues',
        status: 'ativo',
        emailGestor: 'gestor@teste.com',
        produtos: ['CE_PLUS', 'FISCAL'],
        grupos: ['CE Plus', 'Todos']
      });
    });

    it('deve lidar com campos vazios', () => {
      // Arrange
      const row = {
        'Nome Completo': 'Empresa Teste',
        'Nome Abreviado': 'Teste',
        'Link SharePoint': '',
        'Template Padrão': '',
        'Status': '',
        'Email Gestor': '',
        'Produtos': '',
        'Grupos': ''
      };

      // Act
      const result = (excelImportService as any).transformRowToEmpresa(row);

      // Assert
      expect(result).toEqual({
        nomeCompleto: 'Empresa Teste',
        nomeAbreviado: 'Teste',
        linkSharepoint: '',
        templatePadrao: 'portugues',
        status: 'ativo',
        emailGestor: '',
        produtos: [],
        grupos: []
      });
    });
  });
});