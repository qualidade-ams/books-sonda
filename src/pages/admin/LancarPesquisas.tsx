/**
 * Página para lançamento e gerenciamento de pesquisas
 */

import { useState, useEffect } from 'react';
import { Plus, Database, ChevronLeft, ChevronRight, Filter, Search, X, FileText, Server, FileEdit } from 'lucide-react';
import { toast } from 'sonner';

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import LayoutAdmin from '@/components/admin/LayoutAdmin';
import { PesquisaForm, PesquisasTable, PesquisasExportButtons, SyncProgressModal } from '@/components/admin/pesquisas-satisfacao';
import { 
  usePesquisasSatisfacao, 
  useExcluirPesquisa,
  useEstatisticasPesquisas,
  useEnviarParaPlanoAcao,
  useEnviarParaElogios
} from '@/hooks/usePesquisasSatisfacao';
import { 
  useCriarPesquisaComEspecialistas, 
  useAtualizarPesquisaComEspecialistas 
} from '@/hooks/usePesquisasComEspecialistas';
import { useSincronizarSqlServer, useUltimaSincronizacao } from '@/hooks/usePesquisasSqlServer';
import { useApiStatus } from '@/hooks/useApiStatus';
import { useCacheManager } from '@/hooks/useCacheManager';

import type { Pesquisa, PesquisaFormData, FiltrosPesquisas } from '@/types/pesquisasSatisfacao';
import { ORIGEM_PESQUISA_OPTIONS, RESPOSTA_PESQUISA_OPTIONS } from '@/types/pesquisasSatisfacao';

