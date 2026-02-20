/**
 * Seção de Percentual de Repasse com Histórico Integrado
 * 
 * Substitui o campo simples de percentual por uma seção completa que permite:
 * - Visualizar percentual atual
 * - Visualizar histórico de mudanças
 * - Criar novas vigências
 * - Editar vigências existentes
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
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
  Minus,
  Percent
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  usePercentualRepasseHistorico,
  usePercentualRepasseAtual,
  useCreatePercentualRepasseHistorico,
  useUpdatePercentualRepasseHistorico,
  useDeletePercentualRepasseHistorico
} from '@/hooks/usePercentualRepasseHistorico';
import { MOTIVOS_PERCENTUAL_REPASSE } from '@/types/percentualRepasseHistorico';
import type { PercentualRepasseHistorico } from '@/types/percentualRepasseHistorico';
import { useAuth } from '@/hooks/useAuth';

// Função auxiliar para formatar data sem problemas de timezone
const formatarDataLocal = (dataString: string): string => {
  const data = new Date(dataString + 'T00:00:00');
  return format(data, 'dd/MM/yyyy', { locale: ptBR });
};

interface SecaoPercentualRepasseComHistoricoProps {
  empresaId: string | undefined;
  empresaNome?: string;
  disabled?: boolean;
}

export default function SecaoPercentualRepasseComHistorico({
  empresaId,
  empresaNome = '',
  disabled = false
}: SecaoPercentualRepasseComHistoricoProps) {
  const { user } = useAuth();
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
  const [percentualSelecionado, setPercentualSelecionado] = useState<PercentualRepasseHistorico | null>(null);
  const [showHistorico, setShowHistorico] = useState(false);

  // Form state para novo percentual
  const [novoPercentual, setNovoPercentual] = useState({
    percentual: '',
    data_inicio: '',
    data_fim: '',
    motivo: '',
    observacao: ''
  });

  // Hooks
  const { data: historico, isLoading } = usePercentualRepasseHistorico(empresaId || '');
  const { data: percentualAtual } = usePercentualRepasseAtual(empresaId || '');
  const createPercentual = useCreatePercentualRepasseHistorico();
  const updatePercentual = useUpdatePercentualRepasseHistorico();
  const deletePercentual = useDeletePercentualRepasseHistorico();

  // Handlers
  const handleCriarPercentual = async () => {
    if (!empresaId) return;

    try {
      await createPercentual.mutateAsync({
        empresa_id: empresaId,
        percentual: parseFloat(novoPercentual.percentual),
        data_inicio: novoPercentual.data_inicio,
        motivo: novoPercentual.motivo,
        observacao: novoPercentual.observacao || undefined
      });

      setNovoPercentual({
        percentual: '',
        data_inicio: '',
        data_fim: '',
        motivo: '',
        observacao: ''
      });
      setModalNovoOpen(false);
    } catch (error) {
      console.error('Erro ao criar percentual:', error);
    }
  };

  const handleEditar = (percentual: PercentualRepasseHistorico) => {
    setPercentualSelecionado(percentual);
    setModalEditarOpen(true);
  };

  const handleDeletar = async (percentual: PercentualRepasseHistorico) => {
    setPercentualSelecionado(percentual);
    setModalExcluirOpen(true);
  };

  const confirmarExclusao = async () => {
    if (!percentualSelecionado || !empresaId) return;
    
    try {
      await deletePercentual.mutateAsync({ 
        id: percentualSelecionado.id,
        empresaId 
      });
      setModalExcluirOpen(false);
      setPercentualSelecionado(null);
    } catch (error) {
      console.error('Erro ao excluir percentual:', error);
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
          Salve a empresa primeiro para gerenciar o histórico de percentual de repasse.
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
      {/* Card Único de Percentual com Histórico Integrado */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Percent className="h-4 w-4 text-sonda-blue" />
                Percentual de Repasse Mensal
              </CardTitle>
              {percentualAtual && (
                <CardDescription className="mt-1 text-xs">
                  Vigente desde {formatarDataLocal(percentualAtual.data_inicio)}
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
          {/* Percentual Atual */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">Percentual Atual</div>
            {percentualAtual ? (
              (() => {
                // Verificar se está realmente vigente (data_inicio <= hoje)
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const dataInicio = new Date(percentualAtual.data_inicio + 'T00:00:00');
                const isRealmenteVigente = dataInicio <= hoje;
                
                return (
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-6">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Percentual de Repasse</div>
                        <div className="text-2xl font-bold text-sonda-blue">
                          {percentualAtual.percentual.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    {isRealmenteVigente ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Aguardando Vigência
                      </Badge>
                    )}
                  </div>
                );
              })()
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhum percentual definido. Clique em "Nova Vigência" para criar.
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
                    Nenhum histórico de percentual encontrado.
                  </AlertDescription>
                </Alert>
              ) : (
                historico.map((percentual, index) => {
                  const anterior = historico[index + 1];
                  const variacao = anterior
                    ? calcularVariacao(percentual.percentual, anterior.percentual)
                    : 0;
                  
                  // Verificar se está vigente: data_fim é null E data_inicio <= hoje
                  const hoje = new Date();
                  hoje.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas de data
                  
                  const dataInicio = new Date(percentual.data_inicio + 'T00:00:00');
                  const isVigente = !percentual.data_fim && dataInicio <= hoje;

                  return (
                    <Card key={percentual.id} className={isVigente ? 'border-sonda-blue' : 'border-gray-200'}>
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between gap-4">
                          {/* Data, Valores e Badge */}
                          <div className="flex items-center gap-4 flex-1">
                            {/* Data */}
                            <div className="flex items-center gap-2 text-sm min-w-[140px]">
                              <Calendar className="h-3 w-3 text-gray-500" />
                              <span className="font-medium">
                                {formatarDataLocal(percentual.data_inicio)}
                              </span>
                              {isVigente && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  Vigente
                                </Badge>
                              )}
                            </div>

                            {/* Valores */}
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-sonda-blue">
                                  {percentual.percentual.toFixed(2)}%
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
                            </div>

                            {/* Motivo */}
                            {percentual.motivo && (
                              <Badge variant="outline" className="text-xs">
                                {percentual.motivo}
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
                                handleEditar(percentual);
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
                                  handleDeletar(percentual);
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
              Nova Vigência de Percentual de Repasse
            </DialogTitle>
            <DialogDescription className="text-sm">
              {empresaNome}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Percentual */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Percentual de Repasse (%) *
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Ex: 50.00"
                value={novoPercentual.percentual}
                onChange={(e) => setNovoPercentual({ ...novoPercentual, percentual: e.target.value })}
                className="focus:ring-sonda-blue focus:border-sonda-blue"
              />
            </div>

            {/* Data Início */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data Início *</Label>
              <Input
                type="date"
                value={novoPercentual.data_inicio}
                onChange={(e) => setNovoPercentual({ ...novoPercentual, data_inicio: e.target.value })}
                className="focus:ring-sonda-blue focus:border-sonda-blue"
              />
              <p className="text-xs text-gray-500">A vigência anterior será encerrada automaticamente</p>
            </div>

            {/* Motivo */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Motivo *</Label>
              <Select
                value={novoPercentual.motivo}
                onValueChange={(value) => setNovoPercentual({ ...novoPercentual, motivo: value })}
              >
                <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS_PERCENTUAL_REPASSE.map((motivo) => (
                    <SelectItem key={motivo} value={motivo}>
                      {motivo}
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
                value={novoPercentual.observacao}
                onChange={(e) => setNovoPercentual({ ...novoPercentual, observacao: e.target.value })}
                className="focus:ring-sonda-blue focus:border-sonda-blue"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNovoOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCriarPercentual}
              disabled={
                !novoPercentual.percentual || 
                !novoPercentual.data_inicio || 
                !novoPercentual.motivo
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
              Editar Vigência de Percentual de Repasse
            </DialogTitle>
            <DialogDescription className="text-sm">
              {empresaNome}
            </DialogDescription>
          </DialogHeader>

          {percentualSelecionado && (
            <div className="space-y-4">
              {/* Percentual */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Percentual de Repasse (%) *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="Ex: 50.00"
                  defaultValue={percentualSelecionado.percentual}
                  onChange={(e) => setPercentualSelecionado({
                    ...percentualSelecionado,
                    percentual: parseFloat(e.target.value)
                  })}
                  className="focus:ring-sonda-blue focus:border-sonda-blue"
                />
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Data Início *</Label>
                  <Input
                    type="date"
                    defaultValue={percentualSelecionado.data_inicio.split('T')[0]}
                    onChange={(e) => setPercentualSelecionado({
                      ...percentualSelecionado,
                      data_inicio: e.target.value
                    })}
                    className="focus:ring-sonda-blue focus:border-sonda-blue"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Data Fim</Label>
                  <Input
                    type="date"
                    defaultValue={percentualSelecionado.data_fim?.split('T')[0] || ''}
                    onChange={(e) => setPercentualSelecionado({
                      ...percentualSelecionado,
                      data_fim: e.target.value || null
                    })}
                    disabled={!percentualSelecionado.data_fim}
                    className="focus:ring-sonda-blue focus:border-sonda-blue"
                  />
                  <p className="text-xs text-gray-500">
                    {!percentualSelecionado.data_fim ? 'Vigência atual (sem data de fim)' : 'Deixe vazio para vigência atual'}
                  </p>
                </div>
              </div>

              {/* Motivo */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Motivo *</Label>
                <Select
                  defaultValue={percentualSelecionado.motivo || ''}
                  onValueChange={(value) => setPercentualSelecionado({
                    ...percentualSelecionado,
                    motivo: value
                  })}
                >
                  <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_PERCENTUAL_REPASSE.map((motivo) => (
                      <SelectItem key={motivo} value={motivo}>
                        {motivo}
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
                  defaultValue={percentualSelecionado.observacao || ''}
                  onChange={(e) => setPercentualSelecionado({
                    ...percentualSelecionado,
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
                if (percentualSelecionado && empresaId) {
                  await updatePercentual.mutateAsync({
                    id: percentualSelecionado.id,
                    empresaId,
                    percentual: percentualSelecionado.percentual,
                    data_inicio: percentualSelecionado.data_inicio,
                    data_fim: percentualSelecionado.data_fim,
                    motivo: percentualSelecionado.motivo,
                    observacao: percentualSelecionado.observacao
                  });
                  setModalEditarOpen(false);
                }
              }}
              disabled={
                !percentualSelecionado?.percentual || 
                !percentualSelecionado?.data_inicio || 
                !percentualSelecionado?.motivo
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
                Tem certeza que deseja remover esta vigência de percentual de repasse?
              </p>
              
              {percentualSelecionado && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Data de Início:</span>
                    <span>{formatarDataLocal(percentualSelecionado.data_inicio)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Percent className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Percentual:</span>
                    <span className="text-sonda-blue font-semibold">
                      {percentualSelecionado.percentual.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-red-600 font-medium">
                Esta ação não pode ser desfeita.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
