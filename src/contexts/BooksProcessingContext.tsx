/**
 * BooksProcessingContext
 * 
 * Context global que gerencia o processamento de books em background.
 * Permite que o processamento continue mesmo ao navegar entre páginas.
 * 
 * Funcionalidades:
 * - Processamento assíncrono em background (não depende do componente montado)
 * - Retry com backoff para rate limiting (429)
 * - Verificação de sessão antes de cada operação
 * - Persistência de progresso para retomada em caso de falha
 * - Notificações globais de progresso
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { booksService } from '@/services/booksService';
import { booksPDFServiceV2 } from '@/services/booksPDFServiceV2';
import { emailService, RATE_LIMIT_CONFIG } from '@/services/emailService';
import { booksVersioningService } from '@/services/booksVersioningService';
import { useToast } from '@/hooks/use-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BookProcessingItem {
  empresaId: string;
  empresaNome: string;
  empresaNomeAbreviado: string;
  status: 'pendente' | 'processando' | 'sucesso' | 'erro';
  erro?: string;
}

export interface ProcessingProgress {
  atual: number;
  total: number;
  empresa: string;
  isProcessing: boolean;
  items: BookProcessingItem[];
  enviados: number;
  erros: number;
}

export interface StartProcessingParams {
  empresaIds: string[];
  books: Array<{
    empresa_id: string;
    empresa_nome: string;
    empresa_nome_abreviado?: string;
    status?: string;
    dia_inicio_apuracao?: number;
  }>;
  mesReferencia: number;
  anoReferencia: number;
  forcarAtualizacao?: boolean;
  onComplete?: () => void;
}

interface BooksProcessingContextType {
  progress: ProcessingProgress;
  isProcessing: boolean;
  startProcessing: (params: StartProcessingParams) => void;
  cancelProcessing: () => void;
  resetProgress: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const BooksProcessingContext = createContext<BooksProcessingContextType | undefined>(undefined);

// ─── Constantes ───────────────────────────────────────────────────────────────

const MESES_NOMES: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
};

const MAX_RETRIES_POR_EMPRESA = 3;

function sanitizarNomeArquivo(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-./]/g, '_');
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const BooksProcessingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [progress, setProgress] = useState<ProcessingProgress>({
    atual: 0,
    total: 0,
    empresa: '',
    isProcessing: false,
    items: [],
    enviados: 0,
    erros: 0,
  });

  const cancelledRef = useRef(false);
  const isProcessingRef = useRef(false);

  /**
   * Verifica se a sessão do Supabase está válida antes de cada operação.
   * Tenta refresh automático se expirada.
   */
  const verificarSessao = async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        // Tenta renovar
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          console.error('❌ Sessão expirada e não foi possível renovar');
          return false;
        }
        console.log('🔄 Sessão renovada com sucesso');
      }
      return true;
    } catch (err) {
      console.error('❌ Erro ao verificar sessão:', err);
      return false;
    }
  };

  /**
   * Inicia o processamento de books em background.
   */
  const startProcessing = useCallback((params: StartProcessingParams) => {
    if (isProcessingRef.current) {
      toast({
        title: 'Processamento em andamento',
        description: 'Aguarde o processamento atual terminar antes de iniciar outro.',
        variant: 'destructive',
      });
      return;
    }

    cancelledRef.current = false;
    isProcessingRef.current = true;

    const items: BookProcessingItem[] = params.empresaIds.map(empresaId => {
      const bookInfo = params.books.find(b => b.empresa_id === empresaId);
      return {
        empresaId,
        empresaNome: bookInfo?.empresa_nome || empresaId,
        empresaNomeAbreviado: bookInfo?.empresa_nome_abreviado || bookInfo?.empresa_nome || empresaId,
        status: 'pendente' as const,
      };
    });

    setProgress({
      atual: 0,
      total: items.length,
      empresa: '',
      isProcessing: true,
      items,
      enviados: 0,
      erros: 0,
    });

    // Executa o processamento de forma assíncrona (não bloqueia)
    processarBooks(params, items).finally(() => {
      isProcessingRef.current = false;
    });
  }, []);

  /**
   * Cancela o processamento em andamento.
   */
  const cancelProcessing = useCallback(() => {
    cancelledRef.current = true;
    toast({
      title: 'Cancelando processamento',
      description: 'O processamento será interrompido após o item atual.',
    });
  }, []);

  /**
   * Reseta o progresso (fecha o indicador após conclusão).
   */
  const resetProgress = useCallback(() => {
    if (!isProcessingRef.current) {
      setProgress({
        atual: 0,
        total: 0,
        empresa: '',
        isProcessing: false,
        items: [],
        enviados: 0,
        erros: 0,
      });
    }
  }, []);

  /**
   * Loop principal de processamento.
   */
  const processarBooks = async (params: StartProcessingParams, items: BookProcessingItem[]) => {
    const { empresaIds, books, mesReferencia, anoReferencia, forcarAtualizacao, onComplete } = params;
    
    let delayAtual = RATE_LIMIT_CONFIG.DELAY_ENTRE_ENVIOS_MS;
    let enviados = 0;
    let erros = 0;

    try {
      for (let i = 0; i < empresaIds.length; i++) {
        // Verificar cancelamento
        if (cancelledRef.current) {
          console.log('⛔ Processamento cancelado pelo usuário');
          toast({
            title: 'Processamento cancelado',
            description: `${enviados} enviado(s), ${erros} erro(s), ${empresaIds.length - i} cancelado(s).`,
          });
          break;
        }

        // Verificar sessão a cada 5 items ou no primeiro
        if (i === 0 || i % 5 === 0) {
          const sessaoValida = await verificarSessao();
          if (!sessaoValida) {
            toast({
              title: 'Sessão expirada',
              description: 'Sua sessão expirou. Faça login novamente para continuar.',
              variant: 'destructive',
            });
            break;
          }
        }

        const empresaId = empresaIds[i];
        const bookInfo = books.find(b => b.empresa_id === empresaId);
        const nomeAbreviado = bookInfo?.empresa_nome_abreviado || bookInfo?.empresa_nome || empresaId;

        // Atualizar item para "processando"
        const updatedItems = [...items];
        updatedItems[i] = { ...updatedItems[i], status: 'processando' };
        
        setProgress(prev => ({
          ...prev,
          atual: i + 1,
          empresa: nomeAbreviado,
          items: updatedItems,
        }));

        console.log(`📧 [${i + 1}/${empresaIds.length}] Iniciando: ${nomeAbreviado}`);

        try {
          // 1. Gerar book no banco
          const temDesatualizado = bookInfo?.status === 'desatualizado';

          const result = await booksService.gerarBooksLote({
            empresa_ids: [empresaId],
            mes: mesReferencia,
            ano: anoReferencia,
            gerar_pdf: true,
            forcar_atualizacao: forcarAtualizacao || temDesatualizado ? true : undefined
          });

          const bookGerado = result.resultados.find(r => r.sucesso && r.book_id);
          if (!bookGerado) {
            const erro = result.resultados[0]?.erro || 'Erro desconhecido na geração';
            throw new Error(`Falha ao gerar book: ${erro}`);
          }

          // 2. Gerar PDF
          const nomeFormatado = nomeAbreviado.replace(/\s+/g, '_').toUpperCase();
          const mesFormatado = String(mesReferencia).padStart(2, '0');
          const mesNomeRef = MESES_NOMES[mesReferencia];
          const assunto = `BOOK: ${nomeFormatado}_${anoReferencia}_${mesFormatado}. ${mesNomeRef}`;
          const nomeArquivo = `Book_${nomeFormatado}_${mesNomeRef}_${anoReferencia}.pdf`;
          const nomeArquivoStorage = sanitizarNomeArquivo(nomeArquivo);

          const pdfBlob = await booksPDFServiceV2.gerarPDF(bookGerado.book_id!);

          // 3. Upload no Supabase Storage
          const storagePath = `books-temp/${anoReferencia}/${mesFormatado}/${nomeArquivoStorage}`;
          
          const { error: uploadError } = await supabase.storage
            .from('anexos-temporarios')
            .upload(storagePath, pdfBlob, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (uploadError) {
            throw new Error(`Erro no upload do PDF: ${uploadError.message}`);
          }

          // 4. Gerar URL pública
          const { data: publicUrlData } = supabase.storage
            .from('anexos-temporarios')
            .getPublicUrl(storagePath);

          if (!publicUrlData?.publicUrl) {
            throw new Error('Erro ao gerar URL pública do PDF');
          }

          // 5. Enviar email com retry para rate limiting
          let emailEnviado = false;
          let tentativaLoop = 0;

          while (!emailEnviado && tentativaLoop < MAX_RETRIES_POR_EMPRESA) {
            if (cancelledRef.current) break;

            const emailResult = await emailService.sendEmail({
              to: ['willian.faria@sonda.com'],
              subject: assunto,
              html: `<p>Segue em anexo o Book de <strong>${nomeAbreviado}</strong> referente a <strong>${mesNomeRef}/${anoReferencia}</strong>.</p>`,
              anexos: {
                totalArquivos: 1,
                tamanhoTotal: pdfBlob.size,
                arquivos: [{
                  url: publicUrlData.publicUrl,
                  nome: nomeArquivo,
                  tipo: 'application/pdf',
                  tamanho: pdfBlob.size,
                  token: ''
                }]
              }
            });

            if (emailResult.success) {
              emailEnviado = true;
              enviados++;

              // Reduzir delay se estiver funcionando bem
              if (delayAtual > RATE_LIMIT_CONFIG.DELAY_ENTRE_ENVIOS_MS) {
                delayAtual = Math.max(RATE_LIMIT_CONFIG.DELAY_ENTRE_ENVIOS_MS, delayAtual * 0.7);
              }

              console.log(`✅ [${i + 1}/${empresaIds.length}] Ciclo completo: ${nomeAbreviado}`);

              // 6. Registrar envio no versionamento
              await booksVersioningService.registrarEnvio(
                bookGerado.book_id!,
                ['willian.faria@sonda.com']
              );
            } else if (emailResult.retryAfter) {
              // Rate limit 429
              tentativaLoop++;
              const pausaLonga = RATE_LIMIT_CONFIG.DELAY_APOS_429_MS * tentativaLoop;
              console.warn(
                `⚠️ [${i + 1}/${empresaIds.length}] Rate limit para ${nomeAbreviado}. ` +
                `Tentativa ${tentativaLoop}/${MAX_RETRIES_POR_EMPRESA}. Pausa ${(pausaLonga / 1000).toFixed(0)}s`
              );
              
              setProgress(prev => ({
                ...prev,
                empresa: `${nomeAbreviado} (aguardando fila - ${(pausaLonga / 1000).toFixed(0)}s)`,
              }));
              
              await new Promise(resolve => setTimeout(resolve, pausaLonga));
              delayAtual = Math.min(delayAtual * 1.5, RATE_LIMIT_CONFIG.BACKOFF_MAX_MS);
            } else {
              // Erro não-retentável
              break;
            }
          }

          if (emailEnviado) {
            updatedItems[i] = { ...updatedItems[i], status: 'sucesso' };
          } else {
            erros++;
            updatedItems[i] = { ...updatedItems[i], status: 'erro', erro: 'Falha no envio de email' };
            console.error(`❌ [${i + 1}/${empresaIds.length}] Falha definitiva: ${nomeAbreviado}`);
          }
        } catch (error) {
          erros++;
          const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
          updatedItems[i] = { ...updatedItems[i], status: 'erro', erro: errorMsg };
          console.error(`❌ [${i + 1}/${empresaIds.length}] Erro: ${nomeAbreviado}`, error);
        }

        // Atualizar progresso após cada item
        setProgress(prev => ({
          ...prev,
          items: [...updatedItems],
          enviados,
          erros,
        }));

        // Delay adaptativo entre ciclos
        if (i < empresaIds.length - 1 && !cancelledRef.current) {
          await new Promise(resolve => setTimeout(resolve, delayAtual));
        }
      }
    } finally {
      setProgress(prev => ({
        ...prev,
        isProcessing: false,
        empresa: '',
      }));

      // Toast final
      toast({
        title: 'Processamento concluído',
        description: `${enviados} enviado(s) com sucesso${erros > 0 ? `, ${erros} com erro(s)` : ''} de ${empresaIds.length} total.`,
        variant: erros > 0 ? 'destructive' : 'default',
      });

      // Callback de conclusão (para refetch, clear selection, etc.)
      if (onComplete) {
        onComplete();
      }
    }
  };

  return (
    <BooksProcessingContext.Provider value={{
      progress,
      isProcessing: progress.isProcessing,
      startProcessing,
      cancelProcessing,
      resetProgress,
    }}>
      {children}
    </BooksProcessingContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBooksProcessing() {
  const context = useContext(BooksProcessingContext);
  if (!context) {
    throw new Error('useBooksProcessing deve ser usado dentro de BooksProcessingProvider');
  }
  return context;
}
