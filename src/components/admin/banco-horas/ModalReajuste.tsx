/**
 * Modal de Reajuste Manual de Banco de Horas
 * 
 * Componente para criação de reajustes manuais com validação em tempo real,
 * preview do impacto no cálculo e feedback visual completo.
 * 
 * @module components/admin/banco-horas/ModalReajuste
 * @requirements 9.1-9.11
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Info } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useCriarReajuste } from '@/hooks/useBancoHoras';
import { useToast } from '@/hooks/use-toast';
import { converterHorasParaMinutos, converterMinutosParaHoras } from '@/utils/horasUtils';
import { supabase } from '@/integrations/supabase/client';
import type { BancoHorasCalculo } from '@/types/bancoHoras';

/**
 * Schema de validação Zod para formulário de reajuste
 * 
 * **Validates: Requirements 9.2, 9.3, 9.11, 19.8**
 * **Property 16: Reajuste Requer Observação**
 */
const reajusteSchema = z.object({
  valorReajusteHoras: z.string().optional().refine(
    (val) => {
      if (!val || val.trim() === '') return true;
      
      // Validar formato HH:MM ou -HH:MM
      const regex = /^-?\d{1,4}:\d{2}$/;
      if (!regex.test(val)) return false;
      
      // Validar minutos (0-59)
      const parts = val.replace('-', '').split(':');
      const minutos = parseInt(parts[1]);
      return minutos >= 0 && minutos <= 59;
    },
    { message: 'Formato inválido. Use HH:MM ou -HH:MM' }
  ),
  
  valorReajusteTickets: z.string().optional().refine(
    (val) => {
      if (!val || val.trim() === '') return true;
      const num = parseFloat(val);
      return !isNaN(num);
    },
    { message: 'Valor inválido' }
  ),
  
  observacaoPrivada: z.string()
    .min(10, 'Observação deve ter no mínimo 10 caracteres')
    .max(1000, 'Observação deve ter no máximo 1000 caracteres'),
}).refine(
  (data) => data.valorReajusteHoras || data.valorReajusteTickets,
  {
    message: 'Informe pelo menos um valor de reajuste (horas ou tickets)',
    path: ['valorReajusteHoras'],
  }
);

type ReajusteFormData = z.infer<typeof reajusteSchema>;

/**
 * Props do componente ModalReajuste
 */
export interface ModalReajusteProps {
  /** Controla se o modal está aberto */
  open: boolean;
  
  /** Callback para fechar o modal */
  onClose: () => void;
  
  /** ID da empresa */
  empresaId: string;
  
  /** Mês do reajuste (1-12) */
  mes: number;
  
  /** Ano do reajuste */
  ano: number;
  
  /** Cálculo atual (para preview do impacto) */
  calculoAtual?: BancoHorasCalculo;
  
  /** Callback de sucesso após criar reajuste */
  onSuccess?: () => void;
}

/**
 * Componente ModalReajuste
 * 
 * Modal para criação de reajustes manuais com:
 * - Formulário com validação em tempo real
 * - Preview do impacto no cálculo
 * - Feedback visual (cores verde/vermelho)
 * - Alerta sobre recálculo de meses subsequentes
 * - Loading durante aplicação
 * 
 * @example
 * <ModalReajuste
 *   open={modalAberto}
 *   onClose={() => setModalAberto(false)}
 *   empresaId="uuid-empresa"
 *   mes={3}
 *   ano={2024}
 *   calculoAtual={calculo}
 *   onSuccess={() => refetch()}
 * />
 * 
 * **Validates: Requirements 9.1-9.11**
 * **Property 16: Reajuste Requer Observação**
 */
