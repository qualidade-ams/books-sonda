/**
 * BookBacklog - Componente de Backlog
 * Exibe análise detalhada de pendências e envelhecimento de chamados
 */

import { FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  LabelList,
} from 'recharts';
import type { BookBacklogData } from '@/types/books';

interface BookBacklogProps {
  data: BookBacklogData;
  empresaNome?: string; // Nome abreviado do cliente
}

export default function BookBacklog({ data, empresaNome }: BookBacklogProps) {
  // Log para debug
  console.log('📊 BookBacklog - dados recebidos:', {
    total: data.total,
    incidente: data.incidente,
    solicitacao: data.solicitacao,
    tem_backlog_por_causa: !!data.backlog_por_causa,
    backlog_por_causa_length: data.backlog_por_causa?.length || 0,
    backlog_por_causa: data.backlog_por_causa
  });

  return (
    <div className="space-y-6">
      {/* Título da Seção */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Backlog {empresaNome ? <span className="text-blue-600">{empresaNome}</span> : ''}
        </h2>
        <p className="text-sm text-gray-500">Visão detalhada de pendências e envelhecimento de chamados</p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              TOTAL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900">{data.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              INCIDENTE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-600">{data.incidente}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              SOLICITAÇÃO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">{data.solicitacao}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico e Card Lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico: Aging dos Chamados */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Aging dos Chamados</CardTitle>
            <div className="flex items-center gap-4 text-xs mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600" />
                <span>Solicitação</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span>Incidente</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.aging_chamados}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="faixa" 
                  tick={{ fontSize: 11 }}
                  stroke="#666"
                  angle={-15}
                  textAnchor="end"
                  height={80}
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
                  dataKey="solicitacao" 
                  fill="#2563eb" 
                  name="Solicitação"
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList 
                    dataKey="solicitacao" 
                    position="inside" 
                    style={{ 
                      fill: '#fff', 
                      fontSize: '12px', 
                      fontWeight: 'bold' 
                    }}
                    formatter={(value: number) => value > 0 ? value : ''}
                  />
                </Bar>
                <Bar 
                  dataKey="incidente" 
                  fill="#9ca3af" 
                  name="Incidente"
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList 
                    dataKey="incidente" 
                    position="inside" 
                    style={{ 
                      fill: '#fff', 
                      fontSize: '12px', 
                      fontWeight: 'bold' 
                    }}
                    formatter={(value: number) => value > 0 ? value : ''}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Card: Distribuição por Grupo - TODOS OS GRUPOS */}
        <Card className="bg-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-xs font-semibold">CHAMADOS | GRUPO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {data.distribuicao_por_grupo && data.distribuicao_por_grupo.length > 0 ? (
              data.distribuicao_por_grupo.map((grupo, index) => (
                <div key={index} className="pb-2 border-b border-white/20 last:border-b-0 last:pb-0">
                  {/* Nome do grupo e total */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-semibold text-xs leading-tight text-white">{grupo.grupo}</div>
                    <div className="text-xs text-white/80 whitespace-nowrap">Total: {grupo.total}</div>
                  </div>
                  
                  {/* Barra de progresso com percentual */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white/20 rounded-full h-2">
                        <div 
                          className="bg-white h-2 rounded-full transition-all" 
                          style={{ width: `${grupo.percentual}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-white whitespace-nowrap">
                        {grupo.percentual}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-white/70">
                <p className="text-sm">Nenhum grupo encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela: Backlog Atualizado X CAUSA */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Backlog Atualizado X CAUSA</CardTitle>
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
              {(data.backlog_por_causa && data.backlog_por_causa.length > 0) ? (
                <>
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
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    Nenhum dado de backlog por causa disponível
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
