/**
 * Página para gerenciamento de elogios (pesquisas positivas)
 */

import { useState, useEffect } from 'react';
import { Database, ChevronLeft, ChevronRight, Filter, Edit, Trash2, Send } from 'lucide-react';

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

import LayoutAdmin from '@/components/admin/LayoutAdmin';
import { useCacheManager } from '@/hooks/useCacheManager';
import { useElogios, useEstatisticasElogios } from '@/hooks/useElogios';
import type { ElogioCompleto, FiltrosElogio } from '@/types/elogios';

function LancarElogios() {
  const { clearFeatureCache } = useCacheManager();
  
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
    ano: anoAtual
  });
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [elogioVisualizando, setElogioVisualizando] = useState<ElogioCompleto | null>(null);
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

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
    } else {
      const novoMes = mesSelecionado - 1;
      setMesSelecionado(novoMes);
      setFiltros(prev => ({ ...prev, mes: novoMes }));
    }
    setPaginaAtual(1);
  };

  const navegarMesProximo = () => {
    if (mesSelecionado === 12) {
      const novoAno = anoSelecionado + 1;
      setMesSelecionado(1);
      setAnoSelecionado(novoAno);
      setFiltros(prev => ({ ...prev, mes: 1, ano: novoAno }));
    } else {
      const novoMes = mesSelecionado + 1;
      setMesSelecionado(novoMes);
      setFiltros(prev => ({ ...prev, mes: novoMes }));
    }
    setPaginaAtual(1);
  };

  // Queries
  const { data: elogios = [], isLoading } = useElogios(filtros);
  const { data: estatisticas } = useEstatisticasElogios(filtros);

  const handleVisualizar = (elogio: ElogioCompleto) => {
    setElogioVisualizando(elogio);
    setModalVisualizarAberto(true);
  };

  const handleSelecionarTodos = (selecionado: boolean) => {
    if (selecionado) {
      setSelecionados(elogios.map(e => e.id));
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

  const limparFiltros = () => {
    setFiltros({
      busca: '',
      mes: mesAtual,
      ano: anoAtual
    });
  };

  // Paginação
  const totalPaginas = Math.ceil(elogios.length / itensPorPagina);
  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const indiceFinal = indiceInicial + itensPorPagina;
  const elogiosPaginados = elogios.slice(indiceInicial, indiceFinal);

  const handleAlterarItensPorPagina = (valor: string) => {
    const novoValor = valor === 'todos' ? elogios.length : parseInt(valor);
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
              Gerenciamento de elogios de clientes
            </p>
          </div>
        </div>

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
                <CardTitle className="text-xs lg:text-sm font-medium text-gray-600">
                  Registrados
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-gray-600">
                  {estatisticas.registrados}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-blue-600">
                  Compartilhados
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-blue-600">
                  {estatisticas.compartilhados}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-orange-600">
                  Arquivados
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-orange-600">
                  {estatisticas.arquivados}
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
                Elogios ({elogios.length})
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                <div>
                  <Input
                    placeholder="Buscar por empresa, cliente..."
                    value={filtros.busca || ''}
                    onChange={(e) => handleFiltroChange('busca', e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={limparFiltros}>
                    Limpar Filtros
                  </Button>
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
                          <span className="text-red-600 font-semibold">{elogio.pesquisa?.empresa}</span>
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
                          <span className="truncate block">{elogio.pesquisa?.cliente}</span>
                        </TableCell>
                        <TableCell className="text-center text-xs sm:text-sm max-w-[200px]">
                          <span className="line-clamp-2">{elogio.pesquisa?.comentario_pesquisa || '-'}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="default"
                            className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 whitespace-nowrap"
                          >
                            {elogio.pesquisa?.resposta || 'Muito Satisfeito'}
                          </Badge>
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
                              onClick={() => {
                                // TODO: Implementar exclusão
                                console.log('Excluir elogio:', elogio.id);
                              }}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                // TODO: Implementar envio (criar tela)
                                console.log('Enviar elogio:', elogio.id);
                              }}
                              title="Enviar"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
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
                {indiceInicial + 1}-{Math.min(indiceFinal, elogios.length)} de {elogios.length} elogios
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Visualização */}
        <Dialog open={modalVisualizarAberto} onOpenChange={setModalVisualizarAberto}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-green-600" />
                Detalhes do Elogio
              </DialogTitle>
            </DialogHeader>
            {elogioVisualizando && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Empresa</p>
                    <p className="text-base">{elogioVisualizando.pesquisa?.empresa}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Cliente</p>
                    <p className="text-base">{elogioVisualizando.pesquisa?.cliente}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Resposta</p>
                    <p className="text-base font-semibold text-green-600">{elogioVisualizando.pesquisa?.resposta}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Chamado</p>
                    <p className="text-base">{elogioVisualizando.pesquisa?.nro_caso || elogioVisualizando.chamado || '-'}</p>
                  </div>
                </div>
                {elogioVisualizando.pesquisa?.comentario_pesquisa && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Comentário</p>
                    <p className="text-base whitespace-pre-wrap">{elogioVisualizando.pesquisa.comentario_pesquisa}</p>
                  </div>
                )}
                {elogioVisualizando.observacao && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Observação</p>
                    <p className="text-base whitespace-pre-wrap">{elogioVisualizando.observacao}</p>
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
