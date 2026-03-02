import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { Save, X, FileText, Info } from 'lucide-react';
import { useBookTemplates } from '@/hooks/useBookTemplates';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { inativarTaxasCliente } from '@/services/taxasClientesService';
import { SegmentacaoBaselineForm } from './SegmentacaoBaselineForm';
import SecaoBaselineComHistorico from './SecaoBaselineComHistorico';
import SecaoPercentualRepasseComHistorico from './SecaoPercentualRepasseComHistorico';

import type {
  EmpresaFormData,
  Produto,
  GrupoResponsavel,
  TipoBook,
  TipoCobranca,
} from '@/types/clientBooks';
import {
  PRODUTOS_OPTIONS,
  STATUS_EMPRESA_OPTIONS,
  TIPO_BOOK_OPTIONS,
  TIPO_COBRANCA_OPTIONS,
} from '@/types/clientBooks';
import { Card, CardContent } from '@/components/ui/card';
import { parametrosContratoSchema } from '@/schemas/bancoHorasSchemas';

// Schema de validação com Zod
const empresaSchema = z.object({
  nomeCompleto: z
    .string()
    .min(2, 'Nome completo deve ter pelo menos 2 caracteres')
    .max(255, 'Nome completo deve ter no máximo 255 caracteres'),
  nomeAbreviado: z
    .string()
    .min(1, 'Nome abreviado é obrigatório')
    .max(100, 'Nome abreviado deve ter no máximo 100 caracteres'),
  linkSharepoint: z
    .string()
    .optional(),
  templatePadrao: z.string().optional(),
  status: z.enum(['ativo', 'inativo', 'suspenso']),
  descricaoStatus: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  emProjeto: z.boolean().optional(), // NOVO: Campo Em Projeto
  emailGestor: z
    .string()
    .min(1, 'E-mail do Customer Success é obrigatório')
    .email('E-mail deve ser válido'),
  produtos: z
    .array(z.enum(['COMEX', 'FISCAL', 'GALLERY']))
    .min(1, 'Selecione pelo menos um produto'),
  grupos: z.array(z.string()).optional(),
  temAms: z.boolean().optional(),
  tipoBook: z.enum(['nao_tem_book', 'outros', 'qualidade']).optional(),
  tipoCobranca: z.enum(['banco_horas', 'ticket', 'outros']).optional(),
  vigenciaInicial: z.string().optional(),
  vigenciaFinal: z.string().optional(),
  bookPersonalizado: z.boolean().optional(),
  anexo: z.boolean().optional(),
  observacao: z.string().max(500, 'Observação deve ter no máximo 500 caracteres').optional(),
  
  // NOVO: Parâmetros de Banco de Horas
  tipo_contrato: z.enum(['horas', 'tickets', 'ambos']).optional(),
  periodo_apuracao: z.number().int().min(1).max(12).optional(),
  inicio_vigencia_banco_horas: z.string().optional(),
  baseline_horas_mensal: z.string().optional(),
  baseline_tickets_mensal: z.number().min(0).max(99999.99).optional(),
  possui_repasse_especial: z.boolean().optional(),
  tipo_repasse_especial: z.enum(['simples', 'por_periodo']).optional(),
  ciclos_para_zerar: z.number().int().min(1).max(12).optional(),
  percentual_repasse_mensal: z.number().int().min(0).max(100).optional(),
  percentual_repasse_especial: z.number().int().min(0).max(100).optional(),
  // NOVO: Configuração de repasse por período
  duracao_periodo_meses: z.number().int().min(1).max(12).optional(),
  percentual_dentro_periodo: z.number().int().min(0).max(100).optional(),
  percentual_entre_periodos: z.number().int().min(0).max(100).optional(),
  periodos_ate_zerar: z.number().int().min(1).max(12).optional(),
  
  // NOVO: Campos de Meta SLA
  meta_sla_percentual: z.number().min(0).max(100).optional(),
  quantidade_minima_chamados_sla: z.number().int().min(0).optional(),
  
  // NOVO: Segmentação de Baseline
  baselineSegmentado: z.boolean().optional(),
  segmentacaoConfig: z.object({
    empresas: z.array(z.object({
      nome: z.string().min(1, 'Nome da empresa é obrigatório'),
      percentual: z.number().min(0).max(100),
      filtro_tipo: z.enum(['contem', 'nao_contem', 'igual', 'diferente', 'comeca_com', 'termina_com']),
      filtro_valor: z.string().min(1, 'Valor do filtro é obrigatório'),
      ordem: z.number().int().min(1),
    }))
  }).optional(),
}).refine((data) => {
  // Validação condicional para descrição do status
  if ((data.status === 'inativo' || data.status === 'suspenso') && !data.descricaoStatus?.trim()) {
    return false;
  }
  return true;
}, {
  message: 'Justificativa do status é obrigatória para status Inativo ou Suspenso',
  path: ['descricaoStatus'],
}).refine((data) => {
  // Validação das vigências
  if (data.vigenciaInicial && data.vigenciaFinal) {
    const inicial = new Date(data.vigenciaInicial);
    const final = new Date(data.vigenciaFinal);
    return inicial <= final;
  }
  return true;
}, {
  message: 'A vigência inicial não pode ser posterior à vigência final',
  path: ['vigenciaFinal'],
}).refine((data) => {
  // Validação condicional para Template Padrão quando Tem AMS for true E Tipo de Book não for "nao_tem_book"
  if (data.temAms && data.tipoBook !== 'nao_tem_book' && (!data.templatePadrao || !data.templatePadrao.trim())) {
    return false;
  }
  return true;
}, {
  message: 'Template Padrão é obrigatório quando a empresa tem AMS e possui book',
  path: ['templatePadrao'],
}).refine((data) => {
  // Validação condicional para Tipo de Cobrança quando Tem AMS for true
  if (data.temAms && !data.tipoCobranca) {
    return false;
  }
  return true;
}, {
  message: 'Tipo de Cobrança é obrigatório quando a empresa tem AMS',
  path: ['tipoCobranca'],
}).refine((data) => {
  // Validação condicional para Tipo de Book quando Tem AMS for true
  if (data.temAms && !data.tipoBook) {
    return false;
  }
  return true;
}, {
  message: 'Tipo de Book é obrigatório quando a empresa tem AMS',
  path: ['tipoBook'],
}).refine((data) => {
  // Validação condicional para Link SharePoint quando Tem AMS for true E Tipo de Book não for "nao_tem_book"
  if (data.temAms && data.tipoBook !== 'nao_tem_book' && (!data.linkSharepoint || !data.linkSharepoint.trim())) {
    return false;
  }
  return true;
}, {
  message: 'Link SharePoint é obrigatório quando a empresa tem AMS e possui book',
  path: ['linkSharepoint'],
}).refine((data) => {
  // Validação de URL para Link SharePoint quando preenchido
  if (data.linkSharepoint && data.linkSharepoint.trim()) {
    try {
      new URL(data.linkSharepoint);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}, {
  message: 'Link SharePoint deve ser uma URL válida',
  path: ['linkSharepoint'],
}).refine((data) => {
  // Validação condicional: Se tipo_contrato inclui 'horas', baseline_horas_mensal é obrigatório
  if ((data.tipo_contrato === 'horas' || data.tipo_contrato === 'ambos') && 
      (!data.baseline_horas_mensal || data.baseline_horas_mensal === '')) {
    return false;
  }
  return true;
}, {
  message: 'Baseline de horas mensal é obrigatório quando tipo de contrato é "horas" ou "ambos"',
  path: ['baseline_horas_mensal']
}).refine((data) => {
  // Validação condicional: Se tipo_contrato inclui 'tickets', baseline_tickets_mensal é obrigatório
  if ((data.tipo_contrato === 'tickets' || data.tipo_contrato === 'ambos') && 
      (data.baseline_tickets_mensal === undefined || data.baseline_tickets_mensal === null)) {
    return false;
  }
  return true;
}, {
  message: 'Baseline de tickets mensal é obrigatório quando tipo de contrato é "tickets" ou "ambos"',
  path: ['baseline_tickets_mensal']
}).refine((data) => {
  // Validação de formato de tempo (HH:MM) para baseline_horas_mensal
  if (data.baseline_horas_mensal && data.baseline_horas_mensal !== '') {
    const timeRegex = /^\d{1,4}:[0-5]\d$/;
    if (!timeRegex.test(data.baseline_horas_mensal)) {
      return false;
    }
    const [horas, minutos] = data.baseline_horas_mensal.split(':').map(Number);
    return horas >= 0 && horas <= 9999 && minutos >= 0 && minutos < 60;
  }
  return true;
}, {
  message: 'Formato deve ser HH:MM (ex: 160:00, 08:30)',
  path: ['baseline_horas_mensal']
}).refine((data) => {
  // Validação de formato MM/YYYY para inicio_vigencia_banco_horas
  if (data.inicio_vigencia_banco_horas && data.inicio_vigencia_banco_horas !== '') {
    const mesAnoRegex = /^(0[1-9]|1[0-2])\/\d{4}$/;
    if (!mesAnoRegex.test(data.inicio_vigencia_banco_horas)) {
      return false;
    }
    const [mes, ano] = data.inicio_vigencia_banco_horas.split('/').map(Number);
    const anoAtual = new Date().getFullYear();
    return ano >= 2020 && ano <= anoAtual + 10;
  }
  return true;
}, {
  message: 'Formato deve ser MM/YYYY (ex: 01/2024)',
  path: ['inicio_vigencia_banco_horas']
}).refine((data) => {
  // Validação: Se baseline_segmentado está ativo, segmentacao_config é obrigatório
  if (data.baselineSegmentado && (!data.segmentacaoConfig || !data.segmentacaoConfig.empresas || data.segmentacaoConfig.empresas.length < 2)) {
    return false;
  }
  return true;
}, {
  message: 'Configure pelo menos 2 empresas para segmentação quando baseline segmentado estiver ativo',
  path: ['segmentacaoConfig']
}).refine((data) => {
  // Validação: Se baseline_segmentado está ativo, soma dos percentuais deve ser 100%
  if (data.baselineSegmentado && data.segmentacaoConfig?.empresas) {
    const totalPercentual = data.segmentacaoConfig.empresas.reduce((total, empresa) => total + (empresa.percentual || 0), 0);
    return totalPercentual === 100;
  }
  return true;
}, {
  message: 'A soma dos percentuais das empresas segmentadas deve ser exatamente 100%',
  path: ['segmentacaoConfig']
});

interface EmpresaFormProps {
  initialData?: Partial<EmpresaFormData>;
  grupos?: GrupoResponsavel[];
  onSubmit: (data: EmpresaFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit' | 'view';
  empresaId?: string; // ID da empresa para gerenciamento de histórico
}

const EmpresaForm: React.FC<EmpresaFormProps> = ({
  initialData,
  grupos = [],
  onSubmit,
  onCancel,
  isLoading = false,
  mode,
  empresaId,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('informacoes');
  
  const { bookTemplateOptions, loading: templatesLoading } = useBookTemplates();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Desabilitar todos os campos quando estiver no modo view
  const isViewMode = mode === 'view';
  const isFieldDisabled = isSubmitting || isLoading || isViewMode;

  const form = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      nomeCompleto: '',
      nomeAbreviado: '',
      linkSharepoint: '',
      templatePadrao: 'portugues',
      status: 'ativo',
      descricaoStatus: '',
      emProjeto: false, // NOVO: Campo Em Projeto - padrão false
      emailGestor: '',
      produtos: [],
      grupos: [],
      temAms: false,
      tipoBook: 'nao_tem_book',
      tipoCobranca: 'banco_horas',
      vigenciaInicial: '',
      vigenciaFinal: '',
      bookPersonalizado: false,
      anexo: false,
      observacao: '',
      // NOVO: Parâmetros de Banco de Horas - valores padrão
      tipo_contrato: undefined,
      periodo_apuracao: undefined,
      inicio_vigencia_banco_horas: '',
      baseline_horas_mensal: '00:00',
      baseline_tickets_mensal: undefined,
      possui_repasse_especial: false,
      tipo_repasse_especial: 'simples',
      ciclos_para_zerar: 1,
      percentual_repasse_mensal: 0,
      percentual_repasse_especial: 0,
      // NOVO: Configuração de repasse por período
      duracao_periodo_meses: 3,
      percentual_dentro_periodo: 100,
      percentual_entre_periodos: 70,
      periodos_ate_zerar: 2,
      // NOVO: Campos de Meta SLA - valores padrão
      meta_sla_percentual: undefined,
      quantidade_minima_chamados_sla: undefined,
      baselineSegmentado: false,
      segmentacaoConfig: undefined,
      ...initialData,
    } as EmpresaFormData,
  });

  const watchStatus = form.watch('status');
  const watchTipoBook = form.watch('tipoBook') as TipoBook;
  const watchTemAms = form.watch('temAms');
  const watchTipoContrato = form.watch('tipo_contrato');

  // Reset form quando initialData mudar
  useEffect(() => {
    if (initialData) {
      form.reset({
        nomeCompleto: '',
        nomeAbreviado: '',
        linkSharepoint: '',
        templatePadrao: 'portugues',
        status: 'ativo',
        descricaoStatus: '',
        emProjeto: false, // NOVO: Campo Em Projeto - padrão false
        emailGestor: '',
        produtos: [],
        grupos: [],
        temAms: false,
        tipoBook: 'nao_tem_book',
        tipoCobranca: 'banco_horas',
        vigenciaInicial: '',
        vigenciaFinal: '',
        bookPersonalizado: false,
        anexo: false,
        observacao: '',
        // NOVO: Parâmetros de Banco de Horas - valores padrão
        tipo_contrato: undefined,
        periodo_apuracao: undefined,
        inicio_vigencia_banco_horas: '',
        baseline_horas_mensal: '00:00',
        baseline_tickets_mensal: undefined,
        possui_repasse_especial: false,
        tipo_repasse_especial: 'simples',
        ciclos_para_zerar: 1,
        percentual_repasse_mensal: 0,
        percentual_repasse_especial: 0,
        // NOVO: Configuração de repasse por período
        duracao_periodo_meses: 3,
        percentual_dentro_periodo: 100,
        percentual_entre_periodos: 70,
        periodos_ate_zerar: 2,
        // NOVO: Campos de Meta SLA - valores padrão
        meta_sla_percentual: undefined,
        quantidade_minima_chamados_sla: undefined,
        baselineSegmentado: false,
        segmentacaoConfig: undefined,
        ...initialData,
      } as EmpresaFormData);
    }
  }, [initialData, form]);

  const handleSubmit = async (data: EmpresaFormData) => {
    // Não fazer nada se estiver no modo view
    if (isViewMode) {
      onCancel();
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Verificar se o status está sendo alterado para inativo
      const statusAnterior = initialData?.status;
      const statusAtual = data.status;
      const statusMudouParaInativo = mode === 'edit' && statusAnterior === 'ativo' && statusAtual === 'inativo';
      
      console.log('🔍 Debug status empresa:', {
        mode,
        statusAnterior,
        statusAtual,
        statusMudouParaInativo,
        empresaId: initialData?.id,
        empresaIdFromData: data.id,
        nomeEmpresa: data.nomeAbreviado,
        initialDataCompleto: initialData
      });

      // Normalizar dados antes do envio (excluir id do payload)
      const { id, ...dataWithoutId } = data;
      
      console.log('🔍 Debug dados de segmentação:', {
        baselineSegmentado: data.baselineSegmentado,
        segmentacaoConfig: data.segmentacaoConfig,
        empresasSegmentadas: data.segmentacaoConfig?.empresas?.length || 0
      });
      
      const normalizedData: EmpresaFormData = {
        ...dataWithoutId,
        nomeCompleto: data.nomeCompleto.trim(),
        nomeAbreviado: data.nomeAbreviado.trim(),
        linkSharepoint: data.temAms && data.tipoBook !== 'nao_tem_book' ? (data.linkSharepoint?.trim() || '') : '',
        templatePadrao: data.temAms && data.tipoBook !== 'nao_tem_book' ? (data.templatePadrao || 'portugues') : '',
        emailGestor: data.emailGestor?.toLowerCase().trim() || '',
        descricaoStatus: data.descricaoStatus?.trim() || '',
        emProjeto: data.emProjeto || false, // NOVO: Campo Em Projeto
        produtos: data.produtos.map(p => p.toUpperCase() as Produto), // Normalizar produtos para uppercase
        grupos: data.grupos || [],
        temAms: data.temAms || false,
        tipoBook: data.temAms ? (data.tipoBook || 'nao_tem_book') : 'nao_tem_book',
        tipoCobranca: data.temAms ? (data.tipoCobranca || 'banco_horas') : 'banco_horas',
        vigenciaInicial: data.vigenciaInicial || '',
        vigenciaFinal: data.vigenciaFinal || '',
        bookPersonalizado: data.temAms ? (data.bookPersonalizado || false) : false,
        anexo: data.temAms ? (data.anexo || false) : false,
        observacao: data.observacao?.trim() || '',
        // NOVO: Campos de Meta SLA
        meta_sla_percentual: data.meta_sla_percentual,
        quantidade_minima_chamados_sla: data.quantidade_minima_chamados_sla,
        // NOVO: Campos de Segmentação de Baseline
        baselineSegmentado: data.baselineSegmentado || false,
        segmentacaoConfig: data.segmentacaoConfig || undefined
      };
      
      console.log('📤 Dados normalizados para envio:', {
        baselineSegmentado: normalizedData.baselineSegmentado,
        segmentacaoConfig: normalizedData.segmentacaoConfig
      });

      // Salvar a empresa primeiro
      await onSubmit(normalizedData);

      // Se o status foi alterado para inativo, inativar as taxas automaticamente
      if (statusMudouParaInativo && initialData?.id) {
        console.log(`🚀 Iniciando inativação de taxas para empresa ${data.nomeAbreviado} (ID: ${initialData.id})`);
        try {
          await inativarTaxasCliente(initialData.id);
          console.log(`✅ Taxas inativadas com sucesso para empresa ${data.nomeAbreviado}`);
          
          // Invalidar cache das taxas e empresas para forçar atualização da interface
          queryClient.invalidateQueries({ queryKey: ['taxas'] });
          queryClient.invalidateQueries({ queryKey: ['empresas'] });
          console.log(`🔄 Cache das taxas e empresas invalidado para atualização da interface`);
          
          toast({
            title: "Empresa atualizada",
            description: "Empresa inativada com sucesso. As taxas vinculadas também foram inativadas automaticamente.",
            variant: "default",
          });
        } catch (taxaError) {
          console.error('❌ Erro ao inativar taxas da empresa:', taxaError);
          toast({
            title: "Aviso",
            description: "Empresa inativada, mas houve um problema ao inativar as taxas automaticamente. Verifique as taxas manualmente.",
            variant: "destructive",
          });
        }
      } else {
        console.log('ℹ️ Não é necessário inativar taxas:', {
          statusMudouParaInativo,
          temId: !!initialData?.id
        });
      }
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);

      // Verificar se é erro de nome duplicado
      if (error instanceof Error) {
        if (error.message.includes('Já existe uma empresa com o nome')) {
          // Definir erro específico no campo nome completo
          form.setError('nomeCompleto', {
            type: 'manual',
            message: error.message
          });
        } else if (error.message.includes('nome abreviado')) {
          // Definir erro específico no campo nome abreviado
          form.setError('nomeAbreviado', {
            type: 'manual',
            message: error.message
          });
        } else {
          // Erro genérico - mostrar toast
          toast({
            title: "Erro ao salvar empresa",
            description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
            variant: "destructive",
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProdutoChange = (produto: Produto, checked: boolean) => {
    const currentProdutos = form.getValues('produtos');
    if (checked) {
      form.setValue('produtos', [...currentProdutos, produto], { shouldValidate: true });
    } else {
      form.setValue('produtos', currentProdutos.filter(p => p !== produto), { shouldValidate: true });
    }
  };

  const handleGrupoChange = (grupoId: string, checked: boolean) => {
    const currentGrupos = form.getValues('grupos') || [];
    if (checked) {
      form.setValue('grupos', [...currentGrupos, grupoId], { shouldValidate: true });
    } else {
      form.setValue('grupos', currentGrupos.filter(g => g !== grupoId), { shouldValidate: true });
    }
  };

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Tabs de Navegação */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-gray-100 p-1 rounded-lg">
            <TabsTrigger 
              value="informacoes"
              className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
            >
              Informações Principais
            </TabsTrigger>
            <TabsTrigger 
              value="parametros"
              className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
            >
              Parâmetros Book
            </TabsTrigger>
          </TabsList>

          {/* Tab: Informações Principais */}
          <TabsContent value="informacoes" className="mt-4 space-y-6">
        {/* Informações Básicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nomeCompleto"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Nome Completo *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Digite o nome completo da empresa"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    disabled={isFieldDisabled}
                    className={form.formState.errors.nomeCompleto ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nomeAbreviado"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Nome Abreviado *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nome para uso no assunto dos e-mails"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    disabled={isFieldDisabled}
                    className={form.formState.errors.nomeAbreviado ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="temAms"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Tem AMS? *</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === 'true')}
                  value={field.value ? 'true' : 'false'}
                  disabled={isFieldDisabled}
                >
                  <FormControl>
                    <SelectTrigger className={form.formState.errors.temAms ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}>
                      <SelectValue placeholder="Selecione uma opção" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Status *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isFieldDisabled}
                >
                  <FormControl>
                    <SelectTrigger className={form.formState.errors.status ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATUS_EMPRESA_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Descrição do Status - só aparece se status for inativo ou suspenso */}
        {(watchStatus === 'inativo' || watchStatus === 'suspenso') && (
          <FormField
            control={form.control}
            name="descricaoStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Justificativa do Status *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descreva o motivo da alteração do status"
                    {...field}
                    disabled={isFieldDisabled}
                    rows={3}
                    className={form.formState.errors.descricaoStatus ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Campo Em Projeto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="emProjeto"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">Em Projeto</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === 'true')}
                value={field.value ? 'true' : 'false'}
                disabled={isFieldDisabled}
              >
                <FormControl>
                  <SelectTrigger className={form.formState.errors.emProjeto ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}>
                    <SelectValue placeholder="Selecione uma opção" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="false">Não</SelectItem>
                  <SelectItem value="true">Sim</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* E-mail do Customer Success - aparece sempre */}
        <FormField
          control={form.control}
          name="emailGestor"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">E-mail do Customer Success *</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="gestor@sonda.com"
                  {...field}
                  disabled={isFieldDisabled}
                  className={form.formState.errors.emailGestor ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        </div>
        
        {/* Vigência do Contrato */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vigenciaInicial"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Vigência Inicial</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    disabled={isFieldDisabled}
                    className={form.formState.errors.vigenciaInicial ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vigenciaFinal"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Vigência Final</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    disabled={isFieldDisabled}
                    className={form.formState.errors.vigenciaFinal ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Configurações Book - só aparece quando Tem AMS for Sim */}
        {watchTemAms && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipoBook"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Tipo de Book *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Limpar o Link SharePoint e Template Padrão quando Tipo de Book for "Não tem Book"
                        if (value === 'nao_tem_book') {
                          form.setValue('linkSharepoint', '');
                          form.setValue('templatePadrao', '');
                        }
                      }}
                      value={field.value}
                      disabled={isFieldDisabled}
                    >
                      <FormControl>
                        <SelectTrigger className={form.formState.errors.tipoBook ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIPO_BOOK_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Template Padrão - só aparece quando Tipo de Book não for "Não tem Book" */}
              {watchTipoBook !== 'nao_tem_book' && (
                <FormField
                  control={form.control}
                  name="templatePadrao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Template Padrão *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isFieldDisabled || templatesLoading}
                      >
                        <FormControl>
                          <SelectTrigger className={form.formState.errors.templatePadrao ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}>
                            <SelectValue placeholder="Selecione o template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bookTemplateOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex flex-col">
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Link SharePoint - só aparece quando Tem AMS for Sim E Tipo de Book não for "Não tem Book" */}
            {watchTipoBook !== 'nao_tem_book' && (
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="linkSharepoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Link SharePoint *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://..."
                          {...field}
                          disabled={isFieldDisabled}
                          className={form.formState.errors.linkSharepoint ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        )}

        {/* Opções do Book - só aparece quando Tem AMS for Sim E Tipo de Book for "Qualidade" */}
        {watchTemAms && watchTipoBook === 'qualidade' && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <FormLabel className="text-base font-semibold">Opções do Book</FormLabel>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bookPersonalizado"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            disabled={isFieldDisabled}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Book Personalizado
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Empresa possui template de book personalizado
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="anexo"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            disabled={isFieldDisabled}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Anexo
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Incluir anexos no envio do book
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tipo de Cobrança - só aparece quando Tem AMS for Sim */}
        {watchTemAms && (
          <Card>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="tipoCobranca"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Tipo de Cobrança *</FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      {TIPO_COBRANCA_OPTIONS.map((option) => (
                        <FormItem
                          key={option.value}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <input
                              type="radio"
                              name="tipoCobranca"
                              value={option.value}
                              checked={field.value === option.value}
                              onChange={() => field.onChange(option.value)}
                              disabled={isFieldDisabled}
                              className="mt-1"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="font-normal cursor-pointer">
                              {option.label}
                            </FormLabel>
                            <FormDescription className="text-xs">
                              {option.value === 'banco_horas' 
                                ? 'Cliente utiliza sistema de banco de horas'
                                : option.value === 'ticket'
                                ? 'Cliente utiliza sistema de tickets'
                                : 'Outros tipos de cobrança'
                              }
                            </FormDescription>
                          </div>
                        </FormItem>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Produtos Contratados */}
        <Card>
          <CardContent>
            <FormField
              control={form.control}
              name="produtos"
              render={() => (
                <FormItem>
                  <FormLabel className={form.formState.errors.produtos ? 'text-sm font-medium text-red-500' : 'text-sm font-medium text-gray-700'}>Produtos Contratados *</FormLabel>
                  <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${form.formState.errors.produtos ? 'border border-red-500 rounded-md p-3' : ''}`}>
                    {PRODUTOS_OPTIONS.map((produto) => (
                      <FormItem
                        key={produto.value}
                        className="flex flex-row items-start space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={form.watch('produtos')?.includes(produto.value as Produto)}
                            onCheckedChange={(checked) =>
                              handleProdutoChange(produto.value as Produto, checked as boolean)
                            }
                            disabled={isFieldDisabled}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {produto.label}
                        </FormLabel>
                      </FormItem>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Grupos de Responsáveis */}
        <Card>
          <CardContent>
            {grupos.length > 0 && (
              <FormField
                control={form.control}
                name="grupos"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Grupos de Responsáveis</FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {grupos.map((grupo) => (
                        <FormItem
                          key={grupo.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={form.watch('grupos')?.includes(grupo.id)}
                              onCheckedChange={(checked) =>
                                handleGrupoChange(grupo.id, checked as boolean)
                              }
                              disabled={isFieldDisabled}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="font-normal">
                              {grupo.nome}
                            </FormLabel>
                            {grupo.descricao && (
                              <FormDescription className="text-xs">
                                {grupo.descricao}
                              </FormDescription>
                            )}
                          </div>
                        </FormItem>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Observações */}
        <FormField
          control={form.control}
          name="observacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Digite observações gerais sobre a empresa (máximo 500 caracteres)"
                  {...field}
                  disabled={isFieldDisabled}
                  rows={4}
                  maxLength={500}
                  className={form.formState.errors.observacao ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}
                />
              </FormControl>
              <FormDescription>
                {field.value?.length || 0}/500 caracteres
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        </TabsContent>

          {/* Tab: Parâmetros Book */}
          <TabsContent value="parametros" className="mt-4 space-y-6">
            {/* Tipo de Contrato */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo_contrato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Tipo de Contrato
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isFieldDisabled}
                    >
                      <FormControl>
                        <SelectTrigger className={form.formState.errors.tipo_contrato ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}>
                          <SelectValue placeholder="Selecione o tipo de contrato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="horas">Horas</SelectItem>
                        <SelectItem value="tickets">Tickets</SelectItem>
                        <SelectItem value="ambos">Ambos</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="periodo_apuracao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Período de Apuração (meses)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1 a 12 meses"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            field.onChange(undefined);
                            return;
                          }
                          const numValue = parseInt(value);
                          // Validar entre 1 e 12
                          if (numValue >= 1 && numValue <= 12) {
                            field.onChange(numValue);
                          } else if (numValue > 12) {
                            field.onChange(12);
                            e.target.value = '12';
                          } else if (numValue < 1) {
                            field.onChange(1);
                            e.target.value = '1';
                          }
                        }}
                        onBlur={(e) => {
                          // Garantir valor válido ao sair do campo
                          const value = e.target.value;
                          if (value !== '' && (parseInt(value) < 1 || parseInt(value) > 12)) {
                            field.onChange(1);
                            e.target.value = '1';
                          }
                        }}
                        value={field.value || ''}
                        disabled={isFieldDisabled}
                        min={1}
                        max={12}
                        className={form.formState.errors.periodo_apuracao ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="inicio_vigencia_banco_horas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Início da Vigência
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="MM/YYYY (ex: 01/2024)"
                        {...field}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
                          
                          // Limitar a 6 dígitos (MMYYYY)
                          if (value.length > 6) {
                            value = value.slice(0, 6);
                          }
                          
                          // Aplicar máscara MM/YYYY
                          if (value.length >= 2) {
                            const mes = value.slice(0, 2);
                            const ano = value.slice(2);
                            
                            // Validar mês (01-12)
                            let mesValidado = parseInt(mes);
                            if (mesValidado > 12) {
                              mesValidado = 12;
                            } else if (mesValidado < 1 && mes.length === 2) {
                              mesValidado = 1;
                            }
                            
                            const mesFormatado = mesValidado.toString().padStart(2, '0');
                            value = ano ? `${mesFormatado}/${ano}` : mesFormatado;
                          }
                          
                          field.onChange(value);
                        }}
                        onBlur={(e) => {
                          // Validar formato completo ao sair do campo
                          const value = e.target.value;
                          if (value && value.length > 0 && value.length < 7) {
                            // Se não está completo, limpar
                            field.onChange('');
                          }
                        }}
                        disabled={isFieldDisabled}
                        maxLength={7}
                        className={form.formState.errors.inicio_vigencia_banco_horas ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Campos de Meta SLA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="meta_sla_percentual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Meta SLA (%)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0 a 100%"
                        step="0.01"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            field.onChange(undefined);
                            return;
                          }
                          const numValue = parseFloat(value);
                          // Validar entre 0 e 100
                          if (numValue >= 0 && numValue <= 100) {
                            field.onChange(numValue);
                          } else if (numValue > 100) {
                            field.onChange(100);
                            e.target.value = '100';
                          } else if (numValue < 0) {
                            field.onChange(0);
                            e.target.value = '0';
                          }
                        }}
                        onBlur={(e) => {
                          // Garantir valor válido ao sair do campo
                          const value = e.target.value;
                          if (value !== '' && (parseFloat(value) < 0 || parseFloat(value) > 100)) {
                            field.onChange(undefined);
                            e.target.value = '';
                          }
                        }}
                        value={field.value ?? ''}
                        disabled={isFieldDisabled}
                        min={0}
                        max={100}
                        className={form.formState.errors.meta_sla_percentual ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantidade_minima_chamados_sla"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Quantidade Mínima de Chamados SLA
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Número inteiro >= 0"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            field.onChange(undefined);
                            return;
                          }
                          const numValue = parseInt(value);
                          // Validar >= 0
                          if (numValue >= 0) {
                            field.onChange(numValue);
                          } else {
                            field.onChange(0);
                            e.target.value = '0';
                          }
                        }}
                        onBlur={(e) => {
                          // Garantir valor válido ao sair do campo
                          const value = e.target.value;
                          if (value !== '' && parseInt(value) < 0) {
                            field.onChange(undefined);
                            e.target.value = '';
                          }
                        }}
                        value={field.value ?? ''}
                        disabled={isFieldDisabled}
                        min={0}
                        className={form.formState.errors.quantidade_minima_chamados_sla ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Seção de Percentual de Repasse com Histórico */}
            <SecaoPercentualRepasseComHistorico
              empresaId={empresaId}
              empresaNome={form.getValues('nomeAbreviado') || ''}
              disabled={isFieldDisabled}
            />

            {/* Baseline - Campos condicionais baseados no tipo de contrato */}
            {/* CARD ANTIGO REMOVIDO - Agora usa apenas SecaoBaselineComHistorico */}

            {/* Histórico de Baseline - Aparece para TODOS os tipos de contrato se empresa já foi salva */}
            {watchTipoContrato && initialData?.id && (
              <SecaoBaselineComHistorico
                empresaId={initialData.id}
                empresaNome={form.watch('nome_completo')}
                tipoContrato={watchTipoContrato as 'horas' | 'tickets' | 'ambos'}
                disabled={isFieldDisabled}
              />
            )}

            {/* Configurações de Repasse */}
            <Card>
              <CardContent className="pt-6">
                <FormLabel className="text-base font-semibold mb-4 block">Configurações de Repasse</FormLabel>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="possui_repasse_especial"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            disabled={isFieldDisabled}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Possui Repasse Especial
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Se marcado, o saldo positivo ao final do período será repassado para o próximo período
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Campos de Repasse Especial - Só aparecem se checkbox marcado */}
                  {form.watch('possui_repasse_especial') && (
                    <div className="space-y-4 pt-4 border-t">
                      {/* Tipo de Repasse Especial */}
                      <FormField
                        control={form.control}
                        name="tipo_repasse_especial"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Tipo de Repasse Especial
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || 'simples'}
                              disabled={isFieldDisabled}
                            >
                              <FormControl>
                                <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="simples">Simples</SelectItem>
                                <SelectItem value="por_periodo">Por Período</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs">
                              {field.value === 'simples' 
                                ? 'Aplica o mesmo percentual de repasse a cada ciclo'
                                : 'Permite configurar percentuais diferentes dentro do período e entre períodos'}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Configuração Simples */}
                      {form.watch('tipo_repasse_especial') === 'simples' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="ciclos_para_zerar"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">
                                  Ciclos para Zerar
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="1 a 12 ciclos"
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                    value={field.value || ''}
                                    disabled={isFieldDisabled}
                                    min={1}
                                    max={12}
                                    className={form.formState.errors.ciclos_para_zerar ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Quantidade de ciclos até zerar o saldo
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="percentual_repasse_especial"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">
                                  Percentual de Repasse (%)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0 a 100%"
                                    {...field}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === '') {
                                        field.onChange(0);
                                        return;
                                      }
                                      const numValue = parseInt(value);
                                      if (numValue >= 0 && numValue <= 100) {
                                        field.onChange(numValue);
                                      } else if (numValue > 100) {
                                        field.onChange(100);
                                        e.target.value = '100';
                                      } else if (numValue < 0) {
                                        field.onChange(0);
                                        e.target.value = '0';
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const value = e.target.value;
                                      if (value === '' || parseInt(value) < 0 || parseInt(value) > 100) {
                                        field.onChange(0);
                                        e.target.value = '0';
                                      }
                                    }}
                                    value={field.value ?? 0}
                                    disabled={isFieldDisabled}
                                    min={0}
                                    max={100}
                                    className={form.formState.errors.percentual_repasse_especial ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:ring-sonda-blue focus:border-sonda-blue'}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Percentual do saldo repassado a cada ciclo
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {/* Configuração Por Período */}
                      {form.watch('tipo_repasse_especial') === 'por_periodo' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="duracao_periodo_meses"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">
                                  Duração do Período (meses)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Ex: 3 (trimestral)"
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                    value={field.value || ''}
                                    disabled={isFieldDisabled}
                                    min={1}
                                    max={12}
                                    className="focus:ring-sonda-blue focus:border-sonda-blue"
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Quantidade de meses em cada período
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="periodos_ate_zerar"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">
                                  Períodos até Zerar
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Ex: 2 (semestral)"
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                    value={field.value || ''}
                                    disabled={isFieldDisabled}
                                    min={1}
                                    max={12}
                                    className="focus:ring-sonda-blue focus:border-sonda-blue"
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Quantidade de períodos até zerar o saldo
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="percentual_dentro_periodo"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">
                                  % Repasse Dentro do Período
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Ex: 100%"
                                    {...field}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === '') {
                                        field.onChange(100);
                                        return;
                                      }
                                      const numValue = parseInt(value);
                                      if (numValue >= 0 && numValue <= 100) {
                                        field.onChange(numValue);
                                      }
                                    }}
                                    value={field.value ?? 100}
                                    disabled={isFieldDisabled}
                                    min={0}
                                    max={100}
                                    className="focus:ring-sonda-blue focus:border-sonda-blue"
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Repasse entre meses do mesmo período
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="percentual_entre_periodos"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">
                                  % Repasse Entre Períodos
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Ex: 70%"
                                    {...field}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === '') {
                                        field.onChange(70);
                                        return;
                                      }
                                      const numValue = parseInt(value);
                                      if (numValue >= 0 && numValue <= 100) {
                                        field.onChange(numValue);
                                      }
                                    }}
                                    value={field.value ?? 70}
                                    disabled={isFieldDisabled}
                                    min={0}
                                    max={100}
                                    className="focus:ring-sonda-blue focus:border-sonda-blue"
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Repasse ao mudar de período
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Segmentação de Baseline */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <FormLabel className="text-base font-semibold">Segmentação de Baseline</FormLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="text-sm">
                          <strong>Como funciona:</strong> Configure pelo menos 2 empresas que dividirão o baseline.
                          Para cada empresa, defina o percentual e o filtro que será aplicado ao campo item_configuracao
                          dos registros de banco de horas. A soma dos percentuais deve totalizar 100%.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <SegmentacaoBaselineForm 
                  form={form} 
                  isFieldDisabled={isFieldDisabled} 
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Botões de Ação */}
        <div className="flex justify-end space-x-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting || isLoading}
            className="flex items-center space-x-2"
          >
            <X className="h-4 w-4" />
            <span>{mode === 'view' ? 'Fechar' : 'Cancelar'}</span>
          </Button>
          {mode !== 'view' && (
            <Button
              type="submit"
              disabled={isFieldDisabled}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>
                {isSubmitting
                  ? 'Salvando...'
                  : mode === 'create'
                    ? 'Criar Empresa'
                    : 'Salvar Alterações'}
              </span>
            </Button>
          )}
        </div>
      </form>
    </Form>
    </>
  );
};

export default EmpresaForm;