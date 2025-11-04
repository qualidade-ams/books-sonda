import React from 'react';
import { X, Calendar, Clock, User, Building, FileText, DollarSign, Hash } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Requerimento } from '@/types/requerimentos';
import { getBadgeClasses, getCobrancaIcon } from '@/utils/requerimentosColors';
import { formatarHorasParaExibicao } from '@/utils/horasUtils';
import { requerValorHora } from '@/types/requerimentos';

interface RequerimentoViewModalProps {
  requerimento: Requerimento | null;
  open: boolean;
  onClose: () => void;
}

const RequerimentoViewModal: React.FC<RequerimentoViewModalProps> = ({
  requerimento,
  open,
  onClose
}) => {
  if (!requerimento) return null;

  const formatDate = (dateString: string) => {
    try {
      // Tratar datas no formato YYYY-MM-DD como locais
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const calcularHorasTotal = () => {
    const funcional = formatarHorasParaExibicao(requerimento.horas_funcional?.toString() || '0', 'HHMM');
    const tecnico = formatarHorasParaExibicao(requerimento.horas_tecnico?.toString() || '0', 'HHMM');
    
    // Somar as horas para exibir o total
    const funcionalNum = typeof requerimento.horas_funcional === 'string' 
      ? parseFloat(requerimento.horas_funcional) || 0 
      : requerimento.horas_funcional || 0;
    const tecnicoNum = typeof requerimento.horas_tecnico === 'string' 
      ? parseFloat(requerimento.horas_tecnico) || 0 
      : requerimento.horas_tecnico || 0;
    
    const total = funcionalNum + tecnicoNum;
    return {
      funcional,
      tecnico,
      total: formatarHorasParaExibicao(total.toString(), 'HHMM')
    };
  };

  const calcularValorTotal = () => {
    if (!requerValorHora(requerimento.tipo_cobranca)) return null;

    const funcionalNum = typeof requerimento.horas_funcional === 'string' 
      ? parseFloat(requerimento.horas_funcional) || 0 
      : requerimento.horas_funcional || 0;
    const tecnicoNum = typeof requerimento.horas_tecnico === 'string' 
      ? parseFloat(requerimento.horas_tecnico) || 0 
      : requerimento.horas_tecnico || 0;

    const valorFuncional = (requerimento.valor_hora_funcional || 0) * funcionalNum;
    const valorTecnico = (requerimento.valor_hora_tecnico || 0) * tecnicoNum;

    return valorFuncional + valorTecnico;
  };

  const horas = calcularHorasTotal();
  const valorTotal = calcularValorTotal();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-6 w-6" />
            Visualizar Requerimento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Principais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Informações Principais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Chamado
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-medium">{requerimento.chamado}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Tipo de Cobrança
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-base">{getCobrancaIcon(requerimento.tipo_cobranca)}</span>
                    <Badge className={getBadgeClasses(requerimento.tipo_cobranca)}>
                      {requerimento.tipo_cobranca}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Cliente
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span>{requerimento.cliente_nome}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Módulo / Linguagem
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{requerimento.modulo}</Badge>
                    <Badge variant="outline">{requerimento.linguagem}</Badge>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Descrição
                </label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <p className="text-sm">{requerimento.descricao}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Horas e Valores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horas e Valores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Horas Funcionais
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                    {horas.funcional}
                  </div>
                  {requerimento.valor_hora_funcional && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      R$ {requerimento.valor_hora_funcional.toFixed(2)}/h
                    </div>
                  )}
                </div>

                <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-sm font-medium text-green-600 dark:text-green-400">
                    Horas Técnicas
                  </div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
                    {horas.tecnico}
                  </div>
                  {requerimento.valor_hora_tecnico && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      R$ {requerimento.valor_hora_tecnico.toFixed(2)}/h
                    </div>
                  )}
                </div>

                <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    Total de Horas
                  </div>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                    {horas.total}
                  </div>
                  {valorTotal !== null && (
                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              </div>

              {/* Tickets (se aplicável) */}
              {requerimento.quantidade_tickets && requerimento.quantidade_tickets > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎫</span>
                    <div>
                      <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                        Controle de Tickets
                      </div>
                      <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                        {requerimento.quantidade_tickets} {requerimento.quantidade_tickets === 1 ? 'ticket' : 'tickets'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Datas e Período */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Datas e Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Data de Envio
                  </label>
                  <div className="mt-1 text-lg font-medium">
                    {formatDate(requerimento.data_envio)}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Data de Aprovação
                  </label>
                  <div className="mt-1 text-lg font-medium">
                    {requerimento.data_aprovacao ? formatDate(requerimento.data_aprovacao) : 'Não informada'}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Período de Cobrança
                  </label>
                  <div className="mt-1 text-lg font-medium">
                    {requerimento.mes_cobranca || 'Não informado'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações e Autor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Adicionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {requerimento.observacao && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Observações
                  </label>
                  <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{requerimento.observacao}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Autor
                  </label>
                  <div className="mt-1 text-sm">
                    {requerimento.autor_nome || 'Não informado'}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Status
                  </label>
                  <div className="mt-1">
                    <Badge variant={requerimento.enviado_faturamento ? "default" : "secondary"}>
                      {requerimento.enviado_faturamento ? 'Enviado para Faturamento' : 'Lançado'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline">
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequerimentoViewModal;