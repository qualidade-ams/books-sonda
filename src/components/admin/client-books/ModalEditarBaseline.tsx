/**
 * Modal para editar vigência de baseline existente
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Edit, AlertTriangle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useUpdateBaselineHistorico } from '@/hooks/useBaselineHistorico';
import { MOTIVOS_MUDANCA_OPTIONS } from '@/types/baselineHistorico';
import type { BaselineHistorico } from '@/types/baselineHistorico';
import { useAuth } from '@/hooks/useAuth';

// Schema de validação
const formSchema = z.object({
  baseline_horas: z.string()
    .min(1, 'Baseline de horas é obrigatório')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: 'Deve ser um número maior ou igual a zero'
    }),
  baseline_tickets: z.string().optional(),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  data_fim: z.string().optional(),
  motivo: z.string().min(1, 'Motivo é obrigatório'),
  observacao: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

interface ModalEditarBaselineProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseline: BaselineHistorico;
  empresaNome: string;
}

export default function ModalEditarBaseline({
  open,
  onOpenChange,
  baseline,
  empresaNome
}: ModalEditarBaselineProps) {
  const { user } = useAuth();
  const updateBaseline = useUpdateBaselineHistorico();

  const isVigente = !baseline.data_fim;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      baseline_horas: baseline.baseline_horas.toString(),
      baseline_tickets: baseline.baseline_tickets?.toString() || '',
      data_inicio: baseline.data_inicio,
      data_fim: baseline.data_fim || '',
      motivo: baseline.motivo || '',
      observacao: baseline.observacao || ''
    }
  });

  // Atualizar valores quando baseline mudar
  useEffect(() => {
    form.reset({
      baseline_horas: baseline.baseline_horas.toString(),
      baseline_tickets: baseline.baseline_tickets?.toString() || '',
      data_inicio: baseline.data_inicio,
      data_fim: baseline.data_fim || '',
      motivo: baseline.motivo || '',
      observacao: baseline.observacao || ''
    });
  }, [baseline, form]);

  const onSubmit = async (data: FormData) => {
    try {
      await updateBaseline.mutateAsync({
        id: baseline.id,
        data: {
          baseline_horas: parseFloat(data.baseline_horas),
          baseline_tickets: data.baseline_tickets ? parseInt(data.baseline_tickets) : null,
          data_inicio: data.data_inicio,
          data_fim: data.data_fim || null,
          motivo: data.motivo,
          observacao: data.observacao || null,
          updated_by: user?.id
        }
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar baseline:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-sonda-blue flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Vigência de Baseline
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {empresaNome}
          </DialogDescription>
        </DialogHeader>

        {/* Alerta sobre vigência ativa */}
        {isVigente && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm text-yellow-800">
              <strong>Atenção:</strong> Esta é a vigência ativa atual. Alterações afetarão
              os cálculos de banco de horas a partir da data de início.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Baseline de Horas */}
            <FormField
              control={form.control}
              name="baseline_horas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Baseline de Horas Mensal *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 160.00"
                      {...field}
                      className={
                        form.formState.errors.baseline_horas
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'focus:ring-sonda-blue focus:border-sonda-blue'
                      }
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-gray-500">
                    Quantidade de horas contratadas por mês
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Baseline de Tickets */}
            <FormField
              control={form.control}
              name="baseline_tickets"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Baseline de Tickets Mensal
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ex: 50"
                      {...field}
                      className="focus:ring-sonda-blue focus:border-sonda-blue"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-gray-500">
                    Quantidade de tickets contratados por mês (opcional)
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
                      Data de Início *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className={
                          form.formState.errors.data_inicio
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'focus:ring-sonda-blue focus:border-sonda-blue'
                        }
                      />
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
                      <Input
                        type="date"
                        {...field}
                        className="focus:ring-sonda-blue focus:border-sonda-blue"
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-gray-500">
                      Deixe vazio para vigência atual
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
                    Motivo da Mudança *
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger
                        className={
                          form.formState.errors.motivo
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'focus:ring-sonda-blue focus:border-sonda-blue'
                        }
                      >
                        <SelectValue placeholder="Selecione o motivo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MOTIVOS_MUDANCA_OPTIONS.map((option) => (
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
                      placeholder="Detalhes adicionais sobre a mudança..."
                      rows={3}
                      {...field}
                      className="focus:ring-sonda-blue focus:border-sonda-blue"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-gray-500">
                    Informações complementares sobre a alteração (opcional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botões */}
            <DialogFooter className="pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-sonda-blue hover:bg-sonda-dark-blue"
                disabled={updateBaseline.isPending}
              >
                {updateBaseline.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
