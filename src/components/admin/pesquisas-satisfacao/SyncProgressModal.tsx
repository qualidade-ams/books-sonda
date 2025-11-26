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
      
      // Simular progresso suave
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 0.5;
        if (currentProgress <= 30) {
          setProgress(currentProgress);
          setCurrentMessage('Conectando ao SQL Server...');
        } else if (currentProgress <= 50) {
          setProgress(currentProgress);
          setCurrentMessage('Buscando registros...');
        } else if (currentProgress <= 90) {
          setProgress(currentProgress);
          setCurrentMessage('Processando dados...');
        } else {
          setProgress(90);
          setCurrentMessage('Sincronizando com Supabase...');
        }
      }, 100);

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

              {/* Resumo do Processamento */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border-l-4 border-blue-600">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Registros Processados
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {resultado.total_processados}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total de registros encontrados e processados
                </p>
              </div>

              {/* Estatísticas Detalhadas */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                  <p className="text-xs text-green-700 dark:text-green-300">Novos</p>
                  <p className="text-xl font-bold text-green-900 dark:text-green-100">
                    {resultado.novos}
                  </p>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg text-center">
                  <p className="text-xs text-blue-700 dark:text-blue-300">Atualizados</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    {resultado.atualizados}
                  </p>
                </div>
                <div className="p-2 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                  <p className="text-xs text-red-700 dark:text-red-300">Erros</p>
                  <p className="text-xl font-bold text-red-900 dark:text-red-100">
                    {resultado.erros}
                  </p>
                </div>
              </div>

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
