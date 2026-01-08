import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Send,
  Edit,
  Trash2,
  AlertCircle,
  Eye
} from 'lucide-react';
import { ClienteNomeDisplay } from '@/components/admin/requerimentos/ClienteNomeDisplay';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ProtectedAction from '@/components/auth/ProtectedAction';
import { Requerimento } from '@/types/requerimentos';
import { getBadgeClasses, getCobrancaIcon } from '@/utils/requerimentosColors';
import { useEnviarParaFaturamento } from '@/hooks/useRequerimentos';
import { useAccessibility } from '@/hooks/useAccessibility';
import { formatarHorasParaExibicao, somarHoras, converterParaHorasDecimal } from '@/utils/horasUtils';
import { requerValorHora } from '@/types/requerimentos';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';

interface RequerimentosTableProps {
  requerimentos: Requerimento[];
  loading: boolean;
  onEdit: (requerimento: Requerimento) => void;
  onDelete: (requerimento: Requerimento) => void;
  onView?: (requerimento: Requerimento) => void;
  selectedRequerimentos: string[];
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  showEnviarFaturamento?: boolean;
  showActions?: boolean;
  showEditDelete?: boolean; // Nova prop para controlar botões de editar/excluir
  showDataFaturamento?: boolean; // Nova prop para controlar coluna Data Faturamento
  totalFilteredCount?: number; // Total de requerimentos filtrados (para checkbox "selecionar todos")
}

