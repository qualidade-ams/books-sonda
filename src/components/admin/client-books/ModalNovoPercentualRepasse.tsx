/**
 * Modal para criar nova vigência de percentual de repasse
 * 
 * Permite definir:
 * - Percentual de repasse (0-100)
 * - Data de início da vigência
 * - Motivo da mudança
 * - Observações adicionais
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Percent } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

import { useCreatePercentualRepasseHistorico } from '@/hooks/usePercentualRepasseHistorico';
import { MOTIVOS_PERCENTUAL_REPASSE } from '@/types/percentualRepasseHistorico';

// =====================================================
// SCHEMA DE VALIDAÇÃO
// =====================================================

const formSchema = z.object({
  percentual: z.coerce
    .number()
    .min(0, 'Percentual deve ser no mínimo 0')
    .max(100, 'Percentual deve ser no máximo 100'),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  motivo: z.string().optional(),
  observacao: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// =====================================================
// PROPS
// =====================================================

interface ModalNovoPercentualRepasseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  empresaNome: string;
}

// =====================================================
// COMPONENTE
// =====================================================

export default function ModalNovoPercentualRepasse({
  open,
  onOpenChange,
  empresaId,
  empresaNome,
}: ModalNovoPercentualRepasseProps) {
  const createPercentualRepasse = useCreatePercentualRepasseHistorico();

  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      percentual: 0,
      data_inicio: new Date().toISOString().split('T')[0],
      motivo: '',
      observacao: '',
    },
  });

  // Handlers
  const onSubmit = async (values: FormValues) => {
    console.log('📝 Iniciando criação de vigência:', values);
    console.log('🏢 Empresa ID:', empresaId);
    
    try {
      const payload = {
        empresa_id: empresaId,
        ...values,
      };
      
      console.log('📤 Payload enviado:', payload);
      
      await createPercentualRepasse.mutateAsync(payload);

      console.log('✅ Vigência criada com sucesso!');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('❌ Erro ao criar percentual de repasse:', error);
      console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-sonda-blue">
            Nova Vigência de Percentual de Repasse
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {empresaNome}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Percentual */}
            <FormField
              control={form.control}
              name="percentual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Percentual de Repasse (%) <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="Ex: 50.00"
                        {...field}
                        className={
                          form.formState.errors.percentual
                            ? 'pl-10 border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'pl-10 focus:ring-sonda-blue focus:border-sonda-blue'
                        }
                      />
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs text-gray-500">
                    Percentual de repasse mensal (0 a 100)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data de Início */}
            <FormField
              control={form.control}
              name="data_inicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Data de Início da Vigência <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="date"
                        {...field}
                        className={
                          form.formState.errors.data_inicio
                            ? 'pl-10 border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'pl-10 focus:ring-sonda-blue focus:border-sonda-blue'
                        }
                      />
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs text-gray-500">
                    A vigência anterior será encerrada automaticamente no dia anterior
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Motivo */}
            <FormField
              control={form.control}
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Motivo da Mudança
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                        <SelectValue placeholder="Selecione o motivo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MOTIVOS_PERCENTUAL_REPASSE.map((motivo) => (
                        <SelectItem key={motivo} value={motivo}>
                          {motivo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observação */}
            <FormField
              control={form.control}
              name="observacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Observações
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre a mudança..."
                      rows={4}
                      {...field}
                      className="focus:ring-sonda-blue focus:border-sonda-blue"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botões */}
            <DialogFooter className="pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={createPercentualRepasse.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-sonda-blue hover:bg-sonda-dark-blue"
                disabled={createPercentualRepasse.isPending}
              >
                {createPercentualRepasse.isPending ? 'Criando...' : 'Criar Vigência'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
