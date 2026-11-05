/**
 * Modal "Requerimentos de <mês>" da página de Consumo do book, aberto ao clicar num mês do
 * gráfico. Mostra as horas de cada requerimento ou, em contrato de tickets, a quantidade de tickets.
 */

import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { RequerimentoDescontadoData } from '@/types/books';

interface BookRequerimentosMesModalProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  /** Mês exibido no título */
  mes: string;
  carregando: boolean;
  requerimentos: RequerimentoDescontadoData[];
  emTickets: boolean;
}

const temValor = (valor?: string) => Boolean(valor && valor !== '--');

export default function BookRequerimentosMesModal({
  aberto,
  onOpenChange,
  mes,
  carregando,
  requerimentos,
  emTickets,
}: BookRequerimentosMesModalProps) {
  const { t } = useTranslation();

  const totalTickets = requerimentos.reduce((soma, req) => soma + (req.tickets || 0), 0);
  const totalHoras = requerimentos.reduce((soma, req) => soma + (Number(req.total_horas) || 0), 0);

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-sonda-blue flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('books.bookContent.requirementsOfMonth', { month: mes })}
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">{t('books.bookContent.requirementsDetails')}</p>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {carregando ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sonda-blue mx-auto mb-4"></div>
                <p className="text-gray-500">{t('books.bookContent.loadingRequirements')}</p>
              </div>
            </div>
          ) : requerimentos.length > 0 ? (
            <>
              {requerimentos.map((req) => (
                <div
                  key={req.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-sm text-blue-600">
                        {req.numero_chamado}
                      </span>
                    </div>
                    {req.tipo_cobranca && (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        {req.tipo_cobranca}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-xs text-gray-600">
                    {req.modulo && (
                      <div className="flex justify-between">
                        <span>{t('books.bookContent.moduleLabel')}</span>
                        <span className="font-medium text-gray-900">{req.modulo}</span>
                      </div>
                    )}

                    {emTickets ? (
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="font-semibold">
                          {t('books.bookContent.requirementsTicketsColumn')}
                        </span>
                        <span className="font-semibold text-green-600">{req.tickets || 0}</span>
                      </div>
                    ) : (
                      <>
                        {temValor(req.horas_funcional) && (
                          <div className="flex justify-between">
                            <span>{t('books.bookContent.functionalH')}</span>
                            <span className="font-medium text-gray-900">{req.horas_funcional}</span>
                          </div>
                        )}
                        {temValor(req.horas_tecnica) && (
                          <div className="flex justify-between">
                            <span>{t('books.bookContent.technicalH')}</span>
                            <span className="font-medium text-gray-900">{req.horas_tecnica}</span>
                          </div>
                        )}
                        {temValor(req.total_horas) && (
                          <div className="flex justify-between border-t pt-2 mt-2">
                            <span className="font-semibold">
                              {t('books.bookContent.totalLabel')}
                            </span>
                            <span className="font-semibold text-green-600">{req.total_horas}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-green-600">
                    {t('books.bookContent.totalRequirements')}
                  </span>
                  <span className="text-2xl font-bold text-green-600">{requerimentos.length}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-semibold text-green-600">
                    {t(
                      emTickets
                        ? 'books.bookContent.requirementsTicketsTotal'
                        : 'books.bookContent.totalHours'
                    )}
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    {emTickets ? totalTickets : `${totalHoras.toFixed(2)}h`}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">{t('books.bookContent.noRequirementsMonth')}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
