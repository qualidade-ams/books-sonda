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
import { useGrupoBookMapping, mapearMultiplosGrupos } from '@/hooks/useGrupoBookMapping';
import { useMemo } from 'react';

interface BookVolumetriaProps {
  data: BookVolumetriaData;
  empresaNome?: string; // Nome abreviado do cliente
  mes?: number; // Mês atual para exibir no subtítulo
  ano?: number; // Ano atual para exibir no subtítulo
}

export default function BookVolumetria({ data, empresaNome, mes, ano }: BookVolumetriaProps) {
  // Buscar mapeamento de categorias para grupos
  const { data: mappingMap, isLoading: isLoadingMapping } = useGrupoBookMapping();
  
  // Aplicar mapeamento aos dados de grupos
  const chamadosPorGrupoMapeados = useMemo(() => {
    if (!mappingMap || isLoadingMapping) {
      console.log('⏳ [BookVolumetria] Aguardando mapeamento...');
      return data.chamados_por_grupo;
    }
    
    console.log('🔄 [BookVolumetria] Aplicando mapeamento aos grupos...');
    const mapeados = mapearMultiplosGrupos(data.chamados_por_grupo, mappingMap);
    console.log('✅ [BookVolumetria] Grupos mapeados:', mapeados);
    return mapeados;
  }, [data.chamados_por_grupo, mappingMap, isLoadingMapping]);
  
  const backlogPorCausaMapeado = useMemo(() => {
    if (!mappingMap || isLoadingMapping) {
      return data.backlog_por_causa;
    }
    
    // Para backlog_por_causa, o campo é "origem" não "grupo"
    // Então vamos mapear apenas se a origem corresponder a uma categoria
    return data.backlog_por_causa.map(item => {
      const grupoMapeado = mappingMap.get(item.origem);
      if (grupoMapeado) {
        console.log(`📧 [BookVolumetria] Mapeando origem "${item.origem}" → "${grupoMapeado}"`);
        return { ...item, origem: grupoMapeado };
      }
      return item;
    });
  }, [data.backlog_por_causa, mappingMap, isLoadingMapping]);
  
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
    <div className="w-full h-full bg-white p-8">
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
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2 whitespace-nowrap">
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-gray-600" />
              </div>
              ABERTOS | MÊS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-4xl font-bold text-black">{data.abertos_mes.solicitacao}</span>
                <span className="text-ls text-black">SOLICITAÇÃO</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-4xl font-bold text-black">{data.abertos_mes.incidente}</span>
                <span className="text-ls text-black">INCIDENTE</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fechados | Mês */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-black" />
              </div>
              FECHADOS | MÊS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-4xl font-bold text-black">{data.fechados_mes.solicitacao}</span>
                <span className="text-ls text-black">SOLICITAÇÃO</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-4xl font-bold text-black">{data.fechados_mes.incidente}</span>
                <span className="text-ls text-black">INCIDENTE</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SLA Médio */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
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
            {data.sla_medio_variacao !== undefined && data.sla_medio_variacao !== 0 && (
              <div className={`text-xs mt-1 font-medium ${
                data.sla_medio_variacao > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {data.sla_medio_variacao > 0 ? '↑' : '↓'} {data.sla_medio_variacao > 0 ? '+' : ''}{data.sla_medio_variacao.toFixed(1)}% vs mês ant.
              </div>
            )}
            {(data.sla_medio_variacao === undefined || data.sla_medio_variacao === 0) && (
              <div className="text-xs text-gray-500 mt-1">
                Sem variação
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Backlog */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
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

      {/* Layout: Coluna esquerda (gráfico + tabela) e direita (card lateral) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda: Gráfico + Tabela */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gráfico: Chamados | Semestre */}
          <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
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
                      fill="#666666" 
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

          {/* Tabela: Chamados X CAUSA */}
          <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Chamados X CAUSA</CardTitle>           
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div style={{ borderRadius: '35.5px', overflow: 'hidden' }}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">ORIGEM</TableHead>
                      <TableHead className="text-center font-semibold text-white" style={{ backgroundColor: '#666666' }}>ABERTOS</TableHead>
                      <TableHead className="text-center font-semibold bg-blue-600 text-white">FECHADOS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Se houver mais de 6 origens, mostrar apenas as 5 primeiras e agrupar o resto em "Outros"
                      const maxOrigens = 6;
                      let linhasExibir = backlogPorCausaMapeado;
                      let linhaOutros = null;
                      
                      if (backlogPorCausaMapeado.length > maxOrigens) {
                        // Pegar as 5 primeiras origens
                        linhasExibir = backlogPorCausaMapeado.slice(0, 5);
                        
                        // Agrupar as demais em "Outros"
                        const outrasOrigens = backlogPorCausaMapeado.slice(5);
                        const outrosAbertos = outrasOrigens.reduce((sum, item) => sum + (item.abertos || 0), 0);
                        const outrosFechados = outrasOrigens.reduce((sum, item) => sum + (item.fechados || 0), 0);
                        
                        linhaOutros = {
                          origem: 'Outros',
                          abertos: outrosAbertos,
                          fechados: outrosFechados
                        };
                      }
                      
                      return (
                        <>
                          {linhasExibir.map((item, index) => (
                            <TableRow key={index} className="hover:bg-gray-50">
                              <TableCell className="font-medium py-2">{item.origem}</TableCell>
                              <TableCell className="text-center py-2" style={{ backgroundColor: '#e3f2fd' }}>{item.abertos || 0}</TableCell>
                              <TableCell className="text-center bg-blue-50 py-2">{item.fechados || 0}</TableCell>
                            </TableRow>
                          ))}
                          {linhaOutros && (
                            <TableRow className="hover:bg-gray-50">
                              <TableCell className="font-medium py-2 italic text-gray-600">{linhaOutros.origem}</TableCell>
                              <TableCell className="text-center py-2" style={{ backgroundColor: '#e3f2fd' }}>{linhaOutros.abertos}</TableCell>
                              <TableCell className="text-center bg-blue-50 py-2">{linhaOutros.fechados}</TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })()}
                    <TableRow className="font-bold hover:bg-blue-600" style={{ backgroundColor: '#666666', color: 'white' }}>
                      <TableCell className="py-2">TOTAL</TableCell>
                      <TableCell className="text-center py-2">
                        {backlogPorCausaMapeado.reduce((sum, item) => sum + (item.abertos || 0), 0)}
                      </TableCell>
                      <TableCell className="text-center py-2">
                        {backlogPorCausaMapeado.reduce((sum, item) => sum + (item.fechados || 0), 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna direita: Card lateral (altura total) */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold">CHAMADOS | GRUPO | MÊS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(() => {
              const maxGrupos = 8;
              const gruposExibir = chamadosPorGrupoMapeados.slice(0, maxGrupos);
              const temMaisGrupos = chamadosPorGrupoMapeados.length > maxGrupos;
              const gruposRestantes = chamadosPorGrupoMapeados.length - maxGrupos;
              
              return (
                <>
                  {gruposExibir.map((grupo, index) => {
                    // Calcular largura proporcional das barras
                    const maxValue = Math.max(grupo.abertos, grupo.fechados);
                    const abertosWidth = maxValue > 0 ? (grupo.abertos / maxValue) * 100 : 0;
                    const fechadosWidth = maxValue > 0 ? (grupo.fechados / maxValue) * 100 : 0;
                    
                    return (
                      <div key={index} className="pb-1.5 border-b last:border-b-0 last:pb-0">
                        {/* Nome e Total na mesma linha - mais compacto */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold text-[10px] leading-tight">{grupo.grupo}</div>
                          <div className="text-[9px] text-gray-500 whitespace-nowrap">Total: {grupo.total}</div>
                        </div>
                        
                        {/* Barras horizontais empilhadas com largura proporcional */}
                        <div className="flex flex-col gap-1">
                          <div 
                            className="bg-[#666666] rounded px-2 py-0.5 flex justify-between items-center gap-2 transition-all duration-300"
                            style={{ width: `${abertosWidth}%`, minWidth: '80px' }}
                          >
                            <span className="text-sm text-white font-bold leading-tight">{grupo.abertos}</span>
                            <span className="text-[9px] text-white/90 font-semibold leading-tight">ABERTOS</span>
                          </div>
                          <div 
                            className="bg-blue-600 rounded px-2 py-0.5 flex justify-between items-center gap-2 transition-all duration-300"
                            style={{ width: `${fechadosWidth}%`, minWidth: '80px' }}
                          >
                            <span className="text-sm text-white font-bold leading-tight">{grupo.fechados}</span>
                            <span className="text-[9px] text-white/90 font-semibold leading-tight">FECHADOS</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Mensagem quando há mais grupos */}
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
            })()}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
