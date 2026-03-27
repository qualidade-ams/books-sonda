/**
 * BookBacklog - Componente de Backlog
 * Exibe análise detalhada de pendências e envelhecimento de chamados
 */

import { FileText, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
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
  empresaNome?: string;
}

export default function BookBacklog({ data, empresaNome }: BookBacklogProps) {
  const { data: mappingMap, isLoading: isLoadingMapping } = useGrupoBookMapping();
  
  const distribuicaoPorGrupoMapeada = useMemo(() => {
    if (!mappingMap || isLoadingMapping) {
      return data.distribuicao_por_grupo;
    }
    return mapearMultiplosGrupos(data.distribuicao_por_grupo, mappingMap);
  }, [data.distribuicao_por_grupo, mappingMap, isLoadingMapping]);
  
  const backlogPorCausaMapeado = useMemo(() => {
    if (!mappingMap || isLoadingMapping) {
      return data.backlog_por_causa;
    }
    return data.backlog_por_causa.map(item => {
      const grupoMapeado = mappingMap.get(item.origem);
      if (grupoMapeado) {
        return { ...item, origem: grupoMapeado };
      }
      return item;
    });
  }, [data.backlog_por_causa, mappingMap, isLoadingMapping]);

  return (
    <div className="w-full h-full bg-white p-8">
      <div className="space-y-6">
      {/* Título da Seção */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Backlog {empresaNome ? <span className="text-blue-600">{empresaNome}</span> : ''}
        </h2>
        <p className="text-sm text-gray-500">Visão detalhada de pendências e envelhecimento de chamados</p>
      </div>

      {/* Layout principal: Grid 4 colunas - Conteúdo esquerdo (3 cols) + CHAMADOS | GRUPO (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Coluna esquerda: Cards + Gráfico + Tabela (3 colunas) */}
        <div className="lg:col-span-3 space-y-4">
          {/* 3 Cards de métricas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* TOTAL */}
            <Card className="border-2 min-h-[180px]" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2 whitespace-nowrap">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-gray-600" />
                  </div>
                  TOTAL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-black">{data.total}</div>
                <div className="text-xs text-gray-500 mt-1">Pendentes de atuação</div>
              </CardContent>
            </Card>

            {/* INCIDENTE */}
            <Card className="border-2 min-h-[180px]" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>
                  INCIDENTE
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-black">{data.incidente}</div>
              </CardContent>
            </Card>

            {/* SOLICITAÇÃO */}
            <Card className="border-2 min-h-[180px]" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  SOLICITAÇÃO
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-black">{data.solicitacao}</div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico: Aging dos Chamados */}
          <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Aging dos Chamados</CardTitle>
              <p className="text-xs text-gray-500">Distribuição por faixa de envelhecimento</p>
            </CardHeader>
            <CardContent>
              {data.aging_chamados && data.aging_chamados.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.aging_chamados}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="faixa" 
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
                      dataKey="incidente" 
                      fill="#666666" 
                      name="INCIDENTE"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList 
                        dataKey="incidente" 
                        position="inside" 
                        style={{ fill: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        formatter={(value: number) => value > 0 ? value : ''}
                      />
                    </Bar>
                    <Bar 
                      dataKey="solicitacao" 
                      fill="#2563eb" 
                      name="SOLICITAÇÃO"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList 
                        dataKey="solicitacao" 
                        position="inside" 
                        style={{ fill: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        formatter={(value: number) => value > 0 ? value : ''}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Nenhum dado disponível</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabela: Backlog Atualizado X CAUSA */}
          <Card className="border-2 flex flex-col" style={{ borderRadius: '35.5px', borderColor: '#666666', minHeight: '500px' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Backlog Atualizado X CAUSA</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 flex-1 flex flex-col">
              <div style={{ borderRadius: '15.5px', overflow: 'hidden' }} className="flex-1 flex flex-col">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">ORIGEM</TableHead>
                      <TableHead className="text-center font-semibold text-white" style={{ backgroundColor: '#666666' }}>INCIDENTE</TableHead>
                      <TableHead className="text-center font-semibold text-white" style={{ backgroundColor: '#666666' }}>SOLICITAÇÃO</TableHead>
                      <TableHead className="text-center font-semibold bg-blue-600 text-white">TOTAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(backlogPorCausaMapeado && backlogPorCausaMapeado.length > 0) ? (
                      <>
                        {(() => {
                          const maxOrigens = 8;
                          let linhasExibir = backlogPorCausaMapeado;
                          let linhaOutros = null;
                          
                          if (backlogPorCausaMapeado.length > maxOrigens) {
                            linhasExibir = backlogPorCausaMapeado.slice(0, 7);
                            const outrasOrigens = backlogPorCausaMapeado.slice(7);
                            const outrosIncidente = outrasOrigens.reduce((sum, item) => sum + (item.incidente || 0), 0);
                            const outrosSolicitacao = outrasOrigens.reduce((sum, item) => sum + (item.solicitacao || 0), 0);
                            const outrosTotal = outrasOrigens.reduce((sum, item) => sum + item.total, 0);
                            linhaOutros = { origem: 'Outros', incidente: outrosIncidente, solicitacao: outrosSolicitacao, total: outrosTotal };
                          }
                          
                          // Calcular total de linhas (dados + outros + total)
                          const totalLinhas = linhasExibir.length + (linhaOutros ? 1 : 0) + 1;
                          // Se menos de 8 linhas, aumentar padding vertical moderadamente
                          const rowPadding = totalLinhas < 8 ? `${Math.max(8, Math.floor(120 / totalLinhas))}px` : '8px';
                          
                          return (
                            <>
                              {linhasExibir.map((item, index) => (
                                <TableRow key={index} className="hover:bg-gray-50">
                                  <TableCell className="font-medium" style={{ paddingTop: rowPadding, paddingBottom: rowPadding }}>{item.origem}</TableCell>
                                  <TableCell className="text-center" style={{ backgroundColor: '#e3f2fd', paddingTop: rowPadding, paddingBottom: rowPadding }}>{item.incidente || 0}</TableCell>
                                  <TableCell className="text-center" style={{ backgroundColor: '#e3f2fd', paddingTop: rowPadding, paddingBottom: rowPadding }}>{item.solicitacao || 0}</TableCell>
                                  <TableCell className="text-center bg-blue-50" style={{ paddingTop: rowPadding, paddingBottom: rowPadding }}>{item.total}</TableCell>
                                </TableRow>
                              ))}
                              {linhaOutros && (
                                <TableRow className="hover:bg-gray-50">
                                  <TableCell className="font-medium italic text-gray-600" style={{ paddingTop: rowPadding, paddingBottom: rowPadding }}>{linhaOutros.origem}</TableCell>
                                  <TableCell className="text-center" style={{ backgroundColor: '#e3f2fd', paddingTop: rowPadding, paddingBottom: rowPadding }}>{linhaOutros.incidente}</TableCell>
                                  <TableCell className="text-center" style={{ backgroundColor: '#e3f2fd', paddingTop: rowPadding, paddingBottom: rowPadding }}>{linhaOutros.solicitacao}</TableCell>
                                  <TableCell className="text-center bg-blue-50" style={{ paddingTop: rowPadding, paddingBottom: rowPadding }}>{linhaOutros.total}</TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })()}
                        <TableRow className="font-bold" style={{ backgroundColor: '#666666', color: 'white' }}>
                          <TableCell className="py-2" style={{ borderBottomLeftRadius: '15.5px' }}>TOTAL</TableCell>
                          <TableCell className="text-center py-2">
                            {backlogPorCausaMapeado.reduce((sum, item) => sum + (item.incidente || 0), 0)}
                          </TableCell>
                          <TableCell className="text-center py-2">
                            {backlogPorCausaMapeado.reduce((sum, item) => sum + (item.solicitacao || 0), 0)}
                          </TableCell>
                          <TableCell className="text-center py-2" style={{ borderBottomRightRadius: '15.5px' }}>
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

        {/* Coluna direita: Card CHAMADOS | GRUPO (1 coluna, estica até o final) */}
        <div className="lg:col-span-1">
          <Card className="border-2 h-full" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold">CHAMADOS | GRUPO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {distribuicaoPorGrupoMapeada && distribuicaoPorGrupoMapeada.length > 0 ? (
                (() => {
                  const maxGrupos = 20;
                  const gruposExibir = distribuicaoPorGrupoMapeada.slice(0, maxGrupos);
                  const temMaisGrupos = distribuicaoPorGrupoMapeada.length > maxGrupos;
                  const gruposRestantes = distribuicaoPorGrupoMapeada.length - maxGrupos;
                  
                  return (
                    <>
                      {gruposExibir.map((grupo, index) => (
                        <div key={index} className="pb-1.5 border-b last:border-b-0 last:pb-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-semibold text-[10px] leading-tight">{grupo.grupo}</div>
                            <div className="text-[9px] text-gray-500 whitespace-nowrap">Total: {grupo.total}</div>
                          </div>
                          <div className="bg-blue-600 rounded px-2 py-0.5 flex items-center gap-1 transition-all duration-300">
                            <span className="text-sm text-white font-bold leading-tight">{grupo.total}</span>
                            <span className="text-[9px] text-white/90 font-semibold leading-tight ml-auto">{grupo.percentual}%</span>
                          </div>
                        </div>
                      ))}
                      
                      {temMaisGrupos && (
                        <div className="pt-2 mt-2 border-t border-gray-200">
                          <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                            <p className="text-[10px] text-gray-600 font-medium">
                              + {gruposRestantes} {gruposRestantes === 1 ? 'grupo adicional' : 'grupos adicionais'}
                            </p>
                            <p className="text-[9px] text-gray-500 mt-0.5">
                              Exibindo os {maxGrupos} primeiros grupos
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Nenhum grupo encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      </div>
    </div>
  );
}
