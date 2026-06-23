/**
 * Modal de Histórico de Versões - Banco de Horas
 * 
 * Componente que exibe o histórico completo de versões de um cálculo mensal,
 * permitindo visualização de mudanças e exclusão de versões.
 * 
 * Funcionalidades:
 * - Lista de versões com timestamp e usuário
 * - Exibição do motivo da mudança
 * - Botão de exclusão para cada versão
 * 
 * @module components/admin/banco-horas/ModalHistorico
 * @requirements 12.4-12.10
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  History,
  Clock,
  User,
  FileText,
  ChevronRight,
  Loader2,
  TrendingUp,
  TrendingDown,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { bancoHorasService } from '@/services/bancoHorasService';
import type { BancoHorasVersao, BancoHorasReajuste } from '@/types/bancoHoras';

/**
 * Props do componente ModalHistorico
 */
export interface ModalHistoricoProps {
  /** Controla se o modal está aberto */
  open: boolean;
  
  /** Callback para fechar o modal */
  onClose: () => void;
  
  /** ID da empresa */
  empresaId: string;
  
  /** Mês (1-12) - usado para exibição no título */
  mes: number;
  
  /** Ano (ex: 2024) - usado para exibição no título */
  ano: number;
  
  /** Lista de versões a exibir (pode conter versões de múltiplos meses) */
  versoes: BancoHorasVersao[];
  
  /** Estado de carregamento */
  isLoading?: boolean;
  
  /** Tipo de cobrança do cliente ('ticket' ou 'banco_horas') */
  tipoCobranca?: string;
}

/**
 * Componente ModalHistorico
 * 
 * Modal para visualização do histórico completo de versões de um cálculo mensal.
 * Permite visualizar detalhes de cada mudança e excluir versões.
 * 
 * @example
 * <ModalHistorico
 *   open={modalAberto}
 *   onClose={() => setModalAberto(false)}
 *   empresaId="uuid-empresa"
 *   mes={1}
 *   ano={2024}
 *   versoes={versoes}
 *   isLoading={false}
 * />
 * 
 * **Validates: Requirements 12.4-12.10**
 * **Property 20: Histórico Completo Preservado**
 */
