/**
 * BookViewer - Container principal para visualização de Books
 * Exibe as abas (Capa, Volumetria, SLA, Backlog, Consumo, Pesquisa)
 */

import { useState, useEffect } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useBookData } from '@/hooks/useBooks';
import { useEmpresaProdutos } from '@/hooks/useEmpresaProdutos';
import { useQueryClient } from '@tanstack/react-query';
import type { BookListItem, BookTab } from '@/types/books';
import { BOOK_TABS_LABELS } from '@/types/books';
import { booksPDFServiceV2 } from '@/services/booksPDFServiceV2';
import { booksService } from '@/services/booksService';

// Importar componentes das abas
import BookCapa from './BookCapa';
import BookVolumetria from './BookVolumetria';
import BookSLA from './BookSLA';
import BookBacklog from './BookBacklog';
import BookConsumo from './BookConsumo';
import BookPesquisa from './BookPesquisa';
import BookOrganograma from './BookOrganograma';

interface BookViewerProps {
  book: BookListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BookViewer({ book, open, onOpenChange }: BookViewerProps) {
  const [activeTab, setActiveTab] = useState<BookTab>('capa');
  const [isDownloading, setIsDownloading] = useState(false);
  const { bookData, isLoading, refetch } = useBookData(book?.id || null);
  const { data: produtos, isLoading: isLoadingProdutos } = useEmpresaProdutos(book?.empresa_id || null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Limpar cache e recarregar dados quando o modal for aberto
  useEffect(() => {
    if (open && book?.id) {
      console.log('🔄 BookViewer aberto - Limpando cache e recarregando dados para book:', book.id);
      
      // Limpar cache ESPECÍFICO deste book (não todos os books!)
      queryClient.removeQueries({ queryKey: ['book-data', book.id] });
      
      // Forçar refetch imediato com staleTime: 0 para garantir dados frescos
      refetch();
    }
  }, [open, book?.id, queryClient, refetch]);

  // Log detalhado dos dados quando carregados
  useEffect(() => {
    if (bookData) {
      console.log('📊 BookViewer - Dados carregados:', {
        bookId: book?.id,
        empresa: bookData.empresa_nome,
        mes: bookData.mes,
        ano: bookData.ano,
        // DADOS DETALHADOS PARA DEBUG
        volumetria: {
          abertos_mes: bookData.volumetria.abertos_mes,
          fechados_mes: bookData.volumetria.fechados_mes,
          sla_medio: bookData.volumetria.sla_medio,
          total_backlog: bookData.volumetria.total_backlog
        },
        sla: {
          sla_percentual: bookData.sla.sla_percentual,
          fechados: bookData.sla.fechados,
          incidentes: bookData.sla.incidentes,
          violados: bookData.sla.violados
        },
        backlog: {
          total: bookData.backlog.total,
          incidente: bookData.backlog.incidente,
          solicitacao: bookData.backlog.solicitacao
        }
      });
    }
  }, [bookData, book?.id]);

  const handleDownloadPDF = async () => {
    if (!book) return;

    try {
      setIsDownloading(true);

      // Se já existe PDF gerado, baixar direto
      if (book.pdf_url) {
        window.open(book.pdf_url, '_blank');
        toast({
          title: 'Download iniciado',
          description: 'O PDF está sendo baixado.',
        });
        return;
      }

      // Gerar PDF usando nova rota dedicada (V2)
      toast({
        title: 'Gerando PDF',
        description: 'Aguarde enquanto o PDF é gerado...',
      });

      // Usar novo serviço V2 - muito mais simples!
      const filename = `book_${bookData?.empresa_nome}_${bookData?.mes}_${bookData?.ano}.pdf`;
      await booksPDFServiceV2.baixarPDF(book.id, filename);

      toast({
        title: 'PDF gerado com sucesso',
        description: process.env.NODE_ENV === 'development' 
          ? 'PDF salvo no navegador.'
          : 'O arquivo foi salvo no seu computador.',
      });
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      
      // Mensagem de erro mais útil
      const errorMessage = error instanceof Error ? error.message : 'Não foi possível gerar o PDF. Tente novamente.';
      const isApiError = errorMessage.includes('API de PDF não encontrada') || errorMessage.includes('404');
      
      toast({
        title: 'Erro ao baixar PDF',
        description: isApiError 
          ? '⚠️ API não encontrada. Acesse http://localhost:3000 ou execute: vercel dev'
          : errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-sonda-blue">
              {bookData?.capa.empresa_nome_abreviado || book?.empresa_nome} - {bookData?.capa.periodo}
            </DialogTitle>
            <div className="flex items-center gap-2 mr-5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isDownloading ? 'Gerando...' : 'Baixar PDF'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-sonda-blue" />
          </div>
        ) : bookData ? (
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as BookTab)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="bg-gray-100 p-1 rounded-lg flex-shrink-0 mx-6">
              <TabsTrigger
                value="capa"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                {BOOK_TABS_LABELS.capa}
              </TabsTrigger>
              
              {/* Abas dinâmicas de Organograma por produto - ANTES de Volumetria */}
              {!isLoadingProdutos && produtos && produtos.length > 0 && produtos.map((produto) => {
                // Formatar nome do produto: primeira letra maiúscula, resto minúsculo
                const produtoFormatado = produto.charAt(0).toUpperCase() + produto.slice(1).toLowerCase();
                
                return (
                  <TabsTrigger
                    key={`org-${produto}`}
                    value={`org-${produto}`}
                    className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
                  >
                    Organograma {produtoFormatado}
                  </TabsTrigger>
                );
              })}
              
              <TabsTrigger
                value="volumetria"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                {BOOK_TABS_LABELS.volumetria}
              </TabsTrigger>
              <TabsTrigger
                value="sla"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                {BOOK_TABS_LABELS.sla}
              </TabsTrigger>
              <TabsTrigger
                value="backlog"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                {BOOK_TABS_LABELS.backlog}
              </TabsTrigger>
              <TabsTrigger
                value="consumo"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                {BOOK_TABS_LABELS.consumo}
              </TabsTrigger>
              <TabsTrigger
                value="pesquisa"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                {BOOK_TABS_LABELS.pesquisa}
              </TabsTrigger>
            </TabsList>

            {/* Container com scroll e escala automática para caber na tela */}
            <div className="flex-1 overflow-auto mt-4 bg-gray-100 flex items-start justify-center p-4">
              <div 
                className="bg-white shadow-lg mx-auto"
                style={{
                  width: '2657px',
                  height: '1328px',
                  transform: 'scale(0.52)',
                  transformOrigin: 'center top'
                }}
              >
                <TabsContent value="capa" className="mt-0 h-full">
                  <BookCapa data={bookData.capa} />
                </TabsContent>

                <TabsContent value="volumetria" className="mt-0 h-full">
                  <BookVolumetria 
                    data={bookData.volumetria} 
                    empresaNome={bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}
                    mes={bookData.mes}
                    ano={bookData.ano}
                  />
                </TabsContent>

                <TabsContent value="sla" className="mt-0 h-full">
                  <BookSLA 
                    data={bookData.sla}
                    empresaNome={bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}
                  />
                </TabsContent>

                <TabsContent value="backlog" className="mt-0 h-full">
                  <BookBacklog 
                    data={bookData.backlog}
                    empresaNome={bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}
                  />
                </TabsContent>

                <TabsContent value="consumo" className="mt-0 h-full">
                  <BookConsumo 
                    data={bookData.consumo}
                    empresaNome={bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}
                    empresaId={bookData.empresa_id}
                  />
                </TabsContent>

                <TabsContent value="pesquisa" className="mt-0 h-full">
                  <BookPesquisa 
                    data={bookData.pesquisa}
                    empresaNome={bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}
                  />
                </TabsContent>

                {/* Abas dinâmicas de Organograma - Conteúdo */}
                {!isLoadingProdutos && produtos && produtos.length > 0 && produtos.map((produto) => (
                  <TabsContent key={`org-content-${produto}`} value={`org-${produto}`} className="mt-0 h-full">
                    <BookOrganograma
                      empresaId={bookData.empresa_id}
                      produto={produto}
                      empresaNome={bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}
                    />
                  </TabsContent>
                ))}
              </div>
            </div>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-500">Não foi possível carregar os dados do book</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
