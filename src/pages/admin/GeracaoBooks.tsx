/**
 * Página de Geração de Books
 * Gerencia a geração e envio de relatórios de books para clientes
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Search,
  Users,
  Lock,
  History,
  ShieldCheck
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { useBooksStats } from '@/hooks/useBooksStats';
import { BOOK_STATUS_LABELS, BOOK_STATUS_COLORS, MESES_LABELS } from '@/types/books';
import type { BookListItem, BooksGeracaoLoteResult, BookData } from '@/types/books';
import { BookViewer, BookVersoesHistorico } from '@/components/admin/books';
import { booksPDFServiceV2 } from '@/services/booksPDFServiceV2';
import { booksService } from '@/services/booksService';
import { emailService, RATE_LIMIT_CONFIG } from '@/services/emailService';
import { booksVersioningService } from '@/services/booksVersioningService';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

/**
 * Remove acentos e caracteres especiais de uma string para uso em nomes de arquivo/storage.
 * O Supabase Storage não aceita caracteres fora do ASCII básico nas keys.
 */
function sanitizarNomeArquivo(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos (acentos)
    .replace(/[^a-zA-Z0-9_\-./]/g, '_'); // Substitui caracteres especiais por underscore
}

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
  const navigate = useNavigate();
  
  // Estados de filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState({
    busca: '',
    status: 'all' as 'all' | 'gerado' | 'pendente' | 'enviado' | 'desatualizado' | 'erro',
    periodo: '' // Período no formato MM/YYYY
  });

  // Período atual (para navegação) - INDEPENDENTE do filtro
  const hoje = new Date();
  const [mesAtual, setMesAtual] = useState(hoje.getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  
  // Calcular mês de referência (mês anterior ao período selecionado)
  const mesReferencia = mesAtual === 1 ? 12 : mesAtual - 1;
  const anoReferencia = mesAtual === 1 ? anoAtual - 1 : anoAtual;
  
  // Hook useBooks sempre busca o período de referência atual (não afetado pelo filtro)
  const { books, isLoading, gerarBooks, atualizarBooks, gerarBooksAsync, atualizarBooksAsync, isGerando, isAtualizando, refetch } = useBooks({
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

  const [showGerarDialog, setShowGerarDialog] = useState(false);
  const [showAtualizarDialog, setShowAtualizarDialog] = useState(false);
  const [bookVisualizando, setBookVisualizando] = useState<BookListItem | null>(null);
  const [downloadingBookId, setDownloadingBookId] = useState<string | null>(null);
  const [isEnviandoEmail, setIsEnviandoEmail] = useState(false);
  const [progressoEnvio, setProgressoEnvio] = useState({ atual: 0, total: 0, empresa: '' });
  
  // Estados para retificação
  const [showRetificacaoDialog, setShowRetificacaoDialog] = useState(false);
  const [bookRetificando, setBookRetificando] = useState<BookListItem | null>(null);
  const [motivoRetificacao, setMotivoRetificacao] = useState('');
  const [isRetificando, setIsRetificando] = useState(false);
  
  // Estados para histórico de versões
  const [showHistoricoDialog, setShowHistoricoDialog] = useState(false);
  const [bookHistorico, setBookHistorico] = useState<BookListItem | null>(null);
  const [bookDataVersao, setBookDataVersao] = useState<any>(null);
  const [showVersaoViewer, setShowVersaoViewer] = useState(false);

  /**
   * Faz upload do PDF no Supabase Storage (temporário), gera signed URL,
   * e envia email via webhook com o anexo no formato que o Power Automate processa.
   * Formato do assunto: BOOK: CLIENTE_ANO_MES. NomeMes
   * 
   * Processa um book por vez com delay entre envios para evitar rate limiting (429).
   */
  const gerarPDFEEnviarEmail = async (resultados: BooksGeracaoLoteResult) => {
    const booksSucesso = resultados.resultados.filter(r => r.sucesso && r.book_id);
    if (booksSucesso.length === 0) return;

    setIsEnviandoEmail(true);
    setProgressoEnvio({ atual: 0, total: booksSucesso.length, empresa: '' });

    const DELAY_ENTRE_ENVIOS_MS = 3000; // 3 segundos entre cada envio
    let enviados = 0;
    let erros = 0;

    for (let i = 0; i < booksSucesso.length; i++) {
      const resultado = booksSucesso[i];
      
      try {
        const nomeEmpresa = resultado.empresa_nome;
        const bookInfo = books.find(b => b.empresa_id === resultado.empresa_id);
        const nomeAbreviado = bookInfo?.empresa_nome_abreviado || nomeEmpresa;
        
        // Atualizar progresso
        setProgressoEnvio({ atual: i + 1, total: booksSucesso.length, empresa: nomeAbreviado });

        const nomeFormatado = nomeAbreviado.replace(/\s+/g, '_').toUpperCase();
        const mesFormatado = String(mesReferencia).padStart(2, '0');
        const mesNomeRef = MESES_NOMES[mesReferencia];
        
        // Assunto: BOOK: CLIENTE_ANO_MES. NomeMes
        const assunto = `BOOK: ${nomeFormatado}_${anoReferencia}_${mesFormatado}. ${mesNomeRef}`;
        const nomeArquivo = `Book_${nomeFormatado}_${mesNomeRef}_${anoReferencia}.pdf`;

        // Nome sanitizado (sem acentos) para o Storage
        const nomeArquivoStorage = sanitizarNomeArquivo(nomeArquivo);

        console.log(`📧 [${i + 1}/${booksSucesso.length}] Processando: ${nomeAbreviado}`);

        // 1. Gerar PDF via Puppeteer
        const pdfBlob = await booksPDFServiceV2.gerarPDF(resultado.book_id!);

        // 2. Upload temporário no Supabase Storage
        const storagePath = `books-temp/${anoReferencia}/${mesFormatado}/${nomeArquivoStorage}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('anexos-temporarios')
          .upload(storagePath, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true // Sobrescrever se já existir
          });

        if (uploadError) {
          throw new Error(`Erro no upload do PDF: ${uploadError.message}`);
        }

        console.log('📤 PDF uploaded to storage:', uploadData.path);

        // 3. Gerar URL pública (bucket é público)
        const { data: publicUrlData } = supabase.storage
          .from('anexos-temporarios')
          .getPublicUrl(storagePath);

        if (!publicUrlData?.publicUrl) {
          throw new Error('Erro ao gerar URL pública do PDF');
        }

        console.log('🔗 URL pública gerada para o PDF:', publicUrlData.publicUrl);

        // 4. Enviar email com anexo via URL (formato que o Power Automate processa)
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
          enviados++;
          console.log(`✅ [${i + 1}/${booksSucesso.length}] Email enviado: ${nomeAbreviado}`);

          // 5. Registrar envio no sistema de versionamento (cria snapshot imutável)
          const registroResult = await booksVersioningService.registrarEnvio(
            resultado.book_id!,
            ['willian.faria@sonda.com']
          );

          if (registroResult.success) {
            console.log('✅ Envio registrado no sistema de versionamento:', registroResult.versaoId);
          } else {
            console.error('❌ Falha ao registrar envio no versionamento:', registroResult.error);
          }
        } else {
          erros++;
          console.error(`❌ [${i + 1}/${booksSucesso.length}] Falha no envio: ${nomeAbreviado}`, emailResult.error);
          toast({
            title: 'Erro ao enviar email',
            description: `Falha ao enviar book de ${nomeAbreviado}: ${emailResult.error}`,
            variant: 'destructive',
          });
        }
      } catch (error) {
        erros++;
        console.error(`❌ [${i + 1}/${booksSucesso.length}] Erro ao gerar PDF/enviar email para ${resultado.empresa_nome}:`, error);
        toast({
          title: 'Erro no envio',
          description: `Não foi possível enviar o book de ${resultado.empresa_nome} por email.`,
          variant: 'destructive',
        });
      }

      // Delay entre envios para evitar rate limiting (429) - não aplica no último
      if (i < booksSucesso.length - 1) {
        console.log(`⏳ Aguardando ${DELAY_ENTRE_ENVIOS_MS / 1000}s antes do próximo envio...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_ENTRE_ENVIOS_MS));
      }
    }

    setIsEnviandoEmail(false);
    setProgressoEnvio({ atual: 0, total: 0, empresa: '' });

    // Toast final com resumo
    toast({
      title: 'Envio em lote concluído',
      description: `${enviados} enviado(s) com sucesso${erros > 0 ? `, ${erros} com erro` : ''}.`,
      variant: erros > 0 ? 'destructive' : 'default',
    });
    
    // Recarregar lista para refletir novos status (enviado)
    await refetch();
  };

  // Funções de navegação de período
  const handleProximoPeriodo = () => {
    const novoMes = mesAtual === 12 ? 1 : mesAtual + 1;
    const novoAno = mesAtual === 12 ? anoAtual + 1 : anoAtual;
    setMesAtual(novoMes);
    setAnoAtual(novoAno);
  };

  const handlePeriodoAnterior = () => {
    const novoMes = mesAtual === 1 ? 12 : mesAtual - 1;
    const novoAno = mesAtual === 1 ? anoAtual - 1 : anoAtual;
    setMesAtual(novoMes);
    setAnoAtual(novoAno);
  };

  // Formatar período para exibição
  const mesNome = MESES_NOMES[mesAtual];
  const periodoLabel = `${mesNome} ${anoAtual}`;
  const periodoReferenciaLabel = `${MESES_NOMES[mesReferencia]} ${anoReferencia}`;

  // Função para verificar se há filtros ativos (exceto período, que é navegação)
  const hasActiveFilters = () => {
    return filtros.busca !== '' || filtros.status !== 'all';
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
      if (!book.empresa_nome.toLowerCase().includes(busca) &&
          !(book.empresa_nome_abreviado && book.empresa_nome_abreviado.toLowerCase().includes(busca))) {
        return false;
      }
    }

    // Filtro de status
    if (filtros.status !== 'all' && book.status !== filtros.status) {
      return false;
    }

    return true;
  });

  const handleGerarBooks = async () => {
    if (!hasSelection) return;
    
    setShowGerarDialog(false);
    setIsEnviandoEmail(true);

    const empresaIds = [...selectedEmpresaIds];
    const total = empresaIds.length;
    let enviados = 0;
    let erros = 0;

    // ✅ Rate limiting adaptativo
    let delayAtual = RATE_LIMIT_CONFIG.DELAY_ENTRE_ENVIOS_MS;
    const MAX_RETRIES_POR_EMPRESA = 3; // Tentativas extras no nível do loop (além do retry interno)

    try {
      for (let i = 0; i < empresaIds.length; i++) {
        const empresaId = empresaIds[i];
        const bookInfo = books.find(b => b.empresa_id === empresaId);
        const nomeAbreviado = bookInfo?.empresa_nome_abreviado || bookInfo?.empresa_nome || empresaId;

        // Atualizar progresso
        setProgressoEnvio({ atual: i + 1, total, empresa: nomeAbreviado });
        console.log(`📧 [${i + 1}/${total}] Iniciando ciclo completo: ${nomeAbreviado}`);

        try {
          // 1. Gerar book no banco (uma empresa por vez)
          const temDesatualizado = bookInfo?.status === 'desatualizado';

          const result = await booksService.gerarBooksLote({
            empresa_ids: [empresaId],
            mes: mesReferencia,
            ano: anoReferencia,
            gerar_pdf: true,
            forcar_atualizacao: temDesatualizado ? true : undefined
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

          // 3. Upload temporário no Supabase Storage
          const storagePath = `books-temp/${anoReferencia}/${mesFormatado}/${nomeArquivoStorage}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('anexos-temporarios')
            .upload(storagePath, pdfBlob, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (uploadError) {
            throw new Error(`Erro no upload do PDF: ${uploadError.message}`);
          }

          console.log('📤 PDF uploaded:', uploadData.path);

          // 4. Gerar URL pública
          const { data: publicUrlData } = supabase.storage
            .from('anexos-temporarios')
            .getPublicUrl(storagePath);

          if (!publicUrlData?.publicUrl) {
            throw new Error('Erro ao gerar URL pública do PDF');
          }

          // 5. Enviar email com retry no nível do loop para 429
          let emailEnviado = false;
          let tentativaLoop = 0;

          while (!emailEnviado && tentativaLoop < MAX_RETRIES_POR_EMPRESA) {
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
              // Reduzir delay gradualmente se estiver funcionando bem
              if (delayAtual > RATE_LIMIT_CONFIG.DELAY_ENTRE_ENVIOS_MS) {
                delayAtual = Math.max(RATE_LIMIT_CONFIG.DELAY_ENTRE_ENVIOS_MS, delayAtual * 0.7);
              }
              console.log(`✅ [${i + 1}/${total}] Ciclo completo OK: ${nomeAbreviado}`);

              // 6. Registrar envio no versionamento
              await booksVersioningService.registrarEnvio(
                bookGerado.book_id!,
                ['willian.faria@sonda.com']
              );
            } else if (emailResult.retryAfter) {
              // ✅ Rate limit: pausa longa para a fila do Power Automate esvaziar
              tentativaLoop++;
              const pausaLonga = RATE_LIMIT_CONFIG.DELAY_APOS_429_MS * tentativaLoop;
              console.warn(
                `⚠️ [${i + 1}/${total}] Rate limit (429) para ${nomeAbreviado}. ` +
                `Tentativa ${tentativaLoop}/${MAX_RETRIES_POR_EMPRESA}. ` +
                `Pausando ${(pausaLonga / 1000).toFixed(0)}s para fila esvaziar...`
              );
              setProgressoEnvio({ atual: i + 1, total, empresa: `${nomeAbreviado} (aguardando fila - ${(pausaLonga / 1000).toFixed(0)}s)` });
              await new Promise(resolve => setTimeout(resolve, pausaLonga));
              // Aumentar delay entre próximos envios
              delayAtual = Math.min(delayAtual * 1.5, RATE_LIMIT_CONFIG.BACKOFF_MAX_MS);
            } else {
              // Erro não-429, não tentar novamente
              break;
            }
          }

          if (!emailEnviado) {
            erros++;
            console.error(`❌ [${i + 1}/${total}] Falha definitiva no envio: ${nomeAbreviado}`);
            toast({
              title: 'Erro ao enviar email',
              description: `Falha ao enviar book de ${nomeAbreviado} após ${tentativaLoop} tentativas.`,
              variant: 'destructive',
            });
          }
        } catch (error) {
          erros++;
          console.error(`❌ [${i + 1}/${total}] Erro no ciclo de ${nomeAbreviado}:`, error);
          toast({
            title: 'Erro no processamento',
            description: `Falha em ${nomeAbreviado}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
            variant: 'destructive',
          });
        }

        // ✅ Delay adaptativo entre ciclos para evitar rate limiting (429)
        if (i < empresaIds.length - 1) {
          console.log(`⏳ Aguardando ${(delayAtual / 1000).toFixed(1)}s antes do próximo...`);
          await new Promise(resolve => setTimeout(resolve, delayAtual));
        }
      }
    } finally {
      setIsEnviandoEmail(false);
      setProgressoEnvio({ atual: 0, total: 0, empresa: '' });
      clearSelection();

      // Toast final com resumo
      toast({
        title: 'Processamento concluído',
        description: `${enviados} enviado(s) com sucesso${erros > 0 ? `, ${erros} com erro` : ''} de ${total} total.`,
        variant: erros > 0 ? 'destructive' : 'default',
      });

      // Recarregar lista
      await refetch();
    }
  };

  const handleAtualizarBooks = async () => {
    if (!hasSelection) return;
    
    // Verificar se algum book selecionado está enviado (imutável)
    const booksEnviados = books.filter(b => 
      selectedIds.includes(b.id) && b.status === 'enviado'
    );
    
    if (booksEnviados.length > 0) {
      toast({
        title: 'Ação bloqueada',
        description: `${booksEnviados.length} book(s) selecionado(s) já foram enviados e estão imutáveis. Use "Retificar" para desbloqueá-los.`,
        variant: 'destructive',
      });
      return;
    }
    
    setShowAtualizarDialog(false);
    
    try {
      const result = await atualizarBooksAsync({
        empresa_ids: selectedEmpresaIds,
        mes: mesReferencia,
        ano: anoReferencia,
        forcar_atualizacao: true,
        gerar_pdf: true
      });
      
      // Gerar PDF e enviar email para cada book atualizado com sucesso
      await gerarPDFEEnviarEmail(result);
    } finally {
      clearSelection();
    }
  };

  const handleVisualizarBook = (book: BookListItem) => {
    if (book.status === 'gerado' || book.status === 'enviado' || book.status === 'desatualizado') {
      setBookVisualizando(book);
    }
  };

  const handleDownloadPDF = async (book: BookListItem) => {
    if (!book.id) return;

    try {
      setDownloadingBookId(book.id);

      // Se já existe PDF gerado, baixar direto
      if (book.pdf_url) {
        const nomeEmpresa = book.empresa_nome_abreviado || book.empresa_nome;
        window.open(book.pdf_url, '_blank');
        toast({
          title: 'Download iniciado',
          description: `PDF de ${nomeEmpresa} está sendo baixado.`,
        });
        return;
      }

      // Caso contrário, buscar dados e gerar PDF com Puppeteer
      // Formatar nome do arquivo: Book NOME_ABREVIADO MesExtenso Ano
      const nomeEmpresa = book.empresa_nome_abreviado || book.empresa_nome;
      const mesNome = MESES_NOMES[book.mes];
      const nomeArquivo = `Book ${nomeEmpresa} ${mesNome} ${book.ano}.pdf`;
      
      toast({
        title: 'Gerando PDF',
        description: `Aguarde enquanto o PDF de ${nomeEmpresa} é gerado...`,
      });

      // Usar novo serviço V2 - muito mais simples!
      await booksPDFServiceV2.baixarPDF(book.id, nomeArquivo);

      toast({
        title: 'PDF baixado com sucesso',
        description: `O arquivo de ${nomeEmpresa} foi salvo no seu computador.`,
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

  // Handler para iniciar retificação
  const handleIniciarRetificacao = (book: BookListItem) => {
    setBookRetificando(book);
    setMotivoRetificacao('');
    setShowRetificacaoDialog(true);
  };

  // Handler para confirmar retificação
  const handleConfirmarRetificacao = async () => {
    if (!bookRetificando) return;

    setIsRetificando(true);
    try {
      const result = await booksVersioningService.iniciarRetificacao(
        bookRetificando.id,
        motivoRetificacao
      );

      if (result.success) {
        toast({
          title: 'Retificação iniciada',
          description: `Book de ${bookRetificando.empresa_nome_abreviado || bookRetificando.empresa_nome} desbloqueado para edição (versão ${result.novaVersao}).`,
        });
        setShowRetificacaoDialog(false);
        // Forçar refresh da lista
        window.location.reload();
      } else {
        toast({
          title: 'Erro ao retificar',
          description: result.error || 'Não foi possível iniciar a retificação.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro inesperado',
        description: 'Ocorreu um erro ao processar a retificação.',
        variant: 'destructive',
      });
    } finally {
      setIsRetificando(false);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="px-6 py-6 space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Geração de Books
              </h1>
              <p className="text-muted-foreground mt-1">
                Gere e envie relatórios de books para os clientes
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-sonda-blue text-sonda-blue hover:bg-sonda-light-blue/10"
              onClick={() => navigate('/admin/organograma')}
            >
              <Users className="h-4 w-4 mr-2" />
              Organograma
            </Button>
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
                  {hasSelection && (
                    <>
                      <Button
                        size="sm"
                        className="bg-sonda-blue hover:bg-sonda-dark-blue"
                        onClick={() => setShowGerarDialog(true)}
                        disabled={isGerando || isAtualizando || isEnviandoEmail}
                      >
                        {isGerando || isEnviandoEmail ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        {isEnviandoEmail ? `Enviando ${progressoEnvio.atual}/${progressoEnvio.total}...` : `Gerar Book (${selectedCount})`}
                      </Button>
                    </>
                  )}

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
                </div>
              </div>

              {/* Área de filtros expansível */}
              {showFilters && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <SelectItem value="enviado">Enviado</SelectItem>
                          <SelectItem value="desatualizado">Aguardando nova geração</SelectItem>
                          <SelectItem value="erro">Erro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent>
              {/* Banner de progresso de envio */}
              {isEnviandoEmail && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-sonda-blue flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-900">
                        Enviando {progressoEnvio.atual} de {progressoEnvio.total} books...
                      </p>
                      <p className="text-xs text-blue-700 truncate">
                        Processando: {progressoEnvio.empresa}
                      </p>
                      <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-sonda-blue h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progressoEnvio.total > 0 ? (progressoEnvio.atual / progressoEnvio.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                              {book.empresa_nome_abreviado || book.empresa_nome}
                            </div>
                            {book.status === 'pendente' && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                Aguardando geração
                              </div>
                            )}
                            {book.status === 'gerado' && book.data_geracao && (
                              <div className="text-xs text-green-600 mt-0.5">
                                Gerado em {new Date(book.data_geracao).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                            {book.status === 'desatualizado' && (
                              <div className="text-xs text-orange-600 mt-0.5 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Retificado (v{book.versao_atual}) — Selecione e clique "Gerar Book" para reenviar
                              </div>
                            )}
                            {book.status === 'enviado' && book.enviado_em && (
                              <div className="text-xs text-purple-600 mt-0.5 flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                Enviado em {new Date(book.enviado_em).toLocaleDateString('pt-BR')} — Imutável
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-3">
                          {/* Badge de versão (se > 1) */}
                          {book.versao_atual && book.versao_atual > 1 && (
                            <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                              v{book.versao_atual}
                            </Badge>
                          )}

                          <Badge className={BOOK_STATUS_COLORS[book.status]}>
                            {book.status === 'enviado' && <Lock className="h-3 w-3 mr-1" />}
                            {BOOK_STATUS_LABELS[book.status]}
                          </Badge>

                          {/* Botões de Ação */}
                          <div className="flex gap-1">
                            {/* Books ENVIADOS: Visualizar, Download, Histórico, Retificar */}
                            {book.status === 'enviado' && (
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-purple-600 hover:text-purple-800"
                                  onClick={() => {
                                    setBookHistorico(book);
                                    setShowHistoricoDialog(true);
                                  }}
                                  title="Ver histórico de versões"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-orange-600 hover:text-orange-800"
                                  onClick={() => handleIniciarRetificacao(book)}
                                  title="Retificar"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {/* Books GERADOS: Visualizar, Download, e Histórico se v2+ */}
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
                                {/* Botão Histórico - aparece se tem versões anteriores */}
                                {book.versao_atual && book.versao_atual > 1 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-purple-600 hover:text-purple-800"
                                    onClick={() => {
                                      setBookHistorico(book);
                                      setShowHistoricoDialog(true);
                                    }}
                                    title="Ver histórico de versões"
                                  >
                                    <History className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                            {/* Books DESATUALIZADOS (retificados): Visualizar, Download, Histórico */}
                            {book.status === 'desatualizado' && (
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-purple-600 hover:text-purple-800"
                                  onClick={() => {
                                    setBookHistorico(book);
                                    setShowHistoricoDialog(true);
                                  }}
                                  title="Ver histórico de versões"
                                >
                                  <History className="h-4 w-4" />
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

      {/* Modal de Retificação */}
      <Dialog open={showRetificacaoDialog} onOpenChange={setShowRetificacaoDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sonda-blue flex items-center gap-2">
              <History className="h-5 w-5" />
              Retificar Book
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {bookRetificando && (
                <>
                  Você está solicitando a retificação do book de{' '}
                  <strong>{bookRetificando.empresa_nome_abreviado || bookRetificando.empresa_nome}</strong>
                  {bookRetificando.versao_atual && (
                    <> (versão atual: {bookRetificando.versao_atual})</>
                  )}.
                  <br /><br />
                  Isso irá desbloquear o book para edição e criar uma nova versão quando for reenviado.
                  A versão anterior permanecerá armazenada como histórico imutável.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="motivo-retificacao" className="text-sm font-medium text-gray-700">
                Motivo da Retificação <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="motivo-retificacao"
                placeholder="Descreva o motivo da retificação (mínimo 10 caracteres)..."
                value={motivoRetificacao}
                onChange={(e) => setMotivoRetificacao(e.target.value)}
                className={`focus:ring-sonda-blue focus:border-sonda-blue ${
                  motivoRetificacao.length > 0 && motivoRetificacao.length < 10
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : ''
                }`}
                rows={4}
              />
              {motivoRetificacao.length > 0 && motivoRetificacao.length < 10 && (
                <p className="text-sm text-red-500">
                  Mínimo de 10 caracteres ({motivoRetificacao.length}/10)
                </p>
              )}
              <p className="text-xs text-gray-500">
                O motivo ficará registrado no histórico de versões para auditoria.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRetificacaoDialog(false)}
              disabled={isRetificando}
            >
              Cancelar
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleConfirmarRetificacao}
              disabled={isRetificando || motivoRetificacao.trim().length < 10}
            >
              {isRetificando ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <History className="h-4 w-4 mr-2" />
              )}
              Confirmar Retificação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Histórico de Versões */}
      <BookVersoesHistorico
        bookId={bookHistorico?.id || null}
        empresaNome={bookHistorico?.empresa_nome_abreviado || bookHistorico?.empresa_nome || ''}
        open={showHistoricoDialog}
        onOpenChange={setShowHistoricoDialog}
        onVisualizarVersao={(bookData) => {
          setBookDataVersao(bookData);
          setShowHistoricoDialog(false);
          setShowVersaoViewer(true);
        }}
      />

      {/* BookViewer para versão antiga */}
      <BookViewer
        book={bookHistorico}
        open={showVersaoViewer}
        onOpenChange={(open) => {
          setShowVersaoViewer(open);
          if (!open) setBookDataVersao(null);
        }}
        bookDataOverride={bookDataVersao}
      />
    </AdminLayout>
  );
}