function LancarPesquisas() {
  const { clearFeatureCache } = useCacheManager();
  
  // Limpar cache ao entrar na tela
  useEffect(() => {
    clearFeatureCache('pesquisas');
  }, [clearFeatureCache]);
  const [filtros, setFiltros] = useState<FiltrosPesquisas>({
    busca: '',
    origem: 'todos',
    resposta: 'todas',
    status: 'pendente' // Mostrar apenas pesquisas pendentes
  });
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [pesquisaEditando, setPesquisaEditando] = useState<Pesquisa | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [modalSyncAberto, setModalSyncAberto] = useState(false);

  // Queries
  const { data: pesquisas = [], isLoading, refetch } = usePesquisasSatisfacao(filtros);
  const { data: estatisticas } = useEstatisticasPesquisas(filtros);
  const { data: ultimaSincronizacao } = useUltimaSincronizacao();
  const { data: apiOnline = false } = useApiStatus();

  // Mutations
  const criarPesquisa = useCriarPesquisaComEspecialistas();
  const atualizarPesquisa = useAtualizarPesquisaComEspecialistas();
  const excluirPesquisa = useExcluirPesquisa();
  const sincronizarSqlServer = useSincronizarSqlServer();
  const enviarParaPlanoAcao = useEnviarParaPlanoAcao();
  const enviarParaElogios = useEnviarParaElogios();

  const handleNovoPesquisa = () => {
    setPesquisaEditando(null);
    setModalAberto(true);
  };

  const handleEditarPesquisa = (pesquisa: Pesquisa) => {
    setPesquisaEditando(pesquisa);
    setModalAberto(true);
  };

  const handleSubmitForm = async (dados: PesquisaFormData) => {
    if (pesquisaEditando) {
      await atualizarPesquisa.mutateAsync({
        id: pesquisaEditando.id,
        dados
      });
    } else {
      await criarPesquisa.mutateAsync(dados);
    }
    setModalAberto(false);
    setPesquisaEditando(null);
  };

  const handleExcluir = async (id: string) => {
    await excluirPesquisa.mutateAsync(id);
    setSelecionados(prev => prev.filter(s => s !== id));
  };

  const handleEnviar = async (pesquisa: Pesquisa) => {
    // Verificar se tem resposta
    if (!pesquisa.resposta) {
      toast.error('Pesquisa sem resposta não pode ser enviada');
      return;
    }

    try {
      // Determinar destino baseado na resposta
      const respostasNegativas = ['Insatisfeito', 'Muito Insatisfeito'];
      const respostasPositivas = ['Satisfeito', 'Muito Satisfeito'];

      if (respostasNegativas.includes(pesquisa.resposta)) {
        // Enviar para Plano de Ação
        await enviarParaPlanoAcao.mutateAsync(pesquisa.id);
      } else if (respostasPositivas.includes(pesquisa.resposta)) {
        // Enviar para Validar Elogios
        await enviarParaElogios.mutateAsync(pesquisa.id);
      } else if (pesquisa.resposta === 'Neutro') {
        // Para Neutro, não fazer nada aqui - será tratado pelo dropdown
        toast.info('Para pesquisas neutras, escolha o destino no menu dropdown');
      } else {
        toast.error('Resposta inválida para envio');
      }
    } catch (error) {
      console.error('Erro ao enviar pesquisa:', error);
    }
  };

  const handleEnviarParaPlanoAcao = async (pesquisa: Pesquisa) => {
    try {
      await enviarParaPlanoAcao.mutateAsync(pesquisa.id);
    } catch (error) {
      console.error('Erro ao enviar para plano de ação:', error);
    }
  };

  const handleEnviarParaElogios = async (pesquisa: Pesquisa) => {
    try {
      await enviarParaElogios.mutateAsync(pesquisa.id);
    } catch (error) {
      console.error('Erro ao enviar para elogios:', error);
    }
  };

  const handleSelecionarTodos = (selecionado: boolean) => {
    if (selecionado) {
      setSelecionados(pesquisas.map(e => e.id));
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

  const handleSincronizar = async () => {
    setModalSyncAberto(true);
    await sincronizarSqlServer.mutateAsync();
    // Limpar cache e atualizar dados após sincronização
    await refetch();
  };

  const handleAtualizarFiltro = (campo: keyof FiltrosPesquisas, valor: any) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
    setPaginaAtual(1); // Resetar para primeira página ao filtrar
  };

  // Função para limpar todos os filtros
  const limparFiltros = () => {
    setFiltros({
      busca: '',
      origem: 'todos',
      resposta: 'todas',
      status: 'pendente' // Manter o status padrão
    });
    setPaginaAtual(1);
  };

  // Função para verificar se há filtros ativos
  const hasActiveFilters = () => {
    return filtros.busca !== '' || 
           filtros.origem !== 'todos' || 
           (filtros.resposta !== 'todas' && filtros.resposta !== '');
  };

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
              Lançar Pesquisas
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gerencie pesquisas de clientes sincronizados e manuais
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
                por_empresa: {},
                por_categoria: {},
                por_mes: {}
              }}
              disabled={isLoading}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleSincronizar}
                    disabled={sincronizarSqlServer.isPending || !apiOnline}
                    className="relative"
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Database className="h-4 w-4" />
                        <div
                          className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-800 ${
                            apiOnline
                              ? 'bg-blue-600 dark:bg-blue-500'
                              : 'bg-red-600 dark:bg-red-500'
                          }`}
                        />
                      </div>
                      <span>
                        {sincronizarSqlServer.isPending ? 'Sincronizando...' : 'Sincronizar SQL Server'}
                      </span>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {apiOnline
                      ? 'API de sincronização online'
                      : 'API de sincronização offline'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={handleNovoPesquisa}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Pesquisa
            </Button>
          </div>
        </div>

      {/* Cards de Estatísticas */}
      {estatisticas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
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
              Pesquisas ({pesquisas.length})
              {selecionados.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {selecionados.length} selecionado(s)
                </span>
              )}
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
                      value={filtros.busca}
                      onChange={(e) => handleAtualizarFiltro('busca', e.target.value)}
                      className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                    />
                  </div>
                </div>

                {/* Filtro Origem */}
                <div>
                  <div className="text-sm font-medium mb-2">Origem</div>
                  <Select
                    value={filtros.origem}
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
                    value={filtros.resposta || 'todas'}
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
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <PesquisasTable
            pesquisas={pesquisasPaginadas}
            selecionados={selecionados}
            onSelecionarTodos={handleSelecionarTodos}
            onSelecionarItem={handleSelecionarItem}
            onEditar={handleEditarPesquisa}
            onExcluir={handleExcluir}
            onEnviar={handleEnviar}
            onEnviarParaPlanoAcao={handleEnviarParaPlanoAcao}
            onEnviarParaElogios={handleEnviarParaElogios}
            isLoading={isLoading}
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

      {/* Modal de Formulário */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {pesquisaEditando ? 'Editar Pesquisa' : 'Novo Pesquisa'}
            </DialogTitle>
          </DialogHeader>
          <PesquisaForm
            pesquisa={pesquisaEditando}
            onSubmit={handleSubmitForm}
            onCancel={() => {
              setModalAberto(false);
              setPesquisaEditando(null);
            }}
            isLoading={criarPesquisa.isPending || atualizarPesquisa.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Progresso de Sincronização */}
      <SyncProgressModal
        open={modalSyncAberto}
        onOpenChange={setModalSyncAberto}
        isLoading={sincronizarSqlServer.isPending}
        resultado={sincronizarSqlServer.data}
      />

      </div>
    </LayoutAdmin>
  );
}

export default LancarPesquisas;
