/**
 * Modal de Histórico de Versões - Banco de Horas
 * 
 * Componente que exibe o histórico completo de versões de um cálculo mensal,
 * permitindo visualização de mudanças, comparação entre versões e filtros.
 * 
 * Funcionalidades:
 * - Lista de versões com timestamp e usuário
 * - Botão "Comparar" entre duas versões
 * - Diff visual entre versões
 * - Exibição do motivo da mudança
 * - Filtros por data e tipo de mudança
 * 
 * @module components/admin/banco-horas/ModalHistorico
 * @requirements 12.4-12.10
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  History,
  GitCompare,
  Filter,
  X,
  Clock,
  User,
  FileText,
  AlertCircle,
  ChevronRight,
  Loader2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import type { BancoHorasVersao, DiferencasVersao, BancoHorasReajuste } from '@/types/bancoHoras';

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
  
  /** Callback para comparar versões */
  onCompararVersoes?: (versao1: BancoHorasVersao, versao2: BancoHorasVersao) => DiferencasVersao;
}

/**
 * Tipo de mudança para filtro
 */
type TipoMudancaFiltro = 'todos' | 'reajuste' | 'recalculo' | 'correcao';

/**
 * Componente ModalHistorico
 * 
 * Modal para visualização do histórico completo de versões de um cálculo mensal.
 * Permite filtrar, comparar e visualizar detalhes de cada mudança.
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
 *   onCompararVersoes={handleComparar}
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
  onCompararVersoes,
}) => {
  // Estado de comparação
  const [versoesParaComparar, setVersoesParaComparar] = useState<string[]>([]);
  const [comparacaoAtiva, setComparacaoAtiva] = useState(false);
  const [diferencas, setDiferencas] = useState<DiferencasVersao | null>(null);
  
  // Estado para dados de reajustes
  const [reajustes, setReajustes] = useState<Record<string, BancoHorasReajuste>>({});
  const [loadingReajustes, setLoadingReajustes] = useState(false);
  
  // Estado para nomes de usuários (tanto de versões quanto de reajustes)
  const [usuarios, setUsuarios] = useState<Record<string, string>>({});
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  /**
   * Busca dados de reajustes para versões
   */
  useEffect(() => {
    const buscarReajustes = async () => {
      if (versoes.length === 0) return;

      setLoadingReajustes(true);
      
      try {
        // Coletar IDs únicos de cálculos
        const calculoIds = versoes
          .map(v => v.calculo_id)
          .filter((id, index, self) => self.indexOf(id) === index); // unique

        console.log('🔍 [REAJUSTES] Buscando reajustes para calculo_ids:', calculoIds);
        
        // Buscar reajustes APENAS pelos calculo_ids das versões
        const { data, error } = await supabase
          .from('banco_horas_reajustes')
          .select('*')
          .in('calculo_id', calculoIds)
          .eq('ativo', true);

        if (error) {
          console.error('❌ [REAJUSTES] Erro ao buscar:', error);
          return;
        }

        console.log('✅ [REAJUSTES] Reajustes encontrados:', data);

        // Mapear reajustes por calculo_id (simples e direto)
        const reajustesMap: Record<string, BancoHorasReajuste> = {};
        data?.forEach(reajuste => {
          reajustesMap[reajuste.calculo_id] = reajuste;
          console.log('  ✅ Mapeado:', {
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

      console.log('👥 [USUARIOS] IDs para buscar:', userIds);

      if (userIds.length === 0) {
        console.log('⚠️ [USUARIOS] Nenhum ID para buscar');
        return;
      }

      setLoadingUsuarios(true);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nome, email')
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
          // Priorizar nome, depois email, depois ID
          usuariosMap[user.id] = user.nome || user.email?.split('@')[0] || `Usuário ${user.id.substring(0, 8)}`;
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
   * Seleciona versão para comparação
   */
  const handleSelecionarVersao = (versaoId: string, checked: boolean) => {
    if (checked) {
      if (versoesParaComparar.length < 2) {
        setVersoesParaComparar([...versoesParaComparar, versaoId]);
      }
    } else {
      setVersoesParaComparar(versoesParaComparar.filter(id => id !== versaoId));
    }
  };

  /**
   * Compara as versões selecionadas
   */
  const handleComparar = () => {
    if (versoesParaComparar.length !== 2 || !onCompararVersoes) {
      return;
    }

    const versao1 = versoes.find(v => v.id === versoesParaComparar[0]);
    const versao2 = versoes.find(v => v.id === versoesParaComparar[1]);

    if (versao1 && versao2) {
      const diff = onCompararVersoes(versao1, versao2);
      setDiferencas(diff);
      setComparacaoAtiva(true);
    }
  };

  /**
   * Cancela comparação
   */
  const handleCancelarComparacao = () => {
    setComparacaoAtiva(false);
    setDiferencas(null);
    setVersoesParaComparar([]);
  };

  /**
   * Retorna badge de tipo de mudança
   */
  const getBadgeTipoMudanca = (tipo: string) => {
    switch (tipo) {
      case 'reajuste':
        return <Badge className="bg-orange-100 text-orange-800 text-xs">Reajuste</Badge>;
      case 'recalculo':
        return <Badge className="bg-blue-100 text-blue-800 text-xs">Recálculo</Badge>;
      case 'correcao':
        return <Badge className="bg-green-100 text-green-800 text-xs">Correção</Badge>;
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
            Entrada
          </Badge>
        );
      case 'saida':
      case 'negativo':
        return (
          <Badge className="bg-red-100 text-red-800 text-xs flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            Saída
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
    return format(dataObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  /**
   * Renderiza visualização de comparação
   */
  const renderizarComparacao = () => {
    if (!diferencas) return null;

    const versao1 = versoes.find(v => v.id === versoesParaComparar[0]);
    const versao2 = versoes.find(v => v.id === versoesParaComparar[1]);

    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-sonda-blue" />
              Comparação de Versões
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelarComparacao}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Cabeçalho da comparação */}
          <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Versão {versao1?.versao_nova}</div>
              <div className="text-xs text-gray-500">
                {versao1 && formatarDataHora(versao1.created_at)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Versão {versao2?.versao_nova}</div>
              <div className="text-xs text-gray-500">
                {versao2 && formatarDataHora(versao2.created_at)}
              </div>
            </div>
          </div>

          {/* Campos modificados */}
          {diferencas.campos_modificados.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Campos Modificados ({diferencas.campos_modificados.length})
              </h4>
              <div className="space-y-2">
                {diferencas.campos_modificados.map((campo, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg text-sm"
                  >
                    <div className="font-medium text-gray-700">
                      {campo.campo.replace(/_/g, ' ')}
                    </div>
                    <div className="text-red-600">
                      <span className="text-xs text-gray-500 block mb-1">Anterior:</span>
                      {String(campo.valor_anterior || '-')}
                    </div>
                    <div className="text-green-600">
                      <span className="text-xs text-gray-500 block mb-1">Novo:</span>
                      {String(campo.valor_novo || '-')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campos adicionados */}
          {diferencas.campos_adicionados.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Campos Adicionados ({diferencas.campos_adicionados.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {diferencas.campos_adicionados.map((campo, index) => (
                  <Badge key={index} className="bg-green-100 text-green-800">
                    {campo.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Campos removidos */}
          {diferencas.campos_removidos.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Campos Removidos ({diferencas.campos_removidos.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {diferencas.campos_removidos.map((campo, index) => (
                  <Badge key={index} className="bg-red-100 text-red-800">
                    {campo.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Mensagem se não houver diferenças */}
          {diferencas.campos_modificados.length === 0 &&
           diferencas.campos_adicionados.length === 0 &&
           diferencas.campos_removidos.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma diferença encontrada entre as versões selecionadas.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-sonda-blue flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Versões
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Visualize todas as mudanças realizadas no período selecionado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barra de ações - apenas botão de comparar */}
          {versoesParaComparar.length === 2 && (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleComparar}
                className="bg-sonda-blue hover:bg-sonda-dark-blue"
              >
                <GitCompare className="h-4 w-4 mr-2" />
                Comparar Versões
              </Button>
            </div>
          )}

          {/* Visualização de comparação */}
          {comparacaoAtiva && renderizarComparacao()}

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
                      Nenhuma versão encontrada
                    </p>
                    <p className="text-sm text-gray-400">
                      Não há histórico de versões para este período
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12">
                          <span className="sr-only">Selecionar</span>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Versão</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Tipo</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Data/Hora</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Usuário</TableHead>
                        <TableHead className="font-semibold text-gray-700">Motivo</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Entrada/Saída</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {versoes.map((versao) => {
                        // Buscar reajuste pelo calculo_id (simples e direto)
                        const reajuste = reajustes[versao.calculo_id];
                        
                        // Log simplificado
                        console.log('🔍 [RENDER] Versão:', {
                          versao: versao.versao_nova,
                          calculo_id: versao.calculo_id,
                          tipo_mudanca: versao.tipo_mudanca,
                          reajuste_encontrado: !!reajuste,
                          valor_reajuste_horas: reajuste?.valor_reajuste_horas
                        });
                        
                        return (
                          <TableRow key={versao.id} className="hover:bg-gray-50">
                            <TableCell>
                              <Checkbox
                                checked={versoesParaComparar.includes(versao.id)}
                                onCheckedChange={(checked) => 
                                  handleSelecionarVersao(versao.id, checked as boolean)
                                }
                                disabled={
                                  versoesParaComparar.length >= 2 && 
                                  !versoesParaComparar.includes(versao.id)
                                }
                              />
                            </TableCell>
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
                              {/* Mostrar valor_reajuste_horas do reajuste */}
                              {reajuste && reajuste.valor_reajuste_horas ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="font-semibold text-sonda-blue text-base">
                                    {reajuste.valor_reajuste_horas}
                                  </span>
                                  {getBadgeTipoMudanca(versao.tipo_mudanca)}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  {getBadgeTipoMudanca(versao.tipo_mudanca)}
                                  {versao.tipo_mudanca === 'reajuste' && (
                                    <span className="text-xs text-gray-400 italic">
                                      Sem dados de horas
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
                                    usuarios[reajuste.created_by] || 'Carregando...'
                                  ) : versao.created_by ? (
                                    usuarios[versao.created_by] || 'Carregando...'
                                  ) : (
                                    'Sistema'
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
                                  <span className="text-gray-400 italic text-sm">Sem motivo registrado</span>
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
              Mostrando {versoes.length} versão(ões)
              {versoesParaComparar.length > 0 && (
                <span className="ml-2">
                  • {versoesParaComparar.length} versão(ões) selecionada(s) para comparação
                </span>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModalHistorico;
