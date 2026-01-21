/**
 * Schemas Zod para validação de formulários do Sistema de Gestão de Banco de Horas
 * 
 * Este arquivo contém todos os schemas de validação para:
 * - Parâmetros de contratos (empresas_clientes)
 * - Alocações internas
 * - Reajustes manuais
 * - Filtros e buscas
 * 
 * @module schemas/bancoHorasSchemas
 */

import { z } from 'zod';

// ============================================
// SCHEMAS BASE E UTILITÁRIOS
// ============================================

/**
 * Schema para validação de formato de tempo (HH:MM)
 * Aceita valores de 00:00 até 9999:59
 */
const timeFormatSchema = z
  .string()
  .regex(/^\d{1,4}:[0-5]\d$/, 'Formato deve ser HH:MM (ex: 160:00, 08:30)')
  .refine((val) => {
    const [horas, minutos] = val.split(':').map(Number);
    return horas >= 0 && horas <= 9999 && minutos >= 0 && minutos < 60;
  }, 'Horas devem estar entre 0 e 9999, minutos entre 0 e 59');

/**
 * Schema para validação de formato de data MM/YYYY
 */
const mesAnoFormatSchema = z
  .string()
  .regex(/^(0[1-9]|1[0-2])\/\d{4}$/, 'Formato deve ser MM/YYYY (ex: 01/2024)')
  .refine((val) => {
    const [mes, ano] = val.split('/').map(Number);
    const anoAtual = new Date().getFullYear();
    return ano >= 2020 && ano <= anoAtual + 10;
  }, 'Ano deve estar entre 2020 e 10 anos à frente');

/**
 * Schema para validação de UUID
 */
const uuidSchema = z
  .string()
  .uuid('ID deve ser um UUID válido');

/**
 * Schema para tipo de contrato
 */
const tipoContratoSchema = z.enum(['horas', 'tickets', 'ambos'], {
  errorMap: () => ({ message: 'Tipo de contrato deve ser horas, tickets ou ambos' })
});

// ============================================
// SCHEMA: PARÂMETROS DO CONTRATO
// ============================================

/**
 * Schema para validação de parâmetros do contrato (empresas_clientes)
 * 
 * Valida todos os campos necessários para configuração do banco de horas:
 * - Tipo de contrato (horas, tickets ou ambos)
 * - Período de apuração (1-12 meses)
 * - Baseline mensal (horas e/ou tickets)
 * - Configurações de repasse
 * 
 * Requirements: 2.1-2.11, 19.1-19.10
 */
