/**
 * BookSLA - Componente de SLA
 * Exibe dashboard de monitoramento de nível de serviço
 */

import { CheckCircle2, AlertCircle, XCircle, Info } from 'lucide-react';
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
    <div className="w-full h-full bg-white p-8">
      <div className="space-y-5">
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
          <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-600">
                SLA | META DE ATENDIMENTO
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              <div className="flex items-center justify-center">
                <div className="relative w-[400px] h-[280px] flex items-center justify-center mt-4">
                  {/* Gauge Chart usando SVG - Aumentado */}
                  <svg width="400" height="260" viewBox="0 0 400 260" className="absolute top-0">
                    {/* Arco de fundo (cinza) */}
                    <path
                      d="M 40 220 A 160 160 0 0 1 360 220"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="36"
                      strokeLinecap="round"
                    />
                    {/* Arco de progresso (azul/vermelho) */}
                    <path
                      d="M 40 220 A 160 160 0 0 1 360 220"
                      fill="none"
                      stroke={data.status === 'vencido' ? '#EF4444' : '#2563eb'}
                      strokeWidth="36"
                      strokeLinecap="round"
                      strokeDasharray={`${(percentage / 100) * 503} 503`}
                    />
                  </svg>
                  
                  {/* Valor Central - Centralizado e Maior */}
                  <div className="flex flex-col items-center justify-center text-center z-10 mt-12 pt-14">
                    <div className={`text-6xl font-bold ${
                      data.status === 'vencido' ? 'text-red-500' : 'text-blue-600'
                    }`}>
                      {data.sla_percentual}%
                    </div>
                    <div className="text-xl text-gray-500 mt-2">
                      {data.sla_elegivel === false ? 'NÃO ELEGÍVEL' : 'CONTRATO'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center -mt-4 relative z-20">
                <span className="text-base text-gray-600">Meta: </span>
                <span className="text-base font-semibold text-blue-600">{data.meta_percentual}%</span>
              </div>
              
              {/* Mensagem de não elegibilidade */}
              {data.sla_elegivel === false && data.mensagem_nao_elegivel && (
                <div className="mt-3 p-3 rounded-lg relative z-20">
                  <p className="text-xs text-gray-700 font-semibold text-center underline flex items-center justify-center gap-1.5">
                    <Info className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    {data.mensagem_nao_elegivel}
                  </p>
                </div>
              )}
              
              {/* Mensagem de violados não elegíveis */}
              {data.mensagem_violados_nao_elegiveis && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg relative z-20">
                  <p className="text-xs text-blue-800 text-center">
                    ℹ️ {data.mensagem_violados_nao_elegiveis}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cards de Métricas - Abaixo do SLA */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  </div>
                  FECHADOS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-black">{data.fechados}</div>
              </CardContent>
            </Card>

            <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  </div>
                  INCIDENTES
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-black">{data.incidentes}</div>
              </CardContent>
            </Card>

            <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                  VIOLADOS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-black">{data.violados}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Coluna Direita: Gráfico SLA Histórico */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">SLA HISTÓRICO | MENSAL</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={450}>
              <BarChart 
                data={data.sla_historico}
                layout="vertical"
                margin={{ top: 25, right: 30, left: 80, bottom: 5 }}
                barSize={45}
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
                  label={{
                    value: `META: ${data.meta_percentual}%`,
                    position: 'top',
                    fill: '#000000',
                    fontSize: 12,
                    fontWeight: 600,
                    offset: 8
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Legenda abaixo do gráfico */}
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-600" />
                <span className="text-sm text-gray-700">No Prazo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500" />
                <span className="text-sm text-gray-700">Vencido</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela: Chamados Violados */}
      <div className="mb-5">
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666', minHeight: '528px' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">CHAMADOS VIOLADOS</CardTitle>
              {data.chamados_violados.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Nenhum chamado violado no período
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.chamados_violados.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <CheckCircle2 className="h-20 w-20 text-blue-600 mx-auto mb-6" />
                <p className="text-lg text-gray-600 font-medium mb-3">
                  Nenhum chamado violado
                </p>
                <p className="text-base text-gray-500">
                  Todos os chamados estão dentro do prazo estabelecido
                </p>
              </div>
            </div>
          ) : (
            <div style={{ borderRadius: '35.5px', overflow: 'hidden' }}>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-center font-semibold text-white" style={{ backgroundColor: '#666666' }}>CHAMADO</TableHead>
                    <TableHead className="text-center font-semibold text-white" style={{ backgroundColor: '#666666' }}>TIPO</TableHead>
                    <TableHead className="text-center font-semibold text-white" style={{ backgroundColor: '#666666' }}>ABERTURA</TableHead>
                    <TableHead className="text-center font-semibold text-white" style={{ backgroundColor: '#666666' }}>SOLUÇÃO</TableHead>
                    <TableHead className="text-center font-semibold text-white" style={{ backgroundColor: '#666666' }}>GRUPO</TableHead>
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
            </div>
          )}
        </CardContent>
      </Card>
      </div>
      </div>
    </div>
  );
}
