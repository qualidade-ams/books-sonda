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
  LabelList,
} from 'recharts';
import type { BookVolumetriaData } from '@/types/books';

interface BookVolumetriaProps {
  data: BookVolumetriaData;
  empresaNome?: string; // Nome abreviado do cliente
  mes?: number; // Mês atual para exibir no subtítulo
  ano?: number; // Ano atual para exibir no subtítulo
}

export default function BookVolumetria({ data, empresaNome, mes, ano }: BookVolumetriaProps) {
  // Calcular período do semestre para exibição
  const anoExibicao = ano || new Date().getFullYear();
  const mesAtual = mes || new Date().getMonth() + 1;
  
  // Calcular mês inicial (6 meses atrás)
  let mesInicial = mesAtual - 5;
  let anoInicial = anoExibicao;
  while (mesInicial <= 0) {
    mesInicial += 12;
    anoInicial -= 1;
  }
  
  const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const periodoTexto = anoInicial === anoExibicao 
    ? `${MESES_ABREV[mesInicial - 1]} - ${MESES_ABREV[mesAtual - 1]} ${anoExibicao}`
    : `${MESES_ABREV[mesInicial - 1]}/${anoInicial} - ${MESES_ABREV[mesAtual - 1]}/${anoExibicao}`;
  
  // Debug: Log dos dados do gráfico
  console.log('📊 BookVolumetria - Dados do gráfico:', {
    empresa: empresaNome,
    periodo: periodoTexto,
    mes: mesAtual,
    ano: anoExibicao,
    dadosSemestre: data.chamados_semestre,
    totalAbertos: data.chamados_semestre?.reduce((sum, d) => sum + d.abertos, 0) || 0,
    totalFechados: data.chamados_semestre?.reduce((sum, d) => sum + d.fechados, 0) || 0
  });
  
  return (
    <div className="space-y-6">
      {/* Título da Seção */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Volumetria {empresaNome ? <span className="text-blue-600">{empresaNome}</span> : 'RAINBOW'}
        </h2>
        <p className="text-sm text-gray-500">Visão Geral de Chamados e Desempenho Operacional</p>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Abertos | Mês */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-gray-600" />
              </div>
              ABERTOS | MÊS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-600">{data.abertos_mes.solicitacao}</span>
                <span className="text-xs text-gray-500">SOLICITAÇÃO</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-600">{data.abertos_mes.incidente}</span>
                <span className="text-xs text-gray-500">INCIDENTE</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fechados | Mês */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              FECHADOS | MÊS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-blue-600">{data.fechados_mes.solicitacao}</span>
                <span className="text-xs text-gray-500">SOLICITAÇÃO</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-blue-600">{data.fechados_mes.incidente}</span>
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
            <p className="text-xs text-gray-500">
              Monitoramento do volume mensal ({periodoTexto})
            </p>
          </CardHeader>
          <CardContent>
            {data.chamados_semestre && data.chamados_semestre.length > 0 ? (
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
                    allowDecimals={false}
                    domain={[0, 'auto']}
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
                    fill="#9ca3af" 
                    name="ABERTOS"
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList 
                      dataKey="abertos" 
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
                    dataKey="fechados" 
                    fill="#2563eb" 
                    name="FECHADOS"
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList 
                      dataKey="fechados" 
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
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nenhum dado disponível para o período</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card: Chamados por Grupo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold">CHAMADOS | GRUPO | MÊS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.chamados_por_grupo.map((grupo, index) => (
              <div key={index} className="pb-2 border-b last:border-b-0 last:pb-0">
                {/* Nome e Total na mesma linha - mais compacto */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-semibold text-xs leading-tight">{grupo.grupo}</div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">Total: {grupo.total}</div>
                </div>
                
                {/* Boxes de Abertos/Fechados - mais compactos */}
                <div className="flex gap-1.5">
                  <div className="flex-1 bg-gray-100 rounded px-2 py-1 text-center">
                    <div className="text-base text-gray-600 font-bold leading-tight">{grupo.abertos}</div>
                    <div className="text-xs text-gray-500 leading-tight">ABERTOS</div>
                  </div>
                  <div className="flex-1 bg-blue-600 rounded px-2 py-1 text-center">
                    <div className="text-base text-white font-bold leading-tight">{grupo.fechados}</div>
                    <div className="text-xs text-blue-100 leading-tight">FECHADOS</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Tabela: Chamados X CAUSA */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Chamados X CAUSA</CardTitle>           
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">ORIGEM</TableHead>
                <TableHead className="text-center font-semibold bg-gray-100">ABERTOS</TableHead>
                <TableHead className="text-center font-semibold bg-blue-600 text-white">FECHADOS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.backlog_por_causa.map((item, index) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{item.origem}</TableCell>
                  <TableCell className="text-center bg-gray-50">{item.abertos || 0}</TableCell>
                  <TableCell className="text-center bg-blue-50">{item.fechados || 0}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-blue-600 text-white font-bold hover:bg-[#9ca3af]">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-center">
                  {data.backlog_por_causa.reduce((sum, item) => sum + (item.abertos || 0), 0)}
                </TableCell>
                <TableCell className="text-center">
                  {data.backlog_por_causa.reduce((sum, item) => sum + (item.fechados || 0), 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
