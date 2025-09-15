import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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

import { Save, X, Plus, Trash2 } from 'lucide-react';
import type { GrupoFormData, GrupoEmailFormData } from '@/types/clientBooks';

// Schema de validação com Zod
const grupoEmailSchema = z.object({
  email: z
    .string()
    .email('E-mail deve ser válido')
    .max(255, 'E-mail deve ter no máximo 255 caracteres'),
  nome: z
    .string()
    .max(255, 'Nome deve ter no máximo 255 caracteres')
    .optional(),
});

const grupoSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  descricao: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  emails: z
    .array(grupoEmailSchema)
    .min(1, 'Adicione pelo menos um e-mail ao grupo'),
});

interface GrupoFormProps {
  initialData?: Partial<GrupoFormData>;
  onSubmit: (data: GrupoFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

const GrupoForm: React.FC<GrupoFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GrupoFormData>({
    resolver: zodResolver(grupoSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      emails: [{ email: '', nome: '' }],
      ...initialData,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'emails',
  });

  // Reset form quando initialData mudar
  useEffect(() => {
    if (initialData) {
      form.reset({
        nome: '',
        descricao: '',
        emails: initialData.emails && initialData.emails.length > 0 
          ? initialData.emails 
          : [{ email: '', nome: '' }],
        ...initialData,
      });
    }
  }, [initialData, form]);

  const handleSubmit = async (data: GrupoFormData) => {
    setIsSubmitting(true);
    try {
      // Normalizar e filtrar dados antes de enviar
      const emailsFiltrados = data.emails
        .filter(email => email.email.trim() !== '')
        .map(email => ({
          email: email.email.toLowerCase().trim(),
          nome: email.nome?.trim() || ''
        }));
      
      const normalizedData: GrupoFormData = {
        nome: data.nome.trim(),
        descricao: data.descricao?.trim() || '',
        emails: emailsFiltrados,
      };
      
      await onSubmit(normalizedData);
    } catch (error) {
      console.error('Erro ao salvar grupo:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const adicionarEmail = () => {
    append({ email: '', nome: '' });
  };

  const removerEmail = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Informações Básicas */}
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Grupo *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: CE Plus, Fiscal, Gallery, Outros - Emails"
                      {...field}
                      disabled={isSubmitting || isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Nome identificador do grupo de responsáveis
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o propósito deste grupo (opcional)"
                      {...field}
                      disabled={isSubmitting || isLoading}
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Descrição opcional sobre a finalidade do grupo
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* E-mails do Grupo */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>E-mails do Grupo *</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adicionarEmail}
                  disabled={isSubmitting || isLoading}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar E-mail</span>
                </Button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                    <FormField
                      control={form.control}
                      name={`emails.${index}.email`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="usuario@empresa.com"
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
                      name={`emails.${index}.nome`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome (Opcional)</FormLabel>
                          <div className="flex space-x-2">
                            <FormControl>
                              <Input
                                placeholder="Nome da pessoa"
                                {...field}
                                disabled={isSubmitting || isLoading}
                              />
                            </FormControl>
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removerEmail(index)}
                                disabled={isSubmitting || isLoading}
                                className="flex-shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>

              <FormDescription>
                Adicione os e-mails das pessoas que fazem parte deste grupo. 
                Estes e-mails receberão cópia dos books enviados aos clientes associados.
              </FormDescription>
            </div>

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
                    ? 'Criar Grupo'
                    : 'Salvar Alterações'}
                </span>
              </Button>
            </div>
          </form>
        </Form>
  );
};

export default GrupoForm;