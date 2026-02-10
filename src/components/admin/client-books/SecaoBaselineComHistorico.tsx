/**
 * Seção de Baseline com Histórico Integrado
 * 
 * Substitui o campo simples de baseline por uma seção completa que permite:
 * - Definir baseline atual com data inicial e final
 * - Visualizar histórico de mudanças
 * - Criar novas vigências
 * - Editar vigências existentes
 */

import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  Edit,
  Plus,
  Trash2,
  History,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Função auxiliar para formatar data sem problemas de timezone
const formatarDataLocal = (dataString: string): string => {
  // Adiciona 'T00:00:00' para forçar interpretação como data local
  const data = new Date(dataString + 'T00:00:00');
  return format(data, 'dd/MM/yyyy', { locale: ptBR });
};
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import {
  useBaselineHistorico,
  useBaselineAtual,
  useCreateBaselineHistorico,
  useUpdateBaselineHistorico,
  useDeleteBaselineHistorico
} from '@/hooks/useBaselineHistorico';
import { MOTIVOS_MUDANCA_OPTIONS } from '@/types/baselineHistorico';
import type { BaselineHistorico } from '@/types/baselineHistorico';
import { useAuth } from '@/hooks/useAuth';

interface SecaoBaselineComHistoricoProps {
  empresaId: string | undefined;
  empresaNome?: string;
  tipoContrato?: 'horas' | 'tickets' | 'ambos';
  disabled?: boolean;
}

