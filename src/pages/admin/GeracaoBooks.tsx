/**
 * Página de Geração de Books
 * Gerencia a geração e envio de relatórios de books para clientes
 */

import { useState } from 'react';
import { 
  FileText, 
  Download, 
  Send, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  Eye,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  X,
  Search
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
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
import { useToast } from '@/hooks/use-toast';
import { useBooks, useBooksSelection, usePeriodoNavigation } from '@/hooks/useBooks';
import { useBooksStats, useSelectionStats } from '@/hooks/useBooksStats';
import { BOOK_STATUS_LABELS, BOOK_STATUS_COLORS, MESES_LABELS } from '@/types/books';
import type { BookListItem } from '@/types/books';
import { BookViewer } from '@/components/admin/books';
import { booksPDFService } from '@/services/booksPDFService';
import { booksService } from '@/services/booksService';

// Fallback para MESES_LABELS caso o import falhe
const MESES_NOMES: Record<number, string> = {
  1: 'Janeiro',
  2: 'Fevereiro',
  3: 'Março',
  4: 'Abril',
  5: 'Maio',
  6: 'Junho',
  7: 'Julho',
  8: 'Agosto',
  9: 'Setembro',
  10: 'Outubro',
  11: 'Novembro',
  12: 'Dezembro'
};

export default function GeracaoBooks() {
  const { toast } = useToast();
  
  // Estados de filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState({
    busca: '',
    status: 'all' as 'all' | 'gerado' | 'pendente' | 'erro',
    periodo: '' // Período no formato MM/YYYY
  });

  // Extrair mês e ano do filtro de período, ou usar período atual
  const getPeriodoAtual = () => {
    if (filtros.periodo) {
      const [mes, ano] = filtros.periodo.split('/');
      return { mes: parseInt(mes), ano: parseInt(ano) };
    }
    // Se não há filtro, usar período atual (mês atual)
    const hoje = new Date();
    return { mes: hoje.getMonth() + 1, ano: hoje.getFullYear() };
  };

  const { mes: mesAtual, ano: anoAtual } = getPeriodoAtual();
  
  // Calcular mês de referência (mês anterior ao período selecionado)
  const mesReferencia = mesAtual === 1 ? 12 : mesAtual - 1;
  const anoReferencia = mesAtual === 1 ? anoAtual - 1 : anoAtual;
  
  const { books, isLoading, gerarBooks, atualizarBooks, isGerando, isAtualizando } = useBooks({
    mes: mesReferencia,
    ano: anoReferencia
  });

  const { stats } = useBooksStats({ mes: mesReferencia, ano: anoReferencia });
  
  const {
    selectedIds,
    selectedEmpresaIds,
    toggleSelection,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    hasSelection,
    count: selectedCount
  } = useBooksSelection(books);

  const { totalHoras, valorTotal } = useSelectionStats(selectedEmpresaIds, mesReferencia, anoReferencia);

  const [showGerarDialog, setShowGerarDialog] = useState(false);
  const [showAtualizarDialog, setShowAtualizarDialog] = useState(false);
  const [bookVisualizando, setBookVisualizando] = useState<BookListItem | null>(null);
  const [downloadingBookId, setDownloadingBookId] = useState<string | null>(null);

  // Funções de navegação de período
  const handleProximoPeriodo = () => {
    const novoMes = mesAtual === 12 ? 1 : mesAtual + 1;
    const novoAno = mesAtual === 12 ? anoAtual + 1 : anoAtual;
    const novoPeriodo = `${String(novoMes).padStart(2, '0')}/${novoAno}`;
    setFiltros({ ...filtros, periodo: novoPeriodo });
  };

  const handlePeriodoAnterior = () => {
    const novoMes = mesAtual === 1 ? 12 : mesAtual - 1;
    const novoAno = mesAtual === 1 ? anoAtual - 1 : anoAtual;
    const novoPeriodo = `${String(novoMes).padStart(2, '0')}/${novoAno}`;
    setFiltros({ ...filtros, periodo: novoPeriodo });
  };

  // Formatar período para exibição
  const mesNome = MESES_NOMES[mesAtual];
  const periodoLabel = `${mesNome} ${anoAtual}`;
  const periodoReferenciaLabel = `${MESES_NOMES[mesReferencia]} ${anoReferencia}`;

  // Função para verificar se há filtros ativos
  const hasActiveFilters = () => {
    return filtros.busca !== '' || filtros.status !== 'all' || filtros.periodo !== '';
  };

  // Função para limpar filtros
  const limparFiltros = () => {
    setFiltros({
      busca: '',
      status: 'all',
      periodo: ''
    });
  };

  // Filtrar books
  const booksFiltrados = books.filter(book => {
    // Filtro de busca
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      if (!book.empresa_nome.toLowerCase().includes(busca)) {
        return false;
      }
    }

    // Filtro de status
    if (filtros.status !== 'all' && book.status !== filtros.status) {
      return false;
    }

    // Filtro de período (MM/YYYY)
    if (filtros.periodo) {
      const [mes, ano] = filtros.periodo.split('/');
      if (book.mes !== parseInt(mes) || book.ano !== parseInt(ano)) {
        return false;
      }
    }

    return true;
  });

  const handleGerarBooks = () => {
    if (!hasSelection) return;
    
    gerarBooks({
      empresa_ids: selectedEmpresaIds,
      mes: mesReferencia,
      ano: anoReferencia,
      gerar_pdf: true
    });
    
    setShowGerarDialog(false);
    clearSelection();
  };

  const handleAtualizarBooks = () => {
    if (!hasSelection) return;
    
    atualizarBooks({
      empresa_ids: selectedEmpresaIds,
      mes: mesReferencia,
      ano: anoReferencia,
      forcar_atualizacao: true,
      gerar_pdf: true
    });
    
    setShowAtualizarDialog(false);
    clearSelection();
  };

  const handleVisualizarBook = (book: BookListItem) => {
    if (book.status === 'gerado') {
      setBookVisualizando(book);
    }
  };

  const handleDownloadPDF = async (book: BookListItem) => {
    if (!book.id) return;

    try {
      setDownloadingBookId(book.id);

      // Se já existe PDF gerado, baixar direto
      if (book.pdf_url) {
        window.open(book.pdf_url, '_blank');
        toast({
          title: 'Download iniciado',
          description: `PDF de ${book.empresa_nome} está sendo baixado.`,
        });
        return;
      }

      // Caso contrário, buscar dados e gerar PDF
      toast({
        title: 'Gerando PDF',
        description: `Aguarde enquanto o PDF de ${book.empresa_nome} é gerado...`,
      });

      const bookData = await booksService.buscarBookPorId(book.id);
      if (!bookData) {
        throw new Error('Dados do book não encontrados');
      }

      await booksPDFService.baixarPDF(bookData, `book_${bookData.empresa_nome}_${bookData.mes}_${bookData.ano}.pdf`);

      toast({
        title: 'PDF baixado com sucesso',
        description: `O arquivo de ${book.empresa_nome} foi salvo no seu computador.`,
      });
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast({
        title: 'Erro ao baixar PDF',
        description: 'Não foi possível gerar o PDF. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setDownloadingBookId(null);
    }
  };

  // Debug: Logar estatísticas recebidas
  console.log('📊 [GeracaoBooks] Stats recebidas:', {
    mesReferencia,
    anoReferencia,
    stats
  });

  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="px-6 py-6 space-y-6">
          {/* Cabeçalho */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Geração de Books
            </h1>
            <p className="text-muted-foreground mt-1">
              Gere e envie relatórios de books para os clientes
            </p>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {/* Card 1: Total de Clientes */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <p className="text-xs font-medium text-gray-500">Total de Clientes</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_empresas || 0}</p>
              </CardContent>
            </Card>

            {/* Card 2: Books Gerados */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <p className="text-xs font-medium text-green-500">Books Gerados</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{stats.books_gerados || 0}</p>
              </CardContent>
            </Card>

            {/* Card 3: Books Pendentes */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <p className="text-xs font-medium text-gray-500">Books Pendentes</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.books_pendentes || 0}</p>
              </CardContent>
            </Card>

            {/* Card 4: Books Atualizados */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="h-4 w-4 text-blue-500" />
                  <p className="text-xs font-medium text-blue-500">Books Atualizados</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">{stats.books_atualizados || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Card de Navegação de Período */}
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePeriodoAnterior}
                  disabled={isLoading || isGerando || isAtualizando}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {periodoLabel}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    (Referência {periodoReferenciaLabel})
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleProximoPeriodo}
                  disabled={isLoading || isGerando || isAtualizando}
                  className="flex items-center gap-2"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card Principal - Listagem de Books */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Books por Empresa
                </CardTitle>

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

                  {hasSelection && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAtualizarDialog(true)}
                        disabled={isGerando || isAtualizando}
                      >
                        {isAtualizando ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Atualizar ({selectedCount})
                      </Button>
                      
                      <Button
                        size="sm"
                        className="bg-sonda-blue hover:bg-sonda-dark-blue"
                        onClick={() => setShowGerarDialog(true)}
                        disabled={isGerando || isAtualizando}
                      >
                        {isGerando ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Gerar Book ({selectedCount})
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Área de filtros expansível */}
              {showFilters && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Campo de busca com ícone */}
                    <div>
                      <div className="text-sm font-medium mb-2">Buscar</div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Buscar por empresa..."
                          value={filtros.busca}
                          onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                          className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                        />
                      </div>
                    </div>

                    {/* Filtro Status */}
                    <div>
                      <div className="text-sm font-medium mb-2">Status</div>
                      <Select 
                        value={filtros.status} 
                        onValueChange={(value: any) => setFiltros({...filtros, status: value})}
                      >
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder="Todos os status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os status</SelectItem>
                          <SelectItem value="gerado">Gerado</SelectItem>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="erro">Erro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro Período (Mês/Ano) */}
                    <div>
                      <div className="text-sm font-medium mb-2">Período</div>
                      <MonthYearPicker
                        value={filtros.periodo}
                        onChange={(value) => setFiltros({...filtros, periodo: value || ''})}
                        placeholder="Todos os períodos"
                        className="focus:ring-sonda-blue focus:border-sonda-blue"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-sonda-blue" />
                </div>
              ) : booksFiltrados.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2 font-medium">
                      Nenhuma empresa encontrada
                    </p>
                    <p className="text-sm text-gray-400">
                      Não há empresas cadastradas para este período
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Checkbox Selecionar Todos */}
                  <div className="flex items-center space-x-2 pb-3 border-b">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleAll}
                      id="select-all"
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Selecionar todos ({booksFiltrados.length})
                    </label>
                  </div>

                  {/* Lista de Empresas - Uma por Linha */}
                  <div className="space-y-3">
                    {booksFiltrados.map((book) => (
                      <div
                        key={book.id}
                        className="flex items-center justify-between gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {/* Checkbox + Nome da Empresa */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Checkbox
                            checked={isSelected(book.id)}
                            onCheckedChange={() => toggleSelection(book.id)}
                            id={`book-${book.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {book.empresa_nome}
                            </div>
                            {book.data_geracao && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                Aguardando geração
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-3">
                          <Badge className={BOOK_STATUS_COLORS[book.status]}>
                            {BOOK_STATUS_LABELS[book.status]}
                          </Badge>

                          {/* Botões de Ação */}
                          <div className="flex gap-1">
                            {book.status === 'gerado' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleVisualizarBook(book)}
                                  title="Visualizar"
                                >
                                  <Eye className="h-4 w-4 text-blue-600" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleDownloadPDF(book)}
                                  disabled={downloadingBookId === book.id}
                                  title="Baixar PDF"
                                >
                                  {downloadingBookId === book.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}
                            {book.status === 'pendente' && (
                              <div className="flex items-center text-xs text-gray-500 px-2">
                                <Clock className="h-3 w-3 mr-1" />
                                Pendente
                              </div>
                            )}
                            {book.status === 'erro' && (
                              <div className="flex items-center text-xs text-red-600 px-2">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Erro
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de Confirmação - Gerar Books */}
      <AlertDialog open={showGerarDialog} onOpenChange={setShowGerarDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-sonda-blue">
              Gerar Books
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              Deseja gerar books para {selectedCount} {selectedCount === 1 ? 'empresa' : 'empresas'} selecionada(s)?
              <br /><br />
              <strong>Período:</strong> {periodoLabel}
              <br />
              <strong>Total de Horas:</strong> {totalHoras}
              <br />
              <strong>Valor Total:</strong> R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
              onClick={handleGerarBooks}
            >
              Confirmar Geração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação - Atualizar Books */}
      <AlertDialog open={showAtualizarDialog} onOpenChange={setShowAtualizarDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-sonda-blue">
              Atualizar Books
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              Deseja atualizar books para {selectedCount} {selectedCount === 1 ? 'empresa' : 'empresas'} selecionada(s)?
              <br /><br />
              <strong className="text-orange-600">Atenção:</strong> Esta ação irá sobrescrever os dados existentes com novos dados do período.
              <br /><br />
              <strong>Período:</strong> {periodoLabel}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleAtualizarBooks}
            >
              Confirmar Atualização
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Visualização do Book */}
      <BookViewer
        book={bookVisualizando}
        open={!!bookVisualizando}
        onOpenChange={(open) => !open && setBookVisualizando(null)}
      />
    </AdminLayout>
  );
}
