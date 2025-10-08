import { z } from 'zod';
import type { 
  StatusEmpresa, 
  TemplatePadrao, 
  Produto, 
  StatusDisparo,
  StatusControleMensal 
} from '@/types/clientBooks';

/**
 * Schemas Zod para validação de formulários do sistema de Client Books
 */

// Schema base para email
const emailSchema = z
  .string()
  .min(1, 'E-mail é obrigatório')
  .email('E-mail deve ter um formato válido')
  .max(255, 'E-mail deve ter no máximo 255 caracteres');

// Schema base para nome
const nomeSchema = z
  .string()
  .min(1, 'Nome é obrigatório')
  .max(255, 'Nome deve ter no máximo 255 caracteres')
  .trim();

// Schema base para URL
const urlSchema = z
  .string()
  .url('URL deve ter um formato válido')
  .optional()
  .or(z.literal(''));

// Schema para status de empresa
const statusEmpresaSchema = z.enum(['ativo', 'inativo', 'suspenso'] as const, {
  errorMap: () => ({ message: 'Status deve ser ativo, inativo ou suspenso' })
});

// Schema para status de cliente
const statusClienteSchema = z.enum(['ativo', 'inativo'] as const, {
  errorMap: () => ({ message: 'Status deve ser ativo ou inativo' })
});

// Schema para template padrão (aceita templates padrão ou IDs de templates personalizados)
const templatePadraoSchema = z.string().min(1, 'Template é obrigatório');

// Schema para produtos
const produtoSchema = z.enum(['COMEX', 'FISCAL', 'GALLERY'] as const, {
  errorMap: () => ({ message: 'Produto deve ser COMEX, FISCAL ou GALLERY' })
});

// Schema para status de disparo
const statusDisparoSchema = z.enum(['enviado', 'falhou', 'agendado', 'cancelado'] as const, {
  errorMap: () => ({ message: 'Status deve ser enviado, falhou, agendado ou cancelado' })
});

// Schema para status de controle mensal
const statusControleMensalSchema = z.enum(['pendente', 'enviado', 'falhou', 'agendado'] as const, {
  errorMap: () => ({ message: 'Status deve ser pendente, enviado, falhou ou agendado' })
});

// Schema para tipo de book
const tipoBookSchema = z.enum(['nao_tem_book', 'qualidade', 'outros'] as const, {
  errorMap: () => ({ message: 'Tipo de book deve ser nao_tem_book, qualidade ou outros' })
});

/**
 * Schema para formulário de empresa cliente
 */
export const empresaFormSchema = z.object({
  nomeCompleto: nomeSchema,
  nomeAbreviado: z
    .string()
    .min(1, 'Nome abreviado é obrigatório')
    .max(100, 'Nome abreviado deve ter no máximo 100 caracteres')
    .trim(),
  linkSharepoint: urlSchema,
  templatePadrao: templatePadraoSchema,
  status: statusEmpresaSchema,
  descricaoStatus: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
  emailGestor: emailSchema.optional().or(z.literal('')),
  produtos: z
    .array(produtoSchema)
    .min(1, 'Pelo menos um produto deve ser selecionado')
    .max(3, 'No máximo 3 produtos podem ser selecionados'),
  grupos: z
    .array(z.string().uuid('ID do grupo deve ser um UUID válido'))
    .optional()
    .default([]),

  temAms: z.boolean().default(false),
  tipoBook: tipoBookSchema.optional().default('nao_tem_book')
}).refine((data) => {
  // Se status for inativo ou suspenso, descrição é obrigatória
  if ((data.status === 'inativo' || data.status === 'suspenso') && !data.descricaoStatus?.trim()) {
    return false;
  }
  return true;
}, {
  message: 'Descrição é obrigatória quando status for inativo ou suspenso',
  path: ['descricaoStatus']
});

/**
 * Schema para formulário de cliente
 */
export const clienteFormSchema = z.object({
  nomeCompleto: nomeSchema,
  email: emailSchema,
  funcao: z
    .string()
    .max(100, 'Função deve ter no máximo 100 caracteres')
    .optional()
    .or(z.literal('')),
  empresaId: z
    .string()
    .uuid('ID da empresa deve ser um UUID válido')
    .min(1, 'Empresa é obrigatória'),
  status: statusClienteSchema,
  descricaoStatus: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
  principalContato: z.boolean().default(false)
}).refine((data) => {
  // Se status for inativo, descrição é obrigatória
  if (data.status === 'inativo' && !data.descricaoStatus?.trim()) {
    return false;
  }
  return true;
}, {
  message: 'Descrição é obrigatória quando status for inativo',
  path: ['descricaoStatus']
});

/**
 * Schema para email de grupo
 */
export const grupoEmailFormSchema = z.object({
  email: emailSchema,
  nome: z
    .string()
    .max(255, 'Nome deve ter no máximo 255 caracteres')
    .optional()
    .or(z.literal(''))
});

/**
 * Schema para formulário de grupo responsável
 */
