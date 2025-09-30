import { z } from 'zod';
import { 
  ModuloType, 
  LinguagemType, 
  TipoCobrancaType,
  MODULO_OPTIONS,
  LINGUAGEM_OPTIONS,
  TIPO_COBRANCA_OPTIONS
} from '@/types/requerimentos';

// Schema para validação do chamado (letras, números e hífen)
const chamadoSchema = z
  .string()
  .min(1, 'Chamado é obrigatório')
  .max(50, 'Chamado deve ter no máximo 50 caracteres')
  .regex(/^[A-Za-z0-9\-]+$/, 'Chamado deve conter apenas letras, números e hífen (ex: RF-6017993)');

// Schema para validação de módulo
const moduloSchema = z
  .enum(['Comply', 'Comply e-DOCS', 'pw.SATI', 'pw.SPED', 'pw.SATI/pw.SPED'] as const, {
    errorMap: () => ({ message: 'Selecione um módulo válido' })
  });

// Schema para validação de linguagem
const linguagemSchema = z
  .enum(['ABAP', 'DBA', 'Funcional', 'PL/SQL', 'Técnico'] as const, {
    errorMap: () => ({ message: 'Selecione uma linguagem válida' })
  });

// Schema para validação de tipo de cobrança
const tipoCobrancaSchema = z
  .enum([
    'Banco de Horas', 
    'Cobro Interno', 
    'Contrato', 
    'Faturado', 
    'Hora Extra', 
    'Sobreaviso', 
    'Reprovado', 
    'Bolsão Enel'
  ] as const, {
    errorMap: () => ({ message: 'Selecione um tipo de cobrança válido' })
  });

// Schema para validação de horas (números inteiros, permite valores acima de 100)
const horasSchema = z
  .number({
    required_error: 'Horas são obrigatórias',
    invalid_type_error: 'Horas devem ser um número'
  })
  .int('Horas devem ser um número inteiro')
  .min(0, 'Horas não podem ser negativas')
  .max(9999, 'Horas não podem exceder 9999');

// Schema para validação de mês (1-12)
const mesCobrancaSchema = z
  .number({
    required_error: 'Mês de cobrança é obrigatório',
    invalid_type_error: 'Mês deve ser um número'
  })
  .min(1, 'Mês deve ser entre 1 e 12')
  .max(12, 'Mês deve ser entre 1 e 12');

// Schema para validação de data
const dataSchema = z
  .string()
  .min(1, 'Data é obrigatória')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD');

// Schema para validação de data opcional (para data de aprovação)
const dataOpcionalSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
  .optional()
  .or(z.literal(''));

// Schema para validação de descrição (máximo 500 caracteres)
const descricaoSchema = z
  .string()
  .min(1, 'Descrição é obrigatória')
  .max(500, 'Descrição deve ter no máximo 500 caracteres');

// Schema para validação de observação (máximo 1000 caracteres)
const observacaoSchema = z
  .string()
  .max(1000, 'Observação deve ter no máximo 1000 caracteres')
  .optional();

// Schema para validação de valor/hora (valores monetários)
const valorHoraSchema = z
  .number({
    invalid_type_error: 'Valor deve ser um número'
  })
  .min(0, 'Valor não pode ser negativo')
  .max(99999.99, 'Valor não pode exceder R$ 99.999,99')
  .optional();

