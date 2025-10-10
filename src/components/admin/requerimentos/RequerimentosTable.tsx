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
  AlertCircle
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
  selectedRequerimentos: string[];
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  showEnviarFaturamento?: boolean;
  showActions?: boolean;
}

const RequerimentosTable: React.FC<RequerimentosTableProps> = ({
  requerimentos,
  loading,
  onEdit,
  onDelete,
  selectedRequerimentos,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  showEnviarFaturamento = true,
  showActions = true,
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
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
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
              />
            </TableHead>
            <TableHead className="w-40">Chamado</TableHead>
            <TableHead className="w-40">Cliente</TableHead>
            <TableHead className="w-28 hidden md:table-cell">Módulo</TableHead>
            <TableHead className="w-22 hidden md:table-cell">Linguagem</TableHead>
            <TableHead className="w-20 text-center hidden lg:table-cell">H.Func</TableHead>
            <TableHead className="w-20 text-center hidden lg:table-cell">H.Téc</TableHead>
            <TableHead className="w-40 text-center">Total</TableHead>
            <TableHead className="w-24 text-center hidden xl:table-cell">Data Envio</TableHead>
            <TableHead className="w-24 text-center hidden xl:table-cell">Data Aprov.</TableHead>
            <TableHead className="w-28 text-center hidden 2xl:table-cell">Valor Total</TableHead>
            <TableHead className="w-24 text-center hidden 2xl:table-cell">Período de Cobrança</TableHead>
            <TableHead className="w-40 text-center hidden 2xl:table-cell">Autor</TableHead>
            {showActions && <TableHead className="w-24">Ações</TableHead>}
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
                <TableCell>
                  <Checkbox
                    checked={selectedRequerimentos.includes(requerimento.id)}
                    onCheckedChange={() => onToggleSelection(requerimento.id)}
                    aria-label={`Selecionar requerimento ${requerimento.chamado}`}
                  />
                </TableCell>

                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-base flex-shrink-0">{getCobrancaIcon(requerimento.tipo_cobranca)}</span>
                      <span className="truncate max-w-[80px]" title={requerimento.chamado}>
                        {requerimento.chamado}
                      </span>
                    </div>
                    <Badge className={`${getBadgeClasses(requerimento.tipo_cobranca)} text-xs px-2 py-1 mt-1 w-fit`}>
                      {requerimento.tipo_cobranca}
                    </Badge>
                    {/* Mostrar módulo e linguagem em telas pequenas */}
                    <div className="md:hidden mt-1 space-y-1">
                      <div className="text-xs text-gray-500">{requerimento.modulo}</div>
                      <div className="text-xs text-gray-500">{requerimento.linguagem}</div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium truncate max-w-[120px]" title={requerimento.cliente_nome}>
                      {requerimento.cliente_nome}
                    </span>
                    <span className="text-xs text-gray-500 truncate max-w-[120px]" title={requerimento.descricao}>
                      {requerimento.descricao}
                    </span>
                    {/* Mostrar horas em telas pequenas */}
                    <div className="lg:hidden mt-1">
                      <span className="text-xs text-gray-500">
                        F: {formatarHorasParaExibicao(requerimento.horas_funcional?.toString() || '0', 'HHMM')} |
                        T: {formatarHorasParaExibicao(requerimento.horas_tecnico?.toString() || '0', 'HHMM')}
                      </span>
                    </div>
                    {/* Mostrar datas em telas pequenas */}
                    <div className="xl:hidden mt-1">
                      <span className="text-xs text-gray-400">
                        {formatDate(requerimento.data_envio)}
                        {requerimento.data_aprovacao && ` | ${formatDate(requerimento.data_aprovacao)}`}
                      </span>
                    </div>

                  </div>
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-600">
                    {requerimento.modulo}
                  </Badge>
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className="text-xs text-purple-600 border-purple-600">
                    {requerimento.linguagem}
                  </Badge>
                </TableCell>

                <TableCell className="hidden lg:table-cell text-center">
                  <span className="text-sm font-medium">
                    {formatarHorasParaExibicao(requerimento.horas_funcional?.toString() || '0', 'HHMM')}
                  </span>
                </TableCell>

                <TableCell className="hidden lg:table-cell text-center">
                  <span className="text-sm font-medium">
                    {formatarHorasParaExibicao(requerimento.horas_tecnico?.toString() || '0', 'HHMM')}
                  </span>
                </TableCell>

                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatarHorasParaExibicao(horasTotal, 'HHMM')}
                    </span>
                    {requerimento.quantidade_tickets && requerimento.quantidade_tickets > 0 && (
                      <Badge variant="secondary" className="text-medium px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        🎫 {requerimento.quantidade_tickets} ticket{requerimento.quantidade_tickets > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell className="hidden xl:table-cell text-center text-sm text-gray-500">
                  {formatDate(requerimento.data_envio)}
                </TableCell>

                <TableCell className="hidden xl:table-cell text-center text-sm text-gray-500">
                  {requerimento.data_aprovacao ? formatDate(requerimento.data_aprovacao) : '-'}
                </TableCell>

                <TableCell className="hidden 2xl:table-cell text-center">
                  {valorTotal !== null ? (
                    <span className="text-sm font-medium text-green-600">
                      R$ {valorTotal.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  ) : (
                    '-'
                  )}
                  {/* Mostrar valor em telas pequenas */}
                  <div className="2xl:hidden mt-1">
                    {valorTotal !== null && (
                      <span className="text-xs text-green-600">
                        R$ {valorTotal.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="hidden 2xl:table-cell text-center text-sm text-gray-500">
                  {requerimento.mes_cobranca || '-'}
                </TableCell>

                <TableCell className="hidden 2xl:table-cell text-center text-sm text-gray-500">
                  {requerimento.autor_nome || '-'}
                </TableCell>

                {showActions && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {podeEditarRequerimento(requerimento) && (
                        <ProtectedAction screenKey="lancar_requerimentos" requiredLevel="edit">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(requerimento)}
                            className="h-8 w-8 p-0"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </ProtectedAction>
                      )}

                      {podeEditarRequerimento(requerimento) && (
                        <ProtectedAction screenKey="lancar_requerimentos" requiredLevel="edit">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(requerimento)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ProtectedAction>
                      )}

                      {showEnviarFaturamento && !requerimento.enviado_faturamento && podeEditarRequerimento(requerimento) && (
                        <AlertDialog
                          open={confirmDialogOpen === requerimento.id}
                          onOpenChange={(open) => setConfirmDialogOpen(open ? requerimento.id : null)}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={enviarParaFaturamento.isPending}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                              title="Enviar para Faturamento"
                            >
                              {enviarParaFaturamento.isPending ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                              ) : (
                                <Send className="h-4 w-4" />
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
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs py-0 px-2">
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