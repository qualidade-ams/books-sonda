/**
 * Componente para gerenciar histórico de baseline de uma empresa
 * 
 * Funcionalidades:
 * - Visualizar histórico completo de mudanças de baseline
 * - Criar nova vigência de baseline
 * - Editar vigência existente
 * - Visualizar baseline vigente atual
 * - Timeline visual das mudanças
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
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle2,
  History
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

import {
  useBaselineHistorico,
  useBaselineAtual,
  useDeleteBaselineHistorico
} from '@/hooks/useBaselineHistorico';
import type { BaselineHistorico } from '@/types/baselineHistorico';

import ModalNovoBaseline from './ModalNovoBaseline';
import ModalEditarBaseline from './ModalEditarBaseline';

interface GerenciadorBaselineHistoricoProps {
  empresaId: string;
  empresaNome: string;
}

export default function GerenciadorBaselineHistorico({
  empresaId,
  empresaNome
}: GerenciadorBaselineHistoricoProps) {
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [baselineSelecionado, setBaselineSelecionado] = useState<BaselineHistorico | null>(null);

  // Hooks
  const { data: historico, isLoading } = useBaselineHistorico(empresaId);
  const { data: baselineAtual } = useBaselineAtual(empresaId);
  const deleteBaseline = useDeleteBaselineHistorico();

  // Handlers
  const handleEditar = (baseline: BaselineHistorico) => {
    setBaselineSelecionado(baseline);
    setModalEditarOpen(true);
  };

  const handleDeletar = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta vigência de baseline?')) {
      await deleteBaseline.mutateAsync(id);
    }
  };

  // Calcular variação percentual
  const calcularVariacao = (atual: number, anterior: number): number => {
    if (anterior === 0) return 0;
    return ((atual - anterior) / anterior) * 100;
  };

  // Renderizar ícone de variação
  const renderIconeVariacao = (variacao: number) => {
    if (variacao > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (variacao < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-sonda-blue" />
                Histórico de Baseline
              </CardTitle>
              <CardDescription className="mt-1">
                {empresaNome}
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setModalNovoOpen(true)}
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Vigência
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Baseline Atual */}
          {baselineAtual && (
            <Alert className="border-sonda-blue bg-blue-50">
              <CheckCircle2 className="h-4 w-4 text-sonda-blue" />
              <AlertDescription className="text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-900">Baseline Atual:</span>{' '}
                    <span className="text-sonda-blue font-bold">
                      {baselineAtual.baseline_horas.toFixed(2)}h
                    </span>
                    {baselineAtual.baseline_tickets && (
                      <span className="text-gray-600 ml-2">
                        | {baselineAtual.baseline_tickets} tickets
                      </span>
                    )}
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    Vigente desde {format(new Date(baselineAtual.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Lista de Histórico */}
          {!historico || historico.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum histórico de baseline encontrado para esta empresa.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {historico.map((baseline, index) => {
                const anterior = historico[index + 1];
                const variacao = anterior
                  ? calcularVariacao(baseline.baseline_horas, anterior.baseline_horas)
                  : 0;

                const isVigente = !baseline.data_fim;

                return (
                  <Card key={baseline.id} className={isVigente ? 'border-sonda-blue border-2' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        {/* Informações principais */}
                        <div className="flex-1 space-y-3">
                          {/* Cabeçalho */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">
                                {format(new Date(baseline.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                              {baseline.data_fim && (
                                <>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-sm font-medium text-gray-700">
                                    {format(new Date(baseline.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                                  </span>
                                </>
                              )}
                            </div>

                            {isVigente && (
                              <Badge className="bg-green-100 text-green-800">
                                <Clock className="h-3 w-3 mr-1" />
                                Vigente
                              </Badge>
                            )}

                            {baseline.motivo && (
                              <Badge variant="outline" className="text-xs">
                                {baseline.motivo}
                              </Badge>
                            )}
                          </div>

                          {/* Valores */}
                          <div className="flex items-center gap-6">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Baseline de Horas</div>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-sonda-blue">
                                  {baseline.baseline_horas.toFixed(2)}h
                                </span>
                                {anterior && variacao !== 0 && (
                                  <div className="flex items-center gap-1">
                                    {renderIconeVariacao(variacao)}
                                    <span
                                      className={`text-sm font-medium ${
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

                            {baseline.baseline_tickets !== null && (
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Baseline de Tickets</div>
                                <div className="text-xl font-semibold text-gray-700">
                                  {baseline.baseline_tickets} tickets
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Observação */}
                          {baseline.observacao && (
                            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                              <span className="font-medium">Observação:</span> {baseline.observacao}
                            </div>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex gap-1 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditar(baseline)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!isVigente && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                              onClick={() => handleDeletar(baseline.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      <ModalNovoBaseline
        open={modalNovoOpen}
        onOpenChange={setModalNovoOpen}
        empresaId={empresaId}
        empresaNome={empresaNome}
      />

      {baselineSelecionado && (
        <ModalEditarBaseline
          open={modalEditarOpen}
          onOpenChange={setModalEditarOpen}
          baseline={baselineSelecionado}
          empresaNome={empresaNome}
        />
      )}
    </>
  );
}
