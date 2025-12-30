/**
 * Schemas de validação Zod para o Sistema de Pesquisas
 */

import { z } from 'zod';

// ============================================
// SCHEMA PRINCIPAL DO FORMULÁRIO
// ============================================

// Schema base para pesquisas vindas do SQL Server
export const PesquisaFormSchemaBase = z.object({
  // Campos obrigatórios
  empresa: z.string()
    .min(1, 'Empresa é obrigatória')
    .max(255, 'Empresa deve ter no máximo 255 caracteres'),
  
  cliente: z.string()
    .min(1, 'Cliente é obrigatório')
    .max(255, 'Cliente deve ter no máximo 255 caracteres'),
  
  // Campos opcionais
  categoria: z.string()
    .max(100, 'Categoria deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  
  grupo: z.string()
    .max(100, 'Grupo deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  
  email_cliente: z.string()
    .email('Email inválido')
    .max(255, 'Email deve ter no máximo 255 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  
  prestador: z.string()
    .max(255, 'Consultor deve ter no máximo 255 caracteres')
    .optional()
    .nullable(),
  
  nro_caso: z.string()
    .max(100, 'Número do caso deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  
  tipo_caso: z.string()
    .max(100, 'Tipo do caso deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  
  ano_abertura: z.number()
    .int('Ano deve ser um número inteiro')
    .min(2000, 'Ano deve ser maior ou igual a 2000')
    .max(2100, 'Ano deve ser menor ou igual a 2100')
    .optional()
    .nullable(),
  
  mes_abertura: z.number()
    .int('Mês deve ser um número inteiro')
    .min(1, 'Mês deve estar entre 1 e 12')
    .max(12, 'Mês deve estar entre 1 e 12')
    .optional()
    .nullable(),
  
  data_resposta: z.date()
    .optional()
    .nullable(),
  
  resposta: z.string()
    .max(5000, 'Resposta deve ter no máximo 5000 caracteres')
    .optional()
    .nullable(),
  
  comentario_pesquisa: z.string()
    .max(5000, 'Comentário deve ter no máximo 5000 caracteres')
    .optional()
    .nullable(),
  
  observacao: z.string()
    .max(1000, 'Observação deve ter no máximo 1000 caracteres')
    .optional()
    .nullable(),
  
  // Especialistas/Consultores
  especialistas_ids: z.array(z.string().uuid())
    .optional()
    .default([]),
  
  // Relacionamentos
  empresa_id: z.string().uuid().optional().nullable(),
  cliente_id: z.string().uuid().optional().nullable()
});

// Schema para pesquisas manuais (comentário e resposta obrigatórios)
export const PesquisaFormSchemaManual = PesquisaFormSchemaBase.extend({
  comentario_pesquisa: z.string()
    .min(1, 'Comentário é obrigatório para pesquisas manuais')
    .max(5000, 'Comentário deve ter no máximo 5000 caracteres'),
  
  resposta: z.string()
    .min(1, 'Resposta é obrigatória')
    .max(5000, 'Resposta deve ter no máximo 5000 caracteres')
});

// Schema principal - usa o base por padrão (para compatibilidade)
export const PesquisaFormSchema = PesquisaFormSchemaBase;

// Função para obter o schema correto baseado na origem
export function getPesquisaFormSchema(isManual: boolean = false) {
  return isManual ? PesquisaFormSchemaManual : PesquisaFormSchemaBase;
}

// ============================================
// SCHEMA DE FILTROS
// ============================================

export const filtrosPesquisasSchema = z.object({
  busca: z.string().optional(),
  origem: z.enum(['todos', 'sql_server', 'manual']).optional(),
  status: z.enum(['todos', 'pendente', 'enviado']).optional(),
  empresa: z.string().optional(),
  categoria: z.string().optional(),
  grupo: z.string().optional(),
  ano_abertura: z.number().int().min(2000).max(2100).optional(),
  mes_abertura: z.number().int().min(1).max(12).optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional()
});

// ============================================
// SCHEMA PARA SINCRONIZAÇÃO SQL SERVER
// ============================================

export const dadosSqlServerSchema = z.object({
  empresa: z.string().min(1),
  Categoria: z.string(),
  Grupo: z.string(),
  Cliente: z.string().min(1),
  Email_Cliente: z.string().email().or(z.literal('')),
  Prestador: z.string(),
  Nro_caso: z.string(),
  Tipo_Caso: z.string(),
  Ano_Abertura: z.number().int().min(2000).max(2100),
  Mes_abertura: z.number().int().min(1).max(12),
  Data_Resposta: z.date(),
  Resposta: z.string(),
  Comentario_Pesquisa: z.string(),
  id_unico: z.string().optional()
});

// ============================================
// TIPOS INFERIDOS
// ============================================

export type PesquisaFormInput = z.infer<typeof PesquisaFormSchema>;
export type FiltrosPesquisasInput = z.infer<typeof filtrosPesquisasSchema>;
export type DadosSqlServerInput = z.infer<typeof dadosSqlServerSchema>;
