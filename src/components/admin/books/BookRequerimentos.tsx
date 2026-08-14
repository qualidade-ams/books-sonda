/**
 * BookRequerimentos - Componente de Requerimentos em Desenvolvimento
 * Exibe requerimentos com status 'lancado' que ainda não foram enviados para faturamento
 */

import { FileText, Clock, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { RequerimentoEmDesenvolvimentoData } from '@/types/books';
import { useTranslation } from 'react-i18next';
import BookFooterBar from './BookFooterBar';

interface BookRequerimentosProps {
  data: RequerimentoEmDesenvolvimentoData[];
  allData?: RequerimentoEmDesenvolvimentoData[];
  empresaNome?: string;
  pageIndex?: number;
  totalPages?: number;
}

export default function BookRequerimentos({ data, allData, empresaNome, pageIndex = 0, totalPages = 1 }: BookRequerimentosProps) {
  const { t } = useTranslation();

  // Usar allData para os totais gerais, data para a tabela da página
  const dadosGerais = allData || data;

  // Verificar se deve exibir coluna Ticket Externo (pelo menos 1 requerimento tem ticket_externo)
  const showTicketExterno = dadosGerais.some(r => r.ticket_externo);

  // Calcular total de horas (de TODOS os requerimentos)
  const totalHoras = (() => {
    let totalMinutos = 0;
    dadosGerais.forEach(req => {
      if (req.total_horas && req.total_horas !== '--') {
        const partes = req.total_horas.split(':');
        const h = parseInt(partes[0] || '0', 10);
        const m = parseInt(partes[1] || '0', 10);
        totalMinutos += h * 60 + m;
      }
    });
    const h = Math.floor(totalMinutos / 60);
    const m = totalMinutos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  })();

  return (
    <div className="w-full h-full bg-white p-8 flex flex-col relative">
      <div className="space-y-6 flex-1">
        {/* Título da Seção */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('books.bookContent.requirementsInDevelopmentTitle')}{' '}
            {empresaNome ? <span className="text-blue-600">{empresaNome}</span> : ''}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('books.bookContent.requirementsInDevelopmentSubtitle')}
          </p>
        </div>

        {/* Card de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
            <CardContent className="flex items-center justify-center py-6">
              <div className="text-center">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2">
                  <FileText className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-3xl font-bold text-orange-600">{dadosGerais.length}</div>
                <div className="text-xs font-medium text-gray-600 mt-1">
                  {t('books.bookContent.requirementsInDevelopmentTotal')}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
            <CardContent className="flex items-center justify-center py-6">
              <div className="text-center">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-600">{totalHoras}</div>
                <div className="text-xs font-medium text-gray-600 mt-1">
                  {t('books.bookContent.requirementsInDevelopmentHours')}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
            <CardContent className="flex items-center justify-center py-6">
              <div className="text-center">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                  <Eye className="h-5 w-5 text-gray-600" />
                </div>
                <div className="text-3xl font-bold text-gray-600">
                  {t('books.bookContent.requirementsInDevelopmentStatus')}
                </div>
                <div className="text-xs font-medium text-gray-600 mt-1">
                  {t('books.bookContent.requirementsInDevelopmentStatusLabel')}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Requerimentos */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span>{t('books.bookContent.requirementsInDevelopmentTitle')}</span>
              <Badge className="bg-orange-100 text-orange-800 text-xs ml-2">
                {totalHoras}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div style={{ borderRadius: '15.5px', overflow: 'hidden' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center font-semibold text-white" style={{ backgroundColor: '#666666' }}>
                      {t('books.bookContent.ticketColumn')}
                    </TableHead>
                    {showTicketExterno && (
                      <TableHead className="text-center font-semibold text-white whitespace-nowrap" style={{ backgroundColor: '#666666' }}>
                        {t('books.bookContent.externalTicketColumn')}
                      </TableHead>
                    )}
                    <TableHead className="text-center font-semibold text-white" style={{ backgroundColor: '#666666' }}>
                      {t('books.bookContent.requirementsClientColumn')}
                    </TableHead>
                    <TableHead className="text-center font-semibold text-white" style={{ backgroundColor: '#666666' }}>
                      {t('books.bookContent.requirementsModuleColumn')}
                    </TableHead>
                    <TableHead className="text-center font-semibold text-white" style={{ backgroundColor: '#666666' }}>
                      {t('books.bookContent.requirementsFunctionalColumn')}
                    </TableHead>
                    <TableHead className="text-center font-semibold text-white" style={{ backgroundColor: '#666666' }}>
                      {t('books.bookContent.requirementsTechnicalColumn')}
                    </TableHead>
                    <TableHead className="text-center font-semibold text-white" style={{ backgroundColor: '#666666' }}>
                      {t('books.bookContent.requirementsTotalColumn')}
                    </TableHead>
                    <TableHead className="text-center font-semibold text-white" style={{ backgroundColor: '#666666' }}>
                      {t('books.bookContent.requirementsDateColumn')}
                    </TableHead>
                    <TableHead className="text-center font-semibold text-white" style={{ backgroundColor: '#666666' }}>
                      {t('books.bookContent.requirementsStatusColumn')}
                    </TableHead>
                    <TableHead className="text-center font-semibold text-white" style={{ backgroundColor: '#666666' }}>
                      {t('books.bookContent.requirementsPeriodColumn')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((req, index) => (
                    <TableRow key={req.id || index} className="hover:bg-gray-50">
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium text-blue-600">{req.numero_chamado}</span>
                          <Badge className="bg-orange-100 text-orange-800 text-[10px] px-1.5 py-0">
                            {req.tipo_cobranca}
                          </Badge>
                        </div>
                      </TableCell>
                      {showTicketExterno && <TableCell className="text-center">{req.ticket_externo || '-'}</TableCell>}
                      <TableCell className="text-center font-medium">{req.cliente}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          {req.modulo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono">{req.horas_funcional}</TableCell>
                      <TableCell className="text-center font-mono">{req.horas_tecnica}</TableCell>
                      <TableCell className="text-center font-mono font-semibold text-blue-600">
                        {req.total_horas}
                      </TableCell>
                      <TableCell className="text-center">{req.data_envio || '-'}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-orange-600 font-medium">{req.status}</span>
                      </TableCell>
                      <TableCell className="text-center">{req.periodo_cobranca || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Background decorativo */}
      <div 
        className="absolute overflow-hidden pointer-events-none portfolio-bg-image" 
        style={{ top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <img
          src="/images/n-sonda-azul.png"
          alt=""
          className="absolute opacity-10"
          style={{ width: '40%', bottom: '-5%', right: '-3%', objectFit: 'contain' }}
        />
      </div>
      <BookFooterBar />
    </div>
  );
}
