/**
 * BookPesquisa - Componente de Pesquisa
 * Exibe dados de pesquisas de satisfação e aderência
 */

import { Smile, Meh, Frown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BookPesquisaData } from '@/types/books';
import { useTranslation } from 'react-i18next';
import BookFooterBar from './BookFooterBar';

interface BookPesquisaProps {
  data: BookPesquisaData;
  empresaNome?: string; // Nome abreviado do cliente
}

export default function BookPesquisa({ data, empresaNome }: BookPesquisaProps) {
  const { t } = useTranslation();
  // Calcular ângulo para o gráfico circular de aderência
  const aderenciaAngle = (data.percentual_aderencia / 100) * 360;

  return (
    <div className="w-full h-full bg-white p-8 flex flex-col relative">
      <div className="space-y-6 flex-1">
      {/* Título da Seção */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {t('books.bookContent.surveyTitle')} {empresaNome ? <span className="text-blue-600">{empresaNome}</span> : 'RAINBOW'}
        </h2>
        <p className="text-muted-foreground mt-1">
          {t('books.bookContent.surveySubtitle')}
        </p>
      </div>

      {/* Cards Circulares de Pesquisas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pesquisas Respondidas */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 text-center">
              {t('books.bookContent.surveysAnswered')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-4">
            <div className="relative" style={{ width: '128px', height: '128px' }}>
              <svg 
                className="absolute inset-0 transform -rotate-90" 
                viewBox="0 0 128 128"
                style={{ width: '100%', height: '100%' }}
              >
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#d1d5db"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(data.pesquisas_respondidas / data.pesquisas_enviadas) * 352} 352`}
                />
              </svg>
              <div 
                className="absolute flex items-center justify-center"
                style={{ 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  width: '100%',
                  height: '100%'
                }}
              >
                <span className="text-3xl font-bold text-gray-400">
                  {data.pesquisas_respondidas}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pesquisas Não Respondidas */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 text-center">
              {t('books.bookContent.surveysNotAnswered')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-4">
            <div className="relative" style={{ width: '128px', height: '128px' }}>
              <svg 
                className="absolute inset-0 transform -rotate-90" 
                viewBox="0 0 128 128"
                style={{ width: '100%', height: '100%' }}
              >
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#2563eb"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(data.pesquisas_nao_respondidas / data.pesquisas_enviadas) * 352} 352`}
                />
              </svg>
              <div 
                className="absolute flex items-center justify-center"
                style={{ 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  width: '100%',
                  height: '100%'
                }}
              >
                <span className="text-3xl font-bold text-blue-600">
                  {data.pesquisas_nao_respondidas}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pesquisas Enviadas */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 text-center">
              {t('books.bookContent.surveysSent')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-4">
            <div className="relative" style={{ width: '128px', height: '128px' }}>
              <svg 
                className="absolute inset-0 transform -rotate-90" 
                viewBox="0 0 128 128"
                style={{ width: '100%', height: '100%' }}
              >
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#2563eb"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray="352 352"
                />
              </svg>
              <div 
                className="absolute flex items-center justify-center"
                style={{ 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  width: '100%',
                  height: '100%'
                }}
              >
                <span className="text-3xl font-bold text-blue-600">
                  {data.pesquisas_enviadas}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela e Cards Laterais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela: Resumo de Pesquisas */}
        <Card className="lg:col-span-2 border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span>{t('books.bookContent.surveySummary')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {data.sem_avaliacoes ? (
              <div className="text-center py-12">
                <p className="text-gray-400 italic">
                  {t('books.bookContent.noDataToShow')}
                </p>
              </div>
            ) : (
              <div style={{ borderRadius: '35.5px', overflow: 'hidden' }}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">{t('books.bookContent.ticketColumn')}</TableHead>
                      <TableHead className="font-semibold">{t('books.bookContent.typeColumn')}</TableHead>
                      <TableHead className="font-semibold">{t('books.bookContent.requesterColumn')}</TableHead>
                      <TableHead className="font-semibold">{t('books.bookContent.groupColumn')}</TableHead>
                      <TableHead className="font-semibold text-white" style={{ backgroundColor: '#666666' }}>{t('books.bookContent.responseColumn')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.resumo_pesquisas.map((pesquisa, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-blue-600">{pesquisa.chamado}</TableCell>
                        <TableCell>{pesquisa.tipo}</TableCell>
                        <TableCell>{pesquisa.solicitante}</TableCell>
                        <TableCell>{pesquisa.grupo}</TableCell>
                        <TableCell>{pesquisa.resposta || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cards Laterais */}
        <div className="space-y-6">
          {/* Card: % Pesquisa Aderência */}
          <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-600 text-center">
                {t('books.bookContent.surveyAdherence')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-4">
              <div className="relative" style={{ width: '160px', height: '160px' }}>
                <svg 
                  className="absolute inset-0 transform -rotate-90" 
                  viewBox="0 0 160 160"
                  style={{ width: '100%', height: '100%' }}
                >
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#e5e7eb"
                    strokeWidth="16"
                    fill="none"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#2563eb"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${(data.percentual_aderencia / 100) * 440} 440`}
                    strokeLinecap="round"
                  />
                </svg>
                <div 
                  className="absolute flex items-center justify-center"
                  style={{ 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    width: '100%',
                    height: '100%'
                  }}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {data.percentual_aderencia.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      <span className="text-gray-400">0.0%</span>
                      <span className="mx-2">-</span>
                      <span className="text-gray-600">100.0%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Nível de Satisfação */}
          <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-600 text-center">
                {t('books.bookContent.satisfactionLevel')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.sem_avaliacoes ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400 italic mb-4">
                    {t('books.bookContent.noRecentEvaluations')}
                  </p>
                  <div className="flex justify-center gap-8 opacity-30">
                    <div className="text-center">
                      <Frown className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <div className="text-xs text-gray-400">{t('books.bookContent.dissatisfied')}</div>
                    </div>
                    <div className="text-center">
                      <Meh className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <div className="text-xs text-gray-400">{t('books.bookContent.neutral')}</div>
                    </div>
                    <div className="text-center">
                      <Smile className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <div className="text-xs text-gray-400">{t('books.bookContent.satisfied')}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center gap-8 py-4">
                  <div className="text-center">
                    <Frown className="h-12 w-12 text-red-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-500">
                      {data.nivel_satisfacao.insatisfeito}
                    </div>
                    <div className="text-xs text-gray-500">{t('books.bookContent.dissatisfied')}</div>
                  </div>
                  <div className="text-center">
                    <Meh className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-yellow-500">
                      {data.nivel_satisfacao.neutro}
                    </div>
                    <div className="text-xs text-gray-500">{t('books.bookContent.neutral')}</div>
                  </div>
                  <div className="text-center">
                    <Smile className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-500">
                      {data.nivel_satisfacao.satisfeito}
                    </div>
                    <div className="text-xs text-gray-500">{t('books.bookContent.satisfied')}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
      <BookFooterBar />
    </div>
  );
}
