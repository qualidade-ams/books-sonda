import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Mail } from 'lucide-react';
import { GrupoFormData, GrupoResponsavelCompleto } from '@/types/clientBooksTypes';

// Schema de validação
const emailSchema = z.object({
  email: z.string().email('E-mail inválido'),
  nome: z.string().optional(),
});

const grupoFormSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  descricao: z.string().optional(),
  emails: z.array(emailSchema).optional(),
});

type GrupoFormValues = z.infer<typeof grupoFormSchema>;

interface GrupoFormProps {
  grupo?: GrupoResponsavelCompleto | null;
  onSubmit: (data: GrupoFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function GrupoForm({ grupo, onSubmit, onCancel, isLoading = false }: GrupoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GrupoFormValues>({
    resolver: zodResolver(grupoFormSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      emails: [{ email: '', nome: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'emails',
  });

  // Preencher formulário quando grupo for carregado
  useEffect(() => {
    if (grupo) {
      reset({
        nome: grupo.nome,
        descricao: grupo.descricao || '',
        emails: grupo.emails?.length > 0 
          ? grupo.emails.map(email => ({ email: email.email, nome: email.nome || '' }))
          : [{ email: '', nome: '' }],
      });
    } else {
      reset({
        nome: '',
        descricao: '',
        emails: [{ email: '', nome: '' }],
      });
    }
  }, [grupo, reset]);

  const handleFormSubmit = async (data: GrupoFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Filtrar e-mails vazios
      const emailsValidos = data.emails?.filter(email => email.email.trim()) || [];
      
      const formData: GrupoFormData = {
        nome: data.nome.trim(),
        descricao: data.descricao?.trim() || undefined,
        emails: emailsValidos.map(email => ({
          email: email.email.toLowerCase().trim(), // Normalizar email para lowercase
          nome: email.nome?.trim() || undefined,
        })),
      };

      await onSubmit(formData);
    } catch (error) {
      console.error('Erro ao submeter formulário:', error);
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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Informações básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Informações do Grupo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Grupo *</Label>
            <Input
              id="nome"
              {...register('nome')}
              placeholder="Ex: Comex, Fiscal, Gallery..."
              disabled={isLoading || isSubmitting}
            />
            {errors.nome && (
              <p className="text-sm text-red-600">{errors.nome.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              {...register('descricao')}
              placeholder="Descrição opcional do grupo..."
              rows={3}
              disabled={isLoading || isSubmitting}
            />
            {errors.descricao && (
              <p className="text-sm text-red-600">{errors.descricao.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* E-mails do grupo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>E-mails do Grupo</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={adicionarEmail}
              disabled={isLoading || isSubmitting}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar E-mail
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Input
                      {...register(`emails.${index}.email`)}
                      placeholder="email@exemplo.com"
                      type="email"
                      disabled={isLoading || isSubmitting}
                    />
                    {errors.emails?.[index]?.email && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.emails[index]?.email?.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Input
                      {...register(`emails.${index}.nome`)}
                      placeholder="Nome (opcional)"
                      disabled={isLoading || isSubmitting}
                    />
                  </div>
                </div>
              </div>
              
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removerEmail(index)}
                  disabled={isLoading || isSubmitting}
                  className="mt-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          
          {fields.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhum e-mail adicionado. Clique em "Adicionar E-mail" para começar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Botões de ação */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading || isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading || isSubmitting}
        >
          {isSubmitting ? 'Salvando...' : grupo ? 'Atualizar' : 'Criar'} Grupo
        </Button>
      </div>
    </form>
  );
}