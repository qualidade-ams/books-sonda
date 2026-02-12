/**
 * BookSLA - Componente de SLA
 * Exibe dashboard de monitoramento de nível de serviço
 */

import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { BookSLAData } from '@/types/books';

interface BookSLAProps {
  data: BookSLAData;
}

export default function BookSLA({ data }: BookSLAProps) {
  // Calcular ângulo para o gráfico circular (gauge)
  const percentage = data.sla_percentual;
  const angle = (percentage / 100) * 180; // 180 graus = semicírculo
  
  return (
    <div className="space-y-6">
      {/* Título da Seção */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">SLA RAINBOW</h2>
        <p className="text-sm text-gray-500">Dashboard de Monitoramento de Nível de Serviço</p>
      </div>

      {/* Cards Superiores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: SLA | Meta de Atendimento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              SLA | META DE ATENDIMENTO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="relative">
                {/* Gauge Chart Simulado */}
                <div className="relative w-48 h-24 overflow-hidden">
                  <div className="absolute inset-0 flex items-end justify-center">
                    <div className="w-48 h-48 rounded-full border-[20px] border-gray-200" />
                  </div>
                  <div 
                    className="absolute inset-0 flex items-end justify-center"
                    style={{
                      clipPath: `polygon(0 100%, 100% 100%, 100% ${100 - percentage}%, 0 ${100 - percentage}%)`
                    }}
                  >
                    <div className={`w-48 h-48 rounded-full border-[20px] ${
                      data.status === 'vencido' ? 'border-red-500' : 'border-green-500'
                    }`} />
                  </div>
                </div>
                
                {/* Valor Central */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                  <div className={`text-5xl font-bold ${
                    data.status === 'vencido' ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {data.sla_percentual}%
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    STATUS ATUAL
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-4">
              <span className="text-sm text-gray-600">Meta: </span>
              <span className="text-sm font-semibold text-blue-600">{data.meta_percentual}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-600">{data.fechados}</div>
                <div className="text-xs text-gray-500 mt-1">FECHADOS</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="text-3xl font-bold text-yellow-600">{data.incidentes}</div>
                <div className="text-xs text-gray-500 mt-1">INCIDENTES</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="text-3xl font-bold text-red-600">{data.violados}</div>
                <div className="text-xs text-gray-500 mt-1">VIOLADOS</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gráfico: SLA Histórico | Mensal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">SLA HISTÓRICO | MENSAL</CardTitle>
          <div className="flex items-center gap-4 text-xs mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-600" />
              <span>No Prazo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Vencido</span>
            </div>
            <div className="ml-auto text-gray-600">
              META: <span className="font-semibold">{data.meta_percentual}%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={data.sla_historico}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                type="number" 
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <YAxis 
                type="category" 
                dataKey="mes"
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => `${value}%`}
              />
              <Bar 
                dataKey="percentual" 
                radius={[0, 4, 4, 0]}
              >
                {data.sla_historico.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.status === 'vencido' ? '#ef4444' : '#2563eb'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela: Chamados Violados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">CHAMADOS VIOLADOS</CardTitle>
              <p className="text-xs text-red-600 mt-1">
                Mostrando os {data.chamados_violados.length} chamados críticos mais recentes
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-600 text-white">
                <TableHead className="text-white font-semibold">ID CHAMADO</TableHead>
                <TableHead className="text-white font-semibold">TIPO</TableHead>
                <TableHead className="text-white font-semibold">ABERTURA</TableHead>
                <TableHead className="text-white font-semibold">SOLUÇÃO</TableHead>
                <TableHead className="text-white font-semibold">GRUPO ATENDEDOR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.chamados_violados.map((chamado, index) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-blue-600">{chamado.id_chamado}</TableCell>
                  <TableCell>{chamado.tipo}</TableCell>
                  <TableCell>{chamado.data_abertura}</TableCell>
                  <TableCell>{chamado.data_solucao}</TableCell>
                  <TableCell>{chamado.grupo_atendedor}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
