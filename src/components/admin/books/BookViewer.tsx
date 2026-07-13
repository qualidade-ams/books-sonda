/**
 * BookViewer - Container principal para visualização de Books
 * Exibe as abas (Capa, Volumetria, SLA, Backlog, Consumo, Pesquisa)
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, Loader2, FileSpreadsheet } from 'lucide-react';
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
import type { BookListItem, BookData } from '@/types/books';
import { booksPDFServiceV2 } from '@/services/booksPDFServiceV2';
import { booksService } from '@/services/booksService';
import { gerarExcelConsumoHoras } from '@/utils/gerarExcelConsumoHoras';
import { supabase } from '@/integrations/supabase/client';

// Importar componentes das abas
import BookCapa from './BookCapa';
import BookVolumetria from './BookVolumetria';
import BookSLA from './BookSLA';
import BookBacklog from './BookBacklog';
import BookConsumo from './BookConsumo';
import BookPesquisa from './BookPesquisa';
import BookOrganograma from './BookOrganograma';
import BookOrganogramaComercialCS from './BookOrganogramaComercialCS';
import BookPortfolio from './BookPortfolio';
import BookContraCapa from './BookContraCapa';
import BookConsumoSegmentado from './BookConsumoSegmentado';
import { useEmpresaSegmentacao } from '@/hooks/useEmpresaSegmentacao';

interface BookViewerProps {
  book: BookListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookDataOverride?: BookData | null;
}

export default function BookViewer({ book, open, onOpenChange, bookDataOverride }: BookViewerProps) {
  const [activeTab, setActiveTab] = useState<string>('capa');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const { bookData: bookDataFetched, isLoading, refetch } = useBookData(book?.id || null);
  const { data: produtos, isLoading: isLoadingProdutos } = useEmpresaProdutos(book?.empresa_id || null);
  const { baselineSegmentado: baselineSegmentadoHook, paginasSegmentos: paginasSegmentosHook, isLoading: isLoadingSegmentacao } = useEmpresaSegmentacao(book?.empresa_id || null);
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Helper to translate periodo string (e.g. "Maio 2026" → "May 2026")
  const translatePeriodo = (periodo: string): string => {
    if (!periodo) return periodo;
    const parts = periodo.split(' ');
    if (parts.length === 2) {
      const key = `books.bookContent.monthsFull.${parts[0]}`;
      const translated = t(key);
      if (translated !== key) {
        return `${translated} ${parts[1]}`;
      }
    }
    return periodo;
  };

  // Usar override se fornecido, senão usar dados buscados
  const bookData = bookDataOverride || bookDataFetched;

  // Consumo Segmentado: priorizar snapshot do bookData, fallback para hook de empresa
  const hasSnapshotSegmentado = !!(bookData?.consumo_segmentado && bookData.consumo_segmentado.length > 0);
  const baselineSegmentado = hasSnapshotSegmentado || baselineSegmentadoHook;
  const paginasSegmentos = hasSnapshotSegmentado
    ? (() => {
        const total = bookData!.consumo_segmentado!.length;
        const pages: number[][] = [];
        for (let i = 0; i < total; i += 2) {
          const p: number[] = [i];
          if (i + 1 < total) p.push(i + 1);
          pages.push(p);
        }
        return pages;
      })()
    : paginasSegmentosHook;

  // Limpar cache e recarregar dados quando o modal for aberto
  useEffect(() => {
    if (open && book?.id) {
      // Sempre abrir na aba Capa
      setActiveTab('capa');
      
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
          title: t('books.downloadStarted'),
          description: t('books.downloadStartedDesc'),
        });
        return;
      }

      // Gerar PDF usando nova rota dedicada (V2)
      const nomeEmpresa = book.empresa_nome_abreviado || book.empresa_nome || 'empresa';
      const mesNome = t(`bankHours.months.${['january','february','march','april','may','june','july','august','september','october','november','december'][book.mes - 1]}`);
      const nomeArquivo = `Book ${nomeEmpresa} ${mesNome} ${book.ano}.pdf`;
      
      toast({
        title: t('books.generatingPDF'),
        description: t('books.generatingPDFDesc', { company: nomeEmpresa }),
      });

      // Usar novo serviço V2 - muito mais simples!
      await booksPDFServiceV2.baixarPDF(book.id, nomeArquivo);

      toast({
        title: t('books.pdfDownloaded'),
        description: t('books.pdfDownloadedDesc', { company: nomeEmpresa }),
      });
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      
      // Mensagem de erro mais útil
      const errorMessage = error instanceof Error ? error.message : t('books.pdfErrorDesc');
      const isApiError = errorMessage.includes('API de PDF não encontrada') || errorMessage.includes('404');
      
      toast({
        title: t('books.pdfError'),
        description: isApiError 
          ? t('books.pdfApiError')
          : errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!book) return;

    try {
      setIsDownloadingExcel(true);

      const empresaNome = book.empresa_nome_abreviado || book.empresa_nome || 'empresa';

      toast({
        title: 'Gerando Excel...',
        description: `Preparando detalhamento de consumo para ${empresaNome}`,
      });

      // Buscar requerimentos do período
      const mesCobranca = `${String(book.mes).padStart(2, '0')}/${book.ano}`;
      const { data: requerimentosData } = await supabase
        .from('requerimentos')
        .select('*')
        .eq('cliente_id', book.empresa_id)
        .eq('mes_cobranca', mesCobranca)
        .in('status', ['enviado_faturamento', 'faturado', 'concluido', 'em_desenvolvimento']);

      // Buscar observações manuais do período
      const { data: observacoesManuais } = await (supabase
        .from('banco_horas_observacoes' as any)
        .select('*')
        .eq('empresa_id', book.empresa_id)
        .eq('mes', book.mes)
        .eq('ano', book.ano)
        .order('created_at', { ascending: false }) as any);

      // Buscar reajustes com observações do período
      const { data: reajustesData } = await (supabase
        .from('banco_horas_reajustes' as any)
        .select('id, mes, ano, observacao, tipo_reajuste, valor_reajuste_horas, valor_reajuste_tickets, created_by, created_at')
        .eq('empresa_id', book.empresa_id)
        .eq('mes', book.mes)
        .eq('ano', book.ano)
        .eq('ativo', true)
        .not('observacao', 'is', null)
        .neq('observacao', '')
        .order('created_at', { ascending: false }) as any);

      // Buscar nomes dos usuários para observações
      const allObs = [...(observacoesManuais || []), ...(reajustesData || [])];
      const userIds = [...new Set(allObs.map((o: any) => o.created_by).filter(Boolean))];
      let profilesMap = new Map<string, any>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      }

      // Unificar observações manuais + reajustes no formato esperado pelo Excel
      const observacoesFormatadas = [
        ...(observacoesManuais || []).map((obs: any) => ({
          tipo: 'manual',
          mes: obs.mes,
          ano: obs.ano,
          texto: obs.observacao || '',
          usuario_nome: profilesMap.get(obs.created_by)?.full_name || '',
          created_at: obs.created_at || '',
          tipo_ajuste: '',
          valor_horas: '',
        })),
        ...(reajustesData || []).map((rea: any) => ({
          tipo: 'ajuste',
          mes: rea.mes,
          ano: rea.ano,
          texto: rea.observacao || '',
          usuario_nome: profilesMap.get(rea.created_by)?.full_name || '',
          created_at: rea.created_at || '',
          tipo_ajuste: rea.tipo_reajuste || '',
          valor_horas: rea.valor_reajuste_horas || '',
        })),
      ];

      // Formatar requerimentos para o formato esperado pelo Excel
      const requerimentosFormatados = (requerimentosData || []).map((req: any) => ({
        chamado: req.chamado || '',
        cliente_nome: empresaNome,
        modulo: req.modulo || '',
        descricao: req.descricao || '',
        horas_funcional: req.horas_funcional || '',
        horas_tecnico: req.horas_tecnico || '',
        horas_total: req.horas_total || '',
        tipo_cobranca: req.tipo_cobranca || '',
        data_envio: req.data_envio_faturamento || '',
        data_aprovacao: req.data_aprovacao || '',
        mes_cobranca: req.mes_cobranca || '',
        valor_total_geral: req.valor_total_geral || '',
        observacao: req.observacao || '',
      }));

      const excelFile = await gerarExcelConsumoHoras(
        book.empresa_id,
        empresaNome,
        book.mes,
        book.ano,
        requerimentosFormatados.length > 0 ? requerimentosFormatados : undefined,
        observacoesFormatadas.length > 0 ? observacoesFormatadas : undefined,
        book.dia_inicio_apuracao ?? 1,
        book.dia_fim_apuracao ?? 0
      );

      if (!excelFile) {
        toast({
          title: 'Nenhum dado encontrado',
          description: 'Não há apontamentos de consumo para gerar o Excel neste período.',
          variant: 'destructive',
        });
        return;
      }

      // Trigger download
      const url = URL.createObjectURL(excelFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = excelFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Excel baixado!',
        description: `Arquivo "${excelFile.name}" gerado com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      toast({
        title: 'Erro ao gerar Excel',
        description: error instanceof Error ? error.message : 'Erro desconhecido ao gerar planilha.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-sonda-blue">
              {bookData?.capa.empresa_nome_abreviado || book?.empresa_nome} - {translatePeriodo(bookData?.capa.periodo || '')}
            </DialogTitle>
            <div className="flex items-center gap-2 mr-5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadExcel}
                disabled={isDownloadingExcel}
              >
                {isDownloadingExcel ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                )}
                {isDownloadingExcel ? 'Gerando...' : 'Baixar Excel'}
              </Button>
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
                {isDownloading ? t('books.generating') : t('books.downloadPDF')}
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
            onValueChange={(value) => setActiveTab(value)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="bg-gray-100 p-1 rounded-lg flex-shrink-0 mx-6">
              <TabsTrigger
                value="capa"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                {t('books.tabs.capa')}
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
                    {t('books.tabs.organograma')} {produtoFormatado}
                  </TabsTrigger>
                );
              })}

              {/* Aba fixa: Organograma Comercial/CS/T&M */}
              <TabsTrigger
                value="org-comercial-cs"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                {t('books.tabs.organogramaComercial')}
              </TabsTrigger>
              
              <TabsTrigger
                value="volumetria"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                {t('books.tabs.volumetria')}
              </TabsTrigger>
              <TabsTrigger
                value="sla"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                {t('books.tabs.sla')}
              </TabsTrigger>
              <TabsTrigger
                value="backlog"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                {t('books.tabs.backlog')}
              </TabsTrigger>
              <TabsTrigger
                value="consumo"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                {t('books.tabs.consumo')}
              </TabsTrigger>
              {/* Abas dinâmicas de Consumo Segmentado */}
              {baselineSegmentado && paginasSegmentos.length > 0 && paginasSegmentos.map((_, pageIdx) => (
                <TabsTrigger
                  key={`consumo-seg-${pageIdx}`}
                  value={`consumo-seg-${pageIdx}`}
                  className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
                >
                  {paginasSegmentos.length === 1
                    ? t('books.tabs.consumoSegmentado', 'Consumo Segmentado')
                    : `${t('books.tabs.consumoSegmentado', 'Consumo Segmentado')} ${pageIdx + 1}`
                  }
                </TabsTrigger>
              ))}
              <TabsTrigger
                value="pesquisa"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                {t('books.tabs.pesquisa')}
              </TabsTrigger>
              <TabsTrigger
                value="portfolio"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                {t('books.tabs.portfolio')}
              </TabsTrigger>
              <TabsTrigger
                value="contra-capa"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                {t('books.tabs.contraCapa', 'Contra Capa')}
              </TabsTrigger>
            </TabsList>

            {/* Container com scroll e escala automática para caber na tela */}
            <div className="flex-1 overflow-auto mt-4 bg-gray-100 flex items-start justify-center p-4">
              <div 
                className="bg-white shadow-lg mx-auto"
                style={{
                  width: '2657px',
                  height: '1328px',
                  transform: 'scale(0.7)',
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
                    mes={bookData.mes}
                    ano={bookData.ano}
                  />
                </TabsContent>

                {/* Abas dinâmicas de Consumo Segmentado - Conteúdo */}
                {baselineSegmentado && paginasSegmentos.length > 0 && paginasSegmentos.map((indices, pageIdx) => (
                  <TabsContent key={`consumo-seg-content-${pageIdx}`} value={`consumo-seg-${pageIdx}`} className="mt-0 h-full">
                    <BookConsumoSegmentado
                      empresaId={bookData.empresa_id}
                      empresaNome={bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}
                      mes={bookData.mes}
                      ano={bookData.ano}
                      segmentosIndices={indices}
                      snapshotData={bookData.consumo_segmentado}
                    />
                  </TabsContent>
                ))}

                <TabsContent value="pesquisa" className="mt-0 h-full">
                  <BookPesquisa 
                    data={bookData.pesquisa}
                    empresaNome={bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}
                  />
                </TabsContent>

                <TabsContent value="portfolio" className="mt-0 h-full">
                  <BookPortfolio 
                    empresaNome={bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}
                  />
                </TabsContent>

                <TabsContent value="contra-capa" className="mt-0 h-full">
                  <BookContraCapa />
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

                {/* Aba fixa: Organograma Comercial/CS */}
                <TabsContent value="org-comercial-cs" className="mt-0 h-full">
                  <BookOrganogramaComercialCS
                    empresaId={bookData.empresa_id}
                    empresaNome={bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}
                  />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-500">{t('books.couldNotLoadBookData')}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