const RequerimentosTable: React.FC<RequerimentosTableProps> = ({
  requerimentos,
  loading,
  onEdit,
  onDelete,
  onView,
  selectedRequerimentos,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  showEnviarFaturamento = true,
  showActions = true,
  showEditDelete = true, // Por padrão, mostra botões de editar/excluir
  showDataFaturamento = false, // Por padrão, não mostra coluna Data Faturamento
  totalFilteredCount, // Total de requerimentos filtrados
}) => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<string | null>(null);
  const enviarParaFaturamento = useEnviarParaFaturamento();
  const { screenReader } = useAccessibility();
  const { user } = useAuth();
  const { userGroup } = usePermissions();

  // Função para verificar se o usuário pode editar um requerimento
  const podeEditarRequerimento = (requerimento: Requerimento): boolean => {
    // Se não há usuário logado, não pode editar
    if (!user?.id) return false;

    // Se é administrador, pode editar todos
    if (userGroup?.name?.toLowerCase().includes('administrador') ||
      userGroup?.name?.toLowerCase().includes('admin')) {
      return true;
    }

    // Se o requerimento não tem autor definido (requerimentos antigos), 
    // só administradores podem editar
    if (!requerimento.autor_id) {
      return false;
    }

    // Se é o autor do requerimento, pode editar
    return String(requerimento.autor_id) === String(user.id);
  };

  // Formatação de datas - corrige problema de timezone
  const formatDate = (dateString: string) => {
    try {
      // Se a data está no formato YYYY-MM-DD, trata como data local
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return format(date, 'dd/MM/yyyy', { locale: ptBR });
      }
      // Para outros formatos, usa o comportamento padrão
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  // Handler para enviar para faturamento
  const handleEnviarFaturamento = async (requerimento: Requerimento) => {
    try {
      screenReader.announceLoading('Enviando requerimento para faturamento...');
      await enviarParaFaturamento.mutateAsync(requerimento.id);
      setConfirmDialogOpen(null);
      screenReader.announceSuccess(`Requerimento ${requerimento.chamado} enviado para faturamento`);
    } catch (error) {
      console.error('Erro ao enviar para faturamento:', error);
      screenReader.announceError('Erro ao enviar requerimento para faturamento');
    }
  };

  // Calcular horas total
  const calcularHorasTotal = (requerimento: Requerimento) => {
    try {
      const horasFuncional = requerimento.horas_funcional?.toString() || '0';
      const horasTecnico = requerimento.horas_tecnico?.toString() || '0';

      if (!horasFuncional || horasFuncional === 'null' || horasFuncional === 'undefined') {
        return '0';
      }

      if (!horasTecnico || horasTecnico === 'null' || horasTecnico === 'undefined') {
        return '0';
      }

      const resultado = somarHoras(horasFuncional, horasTecnico);

      if (!resultado || resultado === 'NaN' || resultado.includes('NaN')) {
        return '0';
      }

      return resultado;
    } catch (error) {
      console.error('Erro ao calcular horas total:', error);
      return '0';
    }
  };

  // Calcular valor total
  const calcularValorTotal = (requerimento: Requerimento) => {
    try {
      if (!requerValorHora(requerimento.tipo_cobranca)) {
        return null;
      }

      const horasFuncionalStr = requerimento.horas_funcional?.toString() || '0';
      const horasTecnicoStr = requerimento.horas_tecnico?.toString() || '0';

      if (horasFuncionalStr === 'null' || horasFuncionalStr === 'undefined' || horasFuncionalStr === 'NaN') {
        return null;
      }

      if (horasTecnicoStr === 'null' || horasTecnicoStr === 'undefined' || horasTecnicoStr === 'NaN') {
        return null;
      }

      const horasFuncionalDecimal = converterParaHorasDecimal(horasFuncionalStr);
      const horasTecnicoDecimal = converterParaHorasDecimal(horasTecnicoStr);

      if (isNaN(horasFuncionalDecimal) || isNaN(horasTecnicoDecimal)) {
        return null;
      }

      const valorFuncional = (requerimento.valor_hora_funcional || 0) * horasFuncionalDecimal;
      const valorTecnico = (requerimento.valor_hora_tecnico || 0) * horasTecnicoDecimal;

      const total = valorFuncional + valorTecnico;

      if (isNaN(total)) {
        return null;
      }

      return total;
    } catch (error) {
      console.error('Erro ao calcular valor total:', error);
      return null;
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Carregando requerimentos...</div>
      </div>
    );
  }

  if (requerimentos.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Nenhum requerimento encontrado</div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full text-xs sm:text-sm min-w-[1400px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-xs py-2">
              <Checkbox
                checked={selectedRequerimentos.length > 0 && selectedRequerimentos.length === (totalFilteredCount || requerimentos.length)}
                ref={(el) => {
                  if (el) {
                    // Estado indeterminado quando alguns (mas não todos) estão selecionados
                    const totalCount = totalFilteredCount || requerimentos.length;
                    el.indeterminate = selectedRequerimentos.length > 0 && selectedRequerimentos.length < totalCount;
                  }
                }}
                onCheckedChange={(checked) => {
                  const totalCount = totalFilteredCount || requerimentos.length;
                  if (checked || selectedRequerimentos.length < totalCount) {
                    // Se está marcando OU se nem todos estão selecionados, selecionar todos
                    onSelectAll();
                  } else {
                    // Se está desmarcando E todos estão selecionados, limpar seleção
                    onClearSelection();
                  }
                }}
                aria-label="Selecionar todos os requerimentos"
                className="h-4 w-4"
              />
            </TableHead>
            <TableHead className="min-w-[140px] text-center text-xs sm:text-sm py-2">Chamado</TableHead>
            <TableHead className="min-w-[160px] text-center text-xs sm:text-sm py-2">Cliente</TableHead>
            <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">Módulo</TableHead>
            <TableHead className="min-w-[80px] text-center text-xs sm:text-sm py-2">H.Func</TableHead>
            <TableHead className="min-w-[80px] text-center text-xs sm:text-sm py-2">H.Téc</TableHead>
            <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">Total</TableHead>
            <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">Data Envio</TableHead>
            <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">Data Aprovação</TableHead>
            {showDataFaturamento && (
              <TableHead className="min-w-[120px] text-center text-xs sm:text-sm py-2">Data Faturamento</TableHead>
            )}
            <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">Valor Total</TableHead>
            <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">Período</TableHead>
            {showActions && (
              <TableHead className="w-40 text-xs sm:text-sm py-2">
                Ações
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requerimentos.map((requerimento) => {
            const horasTotal = calcularHorasTotal(requerimento);
            const valorTotal = calcularValorTotal(requerimento);

            const isOwnRequerimento = requerimento.autor_id && String(requerimento.autor_id) === String(user?.id);

            return (
              <TableRow
                key={requerimento.id}
                className={isOwnRequerimento ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                style={isOwnRequerimento ? { borderLeft: '4px solid #3B82F6' } : {}}
              >
                <TableCell className="py-2">
                  <Checkbox
                    checked={selectedRequerimentos.includes(requerimento.id)}
                    onCheckedChange={() => onToggleSelection(requerimento.id)}
                    aria-label={`Selecionar requerimento ${requerimento.chamado}`}
                    className="h-4 w-4"
                  />
                </TableCell>

                <TableCell className="font-medium py-2 text-center">
                  <div className="flex flex-col items-center gap-1 sm:gap-2">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="text-sm sm:text-base lg:text-lg flex-shrink-0">{getCobrancaIcon(requerimento.tipo_cobranca)}</span>
                      <span className="truncate text-xs sm:text-sm lg:text-base font-medium" title={requerimento.chamado}>
                        {requerimento.chamado}
                      </span>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block">
                            <Badge className={`${getBadgeClasses(requerimento.tipo_cobranca)} text-[7px] sm:text-[9px] lg:text-[10px] px-1 sm:px-1.5 py-0.5 leading-tight w-fit max-w-full cursor-help`}>
                              <span className="truncate">{requerimento.tipo_cobranca}</span>
                            </Badge>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{requerimento.tipo_cobranca}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="xl:hidden text-[9px] text-gray-500 truncate" title={requerimento.autor_nome}>
                      {requerimento.autor_nome || '-'}
                    </span>
                  </div>
                </TableCell>

                <TableCell className="py-2 text-center max-w-[120px]">
                  <ClienteNomeDisplay
                    nomeEmpresa={requerimento.cliente_nome}
                    className="font-medium break-words whitespace-normal leading-tight text-[10px] sm:text-xs lg:text-sm"
                  />
                </TableCell>

                <TableCell className="py-3">
                  <div className="flex flex-col items-center gap-1">
                    <Badge variant="outline" className="text-[8px] sm:text-[10px] lg:text-xs text-blue-600 border-blue-600 px-1 sm:px-2 py-0.5 leading-tight w-fit">
                      <span className="truncate">{requerimento.modulo}</span>
                    </Badge>
                    {requerimento.autor_nome && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[9px] sm:text-[10px] text-gray-500 truncate cursor-help">
                              {(() => {
                                const nomes = requerimento.autor_nome.split(' ');
                                if (nomes.length === 1) return nomes[0];
                                return `${nomes[0]} ${nomes[nomes.length - 1]}`;
                              })()}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{requerimento.autor_nome}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-center py-3">
                  <span className="text-xs sm:text-sm lg:text-base font-medium">
                    {formatarHorasParaExibicao(requerimento.horas_funcional?.toString() || '0', 'HHMM')}
                  </span>
                </TableCell>

                <TableCell className="text-center py-3">
                  <span className="text-xs sm:text-sm lg:text-base font-medium">
                    {formatarHorasParaExibicao(requerimento.horas_tecnico?.toString() || '0', 'HHMM')}
                  </span>
                </TableCell>

                <TableCell className="text-center py-3">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs sm:text-sm lg:text-base font-bold text-gray-900 dark:text-white">
                      {formatarHorasParaExibicao(horasTotal, 'HHMM')}
                    </span>
                    {requerimento.quantidade_tickets && requerimento.quantidade_tickets > 0 && (
                      <Badge variant="secondary" className="text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 leading-tight bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        🎫 {requerimento.quantidade_tickets} {requerimento.quantidade_tickets === 1 ? 'ticket' : 'tickets'}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-center text-[10px] sm:text-xs lg:text-sm text-gray-500 py-3">
                  {formatDate(requerimento.data_envio)}
                </TableCell>

                <TableCell className="text-center text-[10px] sm:text-xs lg:text-sm text-gray-500 py-3">
                  {requerimento.data_aprovacao ? formatDate(requerimento.data_aprovacao) : '-'}
                </TableCell>

                {showDataFaturamento && (
                  <TableCell className="text-center text-[10px] sm:text-xs lg:text-sm text-gray-500 py-3">
                    {requerimento.data_faturamento ? formatDate(requerimento.data_faturamento) : '-'}
                  </TableCell>
                )}

                <TableCell className="text-center py-3">
                  {valorTotal !== null ? (
                    <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-green-600">
                      R$ {valorTotal.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  ) : (
                    <span className="text-[10px] sm:text-xs lg:text-sm">-</span>
                  )}
                </TableCell>

                <TableCell className="text-center text-[10px] sm:text-xs lg:text-sm text-gray-500 py-3">
                  {requerimento.mes_cobranca || '-'}
                </TableCell>

                {showActions && (
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1">
                      {onView && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onView(requerimento)}
                          className="h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 p-0 text-blue-600 hover:text-blue-800"
                          title="Visualizar"
                        >
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                        </Button>
                      )}

                      {showEditDelete && podeEditarRequerimento(requerimento) && (
                        <ProtectedAction screenKey="lancar_requerimentos" requiredLevel="edit">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(requerimento)}
                            className="h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 p-0"
                            title="Editar"
                          >
                            <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                          </Button>
                        </ProtectedAction>
                      )}

                      {showEditDelete && podeEditarRequerimento(requerimento) && (
                        <ProtectedAction screenKey="lancar_requerimentos" requiredLevel="edit">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(requerimento)}
                            className="h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 p-0 text-red-600 hover:text-red-800"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                          </Button>
                        </ProtectedAction>
                      )}

                      {showEditDelete && showEnviarFaturamento && !requerimento.enviado_faturamento && podeEditarRequerimento(requerimento) && (
                        <AlertDialog
                          open={confirmDialogOpen === requerimento.id}
                          onOpenChange={(open) => setConfirmDialogOpen(open ? requerimento.id : null)}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={enviarParaFaturamento.isPending}
                              className="h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 p-0 text-blue-600 hover:text-blue-800"
                              title="Enviar para Faturamento"
                            >
                              {enviarParaFaturamento.isPending ? (
                                <div className="animate-spin rounded-full h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 border-b-2 border-blue-600" />
                              ) : (
                                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
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
                                onClick={() => handleEnviarFaturamento(requerimento)}
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

                      {requerimento.enviado_faturamento && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-[8px] sm:text-[10px] lg:text-xs py-0.5 px-1 sm:px-2">
                          ✓
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default RequerimentosTable;