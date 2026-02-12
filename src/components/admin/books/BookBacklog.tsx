/**
 * BookBacklog - Componente de Backlog
 * Exibe análise detalhada de pendências e envelhecimento de chamados
 */

import { FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { BookBacklogData } from '@/types/books';

interface BookBacklogProps {
  data: BookBacklogData;
}

export default function BookBacklog({ data }: BookBacklogProps) {
  return (
    <div className="space-y-6">
      {/* Título da Seção */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Backlog Analysis</h2>
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
                />
                <Bar 
                  dataKey="incidente" 
                  fill="#9ca3af" 
                  name="Incidente"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Card: Distribuição por Grupo */}
        <Card className="bg-blue-600 text-white">
          <CardHeader>
            <CardTitle className="text-white text-base font-semibold">
              {data.distribuicao_por_grupo[0]?.grupo || 'GRUPO'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-6xl font-bold mb-2">
                {data.distribuicao_por_grupo[0]?.total || 0}
              </div>
              <div className="text-sm opacity-90">CHAMADOS</div>
            </div>

            <div className="space-y-2">
              <div className="text-sm opacity-90">Percentual</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/20 rounded-full h-3">
                  <div 
                    className="bg-white h-3 rounded-full transition-all" 
                    style={{ width: `${data.distribuicao_por_grupo[0]?.percentual || 0}%` }}
                  />
                </div>
                <span className="text-lg font-bold">
                  {data.distribuicao_por_grupo[0]?.percentual || 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
