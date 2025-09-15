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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, X } from 'lucide-react';
import type {
  ColaboradorFormData,
  StatusColaborador,
  EmpresaCliente,
} from '@/types/clientBooksTypes';
import { STATUS_COLABORADOR_OPTIONS } from '@/types/clientBooksTypes';

// Schema de validação com Zod
const colaboradorSchema = z.object({
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
});

interface ColaboradorFormProps {
  initialData?: Partial<ColaboradorFormData>;
  empresas?: EmpresaCliente[];
  onSubmit: (data: ColaboradorFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  empresaIdPredefinida?: string; // Para quando vier de uma página específica de empresa
}

const ColaboradorForm: React.FC<ColaboradorFormProps> = ({
  initialData,
  empresas = [],
  onSubmit,
  onCancel,
  isLoading = false,
  mode,
  empresaIdPredefinida,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ColaboradorFormData>({
    resolver: zodResolver(colaboradorSchema),
    defaultValues: {
      nomeCompleto: '',
      email: '',
      funcao: '',
      empresaId: empresaIdPredefinida || '',
      status: 'ativo',
      descricaoStatus: '',
      principalContato: false,
      ...initialData,
    },
  });

  const watchStatus = form.watch('status');

  // Reset form quando initialData mudar
  useEffect(() => {
    if (initialData) {
      form.reset({
        nomeCompleto: '',
        email: '',
        funcao: '',
        empresaId: empresaIdPredefinida || '',
        status: 'ativo',
        descricaoStatus: '',
        principalContato: false,
        ...initialData,
      });
    }
  }, [initialData, form, empresaIdPredefinida]);

  const handleSubmit = async (data: ColaboradorFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Erro ao salvar colaborador:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrar apenas empresas ativas para seleção
  const empresasAtivas = empresas.filter(empresa => empresa.status === 'ativo');

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Novo Colaborador' : 'Editar Colaborador'}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                        placeholder="colaborador@empresa.com"
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
                      Cargo ou função do colaborador na empresa
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
                      defaultValue={field.value}
                      disabled={isSubmitting || isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_COLABORADOR_OPTIONS.map((option) => (
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
                      defaultValue={field.value}
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
                            {empresa.nome_completo}
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
                      Marque se este colaborador é o principal contato da empresa
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
                    ? 'Criar Colaborador'
                    : 'Salvar Alterações'}
                </span>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ColaboradorForm;