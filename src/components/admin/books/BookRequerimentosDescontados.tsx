/**
 * Card "Requerimentos Descontados" da página de Consumo do book: até 6 requerimentos
 * faturados no mês, com horas ou, em contrato de tickets, a quantidade de tickets.
 */

import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RequerimentoDescontadoData } from '@/types/books';

const MAXIMO_LISTADOS = 6;

interface BookRequerimentosDescontadosProps {
  requerimentos: RequerimentoDescontadoData[];
  emTickets: boolean;
}

export default function BookRequerimentosDescontados({
  requerimentos,
  emTickets,
}: BookRequerimentosDescontadosProps) {
  const { t } = useTranslation();

  const valorDe = (req: RequerimentoDescontadoData) => {
    if (emTickets) return String(req.tickets || 0);
    return req.total_horas && req.total_horas !== '--' ? req.total_horas : null;
  };

  return (
    <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t('books.bookContent.discountedRequirements')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {requerimentos.length > 0 ? (
          <>
            <div className="space-y-2">
              {requerimentos.slice(0, MAXIMO_LISTADOS).map((req) => {
                const valor = valorDe(req);
                return (
                  <div
                    key={req.id}
                    className="p-2 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-1">
                        <FileText className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                        <span className="font-semibold text-xs text-blue-600">
                          {req.numero_chamado}
                        </span>
                        {req.ticket_externo && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-[11px] text-gray-600">{req.ticket_externo}</span>
                          </>
                        )}
                        {req.modulo && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-[11px] text-gray-600 truncate">{req.modulo}</span>
                          </>
                        )}
                      </div>
                      {valor && (
                        <span className="font-semibold text-xs text-blue-600 ml-2 flex-shrink-0">
                          {valor}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {requerimentos.length > MAXIMO_LISTADOS && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-center">
                <p className="text-xs text-blue-700">
                  {t('books.bookContent.additionalRequirements', {
                    count: requerimentos.length - MAXIMO_LISTADOS,
                  })}
                </p>
              </div>
            )}

            <div className="pt-2 border-t mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-600">
                  {t('books.bookContent.totalRequirements')}
                </span>
                <span className="text-lg font-bold text-blue-600">{requerimentos.length}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <FileText className="h-10 w-10 mx-auto mb-2 text-gray-400" />
            <p className="text-xs">{t('books.bookContent.noDiscountedRequirements')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
