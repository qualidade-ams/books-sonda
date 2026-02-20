/**
 * Modal para editar vigência existente de percentual de repasse
 * 
 * Permite editar:
 * - Percentual de repasse
 * - Data de início
 * - Data de fim (opcional)
 * - Motivo
 * - Observações
 */

import React, { useEffect } from 'react';
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

import { useUpdatePercentualRepasseHistorico } from '@/hooks/usePercentualRepasseHistorico';
import { MOTIVOS_PERCENTUAL_REPASSE, type PercentualRepasseHistorico } from '@/types/percentualRepasseHistorico';

// =====================================================
// SCHEMA DE VALIDAÇÃO
// =====================================================

const formSchema = z.object({
  percentual: z.coerce
    .number()
    .min(0, 'Percentual deve ser no mínimo 0')
    .max(100, 'Percentual deve ser no máximo 100'),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  data_fim: z.string().optional(),
  motivo: z.string().optional(),
  observacao: z.string().optional(),
}).refine(
  (data) => {
    if (data.data_fim && data.data_inicio) {
      return new Date(data.data_fim) >= new Date(data.data_inicio);
    }
    return true;
  },
  {
    message: 'Data de fim deve ser maior ou igual à data de início',
    path: ['data_fim'],
  }
);

type FormValues = z.infer<typeof formSchema>;

// =====================================================
// PROPS
// =====================================================

interface ModalEditarPercentualRepasseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  percentualRepasse: PercentualRepasseHistorico;
  empresaNome: string;
}

// =====================================================
// COMPONENTE
// =====================================================

export default function ModalEditarPercentualRepasse({
  open,
  onOpenChange,
  percentualRepasse,
  empresaNome,
}: ModalEditarPercentualRepasseProps) {
  const updatePercentualRepasse = useUpdatePercentualRepasseHistorico();

  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      percentual: percentualRepasse.percentual,
      data_inicio: percentualRepasse.data_inicio.split('T')[0],
      data_fim: percentualRepasse.data_fim?.split('T')[0] || '',
      motivo: percentualRepasse.motivo || '',
      observacao: percentualRepasse.observacao || '',
    },
  });

  // Atualizar form quando percentualRepasse mudar
  useEffect(() => {
    form.reset({
      percentual: percentualRepasse.percentual,
      data_inicio: percentualRepasse.data_inicio.split('T')[0],
      data_fim: percentualRepasse.data_fim?.split('T')[0] || '',
      motivo: percentualRepasse.motivo || '',
      observacao: percentualRepasse.observacao || '',
    });
  }, [percentualRepasse, form]);

  // Handlers
  const onSubmit = async (values: FormValues) => {
    try {
      await updatePercentualRepasse.mutateAsync({
        id: percentualRepasse.id,
        empresaId: percentualRepasse.empresa_id,
        ...values,
        data_fim: values.data_fim || null,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar percentual de repasse:', error);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  const isVigente = !percentualRepasse.data_fim;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-sonda-blue">
            Editar Vigência de Percentual de Repasse
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

            {/* Datas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Data de Início */}
              <FormField
                control={form.control}
                name="data_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Data de Início <span className="text-red-500">*</span>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Data de Fim */}
              <FormField
                control={form.control}
                name="data_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Data de Fim
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="date"
                          {...field}
                          disabled={isVigente}
                          className={
                            form.formState.errors.data_fim
                              ? 'pl-10 border-red-500 focus:ring-red-500 focus:border-red-500'
                              : 'pl-10 focus:ring-sonda-blue focus:border-sonda-blue'
                          }
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs text-gray-500">
                      {isVigente ? 'Vigência atual (sem data de fim)' : 'Deixe vazio para vigência atual'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                disabled={updatePercentualRepasse.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-sonda-blue hover:bg-sonda-dark-blue"
                disabled={updatePercentualRepasse.isPending}
              >
                {updatePercentualRepasse.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
