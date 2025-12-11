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
  resumo_comunicacao: z.string()
    .min(1, 'Resumo da comunicação é obrigatório')
    .refine((val) => val.trim().length > 0, {
      message: 'Resumo da comunicação não pode estar vazio'
    }),
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
      meio_contato: contato?.meio_contato || 'email',
      resumo_comunicacao: contato?.resumo_comunicacao || '',
      retorno_cliente: contato?.retorno_cliente || null,
      observacoes: contato?.observacoes || '',
    },
  });

  // Esta função não é mais usada, a validação está no handleFormSubmit

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🚀 Form submit interceptado');
    
    // Obter valores atuais
    const currentValues = form.getValues();
    console.log('🔍 Valores atuais:', currentValues);
    
    // Verificação manual do campo obrigatório
    const resumo = currentValues.resumo_comunicacao?.trim() || '';
    console.log('🔍 Resumo trimmed:', `"${resumo}"`);
    console.log('🔍 Resumo length:', resumo.length);
    
    if (resumo.length === 0) {
      console.log('❌ BLOQUEANDO: Resumo está vazio');
      form.setError('resumo_comunicacao', {
        type: 'manual',
        message: 'Resumo da comunicação é obrigatório'
      });
      // Forçar re-render para mostrar erro
      form.trigger('resumo_comunicacao');
      return;
    }
    
    // Forçar validação completa
    const isValid = await form.trigger();
    console.log('🔍 Formulário válido após trigger?', isValid);
    console.log('🔍 Erros após trigger:', form.formState.errors);
    
    if (!isValid) {
      console.log('❌ BLOQUEANDO: Formulário inválido');
      return;
    }
    
    console.log('✅ PERMITINDO: Dados válidos, enviando');
    onSubmit(currentValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-4">
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
                <Select onValueChange={field.onChange} value={field.value}>
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
              <FormLabel className='mt-2'>Resumo da Comunicação *</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Descreva o que foi conversado com o cliente..."
                  rows={4}
                  className={form.formState.errors.resumo_comunicacao ? 'border-red-500' : ''}
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
                value={field.value || ""}
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
          <Button 
            type="button" 
            variant="outline" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }} 
            disabled={isLoading}
          >
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