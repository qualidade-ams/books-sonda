import { useState, memo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Send,
  Edit,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Requerimento } from '@/types/requerimentos';
import { getBadgeClasses, getCobrancaIcon } from '@/utils/requerimentosColors';
import { useEnviarParaFaturamento } from '@/hooks/useRequerimentos';
import { useAccessibility } from '@/hooks/useAccessibility';
import { formatarHorasParaExibicao } from '@/utils/horasUtils';

interface RequerimentoCardProps {
  requerimento: Requerimento;
  onEdit?: (requerimento: Requerimento) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  showEnviarFaturamento?: boolean;
  isLoading?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

const RequerimentoCardComponent = function RequerimentoCard({
  requerimento,
  onEdit,
  onDelete,
  showActions = true,
  showEnviarFaturamento = true,
  isLoading = false,
  isSelected = false,
  onToggleSelection
}: RequerimentoCardProps) {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const enviarParaFaturamento = useEnviarParaFaturamento();
  const { screenReader } = useAccessibility();

  // Formatação de datas
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  // Handler para enviar para faturamento
  const handleEnviarFaturamento = async () => {
    try {
      screenReader.announceLoading('Enviando requerimento para faturamento...');
      await enviarParaFaturamento.mutateAsync(requerimento.id);
      setIsConfirmDialogOpen(false);
      screenReader.announceSuccess(`Requerimento ${requerimento.chamado} enviado para faturamento`);
    } catch (error) {
      console.error('Erro ao enviar para faturamento:', error);
      screenReader.announceError('Erro ao enviar requerimento para faturamento');
    }
  };

  // Classes CSS baseadas no tipo de cobrança
  const badgeClasses = getBadgeClasses(requerimento.tipo_cobranca);
  const icon = getCobrancaIcon(requerimento.tipo_cobranca);

  return (
    <TooltipProvider>
      {/* Layout horizontal em linha - sem card */}
      <div
        className={`${isLoading ? 'opacity-50 pointer-events-none' : ''} relative py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200 border-b border-gray-100 dark:border-gray-800`}
        role="article"
        aria-label={`Requerimento ${requerimento.chamado} - ${requerimento.cliente_nome}`}
      >
        {/* Layout horizontal em flex - alinhado com cabeçalho */}
        <div className="flex items-center text-sm px-3">
          {/* Checkbox - 5% */}
          <div className="w-[5%] text-center pr-1">
            {onToggleSelection && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggleSelection}
                aria-label={`Selecionar requerimento ${requerimento.chamado}`}
              />
            )}
          </div>

          {/* Tipo + Chamado - 16% */}
          <div className="w-[16%] flex items-center gap-1 min-w-0 pr-2">
            <span className="text-base flex-shrink-0">{icon}</span>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate text-xs">{requerimento.chamado}</div>
              <Badge className={`${badgeClasses} text-xs px-1 py-0 mt-1`}>
                {requerimento.tipo_cobranca}
                {requerimento.tipo_cobranca === 'Banco de Horas' && requerimento.tem_ticket && (
                  <span className="ml-1" title={`${requerimento.quantidade_tickets} tickets`}>
                    🎫
                  </span>
                )}
              </Badge>
            </div>
          </div>

          {/* Cliente - 24% */}
          <div className="w-[24%] min-w-0 pr-2">
            <div className="truncate font-medium text-xs">{requerimento.cliente_nome}</div>
            <div className="text-xs text-gray-500 truncate">{requerimento.descricao}</div>
          </div>

          {/* Módulo - 8% */}
          <div className="w-[8%] text-center min-w-0 pr-1">
            <div className="truncate text-xs">{requerimento.modulo}</div>
          </div>

          {/* Linguagem - 8% */}
          <div className="w-[8%] text-center min-w-0 pr-1">
            <div className="truncate text-xs">{requerimento.linguagem}</div>
          </div>

          {/* Horas Func. - 7% */}
          <div className="w-[7%] text-center pr-1">
            <div className="text-xs">
              {formatarHorasParaExibicao(requerimento.horas_funcional?.toString() || '0', 'HHMM')}
            </div>
          </div>

          {/* Horas Téc. - 7% */}
          <div className="w-[7%] text-center pr-1">
            <div className="text-xs">
              {formatarHorasParaExibicao(requerimento.horas_tecnico?.toString() || '0', 'HHMM')}
            </div>
          </div>

          {/* Total - 6% */}
          <div className="w-[6%] text-center font-medium pr-1">
            <div className="text-xs">
              {formatarHorasParaExibicao(requerimento.horas_total?.toString() || '0', 'HHMM')}
            </div>
          </div>

          {/* Data Envio - 9% */}
          <div className="w-[9%] text-center pr-1">
            <div className="text-xs">{formatDate(requerimento.data_envio)}</div>
          </div>

          {/* Ações - 10% */}
          <div className="w-[10%] flex justify-center gap-1">
            {showActions && (
              <>
                {/* Botão Editar */}
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(requerimento)}
                    disabled={isLoading}
                    aria-label={`Editar requerimento ${requerimento.chamado}`}
                    className="h-6 w-6 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}

                {/* Botão Deletar */}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(requerimento.id)}
                    disabled={isLoading}
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    aria-label={`Deletar requerimento ${requerimento.chamado}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}

                {/* Botão Enviar para Faturamento */}
                {showEnviarFaturamento && !requerimento.enviado_faturamento && (
                  <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isLoading || enviarParaFaturamento.isPending}
                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                      >
                        {enviarParaFaturamento.isPending ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                          Confirmar Envio para Faturamento
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja enviar o requerimento <strong>{requerimento.chamado}</strong> para faturamento?
                          <br /><br />
                          Esta ação não pode ser desfeita e o requerimento será movido para a tela de faturamento.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={enviarParaFaturamento.isPending}>
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleEnviarFaturamento}
                          disabled={enviarParaFaturamento.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {enviarParaFaturamento.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Enviando...
                            </>
                          ) : (
                            'Confirmar Envio'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Indicador de já enviado */}
                {requerimento.enviado_faturamento && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs py-0">
                    ✓
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

// Memoize o componente para otimização de performance
export const RequerimentoCard = memo(RequerimentoCardComponent);
export default RequerimentoCard;