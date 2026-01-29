/**
 * Página para visualização de todas as pesquisas de satisfação
 */

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Eye, X, Filter, Edit, Trash2, Search, FileText, Clock, CheckCircle, Server, FileEdit, Check, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';

import LayoutAdmin from '@/components/admin/LayoutAdmin';
import { PesquisasExportButtons } from '@/components/admin/pesquisas-satisfacao';
import { VisualizarPesquisasTable } from '@/components/admin/pesquisas-satisfacao';
import { ClienteNomeDisplay } from '@/components/admin/requerimentos/ClienteNomeDisplay';
import { 
  useTodasPesquisasSatisfacao, 
  useTodasEstatisticasPesquisas,
  useAtualizarPesquisa,
  useExcluirPesquisa
} from '@/hooks/usePesquisasSatisfacao';
import { useCacheManager } from '@/hooks/useCacheManager';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useCategorias, useGruposPorCategoria } from '@/hooks/useDeParaCategoria';
import { MultiSelectEspecialistas } from '@/components/ui/multi-select-especialistas';
import { useEspecialistasIdsPesquisa, useEspecialistasPesquisa } from '@/hooks/useEspecialistasRelacionamentos';
import { useCorrelacaoMultiplosEspecialistas } from '@/hooks/useCorrelacaoEspecialistas';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import type { FiltrosPesquisas } from '@/types/pesquisasSatisfacao';
import { ORIGEM_PESQUISA_OPTIONS, RESPOSTA_PESQUISA_OPTIONS, MESES_OPTIONS } from '@/types/pesquisasSatisfacao';