// Schema principal para formulário de requerimento
export const requerimentoFormSchema = z.object({
  chamado: chamadoSchema,
  cliente_id: z
    .string()
    .min(1, 'Cliente é obrigatório')
    .uuid('ID do cliente deve ser um UUID válido'),
  modulo: moduloSchema,
  descricao: descricaoSchema,
  data_envio: dataSchema,
  data_aprovacao: dataOpcionalSchema,
  horas_funcional: horasSchema,
  horas_tecnico: horasSchema,
  linguagem: linguagemSchema,
  tipo_cobranca: tipoCobrancaSchema,
  mes_cobranca: mesCobrancaSchema,
  observacao: observacaoSchema,
  // Campos de valor/hora (condicionais)
  valor_hora_funcional: valorHoraSchema,
  valor_hora_tecnico: valorHoraSchema
}).refine((data) => {
  // Validação customizada: data_aprovacao deve ser >= data_envio (se fornecida)
  if (data.data_aprovacao && data.data_aprovacao !== '') {
    const dataEnvio = new Date(data.data_envio);
    const dataAprovacao = new Date(data.data_aprovacao);
    return dataAprovacao >= dataEnvio;
  }
  return true;
}, {
  message: 'Data de aprovação deve ser igual ou posterior à data de envio',
  path: ['data_aprovacao']
}).refine((data) => {
  // Validação customizada: campos de valor/hora obrigatórios para tipos específicos
  const tiposComValorHora = ['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'];
  
  if (tiposComValorHora.includes(data.tipo_cobranca)) {
    // Se tem horas funcionais, deve ter valor/hora funcional
    if (data.horas_funcional > 0 && (!data.valor_hora_funcional || data.valor_hora_funcional <= 0)) {
      return false;
    }
    // Se tem horas técnicas, deve ter valor/hora técnico
    if (data.horas_tecnico > 0 && (!data.valor_hora_tecnico || data.valor_hora_tecnico <= 0)) {
      return false;
    }
  }
  return true;
}, {
  message: 'Para este tipo de cobrança, é obrigatório informar o valor/hora quando há horas correspondentes',
  path: ['valor_hora_funcional']
});

// Schema para validação de filtros
export const filtrosRequerimentosSchema = z.object({
  status: z.enum(['lancado', 'enviado_faturamento', 'faturado']).optional(),
  tipo_cobranca: tipoCobrancaSchema.optional(),
  mes_cobranca: mesCobrancaSchema.optional(),
  cliente_id: z.string().uuid().optional(),
  data_inicio: dataSchema.optional(),
  data_fim: dataSchema.optional()
}).refine((data) => {
  // Validação customizada: data_fim deve ser >= data_inicio
  if (data.data_inicio && data.data_fim) {
    const dataInicio = new Date(data.data_inicio);
    const dataFim = new Date(data.data_fim);
    return dataFim >= dataInicio;
  }
  return true;
}, {
  message: 'Data fim deve ser igual ou posterior à data início',
  path: ['data_fim']
});

// Schema para validação de email de faturamento
export const emailFaturamentoSchema = z.object({
  destinatarios: z
    .array(z.string().email('Email inválido'))
    .min(1, 'Pelo menos um destinatário é obrigatório')
    .max(10, 'Máximo de 10 destinatários permitidos'),
  assunto: z
    .string()
    .min(1, 'Assunto é obrigatório')
    .max(200, 'Assunto deve ter no máximo 200 caracteres'),
  corpo: z
    .string()
    .min(1, 'Corpo do email é obrigatório')
    .max(5000, 'Corpo do email deve ter no máximo 5000 caracteres'),
  anexos: z.array(z.any()).optional()
});

// Schema para validação de busca
export const buscaRequerimentosSchema = z.object({
  termo: z
    .string()
    .min(1, 'Termo de busca é obrigatório')
    .max(100, 'Termo de busca deve ter no máximo 100 caracteres'),
  campos: z
    .array(z.enum(['chamado', 'descricao', 'observacao', 'cliente_nome']))
    .min(1, 'Selecione pelo menos um campo para busca')
    .optional()
    .default(['chamado', 'descricao'])
});

// Tipos inferidos dos schemas
export type RequerimentoFormData = z.infer<typeof requerimentoFormSchema>;
export type FiltrosRequerimentosData = z.infer<typeof filtrosRequerimentosSchema>;
export type EmailFaturamentoData = z.infer<typeof emailFaturamentoSchema>;
export type BuscaRequerimentosData = z.infer<typeof buscaRequerimentosSchema>;

// Validadores auxiliares
export const validarChamado = (chamado: string): boolean => {
  return chamadoSchema.safeParse(chamado).success;
};

export const validarEmail = (email: string): boolean => {
  return z.string().email().safeParse(email).success;
};

export const validarHoras = (horas: number): boolean => {
  return horasSchema.safeParse(horas).success;
};

export const validarMesCobranca = (mes: number): boolean => {
  return mesCobrancaSchema.safeParse(mes).success;
};