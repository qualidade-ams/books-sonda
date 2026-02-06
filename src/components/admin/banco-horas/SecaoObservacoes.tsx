/**
 * Seção de Observações do Banco de Horas
 * Exibe observações manuais e de ajustes, permite adicionar, editar e excluir
 */

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Check,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBancoHorasObservacoes, type ObservacaoUnificada } from '@/hooks/useBancoHorasObservacoes';
import { useAuth } from '@/hooks/useAuth';

interface SecaoObservacoesProps {
  empresaId: string;
  mesAtual: number;
  anoAtual: number;
  disabled?: boolean;
  onHistoricoClick?: () => void;
  /** Meses do período de apuração (para seletor de mês) */
  mesesDoPeriodo?: Array<{ mes: number; ano: number }>;
}

export function SecaoObservacoes({
  empresaId,
  mesAtual,
  anoAtual,
  disabled = false,
  onHistoricoClick,
  mesesDoPeriodo = []
}: SecaoObservacoesProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    observacoesUnificadas,
    isLoading,
    criarObservacao,
    atualizarObservacao,
    excluirObservacao,
    isCreating,
    isUpdating,
    isDeleting
  } = useBancoHorasObservacoes(empresaId);

  const [novaObservacao, setNovaObservacao] = useState('');
  const [modoAdicionar, setModoAdicionar] = useState(false);
  const [mesSelecionado, setMesSelecionado] = useState<{ mes: number; ano: number }>({ mes: mesAtual, ano: anoAtual });
  const [observacaoEditando, setObservacaoEditando] = useState<string | null>(null);
  const [textoEditando, setTextoEditando] = useState('');
  const [observacaoExcluir, setObservacaoExcluir] = useState<ObservacaoUnificada | null>(null);

  const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handleAdicionarObservacao = async () => {
    if (!novaObservacao.trim()) return;

    try {
      await criarObservacao({
        empresa_id: empresaId,
        mes: mesSelecionado.mes,
        ano: mesSelecionado.ano,
        observacao: novaObservacao.trim(),
        created_by: user?.id
      });
      setNovaObservacao('');
      setModoAdicionar(false);
      setMesSelecionado({ mes: mesAtual, ano: anoAtual }); // Reset para mês atual
    } catch (error) {
      console.error('Erro ao adicionar observação:', error);
    }
  };

  const handleEditarObservacao = async (id: string) => {
    if (!textoEditando.trim()) return;

    try {
      await atualizarObservacao({
        id,
        observacao: textoEditando.trim()
      });
      setObservacaoEditando(null);
      setTextoEditando('');
    } catch (error) {
      console.error('Erro ao editar observação:', error);
    }
  };

  const handleExcluirObservacao = async () => {
    if (!observacaoExcluir) return;

    try {
      await excluirObservacao(observacaoExcluir.id);
      setObservacaoExcluir(null);
    } catch (error) {
      console.error('Erro ao excluir observação:', error);
    }
  };

  const iniciarEdicao = (obs: ObservacaoUnificada) => {
    setObservacaoEditando(obs.id);
    setTextoEditando(obs.observacao);
  };

  const cancelarEdicao = () => {
    setObservacaoEditando(null);
    setTextoEditando('');
  };

  const formatarValorAjuste = (obs: ObservacaoUnificada): string => {
    // Debug: verificar tipo_ajuste
    console.log('🔍 Formatando valor ajuste:', {
      id: obs.id,
      tipo_ajuste: obs.tipo_ajuste,
      valor_horas: obs.valor_horas,
      valor_tickets: obs.valor_tickets
    });
    
    const sinal = obs.tipo_ajuste === 'entrada' ? '+' : '-';
    
    if (obs.valor_tickets && obs.valor_tickets > 0) {
      return `${sinal}${obs.valor_tickets} ticket${obs.valor_tickets !== 1 ? 's' : ''}`;
    }
    
    if (obs.valor_horas && obs.valor_horas !== '0:00' && obs.valor_horas !== '00:00') {
      return `${sinal}${obs.valor_horas}`;
    }
    
    return '';
  };

  if (isLoading) {
    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Observações
          </h4>
        </div>
        <p className="text-sm text-gray-500">Carregando observações...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Observações
          </h4>
          
          {!disabled && !modoAdicionar && (
            <Button
              size="sm"
              onClick={() => setModoAdicionar(true)}
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Observação
            </Button>
          )}
        </div>

        {/* Formulário de nova observação */}
        {modoAdicionar && (
          <div className="mb-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">Nova Observação</span>
              </div>
            </div>
            
            {/* Seletor de Mês */}
            {mesesDoPeriodo.length > 0 && (
              <div className="mb-3">
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Selecione o mês da observação:
                </label>
                <Select
                  value={`${mesSelecionado.mes}-${mesSelecionado.ano}`}
                  onValueChange={(value) => {
                    const [mes, ano] = value.split('-').map(Number);
                    setMesSelecionado({ mes, ano });
                  }}
                  disabled={isCreating}
                >
                  <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {mesesDoPeriodo.map((periodo) => (
                      <SelectItem
                        key={`${periodo.mes}-${periodo.ano}`}
                        value={`${periodo.mes}-${periodo.ano}`}
                      >
                        {MESES[periodo.mes - 1]}/{periodo.ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Textarea
              placeholder="Digite sua observação aqui... (máximo 700 caracteres)"
              value={novaObservacao}
              onChange={(e) => setNovaObservacao(e.target.value.slice(0, 700))}
              className="min-h-[80px] focus:ring-sonda-blue focus:border-sonda-blue mb-2"
              disabled={isCreating}
            />
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {novaObservacao.length}/700 caracteres
              </span>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setModoAdicionar(false);
                    setNovaObservacao('');
                    setMesSelecionado({ mes: mesAtual, ano: anoAtual }); // Reset
                  }}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleAdicionarObservacao}
                  disabled={!novaObservacao.trim() || isCreating}
                  className="bg-sonda-blue hover:bg-sonda-dark-blue"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tabela de observações */}
        {observacoesUnificadas.length === 0 ? (
          <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-3">Nenhuma observação registrada</p>
            {!disabled && !modoAdicionar && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModoAdicionar(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar primeira observação
              </Button>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <Table className="w-full text-xs sm:text-sm min-w-[1300px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2 px-4">Tipo</TableHead>														
                  <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2 px-4">Período</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm py-2 px-4">Observação</TableHead>															  
                  <TableHead className="min-w-[120px] text-center text-xs sm:text-sm py-2 px-4">Usuário</TableHead>															   
                  <TableHead className="min-w-[120px] text-center text-xs sm:text-sm py-2 px-4">Data</TableHead>																	 
                  {!disabled && <TableHead className="w-40 text-center text-xs sm:text-sm py-2">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {observacoesUnificadas.map((obs) => (
                  <TableRow key={obs.id} className="hover:bg-gray-50">
                    {/* Tipo */}
                    <TableCell className="py-2 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {obs.tipo === 'manual' ? (
                          <Badge variant="secondary" className="text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 leading-tight bg-blue-100 text-blue-700 w-fit">
                            💬 Manual
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 leading-tight bg-orange-100 text-orange-700 w-fit">
                            ⚙️ Ajuste
                          </Badge>
                        )}
                        {obs.tipo === 'ajuste' && obs.tipo_ajuste && (
                          <Badge
                            variant="secondary"
                            className={`text-[8px] sm:text-[10px] flex items-center gap-1 px-1 sm:px-2 py-0.5 leading-tight w-fit ${
                              obs.tipo_ajuste === 'entrada'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {obs.tipo_ajuste === 'entrada' ? (
                              <>↗️</>
                            ) : (
                              <>↘️</>
                            )}
                            <span className="whitespace-nowrap">{formatarValorAjuste(obs)}</span>
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Período */}
                    <TableCell className="py-2 px-4 text-center">
                      <span className="text-xs sm:text-sm">{MESES[obs.mes - 1]}/{obs.ano}</span>
                    </TableCell>

                    {/* Observação */}
                    <TableCell className="py-2 px-4 text-center">
                      {observacaoEditando === obs.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={textoEditando}
                            onChange={(e) => setTextoEditando(e.target.value.slice(0, 700))}
                            className="min-h-[60px] focus:ring-sonda-blue focus:border-sonda-blue text-sm"
                            disabled={isUpdating}
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {textoEditando.length}/700 caracteres
                            </span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelarEdicao}
                                disabled={isUpdating}
                                className="h-7 text-xs"
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleEditarObservacao(obs.id)}
                                disabled={!textoEditando.trim() || isUpdating}
                                className="bg-sonda-blue hover:bg-sonda-dark-blue h-7 text-xs"
                              >
                                Salvar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap">
                          {obs.observacao}
                          {obs.updated_at && obs.updated_at !== obs.created_at && (
                            <span className="text-xs text-gray-400 italic ml-2">(editado)</span>
                          )}
                        </p>
                      )}
                    </TableCell>

                    {/* Usuário */}
                    <TableCell className="py-2 px-4 text-center">
                      <div className="text-[10px] sm:text-xs text-gray-600">
                        <div className="font-medium">{obs.usuario_nome}</div>
                      </div>
                    </TableCell>

                    {/* Data */}
                    <TableCell className="py-2 px-4 text-center">
                      <div className="text-[10px] sm:text-xs text-gray-500">
                        {format(new Date(obs.created_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR
                        })}
                      </div>
                    </TableCell>

                    {/* Ações */}
                    {!disabled && (
                      <TableCell className="py-2 px-4 text-center">
                        <div className="flex justify-center gap-1">
                          {/* Botão Visualizar para ajustes */}
                          {obs.tipo === 'ajuste' && onHistoricoClick && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={onHistoricoClick}
                              className="h-8 w-8 p-0"
                              title="Ver histórico de versões"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          
                          {/* Botões Editar e Excluir para observações manuais */}
                          {obs.tipo === 'manual' && observacaoEditando !== obs.id && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => iniciarEdicao(obs)}
                                className="h-8 w-8 p-0"
                                disabled={isUpdating || isDeleting}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setObservacaoExcluir(obs)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                disabled={isUpdating || isDeleting}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog
        open={!!observacaoExcluir}
        onOpenChange={(open) => !open && setObservacaoExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta observação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirObservacao}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