export const parametrosContratoSchema = z.object({
  // Identificação
  id: uuidSchema.optional(),
  
  // Tipo de contrato (obrigatório)
  tipo_contrato: tipoContratoSchema,
  
  // Período de apuração (1-12 meses) - Requirements 2.3, 19.3
  periodo_apuracao: z
    .number({
      required_error: 'Período de apuração é obrigatório',
      invalid_type_error: 'Período de apuração deve ser um número'
    })
    .int('Período de apuração deve ser um número inteiro')
    .min(1, 'Período de apuração deve ser no mínimo 1 mês')
    .max(12, 'Período de apuração deve ser no máximo 12 meses'),
  
  // Início da vigência (MM/YYYY) - Requirements 2.4
  inicio_vigencia: mesAnoFormatSchema,
  
  // Baseline de horas mensal (HH:MM) - Requirements 2.5, 19.1
  baseline_horas_mensal: timeFormatSchema
    .optional()
    .or(z.literal('')),
  
  // Baseline de tickets mensal (decimal com 2 casas) - Requirements 2.6, 19.2
  baseline_tickets_mensal: z
    .number({
      invalid_type_error: 'Baseline de tickets deve ser um número'
    })
    .min(0, 'Baseline de tickets não pode ser negativo')
    .max(99999.99, 'Baseline de tickets não pode exceder 99.999,99')
    .multipleOf(0.01, 'Baseline de tickets deve ter no máximo 2 casas decimais')
    .optional()
    .or(z.literal(null)),
  
  // Repasse especial - Requirements 2.7
  possui_repasse_especial: z
    .boolean({
      required_error: 'Configuração de repasse especial é obrigatória',
      invalid_type_error: 'Repasse especial deve ser verdadeiro ou falso'
    }),
  
  // Ciclos para zerar (quando possui_repasse_especial = true) - Requirements 2.8
  ciclos_para_zerar: z
    .number({
      required_error: 'Ciclos para zerar é obrigatório',
      invalid_type_error: 'Ciclos para zerar deve ser um número'
    })
    .int('Ciclos para zerar deve ser um número inteiro')
    .min(1, 'Ciclos para zerar deve ser no mínimo 1')
    .max(12, 'Ciclos para zerar deve ser no máximo 12'),
  
  // Percentual de repasse mensal (0-100%) - Requirements 2.9, 19.4
  percentual_repasse_mensal: z
    .number({
      required_error: 'Percentual de repasse mensal é obrigatório',
      invalid_type_error: 'Percentual de repasse mensal deve ser um número'
    })
    .int('Percentual de repasse mensal deve ser um número inteiro')
    .min(0, 'Percentual de repasse mensal deve ser no mínimo 0%')
    .max(100, 'Percentual de repasse mensal deve ser no máximo 100%'),
  
  // Ciclo atual (controle interno)
  ciclo_atual: z
    .number()
    .int()
    .min(1)
    .default(1)
    .optional()
}).refine((data) => {
  // Validação: Se tipo_contrato inclui 'horas', baseline_horas_mensal é obrigatório
  if ((data.tipo_contrato === 'horas' || data.tipo_contrato === 'ambos') && 
      (!data.baseline_horas_mensal || data.baseline_horas_mensal === '')) {
    return false;
  }
  return true;
}, {
  message: 'Baseline de horas mensal é obrigatório quando tipo de contrato é "horas" ou "ambos"',
  path: ['baseline_horas_mensal']
}).refine((data) => {
  // Validação: Se tipo_contrato inclui 'tickets', baseline_tickets_mensal é obrigatório
  if ((data.tipo_contrato === 'tickets' || data.tipo_contrato === 'ambos') && 
      (data.baseline_tickets_mensal === undefined || data.baseline_tickets_mensal === null)) {
    return false;
  }
  return true;
}, {
  message: 'Baseline de tickets mensal é obrigatório quando tipo de contrato é "tickets" ou "ambos"',
  path: ['baseline_tickets_mensal']
});

// ============================================
// SCHEMA: ALOCAÇÕES
// ============================================

/**
 * Schema para validação de uma alocação individual
 * 
 * Requirements: 3.1-3.4
 */
export const alocacaoSchema = z.object({
  // Identificação
  id: uuidSchema.optional(),
  empresa_id: uuidSchema,
  
  // Nome da alocação (obrigatório)
  nome_alocacao: z
    .string({
      required_error: 'Nome da alocação é obrigatório',
      invalid_type_error: 'Nome da alocação deve ser um texto'
    })
    .min(1, 'Nome da alocação é obrigatório')
    .max(255, 'Nome da alocação deve ter no máximo 255 caracteres')
    .trim(),
  
  // Percentual do baseline (1-100%) - Requirements 3.2, 3.3
  percentual_baseline: z
    .number({
      required_error: 'Percentual do baseline é obrigatório',
      invalid_type_error: 'Percentual do baseline deve ser um número'
    })
    .int('Percentual do baseline deve ser um número inteiro')
    .min(1, 'Percentual do baseline deve ser no mínimo 1%')
    .max(100, 'Percentual do baseline deve ser no máximo 100%'),
  
  // Status
  ativo: z.boolean().default(true).optional()
});

/**
 * Schema para validação de múltiplas alocações
 * Valida que a soma dos percentuais seja exatamente 100%
 * 
 * Requirements: 3.3, 3.4
 */
