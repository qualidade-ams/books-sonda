/**
 * Modal para criar nova vigência de baseline
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Calendar, Clock } from 'lucide-react';

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

import { useCreateBaselineHistorico, useBaselineAtual } from '@/hooks/useBaselineHistorico';
import { MOTIVOS_MUDANCA_OPTIONS } from '@/types/baselineHistorico';
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
  motivo: z.string().min(1, 'Motivo é obrigatório'),
  observacao: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

interface ModalNovoBaselineProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  empresaNome: string;
}

export default function ModalNovoBaseline({
  open,
  onOpenChange,
  empresaId,
  empresaNome
}: ModalNovoBaselineProps) {
  const { user } = useAuth();
  const createBaseline = useCreateBaselineHistorico();
  const { data: baselineAtual } = useBaselineAtual(empresaId);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      baseline_horas: '',
      baseline_tickets: '',
      data_inicio: '',
      motivo: '',
      observacao: ''
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createBaseline.mutateAsync({
        empresa_id: empresaId,
        baseline_horas: parseFloat(data.baseline_horas),
        baseline_tickets: data.baseline_tickets ? parseInt(data.baseline_tickets) : null,
        data_inicio: data.data_inicio,
        motivo: data.motivo,
        observacao: data.observacao || null,
        created_by: user?.id
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar baseline:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-sonda-blue flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Nova Vigência de Baseline
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {empresaNome}
          </DialogDescription>
        </DialogHeader>

        {/* Alerta sobre baseline atual */}
        {baselineAtual && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm text-yellow-800">
              <strong>Atenção:</strong> Ao criar uma nova vigência, o baseline atual de{' '}
              <strong>{baselineAtual.baseline_horas.toFixed(2)}h</strong> será encerrado
              automaticamente no dia anterior à nova data de início.
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

            {/* Data de Início */}
            <FormField
              control={form.control}
              name="data_inicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Data de Início da Vigência *
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
                  <FormDescription className="text-xs text-gray-500">
                    Data a partir da qual o novo baseline será válido
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
                disabled={createBaseline.isPending}
              >
                {createBaseline.isPending ? 'Criando...' : 'Criar Vigência'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
