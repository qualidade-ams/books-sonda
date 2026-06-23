/**
 * Componente para visualizar o histórico de versões de um Book
 * Mostra todas as versões enviadas com seus snapshots imutáveis
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  History, 
  Eye, 
  Calendar, 
  User, 
  Mail, 
  FileText,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { booksVersioningService, type BookVersao } from '@/services/booksVersioningService';
import type { BookData } from '@/types/books';

interface BookVersoesHistoricoProps {
  bookId: string | null;
  empresaNome: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVisualizarVersao?: (bookData: BookData) => void;
}

export function BookVersoesHistorico({ bookId, empresaNome, open, onOpenChange, onVisualizarVersao }: BookVersoesHistoricoProps) {
  const { t } = useTranslation();
  const [versoes, setVersoes] = useState<BookVersao[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedVersao, setExpandedVersao] = useState<number | null>(null);

  useEffect(() => {
    if (open && bookId) {
      carregarVersoes();
    }
  }, [open, bookId]);

  const carregarVersoes = async () => {
    if (!bookId) return;
    setIsLoading(true);
    try {
      const data = await booksVersioningService.buscarVersoes(bookId);
      setVersoes(data);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (versao: number) => {
    setExpandedVersao(expandedVersao === versao ? null : versao);
  };

  const handleVisualizarVersao = (versao: BookVersao) => {
    if (!onVisualizarVersao) return;
    
    // Montar BookData a partir do snapshot da versão
    const bookData: BookData = {
      id: versao.book_id,
      empresa_id: '',
      empresa_nome: empresaNome,
      mes: versao.dados_capa?.mes || 0,
      ano: versao.dados_capa?.ano || 0,
      status: 'enviado',
      data_geracao: versao.enviado_em,
      pdf_url: versao.pdf_url || undefined,
      capa: versao.dados_capa || {},
      volumetria: versao.dados_volumetria || {},
      sla: versao.dados_sla || {},
      backlog: versao.dados_backlog || {},
      consumo: versao.dados_consumo || {},
      pesquisa: versao.dados_pesquisa || {}
    };
    
    onVisualizarVersao(bookData);
  };

  const formatarData = (data: string | null) => {
    if (!data) return '—';
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-sonda-blue flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('books.booksVersionHistory')}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500" dangerouslySetInnerHTML={{ __html: t('books.booksVersionHistoryDesc', { company: empresaNome }) }} />
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-sonda-blue" />
            </div>
          ) : versoes.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">{t('books.noVersionRegistered')}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {t('books.noVersionRegisteredDesc')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {versoes.map((versao) => (
                <Card key={versao.id} className="border border-gray-200">
                  {/* Header da versão */}
                  <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleExpand(versao.versao)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-purple-100 text-purple-800 font-semibold">
                          v{versao.versao}
                        </Badge>
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                            {t('books.immutableSnapshot')}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {t('books.sentOnDate', { date: formatarData(versao.enviado_em) })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {versao.motivo_retificacao && (
                          <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                            {t('books.rectification')}
                          </Badge>
                        )}
                        {expandedVersao === versao.versao ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {/* Detalhes expandidos */}
                  {expandedVersao === versao.versao && (
                    <CardContent className="pt-0 border-t">
                      <div className="space-y-3 pt-3">
                        {/* Destinatários */}
                        {versao.destinatarios && versao.destinatarios.length > 0 && (
                          <div className="flex items-start gap-2">
                            <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-gray-600">{t('books.recipientsLabel')}</p>
                              <p className="text-xs text-gray-500">
                                {versao.destinatarios.join(', ')}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Motivo da retificação */}
                        {versao.motivo_retificacao && (
                          <div className="flex items-start gap-2">
                            <History className="h-4 w-4 text-orange-400 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-orange-600">{t('books.rectificationReasonLabel')}</p>
                              <p className="text-xs text-gray-600 italic">
                                "{versao.motivo_retificacao}"
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Resumo dos dados do snapshot */}
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium text-gray-600 mb-2">{t('books.snapshotData')}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <SnapshotIndicator 
                              label={t('books.cover')} 
                              hasData={!!versao.dados_capa} 
                            />
                            <SnapshotIndicator 
                              label={t('books.volumetry')} 
                              hasData={!!versao.dados_volumetria} 
                            />
                            <SnapshotIndicator 
                              label="SLA" 
                              hasData={!!versao.dados_sla} 
                            />
                            <SnapshotIndicator 
                              label={t('books.backlog')} 
                              hasData={!!versao.dados_backlog} 
                            />
                            <SnapshotIndicator 
                              label={t('books.consumption')} 
                              hasData={!!versao.dados_consumo} 
                            />
                            <SnapshotIndicator 
                              label={t('books.survey')} 
                              hasData={!!versao.dados_pesquisa} 
                            />
                          </div>
                        </div>

                        {/* PDF */}
                        {versao.pdf_url && (
                          <div className="flex items-center gap-2 pt-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <a 
                              href={versao.pdf_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {t('books.openPDFVersion')}
                            </a>
                          </div>
                        )}

                        {/* Botão Visualizar Dados */}
                        {onVisualizarVersao && (
                          <div className="pt-3 border-t mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-sonda-blue text-sonda-blue hover:bg-sonda-light-blue/10"
                              onClick={() => handleVisualizarVersao(versao)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {t('books.viewVersionData')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Indicador visual de presença de dados no snapshot */
function SnapshotIndicator({ label, hasData }: { label: string; hasData: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
      hasData ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
    }`}>
      <div className={`h-1.5 w-1.5 rounded-full ${hasData ? 'bg-green-500' : 'bg-gray-300'}`} />
      {label}
    </div>
  );
}
