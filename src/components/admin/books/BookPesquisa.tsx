/**
 * BookPesquisa - Componente de Pesquisa
 * Exibe dados de pesquisas de satisfação e aderência
 */

import { Download, Smile, Meh, Frown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BookPesquisaData } from '@/types/books';

interface BookPesquisaProps {
  data: BookPesquisaData;
  empresaNome?: string; // Nome abreviado do cliente
}

export default function BookPesquisa({ data, empresaNome }: BookPesquisaProps) {
  // Calcular ângulo para o gráfico circular de aderência
  const aderenciaAngle = (data.percentual_aderencia / 100) * 360;

  return (
    <div className="space-y-6">
      {/* Título da Seção */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Pesquisa {empresaNome ? <span className="text-blue-600">{empresaNome}</span> : 'RAINBOW'}
          </h2>
        </div>
        <Button variant="outline" size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Cards Circulares de Pesquisas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pesquisas Respondidas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 text-center">
              PESQUISAS RESPONDIDAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-400">
                    {data.pesquisas_respondidas}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pesquisas Não Respondidas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 text-center">
              PESQUISAS NÃO RESPONDIDAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-blue-600">
                    {data.pesquisas_nao_respondidas}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pesquisas Enviadas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 text-center">
              PESQUISAS ENVIADAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-blue-600">
                    {data.pesquisas_enviadas}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela e Cards Laterais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela: Resumo de Pesquisas */}
        <Card className="lg:col-span-2">
          <CardHeader className="bg-blue-600 text-white rounded-t-lg">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span>Resumo de Pesquisas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {data.sem_avaliacoes ? (
              <div className="text-center py-12">
                <p className="text-gray-400 italic">
                  Nenhum dado para exibir no momento...
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Chamado</TableHead>
                    <TableHead className="font-semibold">Tipo</TableHead>
                    <TableHead className="font-semibold">Solicitante</TableHead>
                    <TableHead className="font-semibold">Grupo</TableHead>
                    <TableHead className="font-semibold">Resposta</TableHead>
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
            )}
          </CardContent>
        </Card>

        {/* Cards Laterais */}
        <div className="space-y-6">
          {/* Card: % Pesquisa Aderência */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 text-center">
                % PESQUISA ADERÊNCIA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-4">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90">
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
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-blue-600">
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
              </div>
            </CardContent>
          </Card>

          {/* Card: Nível de Satisfação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 text-center">
                NÍVEL DE SATISFAÇÃO
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.sem_avaliacoes ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400 italic mb-4">
                    Sem avaliações recentes
                  </p>
                  <div className="flex justify-center gap-8 opacity-30">
                    <div className="text-center">
                      <Frown className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <div className="text-xs text-gray-400">INSATISFEITO</div>
                    </div>
                    <div className="text-center">
                      <Meh className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <div className="text-xs text-gray-400">NEUTRO</div>
                    </div>
                    <div className="text-center">
                      <Smile className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <div className="text-xs text-gray-400">SATISFEITO</div>
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
                    <div className="text-xs text-gray-500">INSATISFEITO</div>
                  </div>
                  <div className="text-center">
                    <Meh className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-yellow-500">
                      {data.nivel_satisfacao.neutro}
                    </div>
                    <div className="text-xs text-gray-500">NEUTRO</div>
                  </div>
                  <div className="text-center">
                    <Smile className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-500">
                      {data.nivel_satisfacao.satisfeito}
                    </div>
                    <div className="text-xs text-gray-500">SATISFEITO</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
