/**
 * BookConsumo - Componente de Consumo
 * Exibe visão detalhada de utilização de horas e baseline
 */

import { Clock, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { BookConsumoData } from '@/types/books';

interface BookConsumoProps {
  data: BookConsumoData;
  empresaNome?: string; // Nome abreviado do cliente
}

export default function BookConsumo({ data, empresaNome }: BookConsumoProps) {
  return (
    <div className="space-y-6">
      {/* Título da Seção */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Consumo {empresaNome ? <span className="text-blue-600">{empresaNome}</span> : 'RAINBOW'}
          </h2>
          <p className="text-sm text-gray-500">Visão detalhada de utilização de horas e baseline</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Mês Atual
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
            Trimestre
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
            Ano
          </button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600">
              HORAS CONSUMO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div className="text-3xl font-bold text-blue-600">{data.horas_consumo}</div>
            </div>
            <div className="text-xs text-green-600 mt-2">
              ↑ 12% em relação ao mês anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600">
              BASELINE DE APL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div className="text-3xl font-bold text-purple-600">{data.baseline_apl}</div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${data.percentual_consumido}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600">
              INCIDENTE
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.incidente === '--' || !data.incidente || data.incidente === '00:00:00' ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div className="text-3xl font-bold text-green-600">00:00:00</div>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  0% do total consumido
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <div className="text-3xl font-bold text-orange-600">{data.incidente}</div>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  Registrado no período
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600">
              SOLICITAÇÃO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div className="text-3xl font-bold text-green-600">{data.solicitacao}</div>
            </div>
            <div className="text-xs text-gray-600 mt-2">
              {data.percentual_consumido}% do total consumido
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico: Histórico de Consumo Mensal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Horas Mês</CardTitle>
            <p className="text-xs text-gray-500">Histórico de consumo mensal em 2025</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.historico_consumo}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                  label={{ value: 'Horas', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => `${value.toFixed(2)}h`}
                />
                <Line 
                  type="monotone" 
                  dataKey="valor_numerico" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  dot={{ fill: '#2563eb', r: 5 }}
                  activeDot={{ r: 7 }}
                  name="SOLICITAÇÃO"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Card: Distribuição de Causa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Distribuição de Causa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.distribuicao_causa.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.causa}</span>
                  <span className="font-bold">{item.quantidade}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all" 
                      style={{ width: `${item.percentual}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-10 text-right">{item.percentual}%</span>
                </div>
              </div>
            ))}

            <div className="pt-4 border-t mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-600">TOTAL GERAL</span>
                <span className="text-2xl font-bold text-blue-600">{data.total_geral}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
