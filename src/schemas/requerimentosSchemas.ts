import { z } from 'zod';

// Schema para validação do chamado (letras, números e hífen)
const chamadoSchema = z
  .string()
  .min(1, 'Chamado é obrigatório')
  .max(50, 'Chamado deve ter no máximo 50 caracteres')
  .regex(/^[A-Za-z0-9\-]+$/, 'Chamado deve conter apenas letras, números e hífen (ex: RF-6017993)');

// Schema para validação de módulo
const moduloSchema = z
  .enum(['Comex', 'Comply', 'Comply e-DOCS', 'Gallery', 'pw.SATI', 'pw.SPED', 'pw.SATI/pw.SPED'] as const, {
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

// Schema para validação de horas (suporta formato HH:MM e números decimais)
const horasSchema = z
  .union([
    // Aceita números (compatibilidade com formato antigo)
    z.number({
      invalid_type_error: 'Horas devem ser um número ou formato HH:MM'
    }).min(0, 'Horas não podem ser negativas').max(9999.99, 'Horas não podem exceder 9999.99'),
    
    // Aceita strings no formato HH:MM
    z.string().refine((val) => {
      if (!val || val.trim() === '') return true; // Vazio é válido (será 0)
      
      const valor = val.trim();
      
      // Formato HH:MM
      if (valor.includes(':')) {
        const regex = /^\d{1,4}:[0-5]?\d$/;
        if (!regex.test(valor)) return false;
        
        const [horasStr, minutosStr] = valor.split(':');
        const horas = parseInt(horasStr);
        const minutos = parseInt(minutosStr);
        
        return horas >= 0 && horas <= 9999 && minutos >= 0 && minutos < 60;
      }
      
      // Formato número (inteiro ou decimal)
      const numero = parseFloat(valor);
      return !isNaN(numero) && numero >= 0 && numero <= 9999.99;
    }, {
      message: 'Formato inválido. Use HH:MM (ex: 111:30) ou número (ex: 120 ou 120.5)'
    })
  ], {
    invalid_type_error: 'Horas devem ser um número ou formato HH:MM'
  });

// Schema para validação de mês/ano (formato MM/YYYY)
const mesCobrancaSchema = z
  .string({
    required_error: 'Mês de cobrança é obrigatório',
    invalid_type_error: 'Mês/ano deve ser uma string no formato MM/YYYY'
  })
  .regex(/^(0[1-9]|1[0-2])\/\d{4}$/, 'Formato deve ser MM/YYYY (ex: 09/2025)')
  .refine((val) => {
    const [mes, ano] = val.split('/').map(Number);
    const anoAtual = new Date().getFullYear();
    return ano >= anoAtual - 5 && ano <= anoAtual + 10;
  }, 'Ano deve estar entre 5 anos atrás e 10 anos à frente');

// Schema opcional para mês/ano (usado no formulário de criação)
const mesCobrancaOpcionalSchema = z
  .union([
    z.string().min(1).regex(/^(0[1-9]|1[0-2])\/\d{4}$/, 'Formato deve ser MM/YYYY (ex: 09/2025)').refine((val) => {
      const [mes, ano] = val.split('/').map(Number);
      const anoAtual = new Date().getFullYear();
      return ano >= anoAtual - 5 && ano <= anoAtual + 10;
    }, 'Ano deve estar entre 5 anos atrás e 10 anos à frente'),
    z.literal(''),
    z.undefined()
  ])
  .optional();

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
  linguagem: linguagemSchema, // Campo linguagem obrigatório
  descricao: descricaoSchema,
  data_envio: dataSchema,
  data_aprovacao: dataOpcionalSchema,
  horas_funcional: horasSchema,
  horas_tecnico: horasSchema,
  tipo_cobranca: tipoCobrancaSchema,
  mes_cobranca: mesCobrancaOpcionalSchema,
  observacao: observacaoSchema,
  // Campos de valor/hora (condicionais)
  valor_hora_funcional: valorHoraSchema,
  valor_hora_tecnico: valorHoraSchema,
  // Campos de ticket (para Banco de Horas - automático baseado na empresa)
  quantidade_tickets: z
    .union([
      z.string().transform((val) => {
        if (!val || val.trim() === '') return undefined;
        const num = parseInt(val, 10);
        if (isNaN(num)) throw new Error('Quantidade deve ser um número inteiro');
        return num;
      }),
      z.number().int('Quantidade deve ser um número inteiro'),
      z.undefined(),
      z.null()
    ])
    .optional()
    .refine((val) => val === undefined || val === null || (val >= 1 && val <= 9999), {
      message: 'Quantidade deve ser entre 1 e 9999'
    }),
  // Campo auxiliar para validação condicional de tickets (não será salvo no banco)
  empresa_tipo_cobranca: z.string().optional()
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
    // Converter horas para número para comparação
    const horasFuncionalNum = typeof data.horas_funcional === 'string' 
      ? parseFloat(data.horas_funcional) || 0 
      : data.horas_funcional || 0;
    const horasTecnicoNum = typeof data.horas_tecnico === 'string' 
      ? parseFloat(data.horas_tecnico) || 0 
      : data.horas_tecnico || 0;
    
    // Se tem horas funcionais, deve ter valor/hora funcional
    if (horasFuncionalNum > 0 && (!data.valor_hora_funcional || data.valor_hora_funcional <= 0)) {
      return false;
    }
    // Se tem horas técnicas, deve ter valor/hora técnico
    if (horasTecnicoNum > 0 && (!data.valor_hora_tecnico || data.valor_hora_tecnico <= 0)) {
      return false;
    }
  }
  return true;
}, {
  message: 'Para este tipo de cobrança, é obrigatório informar o valor/hora quando há horas correspondentes',
  path: ['valor_hora_funcional']
}).refine((data) => {
  // Validação customizada: quantidade_tickets obrigatória quando tipo_cobranca é "Banco de Horas" e empresa é do tipo "ticket"
  const tipoCobrancaBancoHoras = data.tipo_cobranca === 'Banco de Horas';
  const empresaTipoTicket = data.empresa_tipo_cobranca === 'ticket';
  const precisaTickets = tipoCobrancaBancoHoras && empresaTipoTicket;
  
  console.log('Validação de tickets:', {
    tipo_cobranca: data.tipo_cobranca,
    empresa_tipo_cobranca: data.empresa_tipo_cobranca,
    quantidade_tickets: data.quantidade_tickets,
    tipoCobrancaBancoHoras,
    empresaTipoTicket,
    precisaTickets
  });
  
  if (precisaTickets) {
    // Se precisa de tickets, o campo deve estar preenchido e ser maior que 0
    const temTicketsValidos = data.quantidade_tickets !== undefined && 
                             data.quantidade_tickets !== null && 
                             data.quantidade_tickets > 0;
    
    if (!temTicketsValidos) {
      console.log('Validação falhou: quantidade_tickets é obrigatória mas não foi preenchida');
      return false;
    }
  }
  return true;
}, {
  message: 'Quantidade de tickets é obrigatória para empresas com cobrança por ticket quando o tipo é "Banco de Horas"',
  path: ['quantidade_tickets']
});

