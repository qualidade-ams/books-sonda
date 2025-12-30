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

import { Save, X } from 'lucide-react';
import { useBookTemplates } from '@/hooks/useBookTemplates';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { inativarTaxasCliente } from '@/services/taxasClientesService';

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
});

interface EmpresaFormProps {
  initialData?: Partial<EmpresaFormData>;
  grupos?: GrupoResponsavel[];
  onSubmit: (data: EmpresaFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

const EmpresaForm: React.FC<EmpresaFormProps> = ({
  initialData,
  grupos = [],
  onSubmit,
  onCancel,
  isLoading = false,
  mode,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { bookTemplateOptions, loading: templatesLoading } = useBookTemplates();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      ...initialData,
    } as EmpresaFormData,
  });

  const watchStatus = form.watch('status');
  const watchTipoBook = form.watch('tipoBook') as TipoBook;
  const watchTemAms = form.watch('temAms');

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
        ...initialData,
      } as EmpresaFormData);
    }
  }, [initialData, form]);

  const handleSubmit = async (data: EmpresaFormData) => {
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
        observacao: data.observacao?.trim() || ''
      };

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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Informações Básicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nomeCompleto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Digite o nome completo da empresa"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    disabled={isSubmitting || isLoading}
                    className={form.formState.errors.nomeCompleto ? 'border-red-500 focus:border-red-500' : ''}
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
                <FormLabel>Nome Abreviado *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nome para uso no assunto dos e-mails"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    disabled={isSubmitting || isLoading}
                    className={form.formState.errors.nomeAbreviado ? 'border-red-500 focus:border-red-500' : ''}
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
                <FormLabel>Tem AMS? *</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === 'true')}
                  value={field.value ? 'true' : 'false'}
                  disabled={isSubmitting || isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
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
                <FormLabel>Status *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isSubmitting || isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
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
                <FormLabel>Justificativa do Status *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descreva o motivo da alteração do status"
                    {...field}
                    disabled={isSubmitting || isLoading}
                    rows={3}
                    className={form.formState.errors.descricaoStatus ? 'border-red-500 focus:border-red-500' : ''}
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
              <FormLabel>Em Projeto</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === 'true')}
                value={field.value ? 'true' : 'false'}
                disabled={isSubmitting || isLoading}
              >
                <FormControl>
                  <SelectTrigger>
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
              <FormLabel>E-mail do Customer Success *</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="gestor@sonda.com"
                  {...field}
                  disabled={isSubmitting || isLoading}
                  className={form.formState.errors.emailGestor ? 'border-red-500 focus:border-red-500' : ''}
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
                <FormLabel>Vigência Inicial</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    disabled={isSubmitting || isLoading}
                    className={form.formState.errors.vigenciaInicial ? 'border-red-500 focus:border-red-500' : ''}
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
                <FormLabel>Vigência Final</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    disabled={isSubmitting || isLoading}
                    className={form.formState.errors.vigenciaFinal ? 'border-red-500 focus:border-red-500' : ''}
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
                    <FormLabel>Tipo de Book *</FormLabel>
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
                      disabled={isSubmitting || isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
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
                      <FormLabel>Template Padrão *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting || isLoading || templatesLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
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
                      <FormLabel>Link SharePoint *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://..."
                          {...field}
                          disabled={isSubmitting || isLoading}
                          className={form.formState.errors.linkSharepoint ? 'border-red-500 focus:border-red-500' : ''}
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
                            disabled={isSubmitting || isLoading}
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
                            disabled={isSubmitting || isLoading}
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
                              disabled={isSubmitting || isLoading}
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
                  <FormLabel className={form.formState.errors.produtos ? 'text-red-500' : ''}>Produtos Contratados *</FormLabel>
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
                            disabled={isSubmitting || isLoading}
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
                    <FormLabel>Grupos de Responsáveis</FormLabel>
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
                              disabled={isSubmitting || isLoading}
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
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Digite observações gerais sobre a empresa (máximo 500 caracteres)"
                  {...field}
                  disabled={isSubmitting || isLoading}
                  rows={4}
                  maxLength={500}
                  className={form.formState.errors.observacao ? 'border-red-500 focus:border-red-500' : ''}
                />
              </FormControl>
              <FormDescription>
                {field.value?.length || 0}/500 caracteres
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
            <span>Cancelar</span>
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isLoading}
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
        </div>
      </form>
    </Form>
  );
};

export default EmpresaForm;