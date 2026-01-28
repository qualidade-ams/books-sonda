/**
 * Modal de progresso de sincronização
 */

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Database } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface SyncProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  resultado?: {
    sucesso: boolean;
    total_processados: number;
    novos: number;
    atualizados: number;
    erros: number;
    mensagens: string[];
    especialistas?: {
      sucesso: boolean;
      total_processados: number;
      novos: number;
      atualizados: number;
      removidos: number;
      erros: number;
      mensagens: string[];
    };
    apontamentos?: {
      sucesso: boolean;
      total_processados: number;
      novos: number;
      atualizados: number;
      erros: number;
      mensagens: string[];
    };
    tickets?: {
      sucesso: boolean;
      total_processados: number;
      novos: number;
      atualizados: number;
      erros: number;
      mensagens: string[];
    };
  };
}

export function SyncProgressModal({
  open,
  onOpenChange,
  isLoading,
  resultado
}: SyncProgressModalProps) {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('Iniciando sincronização...');
  const [processados, setProcessados] = useState(0);
  const [total, setTotal] = useState(0);

  // Atualizar progresso baseado no resultado
  useEffect(() => {
    if (isLoading) {
      // Resetar estado ao iniciar
      setProgress(0);
      setProcessados(0);
      setTotal(0);
      setCurrentMessage('Conectando ao SQL Server...');
      
      // Simular progresso suave para as 4 sincronizações
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 0.25;
        if (currentProgress <= 12) {
          setProgress(currentProgress);
          setCurrentMessage('Conectando ao SQL Server...');
        } else if (currentProgress <= 25) {
          setProgress(currentProgress);
          setCurrentMessage('Sincronizando pesquisas (AMSpesquisa)...');
        } else if (currentProgress <= 37) {
          setProgress(currentProgress);
          setCurrentMessage('Processando dados de pesquisas...');
        } else if (currentProgress <= 50) {
          setProgress(currentProgress);
          setCurrentMessage('Sincronizando especialistas (AMSespecialistas)...');
        } else if (currentProgress <= 62) {
          setProgress(currentProgress);
          setCurrentMessage('Processando dados de especialistas...');
        } else if (currentProgress <= 75) {
          setProgress(currentProgress);
          setCurrentMessage('Sincronizando apontamentos (AMSapontamento)...');
        } else if (currentProgress <= 87) {
          setProgress(currentProgress);
          setCurrentMessage('Processando dados de apontamentos...');
        } else if (currentProgress <= 95) {
          setProgress(currentProgress);
          setCurrentMessage('Sincronizando tickets (AMSticketsabertos)...');
        } else {
          setProgress(95);
          setCurrentMessage('Aguarde, quase concluído...');
        }
      }, 150);

      return () => clearInterval(interval);
    } else if (resultado) {
      // Ao concluir, mostrar 100% e dados finais
      setProgress(100);
      setProcessados(resultado.total_processados);
      setTotal(resultado.total_processados);
      setCurrentMessage('Sincronização concluída!');
    }
  }, [isLoading, resultado]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Sincronização SQL Server
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Sincronizando pesquisas, especialistas, apontamentos e tickets
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Barra de Progresso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Mensagem Atual */}
          {isLoading && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                  {currentMessage}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Aguarde enquanto processamos os dados...
                </p>
              </div>
            </div>
          )}

          {/* Resultado */}
          {!isLoading && resultado && (
            <div className="space-y-3">
              {/* Status */}
              <div className={`flex items-center gap-3 p-3 rounded-lg ${
                resultado.sucesso 
                  ? 'bg-green-50 dark:bg-green-950' 
                  : 'bg-red-50 dark:bg-red-950'
              }`}>
                {resultado.sucesso ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-900 dark:text-green-100 font-medium">
                      Sincronização concluída com sucesso!
                    </p>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-900 dark:text-red-100 font-medium">
                      Sincronização concluída com erros
                    </p>
                  </>
                )}
              </div>

              {/* Resumo das Pesquisas */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded-lg border-l-4 border-blue-600">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  📊 Pesquisas (AMSpesquisa)
                </p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-blue-600">{resultado.total_processados}</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Total</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{resultado.novos}</p>
                    <p className="text-xs text-green-700 dark:text-green-300">Novos</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-orange-600">{resultado.atualizados}</p>
                    <p className="text-xs text-orange-700 dark:text-orange-300">Atualizados</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-600">{resultado.erros}</p>
                    <p className="text-xs text-red-700 dark:text-red-300">Erros</p>
                  </div>
                </div>
              </div>

              {/* Resumo dos Especialistas */}
              {resultado.especialistas && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900 rounded-lg border-l-4 border-purple-600">
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">
                    👥 Especialistas (AMSespecialistas)
                  </p>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-purple-600">{resultado.especialistas.total_processados}</p>
                      <p className="text-xs text-purple-700 dark:text-purple-300">Total</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">{resultado.especialistas.novos}</p>
                      <p className="text-xs text-green-700 dark:text-green-300">Novos</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-orange-600">{resultado.especialistas.atualizados}</p>
                      <p className="text-xs text-orange-700 dark:text-orange-300">Atualizados</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-600">{resultado.especialistas.removidos}</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300">Removidos</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-600">{resultado.especialistas.erros}</p>
                      <p className="text-xs text-red-700 dark:text-red-300">Erros</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumo dos Apontamentos */}
              {resultado.apontamentos && (
                <div className="p-3 bg-teal-50 dark:bg-teal-900 rounded-lg border-l-4 border-teal-600">
                  <p className="text-sm font-medium text-teal-900 dark:text-teal-100 mb-1">
                    📝 Apontamentos (AMSapontamento)
                  </p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-teal-600">
                        {resultado.apontamentos.total_processados || 0}
                      </p>
                      <p className="text-xs text-teal-700 dark:text-teal-300">Total</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">
                        {resultado.apontamentos.novos || 0}
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300">Novos</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-orange-600">
                        {resultado.apontamentos.atualizados || 0}
                      </p>
                      <p className="text-xs text-orange-700 dark:text-orange-300">Atualizados</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-600">
                        {resultado.apontamentos.erros || 0}
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300">Erros</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumo dos Tickets */}
              {resultado.tickets && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900 rounded-lg border-l-4 border-indigo-600">
                  <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-1">
                    🎫 Tickets (AMSticketsabertos)
                  </p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-indigo-600">
                        {resultado.tickets.total_processados || 0}
                      </p>
                      <p className="text-xs text-indigo-700 dark:text-indigo-300">Total</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">
                        {resultado.tickets.novos || 0}
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300">Novos</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-orange-600">
                        {resultado.tickets.atualizados || 0}
                      </p>
                      <p className="text-xs text-orange-700 dark:text-orange-300">Atualizados</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-600">
                        {resultado.tickets.erros || 0}
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300">Erros</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mensagens */}
              {resultado.mensagens && resultado.mensagens.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium text-muted-foreground">Detalhes:</p>
                  {resultado.mensagens.map((msg, index) => (
                    <p key={index} className="text-xs text-muted-foreground pl-2">
                      • {msg}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
