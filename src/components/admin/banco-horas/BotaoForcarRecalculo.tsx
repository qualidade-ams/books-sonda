/**
 * BotaoForcarRecalculo Component
 * 
 * Button to force recalculation of banco de horas for a specific client/period.
 * Useful when consumption shows as 00:00 but there are apontamentos in the database.
 * 
 * @module components/admin/banco-horas/BotaoForcarRecalculo
 */

import React, { useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export interface BotaoForcarRecalculoProps {
  /** ID da empresa */
  empresaId: string;
  
  /** Mês (1-12) */
  mes: number;
  
  /** Ano (ex: 2024) */
  ano: number;
  
  /** Nome da empresa para exibição */
  empresaNome?: string;
  
  /** Callback após recálculo bem-sucedido */
  onRecalculoSucesso?: () => void;
  
  /** Se true, exibe apenas ícone (sem texto) */
  iconOnly?: boolean;
  
  /** Se true, botão está desabilitado */
  disabled?: boolean;
}

/**
 * BotaoForcarRecalculo Component
 * 
 * Displays a button that allows forcing recalculation of banco de horas.
 * Shows a confirmation dialog before deleting the existing calculation.
 */
export function BotaoForcarRecalculo({
  empresaId,
  mes,
  ano,
  empresaNome,
  onRecalculoSucesso,
  iconOnly = false,
  disabled = false
}: BotaoForcarRecalculoProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [processando, setProcessando] = useState(false);

  const handleForcarRecalculo = async () => {
    try {
      setProcessando(true);
      
      console.log('🔄 Forçando recálculo:', {
        empresaId,
        mes,
        ano
      });

      // Call the SQL function to delete the existing calculation
      const { data, error } = await supabase.rpc('force_recalculate_banco_horas', {
        p_empresa_id: empresaId,
        p_mes: mes,
        p_ano: ano
      });

      if (error) {
        console.error('❌ Erro ao forçar recálculo:', error);
        throw new Error(error.message);
      }

      console.log('✅ Cálculo deletado:', data);

      // Invalidate all related caches
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ['banco-horas-calculo', empresaId, mes, ano],
          refetchType: 'all'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['banco-horas-calculos-segmentados', empresaId, mes, ano],
          refetchType: 'all'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['banco-horas-versoes', empresaId, mes, ano],
          refetchType: 'all'
        })
      ]);

      // Force immediate refetch
      await Promise.all([
        queryClient.refetchQueries({ 
          queryKey: ['banco-horas-calculo', empresaId, mes, ano],
          type: 'all'
        }),
        queryClient.refetchQueries({ 
          queryKey: ['banco-horas-calculos-segmentados', empresaId, mes, ano],
          type: 'all'
        })
      ]);

      toast({
        title: 'Recálculo iniciado',
        description: 'O sistema está recalculando os valores. Aguarde alguns segundos...',
      });

      // Close dialog
      setDialogAberto(false);

      // Call success callback
      if (onRecalculoSucesso) {
        onRecalculoSucesso();
      }
    } catch (error) {
      console.error('❌ Erro ao forçar recálculo:', error);
      toast({
        title: 'Erro ao forçar recálculo',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setProcessando(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogAberto(true)}
        disabled={disabled || processando}
        className="flex items-center gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${processando ? 'animate-spin' : ''}`} />
        {!iconOnly && <span>Forçar Recálculo</span>}
      </Button>

      <AlertDialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Confirmar Recálculo
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Você está prestes a forçar o recálculo do banco de horas para:
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Empresa:</span>
                  <span>{empresaNome || empresaId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Período:</span>
                  <span>{String(mes).padStart(2, '0')}/{ano}</span>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>O que acontecerá:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>O cálculo existente será deletado</li>
                    <li>O sistema recalculará automaticamente com os dados atuais</li>
                    <li>Os valores de consumo serão atualizados</li>
                    <li>Esta ação não pode ser desfeita</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <p className="text-sm text-gray-600">
                Use esta função quando o consumo estiver zerado mas você sabe que existem
                apontamentos no período.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processando}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForcarRecalculo}
              disabled={processando}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {processando ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Recalculando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Confirmar Recálculo
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
