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
import type {
  ClienteFormData,
  EmpresaCliente,
} from '@/types/clientBooksTypes';
import { STATUS_Cliente_OPTIONS } from '@/types/clientBooksTypes';

// Schema de validação com Zod
const clienteSchema = z.object({
  nomeCompleto: z
    .string()
    .min(2, 'Nome completo deve ter pelo menos 2 caracteres')
    .max(255, 'Nome completo deve ter no máximo 255 caracteres'),
  email: z
    .string()
    .email('E-mail deve ser válido')
    .max(255, 'E-mail deve ter no máximo 255 caracteres'),
  funcao: z
    .string()
    .max(100, 'Função deve ter no máximo 100 caracteres')
    .optional(),
  empresaId: z
    .string()
    .min(1, 'Empresa é obrigatória'),
  status: z.enum(['ativo', 'inativo']),
  descricaoStatus: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  principalContato: z.boolean(),
}).superRefine((data, ctx) => {
  // Se o status for inativo, a descrição é obrigatória
  if (data.status === 'inativo') {
    if (!data.descricaoStatus || data.descricaoStatus.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Justificativa é obrigatória quando o status for Inativo',
        path: ['descricaoStatus'],
      });
    }
  }
});

interface ClienteFormProps {
  initialData?: Partial<ClienteFormData>;
  empresas?: EmpresaCliente[];
  onSubmit: (data: ClienteFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  empresaIdPredefinida?: string; // Para quando vier de uma página específica de empresa
}

const ClienteForm: React.FC<ClienteFormProps> = ({
  initialData,
  empresas = [],
  onSubmit,
  onCancel,
  isLoading = false,
  mode,
  empresaIdPredefinida,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  // Preparar valores padrão
  const getDefaultValues = (): ClienteFormData => ({
    nomeCompleto: initialData?.nomeCompleto || '',
    email: initialData?.email || '',
    funcao: initialData?.funcao || '',
    empresaId: initialData?.empresaId || empresaIdPredefinida || '',
    status: initialData?.status || 'ativo',
    descricaoStatus: initialData?.descricaoStatus || '',
    principalContato: initialData?.principalContato || false,
  });

  const form = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: getDefaultValues(),
  });

  const watchStatus = form.watch('status');

  // Limpar descricaoStatus quando status mudar para ativo (apenas se não estiver inicializando)
  useEffect(() => {
    if (formInitialized && watchStatus === 'ativo') {
      form.setValue('descricaoStatus', '');
    }
  }, [watchStatus, form, formInitialized]);

  // Inicializar formulário apenas uma vez quando os dados iniciais estiverem disponíveis
  useEffect(() => {
    if (initialData && !formInitialized) {
      console.log('🔍 Inicializando formulário com dados:', initialData);

      const formData = {
        nomeCompleto: initialData.nomeCompleto || '',
        email: initialData.email || '',
        funcao: initialData.funcao || '',
        empresaId: initialData.empresaId || empresaIdPredefinida || '',
        status: initialData.status || 'ativo' as const,
        descricaoStatus: initialData.descricaoStatus || '',
        principalContato: initialData.principalContato || false,
      };
      console.log('🔍 Dados para inicialização:', formData);

      form.reset(formData);
      setFormInitialized(true);
    } else if (!initialData && !formInitialized) {
      // Para modo de criação, inicializar com valores padrão
      console.log('🔍 Inicializando formulário para criação');
      const defaultData = {
        nomeCompleto: '',
        email: '',
        funcao: '',
        empresaId: empresaIdPredefinida || '',
        status: 'ativo' as const,
        descricaoStatus: '',
        principalContato: false,
      };
      form.reset(defaultData);
      setFormInitialized(true);
    }
  }, [initialData, formInitialized, empresaIdPredefinida, form]);

  const handleSubmit = async (data: ClienteFormData) => {
    console.log('🔍 Dados do formulário antes do envio:', data);

    setIsSubmitting(true);
    try {
      // Normalizar dados antes do envio
      const normalizedData: ClienteFormData = {
        ...data,
        nomeCompleto: data.nomeCompleto.trim(),
        email: data.email.toLowerCase().trim(),
        funcao: data.funcao?.trim() || '',
        descricaoStatus: data.descricaoStatus?.trim() || ''
      };

      console.log('🔍 Dados normalizados para envio:', normalizedData);
      await onSubmit(normalizedData);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrar apenas empresas ativas para seleção
  const empresasAtivas = empresas.filter(empresa => empresa.status === 'ativo');

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
                    placeholder="Digite o nome completo"
                    {...field}
                    disabled={isSubmitting || isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail *</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="cliente@empresa.com"
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
            name="funcao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Função</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Gerente, Analista, Diretor"
                    {...field}
                    disabled={isSubmitting || isLoading}
                  />
                </FormControl>
                <FormDescription>
                  Cargo ou função do cliente na empresa
                </FormDescription>
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
                    {STATUS_Cliente_OPTIONS.map((option) => (
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

        {/* Empresa - só mostra se não estiver predefinida */}
        {!empresaIdPredefinida && (
          <FormField
            control={form.control}
            name="empresaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isSubmitting || isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {empresasAtivas.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nome_abreviado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Apenas empresas ativas são exibidas
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Principal Contato */}
        <FormField
          control={form.control}
          name="principalContato"
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
                <FormLabel>Principal Contato</FormLabel>
                <FormDescription>
                  Marque se este cliente é o principal contato da empresa
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {/* Descrição do Status - só aparece se status for inativo */}
        {watchStatus === 'inativo' && (
          <FormField
            control={form.control}
            name="descricaoStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Justificativa do Status *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descreva o motivo da inativação"
                    {...field}
                    disabled={isSubmitting || isLoading}
                    rows={3}
                  />
                </FormControl>
                <FormDescription>
                  Obrigatório para status Inativo
                </FormDescription>
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
                  ? 'Criar Cliente'
                  : 'Salvar Alterações'}
            </span>
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ClienteForm;