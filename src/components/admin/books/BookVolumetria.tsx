/**
 * BookVolumetria - Componente de volumetria
 * Exibe métricas, gráficos e tabelas de chamados
 */

import { FileText, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { BookVolumetriaData } from '@/types/books';

interface BookVolumetriaProps {
  data: BookVolumetriaData;
}

export default function BookVolumetria({ data }: BookVolumetriaProps) {
  return (
    <div className="space-y-6">
      {/* Título da Seção */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Volumetria RAINBOW</h2>
        <p className="text-sm text-gray-500">Visão Geral de Chamados e Desempenho Operacional</p>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Abertos | Mês */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              ABERTOS | MÊS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-blue-600">{data.abertos_mes.solicitacao}</span>
                <span className="text-xs text-gray-500">SOLICITAÇÃO</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-blue-600">{data.abertos_mes.incidente}</span>
                <span className="text-xs text-gray-500">INCIDENTE</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fechados | Mês */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-green-600" />
              </div>
              FECHADOS | MÊS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-green-600">{data.fechados_mes.solicitacao}</span>
                <span className="text-xs text-gray-500">SOLICITAÇÃO</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-green-600">{data.fechados_mes.incidente}</span>
                <span className="text-xs text-gray-500">INCIDENTE</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SLA Médio */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-yellow-600" />
              </div>
              SLA MÉDIO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {data.sla_medio.toFixed(1)}%
            </div>
            <div className="text-xs text-green-600 mt-1">
              ↑ +2.4% vs mês ant.
            </div>
          </CardContent>
        </Card>

        {/* Total Backlog */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-gray-600" />
              </div>
              TOTAL BACKLOG
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {data.total_backlog}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Pendentes de atuação
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico e Card Lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico: Chamados | Semestre */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Chamados | Semestre</CardTitle>
            <p className="text-xs text-gray-500">Monitoramento do volume mensal 2025</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.chamados_semestre}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="circle"
                />
                <Bar 
                  dataKey="abertos" 
                  fill="#60a5fa" 
                  name="ABERTOS"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="fechados" 
                  fill="#2563eb" 
                  name="FECHADOS"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Card: Chamados por Grupo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">CHAMADOS | GRUPO | MÊS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.chamados_por_grupo.map((grupo, index) => (
              <div key={index} className="space-y-2">
                <div className="font-semibold text-sm">{grupo.grupo}</div>
                <div className="text-xs text-gray-600">Total: {grupo.total}</div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-blue-100 rounded px-2 py-1 text-center">
                    <div className="text-xs text-blue-600 font-semibold">{grupo.abertos}</div>
                    <div className="text-xs text-gray-500">ABERTOS</div>
                  </div>
                  <div className="flex-1 bg-blue-600 rounded px-2 py-1 text-center">
                    <div className="text-xs text-white font-semibold">{grupo.fechados}</div>
                    <div className="text-xs text-blue-100">FECHADOS</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Os dados representam a distribuição de tickets pelo grupo de suporte "IMPORTAÇÃO" durante o período selecionado.
                </div>
                <div className="pt-2 border-t">
                  <div className="text-sm font-semibold">Taxa de Resolução</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${data.taxa_resolucao}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-blue-600">{data.taxa_resolucao}%</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Tabela: Backlog Atualizado X CAUSA */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Backlog Atualizado X CAUSA</CardTitle>
            <Button variant="link" className="text-blue-600 text-sm">Ver Detalhes</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">ORIGEM</TableHead>
                <TableHead className="text-center font-semibold">INCIDENTE</TableHead>
                <TableHead className="text-center font-semibold">SOLICITAÇÃO</TableHead>
                <TableHead className="text-center font-semibold bg-blue-600 text-white">TOTAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.backlog_por_causa.map((item, index) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{item.origem}</TableCell>
                  <TableCell className="text-center">{item.incidente || '-'}</TableCell>
                  <TableCell className="text-center">{item.solicitacao || '-'}</TableCell>
                  <TableCell className="text-center font-semibold">{item.total}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-blue-600 text-white font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-center">
                  {data.backlog_por_causa.reduce((sum, item) => sum + item.incidente, 0)}
                </TableCell>
                <TableCell className="text-center">
                  {data.backlog_por_causa.reduce((sum, item) => sum + item.solicitacao, 0)}
                </TableCell>
                <TableCell className="text-center">
                  {data.backlog_por_causa.reduce((sum, item) => sum + item.total, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
