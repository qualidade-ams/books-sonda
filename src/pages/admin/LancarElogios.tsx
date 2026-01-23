/**
 * Página para gerenciamento de elogios (pesquisas positivas)
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, ChevronLeft, ChevronRight, Filter, Edit, Trash2, Send, Search, X, Clock, TrendingUp, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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
  DialogTitle
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
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

import LayoutAdmin from '@/components/admin/LayoutAdmin';
import { useCacheManager } from '@/hooks/useCacheManager';
import { useElogios, useEstatisticasElogios, useDeletarElogio } from '@/hooks/useElogios';
import { useCriarElogioComEspecialistas, useAtualizarElogioComEspecialistas } from '@/hooks/useElogiosComEspecialistas';
import type { ElogioCompleto, FiltrosElogio } from '@/types/elogios';
import { ElogioForm } from '@/components/admin/elogios';
import ElogiosExportButtons from '@/components/admin/elogios/ElogiosExportButtons';
import { Plus } from 'lucide-react';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useDeParaCategoria } from '@/hooks/useDeParaCategoria';
import { getBadgeResposta } from '@/utils/badgeUtils';
import { ClienteNomeDisplay } from '@/components/admin/requerimentos/ClienteNomeDisplay';

function LancarElogios() {
  const navigate = useNavigate();
  const { clearFeatureCache } = useCacheManager();
  const { empresas } = useEmpresas();
  const { data: deParaCategorias = [] } = useDeParaCategoria();
  
  // Limpar cache ao entrar na tela
  useEffect(() => {
    clearFeatureCache('pesquisas');
  }, [clearFeatureCache]);

  // Estados de navegação de mês/ano
  const [mesAtual] = useState(new Date().getMonth() + 1);
  const [anoAtual] = useState(new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual);

  const [filtros, setFiltros] = useState<FiltrosElogio>({
    busca: '',
    mes: mesAtual,
    ano: anoAtual,
    status: ['registrado' as const] // Mostrar apenas elogios registrados (não compartilhados)
  });

  const [filtroResposta, setFiltroResposta] = useState<string>('todas');
  const [filtroMesPeriodo, setFiltroMesPeriodo] = useState<number | null>(mesAtual);
  const [filtroAnoPeriodo, setFiltroAnoPeriodo] = useState<number | null>(anoAtual);

  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [elogioVisualizando, setElogioVisualizando] = useState<ElogioCompleto | null>(null);
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [modalConfirmacaoEnvioAberto, setModalConfirmacaoEnvioAberto] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('nao-enviados');

  // Atualizar filtros baseado na aba ativa
  const filtrosComAba = useMemo(() => {
    return {
      ...filtros,
      status: abaAtiva === 'nao-enviados' ? ['registrado' as const] : ['compartilhado' as const]
    };
  }, [filtros, abaAtiva]);

  // Mutations
  const criarElogio = useCriarElogioComEspecialistas();
  const atualizarElogio = useAtualizarElogioComEspecialistas();
  const deletarElogio = useDeletarElogio();

  // Nomes dos meses
  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Navegação de mês
  const navegarMesAnterior = () => {
    if (mesSelecionado === 1) {
      const novoAno = anoSelecionado - 1;
      setMesSelecionado(12);
      setAnoSelecionado(novoAno);
      setFiltros(prev => ({ ...prev, mes: 12, ano: novoAno }));
      // Sincronizar com filtro de período
      setFiltroMesPeriodo(12);
      setFiltroAnoPeriodo(novoAno);
    } else {
      const novoMes = mesSelecionado - 1;
      setMesSelecionado(novoMes);
      setFiltros(prev => ({ ...prev, mes: novoMes }));
      // Sincronizar com filtro de período
      setFiltroMesPeriodo(novoMes);
      setFiltroAnoPeriodo(anoSelecionado);
    }
    setPaginaAtual(1);
  };

  const navegarMesProximo = () => {
    if (mesSelecionado === 12) {
      const novoAno = anoSelecionado + 1;
      setMesSelecionado(1);
      setAnoSelecionado(novoAno);
      setFiltros(prev => ({ ...prev, mes: 1, ano: novoAno }));
      // Sincronizar com filtro de período
      setFiltroMesPeriodo(1);
      setFiltroAnoPeriodo(novoAno);
    } else {
      const novoMes = mesSelecionado + 1;
      setMesSelecionado(novoMes);
      setFiltros(prev => ({ ...prev, mes: novoMes }));
      // Sincronizar com filtro de período
      setFiltroMesPeriodo(novoMes);
      setFiltroAnoPeriodo(anoSelecionado);
    }
    setPaginaAtual(1);
  };

  // Queries
  const { data: elogios = [], isLoading, refetch } = useElogios(filtrosComAba);
  
  // Filtrar elogios com base nos filtros adicionais
  const elogiosFiltrados = useMemo(() => {
    let resultado = [...elogios];
    
    // Filtro de busca
    if (filtros.busca) {
      const buscaLower = filtros.busca.toLowerCase();
      resultado = resultado.filter(elogio => 
        elogio.pesquisa?.empresa?.toLowerCase().includes(buscaLower) ||
        elogio.pesquisa?.cliente?.toLowerCase().includes(buscaLower) ||
        elogio.pesquisa?.prestador?.toLowerCase().includes(buscaLower) ||
        elogio.pesquisa?.nro_caso?.toLowerCase().includes(buscaLower) ||
        elogio.pesquisa?.comentario_pesquisa?.toLowerCase().includes(buscaLower)
      );
    }
    
    // Filtro de resposta
    if (filtroResposta && filtroResposta !== 'todas') {
      resultado = resultado.filter(elogio => 
        elogio.pesquisa?.resposta === filtroResposta
      );
    }
    
    // Filtro de período (data da resposta)
    if (filtroMesPeriodo !== null && filtroAnoPeriodo !== null) {
      resultado = resultado.filter(elogio => {
        if (!elogio.data_resposta) return false;
        
        const dataResposta = new Date(elogio.data_resposta + 'T00:00:00');
        const mesResposta = dataResposta.getMonth() + 1;
        const anoResposta = dataResposta.getFullYear();
        
        return mesResposta === filtroMesPeriodo && anoResposta === filtroAnoPeriodo;
      });
    }
    
    return resultado;
  }, [elogios, filtros.busca, filtroResposta, filtroMesPeriodo, filtroAnoPeriodo]);
  
  // Estatísticas separadas para cada status (para contadores das abas)
  const { data: estatisticasNaoEnviados } = useEstatisticasElogios({
    ...filtros,
    status: ['registrado' as const]
  });
  const { data: estatisticasEnviados } = useEstatisticasElogios({
    ...filtros,
    status: ['compartilhado' as const]
  });
  
  // Estatísticas gerais (para os cards)
  const { data: estatisticas } = useEstatisticasElogios(filtros);

  const handleVisualizar = (elogio: ElogioCompleto) => {
    setElogioVisualizando(elogio);
    setModalVisualizarAberto(true);
  };

  const handleCriarElogio = async (dados: any) => {
    try {
      await criarElogio.mutateAsync(dados);
      setModalCriarAberto(false);
      // Recarregar dados
      await refetch();
    } catch (error) {
      console.error('Erro ao criar elogio:', error);
    }
  };

  const handleAtualizarElogio = async (dados: any) => {
    if (!elogioVisualizando) return;
    try {
      await atualizarElogio.mutateAsync({ id: elogioVisualizando.id, dados });
      setModalVisualizarAberto(false);
      setElogioVisualizando(null);
      // Recarregar dados
      await refetch();
    } catch (error) {
      console.error('Erro ao atualizar elogio:', error);
    }
  };

  const handleDeletarElogio = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este elogio?')) {
      try {
        console.log('🗑️ Iniciando exclusão do elogio:', id);
        
        await deletarElogio.mutateAsync(id);
        
        console.log('✅ Exclusão concluída, limpando cache...');
        clearFeatureCache('pesquisas');
        
        console.log('🔄 Recarregando dados...');
        const resultado = await refetch();
        console.log('📊 Dados recarregados:', resultado.data?.length, 'elogios');
        
        toast.success('Elogio excluído com sucesso!');
      } catch (error: any) {
        console.error('❌ Erro ao deletar elogio:', error);
        
        // Mensagem de erro mais específica
        const mensagemErro = error?.message || 'Erro desconhecido';
        
        if (mensagemErro.includes('Permissão negada')) {
          toast.error('Você não tem permissão para excluir este elogio. Contate o administrador.');
        } else {
          toast.error('Erro ao excluir elogio: ' + mensagemErro);
        }
      }
    }
  };

  // Função para enviar elogio individual para "Enviar Elogios" (atualizar status para compartilhado)
  const handleEnviarElogioIndividual = async (id: string) => {
    try {
      await atualizarElogio.mutateAsync({
        id,
        dados: { status: 'compartilhado' as const }
      });
      
      toast.success('Elogio enviado para "Enviar Elogios" com sucesso!');
      
      // Limpar cache e recarregar dados
      clearFeatureCache('pesquisas');
      await refetch();
      
    } catch (error) {
      console.error('Erro ao enviar elogio:', error);
      toast.error('Erro ao enviar elogio. Tente novamente.');
    }
  };

  // Função para abrir modal de confirmação de envio em lote
  const handleAbrirConfirmacaoEnvio = () => {
    if (selecionados.length === 0) {
      toast.warning('Selecione pelo menos um elogio para enviar');
      return;
    }
    setModalConfirmacaoEnvioAberto(true);
  };

  // Função para enviar elogios em lote
  const handleConfirmarEnvioLote = async () => {
    try {
      // Atualizar status de todos os elogios selecionados para "compartilhado"
      await Promise.all(
        selecionados.map(id =>
          atualizarElogio.mutateAsync({
            id,
            dados: { status: 'compartilhado' as const }
          })
        )
      );
      
      const quantidadeEnviada = selecionados.length;
      
      // Limpar seleção
      setSelecionados([]);
      
      // Fechar modal
      setModalConfirmacaoEnvioAberto(false);
      
      // Limpar cache e recarregar dados
      clearFeatureCache('pesquisas');
      await refetch();
      
      toast.success(`${quantidadeEnviada} elogio(s) enviado(s) com sucesso!`);
    } catch (error) {
      console.error('Erro ao enviar elogios em lote:', error);
      toast.error('Erro ao enviar elogios. Tente novamente.');
    }
  };

  const handleSelecionarTodos = (selecionado: boolean) => {
    if (selecionado) {
      setSelecionados(elogiosFiltrados.map(e => e.id));
    } else {
      setSelecionados([]);
    }
  };

  const handleSelecionarItem = (id: string) => {
    setSelecionados(prev =>
      prev.includes(id)
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  const handleFiltroChange = (campo: keyof FiltrosElogio, valor: any) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
    setPaginaAtual(1);
  };

  // Função para verificar se há filtros ativos
  const hasActiveFilters = () => {
    const hoje = new Date();
    const mesVigente = hoje.getMonth() + 1;
    const anoVigente = hoje.getFullYear();
    
    const periodoAlterado = filtroMesPeriodo !== mesVigente || filtroAnoPeriodo !== anoVigente;
    
    return (filtros.busca && filtros.busca !== '') || 
           (filtroResposta && filtroResposta !== 'todas') ||
           periodoAlterado;
  };

  const limparFiltros = () => {
    const hoje = new Date();
    const mesVigente = hoje.getMonth() + 1;
    const anoVigente = hoje.getFullYear();
    
    setFiltros({
      busca: '',
      mes: mesVigente,
      ano: anoVigente
    });
    setFiltroResposta('todas');
    setFiltroMesPeriodo(mesVigente);
    setFiltroAnoPeriodo(anoVigente);
    
    // Sincronizar navegação de meses
    setMesSelecionado(mesVigente);
    setAnoSelecionado(anoVigente);
  };

  // Paginação
  const totalPaginas = Math.ceil(elogiosFiltrados.length / itensPorPagina);
  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const indiceFinal = indiceInicial + itensPorPagina;
  const elogiosPaginados = elogiosFiltrados.slice(indiceInicial, indiceFinal);

  const handleAlterarItensPorPagina = (valor: string) => {
    const novoValor = valor === 'todos' ? elogiosFiltrados.length : parseInt(valor);
    setItensPorPagina(novoValor);
    setPaginaAtual(1);
  };

  const handlePaginaAnterior = () => {
    setPaginaAtual(prev => Math.max(1, prev - 1));
  };

  const handleProximaPagina = () => {
    setPaginaAtual(prev => Math.min(totalPaginas, prev + 1));
  };

  // Função para obter nome abreviado da empresa e verificar se existe no cadastro
  const obterDadosEmpresa = (nomeCompleto: string | undefined): { nome: string; encontrada: boolean } => {
    if (!nomeCompleto) return { nome: '-', encontrada: false };
    
    // Buscar empresa correspondente pelo nome completo ou abreviado
    const empresaEncontrada = empresas.find(
      e => e.nome_completo === nomeCompleto || e.nome_abreviado === nomeCompleto
    );
    
    // Retornar nome abreviado se encontrado, senão retornar o nome original
    return {
      nome: empresaEncontrada ? empresaEncontrada.nome_abreviado : nomeCompleto,
      encontrada: !!empresaEncontrada
    };
  };

  // Função para obter nomes dos consultores de um elogio
  const obterNomesConsultores = (elogio: ElogioCompleto): string => {
    if (!elogio.especialistas || elogio.especialistas.length === 0) {
      return elogio.pesquisa?.prestador || '-';
    }
    
    const nomes = elogio.especialistas
      .map(esp => esp.especialistas?.nome)
      .filter(Boolean);
    
    if (nomes.length === 0) {
      return elogio.pesquisa?.prestador || '-';
    }
    
    return nomes.join(', ');
  };

  return (
    <LayoutAdmin>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Validar Elogios
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gerenciamento de elogios de clientes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ElogiosExportButtons 
              elogios={elogios}
              periodo={`${nomesMeses[mesSelecionado - 1]} ${anoSelecionado}`}
              deParaCategorias={deParaCategorias}
              disabled={isLoading}
            />
            {/*<Button onClick={() => setModalCriarAberto(true)} className="flex items-center gap-2" size="sm">
              <Plus className="h-4 w-4" />
              Novo Elogio
            </Button> */}
            {/* Botão de envio em lote - aparece quando há seleções e está na aba de não enviados */}
            {selecionados.length > 0 && abaAtiva === 'nao-enviados' && (
              <Button 
                onClick={handleAbrirConfirmacaoEnvio} 
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700" 
                size="sm"
              >
                <Send className="h-4 w-4" />
                Enviar {selecionados.length} Elogio{selecionados.length > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>

        {/* Cards de Estatísticas */}
        {estatisticas && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-green-500" />
                  <p className="text-xs font-medium text-green-500">Total de Elogios</p>
                </div>
                <p className="text-3xl font-bold text-green-600">{estatisticas.total}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <p className="text-xs font-medium text-gray-500">Registrados</p>
                </div>
                <p className="text-3xl font-bold text-gray-600">{estatisticas.registrados}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <p className="text-xs font-medium text-blue-500">Compartilhados</p>
                </div>
                <p className="text-3xl font-bold text-blue-600">{estatisticas.compartilhados}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="h-4 w-4 text-orange-500" />
                  <p className="text-xs font-medium text-orange-500">Arquivados</p>
                </div>
                <p className="text-3xl font-bold text-orange-600">{estatisticas.arquivados}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navegação de Período */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={navegarMesAnterior}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {nomesMeses[mesSelecionado - 1]} {anoSelecionado}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={navegarMesProximo}
                className="flex items-center gap-2"
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sistema de Abas */}
        <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full space-y-4 max-w-full overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <TabsList>
              <TabsTrigger value="nao-enviados">
                Elogios Não Enviados ({estatisticasNaoEnviados?.total || 0})
              </TabsTrigger>
              <TabsTrigger value="historico">
                Histórico de Enviados ({estatisticasEnviados?.total || 0})
              </TabsTrigger>
            </TabsList>

            {/* Informação de selecionados - apenas para aba não enviados */}
            {abaAtiva === 'nao-enviados' && selecionados.length > 0 && (
              <div className="flex flex-wrap gap-4 items-center">
                <Badge variant="outline" className="text-xs sm:text-sm">
                  {selecionados.length} selecionado{selecionados.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            )}
          </div>

          <TabsContent value="nao-enviados" className="space-y-4">
            {/* Tabela para Elogios Não Enviados */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Elogios ({elogiosFiltrados.length})
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Campo de busca com ícone */}
                  <div>
                    <div className="text-sm font-medium mb-2">Buscar</div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar por empresa, cliente..."
                        value={filtros.busca || ''}
                        onChange={(e) => handleFiltroChange('busca', e.target.value)}
                        className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                      />
                    </div>
                  </div>

                  {/* Filtro Resposta */}
                  <div>
                    <div className="text-sm font-medium mb-2">Resposta</div>
                    <Select
                      value={filtroResposta}
                      onValueChange={(value) => setFiltroResposta(value)}
                    >
                      <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                        <SelectValue placeholder="Todas as Respostas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas as Respostas</SelectItem>
                        <SelectItem value="Muito Insatisfeito">Muito Insatisfeito</SelectItem>
                        <SelectItem value="Insatisfeito">Insatisfeito</SelectItem>
                        <SelectItem value="Neutro">Neutro</SelectItem>
                        <SelectItem value="Satisfeito">Satisfeito</SelectItem>
                        <SelectItem value="Muito Satisfeito">Muito Satisfeito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro Período (Data da Resposta) */}
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
                          const novoMes = parseInt(mes);
                          const novoAno = parseInt(ano);
                          
                          setFiltroMesPeriodo(novoMes);
                          setFiltroAnoPeriodo(novoAno);
                          
                          // Sincronizar com navegação de meses
                          setMesSelecionado(novoMes);
                          setAnoSelecionado(novoAno);
                          setFiltros(prev => ({ ...prev, mes: novoMes, ano: novoAno }));
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
            <div className="rounded-md mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selecionados.length === elogiosPaginados.length && elogiosPaginados.length > 0}
                        onCheckedChange={handleSelecionarTodos}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead className="w-[120px] text-center">Chamado</TableHead>
                    <TableHead className="w-[180px] text-center">Empresa</TableHead>
                    <TableHead className="w-[120px] text-center">Data Resposta</TableHead>
                    <TableHead className="w-[150px] text-center">Cliente</TableHead>
                    <TableHead className="w-[150px] text-center">Consultor</TableHead>
                    <TableHead className="w-[200px] text-center">Comentário</TableHead>
                    <TableHead className="w-[140px] text-center">Resposta</TableHead>
                    <TableHead className="text-center w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : elogiosPaginados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        Nenhum elogio encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    elogiosPaginados.map((elogio) => (
                      <TableRow key={elogio.id}>
                        <TableCell>
                          <Checkbox
                            checked={selecionados.includes(elogio.id)}
                            onCheckedChange={() => handleSelecionarItem(elogio.id)}
                            aria-label={`Selecionar ${elogio.pesquisa?.cliente}`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {elogio.pesquisa?.nro_caso ? (
                            <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                              <Database className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              <span className="text-xs text-muted-foreground font-medium">
                                {elogio.pesquisa.tipo_caso && `${elogio.pesquisa.tipo_caso} `}
                                <span className="font-mono text-foreground">{elogio.pesquisa.nro_caso}</span>
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <Database className="h-4 w-4 text-blue-600" />
                              <span>-</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-xs sm:text-sm max-w-[180px] text-center">
                          {(() => {
                            const { nome, encontrada } = obterDadosEmpresa(elogio.pesquisa?.empresa);
                            const isOrigemSqlServer = elogio.pesquisa?.origem === 'sql_server';
                            // Só exibe em vermelho se for do SQL Server E não encontrada
                            const deveExibirVermelho = isOrigemSqlServer && !encontrada;
                            return (
                              <span className={`font-semibold ${deveExibirVermelho ? 'text-red-600' : ''}`}>
                                <ClienteNomeDisplay
                                  nomeEmpresa={elogio.pesquisa?.empresa}
                                  nomeCliente={elogio.pesquisa?.cliente}
                                  className={`inline ${deveExibirVermelho ? 'text-red-600' : ''}`}
                                />
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-center text-xs sm:text-sm text-muted-foreground">
                          {elogio.data_resposta ? new Date(elogio.data_resposta + 'T00:00:00').toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </TableCell>
                        <TableCell className="text-center text-xs sm:text-sm max-w-[150px]">
                          <span className="truncate block">
                            {elogio.pesquisa?.cliente}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-xs sm:text-sm max-w-[150px]">
                          <span className="truncate block" title={obterNomesConsultores(elogio)}>
                            {obterNomesConsultores(elogio)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-xs sm:text-sm max-w-[200px]">
                          <span className="line-clamp-2">{elogio.pesquisa?.comentario_pesquisa || '-'}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {getBadgeResposta(elogio.pesquisa?.resposta) || (
                            <Badge variant="outline" className="text-xs px-2 py-1 whitespace-nowrap">
                              -
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleVisualizar(elogio)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeletarElogio(elogio.id)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {/* Botão de envio individual - apenas na aba de não enviados */}
                            {abaAtiva === 'nao-enviados' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleEnviarElogioIndividual(elogio.id)}
                                title="Enviar para Enviar Elogios"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginação no Rodapé */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
              {/* Select de itens por página */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Mostrar</span>
                <Select
                  value={itensPorPagina >= elogios.length ? 'todos' : itensPorPagina.toString()}
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
                {indiceInicial + 1}-{Math.min(indiceFinal, elogiosFiltrados.length)} de {elogiosFiltrados.length} elogios
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="historico" className="space-y-4">
            {/* Tabela para Histórico de Enviados */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Histórico de Enviados ({elogiosFiltrados.length})
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Campo de busca com ícone */}
                      <div>
                        <div className="text-sm font-medium mb-2">Buscar</div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Buscar por empresa, cliente..."
                            value={filtros.busca || ''}
                            onChange={(e) => handleFiltroChange('busca', e.target.value)}
                            className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                          />
                        </div>
                      </div>

                      {/* Filtro Resposta */}
                      <div>
                        <div className="text-sm font-medium mb-2">Resposta</div>
                        <Select
                          value={filtroResposta}
                          onValueChange={(value) => setFiltroResposta(value)}
                        >
                          <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                            <SelectValue placeholder="Todas as Respostas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todas">Todas as Respostas</SelectItem>
                            <SelectItem value="Muito Insatisfeito">Muito Insatisfeito</SelectItem>
                            <SelectItem value="Insatisfeito">Insatisfeito</SelectItem>
                            <SelectItem value="Neutro">Neutro</SelectItem>
                            <SelectItem value="Satisfeito">Satisfeito</SelectItem>
                            <SelectItem value="Muito Satisfeito">Muito Satisfeito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Filtro Período (Data da Resposta) */}
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
                              const novoMes = parseInt(mes);
                              const novoAno = parseInt(ano);
                              
                              setFiltroMesPeriodo(novoMes);
                              setFiltroAnoPeriodo(novoAno);
                              
                              // Sincronizar com navegação de meses
                              setMesSelecionado(novoMes);
                              setAnoSelecionado(novoAno);
                              setFiltros(prev => ({ ...prev, mes: novoMes, ano: novoAno }));
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
                <div className="rounded-md mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px] text-center">Chamado</TableHead>
                        <TableHead className="w-[180px] text-center">Empresa</TableHead>
                        <TableHead className="w-[120px] text-center">Data Resposta</TableHead>
                        <TableHead className="w-[150px] text-center">Cliente</TableHead>
                        <TableHead className="w-[150px] text-center">Consultor</TableHead>
                        <TableHead className="w-[200px] text-center">Comentário</TableHead>
                        <TableHead className="w-[140px] text-center">Resposta</TableHead>
                        <TableHead className="text-center w-[120px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : elogiosPaginados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                            Nenhum elogio enviado encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        elogiosPaginados.map((elogio) => (
                          <TableRow key={elogio.id}>
                            <TableCell className="text-center">
                              {elogio.pesquisa?.nro_caso ? (
                                <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                                  <Database className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                  <span className="text-xs text-muted-foreground font-medium">
                                    {elogio.pesquisa.tipo_caso && `${elogio.pesquisa.tipo_caso} `}
                                    <span className="font-mono text-foreground">{elogio.pesquisa.nro_caso}</span>
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-2">
                                  <Database className="h-4 w-4 text-blue-600" />
                                  <span>-</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium text-xs sm:text-sm max-w-[180px] text-center">
                              {(() => {
                                const { nome, encontrada } = obterDadosEmpresa(elogio.pesquisa?.empresa);
                                const isOrigemSqlServer = elogio.pesquisa?.origem === 'sql_server';
                                const deveExibirVermelho = isOrigemSqlServer && !encontrada;
                                return (
                                  <span className={`font-semibold ${deveExibirVermelho ? 'text-red-600' : ''}`}>
                                    <ClienteNomeDisplay
                                      nomeEmpresa={elogio.pesquisa?.empresa}
                                      nomeCliente={elogio.pesquisa?.cliente}
                                      className={`inline ${deveExibirVermelho ? 'text-red-600' : ''}`}
                                    />
                                  </span>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-center text-xs sm:text-sm text-muted-foreground">
                              {elogio.data_resposta ? new Date(elogio.data_resposta + 'T00:00:00').toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '-'}
                            </TableCell>
                            <TableCell className="text-center text-xs sm:text-sm max-w-[150px]">
                              <span className="truncate block">
                                {elogio.pesquisa?.cliente}
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-xs sm:text-sm max-w-[150px]">
                              <span className="truncate block" title={obterNomesConsultores(elogio)}>
                                {obterNomesConsultores(elogio)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-xs sm:text-sm max-w-[200px]">
                              <span className="line-clamp-2">{elogio.pesquisa?.comentario_pesquisa || '-'}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              {getBadgeResposta(elogio.pesquisa?.resposta) || (
                                <Badge variant="outline" className="text-xs px-2 py-1 whitespace-nowrap">
                                  -
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleVisualizar(elogio)}
                                  title="Visualizar"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Badge variant="secondary" className="text-xs px-2 py-1">
                                  Enviado
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginação no Rodapé */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                  {/* Select de itens por página */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Mostrar</span>
                    <Select
                      value={itensPorPagina >= elogios.length ? 'todos' : itensPorPagina.toString()}
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
                    {indiceInicial + 1}-{Math.min(indiceFinal, elogiosFiltrados.length)} de {elogiosFiltrados.length} elogios
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Edição */}
        <Dialog open={modalVisualizarAberto} onOpenChange={setModalVisualizarAberto}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Elogio</DialogTitle>
            </DialogHeader>
            {elogioVisualizando && (
              <ElogioForm
                elogio={elogioVisualizando}
                onSubmit={handleAtualizarElogio}
                onCancel={() => {
                  setModalVisualizarAberto(false);
                  setElogioVisualizando(null);
                }}
                isLoading={atualizarElogio.isPending}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Criar */}
        <Dialog open={modalCriarAberto} onOpenChange={setModalCriarAberto}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Elogio</DialogTitle>
            </DialogHeader>
            <ElogioForm
              onSubmit={handleCriarElogio}
              onCancel={() => setModalCriarAberto(false)}
              isLoading={criarElogio.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação de Envio em Lote */}
        <AlertDialog open={modalConfirmacaoEnvioAberto} onOpenChange={setModalConfirmacaoEnvioAberto}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Envio de Elogios</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja enviar {selecionados.length} elogio{selecionados.length > 1 ? 's' : ''} para a tela de Enviar Elogios?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmarEnvioLote}
                className="bg-blue-600 hover:bg-blue-700"
              >
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </LayoutAdmin>
  );
}

export default LancarElogios;
