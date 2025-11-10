import * as XLSX from 'xlsx';
import { z } from 'zod';
import { EmpresaCliente } from '../types/clientBooks';
import { empresasClientesService } from './empresasClientesService';
import { supabase } from '../integrations/supabase/client';

// Schema de validação para dados de empresa no Excel
const empresaExcelSchema = z.object({
  'Nome Completo': z.string().min(1, 'Nome completo é obrigatório'),
  'Nome Abreviado': z.string().min(1, 'Nome abreviado é obrigatório'),
  'Link SharePoint': z.string().optional(), // Agora é condicional
  'Template Padrão': z.string().optional(), // Pode ser ID do template ou nome
  'Status': z.enum(['ativo', 'inativo', 'suspenso']).default('ativo'),
  'Descrição Status': z.string().optional(),
  'Email Gestor': z.string().email('Email inválido').min(1, 'Email do customer success é obrigatório'),
  'Produtos': z.string().min(1, 'Pelo menos um produto é obrigatório'), // String separada por vírgulas
  'Grupos': z.string().optional(), // String separada por vírgulas
  'Tem AMS': z.string().optional(), // 'sim' ou 'não'
  'Tipo Book': z.string().optional(), // Será validado condicionalmente
  'Tipo Cobrança': z.string().optional(), // Será validado condicionalmente
  'Vigência Inicial': z.string().optional(), // Data no formato YYYY-MM-DD
  'Vigência Final': z.string().optional(), // Data no formato YYYY-MM-DD
  'Book Personalizado': z.string().optional(), // 'sim' ou 'não'
  'Anexo': z.string().optional(), // 'sim' ou 'não'
  'Observação': z.string().optional(), // Máximo 500 caracteres
}).refine((data) => {
  // Validação condicional para Tipo Book
  const temAms = data['Tem AMS']?.toLowerCase() === 'sim';
  const tipoBook = data['Tipo Book'];
  
  // Se tem AMS, Tipo Book é obrigatório e deve ser válido
  if (temAms) {
    if (!tipoBook || !tipoBook.trim()) {
      return false;
    }
    if (!['nao_tem_book', 'outros', 'qualidade'].includes(tipoBook)) {
      return false;
    }
  }
  
  // Se não tem AMS, Tipo Book pode estar vazio ou ser válido
  if (!temAms && tipoBook && tipoBook.trim()) {
    if (!['nao_tem_book', 'outros', 'qualidade'].includes(tipoBook)) {
      return false;
    }
  }
  
  return true;
}, {
  message: 'Tipo Book é obrigatório quando a empresa tem AMS. Valores válidos: nao_tem_book, outros, qualidade',
  path: ['Tipo Book'],
}).refine((data) => {
  // Validação condicional para Tipo Cobrança
  const temAms = data['Tem AMS']?.toLowerCase() === 'sim';
  const tipoCobranca = data['Tipo Cobrança'];
  
  // Se tem AMS, Tipo Cobrança é obrigatório e deve ser válido
  if (temAms) {
    if (!tipoCobranca || !tipoCobranca.trim()) {
      return false;
    }
    if (!['banco_horas', 'ticket', 'outros'].includes(tipoCobranca)) {
      return false;
    }
  }
  
  // Se não tem AMS, Tipo Cobrança pode estar vazio ou ser válido
  if (!temAms && tipoCobranca && tipoCobranca.trim()) {
    if (!['banco_horas', 'ticket', 'outros'].includes(tipoCobranca)) {
      return false;
    }
  }
  
  return true;
}, {
  message: 'Tipo Cobrança é obrigatório quando a empresa tem AMS. Valores válidos: banco_horas, ticket, outros',
  path: ['Tipo Cobrança'],
}).refine((data) => {
  // Validação condicional para Link SharePoint
  const temAms = data['Tem AMS']?.toLowerCase() === 'sim';
  const tipoBook = data['Tipo Book'];
  
  if (temAms && tipoBook !== 'nao_tem_book' && (!data['Link SharePoint'] || !data['Link SharePoint'].trim())) {
    return false;
  }
  return true;
}, {
  message: 'Link SharePoint é obrigatório quando a empresa tem AMS e possui book',
  path: ['Link SharePoint'],
}).refine((data) => {
  // Validação condicional para Template Padrão
  const temAms = data['Tem AMS']?.toLowerCase() === 'sim';
  const tipoBook = data['Tipo Book'];
  
  // Template Padrão é obrigatório apenas quando tem AMS E Tipo de Book não for "nao_tem_book"
  if (temAms && tipoBook !== 'nao_tem_book' && (!data['Template Padrão'] || !data['Template Padrão'].trim())) {
    return false;
  }
  return true;
}, {
  message: 'Template Padrão é obrigatório quando a empresa tem AMS e possui book',
  path: ['Template Padrão'],
}).refine((data) => {
  // Validação de URL para Link SharePoint quando preenchido
  if (data['Link SharePoint'] && data['Link SharePoint'].trim()) {
    try {
      new URL(data['Link SharePoint']);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}, {
  message: 'Link SharePoint deve ser uma URL válida',
  path: ['Link SharePoint'],
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

      // Converte os dados para objetos, filtrando linhas vazias
      const data = dataRows
        .map((row: any[], index) => {
          const obj: any = {};
          headers.forEach((header, headerIndex) => {
            obj[header] = row[headerIndex] || '';
          });
          obj._rowIndex = index + 2; // +2 porque começamos da linha 2 (header é linha 1)
          return obj;
        })
        .filter((row) => {
          // Filtrar linhas que tenham pelo menos um campo preenchido (exceto _rowIndex)
          return Object.keys(row).some(key => {
            if (key === '_rowIndex') return false;
            const value = row[key];
            return value && value.toString().trim().length > 0;
          });
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

    data.forEach((row) => {
      try {
        empresaExcelSchema.parse(row);

        // Validações adicionais
        if (row['Produtos']) {
          const produtos = row['Produtos'].split(',').map((p: string) => p.trim().toUpperCase());
          const produtosValidos = ['COMEX', 'FISCAL', 'GALLERY'];

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

        // Validação de status e descrição
        if ((row['Status'] === 'inativo' || row['Status'] === 'suspenso') && !row['Descrição Status']?.trim()) {
          errors.push({
            row: row._rowIndex,
            field: 'Descrição Status',
            message: 'Descrição do status é obrigatória para status Inativo ou Suspenso',
            data: row
          });
        }

        // Validação de vigências
        if (row['Vigência Inicial'] && row['Vigência Final']) {
          const inicial = new Date(row['Vigência Inicial']);
          const final = new Date(row['Vigência Final']);

          if (isNaN(inicial.getTime())) {
            errors.push({
              row: row._rowIndex,
              field: 'Vigência Inicial',
              message: 'Data de vigência inicial inválida. Use o formato YYYY-MM-DD',
              data: row
            });
          }

          if (isNaN(final.getTime())) {
            errors.push({
              row: row._rowIndex,
              field: 'Vigência Final',
              message: 'Data de vigência final inválida. Use o formato YYYY-MM-DD',
              data: row
            });
          }

          if (!isNaN(inicial.getTime()) && !isNaN(final.getTime()) && inicial > final) {
            errors.push({
              row: row._rowIndex,
              field: 'Vigência Final',
              message: 'A vigência inicial não pode ser posterior à vigência final',
              data: row
            });
          }
        }

        // Validação de campos booleanos
        const camposBooleanos = ['Tem AMS', 'Book Personalizado', 'Anexo'];
        camposBooleanos.forEach(campo => {
          if (row[campo] && !['sim', 'não', 'SIM', 'NÃO', 'Sim', 'Não'].includes(row[campo])) {
            errors.push({
              row: row._rowIndex,
              field: campo,
              message: `${campo} deve ser "sim" ou "não"`,
              data: row
            });
          }
        });

        // Validação de Tipo Cobrança - removida pois já está no schema

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
        const empresaData = await this.transformRowToEmpresa(row);
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
  private async transformRowToEmpresa(row: any): Promise<any> {
    const produtos = row['Produtos']
      ? row['Produtos'].split(',').map((p: string) => p.trim().toUpperCase())
      : [];

    // Buscar IDs dos grupos pelos nomes
    let grupoIds: string[] = [];
    if (row['Grupos']) {
      const nomeGrupos = row['Grupos'].split(',').map((g: string) => g.trim());

      if (nomeGrupos.length > 0) {
        const { data: grupos, error } = await supabase
          .from('grupos_responsaveis')
          .select('id, nome')
          .in('nome', nomeGrupos);

        if (error) {
          console.warn('Erro ao buscar grupos:', error);
        } else if (grupos) {
          grupoIds = grupos.map(g => g.id);

          // Verificar se todos os grupos foram encontrados
          const gruposEncontrados = grupos.map(g => g.nome);
          const gruposNaoEncontrados = nomeGrupos.filter((nome: string) => !gruposEncontrados.includes(nome));

          if (gruposNaoEncontrados.length > 0) {
            console.warn(`Grupos não encontrados: ${gruposNaoEncontrados.join(', ')}`);
          }
        }
      }
    }

    // Função auxiliar para converter string para boolean
    const stringToBoolean = (value: string): boolean => {
      if (!value) return false;
      return ['sim', 'SIM', 'Sim', 'true', 'TRUE', 'True', '1'].includes(value.toString().trim());
    };

    // Determinar valores padrão baseados em "Tem AMS" e "Tipo Book"
    const temAms = stringToBoolean(row['Tem AMS']);
    const tipoBook = row['Tipo Book']?.trim() || (temAms ? 'nao_tem_book' : 'nao_tem_book');
    const tipoCobranca = row['Tipo Cobrança']?.trim() || (temAms ? 'banco_horas' : 'banco_horas');
    
    // Template Padrão só é necessário quando tem AMS E Tipo de Book não for "nao_tem_book"
    const templatePadrao = (temAms && tipoBook !== 'nao_tem_book') 
      ? (row['Template Padrão'] || 'portugues') 
      : '';

    return {
      nomeCompleto: row['Nome Completo'],
      nomeAbreviado: row['Nome Abreviado'],
      linkSharepoint: row['Link SharePoint'] || '',
      templatePadrao,
      status: row['Status'] || 'ativo',
      descricaoStatus: row['Descrição Status'] || '',
      emailGestor: row['Email Gestor'] || '',
      produtos,
      grupos: grupoIds, // Agora são IDs, não nomes
      temAms,
      tipoBook,
      tipoCobranca,
      vigenciaInicial: row['Vigência Inicial'] || '',
      vigenciaFinal: row['Vigência Final'] || '',
      bookPersonalizado: stringToBoolean(row['Book Personalizado']),
      anexo: stringToBoolean(row['Anexo']),
      observacao: row['Observação'] || ''
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
        'Status',
        'Descrição Status',
        'Email Gestor',
        'Produtos',
        'Grupos',
        'Tem AMS',
        'Tipo Book',
        'Template Padrão',
        'Link SharePoint',
        'Tipo Cobrança',
        'Vigência Inicial',
        'Vigência Final',
        'Book Personalizado',
        'Anexo',
        'Observação'
      ],
      [
        'EXEMPLO EMPRESA LTDA',
        'EXEMPLO',
        'ativo',
        '',
        'gestor@sonda.com',
        'COMEX,FISCAL',
        'Comex,Outros',
        'sim',
        'qualidade',
        'ID_DO_TEMPLATE_OU_NOME',
        'https://sharepoint.com/exemplo',
        'banco_horas',
        '2024-01-01',
        '2024-12-31',
        'não',
        'sim',
        'Observações sobre a empresa'
      ],
      [],
      ['INSTRUÇÕES (ordem das colunas):'],
      ['• Nome Completo: Nome completo da empresa - Para manter o padrão preencha com letras maiúsculas (obrigatório)'],
      ['• Nome Abreviado: Nome resumido da empresa - Para manter o padrão preencha com letras maiúsculas (obrigatório)'],
      ['• Status: "ativo", "inativo" ou "suspenso" (padrão: ativo)'],
      ['• Descrição Status: Justificativa obrigatória para status "inativo" ou "suspenso"'],
      ['• Email Gestor: E-mail do Customer Success responsável (obrigatório)'],
      ['• Produtos: Lista separada por vírgulas: COMEX, FISCAL, GALLERY (obrigatório)'],
      ['• Grupos: Lista de grupos responsáveis separados por vírgulas (opcional)'],
      ['• Tem AMS: "sim" ou "não" (padrão: não)'],
      ['• Tipo Book: "nao_tem_book", "outros" ou "qualidade" (obrigatório quando Tem AMS = "sim")'],
      ['• Template Padrão: ID ou nome do template (obrigatório APENAS quando Tem AMS = "sim" E Tipo Book ≠ "nao_tem_book")'],
      ['• Link SharePoint: URL do SharePoint da empresa (obrigatório APENAS quando Tem AMS = "sim" E Tipo Book ≠ "nao_tem_book")'],
      ['• Tipo Cobrança: "banco_horas", "ticket" ou "outros" (obrigatório quando Tem AMS = "sim")'],
      ['• Vigência Inicial: Data no formato YYYY-MM-DD (opcional)'],
      ['• Vigência Final: Data no formato YYYY-MM-DD (opcional)'],
      ['• Book Personalizado: "sim" ou "não" (padrão: não)'],
      ['• Anexo: "sim" ou "não" (padrão: não)'],
      ['• Observação: Texto livre até 500 caracteres (opcional)'],
      [],
      ['REGRAS CONDICIONAIS:'],
      ['• Tipo Book: Obrigatório apenas quando "Tem AMS" = "sim"'],
      ['• Tipo Cobrança: Obrigatório apenas quando "Tem AMS" = "sim"'],
      ['• Template Padrão: Obrigatório apenas quando "Tem AMS" = "sim" E "Tipo Book" ≠ "nao_tem_book"'],
      ['• Link SharePoint: Obrigatório apenas quando "Tem AMS" = "sim" E "Tipo Book" ≠ "nao_tem_book"']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);

    // Definir larguras das colunas
    const colWidths = [
      { wch: 25 }, // Nome Completo
      { wch: 15 }, // Nome Abreviado
      { wch: 10 }, // Status
      { wch: 20 }, // Descrição Status
      { wch: 25 }, // Email Gestor
      { wch: 20 }, // Produtos
      { wch: 20 }, // Grupos
      { wch: 10 }, // Tem AMS
      { wch: 15 }, // Tipo Book
      { wch: 25 }, // Template Padrão
      { wch: 35 }, // Link SharePoint
      { wch: 15 }, // Tipo Cobrança
      { wch: 15 }, // Vigência Inicial
      { wch: 15 }, // Vigência Final
      { wch: 18 }, // Book Personalizado
      { wch: 10 }, // Anexo
      { wch: 30 }  // Observação
    ];

    worksheet['!cols'] = colWidths;

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
      //reportData.push([''], ['Empresas importadas com sucesso:'], ['Nome', 'Status']);
      result.successfulImports.forEach(empresa => {
        reportData.push([empresa.nome_completo, empresa.status]);
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