// Schema para validação de filtros
export const filtrosRequerimentosSchema = z.object({
  busca: z.string().optional(),
  modulo: z.union([
    moduloSchema,
    z.array(moduloSchema)
  ]).optional(),
  status: z.enum(['lancado', 'enviado_faturamento', 'faturado']).optional(),
  tipo_cobranca: z.union([
    tipoCobrancaSchema,
    z.array(tipoCobrancaSchema)
  ]).optional(),
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

// Schema para validação no envio para faturamento (mes_cobranca obrigatório)
export const requerimentoFaturamentoSchema = z.object({
  chamado: chamadoSchema,
  cliente_id: z
    .string()
    .min(1, 'Cliente é obrigatório')
    .uuid('ID do cliente deve ser um UUID válido'),
  modulo: moduloSchema,
  descricao: descricaoSchema,
  data_envio: dataSchema,
  data_aprovacao: dataSchema, // Obrigatório para faturamento
  horas_funcional: horasSchema,
  horas_tecnico: horasSchema,
  tipo_cobranca: tipoCobrancaSchema,
  mes_cobranca: mesCobrancaSchema, // Obrigatório para faturamento
  observacao: observacaoSchema,
  // Campos de valor/hora (condicionais)
  valor_hora_funcional: valorHoraSchema,
  valor_hora_tecnico: valorHoraSchema,
  // Campos de ticket (para Banco de Horas - automático baseado na empresa)
  quantidade_tickets: z
    .union([
      z.string().transform((val) => {
        if (!val || val.trim() === '') return undefined;
        const num = parseInt(val, 10);
        if (isNaN(num)) throw new Error('Quantidade deve ser um número inteiro');
        return num;
      }),
      z.number().int('Quantidade deve ser um número inteiro'),
      z.undefined()
    ])
    .optional()
    .refine((val) => val === undefined || (val >= 1 && val <= 9999), {
      message: 'Quantidade deve ser entre 1 e 9999'
    })
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
    // Converter horas para número para comparação
    const horasFuncionalNum = typeof data.horas_funcional === 'string' 
      ? parseFloat(data.horas_funcional) || 0 
      : data.horas_funcional || 0;
    const horasTecnicoNum = typeof data.horas_tecnico === 'string' 
      ? parseFloat(data.horas_tecnico) || 0 
      : data.horas_tecnico || 0;
    
    // Se tem horas funcionais, deve ter valor/hora funcional
    if (horasFuncionalNum > 0 && (!data.valor_hora_funcional || data.valor_hora_funcional <= 0)) {
      return false;
    }
    // Se tem horas técnicas, deve ter valor/hora técnico
    if (horasTecnicoNum > 0 && (!data.valor_hora_tecnico || data.valor_hora_tecnico <= 0)) {
      return false;
    }
  }
  return true;
}, {
  message: 'Para este tipo de cobrança, é obrigatório informar o valor/hora quando há horas correspondentes',
  path: ['valor_hora_funcional']
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
export type RequerimentoFaturamentoData = z.infer<typeof requerimentoFaturamentoSchema>;
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

export const validarHoras = (horas: number | string): boolean => {
  return horasSchema.safeParse(horas).success;
};

export const validarMesCobranca = (mes: number): boolean => {
  // Converter número para formato MM/YYYY para validação
  const mesFormatado = mes.toString().padStart(2, '0');
  const anoAtual = new Date().getFullYear();
  const mesCobrancaString = `${mesFormatado}/${anoAtual}`;
  return mesCobrancaSchema.safeParse(mesCobrancaString).success;
};