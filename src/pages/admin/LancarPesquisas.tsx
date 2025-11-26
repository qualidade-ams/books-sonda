/**
 * Página para lançamento e gerenciamento de pesquisas
 */

import { useState } from 'react';
import { Plus, Database, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

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
import { PesquisaForm, PesquisasTable } from '@/components/admin/pesquisas-satisfacao';
import { 
  usePesquisasSatisfacao, 
  useCriarPesquisa, 
  useAtualizarPesquisa, 
  useExcluirPesquisa,
  useEstatisticasPesquisas
} from '@/hooks/usePesquisasSatisfacao';
import { useSincronizarSqlServer, useUltimaSincronizacao } from '@/hooks/usePesquisasSqlServer';
import { useApiStatus } from '@/hooks/useApiStatus';

import type { Pesquisa, PesquisaFormData, FiltrosPesquisas } from '@/types/pesquisasSatisfacao';
import { ORIGEM_PESQUISA_OPTIONS, STATUS_PESQUISA_OPTIONS } from '@/types/pesquisasSatisfacao';

function LancarPesquisas() {
  const [filtros, setFiltros] = useState<FiltrosPesquisas>({
    busca: '',
    origem: 'todos',
    status: 'todos'
  });
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [pesquisaEditando, setPesquisaEditando] = useState<Pesquisa | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(100);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Queries
  const { data: pesquisas = [], isLoading, refetch } = usePesquisasSatisfacao(filtros);
  const { data: estatisticas } = useEstatisticasPesquisas(filtros);
  const { data: ultimaSincronizacao } = useUltimaSincronizacao();
  const { data: apiOnline = false } = useApiStatus();

  // Mutations
  const criarPesquisa = useCriarPesquisa();
  const atualizarPesquisa = useAtualizarPesquisa();
  const excluirPesquisa = useExcluirPesquisa();
  const sincronizarSqlServer = useSincronizarSqlServer();

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
    await sincronizarSqlServer.mutateAsync();
    // Limpar cache e atualizar dados após sincronização
    await refetch();
  };

  const handleAtualizarFiltro = (campo: keyof FiltrosPesquisas, valor: any) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
    setPaginaAtual(1); // Resetar para primeira página ao filtrar
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {estatisticas.pendentes}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Enviados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {estatisticas.enviados}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                SQL Server
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {estatisticas.sql_server}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Manuais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {estatisticas.manuais}
              </div>
            </CardContent>
          </Card>
        </div>
      )}



      {/* Tabela */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Pesquisas ({pesquisas.length})
              {selecionados.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {selecionados.length} selecionado(s)
                </span>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>

          {/* Filtros Colapsáveis */}
          {mostrarFiltros && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Input
                placeholder="Buscar por empresa, cliente, prestador..."
                value={filtros.busca}
                onChange={(e) => handleAtualizarFiltro('busca', e.target.value)}
              />

              <Select
                value={filtros.origem}
                onValueChange={(value) => handleAtualizarFiltro('origem', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  {ORIGEM_PESQUISA_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filtros.status}
                onValueChange={(value) => handleAtualizarFiltro('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_PESQUISA_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            isLoading={isLoading}
          />

          {/* Paginação no Rodapé */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mostrar:</span>
              <Select
                value={itensPorPagina >= pesquisas.length ? 'todos' : itensPorPagina.toString()}
                onValueChange={handleAlterarItensPorPagina}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1000</SelectItem>
                  <SelectItem value="todos">
                    Todos ({pesquisas.length})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePaginaAnterior}
                disabled={paginaAtual === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {paginaAtual} de {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleProximaPagina}
                disabled={paginaAtual === totalPaginas}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <span className="text-sm text-muted-foreground">
              {indiceInicial + 1}-{Math.min(indiceFinal, pesquisas.length)} de {pesquisas.length}
            </span>
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

      </div>
    </LayoutAdmin>
  );
}

export default LancarPesquisas;
