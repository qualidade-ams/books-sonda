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

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { BancoHorasVersao, DiferencasVersao } from '@/types/bancoHoras';

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
  
  /** Mês (1-12) */
  mes: number;
  
  /** Ano (ex: 2024) */
  ano: number;
  
  /** Lista de versões a exibir */
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
  // Estado de filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<TipoMudancaFiltro>('todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  
  // Estado de comparação
  const [versoesParaComparar, setVersoesParaComparar] = useState<string[]>([]);
  const [comparacaoAtiva, setComparacaoAtiva] = useState(false);
  const [diferencas, setDiferencas] = useState<DiferencasVersao | null>(null);

  /**
   * Versões filtradas
   */
  const versoesFiltradas = useMemo(() => {
    let resultado = [...versoes];

    // Filtrar por tipo
    if (filtroTipo !== 'todos') {
      resultado = resultado.filter(v => v.tipo_mudanca === filtroTipo);
    }

    // Filtrar por data início
    if (filtroDataInicio) {
      const dataInicio = new Date(filtroDataInicio);
      resultado = resultado.filter(v => new Date(v.created_at) >= dataInicio);
    }

    // Filtrar por data fim
    if (filtroDataFim) {
      const dataFim = new Date(filtroDataFim);
      dataFim.setHours(23, 59, 59, 999); // Incluir o dia inteiro
      resultado = resultado.filter(v => new Date(v.created_at) <= dataFim);
    }

    return resultado;
  }, [versoes, filtroTipo, filtroDataInicio, filtroDataFim]);

  /**
   * Verifica se há filtros ativos
   */
  const hasActiveFilters = () => {
    return filtroTipo !== 'todos' || filtroDataInicio !== '' || filtroDataFim !== '';
  };

  /**
   * Limpa todos os filtros
   */
  const limparFiltros = () => {
    setFiltroTipo('todos');
    setFiltroDataInicio('');
    setFiltroDataFim('');
  };

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
            Visualize todas as mudanças realizadas no cálculo de {mes}/{ano}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barra de ações */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>Filtros</span>
              </Button>
              
              {hasActiveFilters() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={limparFiltros}
                  className="whitespace-nowrap hover:border-red-300"
                >
                  <X className="h-4 w-4 mr-2 text-red-600" />
                  Limpar Filtro
                </Button>
              )}
            </div>

            {versoesParaComparar.length === 2 && (
              <Button
                size="sm"
                onClick={handleComparar}
                className="bg-sonda-blue hover:bg-sonda-dark-blue"
              >
                <GitCompare className="h-4 w-4 mr-2" />
                Comparar Versões
              </Button>
            )}
          </div>

          {/* Área de filtros expansível */}
          {showFilters && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Filtro Tipo de Mudança */}
                  <div>
                    <div className="text-sm font-medium mb-2">Tipo de Mudança</div>
                    <Select 
                      value={filtroTipo} 
                      onValueChange={(value) => setFiltroTipo(value as TipoMudancaFiltro)}
                    >
                      <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os tipos</SelectItem>
                        <SelectItem value="reajuste">Reajuste</SelectItem>
                        <SelectItem value="recalculo">Recálculo</SelectItem>
                        <SelectItem value="correcao">Correção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro Data Início */}
                  <div>
                    <div className="text-sm font-medium mb-2">Data Início</div>
                    <input
                      type="date"
                      value={filtroDataInicio}
                      onChange={(e) => setFiltroDataInicio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-sonda-blue focus:border-sonda-blue text-sm"
                    />
                  </div>

                  {/* Filtro Data Fim */}
                  <div>
                    <div className="text-sm font-medium mb-2">Data Fim</div>
                    <input
                      type="date"
                      value={filtroDataFim}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-sonda-blue focus:border-sonda-blue text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Visualização de comparação */}
          {comparacaoAtiva && renderizarComparacao()}

          {/* Tabela de versões */}
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-sonda-blue" />
                </div>
              ) : versoesFiltradas.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2 font-medium">
                      Nenhuma versão encontrada
                    </p>
                    <p className="text-sm text-gray-400">
                      {hasActiveFilters() 
                        ? 'Tente ajustar os filtros para ver mais resultados'
                        : 'Não há histórico de versões para este período'
                      }
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
                        <TableHead className="font-semibold text-gray-700">Versão</TableHead>
                        <TableHead className="font-semibold text-gray-700">Tipo</TableHead>
                        <TableHead className="font-semibold text-gray-700">Data/Hora</TableHead>
                        <TableHead className="font-semibold text-gray-700">Usuário</TableHead>
                        <TableHead className="font-semibold text-gray-700">Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {versoesFiltradas.map((versao) => (
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
                          <TableCell>
                            <div className="flex items-center gap-2">
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
                          <TableCell>
                            {getBadgeTipoMudanca(versao.tipo_mudanca)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-gray-400" />
                              {formatarDataHora(versao.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700">
                                {versao.created_by || 'Sistema'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-600 max-w-md truncate">
                              {versao.motivo}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações adicionais */}
          {!isLoading && versoesFiltradas.length > 0 && (
            <div className="text-sm text-gray-500 text-center">
              Mostrando {versoesFiltradas.length} de {versoes.length} versões
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
