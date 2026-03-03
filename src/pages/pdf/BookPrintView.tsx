/**
 * BookPrintView - Página dedicada para impressão/PDF
 * Rota: /pdf/book/:id
 * 
 * Esta página é otimizada para geração de PDF via Puppeteer:
 * - Sem modal overlay
 * - Sem scroll interno
 * - Sem animações
 * - Layout otimizado para A4 landscape
 * - Todas as abas renderizadas em sequência vertical
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useBookData } from '@/hooks/useBooks';
import { useEmpresaProdutos } from '@/hooks/useEmpresaProdutos';

// Importar componentes das abas
import BookCapa from '@/components/admin/books/BookCapa';
import BookVolumetria from '@/components/admin/books/BookVolumetria';
import BookSLA from '@/components/admin/books/BookSLA';
import BookBacklog from '@/components/admin/books/BookBacklog';
import BookConsumo from '@/components/admin/books/BookConsumo';
import BookPesquisa from '@/components/admin/books/BookPesquisa';
import BookOrganograma from '@/components/admin/books/BookOrganograma';

export default function BookPrintView() {
  const { id: rawId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  
  // Remover prefixo "book-" se existir
  const id = rawId?.startsWith('book-') ? rawId.substring(5) : rawId;
  
  // Debug: Log do ID recebido
  useEffect(() => {
    console.log('🔍 BookPrintView - ID recebido:', {
      rawId,
      id,
      removeuPrefixo: rawId !== id
    });
    console.log('🔍 URL completa:', window.location.href);
  }, [rawId, id]);
  
  const { bookData, isLoading, error, refetch } = useBookData(id || null);
  const { data: produtos, isLoading: isLoadingProdutos } = useEmpresaProdutos(bookData?.empresa_id || null);
  const [isReady, setIsReady] = useState(false);

  // CRÍTICO: Limpar cache e forçar refetch ao montar o componente
  useEffect(() => {
    if (id) {
      console.log('🔄 BookPrintView - Limpando cache e recarregando dados para book:', id);
      
      // Limpar cache ESPECÍFICO deste book (não todos os books!)
      queryClient.removeQueries({ queryKey: ['book-data', id] });
      
      // Forçar refetch imediato com staleTime: 0 para garantir dados frescos
      refetch();
    }
  }, [id, queryClient, refetch]);

  // Debug logs
  useEffect(() => {
    console.log('📄 BookPrintView - Estado:', {
      id,
      idLength: id?.length,
      isLoading,
      isLoadingProdutos,
      hasBookData: !!bookData,
      hasProdutos: !!produtos,
      error: error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : null
    });
  }, [id, isLoading, isLoadingProdutos, bookData, produtos, error]);

  useEffect(() => {
    if (!isLoading && !isLoadingProdutos && bookData) {
      console.log('✅ Dados carregados, aguardando fontes...');
      
      // Aguardar carregamento de fontes
      document.fonts.ready.then(() => {
        console.log('✅ Fontes carregadas, aguardando renderização completa...');
        
        // Aguardar renderização completa (aumentado para 8 segundos para organogramas)
        setTimeout(() => {
          setIsReady(true);
          console.log('✅ Página pronta para captura PDF (data-ready=true)');
        }, 8000); // Aumentado de 5s para 8s para dar tempo dos organogramas renderizarem
      });
    }
  }, [isLoading, isLoadingProdutos, bookData]);

  // Loading state
  if (isLoading || isLoadingProdutos) {
    console.log('⏳ Carregando dados...');
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-sonda-blue mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados do book...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    console.error('❌ Erro ao carregar book:', error);
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <p className="text-red-600 mb-2">Erro ao carregar book</p>
          <p className="text-gray-500 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!bookData) {
    console.warn('⚠️ Book não encontrado');
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-gray-500">Book não encontrado (ID: {id})</p>
      </div>
    );
  }

  console.log('📊 Renderizando book:', {
    bookId: id,
    empresa: bookData.empresa_nome,
    mes: bookData.mes,
    ano: bookData.ano,
    produtos: produtos?.length || 0,
    produtosArray: produtos,
    temProdutos: produtos && produtos.length > 0,
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

  return (
    <div id="pdf-ready" data-ready={isReady} className="print-container">
      {/* Indicador de loading invisível para Puppeteer */}
      {!isReady && (
        <div className="hidden" data-loading="true">
          Carregando...
        </div>
      )}

      {/* Capa */}
      <div className="page-section" data-section="capa">
        <BookCapa data={bookData.capa} />
      </div>

      {/* Organogramas (se houver) */}
      {produtos && produtos.length > 0 ? (
        produtos.map((produto) => {
          console.log(`📄 Renderizando organograma para produto: ${produto}`);
          return (
            <div key={`org-${produto}`} className="page-section page-break" data-section={`organograma-${produto}`}>
              <BookOrganograma
                empresaId={bookData.empresa_id}
                produto={produto}
                empresaNome={bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}
              />
            </div>
          );
        })
      ) : (
        <>
          {(() => {
            console.log('⚠️ Nenhum produto encontrado para renderizar organogramas');
            return null;
          })()}
        </>
      )}

      {/* Volumetria */}
      <div className="page-section page-break" data-section="volumetria">
        <BookVolumetria 
          data={bookData.volumetria} 
          empresaNome={bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}
          mes={bookData.mes}
          ano={bookData.ano}
        />
      </div>

      {/* SLA */}
      <div className="page-section page-break" data-section="sla">
        <BookSLA 
          data={bookData.sla}
          empresaNome={bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}
        />
      </div>

      {/* Backlog */}
      <div className="page-section page-break" data-section="backlog">
        <BookBacklog 
          data={bookData.backlog}
          empresaNome={bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}
        />
      </div>

      {/* Consumo */}
      <div className="page-section page-break" data-section="consumo">
        <BookConsumo 
          data={bookData.consumo}
          empresaNome={bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}
          empresaId={bookData.empresa_id}
        />
      </div>

      {/* Pesquisa */}
      <div className="page-section page-break" data-section="pesquisa">
        <BookPesquisa 
          data={bookData.pesquisa}
          empresaNome={bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}
        />
      </div>
    </div>
  );
}