export const ModalReajuste: React.FC<ModalReajusteProps> = ({
  open,
  onClose,
  empresaId,
  mes,
  ano,
  calculoAtual,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { criarReajuste, isCreating } = useCriarReajuste();
  
  const [previewImpacto, setPreviewImpacto] = useState<{
    saldoAtual: number;
    saldoNovo: number;
    diferenca: number;
    tipo: 'positivo' | 'negativo';
  } | null>(null);

  // Formulário com validação Zod
  const form = useForm<ReajusteFormData>({
    resolver: zodResolver(reajusteSchema),
    defaultValues: {
      valorReajusteHoras: '',
      valorReajusteTickets: '',
      observacaoPrivada: '',
    },
  });

  // Resetar formulário quando modal abre/fecha
  useEffect(() => {
    if (!open) {
      form.reset();
      setPreviewImpacto(null);
    }
  }, [open, form]);

  // Calcular preview do impacto em tempo real
  const valorHoras = form.watch('valorReajusteHoras');
  const valorTickets = form.watch('valorReajusteTickets');

  useEffect(() => {
    if (!calculoAtual) {
      setPreviewImpacto(null);
      return;
    }

    let diferencaMinutos = 0;

    // Calcular diferença de horas
    if (valorHoras && valorHoras.trim() !== '') {
      try {
        const minutosReajuste = converterHorasParaMinutos(valorHoras);
        diferencaMinutos = minutosReajuste;
      } catch (error) {
        // Formato inválido, ignorar
      }
    }

    // Calcular diferença de tickets (se aplicável)
    // Por simplicidade, vamos focar apenas em horas no preview
    // Em produção, você pode adicionar lógica para tickets também

    if (diferencaMinutos !== 0) {
      // Calcular saldo atual em minutos
      const saldoAtualMinutos = calculoAtual.saldo_horas
        ? converterHorasParaMinutos(calculoAtual.saldo_horas)
        : 0;

      // Calcular novo saldo (reajuste REDUZ consumo, então AUMENTA saldo)
      const saldoNovoMinutos = saldoAtualMinutos + diferencaMinutos;

      setPreviewImpacto({
        saldoAtual: saldoAtualMinutos,
        saldoNovo: saldoNovoMinutos,
        diferenca: diferencaMinutos,
        tipo: diferencaMinutos > 0 ? 'positivo' : 'negativo',
      });
    } else {
      setPreviewImpacto(null);
    }
  }, [valorHoras, valorTickets, calculoAtual]);

  // Determinar tipo de reajuste para feedback visual
  const tipoReajuste = useMemo(() => {
    if (valorHoras && valorHoras.trim() !== '') {
      try {
        const minutos = converterHorasParaMinutos(valorHoras);
        return minutos > 0 ? 'positivo' : minutos < 0 ? 'negativo' : null;
      } catch {
        return null;
      }
    }
    
    if (valorTickets && valorTickets.trim() !== '') {
      const num = parseFloat(valorTickets);
      if (!isNaN(num)) {
        return num > 0 ? 'positivo' : num < 0 ? 'negativo' : null;
      }
    }
    
    return null;
  }, [valorHoras, valorTickets]);

  // Handler de submit
  const onSubmit = async (data: ReajusteFormData) => {
    try {
      console.log('📝 Criando reajuste:', data);

      // Obter ID do usuário atual (em produção, pegar do contexto de auth)
      const { data: { user } } = await supabase.auth.getUser();
      const usuarioId = user?.id || 'unknown';

      await criarReajuste({
        empresaId,
        mes,
        ano,
        valorReajusteHoras: data.valorReajusteHoras?.trim() || undefined,
        valorReajusteTickets: data.valorReajusteTickets?.trim() 
          ? parseFloat(data.valorReajusteTickets) 
          : undefined,
        observacaoPrivada: data.observacaoPrivada.trim(),
        usuarioId,
      });

      toast({
        title: 'Reajuste aplicado com sucesso!',
        description: 'O mês atual e os meses subsequentes foram recalculados.',
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('❌ Erro ao criar reajuste:', error);
      
      toast({
        title: 'Erro ao aplicar reajuste',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-sonda-blue">
            Criar Reajuste Manual
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Ajuste manual no cálculo de {mes}/{ano}. Requer observação detalhada.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Alerta sobre recálculo de meses subsequentes */}
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800">Atenção</AlertTitle>
              <AlertDescription className="text-orange-700">
                Este reajuste irá recalcular o mês atual e <strong>todos os meses subsequentes</strong> até o fim do período de apuração.
              </AlertDescription>
            </Alert>

            {/* Campos de valor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valorReajusteHoras"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Reajuste em Horas
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Ex: 10:30 ou -05:15"
                          {...field}
                          className={
                            form.formState.errors.valorReajusteHoras
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                              : 'focus:ring-sonda-blue focus:border-sonda-blue'
                          }
                        />
                        {tipoReajuste === 'positivo' && field.value && (
                          <TrendingUp className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600" />
                        )}
                        {tipoReajuste === 'negativo' && field.value && (
                          <TrendingDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs text-gray-500">
                      Formato: HH:MM (use - para negativo)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valorReajusteTickets"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Reajuste em Tickets
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 5.5 ou -2.3"
                        {...field}
                        className={
                          form.formState.errors.valorReajusteTickets
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'focus:ring-sonda-blue focus:border-sonda-blue'
                        }
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-gray-500">
                      Valor decimal (use - para negativo)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Preview do impacto */}
            {previewImpacto && (
              <Card className={
                previewImpacto.tipo === 'positivo'
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-base font-medium flex items-center gap-2 ${
                    previewImpacto.tipo === 'positivo' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    <Info className="h-5 w-5" />
                    Preview do Impacto
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Saldo Atual:</span>
                      <span className="font-mono font-medium">
                        {converterMinutosParaHoras(previewImpacto.saldoAtual)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reajuste:</span>
                      <span className={`font-mono font-semibold ${
                        previewImpacto.tipo === 'positivo' ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {previewImpacto.tipo === 'positivo' ? '+' : ''}
                        {converterMinutosParaHoras(previewImpacto.diferenca)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-medium text-gray-700">Novo Saldo:</span>
                      <span className={`font-mono font-bold ${
                        previewImpacto.tipo === 'positivo' ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {converterMinutosParaHoras(previewImpacto.saldoNovo)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Badge de tipo de reajuste */}
            {tipoReajuste && (
              <div className="flex justify-center">
                <Badge
                  className={
                    tipoReajuste === 'positivo'
                      ? 'bg-green-100 text-green-800 text-sm px-4 py-1'
                      : 'bg-red-100 text-red-800 text-sm px-4 py-1'
                  }
                >
                  {tipoReajuste === 'positivo' ? (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Reajuste Positivo
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 mr-2" />
                      Reajuste Negativo
                    </>
                  )}
                </Badge>
              </div>
            )}

            {/* Observação privada */}
            <FormField
              control={form.control}
              name="observacaoPrivada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Observação Privada <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o motivo do reajuste (mínimo 10 caracteres)..."
                      rows={4}
                      {...field}
                      className={
                        form.formState.errors.observacaoPrivada
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'focus:ring-sonda-blue focus:border-sonda-blue'
                      }
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-gray-500">
                    {field.value.length}/1000 caracteres (mínimo 10)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botões de ação */}
            <DialogFooter className="pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-sonda-blue hover:bg-sonda-dark-blue"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aplicando Reajuste...
                  </>
                ) : (
                  'Aplicar Reajuste'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ModalReajuste;
