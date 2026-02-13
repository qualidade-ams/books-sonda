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
  ReferenceLine,
} from 'recharts';
import type { BookSLAData } from '@/types/books';

interface BookSLAProps {
  data: BookSLAData;
  empresaNome?: string; // Nome abreviado do cliente
}

export default function BookSLA({ data, empresaNome }: BookSLAProps) {
  // Calcular porcentagem para o gráfico circular (gauge)
  const percentage = data.sla_percentual;
  
  // Debug: Verificar dados recebidos
  console.log('🔍 BookSLA - Dados recebidos:', {
    sla_percentual: data.sla_percentual,
    meta_percentual: data.meta_percentual,
    fechados: data.fechados,
    incidentes: data.incidentes,
    violados: data.violados,
    historico: data.sla_historico,
    historicoLength: data.sla_historico?.length
  });
  
  return (
    <div className="space-y-6">
      {/* Título da Seção */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          SLA {empresaNome ? <span className="text-blue-600">{empresaNome}</span> : 'RAINBOW'}
        </h2>
        <p className="text-sm text-gray-500">Dashboard de Monitoramento de Nível de Serviço</p>
      </div>

      {/* Layout Principal: Coluna Esquerda (SLA + Cards) e Coluna Direita (Gráfico) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda: SLA | META DE ATENDIMENTO + Cards de Métricas */}
        <div className="space-y-6">
          {/* Card: SLA | Meta de Atendimento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                SLA | META DE ATENDIMENTO
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <div className="relative w-48 h-48 flex items-center justify-center">
                  {/* Gauge Chart usando SVG */}
                  <svg width="192" height="128" viewBox="0 0 192 128" className="absolute top-0">
                    {/* Arco de fundo (cinza) */}
                    <path
                      d="M 20 108 A 76 76 0 0 1 172 108"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                    {/* Arco de progresso (azul/vermelho) */}
                    <path
                      d="M 20 108 A 76 76 0 0 1 172 108"
                      fill="none"
                      stroke={data.status === 'vencido' ? '#EF4444' : '#2563eb'}
                      strokeWidth="20"
                      strokeLinecap="round"
                      strokeDasharray={`${(percentage / 100) * 239} 239`}
                    />
                  </svg>
                  
                  {/* Valor Central - Centralizado */}
                  <div className="flex flex-col items-center justify-center text-center z-10">
                    <div className={`text-4xl font-bold ${
                      data.status === 'vencido' ? 'text-red-500' : 'text-blue-600'
                    }`}>
                      {data.sla_percentual}%
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {data.sla_elegivel === false ? 'NÃO ELEGÍVEL' : 'CONTRATO'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center mt-4">
                <span className="text-sm text-gray-600">Meta: </span>
                <span className="text-sm font-semibold text-blue-600">{data.meta_percentual}%</span>
              </div>
              
              {/* Mensagem de não elegibilidade */}
              {data.sla_elegivel === false && data.mensagem_nao_elegivel && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800 text-center">
                    {data.mensagem_nao_elegivel}
                  </p>
                </div>
              )}
              
              {/* Mensagem de violados não elegíveis */}
              {data.mensagem_violados_nao_elegiveis && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800 text-center">
                    ℹ️ {data.mensagem_violados_nao_elegiveis}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cards de Métricas - Abaixo do SLA */}
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

        {/* Coluna Direita: Gráfico SLA Histórico */}
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
            <ResponsiveContainer width="100%" height={400}>
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
                  {data.sla_historico.map((entry, index) => {
                    // Azul: Se não for elegível OU se percentual >= meta
                    // Vermelho: Apenas se for elegível E percentual < meta
                    const isElegivel = entry.elegivel !== false; // Default true se não definido
                    const cor = (!isElegivel || entry.percentual >= data.meta_percentual) 
                      ? '#2563eb' // Azul
                      : '#ef4444'; // Vermelho
                    
                    return (
                      <Cell 
                        key={`cell-${index}`}
                        fill={cor}
                      />
                    );
                  })}
                </Bar>
                {/* Linha de referência da meta - DEPOIS das barras para ficar na frente */}
                <ReferenceLine 
                  x={data.meta_percentual} 
                  stroke="#9ca3af" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela: Chamados Violados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">CHAMADOS VIOLADOS</CardTitle>
              {data.chamados_violados.length === 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  Nenhum chamado violado no período
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.chamados_violados.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <CheckCircle2 className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600 font-medium mb-2">
                  Nenhum chamado violado
                </p>
                <p className="text-sm text-gray-500">
                  Todos os chamados estão dentro do prazo estabelecido
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-blue-600 text-white hover:bg-gray-400">
                  <TableHead className="text-white text-center font-semibold">CHAMADO</TableHead>
                  <TableHead className="text-white text-center font-semibold">TIPO</TableHead>
                  <TableHead className="text-white text-center font-semibold">ABERTURA</TableHead>
                  <TableHead className="text-white text-center font-semibold">SOLUÇÃO</TableHead>
                  <TableHead className="text-white text-center font-semibold">GRUPO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.chamados_violados.map((chamado, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-center text-blue-600">{chamado.id_chamado}</TableCell>
                    <TableCell className='text-center'>{chamado.tipo}</TableCell>
                    <TableCell className='text-center'>{chamado.data_abertura}</TableCell>
                    <TableCell className='text-center'>{chamado.data_solucao}</TableCell>
                    <TableCell className='text-center'>{chamado.grupo_atendedor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
