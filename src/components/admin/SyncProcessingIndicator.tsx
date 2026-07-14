/**
 * SyncProcessingIndicator
 * 
 * Indicador global de progresso da sincronização com SQL Server.
 * Aparece em qualquer tela quando há sincronização em andamento.
 * Pode ser minimizado/expandido.
 * 
 * Features:
 * - Posicionado no canto inferior direito (acima do indicator de books se existir)
 * - Logs expandíveis após conclusão
 * - Última data de execução por tabela
 */

import { useState, useRef, useEffect } from 'react';
import { 
  Loader2, X, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, 
  Database, Clock, ScrollText 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSyncProcessing } from '@/contexts/SyncProcessingContext';
import { useBooksProcessing } from '@/contexts/BooksProcessingContext';

export function SyncProcessingIndicator() {
  const { syncProgress, isSyncing, ultimaExecucao, resetSync } = useSyncProcessing();
  const { isProcessing: isBooksProcessing, progress: booksProgress } = useBooksProcessing();
  const [minimized, setMinimized] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Se o indicador de books estiver visível, subir o de sync
  const booksIndicatorVisible = isBooksProcessing || booksProgress.total > 0;
  const bottomClass = booksIndicatorVisible ? 'bottom-52' : 'bottom-4';

  // Auto-scroll logs
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [syncProgress.logs, showLogs]);

  // Não mostrar se não está sincronizando e não tem resultados
  if (!isSyncing && !syncProgress.concluido) return null;

  const porcentagem = Math.round(syncProgress.progress);
  const concluido = syncProgress.concluido;
  const temErros = syncProgress.resultado && syncProgress.resultado.erros > 0;

  const formatarData = (isoDate: string | null) => {
    if (!isoDate) return 'Nunca';
    const date = new Date(isoDate);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (minimized) {
    return (
      <div className={`fixed ${bottomClass} right-4 z-50`}>
        <Button
          onClick={() => setMinimized(false)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2"
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Sincronizando...</span>
            </>
          ) : (
            <>
              {temErros ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">Sync concluída</span>
            </>
          )}
          <ChevronUp className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed ${bottomClass} right-4 z-50 w-[420px] bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[80vh] flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          ) : temErros ? (
            <AlertCircle className="h-4 w-4 text-orange-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          <Database className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {isSyncing
              ? 'Sincronizando SQL Server...'
              : concluido
                ? 'Sincronização concluída'
                : 'Sincronização'
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
          {!isSyncing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={resetSync}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo scrollável */}
      <div className="flex-1 overflow-y-auto">
        {/* Progress */}
        <div className="px-4 py-3 space-y-2">
          {/* Barra de progresso */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-medium text-gray-700 dark:text-gray-300 truncate mr-2">
              {syncProgress.currentMessage}
            </span>
            <span className="flex-shrink-0">{porcentagem}%</span>
          </div>
          <Progress value={porcentagem} className="h-2" />

          {/* Resultado após conclusão */}
          {concluido && syncProgress.resultado && (
            <div className="space-y-2 pt-2">
              {/* Status geral */}
              <div className={`flex items-center gap-2 p-2 rounded-md text-xs ${
                syncProgress.resultado.sucesso
                  ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200'
              }`}>
                {syncProgress.resultado.sucesso ? (
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                )}
                <span className="font-medium">
                  {syncProgress.resultado.sucesso
                    ? 'Todas as tabelas sincronizadas com sucesso'
                    : `Concluída com ${syncProgress.resultado.erros} erro(s)`
                  }
                </span>
              </div>

              {/* Pesquisas */}
              {syncProgress.tabelasSelecionadas?.pesquisas && (
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-600 dark:text-gray-400">📊 Pesquisas:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {syncProgress.resultado.novos ?? 0} novos, {syncProgress.resultado.atualizados ?? 0} atualizados
                  </span>
                </div>
              )}

              {/* Especialistas */}
              {syncProgress.tabelasSelecionadas?.especialistas && syncProgress.resultado.especialistas && (
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-600 dark:text-gray-400">👥 Especialistas:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {syncProgress.resultado.especialistas.novos ?? 0} novos, {syncProgress.resultado.especialistas.atualizados ?? 0} atualizados
                  </span>
                </div>
              )}

              {/* Apontamentos */}
              {syncProgress.tabelasSelecionadas?.apontamentos && syncProgress.resultado.apontamentos && (
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-600 dark:text-gray-400">📝 Apontamentos:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {syncProgress.resultado.apontamentos.novos ?? 0} novos, {syncProgress.resultado.apontamentos.atualizados ?? 0} atualizados
                  </span>
                </div>
              )}

              {/* Tickets */}
              {syncProgress.tabelasSelecionadas?.tickets && syncProgress.resultado.tickets && (
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-600 dark:text-gray-400">🎫 Tickets:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {syncProgress.resultado.tickets.novos ?? 0} novos, {syncProgress.resultado.tickets.atualizados ?? 0} atualizados
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Seção: Última execução por tabela */}
        {concluido && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowDates(!showDates)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium">Última execução por tabela</span>
              </div>
              <ChevronDown className={`h-3 w-3 transition-transform ${showDates ? 'rotate-180' : ''}`} />
            </button>
            
            {showDates && (
              <div className="px-4 pb-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">📊 Pesquisas:</span>
                  <span className="text-gray-700 dark:text-gray-300 font-mono text-[11px]">
                    {formatarData(ultimaExecucao.pesquisas)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">👥 Especialistas:</span>
                  <span className="text-gray-700 dark:text-gray-300 font-mono text-[11px]">
                    {formatarData(ultimaExecucao.especialistas)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">📝 Apontamentos:</span>
                  <span className="text-gray-700 dark:text-gray-300 font-mono text-[11px]">
                    {formatarData(ultimaExecucao.apontamentos)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">🎫 Tickets:</span>
                  <span className="text-gray-700 dark:text-gray-300 font-mono text-[11px]">
                    {formatarData(ultimaExecucao.tickets)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Seção: Logs */}
        {(concluido || isSyncing) && syncProgress.logs.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <ScrollText className="h-3.5 w-3.5" />
                <span className="font-medium">Logs ({syncProgress.logs.length})</span>
              </div>
              <ChevronDown className={`h-3 w-3 transition-transform ${showLogs ? 'rotate-180' : ''}`} />
            </button>
            
            {showLogs && (
              <div className="px-4 pb-3">
                <div className="max-h-48 overflow-y-auto bg-gray-900 dark:bg-gray-950 rounded-md p-2 space-y-0.5">
                  {syncProgress.logs.map((log, index) => (
                    <p key={index} className="text-[11px] font-mono text-gray-300 leading-relaxed break-words">
                      {log}
                    </p>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
