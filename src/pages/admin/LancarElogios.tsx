/**
 * Página para gerenciamento de elogios (pesquisas positivas)
 */

import { useState } from 'react';
import { ThumbsUp, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

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

import LayoutAdmin from '@/components/admin/LayoutAdmin';
import { PesquisasTable, PesquisasExportButtons } from '@/components/admin/pesquisas-satisfacao';
import { 
  usePesquisasSatisfacao,
  useEstatisticasPesquisas
} from '@/hooks/usePesquisasSatisfacao';

import type { Pesquisa, FiltrosPesquisas } from '@/types/pesquisasSatisfacao';
import { ORIGEM_PESQUISA_OPTIONS, RESPOSTA_PESQUISA_OPTIONS } from '@/types/pesquisasSatisfacao';

function LancarElogios() {
  const [filtros, setFiltros] = useState<FiltrosPesquisas>({
    busca: '',
    origem: 'todos',
    resposta: 'todas',
    status: 'enviado_elogios' // Mostrar apenas elogios enviados
  });
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [pesquisaVisualizando, setPesquisaVisualizando] = useState<Pesquisa | null>(null);
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Queries
  const { data: pesquisas = [], isLoading } = usePesquisasSatisfacao(filtros);
  const { data: estatisticas } = useEstatisticasPesquisas(filtros);

  const handleVisualizar = (pesquisa: Pesquisa) => {
    setPesquisaVisualizando(pesquisa);
    setModalVisualizarAberto(true);
  };

  const handleSelecionarTodos = (selecionado: boolean) => {
    if (selecionado) {
      setSelecionados(pesquisas.map(p => p.id));
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

  const handleFiltroChange = (campo: keyof FiltrosPesquisas, valor: any) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
    setPaginaAtual(1);
  };

  const limparFiltros = () => {
    setFiltros({
      busca: '',
      origem: 'todos',
      resposta: 'todas',
      status: 'enviado_elogios'
    });
  };

  // Paginação
  const totalPaginas = Math.ceil(pesquisas.length / itensPorPagina);
  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const indiceFinal = indiceInicial + itensPorPagina;
  const pesquisasPaginadas = pesquisas.slice(indiceInicial, indiceFinal);

  const handleAlterarItensPorPagina = (valor: string) => {
    const novoValor = valor === 'todos' ? pesquisas.length : parseInt(valor);
    setItensPorPagina(novoValor);
    setPaginaAtual(1);
  };

  const handlePaginaAnterior = () => {
    setPaginaAtual(prev => Math.max(1, prev - 1));
  };

  const handleProximaPagina = () => {
    setPaginaAtual(prev => Math.min(totalPaginas, prev + 1));
  };

  return (
    <LayoutAdmin>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Lançar Elogios
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gerenciamento de pesquisas positivas
            </p>
          </div>
          <div className="flex gap-3">
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
          </div>
        </div>

        {/* Cards de Estatísticas */}
        {estatisticas && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total de Elogios
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-green-600">{estatisticas.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-green-600">
                  Muito Satisfeito
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-green-600">
                  {pesquisas.filter(p => p.resposta === 'Muito Satisfeito').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-blue-600">
                  Satisfeito
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-blue-600">
                  {pesquisas.filter(p => p.resposta === 'Satisfeito').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-gray-600">
                  Neutro
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-gray-600">
                  {pesquisas.filter(p => p.resposta === 'Neutro').length}
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
                Elogios ({pesquisas.length})
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

            {/* Filtros */}
            {mostrarFiltros && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                <div>
                  <Input
                    placeholder="Buscar por empresa, cliente..."
                    value={filtros.busca || ''}
                    onChange={(e) => handleFiltroChange('busca', e.target.value)}
                  />
                </div>

                <div>
                  <Select
                    value={filtros.origem || 'todos'}
                    onValueChange={(value) => handleFiltroChange('origem', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Origem" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIGEM_PESQUISA_OPTIONS.map(opcao => (
                        <SelectItem key={opcao.value} value={opcao.value}>
                          {opcao.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select
                    value={filtros.resposta || 'todas'}
                    onValueChange={(value) => handleFiltroChange('resposta', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Resposta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as respostas</SelectItem>
                      {RESPOSTA_PESQUISA_OPTIONS
                        .filter(r => ['Muito Satisfeito', 'Satisfeito', 'Neutro'].includes(r.value))
                        .map(opcao => (
                          <SelectItem key={opcao.value} value={opcao.value}>
                            {opcao.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-3 flex justify-end">
                  <Button variant="outline" size="sm" onClick={limparFiltros}>
                    Limpar Filtros
                  </Button>
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
              onEditar={() => {}} // Não permite edição
              onExcluir={() => {}} // Não permite exclusão
              onEnviar={() => {}} // Não permite reenvio
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
                {indiceInicial + 1}-{Math.min(indiceFinal, pesquisas.length)} de {pesquisas.length} elogios
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Visualização */}
        <Dialog open={modalVisualizarAberto} onOpenChange={setModalVisualizarAberto}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ThumbsUp className="h-5 w-5 text-green-600" />
                Detalhes do Elogio
              </DialogTitle>
            </DialogHeader>
            {pesquisaVisualizando && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Empresa</p>
                    <p className="text-base">{pesquisaVisualizando.empresa}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Cliente</p>
                    <p className="text-base">{pesquisaVisualizando.cliente}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Resposta</p>
                    <p className="text-base font-semibold text-green-600">{pesquisaVisualizando.resposta}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Chamado</p>
                    <p className="text-base">{pesquisaVisualizando.nro_caso || '-'}</p>
                  </div>
                </div>
                {pesquisaVisualizando.comentario_pesquisa && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Comentário</p>
                    <p className="text-base whitespace-pre-wrap">{pesquisaVisualizando.comentario_pesquisa}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LayoutAdmin>
  );
}

export default LancarElogios;