export const alocacoesArraySchema = z
  .array(alocacaoSchema)
  .min(1, 'Pelo menos uma alocação deve ser criada')
  .max(20, 'No máximo 20 alocações podem ser criadas')
  .refine((alocacoes) => {
    // Validação: Soma dos percentuais deve ser exatamente 100%
    const somaPercentuais = alocacoes
      .filter(a => a.ativo !== false)
      .reduce((acc, alocacao) => acc + alocacao.percentual_baseline, 0);
    return somaPercentuais === 100;
  }, {
    message: 'A soma dos percentuais de todas as alocações ativas deve ser exatamente 100%'
  })
  .refine((alocacoes) => {
    // Validação: Nomes de alocações devem ser únicos
    const nomesAtivos = alocacoes
      .filter(a => a.ativo !== false)
      .map(a => a.nome_alocacao.toLowerCase().trim());
    const nomesUnicos = new Set(nomesAtivos);
    return nomesAtivos.length === nomesUnicos.size;
  }, {
    message: 'Não é possível ter alocações com nomes duplicados'
  });

// ============================================
// SCHEMA: REAJUSTES MANUAIS
// ============================================

/**
 * Schema para validação de reajuste manual
 * 
 * Requirements: 9.1-9.11, 13.1
 */
export const bancoHorasReajusteSchema = z.object({
  // Identificação
  id: uuidSchema.optional(),
  calculo_id: uuidSchema,
  empresa_id: uuidSchema,
  
  // Período do reajuste
  mes: z
    .number()
    .int('Mês deve ser um número inteiro')
    .min(1, 'Mês deve estar entre 1 e 12')
    .max(12, 'Mês deve estar entre 1 e 12'),
  
  ano: z
    .number()
    .int('Ano deve ser um número inteiro')
    .min(2020, 'Ano deve ser maior ou igual a 2020')
    .max(2050, 'Ano deve ser menor ou igual a 2050'),
  
  // Valores do reajuste (pelo menos um deve ser preenchido)
  valor_reajuste_horas: timeFormatSchema
    .optional()
    .or(z.literal('')),
  
  valor_reajuste_tickets: z
    .number()
    .min(0, 'Valor de reajuste de tickets não pode ser negativo')
    .max(99999.99, 'Valor de reajuste de tickets não pode exceder 99.999,99')
    .multipleOf(0.01, 'Valor de reajuste de tickets deve ter no máximo 2 casas decimais')
    .optional()
    .or(z.literal(null)),
  
  // Tipo de reajuste (calculado automaticamente)
  tipo_reajuste: z.enum(['positivo', 'negativo'], {
    errorMap: () => ({ message: 'Tipo de reajuste deve ser positivo ou negativo' })
  }).optional(),
  
  // Observação privada (obrigatória, mínimo 10 caracteres) - Requirements 9.2, 9.3, 9.11, 13.1
  observacao_privada: z
    .string({
      required_error: 'Observação privada é obrigatória',
      invalid_type_error: 'Observação privada deve ser um texto'
    })
    .min(10, 'Observação privada deve ter no mínimo 10 caracteres')
    .max(1000, 'Observação privada deve ter no máximo 1000 caracteres')
    .trim(),
  
  // Status
  ativo: z.boolean().default(true).optional()
}).refine((data) => {
  // Validação: Pelo menos um valor de reajuste deve ser preenchido
  const temHoras = data.valor_reajuste_horas && data.valor_reajuste_horas !== '';
  const temTickets = data.valor_reajuste_tickets !== undefined && 
                     data.valor_reajuste_tickets !== null;
  return temHoras || temTickets;
}, {
  message: 'Pelo menos um valor de reajuste (horas ou tickets) deve ser preenchido',
  path: ['valor_reajuste_horas']
});

// ============================================
// SCHEMA: FILTROS
// ============================================

/**
 * Schema para validação de filtros de banco de horas
 */