export const ModalHistorico: React.FC<ModalHistoricoProps> = ({
  open,
  onClose,
  empresaId,
  mes,
  ano,
  versoes,
  isLoading = false,
  tipoCobranca,
}) => {
  // Estado para dados de reajustes
  const [reajustes, setReajustes] = useState<Record<string, BancoHorasReajuste>>({});
  const [loadingReajustes, setLoadingReajustes] = useState(false);
  
  // Estado para nomes de usuários (tanto de versões quanto de reajustes)
  const [usuarios, setUsuarios] = useState<Record<string, string>>({});
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  // Estado para confirmação de exclusão
  const [versaoParaExcluir, setVersaoParaExcluir] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  // Verificar se é tipo ticket (singular ou plural)
  const isTicket = tipoCobranca?.toLowerCase() === 'ticket' || tipoCobranca?.toLowerCase() === 'tickets';

  /**
   * Busca dados de reajustes para versões
   */
  useEffect(() => {
    const buscarReajustes = async () => {
      if (versoes.length === 0) return;

      setLoadingReajustes(true);
      
      try {
        // Coletar IDs únicos de reajustes das versões
        const reajusteIds = versoes
          .map(v => v.reajuste_id)
          .filter((id): id is string => !!id) // Remove nulls/undefined
          .filter((id, index, self) => self.indexOf(id) === index); // unique

        console.log('🔍 [REAJUSTES] Buscando reajustes para reajuste_ids:', reajusteIds);
        
        if (reajusteIds.length === 0) {
          console.log('⚠️ [REAJUSTES] Nenhum reajuste_id encontrado nas versões');
          setReajustes({});
          setLoadingReajustes(false);
          return;
        }
        
        // Buscar reajustes pelos IDs
        const { data, error } = await (supabase as any)
          .from('banco_horas_reajustes')
          .select('*')
          .in('id', reajusteIds)
          .eq('ativo', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ [REAJUSTES] Erro ao buscar:', error);
          return;
        }

        console.log('✅ [REAJUSTES] Reajustes encontrados:', data);
        console.log('📊 [REAJUSTES] Total de reajustes:', data?.length);
        console.log('📊 [REAJUSTES] Detalhes dos reajustes:', data?.map(r => ({
          id: r.id,
          valor_reajuste_horas: r.valor_reajuste_horas,
          tipo_reajuste: r.tipo_reajuste,
          mes: r.mes,
          ano: r.ano
        })));

        // Mapear reajustes por ID do reajuste
        const reajustesMap: Record<string, BancoHorasReajuste> = {};
        data?.forEach(reajuste => {
          reajustesMap[reajuste.id] = reajuste;
          console.log('  ✅ Mapeado:', {
            reajuste_id: reajuste.id,
            calculo_id: reajuste.calculo_id,
            valor_reajuste_horas: reajuste.valor_reajuste_horas,
            tipo_reajuste: reajuste.tipo_reajuste,
            created_by: reajuste.created_by
          });
        });

        setReajustes(reajustesMap);
      } catch (error) {
        console.error('❌ [REAJUSTES] Erro:', error);
      } finally {
        setLoadingReajustes(false);
      }
    };

    if (open && versoes.length > 0) {
      buscarReajustes();
    }
  }, [open, versoes]);

  /**
   * Busca nomes dos usuários (versões + reajustes)
   */
  useEffect(() => {
    const buscarUsuarios = async () => {
      // Coletar IDs únicos de usuários das versões E dos reajustes
      const userIdsVersoes = versoes
        .map(v => v.created_by)
        .filter((id): id is string => !!id);
      
      const userIdsReajustes = Object.values(reajustes)
        .map(r => r.created_by)
        .filter((id): id is string => !!id);
      
      const userIds = [...userIdsVersoes, ...userIdsReajustes]
        .filter((id, index, self) => self.indexOf(id) === index); // unique

      console.log('👥 [USUARIOS] IDs das versões:', userIdsVersoes);
      console.log('👥 [USUARIOS] IDs dos reajustes:', userIdsReajustes);
      console.log('👥 [USUARIOS] IDs únicos para buscar:', userIds);
      console.log('👥 [USUARIOS] Total de reajustes:', Object.keys(reajustes).length);
      console.log('👥 [USUARIOS] Reajustes com created_by:', Object.values(reajustes).filter(r => r.created_by).length);

      if (userIds.length === 0) {
        console.log('⚠️ [USUARIOS] Nenhum ID para buscar');
        return;
      }

      setLoadingUsuarios(true);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (error) {
          console.error('❌ [USUARIOS] Erro ao buscar:', error);
          // Fallback: usar IDs truncados
          const usuariosMap: Record<string, string> = {};
          userIds.forEach(id => {
            usuariosMap[id] = `Usuário ${id.substring(0, 8)}`;
          });
          setUsuarios(usuariosMap);
          return;
        }

        // Mapear usuários por ID
        const usuariosMap: Record<string, string> = {};
        data?.forEach(user => {
          // Priorizar full_name, depois email (parte antes do @), depois ID truncado
          usuariosMap[user.id] = user.full_name || user.email?.split('@')[0] || `Usuário ${user.id.substring(0, 8)}`;
        });

        console.log('✅ [USUARIOS] Usuários encontrados:', usuariosMap);
        setUsuarios(usuariosMap);
      } catch (error) {
        console.error('❌ [USUARIOS] Erro:', error);
        // Fallback final: usar IDs
        const usuariosMap: Record<string, string> = {};
        userIds.forEach(id => {
          usuariosMap[id] = `Usuário ${id.substring(0, 8)}`;
        });
        setUsuarios(usuariosMap);
      } finally {
        setLoadingUsuarios(false);
      }
    };

    if (open && (versoes.length > 0 || Object.keys(reajustes).length > 0)) {
      buscarUsuarios();
    }
  }, [open, versoes, reajustes]);

  /**
   * Exclui uma versão do histórico
   */
  const handleExcluirVersao = async (versaoId: string) => {
    setVersaoParaExcluir(versaoId);
  };

  /**
   * Confirma a exclusão da versão
   */
  const confirmarExclusao = async () => {
    if (!versaoParaExcluir) return;

    setExcluindo(true);

    try {
      // Buscar a versão para obter o reajuste_id
      const versao = versoes.find(v => v.id === versaoParaExcluir);
      
      if (!versao) {
        throw new Error('Versão não encontrada');
      }

      console.log('🗑️ Iniciando exclusão da versão:', versaoParaExcluir);

      // Se a versão tem um reajuste associado, desativar o reajuste
      if (versao.reajuste_id) {
        const { error: reajusteError } = await (supabase as any)
          .from('banco_horas_reajustes')
          .update({ ativo: false })
          .eq('id', versao.reajuste_id);

        if (reajusteError) {
          console.error('❌ Erro ao desativar reajuste:', reajusteError);
          throw reajusteError;
        }

        console.log('✅ Reajuste desativado:', versao.reajuste_id);
      }

      // Excluir a versão
      const { error: versaoError } = await (supabase as any)
        .from('banco_horas_versoes')
        .delete()
        .eq('id', versaoParaExcluir);

      if (versaoError) {
        console.error('❌ Erro ao excluir versão:', versaoError);
        throw versaoError;
      }

      console.log('✅ Versão excluída:', versaoParaExcluir);

      // Buscar o cálculo associado para obter mês e ano
      const { data: calculo, error: calculoError } = await (supabase as any)
        .from('banco_horas_calculos')
        .select('mes, ano')
        .eq('id', versao.calculo_id)
        .single();

      if (calculoError) {
        console.error('❌ Erro ao buscar cálculo:', calculoError);
      } else if (calculo) {
        console.log('🔄 Recalculando valores a partir de', (calculo as any).mes, '/', (calculo as any).ano);
        
        // Recalcular os valores a partir do mês afetado
        try {
          await bancoHorasService.recalcularAPartirDe(empresaId, (calculo as any).mes, (calculo as any).ano);
          console.log('✅ Recálculo concluído');
        } catch (recalcError) {
          console.error('❌ Erro ao recalcular:', recalcError);
          // Não lançar erro aqui para não bloquear a exclusão
        }
      }

      // Fechar o modal de confirmação ANTES de invalidar queries
      setVersaoParaExcluir(null);

      console.log('🔄 Invalidando e refetchando queries em paralelo...');

      // ✅ OTIMIZAÇÃO: Invalidar e refetch em paralelo (muito mais rápido!)
      await Promise.all([
        // Invalidar queries
        queryClient.invalidateQueries({ queryKey: ['banco-horas-calculo'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['banco-horas-calculos-segmentados'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['banco-horas-versoes'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['banco-horas-reajustes'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['banco-horas-observacoes', empresaId], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['banco-horas-observacoes-reajustes', empresaId], refetchType: 'all' }),
        
        // Refetch queries principais
        queryClient.refetchQueries({ queryKey: ['banco-horas-calculo', empresaId], type: 'all' }),
        queryClient.refetchQueries({ queryKey: ['banco-horas-calculos-segmentados', empresaId], type: 'all' }),
        queryClient.refetchQueries({ queryKey: ['banco-horas-observacoes', empresaId], type: 'all' }),
        queryClient.refetchQueries({ queryKey: ['banco-horas-observacoes-reajustes', empresaId], type: 'all' })
      ]);

      console.log('✅ Queries atualizadas - exclusão concluída!');

      toast({
        title: t('bankHours.versionDeleted'),
        description: t('bankHours.versionDeletedDesc'),
      });

      // Fechar o modal de histórico APÓS todas as atualizações
      onClose();
    } catch (error) {
      console.error('❌ Erro ao excluir versão:', error);
      toast({
        title: t('bankHours.deleteError'),
        description: t('bankHours.deleteErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setExcluindo(false);
    }
  };

  /**
   * Cancela a exclusão
   */
  const cancelarExclusao = () => {
    setVersaoParaExcluir(null);
  };

  /**
   * Retorna badge de tipo de mudança
   */
  const getBadgeTipoMudanca = (tipo: string) => {
    switch (tipo) {
      case 'reajuste':
        return <Badge className="bg-orange-100 text-orange-800 text-xs">{t('bankHours.adjustmentLabel')}</Badge>;
      case 'recalculo':
        return <Badge className="bg-blue-100 text-blue-800 text-xs">{t('bankHours.recalculateType')}</Badge>;
      case 'correcao':
        return <Badge className="bg-green-100 text-green-800 text-xs">{t('bankHours.correctionType')}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{tipo}</Badge>;
    }
  };

  /**
   * Retorna badge de tipo de reajuste (entrada/saída)
   */
  const getBadgeTipoReajuste = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
      case 'positivo':
        return (
          <Badge className="bg-green-100 text-green-800 text-xs flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {t('bankHours.entryType')}
          </Badge>
        );
      case 'saida':
      case 'negativo':
        return (
          <Badge className="bg-red-100 text-red-800 text-xs flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            {t('bankHours.exitType')}
          </Badge>
        );
      default:
        return null;
    }
  };

  /**
   * Formata data e hora
   */
  const formatarDataHora = (data: Date | string) => {
    const dataObj = typeof data === 'string' ? new Date(data) : data;
    return format(dataObj, "dd/MM/yyyy HH:mm");
  };

  /**
   * Formata mês/ano para exibição
   */
  const formatarMesAno = (mes: number, ano: number) => {
    const monthKeys = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    return `${t(`bankHours.months.${monthKeys[mes - 1]}`)}/${ano}`;
  };
  
  /**
   * Formata valor baseado no tipo de cobrança
   */
  const formatarValorReajuste = (reajuste: BancoHorasReajuste | null) => {
    if (!reajuste) return null;
    
    if (isTicket) {
      // Para tickets, exibir valor_reajuste_tickets
      const tickets = reajuste.valor_reajuste_tickets;
      if (tickets === undefined || tickets === null) return '0';
      return tickets.toString();
    } else {
      // Para horas, exibir valor_reajuste_horas
      return reajuste.valor_reajuste_horas || '0:00';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-sonda-blue flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('bankHours.versionHistory')}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {t('bankHours.versionHistoryDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tabela de versões */}
          <Card>
            <CardContent className="pt-6">
              {isLoading || loadingReajustes || loadingUsuarios ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-sonda-blue" />
                </div>
              ) : versoes.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2 font-medium">
                      {t('bankHours.noVersionsFound')}
                    </p>
                    <p className="text-sm text-gray-400">
                      {t('bankHours.noVersionsDesc')}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-700 text-center">{t('bankHours.versionColumn')}</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">{t('bankHours.monthYearColumn')}</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">{t('bankHours.typeColumn')}</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">{t('bankHours.dateTimeColumn')}</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">{t('bankHours.userColumn')}</TableHead>
                        <TableHead className="font-semibold text-gray-700">{t('bankHours.reasonColumn')}</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">{t('bankHours.entryExitColumn')}</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center w-24">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {versoes.map((versao) => {
                        // Buscar reajuste pelo reajuste_id da versão (correto!)
                        const reajuste = versao.reajuste_id ? reajustes[versao.reajuste_id] : null;
                        
                        // Log detalhado para debug
                        console.log('🔍 [RENDER] Versão:', {
                          versao_id: versao.id,
                          versao_numero: versao.versao_nova,
                          reajuste_id: versao.reajuste_id,
                          tipo_mudanca: versao.tipo_mudanca,
                          reajuste_encontrado: !!reajuste,
                          valor_reajuste_horas: reajuste?.valor_reajuste_horas,
                          reajuste_completo: reajuste
                        });
                        
                        return (
                          <TableRow key={versao.id} className="hover:bg-gray-50">
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <FileText className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-sonda-blue">
                                  v{versao.versao_nova}
                                </span>
                                {versao.versao_anterior > 0 && (
                                  <>
                                    <ChevronRight className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-500">
                                      v{versao.versao_anterior}
                                    </span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {/* Mostrar mês/ano do reajuste se existir, senão usar mês/ano do modal */}
                              {reajuste && reajuste.mes && reajuste.ano ? (
                                <span className="text-sm font-medium text-gray-700">
                                  {formatarMesAno(reajuste.mes, reajuste.ano)}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-500">
                                  {formatarMesAno(mes, ano)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {/* Mostrar valor do reajuste baseado no tipo de cobrança */}
                              {reajuste ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="font-semibold text-sonda-blue text-base">
                                    {formatarValorReajuste(reajuste)}
                                  </span>
                                  {getBadgeTipoMudanca(versao.tipo_mudanca)}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  {getBadgeTipoMudanca(versao.tipo_mudanca)}
                                  {versao.tipo_mudanca === 'reajuste' && (
                                    <span className="text-xs text-gray-400 italic">
                                      {t('bankHours.noData')}
                                    </span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-gray-400" />
                                {formatarDataHora(versao.created_at)}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2 text-sm">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-700">
                                  {/* Mostrar autor do reajuste se existir, senão autor da versão */}
                                  {reajuste && reajuste.created_by ? (
                                    usuarios[reajuste.created_by] || t('common.loading')
                                  ) : versao.created_by ? (
                                    usuarios[versao.created_by] || t('common.loading')
                                  ) : (
                                    t('bankHours.system')
                                  )}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {/* Mostrar observacao_privada do reajuste ou motivo da versão */}
                                {reajuste && reajuste.observacao_privada ? (
                                  <div className="text-sm text-gray-600">
                                    {reajuste.observacao_privada}
                                  </div>
                                ) : versao.motivo ? (
                                  <div className="text-sm text-gray-600">
                                    {versao.motivo}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic text-sm">{t('bankHours.noReasonRegistered')}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {/* Mostrar tipo de reajuste */}
                              {reajuste && reajuste.tipo_reajuste ? (
                                getBadgeTipoReajuste(reajuste.tipo_reajuste)
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                  onClick={() => handleExcluirVersao(versao.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações adicionais */}
          {!isLoading && !loadingReajustes && !loadingUsuarios && versoes.length > 0 && (
            <div className="text-sm text-gray-500 text-center">
              {t('bankHours.showingVersions', { count: versoes.length })}
            </div>
          )}
        </div>
      </DialogContent>

      {/* AlertDialog de confirmação de exclusão */}
      <AlertDialog open={!!versaoParaExcluir} onOpenChange={(open) => !open && cancelarExclusao()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('bankHours.confirmDeletion')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('bankHours.confirmDeleteVersionDesc')}
              {versaoParaExcluir && versoes.find(v => v.id === versaoParaExcluir)?.reajuste_id && (
                <span className="block mt-2 text-orange-600 font-medium">
                  ⚠️ {t('bankHours.adjustmentWillBeDeactivated')}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelarExclusao} disabled={excluindo}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              disabled={excluindo}
              className="bg-red-600 hover:bg-red-700"
            >
              {excluindo ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('bankHours.deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common.delete')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default ModalHistorico;
