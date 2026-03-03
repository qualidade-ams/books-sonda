/**
 * BookBacklog - Componente de Backlog
 * Exibe análise detalhada de pendências e envelhecimento de chamados
 */

import { FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import type { BookBacklogData } from '@/types/books';
import { useGrupoBookMapping, mapearMultiplosGrupos } from '@/hooks/useGrupoBookMapping';
import { useMemo } from 'react';

interface BookBacklogProps {
  data: BookBacklogData;
  empresaNome?: string; // Nome abreviado do cliente
}

export default function BookBacklog({ data, empresaNome }: BookBacklogProps) {
  // Buscar mapeamento de categorias para grupos
  const { data: mappingMap, isLoading: isLoadingMapping } = useGrupoBookMapping();
  
  // Aplicar mapeamento aos dados de distribuição por grupo
  const distribuicaoPorGrupoMapeada = useMemo(() => {
    if (!mappingMap || isLoadingMapping) {
      console.log('⏳ [BookBacklog] Aguardando mapeamento...');
      return data.distribuicao_por_grupo;
    }
    
    console.log('🔄 [BookBacklog] Aplicando mapeamento aos grupos...');
    const mapeados = mapearMultiplosGrupos(data.distribuicao_por_grupo, mappingMap);
    console.log('✅ [BookBacklog] Grupos mapeados:', mapeados);
    return mapeados;
  }, [data.distribuicao_por_grupo, mappingMap, isLoadingMapping]);
  
  // Aplicar mapeamento aos dados de backlog por causa
  const backlogPorCausaMapeado = useMemo(() => {
    if (!mappingMap || isLoadingMapping) {
      return data.backlog_por_causa;
    }
    
    // Para backlog_por_causa, o campo é "origem" não "grupo"
    // Então vamos mapear apenas se a origem corresponder a uma categoria
    return data.backlog_por_causa.map(item => {
      const grupoMapeado = mappingMap.get(item.origem);
      if (grupoMapeado) {
        console.log(`📧 [BookBacklog] Mapeando origem "${item.origem}" → "${grupoMapeado}"`);
        return { ...item, origem: grupoMapeado };
      }
      return item;
    });
  }, [data.backlog_por_causa, mappingMap, isLoadingMapping]);
  
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
    <div className="w-full h-full bg-white p-8">
      <div className="space-y-4">
      {/* Título da Seção */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Backlog {empresaNome ? <span className="text-blue-600">{empresaNome}</span> : ''}
        </h2>
        <p className="text-sm text-gray-500">Visão detalhada de pendências e envelhecimento de chamados</p>
      </div>

      {/* Cards de Métricas - COMPACTOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#0d6abf' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              TOTAL
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-5xl font-bold text-black">{data.total}</div>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#0d6abf' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              INCIDENTE
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-5xl font-bold text-black">{data.incidente}</div>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#0d6abf' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              SOLICITAÇÃO
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-5xl font-bold text-black">{data.solicitacao}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico e Card Lateral - COMPACTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico: Aging dos Chamados - OTIMIZADO */}
        <Card className="lg:col-span-2 border-2" style={{ borderRadius: '35.5px', borderColor: '#0d6abf' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Aging dos Chamados</CardTitle>
            <div className="flex items-center gap-4 text-xs mt-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#2563eb' }} />
                <span>Solicitação</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0d6abf' }} />
                <span>Incidente</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.aging_chamados}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="faixa" 
                  tick={{ fontSize: 11 }}
                  stroke="#666"
                  angle={-15}
                  textAnchor="end"
                  height={70}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  stroke="#666"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px' }}
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
                  fill="#0d6abf" 
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

        {/* Card: Distribuição por Grupo - COMPACTO */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#0d6abf' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold">CHAMADOS | GRUPO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {distribuicaoPorGrupoMapeada && distribuicaoPorGrupoMapeada.length > 0 ? (
              distribuicaoPorGrupoMapeada.map((grupo, index) => {
                // Calcular largura proporcional da barra
                const maxTotal = Math.max(...distribuicaoPorGrupoMapeada.map(g => g.total));
                const barWidth = maxTotal > 0 ? (grupo.total / maxTotal) * 100 : 0;
                
                return (
                  <div key={index} className="pb-2 border-b last:border-b-0 last:pb-0">
                    {/* Nome e Total na mesma linha */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-semibold text-xs leading-tight">{grupo.grupo}</div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">Total: {grupo.total}</div>
                    </div>
                    
                    {/* Barra horizontal com largura proporcional */}
                    <div 
                      className="bg-[#0d6abf] rounded px-3 py-2 flex justify-between items-center transition-all duration-300"
                      style={{ width: `${barWidth}%`, minWidth: '70px' }}
                    >
                      <span className="text-base text-white font-bold leading-tight">{grupo.total}</span>
                      <span className="text-xs text-white/90 font-semibold leading-tight">{grupo.percentual}%</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Nenhum grupo encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela: Backlog Atualizado X CAUSA - COMPACTA */}
      <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#0d6abf' }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Backlog Atualizado X CAUSA</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ borderRadius: '35.5px', overflow: 'hidden' }}>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-sm py-1.5">ORIGEM</TableHead>
                  <TableHead className="text-center font-semibold text-sm py-1.5">INCIDENTE</TableHead>
                  <TableHead className="text-center font-semibold text-sm py-1.5">SOLICITAÇÃO</TableHead>
                  <TableHead className="text-center font-semibold text-sm text-white py-1.5" style={{ backgroundColor: '#0d6abf' }}>TOTAL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(backlogPorCausaMapeado && backlogPorCausaMapeado.length > 0) ? (
                  <>
                    {backlogPorCausaMapeado.map((item, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-sm py-1.5">{item.origem}</TableCell>
                        <TableCell className="text-center text-sm py-1.5">{item.incidente || '-'}</TableCell>
                        <TableCell className="text-center text-sm py-1.5">{item.solicitacao || '-'}</TableCell>
                        <TableCell className="text-center font-semibold text-sm py-1.5">{item.total}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold hover:bg-blue-600" style={{ backgroundColor: '#0d6abf', color: 'white' }}>
                      <TableCell className="text-sm py-1.5">TOTAL</TableCell>
                      <TableCell className="text-center text-sm py-1.5">
                        {backlogPorCausaMapeado.reduce((sum, item) => sum + item.incidente, 0)}
                      </TableCell>
                      <TableCell className="text-center text-sm py-1.5">
                        {backlogPorCausaMapeado.reduce((sum, item) => sum + item.solicitacao, 0)}
                      </TableCell>
                      <TableCell className="text-center text-sm py-1.5">
                        {backlogPorCausaMapeado.reduce((sum, item) => sum + item.total, 0)}
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
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