export const filtrosBancoHorasSchema = z.object({
  // Filtro por empresa
  empresa_id: uuidSchema.optional(),
  
  // Filtro por período
  mes: z
    .number()
    .int()
    .min(1)
    .max(12)
    .optional(),
  
  ano: z
    .number()
    .int()
    .min(2020)
    .max(2050)
    .optional(),
  
  // Filtro por tipo de contrato
  tipo_contrato: tipoContratoSchema.optional(),
  
  // Filtro por status
  possui_excedentes: z.boolean().optional(),
  
  // Busca textual
  busca: z
    .string()
    .max(255, 'Busca deve ter no máximo 255 caracteres')
    .optional()
});

/**
 * Schema para validação de período (mês/ano)
 */
export const periodoSchema = z.object({
  mes: z
    .number({
      required_error: 'Mês é obrigatório',
      invalid_type_error: 'Mês deve ser um número'
    })
    .int('Mês deve ser um número inteiro')
    .min(1, 'Mês deve estar entre 1 e 12')
    .max(12, 'Mês deve estar entre 1 e 12'),
  
  ano: z
    .number({
      required_error: 'Ano é obrigatório',
      invalid_type_error: 'Ano deve ser um número'
    })
    .int('Ano deve ser um número inteiro')
    .min(2020, 'Ano deve ser maior ou igual a 2020')
    .max(2050, 'Ano deve ser menor ou igual a 2050')
});

// ============================================
// TIPOS INFERIDOS
// ============================================

/**
 * Tipos TypeScript inferidos dos schemas Zod
 */
export type ParametrosContratoFormData = z.infer<typeof parametrosContratoSchema>;
export type AlocacaoFormData = z.infer<typeof alocacaoSchema>;
export type AlocacoesArrayFormData = z.infer<typeof alocacoesArraySchema>;
export type BancoHorasReajusteFormData = z.infer<typeof bancoHorasReajusteSchema>;
export type FiltrosBancoHorasData = z.infer<typeof filtrosBancoHorasSchema>;
export type PeriodoData = z.infer<typeof periodoSchema>;

// ============================================
// UTILITÁRIOS DE VALIDAÇÃO
// ============================================

/**
 * Utilitários para validação de dados do banco de horas
 */
export const bancoHorasValidationUtils = {
  /**
   * Valida se um formato de tempo (HH:MM) é válido
   */
  isValidTimeFormat: (time: string): boolean => {
    return timeFormatSchema.safeParse(time).success;
  },

  /**
   * Valida se um formato de mês/ano (MM/YYYY) é válido
   */
  isValidMesAnoFormat: (mesAno: string): boolean => {
    return mesAnoFormatSchema.safeParse(mesAno).success;
  },

  /**
   * Valida se a soma de percentuais de alocações é 100%
   */
  isSomaPercentuaisValida: (alocacoes: AlocacaoFormData[]): boolean => {
    const soma = alocacoes
      .filter(a => a.ativo !== false)
      .reduce((acc, alocacao) => acc + alocacao.percentual_baseline, 0);
    return soma === 100;
  },

  /**
   * Valida se um período de apuração está dentro do range permitido
   */
  isPeriodoApuracaoValido: (periodo: number): boolean => {
    return periodo >= 1 && periodo <= 12;
  },

  /**
   * Valida se um percentual de repasse está dentro do range permitido
   */
  isPercentualRepasseValido: (percentual: number): boolean => {
    return percentual >= 0 && percentual <= 100;
  },

  /**
   * Valida se uma observação privada tem o tamanho mínimo
   */
  isObservacaoPrivadaValida: (observacao: string): boolean => {
    return observacao.trim().length >= 10;
  },

  /**
   * Converte formato de tempo (HH:MM) para minutos
   */
  timeToMinutes: (time: string): number => {
    const [horas, minutos] = time.split(':').map(Number);
    return horas * 60 + minutos;
  },

  /**
   * Converte minutos para formato de tempo (HH:MM)
   */
  minutesToTime: (minutes: number): string => {
    const horas = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  },

  /**
   * Valida se um UUID é válido
   */
  isValidUUID: (id: string): boolean => {
    return uuidSchema.safeParse(id).success;
  }
};
