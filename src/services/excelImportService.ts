import * as XLSX from 'xlsx';
import { z } from 'zod';
import { EmpresaCliente } from '../types/clientBooks';
import { empresasClientesService } from './empresasClientesService';

// Schema de validação para dados de empresa no Excel
const empresaExcelSchema = z.object({
  'Nome Completo': z.string().min(1, 'Nome completo é obrigatório'),
  'Nome Abreviado': z.string().min(1, 'Nome abreviado é obrigatório'),
  'Link SharePoint': z.string().optional(),
  'Template Padrão': z.enum(['portugues', 'ingles']).default('portugues'),
  'Status': z.enum(['ativo', 'inativo', 'suspenso']).default('ativo'),
  'Email Gestor': z.string().email('Email inválido').optional(),
  'Produtos': z.string().optional(), // String separada por vírgulas
  'Grupos': z.string().optional(), // String separada por vírgulas
});

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
  successfulImports: EmpresaCliente[];
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

export interface ImportPreview {
  headers: string[];
  data: any[];
  validationErrors: ImportError[];
  isValid: boolean;
}

class ExcelImportService {
  /**
   * Faz o parse de um arquivo Excel e retorna os dados para preview
   */
  async parseExcelFile(file: File): Promise<ImportPreview> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      // Pega a primeira planilha
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Converte para JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        throw new Error('Arquivo Excel está vazio');
      }
      
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);
      
      // Converte os dados para objetos
      const data = dataRows.map((row: any[], index) => {
        const obj: any = {};
        headers.forEach((header, headerIndex) => {
          obj[header] = row[headerIndex] || '';
        });
        obj._rowIndex = index + 2; // +2 porque começamos da linha 2 (header é linha 1)
        return obj;
      });
      
      // Valida os dados
      const validationErrors = this.validateImportData(data);
      
      return {
        headers,
        data,
        validationErrors,
        isValid: validationErrors.length === 0
      };
    } catch (error) {
      throw new Error(`Erro ao processar arquivo Excel: ${error.message}`);
    }
  }

  /**
   * Valida os dados importados do Excel
   */
  private validateImportData(data: any[]): ImportError[] {
    const errors: ImportError[] = [];
    
    data.forEach((row, index) => {
      try {
        empresaExcelSchema.parse(row);
        
        // Validações adicionais
        if (row['Produtos']) {
          const produtos = row['Produtos'].split(',').map((p: string) => p.trim().toUpperCase());
          const produtosValidos = ['CE_PLUS', 'FISCAL', 'GALLERY'];
          
          produtos.forEach((produto: string) => {
            if (!produtosValidos.includes(produto)) {
              errors.push({
                row: row._rowIndex,
                field: 'Produtos',
                message: `Produto inválido: ${produto}. Produtos válidos: ${produtosValidos.join(', ')}`,
                data: row
              });
            }
          });
        }
        
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            errors.push({
              row: row._rowIndex,
              field: err.path.join('.'),
              message: err.message,
              data: row
            });
          });
        }
      }
    });
    
    return errors;
  }

  /**
   * Importa os dados validados para o banco de dados
   */
  async importData(data: any[]): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      totalRows: data.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
      successfulImports: []
    };
    
    // Primeiro valida todos os dados
    const validationErrors = this.validateImportData(data);
    if (validationErrors.length > 0) {
      result.errors = validationErrors;
      result.errorCount = validationErrors.length;
      return result;
    }
    
    // Processa cada linha
    for (const row of data) {
      try {
        const empresaData = this.transformRowToEmpresa(row);
        const empresa = await empresasClientesService.criarEmpresa(empresaData);
        
        result.successfulImports.push(empresa);
        result.successCount++;
        
      } catch (error) {
        result.errors.push({
          row: row._rowIndex,
          message: `Erro ao criar empresa: ${error.message}`,
          data: row
        });
        result.errorCount++;
      }
    }
    
    result.success = result.errorCount === 0;
    return result;
  }

  /**
   * Transforma uma linha do Excel em dados de empresa
   */
  private transformRowToEmpresa(row: any): any {
    const produtos = row['Produtos'] 
      ? row['Produtos'].split(',').map((p: string) => p.trim().toUpperCase())
      : [];
    
    const grupos = row['Grupos']
      ? row['Grupos'].split(',').map((g: string) => g.trim())
      : [];
    
    return {
      nomeCompleto: row['Nome Completo'],
      nomeAbreviado: row['Nome Abreviado'],
      linkSharepoint: row['Link SharePoint'] || '',
      templatePadrao: row['Template Padrão'] || 'portugues',
      status: row['Status'] || 'ativo',
      emailGestor: row['Email Gestor'] || '',
      produtos,
      grupos
    };
  }

  /**
   * Gera um template Excel para download
   */
  generateTemplate(): Blob {
    const templateData = [
      [
        'Nome Completo',
        'Nome Abreviado', 
        'Link SharePoint',
        'Template Padrão',
        'Status',
        'Email Gestor',
        'Produtos',
        'Grupos'
      ],
      [
        'Exemplo Empresa Ltda',
        'Exemplo',
        'https://sharepoint.com/exemplo',
        'portugues',
        'ativo',
        'gestor@exemplo.com',
        'CE_PLUS,FISCAL',
        'CE Plus,Todos'
      ]
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Empresas');
    
    // Gera o arquivo Excel
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /**
   * Gera relatório de importação em formato Excel
   */
  generateImportReport(result: ImportResult): Blob {
    const reportData = [
      ['Relatório de Importação'],
      [''],
      ['Resumo:'],
      ['Total de linhas:', result.totalRows],
      ['Sucessos:', result.successCount],
      ['Erros:', result.errorCount],
      [''],
      ['Erros encontrados:'],
      ['Linha', 'Campo', 'Mensagem', 'Dados']
    ];
    
    // Adiciona os erros
    result.errors.forEach(error => {
      reportData.push([
        error.row.toString(),
        error.field || '',
        error.message,
        JSON.stringify(error.data)
      ]);
    });
    
    // Adiciona sucessos
    if (result.successfulImports.length > 0) {
      reportData.push([''], ['Empresas importadas com sucesso:'], ['Nome', 'Status']);
      result.successfulImports.forEach(empresa => {
        reportData.push([empresa.nomeCompleto, empresa.status]);
      });
    }
    
    const worksheet = XLSX.utils.aoa_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
}

export const excelImportService = new ExcelImportService();