function VisualizarPesquisas() {
  const { clearFeatureCache } = useCacheManager();
  
  // Limpar cache ao entrar na tela
  useEffect(() => {
    clearFeatureCache('pesquisas');
  }, [clearFeatureCache]);

  // Estados para filtros
  const [filtrosBusca, setFiltrosBusca] = useState({
    busca: '',
    origem: 'todos',
    resposta: 'todas'
  });
  const [filtroMesPeriodo, setFiltroMesPeriodo] = useState<number | null>(null);
  const [filtroAnoPeriodo, setFiltroAnoPeriodo] = useState<number | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Filtros aplicados
  const filtros: FiltrosPesquisas = {
    // Incluir busca apenas se não estiver vazia
    ...(filtrosBusca.busca.trim() && { busca: filtrosBusca.busca }),
    // Incluir origem apenas se não for 'todos'
    ...(filtrosBusca.origem !== 'todos' && { origem: filtrosBusca.origem as 'sql_server' | 'manual' }),
    // Incluir resposta apenas se não for 'todas'
    ...(filtrosBusca.resposta !== 'todas' && { resposta: filtrosBusca.resposta }),
    // Incluir ano e mês se estiverem definidos
    ...(filtroAnoPeriodo !== null && { ano: filtroAnoPeriodo }),
    ...(filtroMesPeriodo !== null && { mes: filtroMesPeriodo })
  };
  
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);
  const [pesquisaSelecionada, setPesquisaSelecionada] = useState<any>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  
  // Estados para edição e exclusão
  const [pesquisaEditando, setPesquisaEditando] = useState<any>(null);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [pesquisaExcluindo, setPesquisaExcluindo] = useState<any>(null);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  
  // Estados para formulário de edição
  const [dadosEdicao, setDadosEdicao] = useState({
    empresa: '',
    cliente: '',
    email_cliente: '',
    prestador: '',
    solicitante: '',
    categoria: '',
    grupo: '',
    tipo_caso: '',
    nro_caso: '',
    comentario_pesquisa: '',
    resposta: '',
    status: '',
    data_resposta: '',
    observacao: '',
    especialistas_ids: [] as string[]
  });
  
  // Estado para busca de categoria
  const [searchCategoria, setSearchCategoria] = useState('');

  // Hooks para dados de seleção
  const { empresas } = useEmpresas();
  const { data: categorias = [] } = useCategorias();
  
  // Filtrar categorias baseado na busca
  const categoriasFiltradas = useMemo(() => {
    if (!searchCategoria.trim()) {
      return categorias;
    }
    
    const termoBusca = searchCategoria.toLowerCase().trim();
    
    return categorias.filter((categoria) => {
      const labelLower = categoria.label.toLowerCase();
      
      // Buscar por palavras completas ou início de palavras
      // Divide o label em palavras (separadas por ponto, espaço, etc)
      const palavras = labelLower.split(/[.\s]+/);
      
      // Verifica se alguma palavra começa com o termo buscado
      return palavras.some(palavra => palavra.startsWith(termoBusca)) ||
             // OU se o termo está no início do label completo
             labelLower.startsWith(termoBusca) ||
             // OU se o termo aparece após um ponto (início de seção)
             labelLower.includes('.' + termoBusca);
    });
  }, [searchCategoria, categorias]);
  
  // Observar mudanças na categoria selecionada para buscar grupos
  const { data: grupos = [] } = useGruposPorCategoria(dadosEdicao.categoria);

  // Buscar especialistas relacionados à pesquisa (para edição) - RETORNA { ids, isLoading }
  const { ids: especialistasIdsRelacionados, isLoading: loadingRelacionados } = useEspecialistasIdsPesquisa(pesquisaEditando?.id);
  
  console.log('🔍 [VisualizarPesquisas] === DADOS DE ESPECIALISTAS ===');
  console.log('🔍 [VisualizarPesquisas] Pesquisa Editando:', pesquisaEditando?.id);
  console.log('🔍 [VisualizarPesquisas] Prestador:', pesquisaEditando?.prestador);
  console.log('🔍 [VisualizarPesquisas] IDs Relacionados (do banco):', especialistasIdsRelacionados);
  console.log('🔍 [VisualizarPesquisas] Quantidade de IDs Relacionados:', especialistasIdsRelacionados.length);
  console.log('🔍 [VisualizarPesquisas] Loading Relacionados:', loadingRelacionados);
  
  // Buscar especialistas para visualização
  const { data: especialistasVisualizacao = [] } = useEspecialistasPesquisa(pesquisaSelecionada?.id);
  
  // Correlação automática baseada no campo prestador - CORRIGIDO
  const { data: especialistasIdsCorrelacionados = [], isLoading: loadingCorrelacao } = useCorrelacaoMultiplosEspecialistas(
    pesquisaEditando?.prestador && especialistasIdsRelacionados.length === 0 
      ? pesquisaEditando.prestador 
      : undefined
  );
  
  console.log('🔍 [VisualizarPesquisas] IDs Correlacionados (automático):', especialistasIdsCorrelacionados);
  console.log('🔍 [VisualizarPesquisas] Quantidade de IDs Correlacionados:', especialistasIdsCorrelacionados.length);
  console.log('🔍 [VisualizarPesquisas] Loading Correlação:', loadingCorrelacao);
  console.log('🔍 [VisualizarPesquisas] Condição para correlação:', {
    temPrestador: !!pesquisaEditando?.prestador,
    prestador: pesquisaEditando?.prestador,
    relacionadosVazio: especialistasIdsRelacionados.length === 0,
    deveCorrelacionar: !!(pesquisaEditando?.prestador && especialistasIdsRelacionados.length === 0)
  });
  
  // Usar relacionamentos salvos ou correlação automática - GARANTIR UNICIDADE
  const especialistasIdsUnicos = [...new Set(
    especialistasIdsRelacionados.length > 0 
      ? especialistasIdsRelacionados 
      : especialistasIdsCorrelacionados
  )];
  
  console.log('🔍 [VisualizarPesquisas] IDs Únicos (após Set):', especialistasIdsUnicos);
  console.log('🔍 [VisualizarPesquisas] Quantidade de IDs Únicos:', especialistasIdsUnicos.length);
  console.log('🔍 [VisualizarPesquisas] === FIM DADOS DE ESPECIALISTAS ===');
  
  const especialistasIds = especialistasIdsUnicos;
  const especialistasLoading = loadingRelacionados || loadingCorrelacao;

  // Queries - usando hook que traz TODAS as pesquisas sem filtros automáticos
  const { data: pesquisas = [], isLoading, refetch } = useTodasPesquisasSatisfacao(filtros);
  const { data: estatisticas } = useTodasEstatisticasPesquisas(filtros);
  
  // Mutations
  const atualizarPesquisaMutation = useAtualizarPesquisa();
  const excluirPesquisaMutation = useExcluirPesquisa();

  // Opções de tipo de chamado
  const tiposChamado = [
    { value: 'IM', label: 'IM - Incidente' },
    { value: 'PR', label: 'PR - Problema' },
    { value: 'RF', label: 'RF - Requisição' }
  ];

  // Debug removido para evitar logs excessivos no console

  // Preencher grupo automaticamente quando categoria for selecionada
  useEffect(() => {
    if (dadosEdicao.categoria && grupos.length > 0) {
      // Se há apenas um grupo para a categoria, seleciona automaticamente
      if (grupos.length === 1) {
        setDadosEdicao(prev => ({ ...prev, grupo: grupos[0].value }));
      }
      // Se o grupo atual não está na lista de grupos válidos, limpa o campo
      else {
        const grupoValido = grupos.find(g => g.value === dadosEdicao.grupo);
        if (!grupoValido) {
          setDadosEdicao(prev => ({ ...prev, grupo: '' }));
        }
      }
    } else if (!dadosEdicao.categoria) {
      // Se categoria foi limpa, limpa o grupo também
      setDadosEdicao(prev => ({ ...prev, grupo: '' }));
    }
  }, [dadosEdicao.categoria, grupos]);

  // Preencher especialistas quando pesquisa for carregada - AGUARDAR LOADING
  useEffect(() => {
    console.log('🔄 [VisualizarPesquisas useEffect] === EXECUÇÃO ===');
    console.log('🔄 [VisualizarPesquisas useEffect] pesquisaEditando:', pesquisaEditando?.id);
    console.log('🔄 [VisualizarPesquisas useEffect] especialistasIds:', especialistasIds);
    console.log('🔄 [VisualizarPesquisas useEffect] especialistasLoading:', especialistasLoading);
    console.log('🔄 [VisualizarPesquisas useEffect] dadosEdicao.especialistas_ids atual:', dadosEdicao.especialistas_ids);
    
    if (pesquisaEditando && !especialistasLoading) {
      console.log('✅ [VisualizarPesquisas useEffect] Dados carregados! Atualizando especialistas_ids para:', especialistasIds);
      
      // Aguardar um pouco para garantir que o DOM está estável
      setTimeout(() => {
        setDadosEdicao(prev => ({ ...prev, especialistas_ids: especialistasIds }));
      }, 100);
    }
  }, [pesquisaEditando?.id, especialistasIds.length, especialistasLoading]); // Incluir especialistasLoading nas dependências

  const handleVisualizarDetalhes = (pesquisa: any) => {
    setPesquisaSelecionada(pesquisa);
    setModalDetalhesAberto(true);
  };

  const handleEditarPesquisa = (pesquisa: any) => {
    console.log('📝 [handleEditarPesquisa] === INÍCIO ===');
    console.log('📝 [handleEditarPesquisa] Pesquisa:', pesquisa);
    console.log('📝 [handleEditarPesquisa] Pesquisa ID:', pesquisa.id);
    console.log('📝 [handleEditarPesquisa] Prestador:', pesquisa.prestador);
    
    setPesquisaEditando(pesquisa);
    
    // Tentar encontrar a empresa pelo nome completo ou abreviado
    const empresaEncontrada = empresas.find(
      e => e.nome_completo === pesquisa.empresa || e.nome_abreviado === pesquisa.empresa
    );
    
    // Usar o nome_completo se encontrou, senão usar o valor original
    const empresaValue = empresaEncontrada ? empresaEncontrada.nome_completo : pesquisa.empresa;
    
    console.log('📝 [handleEditarPesquisa] Inicializando dadosEdicao com especialistas_ids: []');
    
    setDadosEdicao({
      empresa: empresaValue || '',
      cliente: pesquisa.cliente || '',
      email_cliente: pesquisa.email_cliente || '',
      prestador: pesquisa.prestador || '',
      solicitante: pesquisa.solicitante || '',
      categoria: pesquisa.categoria || '',
      grupo: pesquisa.grupo || '',
      tipo_caso: pesquisa.tipo_caso || '',
      nro_caso: pesquisa.nro_caso || '',
      comentario_pesquisa: pesquisa.comentario_pesquisa || '',
      resposta: pesquisa.resposta || '',
      status: pesquisa.status || 'pendente',
      data_resposta: pesquisa.data_resposta ? new Date(pesquisa.data_resposta).toISOString().slice(0, 16) : '',
      observacao: pesquisa.observacao || '',
      especialistas_ids: [] // Será preenchido pelo useEffect
    });
    
    console.log('📝 [handleEditarPesquisa] === FIM ===');
    setModalEditarAberto(true);
  };

  const handleExcluirPesquisa = (pesquisa: any) => {
    setPesquisaExcluindo(pesquisa);
    setModalExcluirAberto(true);
  };

  const confirmarExclusao = async () => {
    if (!pesquisaExcluindo) return;
    
    try {
      await excluirPesquisaMutation.mutateAsync(pesquisaExcluindo.id);
      
      toast.success("Pesquisa excluída com sucesso!");
      
      setModalExcluirAberto(false);
      setPesquisaExcluindo(null);
      
      // Refetch para atualizar a lista
      refetch();
      clearFeatureCache('pesquisas');
      
    } catch (error) {
      console.error('Erro ao excluir pesquisa:', error);
      toast.error("Erro ao excluir pesquisa. Tente novamente.");
    }
  };

  const salvarEdicao = async () => {
    if (!pesquisaEditando) return;
    
    try {
      await atualizarPesquisaMutation.mutateAsync({
        id: pesquisaEditando.id,
        dados: {
          empresa: dadosEdicao.empresa,
          cliente: dadosEdicao.cliente,
          email_cliente: dadosEdicao.email_cliente || null,
          solicitante: dadosEdicao.solicitante || null,
          categoria: dadosEdicao.categoria || null,
          grupo: dadosEdicao.grupo || null,
          tipo_caso: dadosEdicao.tipo_caso || null,
          nro_caso: dadosEdicao.nro_caso || null,
          comentario_pesquisa: dadosEdicao.comentario_pesquisa || null,
          resposta: dadosEdicao.resposta || null,
          data_resposta: dadosEdicao.data_resposta ? new Date(dadosEdicao.data_resposta) : null,
          observacao: dadosEdicao.observacao || null,
          especialistas_ids: dadosEdicao.especialistas_ids || []
        }
      });
      
      toast.success("Pesquisa atualizada com sucesso!");
      
      setModalEditarAberto(false);
      setPesquisaEditando(null);
      
      // Refetch para atualizar a lista
      refetch();
      clearFeatureCache('pesquisas');
      
    } catch (error) {
      console.error('Erro ao atualizar pesquisa:', error);
      toast.error("Erro ao atualizar pesquisa. Tente novamente.");
    }
  };

  // Função para atualizar filtros
  const handleAtualizarFiltro = (campo: string, valor: any) => {
    console.log(`🔄 Atualizando filtro ${campo}:`, valor);
    setFiltrosBusca(prev => ({ ...prev, [campo]: valor }));
    setPaginaAtual(1); // Resetar para primeira página ao filtrar
    
    // Limpar cache para forçar nova busca
    clearFeatureCache('pesquisas');
  };

  // Função para limpar todos os filtros
  const limparFiltros = () => {
    setFiltrosBusca({
      busca: '',
      origem: 'todos',
      resposta: 'todas'
    });
    setFiltroMesPeriodo(null);
    setFiltroAnoPeriodo(null);
    setPaginaAtual(1);
    clearFeatureCache('pesquisas');
  };

  // Função para verificar se há filtros ativos
  const hasActiveFilters = () => {
    return filtrosBusca.busca !== '' || 
           filtrosBusca.origem !== 'todos' || 
           filtrosBusca.resposta !== 'todas' || 
           filtroMesPeriodo !== null || 
           filtroAnoPeriodo !== null;
  };

  // Código de agrupamento por mês removido

  // Calcular paginação
  const totalPaginas = Math.ceil(pesquisas.length / itensPorPagina);
  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const indiceFinal = indiceInicial + itensPorPagina;
  const pesquisasPaginadas = pesquisas.slice(indiceInicial, indiceFinal);

  const handlePaginaAnterior = () => {
    setPaginaAtual(prev => Math.max(1, prev - 1));
  };

  const handleProximaPagina = () => {
    setPaginaAtual(prev => Math.min(totalPaginas, prev + 1));
  };

  const handleAlterarItensPorPagina = (valor: string) => {
    const numValor = valor === 'todos' ? pesquisas.length : Number(valor);
    setItensPorPagina(numValor);
    setPaginaAtual(1);
  };

  return (
    <LayoutAdmin>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Pesquisas de Satisfação
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Visualize todas as pesquisas de satisfação registradas no sistema
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <PesquisasExportButtons
              pesquisas={pesquisas}
              estatisticas={estatisticas || {
                total: 0,
                pendentes: 0,
                enviados: 0,
                sql_server: 0,
                manuais: 0,
                sem_resposta: 0,
                pendentes_lancamento: 0,
                por_empresa: {},
                por_categoria: {},
                por_mes: {}
              }}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Cards de Estatísticas */}
        {estatisticas && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 lg:gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <p className="text-xs font-medium text-gray-500">Total</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{estatisticas.total}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <X className="h-4 w-4 text-red-500" />
                  <p className="text-xs font-medium text-red-500">Sem Resposta</p>
                </div>
                <p className="text-2xl font-bold text-red-600">{estatisticas.sem_resposta}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <p className="text-xs font-medium text-orange-500">Pendentes (Lançamento)</p>
                </div>
                <p className="text-2xl font-bold text-orange-600">{estatisticas.pendentes_lancamento}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <p className="text-xs font-medium text-green-500">Enviados</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{estatisticas.enviados}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="h-4 w-4 text-blue-500" />
                  <p className="text-xs font-medium text-blue-500">SQL Server</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">{estatisticas.sql_server}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileEdit className="h-4 w-4 text-purple-500" />
                  <p className="text-xs font-medium text-purple-500">Manuais</p>
                </div>
                <p className="text-2xl font-bold text-purple-600">{estatisticas.manuais}</p>
              </CardContent>
            </Card>
          </div>
        )}



        {/* Tabela */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Todas as Pesquisas ({pesquisas.length})
              </CardTitle>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                  className="flex items-center justify-center space-x-2"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filtros</span>
                </Button>
                
                {/* Botão Limpar Filtro - só aparece se há filtros ativos */}
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
            </div>

            {/* Área de filtros expansível - PADRÃO DESIGN SYSTEM */}
            {mostrarFiltros && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Campo de busca com ícone */}
                  <div>
                    <div className="text-sm font-medium mb-2">Buscar</div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar por empresa, cliente..."
                        value={filtrosBusca.busca}
                        onChange={(e) => handleAtualizarFiltro('busca', e.target.value)}
                        className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                      />
                    </div>
                  </div>

                  {/* Filtro Origem */}
                  <div>
                    <div className="text-sm font-medium mb-2">Origem</div>
                    <Select
                      value={filtrosBusca.origem}
                      onValueChange={(value) => handleAtualizarFiltro('origem', value)}
                      defaultValue="todos"
                    >
                      <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                        <SelectValue placeholder="Todas as origens" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORIGEM_PESQUISA_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro Resposta */}
                  <div>
                    <div className="text-sm font-medium mb-2">Resposta</div>
                    <Select
                      value={filtrosBusca.resposta}
                      onValueChange={(value) => handleAtualizarFiltro('resposta', value)}
                      defaultValue="todas"
                    >
                      <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                        <SelectValue placeholder="Todas as respostas" />
                      </SelectTrigger>
                      <SelectContent>
                        {RESPOSTA_PESQUISA_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro Data da Resposta */}
                  <div>
                    <div className="text-sm font-medium mb-2">Data da Resposta</div>
                    <MonthYearPicker
                      value={
                        filtroMesPeriodo !== null && filtroAnoPeriodo !== null
                          ? `${filtroMesPeriodo.toString().padStart(2, '0')}/${filtroAnoPeriodo}`
                          : ''
                      }
                      onChange={(value) => {
                        if (value) {
                          const [mes, ano] = value.split('/');
                          setFiltroMesPeriodo(parseInt(mes));
                          setFiltroAnoPeriodo(parseInt(ano));
                        } else {
                          setFiltroMesPeriodo(null);
                          setFiltroAnoPeriodo(null);
                        }
                      }}
                      placeholder="Todos os períodos"
                      className="focus:ring-sonda-blue focus:border-sonda-blue"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <VisualizarPesquisasTable
              pesquisas={pesquisasPaginadas}
              isLoading={isLoading}
              onVisualizarDetalhes={handleVisualizarDetalhes}
              onEditarPesquisa={handleEditarPesquisa}
              onExcluirPesquisa={handleExcluirPesquisa}
            />

            {/* Paginação no Rodapé */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
              {/* Select de itens por página */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Mostrar</span>
                <Select
                  value={itensPorPagina >= pesquisas.length ? 'todos' : itensPorPagina.toString()}
                  onValueChange={handleAlterarItensPorPagina}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                    <SelectItem value="todos">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Navegação de páginas */}
              {totalPaginas > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePaginaAnterior}
                    disabled={paginaAtual === 1}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                    Página {paginaAtual} de {totalPaginas}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleProximaPagina}
                    disabled={paginaAtual === totalPaginas}
                    aria-label="Próxima página"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Contador de registros */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {indiceInicial + 1}-{Math.min(indiceFinal, pesquisas.length)} de {pesquisas.length} pesquisas
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Detalhes da Pesquisa */}
        <Dialog open={modalDetalhesAberto} onOpenChange={setModalDetalhesAberto}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Detalhes da Pesquisa de Satisfação
              </DialogTitle>
              <DialogDescription>
                Visualize todas as informações detalhadas da pesquisa selecionada.
              </DialogDescription>
            </DialogHeader>
            
            {pesquisaSelecionada && (
              <div className="space-y-6 py-4">
                {/* Dados Principais */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Dados Principais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Empresa <span className="text-black">*</span>
                      </label>
                      <Input
                        value={pesquisaSelecionada.empresa}
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cliente <span className="text-black">*</span>
                      </label>
                      <Input
                        value={pesquisaSelecionada.cliente}
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email do Cliente</label>
                      <Input
                        value={pesquisaSelecionada.email_cliente || ''}
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Solicitante</label>
                      <Input
                        value={pesquisaSelecionada.solicitante || ''}
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Consultores</label>
                    <Input
                      value={especialistasVisualizacao.length > 0 
                        ? especialistasVisualizacao.map(e => e.nome).join(', ')
                        : pesquisaSelecionada.prestador || 'Nenhum consultor relacionado'
                      }
                      disabled
                      className="bg-gray-50 text-gray-900"
                    />
                  </div>
                </div>

                {/* Categorização */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Categorização</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                      <Input
                        value={pesquisaSelecionada.categoria || ''}
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
                      <Input
                        value={pesquisaSelecionada.grupo || ''}
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Informações do Caso */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Informações do Caso</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo do Chamado</label>
                      <Input
                        value={pesquisaSelecionada.tipo_caso || ''}
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Número do Chamado</label>
                      <Input
                        value={pesquisaSelecionada.nro_caso || ''}
                        disabled
                        className="bg-gray-50 text-gray-900 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Feedback do Cliente */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Feedback do Cliente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Resposta <span className="text-black">*</span>
                      </label>
                      <Input
                        value={pesquisaSelecionada.resposta || ''}
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data da Resposta</label>
                      <Input
                        value={pesquisaSelecionada.data_resposta 
                          ? new Date(pesquisaSelecionada.data_resposta).toLocaleString('pt-BR')
                          : ''
                        }
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comentário da Pesquisa <span className="text-black">*</span>
                    </label>
                    <textarea 
                      value={pesquisaSelecionada.comentario_pesquisa || 'Nenhum comentário registrado'}
                      disabled
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-md min-h-[100px] text-sm text-gray-900 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observação Interna</label>
                    <textarea 
                      value={pesquisaSelecionada.observacao || 'Nenhuma observação registrada'}
                      disabled
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-md min-h-[80px] text-sm text-gray-900 resize-none"
                    />
                  </div>
                </div>

                {/* Informações do Sistema */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Informações do Sistema</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID da Pesquisa</label>
                      <Input
                        value={pesquisaSelecionada.id}
                        disabled
                        className="bg-gray-50 text-gray-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
                      <Input
                        value={pesquisaSelecionada.origem === 'sql_server' ? 'SQL Server' : 'Manual'}
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <Input
                        value={pesquisaSelecionada.status}
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data de Criação</label>
                      <Input
                        value={new Date(pesquisaSelecionada.created_at).toLocaleString('pt-BR')}
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Autor</label>
                      <Input
                        value={pesquisaSelecionada.autor_nome || ''}
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data de Envio</label>
                      <Input
                        value={pesquisaSelecionada.data_envio 
                          ? new Date(pesquisaSelecionada.data_envio).toLocaleString('pt-BR')
                          : ''
                        }
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Edição */}
        <Dialog open={modalEditarAberto} onOpenChange={setModalEditarAberto}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Editar Pesquisa de Satisfação
              </DialogTitle>
              <DialogDescription>
                Edite as informações da pesquisa de satisfação selecionada.
              </DialogDescription>
            </DialogHeader>
            
            {pesquisaEditando && (
              <div className="space-y-6 py-4">
                {/* Dados Principais */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Dados Principais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Empresa <span className="text-black">*</span>
                      </label>
                      <Select 
                        value={dadosEdicao.empresa} 
                        onValueChange={(value) => setDadosEdicao(prev => ({ ...prev, empresa: value }))}
                      >
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder="Selecione a empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            // Item fixo SONDA INTERNO
                            { 
                              id: 'sonda-interno', 
                              nome_completo: 'SONDA INTERNO', 
                              nome_abreviado: 'SONDA INTERNO',
                              status: 'ativo',
                              isFixed: true 
                            },
                            // Empresas reais cadastradas
                            ...empresas.filter((empresa) => empresa.status === 'ativo')
                          ]
                            .sort((a, b) => a.nome_abreviado.localeCompare(b.nome_abreviado, 'pt-BR'))
                            .map(item => (
                              <SelectItem 
                                key={item.id} 
                                value={'isFixed' in item && item.isFixed ? 'SONDA INTERNO' : item.nome_completo}
                              >
                                {item.nome_abreviado}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cliente <span className="text-black">*</span>
                      </label>
                      <Input 
                        value={dadosEdicao.cliente}
                        onChange={(e) => setDadosEdicao(prev => ({ ...prev, cliente: e.target.value }))}
                        className="focus:ring-sonda-blue focus:border-sonda-blue"
                        placeholder="Nome do cliente"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email do Cliente</label>
                      <Input 
                        type="email"
                        value={dadosEdicao.email_cliente}
                        onChange={(e) => setDadosEdicao(prev => ({ ...prev, email_cliente: e.target.value }))}
                        className="focus:ring-sonda-blue focus:border-sonda-blue"
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Solicitante</label>
                      <Input 
                        value={dadosEdicao.solicitante}
                        onChange={(e) => setDadosEdicao(prev => ({ ...prev, solicitante: e.target.value }))}
                        className="focus:ring-sonda-blue focus:border-sonda-blue"
                        placeholder="Nome do solicitante"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Consultores</label>
                    <MultiSelectEspecialistas
                      value={dadosEdicao.especialistas_ids}
                      onValueChange={(value) => setDadosEdicao(prev => ({ ...prev, especialistas_ids: value }))}
                      placeholder="Selecione os consultores..."
                      className="focus:ring-sonda-blue focus:border-sonda-blue"
                    />
                  </div>
                </div>

                {/* Categorização */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Categorização</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Categoria <span className="text-black">*</span>
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between text-left font-normal"
                          >
                            {dadosEdicao.categoria
                              ? categorias.find((cat) => cat.value === dadosEdicao.categoria)?.label
                              : "Selecione a categoria"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput 
                              placeholder="Buscar categoria..." 
                              value={searchCategoria}
                              onValueChange={setSearchCategoria}
                            />
                            <CommandList>
                              <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                              <CommandGroup>
                                {categoriasFiltradas.map((categoria) => (
                                  <CommandItem
                                    key={categoria.value}
                                    value={categoria.value}
                                    onSelect={() => {
                                      setDadosEdicao(prev => ({ ...prev, categoria: categoria.value, grupo: '' }));
                                      setSearchCategoria('');
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        categoria.value === dadosEdicao.categoria
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {categoria.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
                      {grupos.length === 1 ? (
                        // Quando há apenas um grupo, mostra como campo readonly
                        <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                          {grupos[0].label}
                        </div>
                      ) : (
                        // Quando há múltiplos grupos, mostra como select
                        <Select 
                          value={dadosEdicao.grupo} 
                          onValueChange={(value) => setDadosEdicao(prev => ({ ...prev, grupo: value }))}
                          disabled={!dadosEdicao.categoria || grupos.length === 0}
                        >
                          <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                            <SelectValue placeholder={
                              !dadosEdicao.categoria 
                                ? "Selecione uma categoria primeiro" 
                                : grupos.length === 0 
                                ? "Nenhum grupo disponível" 
                                : "Selecione o grupo"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {grupos.map(grupo => (
                              <SelectItem key={grupo.value} value={grupo.value}>
                                {grupo.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Informações do Caso */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Informações do Caso</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo do Chamado</label>
                      <Select 
                        value={dadosEdicao.tipo_caso || 'none'} 
                        onValueChange={(value) => setDadosEdicao(prev => ({ ...prev, tipo_caso: value === 'none' ? '' : value }))}
                      >
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Selecione o tipo</SelectItem>
                          {tiposChamado.map(tipo => (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Número do Chamado</label>
                      <Input 
                        value={dadosEdicao.nro_caso}
                        onChange={(e) => setDadosEdicao(prev => ({ ...prev, nro_caso: e.target.value }))}
                        className="focus:ring-sonda-blue focus:border-sonda-blue font-mono"
                        placeholder="Número do chamado"
                      />
                    </div>
                  </div>
                </div>

                {/* Feedback do Cliente */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Feedback do Cliente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Resposta <span className="text-black">*</span>
                      </label>
                      <Select 
                        value={dadosEdicao.resposta} 
                        onValueChange={(value) => setDadosEdicao(prev => ({ ...prev, resposta: value }))}
                      >
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder="Selecione a resposta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Muito Satisfeito">Muito Satisfeito</SelectItem>
                          <SelectItem value="Satisfeito">Satisfeito</SelectItem>
                          <SelectItem value="Neutro">Neutro</SelectItem>
                          <SelectItem value="Insatisfeito">Insatisfeito</SelectItem>
                          <SelectItem value="Muito Insatisfeito">Muito Insatisfeito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data da Resposta</label>
                      <Input 
                        type="datetime-local"
                        value={dadosEdicao.data_resposta}
                        onChange={(e) => setDadosEdicao(prev => ({ ...prev, data_resposta: e.target.value }))}
                        className="focus:ring-sonda-blue focus:border-sonda-blue"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comentário da Pesquisa <span className="text-black">*</span>
                    </label>
                    <textarea 
                      value={dadosEdicao.comentario_pesquisa}
                      onChange={(e) => setDadosEdicao(prev => ({ ...prev, comentario_pesquisa: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-md resize-none h-32 text-sm focus:ring-2 focus:ring-sonda-blue focus:border-sonda-blue transition-colors"
                      placeholder="Comentário obrigatório para pesquisas manuais - descreva o contexto ou motivo da pesquisa"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observação Interna</label>
                    <textarea 
                      value={dadosEdicao.observacao}
                      onChange={(e) => setDadosEdicao(prev => ({ ...prev, observacao: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-md resize-none h-24 text-sm focus:ring-2 focus:ring-sonda-blue focus:border-sonda-blue transition-colors"
                      placeholder="Observações internas (não visível para o cliente)"
                    />
                  </div>
                </div>

                {/* Informações do Sistema */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Informações do Sistema</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID da Pesquisa</label>
                      <Input
                        value={pesquisaEditando.id}
                        disabled
                        className="bg-gray-50 text-gray-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
                      <Input
                        value={pesquisaEditando.origem === 'sql_server' ? 'SQL Server' : 'Manual'}
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <Select 
                        value={dadosEdicao.status} 
                        onValueChange={(value) => setDadosEdicao(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="enviado">Enviado</SelectItem>
                          <SelectItem value="respondido">Respondido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data de Criação</label>
                      <Input
                        value={new Date(pesquisaEditando.created_at).toLocaleString('pt-BR')}
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Autor</label>
                      <Input
                        value={pesquisaEditando.autor_nome || ''}
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data de Envio</label>
                      <Input
                        value={pesquisaEditando.data_envio 
                          ? new Date(pesquisaEditando.data_envio).toLocaleString('pt-BR')
                          : ''
                        }
                        disabled
                        className="bg-gray-50 text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter className="mt-6 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setModalEditarAberto(false)}
                disabled={atualizarPesquisaMutation.isPending}
                className="px-6"
              >
                Cancelar
              </Button>
              <Button 
                onClick={salvarEdicao}
                disabled={atualizarPesquisaMutation.isPending}
                className="bg-sonda-blue hover:bg-sonda-dark-blue text-white px-6"
              >
                {atualizarPesquisaMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação de Exclusão */}
        <Dialog open={modalExcluirAberto} onOpenChange={setModalExcluirAberto}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Confirmar Exclusão
              </DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir esta pesquisa de satisfação? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            
            {pesquisaExcluindo && (
              <div className="py-4">
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm font-medium">Pesquisa selecionada:</p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Empresa:</strong> {pesquisaExcluindo.empresa}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Cliente:</strong> {pesquisaExcluindo.cliente}
                  </p>
                  {pesquisaExcluindo.nro_caso && (
                    <p className="text-sm text-gray-600">
                      <strong>Nº do Caso:</strong> {pesquisaExcluindo.nro_caso}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setModalExcluirAberto(false)}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive"
                onClick={confirmarExclusao}
              >
                Excluir Pesquisa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LayoutAdmin>
  );
}

export default VisualizarPesquisas;