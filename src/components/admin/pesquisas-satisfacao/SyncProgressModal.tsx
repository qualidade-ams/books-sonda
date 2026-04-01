/**
 * Modal de progresso de sincronização
 */

import { useEffect, useState, useRef } from 'react';
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
  tabelasSelecionadas?: {
    pesquisas: boolean;
    especialistas: boolean;
    apontamentos: boolean;
    tickets: boolean;
  };
  resultado?: {
    sucesso: boolean;
    total_processados: number;
    novos: number;
    atualizados: number;
    erros: number;
    mensagens: string[];
    totais_reais_banco?: {
      pesquisas: number;
      especialistas: number;
      apontamentos: number;
      tickets: number;
    };
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
  tabelasSelecionadas,
  resultado
}: SyncProgressModalProps) {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('Iniciando sincronização...');
  const [processados, setProcessados] = useState(0);
  const [total, setTotal] = useState(0);

  // Gerar descrição dinâmica baseada nas tabelas selecionadas
  const gerarDescricaoSincronizacao = () => {
    if (!tabelasSelecionadas) {
      return 'Sincronizando pesquisas, especialistas, apontamentos e tickets';
    }

    const tabelasAtivas = [];
    if (tabelasSelecionadas.pesquisas) tabelasAtivas.push('pesquisas');
    if (tabelasSelecionadas.especialistas) tabelasAtivas.push('especialistas');
    if (tabelasSelecionadas.apontamentos) tabelasAtivas.push('apontamentos');
    if (tabelasSelecionadas.tickets) tabelasAtivas.push('tickets');

    if (tabelasAtivas.length === 0) {
      return 'Nenhuma tabela selecionada';
    }

    if (tabelasAtivas.length === 1) {
      return `Sincronizando ${tabelasAtivas[0]}`;
    }

    if (tabelasAtivas.length === 2) {
      return `Sincronizando ${tabelasAtivas[0]} e ${tabelasAtivas[1]}`;
    }

    const ultimaTabela = tabelasAtivas.pop();
    return `Sincronizando ${tabelasAtivas.join(', ')} e ${ultimaTabela}`;
  };

  // Gerar mensagens de progresso dinâmicas
  const gerarMensagensProgresso = () => {
    if (!tabelasSelecionadas) {
      return [
        'Conectando ao SQL Server...',
        'Sincronizando pesquisas (AMSpesquisa)...',
        'Processando dados de pesquisas...',
        'Sincronizando especialistas (AMSespecialistas)...',
        'Processando dados de especialistas...',
        'Sincronizando apontamentos (AMSapontamento)...',
        'Processando dados de apontamentos...',
        'Sincronizando tickets (AMSticketsabertos)...',
        'Aguarde, quase concluído...'
      ];
    }

    const mensagens = ['Conectando ao SQL Server...'];
    
    if (tabelasSelecionadas.pesquisas) {
      mensagens.push('Sincronizando pesquisas (AMSpesquisa)...');
      mensagens.push('Processando dados de pesquisas...');
    }
    
    if (tabelasSelecionadas.especialistas) {
      mensagens.push('Sincronizando especialistas (AMSespecialistas)...');
      mensagens.push('Processando dados de especialistas...');
    }
    
    if (tabelasSelecionadas.apontamentos) {
      mensagens.push('Sincronizando apontamentos (AMSapontamento)...');
      mensagens.push('Processando dados de apontamentos...');
    }
    
    if (tabelasSelecionadas.tickets) {
      mensagens.push('Sincronizando tickets (AMSticketsabertos)...');
      mensagens.push('Processando dados de tickets...');
    }
    
    mensagens.push('Aguarde, quase concluído...');
    return mensagens;
  };

  // Atualizar progresso baseado no resultado
  useEffect(() => {
    if (isLoading) {
      // Resetar estado ao iniciar
      setProgress(0);
      setProcessados(0);
      setTotal(0);
      setCurrentMessage('Conectando ao SQL Server...');
      
      // Gerar mensagens dinâmicas baseadas nas tabelas selecionadas
      const mensagensProgresso = gerarMensagensProgresso();
      const totalMensagens = mensagensProgresso.length;
      
      // Simular progresso suave baseado no número de tabelas selecionadas
      let currentProgress = 0;
      let mensagemIndex = 0;
      
      const interval = setInterval(() => {
        const incremento = 95 / (totalMensagens * 8); // Dividir 95% pelo número total de steps
        currentProgress += incremento;
        
        // Atualizar mensagem baseada no progresso
        const novoIndex = Math.floor((currentProgress / 95) * totalMensagens);
        if (novoIndex < totalMensagens && novoIndex !== mensagemIndex) {
          mensagemIndex = novoIndex;
          const novaMensagem = mensagensProgresso[mensagemIndex];
          setCurrentMessage(novaMensagem);
        }
        
        if (currentProgress >= 95) {
          setProgress(95);
          setCurrentMessage('Aguarde, quase concluído...');
        } else {
          setProgress(currentProgress);
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
  }, [isLoading, resultado, tabelasSelecionadas]);

  // Helper para renderizar linha de stats de forma consistente
  const StatItem = ({ value, label, color }: { value: number | string; label: string; color: string }) => (
    <div className="flex flex-col items-center min-w-0">
      <p className={`text-base font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">{label}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Sincronização SQL Server
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {gerarDescricaoSincronizacao()}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
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

              {/* Pesquisas */}
              {(!tabelasSelecionadas || tabelasSelecionadas.pesquisas) && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded-lg border-l-4 border-blue-600">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    📊 Pesquisas (AMSpesquisa)
                  </p>
                  <div className="flex items-start justify-between gap-2">
                    <StatItem
                      value={resultado.totais_reais_banco?.pesquisas ?? resultado.total_processados}
                      label={resultado.totais_reais_banco ? 'Total no Banco' : 'Total'}
                      color="text-blue-600"
                    />
                    <StatItem value={resultado.novos} label="Novos" color="text-green-600" />
                    <StatItem value={resultado.atualizados} label="Atualizados" color="text-orange-600" />
                    <StatItem value={resultado.erros} label="Erros" color="text-red-600" />
                  </div>
                  {resultado.totais_reais_banco && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 text-center">
                      Processados nesta sincronização: {resultado.total_processados}
                    </p>
                  )}
                </div>
              )}

              {/* Especialistas */}
              {resultado.especialistas && (!tabelasSelecionadas || tabelasSelecionadas.especialistas) && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900 rounded-lg border-l-4 border-purple-600">
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
                    👥 Especialistas (AMSespecialistas)
                  </p>
                  <div className="flex items-start justify-between gap-2">
                    <StatItem
                      value={resultado.totais_reais_banco?.especialistas ?? resultado.especialistas.total_processados}
                      label={resultado.totais_reais_banco ? 'Total no Banco' : 'Total'}
                      color="text-purple-600"
                    />
                    <StatItem value={resultado.especialistas.novos} label="Novos" color="text-green-600" />
                    <StatItem value={resultado.especialistas.atualizados} label="Atualizados" color="text-orange-600" />
                    <StatItem value={resultado.especialistas.removidos} label="Removidos" color="text-gray-600" />
                    <StatItem value={resultado.especialistas.erros} label="Erros" color="text-red-600" />
                  </div>
                  {resultado.totais_reais_banco && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 text-center">
                      Processados nesta sincronização: {resultado.especialistas.total_processados}
                    </p>
                  )}
                </div>
              )}

              {/* Apontamentos */}
              {resultado.apontamentos && (!tabelasSelecionadas || tabelasSelecionadas.apontamentos) && (
                <div className="p-3 bg-teal-50 dark:bg-teal-900 rounded-lg border-l-4 border-teal-600">
                  <p className="text-sm font-medium text-teal-900 dark:text-teal-100 mb-2">
                    📝 Apontamentos (AMSapontamento)
                  </p>
                  <div className="flex items-start justify-between gap-2">
                    <StatItem
                      value={resultado.totais_reais_banco?.apontamentos ?? resultado.apontamentos.total_processados ?? 0}
                      label={resultado.totais_reais_banco ? 'Total no Banco' : 'Total'}
                      color="text-teal-600"
                    />
                    <StatItem value={resultado.apontamentos.novos ?? 0} label="Novos" color="text-green-600" />
                    <StatItem value={resultado.apontamentos.atualizados ?? 0} label="Atualizados" color="text-orange-600" />
                    <StatItem value={resultado.apontamentos.erros ?? 0} label="Erros" color="text-red-600" />
                  </div>
                  {resultado.totais_reais_banco && (
                    <p className="text-xs text-teal-600 dark:text-teal-400 mt-2 text-center">
                      Processados nesta sincronização: {resultado.apontamentos.total_processados ?? 0}
                    </p>
                  )}
                </div>
              )}

              {/* Tickets */}
              {resultado.tickets && (!tabelasSelecionadas || tabelasSelecionadas.tickets) && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900 rounded-lg border-l-4 border-indigo-600">
                  <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-2">
                    🎫 Tickets (AMSticketsabertos)
                  </p>
                  <div className="flex items-start justify-between gap-2">
                    <StatItem
                      value={resultado.totais_reais_banco?.tickets ?? resultado.tickets.total_processados ?? 0}
                      label={resultado.totais_reais_banco ? 'Total no Banco' : 'Total'}
                      color="text-indigo-600"
                    />
                    <StatItem value={resultado.tickets.novos ?? 0} label="Novos" color="text-green-600" />
                    <StatItem value={resultado.tickets.atualizados ?? 0} label="Atualizados" color="text-orange-600" />
                    <StatItem value={resultado.tickets.erros ?? 0} label="Erros" color="text-red-600" />
                  </div>
                  {resultado.totais_reais_banco && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 text-center">
                      Processados nesta sincronização: {resultado.tickets.total_processados ?? 0}
                    </p>
                  )}
                </div>
              )}

              {/* Detalhes de erro */}
              {resultado.mensagens && resultado.mensagens.length > 0 && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium text-muted-foreground">Detalhes</p>
                  </div>
                  <div className="max-h-36 overflow-y-auto p-3 space-y-1">
                    {resultado.mensagens.map((msg, index) => (
                      <p key={index} className="text-xs text-muted-foreground break-words">
                        • {msg}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