export const grupoFormSchema = z.object({
  nome: z
    .string()
    .min(1, 'Nome do grupo é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  descricao: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
  emails: z
    .array(grupoEmailFormSchema)
    .min(1, 'Pelo menos um e-mail deve ser adicionado')
    .max(20, 'No máximo 20 e-mails podem ser adicionados')
}).refine((data) => {
  // Verificar se não há e-mails duplicados
  const emails = data.emails.map(e => e.email.toLowerCase());
  const uniqueEmails = new Set(emails);
  return emails.length === uniqueEmails.size;
}, {
  message: 'Não é possível adicionar e-mails duplicados',
  path: ['emails']
});

/**
 * Schema para filtros de empresa
 */
export const empresaFiltrosSchema = z.object({
  status: z.array(statusEmpresaSchema).optional(),
  produtos: z.array(produtoSchema).optional(),
  busca: z.string().max(255, 'Busca deve ter no máximo 255 caracteres').optional()
});

/**
 * Schema para filtros de cliente
 */
export const clienteFiltrosSchema = z.object({
  empresaId: z.string().uuid('ID da empresa deve ser um UUID válido').optional(),
  status: z.array(statusClienteSchema).optional(),
  busca: z.string().max(255, 'Busca deve ter no máximo 255 caracteres').optional()
});

/**
 * Schema para agendamento de disparo
 */
export const agendamentoDisparoSchema = z.object({
  empresaId: z.string().uuid('ID da empresa deve ser um UUID válido'),
  clienteIds: z
    .array(z.string().uuid('ID do cliente deve ser um UUID válido'))
    .min(1, 'Pelo menos um cliente deve ser selecionado'),
  dataAgendamento: z
    .date({
      required_error: 'Data de agendamento é obrigatória',
      invalid_type_error: 'Data de agendamento deve ser uma data válida'
    })
    .min(new Date(), 'Data de agendamento deve ser no futuro'),
  templateId: z.string().uuid('ID do template deve ser um UUID válido').optional(),
  observacoes: z
    .string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional()
});

/**
 * Schema para filtros de histórico
 */
export const historicoFiltrosSchema = z.object({
  mes: z
    .number()
    .int('Mês deve ser um número inteiro')
    .min(1, 'Mês deve ser entre 1 e 12')
    .max(12, 'Mês deve ser entre 1 e 12')
    .optional(),
  ano: z
    .number()
    .int('Ano deve ser um número inteiro')
    .min(2020, 'Ano deve ser maior que 2020')
    .max(2050, 'Ano deve ser menor que 2050')
    .optional(),
  empresaId: z.string().uuid('ID da empresa deve ser um UUID válido').optional(),
  clienteId: z.string().uuid('ID do cliente deve ser um UUID válido').optional(),
  status: z.array(statusDisparoSchema).optional(),
  dataInicio: z.date().optional(),
  dataFim: z.date().optional()
}).refine((data) => {
  // Se ambas as datas estão definidas, dataInicio deve ser menor que dataFim
  if (data.dataInicio && data.dataFim) {
    return data.dataInicio <= data.dataFim;
  }
  return true;
}, {
  message: 'Data de início deve ser anterior à data de fim',
  path: ['dataFim']
});

/**
 * Schema para importação Excel
 */
export const excelImportSchema = z.object({
  arquivo: z
    .instanceof(File, { message: 'Arquivo é obrigatório' })
    .refine((file) => {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      return validTypes.includes(file.type);
    }, 'Arquivo deve ser um Excel (.xlsx ou .xls)')
    .refine((file) => file.size <= 10 * 1024 * 1024, 'Arquivo deve ter no máximo 10MB'),
  validarDados: z.boolean().default(true),
  ignorarErros: z.boolean().default(false)
});

/**
 * Schema para alteração em lote
 */
export const alteracaoLoteSchema = z.object({
  ids: z
    .array(z.string().uuid('ID deve ser um UUID válido'))
    .min(1, 'Pelo menos um item deve ser selecionado'),
  campo: z.enum(['status', 'emailGestor', 'templatePadrao'] as const),
  valor: z.string().min(1, 'Valor é obrigatório'),
  descricao: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional()
});

/**
 * Tipos derivados dos schemas
 */
export type EmpresaFormData = z.infer<typeof empresaFormSchema>;
export type ClienteFormData = z.infer<typeof clienteFormSchema>;
export type GrupoFormData = z.infer<typeof grupoFormSchema>;
export type GrupoEmailFormData = z.infer<typeof grupoEmailFormSchema>;
export type EmpresaFiltros = z.infer<typeof empresaFiltrosSchema>;
export type ClienteFiltros = z.infer<typeof clienteFiltrosSchema>;
export type AgendamentoDisparo = z.infer<typeof agendamentoDisparoSchema>;
export type HistoricoFiltros = z.infer<typeof historicoFiltrosSchema>;
export type ExcelImportData = z.infer<typeof excelImportSchema>;
export type AlteracaoLoteData = z.infer<typeof alteracaoLoteSchema>;

/**
 * Utilitários para validação
 */
export const validationUtils = {
  /**
   * Valida se um e-mail é único em uma lista
   */
  isEmailUnique: (email: string, emails: string[]): boolean => {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedEmails = emails.map(e => e.toLowerCase().trim());
    return !normalizedEmails.includes(normalizedEmail);
  },

  /**
   * Valida se um nome de grupo é único
   */
  isGroupNameUnique: (nome: string, existingNames: string[]): boolean => {
    const normalizedName = nome.toLowerCase().trim();
    const normalizedExisting = existingNames.map(n => n.toLowerCase().trim());
    return !normalizedExisting.includes(normalizedName);
  },

  /**
   * Valida se uma data está no futuro
   */
  isFutureDate: (date: Date): boolean => {
    return date > new Date();
  },

  /**
   * Valida se um período de datas é válido
   */
  isValidDateRange: (inicio: Date, fim: Date): boolean => {
    return inicio <= fim;
  },

  /**
   * Valida formato de CNPJ (básico)
   */
  isValidCNPJ: (cnpj: string): boolean => {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
    return cleanCNPJ.length === 14;
  }
};