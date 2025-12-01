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
  AlertCircle,
  XCircle
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
import { Requerimento } from '@/types/requerimentos';
import { getBadgeClasses, getCobrancaIcon } from '@/utils/requerimentosColors';
import { formatarHorasParaExibicao, somarHoras, converterParaHorasDecimal } from '@/utils/horasUtils';
import { requerValorHora } from '@/types/requerimentos';
import { useState } from 'react';

interface RequerimentosTableFaturamentoProps {
  requerimentos: Requerimento[];
  loading: boolean;
  onRejeitar: (requerimento: Requerimento) => void;
  selectedRequerimentos: string[];
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

const RequerimentosTableFaturamento: React.FC<RequerimentosTableFaturamentoProps> = ({
  requerimentos,
  loading,
  onRejeitar,
  selectedRequerimentos,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
}) => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<string | null>(null);

  // Formatar data
  const formatDate = (dateString: string) => {
    try {
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return format(date, 'dd/MM/yyyy', { locale: ptBR });
      }
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  // Calcular horas total
  const calcularHorasTotal = (requerimento: Requerimento) => {
    try {
      const horasFuncional = requerimento.horas_funcional?.toString() || '0';
      const horasTecnico = requerimento.horas_tecnico?.toString() || '0';

      if (horasFuncional === 'null' || horasFuncional === 'undefined' || horasFuncional === 'NaN') {
        return '0';
      }

      if (horasTecnico === 'null' || horasTecnico === 'undefined' || horasTecnico === 'NaN') {
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

  // Verificar se deve mostrar descrição (apenas para tipos específicos)
  const deveMostrarDescricao = (tipoCobranca: string) => {
    return ['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'].includes(tipoCobranca);
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
                checked={selectedRequerimentos.length === requerimentos.length && requerimentos.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onSelectAll();
                  } else {
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
            <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">Valor Total</TableHead>
            <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">Período</TableHead>
            <TableHead className="min-w-[200px] text-center text-xs sm:text-sm py-2">Descrição</TableHead>
            <TableHead className="w-40 text-xs sm:text-sm py-2">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requerimentos.map((requerimento) => {
            const horasTotal = calcularHorasTotal(requerimento);
            const valorTotal = calcularValorTotal(requerimento);
            const mostrarDescricao = deveMostrarDescricao(requerimento.tipo_cobranca);

            return (
              <TableRow key={requerimento.id}>
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
                  </div>
                </TableCell>

                <TableCell className="py-2 text-center max-w-[120px]">
                  <div className="font-medium break-words whitespace-normal leading-tight text-[10px] sm:text-xs lg:text-sm" title={requerimento.cliente_nome}>
                    {requerimento.cliente_nome}
                  </div>
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

                <TableCell className="py-3 max-w-[200px]">
                  {mostrarDescricao ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300 line-clamp-2 cursor-help">
                            {requerimento.descricao || '-'}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md">
                          <p className="whitespace-pre-wrap">{requerimento.descricao || '-'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-[10px] sm:text-xs text-gray-400">-</span>
                  )}
                </TableCell>

                <TableCell className="py-2">
                  <div className="flex items-center justify-center gap-1">
                    <AlertDialog
                      open={confirmDialogOpen === requerimento.id}
                      onOpenChange={(open) => setConfirmDialogOpen(open ? requerimento.id : null)}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                          title="Rejeitar requerimento"
                        >
                          <XCircle className="h-3.5 w-3.5 xl:mr-0.5" />
                          <span className="hidden xl:inline">Rejeitar</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            Rejeitar Requerimento
                          </AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>Tem certeza que deseja rejeitar este requerimento?</p>
                            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md space-y-1 text-sm">
                              <p><strong>Chamado:</strong> {requerimento.chamado}</p>
                              <p><strong>Cliente:</strong> {requerimento.cliente_nome}</p>
                              <p><strong>Tipo:</strong> {requerimento.tipo_cobranca}</p>
                            </div>
                            <p className="text-amber-600 dark:text-amber-400">
                              ⚠️ O requerimento voltará para a tela "Lançar Requerimentos".
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              onRejeitar(requerimento);
                              setConfirmDialogOpen(null);
                            }}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Rejeitar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default RequerimentosTableFaturamento;
