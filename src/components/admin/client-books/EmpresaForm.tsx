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

import type {
  EmpresaFormData,
  Produto,
  GrupoResponsavel,
  TipoBook,
} from '@/types/clientBooks';
import {
  PRODUTOS_OPTIONS,
  STATUS_EMPRESA_OPTIONS,
  TIPO_BOOK_OPTIONS,
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
    .min(1, 'Link SharePoint é obrigatório')
    .url('Link deve ser uma URL válida'),
  templatePadrao: z.string().min(1, 'Template é obrigatório'),
  status: z.enum(['ativo', 'inativo', 'suspenso']),
  descricaoStatus: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  emailGestor: z
    .string()
    .min(1, 'E-mail do Customer Success é obrigatório')
    .email('E-mail deve ser válido'),
  produtos: z
    .array(z.enum(['CE_PLUS', 'FISCAL', 'GALLERY']))
    .min(1, 'Selecione pelo menos um produto'),
  grupos: z.array(z.string()).optional(),
  temAms: z.boolean().optional(),
  tipoBook: z.enum(['nao_tem_book', 'outros', 'qualidade'], {
    required_error: 'Tipo de Book é obrigatório'
  }).optional(),
  vigenciaInicial: z.string().optional(),
  vigenciaFinal: z.string().optional(),
  bookPersonalizado: z.boolean().optional(),
  anexo: z.boolean().optional(),
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

  const form = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      nomeCompleto: '',
      nomeAbreviado: '',
      linkSharepoint: '',
      templatePadrao: 'portugues',
      status: 'ativo',
      descricaoStatus: '',
      emailGestor: '',
      produtos: [],
      grupos: [],
      temAms: false,
      tipoBook: 'nao_tem_book',
      vigenciaInicial: '',
      vigenciaFinal: '',
      bookPersonalizado: false,
      anexo: false,
      ...initialData,
    } as EmpresaFormData,
  });

  const watchStatus = form.watch('status');
  const watchTipoBook = form.watch('tipoBook') as TipoBook;

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
        emailGestor: '',
        produtos: [],
        grupos: [],
        temAms: false,
        tipoBook: 'nao_tem_book',
        vigenciaInicial: '',
        vigenciaFinal: '',
        bookPersonalizado: false,
        anexo: false,
        ...initialData,
      } as EmpresaFormData);
    }
  }, [initialData, form]);

  const handleSubmit = async (data: EmpresaFormData) => {
    setIsSubmitting(true);
    try {
      // Normalizar dados antes do envio
      const normalizedData: EmpresaFormData = {
        ...data,
        nomeCompleto: data.nomeCompleto.trim(),
        nomeAbreviado: data.nomeAbreviado.trim(),
        linkSharepoint: data.linkSharepoint?.trim() || '',
        emailGestor: data.emailGestor?.toLowerCase().trim() || '',
        descricaoStatus: data.descricaoStatus?.trim() || '',
        produtos: data.produtos.map(p => p.toUpperCase() as Produto), // Normalizar produtos para uppercase
        grupos: data.grupos || [],
        temAms: data.temAms || false,
        tipoBook: data.tipoBook || 'nao_tem_book',
        vigenciaInicial: data.vigenciaInicial || '',
        vigenciaFinal: data.vigenciaFinal || '',
        bookPersonalizado: data.bookPersonalizado || false,
        anexo: data.anexo || false
      };

      await onSubmit(normalizedData);
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          {option.description && (
                            <span className="text-xs text-muted-foreground">
                              {option.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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
                <FormDescription>
                  Data de início da vigência do contrato
                </FormDescription>
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
                <FormDescription>
                  Data de fim da vigência. Empresa será inativada automaticamente após esta data
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Configurações Book */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tipoBook"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Book *</FormLabel>
                <Select
                  onValueChange={field.onChange}
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
        </div>

        {/* Opções do Book - só aparece quando Tipo de Book for "Qualidade" */}
        {watchTipoBook === 'qualidade' && (
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