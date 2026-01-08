/**
 * Página para visualização de todas as pesquisas de satisfação
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Eye, X, Filter } from 'lucide-react';

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
import { PesquisasExportButtons } from '@/components/admin/pesquisas-satisfacao';
import { VisualizarPesquisasTable } from '@/components/admin/pesquisas-satisfacao';
import { ClienteNomeDisplay } from '@/components/admin/requerimentos/ClienteNomeDisplay';
import { 
  useTodasPesquisasSatisfacao, 
  useTodasEstatisticasPesquisas
} from '@/hooks/usePesquisasSatisfacao';
import { useCacheManager } from '@/hooks/useCacheManager';

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
    resposta: 'todas',
    ano: 'todos',
    mes: 'todos'
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Filtros aplicados
  const filtros: FiltrosPesquisas = {
    // Incluir busca apenas se não estiver vazia
    ...(filtrosBusca.busca.trim() && { busca: filtrosBusca.busca }),
    // Incluir origem apenas se não for 'todos'
    ...(filtrosBusca.origem !== 'todos' && { origem: filtrosBusca.origem }),
    // Incluir resposta apenas se não for 'todas'
    ...(filtrosBusca.resposta !== 'todas' && { resposta: filtrosBusca.resposta }),
    // Converter ano e mês para números se não for 'todos'
    ...(filtrosBusca.ano !== 'todos' && { ano: parseInt(filtrosBusca.ano) }),
    ...(filtrosBusca.mes !== 'todos' && { mes: parseInt(filtrosBusca.mes) })
  };
  
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);
  const [pesquisaSelecionada, setPesquisaSelecionada] = useState<any>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);

  // Queries - usando hook que traz TODAS as pesquisas sem filtros automáticos
  const { data: pesquisas = [], isLoading } = useTodasPesquisasSatisfacao(filtros);
  const { data: estatisticas } = useTodasEstatisticasPesquisas(filtros);

  // Debug: Log dos filtros aplicados
  useEffect(() => {
    console.log('🔍 Filtros aplicados na página:', filtros);
    console.log('📊 Total de pesquisas encontradas:', pesquisas.length);
    if (pesquisas.length > 0) {
      console.log('📋 Primeiras 3 pesquisas:', pesquisas.slice(0, 3).map(p => ({
        id: p.id,
        empresa: p.empresa,
        resposta: p.resposta,
        origem: p.origem
      })));
    }
  }, [filtros, pesquisas.length]);

  const handleVisualizarDetalhes = (pesquisa: any) => {
    setPesquisaSelecionada(pesquisa);
    setModalDetalhesAberto(true);
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
      resposta: 'todos',
      ano: 'todos',
      mes: 'todos'
    });
    setPaginaAtual(1);
    clearFeatureCache('pesquisas');
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                  {estatisticas.total}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-orange-600">
                  Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-orange-600">
                  {estatisticas.pendentes}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-green-600">
                  Enviados
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-green-600">
                  {estatisticas.enviados}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-blue-600">
                  SQL Server
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-blue-600">
                  {estatisticas.sql_server}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-purple-600">
                  Manuais
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-purple-600">
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
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Todas as Pesquisas ({pesquisas.length})
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4 pt-4 border-t">
              <Input
                placeholder="Buscar por empresa, cliente, prestador..."
                value={filtrosBusca.busca}
                onChange={(e) => handleAtualizarFiltro('busca', e.target.value)}
              />

              <Select
                value={filtrosBusca.origem}
                onValueChange={(value) => handleAtualizarFiltro('origem', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as Origens" />
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
                value={filtrosBusca.resposta}
                onValueChange={(value) => handleAtualizarFiltro('resposta', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as Respostas" />
                </SelectTrigger>
                <SelectContent>
                  {RESPOSTA_PESQUISA_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filtrosBusca.ano}
                onValueChange={(value) => handleAtualizarFiltro('ano', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os Anos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Anos</SelectItem>
                  {Array.from({ length: 10 }, (_, i) => {
                    const ano = new Date().getFullYear() - i;
                    return (
                      <SelectItem key={ano} value={ano.toString()}>
                        {ano}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <Select
                value={filtrosBusca.mes}
                onValueChange={(value) => handleAtualizarFiltro('mes', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os Meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Meses</SelectItem>
                  {MESES_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Botão Limpar Filtros */}
              <Button
                variant="outline"
                onClick={limparFiltros}
                disabled={
                  filtrosBusca.busca === '' && 
                  filtrosBusca.origem === 'todos' && 
                  filtrosBusca.resposta === 'todos' && 
                  filtrosBusca.ano === 'todos' && 
                  filtrosBusca.mes === 'todos'
                }
                className="h-10"
              >
                Limpar Filtros
              </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <VisualizarPesquisasTable
              pesquisas={pesquisasPaginadas}
              isLoading={isLoading}
              onVisualizarDetalhes={handleVisualizarDetalhes}
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
                Detalhes da Pesquisa
              </DialogTitle>
            </DialogHeader>
            
            {pesquisaSelecionada && (
              <div className="space-y-6">
                {/* Informações Básicas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">ID da Pesquisa</label>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded">{pesquisaSelecionada.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Origem</label>
                      <p className="text-sm">{pesquisaSelecionada.origem === 'sql_server' ? 'SQL Server' : 'Manual'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <p className="text-sm">{pesquisaSelecionada.status}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Data de Criação</label>
                      <p className="text-sm">{new Date(pesquisaSelecionada.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Dados do Chamado */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Dados do Chamado</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Número do Caso</label>
                      <p className="text-sm">{pesquisaSelecionada.nro_caso || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Tipo do Caso</label>
                      <p className="text-sm">{pesquisaSelecionada.tipo_caso || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Ano de Abertura</label>
                      <p className="text-sm">{pesquisaSelecionada.ano_abertura || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Mês de Abertura</label>
                      <p className="text-sm">{pesquisaSelecionada.mes_abertura || '-'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Dados da Empresa e Cliente */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Empresa e Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Empresa</label>
                      <p className="text-sm">
                        <ClienteNomeDisplay
                          nomeEmpresa={pesquisaSelecionada.empresa}
                          nomeCliente={pesquisaSelecionada.cliente}
                          className="inline"
                        />
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Cliente</label>
                      <p className="text-sm">
                        {pesquisaSelecionada.cliente}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email do Cliente</label>
                      <p className="text-sm">{pesquisaSelecionada.email_cliente || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Prestador</label>
                      <p className="text-sm">{pesquisaSelecionada.prestador || '-'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Categorização */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Categorização</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Categoria</label>
                      <p className="text-sm">{pesquisaSelecionada.categoria || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Grupo</label>
                      <p className="text-sm">{pesquisaSelecionada.grupo || '-'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Resposta da Pesquisa */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resposta da Pesquisa</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Data da Resposta</label>
                        <p className="text-sm">
                          {pesquisaSelecionada.data_resposta 
                            ? new Date(pesquisaSelecionada.data_resposta).toLocaleString('pt-BR')
                            : '-'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Resposta</label>
                        <p className="text-sm">{pesquisaSelecionada.resposta || '-'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Comentário da Pesquisa</label>
                      <div className="bg-gray-50 p-3 rounded-md min-h-[100px]">
                        <p className="text-sm whitespace-pre-wrap">
                          {pesquisaSelecionada.comentario_pesquisa || 'Nenhum comentário registrado'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Auditoria */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações de Auditoria</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Autor</label>
                      <p className="text-sm">{pesquisaSelecionada.autor_nome || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Data de Envio</label>
                      <p className="text-sm">
                        {pesquisaSelecionada.data_envio 
                          ? new Date(pesquisaSelecionada.data_envio).toLocaleString('pt-BR')
                          : '-'
                        }
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-600">Observação</label>
                      <div className="bg-gray-50 p-3 rounded-md min-h-[60px]">
                        <p className="text-sm whitespace-pre-wrap">
                          {pesquisaSelecionada.observacao || 'Nenhuma observação registrada'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LayoutAdmin>
  );
}

export default VisualizarPesquisas;