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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Save, X } from 'lucide-react';
import { useBookTemplates } from '@/hooks/useBookTemplates';

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
    .url('Link deve ser uma URL válida')
    .optional()
    .or(z.literal('')),
  templatePadrao: z.string().min(1, 'Template é obrigatório'),
  status: z.enum(['ativo', 'inativo', 'suspenso']),
  descricaoStatus: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  emailGestor: z
    .string()
    .email('E-mail deve ser válido')
    .optional()
    .or(z.literal('')),
  produtos: z
    .array(z.enum(['CE_PLUS', 'FISCAL', 'GALLERY']))
    .min(1, 'Selecione pelo menos um produto'),
  grupos: z.array(z.string()).optional(),
  bookPersonalizado: z.boolean().optional(),
  anexo: z.boolean().optional(),
  vigenciaInicial: z
    .string()
    .optional()
    .or(z.literal('')),
  vigenciaFinal: z
    .string()
    .optional()
    .or(z.literal('')),
  temAms: z.boolean().optional(),
  tipoBook: z.enum(['nao_tem_book', 'qualidade', 'outros']).optional(),
}).refine((data) => {
  if (data.vigenciaInicial && data.vigenciaFinal) {
    return new Date(data.vigenciaFinal) >= new Date(data.vigenciaInicial);
  }
  return true;
}, {
  message: 'Vigência final deve ser posterior à vigência inicial',
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

  const form = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      nomeCompleto: '',
      nomeAbreviado: '',
      linkSharepoint: '',
      templatePadrao: '',
      status: 'ativo',
      descricaoStatus: '',
      emailGestor: '',
      produtos: [],
      grupos: [],
      bookPersonalizado: false,
      anexo: false,
      vigenciaInicial: '',
      vigenciaFinal: '',
      temAms: false,
      tipoBook: 'nao_tem_book',
      ...initialData,
    },
  });

  const watchStatus = form.watch('status');
  const watchTipoBook = form.watch('tipoBook');


  // Reset form quando initialData mudar
  useEffect(() => {
    if (initialData) {
      form.reset({
        nomeCompleto: '',
        nomeAbreviado: '',
        linkSharepoint: '',
        templatePadrao: '',
        status: 'ativo',
        descricaoStatus: '',
        emailGestor: '',
        produtos: [],
        grupos: [],
        bookPersonalizado: false,
        anexo: false,
        vigenciaInicial: '',
        vigenciaFinal: '',
        temAms: false,
        tipoBook: 'nao_tem_book',
        ...initialData,
      });
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
        produtos: data.produtos.map(p => p.toUpperCase() as any), // Normalizar produtos para uppercase
        grupos: data.grupos || [],
        bookPersonalizado: data.bookPersonalizado || false,
        anexo: data.anexo || false,
        vigenciaInicial: data.vigenciaInicial || undefined,
        vigenciaFinal: data.vigenciaFinal || undefined,
        temAms: data.temAms || false,
        tipoBook: data.tipoBook || 'nao_tem_book'
      };

      await onSubmit(normalizedData);
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProdutoChange = (produto: Produto, checked: boolean) => {
    const currentProdutos = form.getValues('produtos');
    if (checked) {
      form.setValue('produtos', [...currentProdutos, produto]);
    } else {
      form.setValue('produtos', currentProdutos.filter(p => p !== produto));
    }
  };

  const handleGrupoChange = (grupoId: string, checked: boolean) => {
    const currentGrupos = form.getValues('grupos') || [];
    if (checked) {
      form.setValue('grupos', [...currentGrupos, grupoId]);
    } else {
      form.setValue('grupos', currentGrupos.filter(g => g !== grupoId));
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
                      />
                    </FormControl>
                    <FormDescription>
                      Usado no assunto dos e-mails enviados
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="linkSharepoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link SharePoint</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://..."
                        {...field}
                        disabled={isSubmitting || isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Link da pasta do cliente no SharePoint
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emailGestor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail do Customer Success</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="gestor@empresa.com"
                        {...field}
                        disabled={isSubmitting || isLoading}
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

            {/* Configurações AMS e Book */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="temAms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Tem AMS?</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting || isLoading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

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
                    <FormDescription>
                      {field.value === 'qualidade' && 'Empresa aparecerá na tela Controle Disparos'}
                    </FormDescription>
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
                      />
                    </FormControl>
                    <FormDescription>
                      Obrigatório para status Inativo ou Suspenso
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Produtos Contratados */}
            <FormField
              control={form.control}
              name="produtos"
              render={() => (
                <FormItem>
                  <FormLabel>Produtos Contratados *</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* Vigência */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vigenciaInicial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vigência Inicial</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        disabled={isSubmitting || isLoading}
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
                        {...field}
                        type="date"
                        disabled={isSubmitting || isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Opções do Book - só aparece quando Tipo de Book for "Qualidade" */}
            {watchTipoBook === 'qualidade' && (
              <>
                <div className="flex w-full">
                  <FormLabel className="w-full">Opções do Book *</FormLabel>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bookPersonalizado"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSubmitting || isLoading}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Book Personalizado
                          </FormLabel>
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
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSubmitting || isLoading}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Permitir Anexos
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Grupos de Responsáveis */}
            {grupos.length > 0 && (
              <FormField
                control={form.control}
                name="grupos"
                render={() => (
                  <FormItem>
                    <FormLabel>Grupos de Responsáveis</FormLabel>
                    <FormDescription>
                      Grupos que receberão cópia dos e-mails enviados
                    </FormDescription>
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