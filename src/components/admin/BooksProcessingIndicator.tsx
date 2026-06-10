/**
 * BooksProcessingIndicator
 * 
 * Indicador global de progresso do processamento de books.
 * Aparece em qualquer tela quando há processamento em andamento.
 * Pode ser minimizado/expandido.
 */

import { useState } from 'react';
import { Loader2, X, ChevronUp, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useBooksProcessing } from '@/contexts/BooksProcessingContext';

export function BooksProcessingIndicator() {
  const { progress, isProcessing, cancelProcessing, resetProgress } = useBooksProcessing();
  const [minimized, setMinimized] = useState(false);

  // Não mostrar se não está processando e não tem resultados para exibir
  if (!isProcessing && progress.total === 0) return null;

  const porcentagem = progress.total > 0 ? Math.round((progress.atual / progress.total) * 100) : 0;
  const concluido = !isProcessing && progress.total > 0;

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setMinimized(false)}
          className="bg-sonda-blue hover:bg-sonda-dark-blue text-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">
                {progress.atual}/{progress.total}
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Concluído</span>
            </>
          )}
          <ChevronUp className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin text-sonda-blue" />
          ) : progress.erros > 0 ? (
            <AlertCircle className="h-4 w-4 text-orange-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {isProcessing
              ? `Enviando ${progress.atual} de ${progress.total} books...`
              : concluido
                ? 'Processamento concluído'
                : 'Books'
            }
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setMinimized(true)}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          {!isProcessing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={resetProgress}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 py-3 space-y-2">
        {isProcessing && (
          <>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Processando: <span className="font-medium text-gray-700">{progress.empresa}</span></span>
              <span>{porcentagem}%</span>
            </div>
            <Progress value={porcentagem} className="h-2" />
          </>
        )}

        {/* Resumo */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {progress.enviados > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {progress.enviados} enviado(s)
            </span>
          )}
          {progress.erros > 0 && (
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-red-500" />
              {progress.erros} erro(s)
            </span>
          )}
          {isProcessing && progress.total - progress.atual > 0 && (
            <span className="text-gray-400">
              {progress.total - progress.atual} restante(s)
            </span>
          )}
        </div>

        {/* Botão cancelar */}
        {isProcessing && (
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-7 text-red-600 hover:text-red-800 hover:border-red-300"
              onClick={cancelProcessing}
            >
              Cancelar Processamento
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