export default function SecaoBaselineComHistorico({
  empresaId,
  empresaNome = '',
  tipoContrato = 'horas',
  disabled = false
}: SecaoBaselineComHistoricoProps) {
  const { user } = useAuth();
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
  const [baselineSelecionado, setBaselineSelecionado] = useState<BaselineHistorico | null>(null);
  const [showHistorico, setShowHistorico] = useState(false);

  // Form state para novo baseline
  const [novoBaseline, setNovoBaseline] = useState({
    baseline_horas: '',
    baseline_tickets: '',
    data_inicio: '',
    data_fim: '',
    motivo: '',
    observacao: ''
  });

  // Hooks
  const { data: historico, isLoading } = useBaselineHistorico(empresaId);
  const { data: baselineAtual } = useBaselineAtual(empresaId);
  const createBaseline = useCreateBaselineHistorico();
  const updateBaseline = useUpdateBaselineHistorico();
  const deleteBaseline = useDeleteBaselineHistorico();

  // Handlers
  const handleCriarBaseline = async () => {
    if (!empresaId) return;

    try {
      // Preparar dados baseado no tipo de contrato
      const baselineData: any = {
        empresa_id: empresaId,
        data_inicio: novoBaseline.data_inicio,
        data_fim: novoBaseline.data_fim || null,
        motivo: novoBaseline.motivo,
        observacao: novoBaseline.observacao || null,
        created_by: user?.id
      };

      // Adicionar baseline_horas apenas se tipo não for "tickets"
      if (tipoContrato !== 'tickets') {
        baselineData.baseline_horas = parseFloat(novoBaseline.baseline_horas || '0');
      } else {
        baselineData.baseline_horas = null; // Explicitamente null para tipo "tickets"
      }

      // Adicionar baseline_tickets apenas se tipo não for "horas"
      if (tipoContrato !== 'horas') {
        baselineData.baseline_tickets = novoBaseline.baseline_tickets ? parseInt(novoBaseline.baseline_tickets) : null;
      } else {
        baselineData.baseline_tickets = null; // Explicitamente null para tipo "horas"
      }

      await createBaseline.mutateAsync(baselineData);

      setNovoBaseline({
        baseline_horas: '',
        baseline_tickets: '',
        data_inicio: '',
        data_fim: '',
        motivo: '',
        observacao: ''
      });
      setModalNovoOpen(false);
    } catch (error) {
      console.error('Erro ao criar baseline:', error);
    }
  };

  const handleEditar = (baseline: BaselineHistorico) => {
    setBaselineSelecionado(baseline);
    setModalEditarOpen(true);
  };

  const handleDeletar = async (baseline: BaselineHistorico) => {
    setBaselineSelecionado(baseline);
    setModalExcluirOpen(true);
  };

  const confirmarExclusao = async () => {
    if (!baselineSelecionado) return;
    
    try {
      await deleteBaseline.mutateAsync(baselineSelecionado.id);
      setModalExcluirOpen(false);
      setBaselineSelecionado(null);
    } catch (error) {
      console.error('Erro ao excluir baseline:', error);
    }
  };

  const calcularVariacao = (atual: number, anterior: number): number => {
    if (anterior === 0) return 0;
    return ((atual - anterior) / anterior) * 100;
  };

  const renderIconeVariacao = (variacao: number) => {
    if (variacao > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (variacao < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  // Se não tem empresaId, mostrar mensagem
  if (!empresaId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Salve a empresa primeiro para gerenciar o histórico de baseline.
        </AlertDescription>
      </Alert>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card Único de Baseline com Histórico Integrado */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-sonda-blue" />
                Baseline Mensal
              </CardTitle>
              {baselineAtual && (
                <CardDescription className="mt-1 text-xs">
                  Vigente desde {formatarDataLocal(baselineAtual.data_inicio)}
                </CardDescription>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowHistorico(!showHistorico);
                }}
                type="button"
              >
                <History className="h-4 w-4 mr-2" />
                {showHistorico ? 'Ocultar' : 'Mostrar'} ({historico?.length || 0})
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setModalNovoOpen(true);
                }}
                disabled={disabled}
                className="bg-sonda-blue hover:bg-sonda-dark-blue"
                type="button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Vigência
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Baseline Atual */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">Baseline Atual</div>
            {baselineAtual ? (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-6">
                  {/* Horas - só exibir se tipo não for apenas "tickets" */}
                  {tipoContrato !== 'tickets' && (
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Horas Mensais</div>
                      <div className="text-2xl font-bold text-sonda-blue">
                        {baselineAtual.baseline_horas.toFixed(2)}h
                      </div>
                    </div>
                  )}
                  {/* Tickets - só exibir se tipo não for apenas "horas" */}
                  {tipoContrato !== 'horas' && baselineAtual.baseline_tickets !== null && (
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Tickets Mensais</div>
                      <div className="text-2xl font-bold text-sonda-blue">
                        {baselineAtual.baseline_tickets}
                      </div>
                    </div>
                  )}
                </div>
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Ativo
                </Badge>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhum baseline definido. Clique em "Nova Vigência" para criar.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Histórico de Mudanças */}
          {showHistorico && (
            <div className="space-y-3 pt-4 border-t">
              <div className="text-xs font-medium text-gray-500 mb-2">Histórico de Mudanças</div>
              {!historico || historico.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhum histórico de baseline encontrado.
                  </AlertDescription>
                </Alert>
              ) : (
                historico.map((baseline, index) => {
                const anterior = historico[index + 1];
                const variacao = anterior
                  ? calcularVariacao(baseline.baseline_horas, anterior.baseline_horas)
                  : 0;
                const isVigente = !baseline.data_fim;

                return (
                  <Card key={baseline.id} className={isVigente ? 'border-sonda-blue' : 'border-gray-200'}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between gap-4">
                        {/* Linha 1: Data, Valores e Badge */}
                        <div className="flex items-center gap-4 flex-1">
                          {/* Data */}
                          <div className="flex items-center gap-2 text-sm min-w-[140px]">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            <span className="font-medium">
                              {formatarDataLocal(baseline.data_inicio)}
                            </span>
                            {isVigente && (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                Vigente
                              </Badge>
                            )}
                          </div>

                          {/* Valores */}
                          <div className="flex items-center gap-3">
                            {/* Horas - só exibir se tipo não for apenas "tickets" */}
                            {tipoContrato !== 'tickets' && (
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-sonda-blue">
                                  {baseline.baseline_horas.toFixed(2)}h
                                </span>
                                {anterior && variacao !== 0 && (
                                  <div className="flex items-center gap-1">
                                    {renderIconeVariacao(variacao)}
                                    <span
                                      className={`text-xs font-medium ${
                                        variacao > 0 ? 'text-green-600' : 'text-red-600'
                                      }`}
                                    >
                                      {variacao > 0 ? '+' : ''}
                                      {variacao.toFixed(1)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Tickets - só exibir se tipo não for apenas "horas" */}
                            {tipoContrato !== 'horas' && baseline.baseline_tickets !== null && (
                              <span className={`${tipoContrato === 'tickets' ? 'text-lg font-bold text-sonda-blue' : 'text-sm text-gray-600'}`}>
                                {tipoContrato === 'tickets' ? '' : '| '}{baseline.baseline_tickets} tickets
                              </span>
                            )}
                          </div>

                          {/* Motivo */}
                          {baseline.motivo && (
                            <Badge variant="outline" className="text-xs">
                              {baseline.motivo}
                            </Badge>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditar(baseline);
                            }}
                            disabled={disabled}
                            type="button"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          {!isVigente && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-800"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeletar(baseline);
                              }}
                              disabled={disabled}
                              type="button"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Nova Vigência */}
      <Dialog open={modalNovoOpen} onOpenChange={setModalNovoOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-sonda-blue">
              Nova Vigência de Baseline
            </DialogTitle>
            <DialogDescription className="text-sm">
              {empresaNome}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Baseline Horas - só aparece se tipo_contrato for 'horas' ou 'ambos' */}
            {(tipoContrato === 'horas' || tipoContrato === 'ambos') && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Baseline de Horas Mensal *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 160.00"
                  value={novoBaseline.baseline_horas}
                  onChange={(e) => setNovoBaseline({ ...novoBaseline, baseline_horas: e.target.value })}
                  className="focus:ring-sonda-blue focus:border-sonda-blue"
                />
              </div>
            )}

            {/* Baseline Tickets - só aparece se tipo_contrato for 'tickets' ou 'ambos' */}
            {(tipoContrato === 'tickets' || tipoContrato === 'ambos') && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Baseline de Tickets Mensal *
                </Label>
                <Input
                  type="number"
                  placeholder="Ex: 50"
                  value={novoBaseline.baseline_tickets}
                  onChange={(e) => setNovoBaseline({ ...novoBaseline, baseline_tickets: e.target.value })}
                  className="focus:ring-sonda-blue focus:border-sonda-blue"
                />
              </div>
            )}

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data Início *</Label>
                <Input
                  type="date"
                  value={novoBaseline.data_inicio}
                  onChange={(e) => setNovoBaseline({ ...novoBaseline, data_inicio: e.target.value })}
                  className="focus:ring-sonda-blue focus:border-sonda-blue"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data Fim</Label>
                <Input
                  type="date"
                  value={novoBaseline.data_fim}
                  onChange={(e) => setNovoBaseline({ ...novoBaseline, data_fim: e.target.value })}
                  className="focus:ring-sonda-blue focus:border-sonda-blue"
                />
                <p className="text-xs text-gray-500">Deixe vazio para vigência atual</p>
              </div>
            </div>

            {/* Motivo */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Motivo *</Label>
              <Select
                value={novoBaseline.motivo}
                onValueChange={(value) => setNovoBaseline({ ...novoBaseline, motivo: value })}
              >
                <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS_MUDANCA_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Observações</Label>
              <Textarea
                placeholder="Detalhes adicionais..."
                rows={2}
                value={novoBaseline.observacao}
                onChange={(e) => setNovoBaseline({ ...novoBaseline, observacao: e.target.value })}
                className="focus:ring-sonda-blue focus:border-sonda-blue"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNovoOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCriarBaseline}
              disabled={
                !novoBaseline.data_inicio || 
                !novoBaseline.motivo ||
                (tipoContrato === 'horas' && !novoBaseline.baseline_horas) ||
                (tipoContrato === 'tickets' && !novoBaseline.baseline_tickets) ||
                (tipoContrato === 'ambos' && (!novoBaseline.baseline_horas || !novoBaseline.baseline_tickets))
              }
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
            >
              Criar Vigência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Vigência */}
      <Dialog open={modalEditarOpen} onOpenChange={setModalEditarOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-sonda-blue">
              Editar Vigência de Baseline
            </DialogTitle>
            <DialogDescription className="text-sm">
              {empresaNome}
            </DialogDescription>
          </DialogHeader>

          {baselineSelecionado && (
            <div className="space-y-4">
              {/* Baseline Horas - só aparece se tipo_contrato for 'horas' ou 'ambos' */}
              {(tipoContrato === 'horas' || tipoContrato === 'ambos') && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Baseline de Horas Mensal *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 160.00"
                    defaultValue={baselineSelecionado.baseline_horas}
                    onChange={(e) => setBaselineSelecionado({
                      ...baselineSelecionado,
                      baseline_horas: parseFloat(e.target.value)
                    })}
                    className="focus:ring-sonda-blue focus:border-sonda-blue"
                  />
                </div>
              )}

              {/* Baseline Tickets - só aparece se tipo_contrato for 'tickets' ou 'ambos' */}
              {(tipoContrato === 'tickets' || tipoContrato === 'ambos') && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Baseline de Tickets Mensal *
                  </Label>
                  <Input
                    type="number"
                    placeholder="Ex: 50"
                    defaultValue={baselineSelecionado.baseline_tickets || ''}
                    onChange={(e) => setBaselineSelecionado({
                      ...baselineSelecionado,
                      baseline_tickets: e.target.value ? parseInt(e.target.value) : null
                    })}
                    className="focus:ring-sonda-blue focus:border-sonda-blue"
                  />
                </div>
              )}

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Data Início *</Label>
                  <Input
                    type="date"
                    defaultValue={baselineSelecionado.data_inicio}
                    onChange={(e) => setBaselineSelecionado({
                      ...baselineSelecionado,
                      data_inicio: e.target.value
                    })}
                    className="focus:ring-sonda-blue focus:border-sonda-blue"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Data Fim</Label>
                  <Input
                    type="date"
                    defaultValue={baselineSelecionado.data_fim || ''}
                    onChange={(e) => setBaselineSelecionado({
                      ...baselineSelecionado,
                      data_fim: e.target.value || null
                    })}
                    className="focus:ring-sonda-blue focus:border-sonda-blue"
                  />
                  <p className="text-xs text-gray-500">Deixe vazio para vigência atual</p>
                </div>
              </div>

              {/* Motivo */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Motivo *</Label>
                <Select
                  defaultValue={baselineSelecionado.motivo}
                  onValueChange={(value) => setBaselineSelecionado({
                    ...baselineSelecionado,
                    motivo: value
                  })}
                >
                  <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_MUDANCA_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Observação */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Observações</Label>
                <Textarea
                  placeholder="Detalhes adicionais..."
                  rows={2}
                  defaultValue={baselineSelecionado.observacao || ''}
                  onChange={(e) => setBaselineSelecionado({
                    ...baselineSelecionado,
                    observacao: e.target.value
                  })}
                  className="focus:ring-sonda-blue focus:border-sonda-blue"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEditarOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (baselineSelecionado) {
                  await updateBaseline.mutateAsync({
                    id: baselineSelecionado.id,
                    data: {
                      baseline_horas: baselineSelecionado.baseline_horas,
                      baseline_tickets: baselineSelecionado.baseline_tickets,
                      data_inicio: baselineSelecionado.data_inicio,
                      data_fim: baselineSelecionado.data_fim,
                      motivo: baselineSelecionado.motivo,
                      observacao: baselineSelecionado.observacao,
                      updated_by: user?.id
                    }
                  });
                  setModalEditarOpen(false);
                }
              }}
              disabled={
                !baselineSelecionado?.data_inicio || 
                !baselineSelecionado?.motivo ||
                (tipoContrato === 'horas' && !baselineSelecionado?.baseline_horas) ||
                (tipoContrato === 'tickets' && !baselineSelecionado?.baseline_tickets) ||
                (tipoContrato === 'ambos' && (!baselineSelecionado?.baseline_horas || !baselineSelecionado?.baseline_tickets))
              }
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação de Exclusão */}
      <AlertDialog open={modalExcluirOpen} onOpenChange={setModalExcluirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p className="text-base text-gray-700">
                Tem certeza que deseja remover esta vigência de baseline?
              </p>
              
              {baselineSelecionado && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Data de Início:</span>
                    <span>{formatarDataLocal(baselineSelecionado.data_inicio)}</span>
                  </div>
                  
                  {tipoContrato !== 'tickets' && baselineSelecionado.baseline_horas && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Baseline Horas:</span>
                      <span className="text-sonda-blue font-semibold">
                        {baselineSelecionado.baseline_horas.toFixed(2)}h
                      </span>
                    </div>
                  )}
                  
                  {tipoContrato !== 'horas' && baselineSelecionado.baseline_tickets && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Baseline Tickets:</span>
                      <span className="text-sonda-blue font-semibold">
                        {baselineSelecionado.baseline_tickets}
                      </span>
                    </div>
                  )}
                  
                  {baselineSelecionado.motivo && (
                    <div className="flex items-start gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <span className="font-medium">Motivo:</span>
                        <span className="ml-1">{baselineSelecionado.motivo}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-sm text-red-800">
                  <strong>Atenção:</strong> Esta ação não pode ser desfeita. O histórico será permanentemente removido.
                </AlertDescription>
              </Alert>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Vigência
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
