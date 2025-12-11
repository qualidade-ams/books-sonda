// =====================================================
// COMPONENTE: FORMULÁRIO DE CONTATO DO PLANO DE AÇÃO
// =====================================================

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PlanoAcaoContato, PlanoAcaoContatoFormData } from '@/types/planoAcaoContatos';
import {
  MEIO_CONTATO_CONTATOS_OPTIONS,
  RETORNO_CLIENTE_CONTATOS_OPTIONS,
} from '@/types/planoAcaoContatos';

const contatoFormSchema = z.object({
  data_contato: z.string().min(1, 'Data do contato é obrigatória'),
  meio_contato: z.enum(['whatsapp', 'email', 'ligacao'], {
    required_error: 'Meio de contato é obrigatório',
  }),
  resumo_comunicacao: z.string().min(10, 'Resumo deve ter pelo menos 10 caracteres'),
  retorno_cliente: z.enum(['aguardando', 'respondeu', 'solicitou_mais_informacoes']).optional().nullable(),
  observacoes: z.string().optional(),
});

interface ContatoFormProps {
  contato?: PlanoAcaoContato;
  onSubmit: (dados: PlanoAcaoContatoFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ContatoForm({
  contato,
  onSubmit,
  onCancel,
  isLoading,
}: ContatoFormProps) {
  const form = useForm<PlanoAcaoContatoFormData>({
    resolver: zodResolver(contatoFormSchema),
    defaultValues: {
      data_contato: contato?.data_contato || format(new Date(), 'yyyy-MM-dd'),
      meio_contato: contato?.meio_contato || 'whatsapp',
      resumo_comunicacao: contato?.resumo_comunicacao || '',
      retorno_cliente: contato?.retorno_cliente || null,
      observacoes: contato?.observacoes || '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Data e Meio de Contato */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="data_contato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data do Contato *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="meio_contato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meio de Contato *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o meio" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MEIO_CONTATO_CONTATOS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Resumo da Comunicação */}
        <FormField
          control={form.control}
          name="resumo_comunicacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Resumo da Comunicação *</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Descreva o que foi conversado com o cliente..."
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Retorno do Cliente */}
        <FormField
          control={form.control}
          name="retorno_cliente"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Retorno do Cliente</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value || undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Como o cliente respondeu?" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {RETORNO_CLIENTE_CONTATOS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Observações */}
        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Observações adicionais sobre o contato..."
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : contato ? 'Atualizar' : 'Registrar Contato'}
          </Button>
        </div>
      </form>
    </Form>
  );
}