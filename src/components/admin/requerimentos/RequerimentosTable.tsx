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
  Send,
  Edit,
  Trash2,
  AlertCircle,
  Eye
} from 'lucide-react';
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
    <div className="rounded-md mt-4 overflow-x-auto w-full max-w-full">
      <Table className="min-w-full text-xs sm:text-sm lg:text-base">
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 sm:w-10 lg:w-14 text-xs sm:text-sm py-3">
              <Checkbox
                checked={selectedRequerimentos.length === requerimentos.length && requerimentos.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onSelectAll();
                  } else {
                    onClearSelection();
                  }
                }}
                aria-label="Selecionar todos os requerimentos"
                className="h-4 w-4 sm:h-5 sm:w-5"
              />
            </TableHead>
            <TableHead className="w-24 sm:w-28 lg:w-36 xl:w-44 text-xs sm:text-sm lg:text-base py-3">Chamado</TableHead>
            <TableHead className="w-24 sm:w-28 lg:w-36 xl:w-44 text-xs sm:text-sm lg:text-base py-3">Cliente</TableHead>
            <TableHead className="w-16 sm:w-20 lg:w-24 xl:w-32 text-xs sm:text-sm lg:text-base py-3">Módulo</TableHead>
            <TableHead className="w-14 sm:w-16 lg:w-20 xl:w-24 text-center text-xs sm:text-sm lg:text-base py-3">H.Func</TableHead>
            <TableHead className="w-14 sm:w-16 lg:w-20 xl:w-24 text-center text-xs sm:text-sm lg:text-base py-3">H.Téc</TableHead>
            <TableHead className="w-16 sm:w-20 lg:w-28 xl:w-44 text-center text-xs sm:text-sm lg:text-base py-3">Total</TableHead>
            <TableHead className="w-16 sm:w-20 lg:w-24 xl:w-28 text-center text-xs sm:text-sm lg:text-base py-3">Data Envio</TableHead>
            <TableHead className="w-16 sm:w-20 lg:w-24 xl:w-28 text-center text-xs sm:text-sm lg:text-base py-3">Data Aprov.</TableHead>
            {showDataFaturamento && (
              <TableHead className="w-16 sm:w-20 lg:w-24 xl:w-28 text-center text-xs sm:text-sm lg:text-base py-3">Data Faturamento</TableHead>
            )}
            <TableHead className="w-16 sm:w-20 lg:w-24 xl:w-32 text-center text-xs sm:text-sm lg:text-base py-3">Valor Total</TableHead>
            <TableHead className="w-14 sm:w-18 lg:w-22 xl:w-28 text-center text-xs sm:text-sm lg:text-base py-3">Período</TableHead>
            <TableHead className="w-16 sm:w-20 lg:w-28 xl:w-44 text-center text-xs sm:text-sm lg:text-base py-3">Autor</TableHead>
            {showActions && <TableHead className="w-16 sm:w-20 lg:w-24 xl:w-28 text-xs sm:text-sm lg:text-base py-3">Ações</TableHead>}
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
                <TableCell className="py-3">
                  <Checkbox
                    checked={selectedRequerimentos.includes(requerimento.id)}
                    onCheckedChange={() => onToggleSelection(requerimento.id)}
                    aria-label={`Selecionar requerimento ${requerimento.chamado}`}
                    className="h-4 w-4 sm:h-5 sm:w-5"
                  />
                </TableCell>

                <TableCell className="font-medium py-3">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-sm sm:text-base lg:text-lg flex-shrink-0">{getCobrancaIcon(requerimento.tipo_cobranca)}</span>
                    <div className="flex flex-col min-w-0 flex-1 space-y-1">
                      <span className="truncate text-xs sm:text-sm lg:text-base font-medium" title={requerimento.chamado}>
                        {requerimento.chamado}
                      </span>
                      <Badge className={`${getBadgeClasses(requerimento.tipo_cobranca)} text-[8px] sm:text-[10px] lg:text-xs px-1 sm:px-2 py-0.5 leading-tight w-fit max-w-full`}>
                        <span className="truncate">{requerimento.tipo_cobranca}</span>
                      </Badge>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="py-3">
                  <div className="flex flex-col min-w-0 space-y-1">
                    <span className="font-medium truncate text-xs sm:text-sm lg:text-base" title={requerimento.cliente_nome}>
                      {requerimento.cliente_nome}
                    </span>
                    <span className="text-[10px] sm:text-xs lg:text-sm text-gray-500 truncate" title={requerimento.descricao}>
                      {requerimento.descricao}
                    </span>
                  </div>
                </TableCell>

                <TableCell className="py-3">
                  <Badge variant="outline" className="text-[8px] sm:text-[10px] lg:text-xs text-blue-600 border-blue-600 px-1 sm:px-2 py-0.5 leading-tight">
                    <span className="truncate">{requerimento.modulo}</span>
                  </Badge>
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

                <TableCell className="text-center text-[10px] sm:text-xs lg:text-sm text-gray-500 py-3">
                  <span className="truncate" title={requerimento.autor_nome}>
                    {requerimento.autor_nome || '-'}
                  </span>
                </TableCell>

                {showActions && (
                  <TableCell className="py-3">
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