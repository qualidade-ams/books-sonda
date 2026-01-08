import React from 'react';
import { X, Calculator, HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Requerimento, MODULO_OPTIONS, TIPO_COBRANCA_OPTIONS, requerValorHora } from '@/types/requerimentos';
import { getBadgeClasses, getCobrancaIcon } from '@/utils/requerimentosColors';
import { formatarHorasParaExibicao, somarHoras } from '@/utils/horasUtils';
import { InputHoras } from '@/components/ui/input-horas';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { useClientesRequerimentos } from '@/hooks/useRequerimentos';
import { cn } from '@/lib/utils';

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
  const { data: clientes = [] } = useClientesRequerimentos();

  if (!requerimento) return null;

  const clienteSelecionado = clientes.find(c => c.id === requerimento.cliente_id);

  // Calcular horas total
  const horasTotal = somarHoras(
    requerimento.horas_funcional?.toString() || '0',
    requerimento.horas_tecnico?.toString() || '0'
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            Visualizar Requerimento
            <Badge variant="secondary" className="ml-2">Somente Leitura</Badge>
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent className="space-y-6 p-6">
            {/* Seção: Informações Básicas */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                Informações Básicas
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chamado */}
                <div className="space-y-2">
                  <Label htmlFor="chamado">
                    Chamado <span className="text-gray-700 dark:text-gray-300">*</span>
                  </Label>
                  <Input
                    id="chamado"
                    value={requerimento.chamado}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-800 uppercase"
                  />
                </div>

                {/* Cliente */}
                <div className="space-y-2">
                  <Label htmlFor="cliente">
                    Cliente <span className="text-gray-700 dark:text-gray-300">*</span>
                  </Label>
                  <Select value={requerimento.cliente_id} disabled>
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-800">
                      <SelectValue>
                        {requerimento.cliente_nome || clienteSelecionado?.nome_abreviado || 'Cliente não encontrado'}
                      </SelectValue>
                    </SelectTrigger>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Módulo */}
                <div className="space-y-2">
                  <Label htmlFor="modulo">
                    Módulo <span className="text-gray-700 dark:text-gray-300">*</span>
                  </Label>
                  <Select value={requerimento.modulo} disabled>
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-800">
                      <SelectValue>
                        {MODULO_OPTIONS.find(opt => opt.value === requerimento.modulo)?.label || requerimento.modulo}
                      </SelectValue>
                    </SelectTrigger>
                  </Select>
                </div>

                {/* Linguagem Técnica - só mostrar se houver horas técnicas */}
                {((typeof requerimento.horas_tecnico === 'string' ? parseFloat(requerimento.horas_tecnico) : requerimento.horas_tecnico) || 0) > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="linguagem">
                      Linguagem Técnica <span className="text-gray-700 dark:text-gray-300">*</span>
                    </Label>
                    <Input
                      id="linguagem"
                      value={requerimento.linguagem || ''}
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                )}
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="descricao">
                  Descrição <span className="text-gray-700 dark:text-gray-300">*</span>
                </Label>
                <Textarea
                  id="descricao"
                  value={requerimento.descricao}
                  readOnly
                  className="bg-gray-50 dark:bg-gray-800 min-h-[100px]"
                  placeholder="Descreva o requerimento..."
                />
                <div className="text-sm text-muted-foreground">
                  Máximo 500 caracteres ({requerimento.descricao.length}/500)
                </div>
              </div>
            </div>

            <Separator />

            {/* Seção: Datas */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold mb-3">Datas</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data de Envio */}
                <div className="space-y-2">
                  <Label htmlFor="data_envio">
                    Data de Envio do Orçamento <span className="text-gray-700 dark:text-gray-300">*</span>
                  </Label>
                  <Input
                    id="data_envio"
                    type="date"
                    value={requerimento.data_envio}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                </div>

                {/* Data de Aprovação */}
                <div className="space-y-2">
                  <Label htmlFor="data_aprovacao">Data de Aprovação do Orçamento</Label>
                  <Input
                    id="data_aprovacao"
                    type="date"
                    value={requerimento.data_aprovacao || ''}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Seção: Horas */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Controle de Horas
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Horas Funcionais */}
                <div className="space-y-2">
                  <Label htmlFor="horas_funcional">
                    Horas Funcionais <span className="text-gray-700 dark:text-gray-300">*</span>
                  </Label>
                  <InputHoras
                    id="horas_funcional"
                    value={requerimento.horas_funcional?.toString() || '0'}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                </div>

                {/* Horas Técnicas */}
                <div className="space-y-2">
                  <Label htmlFor="horas_tecnico">
                    Horas Técnicas <span className="text-gray-700 dark:text-gray-300">*</span>
                  </Label>
                  <InputHoras
                    id="horas_tecnico"
                    value={requerimento.horas_tecnico?.toString() || '0'}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                </div>

                {/* Horas Total */}
                <div className="space-y-2">
                  <Label>Horas Total</Label>
                  <div className="flex items-center h-10 px-3 py-2 border border-input bg-muted rounded-md">
                    <span className="font-semibold text-lg">
                      {formatarHorasParaExibicao(horasTotal, 'completo')}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Calculado automaticamente
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Seção: Cobrança */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold mb-3">Informações de Cobrança</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipo de Cobrança */}
                <div className="space-y-2">
                  <Label htmlFor="tipo_cobranca">
                    Tipo de Cobrança <span className="text-gray-700 dark:text-gray-300">*</span>
                  </Label>
                  <Select value={requerimento.tipo_cobranca} disabled>
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-800">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <span>{getCobrancaIcon(requerimento.tipo_cobranca)}</span>
                          <span>{requerimento.tipo_cobranca}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                  </Select>
                </div>

                {/* Mês/Ano de Cobrança */}
                <div className="space-y-2">
                  <Label htmlFor="mes_cobranca">Mês/Ano de Cobrança</Label>
                  <MonthYearPicker
                    value={requerimento.mes_cobranca || ''}
                    onChange={() => {}} // No-op function for readonly mode
                    disabled
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                </div>
              </div>

              {/* Linguagem Técnica - só mostrar se houver horas técnicas e não foi mostrado acima */}
              {((typeof requerimento.horas_tecnico === 'string' ? parseFloat(requerimento.horas_tecnico) : requerimento.horas_tecnico) || 0) > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="linguagem_tecnica">
                    Linguagem Técnica <span className="text-gray-700 dark:text-gray-300">*</span>
                  </Label>
                  <Input
                    id="linguagem_tecnica"
                    value={requerimento.linguagem || ''}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                </div>
              )}

              {/* Valores por hora - só mostrar se o tipo de cobrança requer valor */}
              {requerValorHora(requerimento.tipo_cobranca) && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-4">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Valores por Hora
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="valor_hora_funcional">Valor/Hora Funcional</Label>
                      <Input
                        id="valor_hora_funcional"
                        type="number"
                        step="0.01"
                        value={requerimento.valor_hora_funcional || ''}
                        readOnly
                        className="bg-gray-50 dark:bg-gray-800"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="valor_hora_tecnico">Valor/Hora Técnico</Label>
                      <Input
                        id="valor_hora_tecnico"
                        type="number"
                        step="0.01"
                        value={requerimento.valor_hora_tecnico || ''}
                        readOnly
                        className="bg-gray-50 dark:bg-gray-800"
                      />
                    </div>
                  </div>

                  {/* Mostrar valor total calculado */}
                  {(requerimento.valor_hora_funcional || requerimento.valor_hora_tecnico) && (
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md">
                      <div className="text-sm font-medium text-green-700 dark:text-green-300">
                        Valor Total Estimado
                      </div>
                      <div className="text-lg font-bold text-green-800 dark:text-green-200">
                        R$ {(
                          ((requerimento.valor_hora_funcional || 0) * ((typeof requerimento.horas_funcional === 'string' ? parseFloat(requerimento.horas_funcional) : requerimento.horas_funcional) || 0)) +
                          ((requerimento.valor_hora_tecnico || 0) * ((typeof requerimento.horas_tecnico === 'string' ? parseFloat(requerimento.horas_tecnico) : requerimento.horas_tecnico) || 0))
                        ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Controle de Tickets - só mostrar se houver tickets */}
              {requerimento.quantidade_tickets && requerimento.quantidade_tickets > 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🎫</span>
                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                      Controle de Tickets
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantidade_tickets">Quantidade de Tickets</Label>
                    <Input
                      id="quantidade_tickets"
                      type="number"
                      value={requerimento.quantidade_tickets}
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Seção: Observações */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold mb-3">Observações</h4>
              
              <div className="space-y-2">
                <Label htmlFor="observacao">Observações adicionais (opcional)</Label>
                <Textarea
                  id="observacao"
                  value={requerimento.observacao || ''}
                  readOnly
                  className="bg-gray-50 dark:bg-gray-800 min-h-[100px]"
                  placeholder="Observações adicionais..."
                />
                <div className="text-sm text-muted-foreground">
                  Máximo 1000 caracteres ({(requerimento.observacao || '').length}/1000)
                </div>
              </div>

              {/* Informações do sistema */}
              <div className="pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Autor:</span> {requerimento.autor_nome || 'Não informado'}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{' '}
                    <Badge variant={requerimento.enviado_faturamento ? "default" : "secondary"}>
                      {requerimento.enviado_faturamento ? 'Enviado para Faturamento' : 'Lançado'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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