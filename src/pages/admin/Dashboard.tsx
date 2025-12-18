import { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { StatCard } from '@/components/admin/dashboard/StatCard';
import { ModernChart } from '@/components/admin/dashboard/ModernChart';
import { DashboardGrid } from '@/components/admin/dashboard/DashboardGrid';
import { DashboardLoading } from '@/components/admin/dashboard/DashboardLoading';
import { EmptyState } from '@/components/admin/dashboard/EmptyState';
import { useRequerimentos } from '@/hooks/useRequerimentos';
import { useElogios, useEstatisticasElogios } from '@/hooks/useElogios';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  DollarSign, 
  Clock, 
  FileText, 
  BarChart3,
  PieChart,
  Ticket,
  TrendingUp,
  Award,
  Building2,
  Heart,
  Users,
  Calendar,
  Star,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { converterMinutosParaHoras, converterMinutosParaHorasDecimal } from '@/utils/horasUtils';
import { getHexColor } from '@/utils/requerimentosColors';
import type { TipoCobrancaType, ModuloType } from '@/types/requerimentos';
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

// Componente para as sub-abas de elogios
const ElogiosSubTabs = ({ statsElogios, anoSelecionado, elogios }: { 
  statsElogios: any; 
  anoSelecionado: number;
  elogios?: any[];
}) => {
  const [activeElogiosTab, setActiveElogiosTab] = useState<string>('visao-geral');

  const elogiosSubTabs = [
    { key: 'visao-geral', label: 'Visão Geral' },
    { key: 'mapeamento', label: 'Mapeamento' },
    { key: 'volume', label: 'Volume' },
    { key: 'motivos', label: 'Motivos' },
    { key: 'pesquisas', label: 'Pesquisas' }
  ];

  return (
    <div className="space-y-6">
      {/* Sub-abas */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-full">
        {elogiosSubTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveElogiosTab(tab.key)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              activeElogiosTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das sub-abas */}
      {activeElogiosTab === 'visao-geral' && (
        <VisaoGeralElogios statsElogios={statsElogios} anoSelecionado={anoSelecionado} elogios={elogios} />
      )}
      
      {activeElogiosTab === 'mapeamento' && (
        <MapeamentoElogios statsElogios={statsElogios} anoSelecionado={anoSelecionado} />
      )}
      
      {activeElogiosTab === 'volume' && (
        <VolumeElogios statsElogios={statsElogios} anoSelecionado={anoSelecionado} />
      )}
      
      {activeElogiosTab === 'motivos' && (
        <MotivosElogios statsElogios={statsElogios} anoSelecionado={anoSelecionado} />
      )}
      
      {activeElogiosTab === 'pesquisas' && (
        <PesquisasElogios statsElogios={statsElogios} anoSelecionado={anoSelecionado} />
      )}
    </div>
  );
};

// Componente Visão Geral
const VisaoGeralElogios = ({ statsElogios, anoSelecionado, elogios }: { 
  statsElogios: any; 
  anoSelecionado: number;
  elogios?: any[];
}) => {
  const [empresasExpandido, setEmpresasExpandido] = useState(false);
  const [colaboradoresExpandido, setColaboradoresExpandido] = useState(false);
  const [elogiosExpandido, setElogiosExpandido] = useState(false);
  return (
    <div className="space-y-6">
      {/* Cards principais sem cor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Elogios Processados</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{statsElogios?.total || 0}</p>
              </div>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Heart className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Validados</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{statsElogios?.compartilhados || 0}</p>
              </div>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Enviados por Email</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{statsElogios?.enviados || 0}</p>
              </div>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Star className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Satisfação Média</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {statsElogios?.satisfacaoMedia ? `${(Math.floor(statsElogios.satisfacaoMedia * 10) / 10).toFixed(1)}/5` : 'N/A'}
                </p>
              </div>
            </div>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Building2 className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume de Elogios por Mês */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-lg font-semibold">Volume de Elogios</CardTitle>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Evolução mensal no ano {anoSelecionado}
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={statsElogios?.porMes || []}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient id="colorValidados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorEnviados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="mesNome" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'compartilhados') return [value, 'Validados'];
                      if (name === 'enviados') return [value, 'Enviados'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="compartilhados"
                    stackId="1"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValidados)"
                  />
                  <Area
                    type="monotone"
                    dataKey="enviados"
                    stackId="1"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorEnviados)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legenda com totais */}
            <div className="flex items-center justify-between text-sm mt-4 pt-4 border-t">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Validados: {statsElogios?.compartilhados || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Enviados: {statsElogios?.enviados || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Destaques */}
        <div className="space-y-4">
          {/* Top Colaborador Mensal */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                {(() => {
                  // Calcular colaborador com mais elogios no mês atual
                  const mesAtual = new Date().getMonth() + 1;
                  const anoAtual = new Date().getFullYear();
                  
                  const elogiosMesAtual = elogios?.filter(e => {
                    if (!e.data_resposta) return false;
                    const dataResposta = new Date(e.data_resposta);
                    return dataResposta.getMonth() + 1 === mesAtual && 
                           dataResposta.getFullYear() === anoAtual &&
                           (e.status === 'compartilhado' || e.status === 'enviado');
                  }) || [];

                  // Contar elogios por prestador
                  const contagemPorPrestador: Record<string, number> = {};
                  elogiosMesAtual.forEach(elogio => {
                    const prestador = elogio.pesquisa?.prestador || 'Sem nome';
                    contagemPorPrestador[prestador] = (contagemPorPrestador[prestador] || 0) + 1;
                  });

                  // Encontrar o top colaborador
                  const topColaborador = Object.entries(contagemPorPrestador)
                    .sort((a, b) => b[1] - a[1])[0];

                  if (!topColaborador) {
                    return (
                      <>
                        <div>
                          <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Top Colaborador</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">-</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Nenhum elogio este mês</p>
                        </div>
                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                          <Star className="h-4 w-4 text-green-600" />
                        </div>
                      </>
                    );
                  }

                  const [nome, quantidade] = topColaborador;

                  return (
                    <>
                      <div>
                        <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Top Colaborador Mês</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white mt-1 uppercase">{nome}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{quantidade} {quantidade === 1 ? 'Elogio' : 'Elogios'} este mês</p>
                      </div>
                      <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                        <Star className="h-4 w-4 text-green-600 fill-green-600" />
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardHeader>
          </Card>

          {/* Maior Crescimento */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Maior Crescimento</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">SUPORTE TÉCNICO</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">+45% vs mês anterior</p>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Seção inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Empresas com Elogios */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-orange-600" />
                <CardTitle className="text-sm font-semibold">Top Empresas com Elogios</CardTitle>
              </div>
              {statsElogios?.porEmpresa && Object.keys(statsElogios.porEmpresa).length > 5 && (
                <button
                  onClick={() => setEmpresasExpandido(!empresasExpandido)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {empresasExpandido ? (
                    <>
                      <span>Recolher</span>
                      <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      <span>Ver todas</span>
                      <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`space-y-4 ${empresasExpandido ? 'max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800' : ''}`}>
              {statsElogios?.porEmpresa && Object.entries(statsElogios.porEmpresa)
                .sort((a, b) => (b[1] as any).count - (a[1] as any).count)
                .slice(0, empresasExpandido ? undefined : 5)
                .map(([empresa, dados], index) => {
                  const dadosTyped = dados as { count: number; registrados: number; compartilhados: number; enviados: number; arquivados: number };
                  const porcentagem = statsElogios.total > 0 ? ((dadosTyped.count / statsElogios.total) * 100) : 0;
                  
                  // Cores variadas para as barras
                  const coresBarras = [
                    'from-blue-500 to-blue-600',
                    'from-green-500 to-green-600',
                    'from-purple-500 to-purple-600',
                    'from-orange-500 to-orange-600',
                    'from-red-500 to-red-600'
                  ];
                  const corBarra = coresBarras[index % coresBarras.length];
                  
                  return (
                    <div key={empresa} className="space-y-1.5">
                      {/* Linha superior: nome da empresa e valores */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[180px]">
                          {empresa}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{dadosTyped.count}</span>
                          <span className="text-xs text-gray-500">({porcentagem.toFixed(1)}%)</span>
                        </div>
                      </div>
                      
                      {/* Barra de progresso colorida */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`bg-gradient-to-r ${corBarra} h-full rounded-full transition-all duration-500 ease-out`}
                          style={{ width: `${porcentagem}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              }
              {(!statsElogios?.porEmpresa || Object.keys(statsElogios.porEmpresa).length === 0) && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Nenhum dado disponível
                </div>
              )}
            </div>
            
            {/* Indicador de scroll quando expandido */}
            {empresasExpandido && statsElogios?.porEmpresa && Object.keys(statsElogios.porEmpresa).length > 8 && (
              <div className="text-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-400">Role para ver mais empresas</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Colaborador Anual */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-green-600" />
                <CardTitle className="text-sm font-semibold text-green-600">TOP COLABORADOR ANUAL</CardTitle>
              </div>
              {(() => {
                const elogiosAno = elogios?.filter(e => {
                  if (!e.data_resposta) return false;
                  const dataResposta = new Date(e.data_resposta);
                  return dataResposta.getFullYear() === anoSelecionado &&
                         (e.status === 'compartilhado' || e.status === 'enviado');
                }) || [];
                const contagemPorPrestador: Record<string, number> = {};
                elogiosAno.forEach(elogio => {
                  const prestador = elogio.pesquisa?.prestador || 'Sem nome';
                  contagemPorPrestador[prestador] = (contagemPorPrestador[prestador] || 0) + 1;
                });
                const totalColaboradores = Object.keys(contagemPorPrestador).length;
                
                return totalColaboradores > 3 ? (
                  <button
                    onClick={() => setColaboradoresExpandido(!colaboradoresExpandido)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {colaboradoresExpandido ? (
                      <>
                        <span>Recolher</span>
                        <ChevronUp className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        <span>Ver todas</span>
                        <ChevronDown className="h-3 w-3" />
                      </>
                    )}
                  </button>
                ) : null;
              })()}
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              // Calcular colaboradores com mais elogios no ano selecionado
              const elogiosAno = elogios?.filter(e => {
                if (!e.data_resposta) return false;
                const dataResposta = new Date(e.data_resposta);
                return dataResposta.getFullYear() === anoSelecionado &&
                       (e.status === 'compartilhado' || e.status === 'enviado');
              }) || [];

              // Contar elogios por prestador
              const contagemPorPrestador: Record<string, number> = {};
              elogiosAno.forEach(elogio => {
                const prestador = elogio.pesquisa?.prestador || 'Sem nome';
                contagemPorPrestador[prestador] = (contagemPorPrestador[prestador] || 0) + 1;
              });

              // Pegar todos os colaboradores ordenados
              const todosColaboradores = Object.entries(contagemPorPrestador)
                .sort((a, b) => b[1] - a[1]);

              // Mostrar top 3 ou todos se expandido
              const colaboradoresExibir = colaboradoresExpandido 
                ? todosColaboradores 
                : todosColaboradores.slice(0, 3);

              if (colaboradoresExibir.length === 0) {
                return (
                  <div className="flex items-center justify-center h-24 text-gray-500 text-sm">
                    Nenhum elogio registrado este ano
                  </div>
                );
              }

              // Configuração das medalhas (apenas para top 3)
              const medalhas = [
                { bg: 'bg-yellow-100 dark:bg-yellow-900/30', icon: 'text-yellow-600 dark:text-yellow-400', emoji: '🥇' },
                { bg: 'bg-gray-200 dark:bg-gray-700', icon: 'text-gray-600 dark:text-gray-400', emoji: '🥈' },
                { bg: 'bg-orange-100 dark:bg-orange-900/30', icon: 'text-orange-600 dark:text-orange-400', emoji: '🥉' }
              ];

              return (
                <div className={`space-y-3 ${colaboradoresExpandido ? 'max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800' : ''}`}>
                  {colaboradoresExibir.map(([nome, quantidade], index) => {
                    const posicao = index + 1;
                    const temMedalha = posicao <= 3;
                    const medalha = temMedalha ? medalhas[index] : null;
                    
                    return (
                      <div key={nome} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <div className="flex items-center gap-3 flex-1">
                          {temMedalha ? (
                            <div className={`flex items-center justify-center w-10 h-10 ${medalha!.bg} rounded-full text-xl`}>
                              {medalha!.emoji}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full">
                              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{posicao}º</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase truncate">
                              {nome}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {quantidade} {quantidade === 1 ? 'Elogio' : 'Elogios'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            
            {/* Indicador de scroll quando expandido */}
            {colaboradoresExpandido && (() => {
              const elogiosAno = elogios?.filter(e => {
                if (!e.data_resposta) return false;
                const dataResposta = new Date(e.data_resposta);
                return dataResposta.getFullYear() === anoSelecionado &&
                       (e.status === 'compartilhado' || e.status === 'enviado');
              }) || [];
              const contagemPorPrestador: Record<string, number> = {};
              elogiosAno.forEach(elogio => {
                const prestador = elogio.pesquisa?.prestador || 'Sem nome';
                contagemPorPrestador[prestador] = (contagemPorPrestador[prestador] || 0) + 1;
              });
              return Object.keys(contagemPorPrestador).length > 5;
            })() && (
              <div className="text-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-400">Role para ver mais colaboradores</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimos Elogios */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <CardTitle className="text-sm font-semibold">Últimos Elogios</CardTitle>
              </div>
              {(() => {
                const todosElogios = elogios?.filter(e => 
                  e.pesquisa?.cliente && 
                  e.pesquisa?.comentario_pesquisa && 
                  e.data_resposta &&
                  (e.status === 'compartilhado' || e.status === 'enviado')
                ) || [];
                
                return todosElogios.length > 3 ? (
                  <button
                    onClick={() => setElogiosExpandido(!elogiosExpandido)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {elogiosExpandido ? (
                      <>
                        <span>Recolher</span>
                        <ChevronUp className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        <span>Ver todas</span>
                        <ChevronDown className="h-3 w-3" />
                      </>
                    )}
                  </button>
                ) : null;
              })()}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`space-y-4 ${elogiosExpandido ? 'max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800' : ''}`}>
              {(() => {
                // Filtrar elogios válidos e ordenar por data_resposta
                const todosElogiosRecentes = elogios
                  ?.filter(e => 
                    e.pesquisa?.cliente && 
                    e.pesquisa?.comentario_pesquisa && 
                    e.data_resposta &&
                    (e.status === 'compartilhado' || e.status === 'enviado')
                  )
                  .sort((a, b) => {
                    const dataA = a.data_resposta ? new Date(a.data_resposta).getTime() : 0;
                    const dataB = b.data_resposta ? new Date(b.data_resposta).getTime() : 0;
                    return dataB - dataA;
                  }) || [];

                // Mostrar 3 ou todos se expandido
                const elogiosRecentes = elogiosExpandido 
                  ? todosElogiosRecentes 
                  : todosElogiosRecentes.slice(0, 3);

                if (elogiosRecentes.length === 0) {
                  return (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      Nenhum elogio recente encontrado
                    </div>
                  );
                }

                const cores = [
                  { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
                  { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
                  { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
                  { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
                  { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400' },
                  { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' }
                ];

                return elogiosRecentes.map((elogio, index) => {
                  const cor = cores[index % cores.length];
                  const iniciais = elogio.pesquisa?.cliente
                    ?.split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || 'XX';
                  
                  const comentario = elogio.pesquisa?.comentario_pesquisa || '';
                  const comentarioTruncado = comentario.length > 60 
                    ? comentario.substring(0, 60) + '...' 
                    : comentario;
                  
                  const cliente = elogio.pesquisa?.cliente || 'Cliente';
                  const prestador = elogio.pesquisa?.prestador || 'Colaborador';
                  const empresa = elogio.pesquisa?.empresa || 'Empresa';
                  const dataFormatada = elogio.data_resposta 
                    ? new Date(elogio.data_resposta).toLocaleDateString('pt-BR')
                    : '';
                  
                  return (
                    <div key={elogio.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                      <div className={`w-10 h-10 ${cor.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <span className={`text-sm font-bold ${cor.text}`}>
                          {iniciais}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {cliente} elogiou {prestador}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 italic">
                          "{comentarioTruncado}"
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 uppercase">
                          {empresa} • {dataFormatada}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            
            {/* Indicador de scroll quando expandido */}
            {elogiosExpandido && (() => {
              const todosElogios = elogios?.filter(e => 
                e.pesquisa?.cliente && 
                e.pesquisa?.comentario_pesquisa && 
                e.data_resposta &&
                (e.status === 'compartilhado' || e.status === 'enviado')
              ) || [];
              return todosElogios.length > 6;
            })() && (
              <div className="text-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-400">Role para ver mais elogios</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Componente Mapeamento
const MapeamentoElogios = ({ statsElogios, anoSelecionado }: { 
  statsElogios: any; 
  anoSelecionado: number; 
}) => {
  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Destaque do Mês</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">Maria Silva</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">12 Elogios</p>
            </div>
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <Award className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Destaque do Ano</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">João Santos</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">45 Elogios</p>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Star className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Mapeado</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">86</p>
                <span className="text-xs font-medium text-green-600">+12 novos</span>
              </div>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Users className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Setor em Alta</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">Tecnologia</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Maior engajamento</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 - Mês Atual */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg font-semibold">Top 5 - Mês Atual</CardTitle>
              </div>
              <span className="text-xs text-gray-500">Janeiro 2025</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500">
              Gráfico de barras - Top 5 colaboradores do mês
            </div>
          </CardContent>
        </Card>

        {/* Top 5 - Acumulado do Ano */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg font-semibold">Top 5 - Acumulado do Ano</CardTitle>
              </div>
              <span className="text-xs text-gray-500">Ano 2025</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500">
              Gráfico de pizza - Top 5 colaboradores do ano
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Habilidades em Destaque */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-orange-600" />
              <CardTitle className="text-sm font-semibold">Habilidades em Destaque</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
              Gráfico de habilidades mais mencionadas
            </div>
          </CardContent>
        </Card>

        {/* Evolução dos Líderes */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <CardTitle className="text-sm font-semibold">Evolução dos Líderes (Últimos 6 meses)</CardTitle>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-blue-600">● Maria Silva</span>
                <span className="text-purple-600">● João Santos</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
              Gráfico de linha - Evolução dos líderes
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Componente Volume
const VolumeElogios = ({ statsElogios, anoSelecionado }: { 
  statsElogios: any; 
  anoSelecionado: number; 
}) => {
  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Elogios no Mês</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">128</p>
                <span className="text-xs font-medium text-blue-600">+12%</span>
              </div>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Acumulado Ano</p>
              <p className="text-2xl font-bold">1,452</p>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Calendar className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Pessoas Elogiadas</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">86</p>
                <span className="text-xs font-medium text-orange-600">+5</span>
              </div>
            </div>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Users className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Equipes Citadas</p>
              <p className="text-2xl font-bold">14</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Building2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução de Pessoas Elogiadas */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg font-semibold">Evolução de Pessoas Elogiadas</CardTitle>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-blue-600">● 2024</span>
                <span className="text-gray-400">● 2023</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Comparativo de volume mensal (Últimos 12 meses)
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500">
              Gráfico de linha - Evolução mensal
            </div>
          </CardContent>
        </Card>

        {/* Distribuição por Setor */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg font-semibold">Distribuição por Setor</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Fiscal</span>
                </div>
                <span className="text-sm font-medium">62%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm">Comex</span>
                </div>
                <span className="text-sm font-medium">38%</span>
              </div>
              <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
                Gráfico de pizza - Distribuição por setor
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Equipes Elogiadas */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-orange-600" />
                <CardTitle className="text-sm font-semibold">Top Equipes Elogiadas</CardTitle>
              </div>
              <div className="flex gap-2">
                <button className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">Mês</button>
                <button className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Ano</button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Fiscal</span>
                </div>
                <span className="text-xs font-medium">● Comex</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Clientes (Volume) */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                <CardTitle className="text-sm font-semibold">Top Clientes (Volume)</CardTitle>
              </div>
              <div className="flex gap-2">
                <button className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">Mês</button>
                <button className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Ano</button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
              Gráfico de barras - Top clientes por volume
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Componente Motivos
const MotivosElogios = ({ statsElogios, anoSelecionado }: { 
  statsElogios: any; 
  anoSelecionado: number; 
}) => {
  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Elogios Totais</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">128</p>
                <span className="text-xs font-medium text-blue-600">+8%</span>
              </div>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Heart className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Colaboradores Citados</p>
              <p className="text-2xl font-bold">42</p>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Satisfação Média</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">4.9/5</p>
                <span className="text-xs font-medium text-green-600">+0.2</span>
              </div>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Star className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Canais Externos</p>
              <p className="text-2xl font-bold">15</p>
            </div>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Building2 className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Gráfico principal */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg font-semibold">Motivos do Elogio</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-gray-500">
            Gráfico de pizza - Distribuição dos motivos de elogios
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente Pesquisas
const PesquisasElogios = ({ statsElogios, anoSelecionado }: { 
  statsElogios: any; 
  anoSelecionado: number; 
}) => {
  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Pesquisas Efetuadas</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">1,248</p>
                <span className="text-xs font-medium text-blue-600">+4%</span>
              </div>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Respostas Recebidas</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">892</p>
                <span className="text-xs font-medium text-purple-600">+12%</span>
              </div>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Taxa de Resposta</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">71.5%</p>
                <span className="text-xs font-medium text-green-600">+4.4%</span>
              </div>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <BarChart3 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">NPS Geral</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">+74</p>
                <span className="text-xs font-medium text-orange-600">Excelente</span>
              </div>
            </div>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Star className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engajamento por Equipe */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg font-semibold">Engajamento por Equipe</CardTitle>
              </div>
              <div className="flex gap-2">
                <span className="text-xs text-blue-600">Enviadas</span>
                <span className="text-xs text-green-600">Respondidas</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Comparativo Fiscal vs Comex (Enviadas e Respondidas)
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500">
              Gráfico de barras - Engajamento por equipe
            </div>
          </CardContent>
        </Card>

        {/* Termômetro de Satisfação */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg font-semibold">Termômetro de Satisfação</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900 dark:text-white">4.8</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">MÉDIA / 5.0</div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-red-500">Insatisfeito</span>
                  <span className="text-xs text-gray-500">0-2</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Neutro</span>
                  <span className="text-xs text-gray-500">3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-500">Satisfeito</span>
                  <span className="text-xs text-gray-500">4-5</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Taxa de Resposta Mensal */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <CardTitle className="text-sm font-semibold">Taxa de Resposta Mensal</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
              Gráfico de linha - Taxa de resposta mensal
            </div>
          </CardContent>
        </Card>

        {/* Feedbacks Recentes */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <CardTitle className="text-sm font-semibold">Feedbacks Recentes</CardTitle>
              </div>
              <button className="text-xs text-blue-600 hover:underline">Ver todos</button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">EF</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium">Equipe Fiscal</p>
                  <p className="text-xs text-gray-500">"O processo de desembaraço foi surpreendentemente rápido. Parabéns à equipe!"</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-green-600">EC</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium">Equipe Comex</p>
                  <p className="text-xs text-gray-500">"Atendimento cordial, mas ainda falta de atualizações proativas sobre o status."</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3].map(i => (
                      <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ))}
                    {[4,5].map(i => (
                      <Star key={i} className="h-3 w-3 text-gray-300" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-purple-600">EF</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium">Equipe Fiscal</p>
                  <p className="text-xs text-gray-500">"Excelente suporte técnico na resolução da pendência tributária."</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  const [anoSelecionado, setAnoSelecionado] = useState(currentYear);
  const [filtroModulo, setFiltroModulo] = useState<ModuloType | 'todos'>('todos');
  const [activeTab, setActiveTab] = useState<string>('');
  const [topFaturamentoMode, setTopFaturamentoMode] = useState<'faturamento' | 'banco_horas'>('faturamento');
  const [evolucaoMensalMode, setEvolucaoMensalMode] = useState<'requerimentos' | 'faturamento'>('requerimentos');

  // Hooks de permissões
  const { hasPermission } = usePermissions();

  // Buscar dados de requerimentos - buscar TODOS sem filtro
  const { data: requerimentos, isLoading: loadingRequerimentos } = useRequerimentos();
  
  // Buscar dados de elogios
  const { data: elogios, isLoading: loadingElogios } = useElogios();
  
  // Buscar estatísticas de elogios para o ano selecionado
  const { data: estatisticasElogios } = useEstatisticasElogios({
    ano: anoSelecionado
  });

  // Definir abas disponíveis baseadas nas permissões
  const availableTabs = useMemo(() => {
    const tabs = [];
    
    if (hasPermission('lancar_requerimentos', 'view') || hasPermission('faturar_requerimentos', 'view')) {
      tabs.push({
        key: 'requerimentos',
        label: 'Requerimentos',
        icon: FileText,
        screenKeys: ['lancar_requerimentos', 'faturar_requerimentos']
      });
    }
    
    if (hasPermission('lancar_pesquisas', 'view') || hasPermission('enviar_pesquisas', 'view')) {
      tabs.push({
        key: 'elogios',
        label: 'Elogios',
        icon: Heart,
        screenKeys: ['lancar_pesquisas', 'enviar_pesquisas']
      });
    }
    

    
    return tabs;
  }, [hasPermission]);

  // Definir aba ativa inicial
  useMemo(() => {
    if (!activeTab && availableTabs.length > 0) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs, activeTab]);

  // Calcular estatísticas de requerimentos
  const statsRequerimentos = useMemo(() => {
    if (!requerimentos || requerimentos.length === 0) {
      return null;
    }

    let dados = requerimentos;

    // FILTRO PRINCIPAL: Apenas requerimentos das abas "Enviar para Faturamento" e "Histórico de enviados"
    dados = dados.filter(r => 
      r.status === 'enviado_faturamento' || r.status === 'faturado'
    );

    // Filtrar por ano
    if (anoSelecionado) {
      dados = dados.filter(r => {
        if (!r.mes_cobranca) return false;
        const ano = r.mes_cobranca.split('/')[1];
        return parseInt(ano) === anoSelecionado;
      });
    }

    // Aplicar filtros
    if (filtroModulo !== 'todos') {
      dados = dados.filter(r => r.modulo === filtroModulo);
    }

    const total = dados.length;
    
    // horas_total pode vir como string "HH:MM" ou número (minutos)
    // DESCONTAR horas reprovadas do total
    const totalHoras = dados.reduce((acc, r) => {
      // Pular requerimentos reprovados no cálculo de horas
      if (r.tipo_cobranca === 'Reprovado') {
        return acc;
      }
      
      const horas = r.horas_total;
      if (typeof horas === 'string' && horas.includes(':')) {
        // Formato HH:MM - converter para minutos
        const [h, m] = horas.split(':').map(Number);
        return acc + (h * 60 + m);
      }
      // Já é número (minutos)
      return acc + (Number(horas) || 0);
    }, 0);
    
    const totalValor = dados.reduce((acc, r) => acc + (Number(r.valor_total_geral) || 0), 0);
    const totalTickets = dados.reduce((acc, r) => acc + (Number(r.quantidade_tickets) || 0), 0);

    // Agrupar por tipo de cobrança
    const porTipoCobranca = dados.reduce((acc, r) => {
      const tipo = r.tipo_cobranca;
      if (!acc[tipo]) {
        acc[tipo] = { count: 0, horas: 0, valor: 0, tickets: 0 };
      }
      acc[tipo].count++;
      
      // Converter horas corretamente
      const horas = r.horas_total;
      if (typeof horas === 'string' && horas.includes(':')) {
        const [h, m] = horas.split(':').map(Number);
        acc[tipo].horas += (h * 60 + m);
      } else {
        acc[tipo].horas += Number(horas) || 0;
      }
      
      acc[tipo].valor += Number(r.valor_total_geral) || 0;
      acc[tipo].tickets += Number(r.quantidade_tickets) || 0;
      return acc;
    }, {} as Record<TipoCobrancaType, { count: number; horas: number; valor: number; tickets: number }>);

    // Calcular porcentagens
    const porcentagensTipo = Object.entries(porTipoCobranca).map(([tipo, data]) => ({
      tipo: tipo as TipoCobrancaType,
      porcentagem: (data.count / total) * 100,
      count: data.count,
      horas: data.horas,
      valor: data.valor,
      tickets: data.tickets
    }));

    // Agrupar por módulo
    const porModulo = dados.reduce((acc, r) => {
      const modulo = r.modulo;
      if (!acc[modulo]) {
        acc[modulo] = { count: 0, horas: 0 };
      }
      acc[modulo].count++;
      
      // Converter horas corretamente - DESCONTAR reprovados
      if (r.tipo_cobranca !== 'Reprovado') {
        const horas = r.horas_total;
        if (typeof horas === 'string' && horas.includes(':')) {
          const [h, m] = horas.split(':').map(Number);
          acc[modulo].horas += (h * 60 + m);
        } else {
          acc[modulo].horas += Number(horas) || 0;
        }
      }
      
      return acc;
    }, {} as Record<string, { count: number; horas: number }>);

    // Agrupar por mês (para gráfico de evolução mensal)
    const porMes = dados.reduce((acc, r) => {
      const mes = r.mes_cobranca || 'Sem mês';
      if (!acc[mes]) {
        acc[mes] = { count: 0, horas: 0, valor: 0, tickets: 0 };
      }
      acc[mes].count++;
      
      // Converter horas corretamente - DESCONTAR reprovados
      if (r.tipo_cobranca !== 'Reprovado') {
        const horas = r.horas_total;
        if (typeof horas === 'string' && horas.includes(':')) {
          const [h, m] = horas.split(':').map(Number);
          acc[mes].horas += (h * 60 + m);
        } else {
          acc[mes].horas += Number(horas) || 0;
        }
      }
      
      acc[mes].valor += Number(r.valor_total_geral) || 0;
      acc[mes].tickets += Number(r.quantidade_tickets) || 0;
      return acc;
    }, {} as Record<string, { count: number; horas: number; valor: number; tickets: number }>);

    // Ordenar por mês
    const porMesOrdenado = Object.entries(porMes)
      .filter(([mes]) => mes !== 'Sem mês')
      .sort((a, b) => {
        const [mesA] = a[0].split('/');
        const [mesB] = b[0].split('/');
        return parseInt(mesA) - parseInt(mesB);
      })
      .map(([mes, data]) => ({
        mes,
        mesNome: new Date(2000, parseInt(mes.split('/')[0]) - 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        ...data
      }));

    // Calcular crescimento comparado ao ano anterior
    const anoAnterior = anoSelecionado - 1;
    let dadosAnoAnterior = requerimentos.filter(r => 
      r.status === 'enviado_faturamento' || r.status === 'faturado'
    );
    
    // Filtrar dados do ano anterior
    dadosAnoAnterior = dadosAnoAnterior.filter(r => {
      if (!r.mes_cobranca) return false;
      const ano = r.mes_cobranca.split('/')[1];
      return parseInt(ano) === anoAnterior;
    });
    
    // Aplicar mesmo filtro de módulo
    if (filtroModulo !== 'todos') {
      dadosAnoAnterior = dadosAnoAnterior.filter(r => r.modulo === filtroModulo);
    }
    
    const totalAnoAnterior = dadosAnoAnterior.length;
    const totalValorAnoAnterior = dadosAnoAnterior.reduce((acc, r) => acc + (Number(r.valor_total_geral) || 0), 0);
    
    // Calcular porcentagens de crescimento
    const crescimentoRequerimentos = totalAnoAnterior > 0 
      ? ((total - totalAnoAnterior) / totalAnoAnterior) * 100 
      : total > 0 ? 100 : 0;
      
    const crescimentoFaturamento = totalValorAnoAnterior > 0 
      ? ((totalValor - totalValorAnoAnterior) / totalValorAnoAnterior) * 100 
      : totalValor > 0 ? 100 : 0;

    // Calcular crescimento mensal (mês atual vs mês anterior)
    let crescimentoMensalRequerimentos = 0;
    let crescimentoMensalFaturamento = 0;
    
    if (porMesOrdenado.length >= 2) {
      const mesAtual = porMesOrdenado[porMesOrdenado.length - 1];
      const mesAnterior = porMesOrdenado[porMesOrdenado.length - 2];
      
      // Crescimento de requerimentos mês a mês
      if (mesAnterior.count > 0) {
        crescimentoMensalRequerimentos = ((mesAtual.count - mesAnterior.count) / mesAnterior.count) * 100;
      } else if (mesAtual.count > 0) {
        crescimentoMensalRequerimentos = 100;
      }
      
      // Crescimento de faturamento mês a mês
      if (mesAnterior.valor > 0) {
        crescimentoMensalFaturamento = ((mesAtual.valor - mesAnterior.valor) / mesAnterior.valor) * 100;
      } else if (mesAtual.valor > 0) {
        crescimentoMensalFaturamento = 100;
      }
    }

    return {
      total,
      totalHoras,
      totalValor,
      totalTickets,
      porTipoCobranca: porcentagensTipo,
      porModulo,
      porMes: porMesOrdenado,
      crescimentoRequerimentos,
      crescimentoFaturamento,
      crescimentoMensalRequerimentos,
      crescimentoMensalFaturamento
    };
  }, [requerimentos, filtroModulo, anoSelecionado]);

  // Calcular estatísticas de elogios
  const statsElogios = useMemo(() => {
    if (!elogios || elogios.length === 0) {
      return {
        total: 0,
        registrados: 0,
        compartilhados: 0,
        enviados: 0,
        arquivados: 0,
        satisfacaoMedia: 0,
        porEmpresa: {},
        porMes: []
      };
    }

    let dados = elogios;

    // Filtrar por ano baseado APENAS na data_resposta (consistente com outras telas)
    if (anoSelecionado) {
      dados = dados.filter(e => {
        // Usar APENAS data_resposta - excluir elogios sem data_resposta
        if (!e.data_resposta) return false;
        const ano = new Date(e.data_resposta).getFullYear();
        return ano === anoSelecionado;
      });
    }

    // Filtrar apenas elogios processados (excluir registrados que ainda estão em etapa anterior)
    dados = dados.filter(e => e.status !== 'registrado');

    const total = dados.length;
    const registrados = dados.filter(e => e.status === 'registrado').length;
    const compartilhados = dados.filter(e => e.status === 'compartilhado').length;
    const enviados = dados.filter(e => e.status === 'enviado').length;
    const arquivados = dados.filter(e => e.status === 'arquivado').length;

    // Debug será movido para depois da definição de porMesOrdenado

    // Agrupar por empresa
    const porEmpresa = dados.reduce((acc, e) => {
      const empresa = e.pesquisa?.empresa || 'Sem empresa';
      if (!acc[empresa]) {
        acc[empresa] = { 
          count: 0, 
          registrados: 0,
          compartilhados: 0, 
          enviados: 0,
          arquivados: 0
        };
      }
      acc[empresa].count++;
      if (e.status === 'registrado') acc[empresa].registrados++;
      if (e.status === 'compartilhado') acc[empresa].compartilhados++;
      if (e.status === 'enviado') acc[empresa].enviados++;
      if (e.status === 'arquivado') acc[empresa].arquivados++;
      return acc;
    }, {} as Record<string, { 
      count: number; 
      registrados: number;
      compartilhados: number; 
      enviados: number;
      arquivados: number;
    }>);

    // Agrupar por mês usando APENAS data_resposta (consistente com outras telas)
    const porMes = dados.reduce((acc, e) => {
      // Usar APENAS data_resposta - pular elogios sem data_resposta
      if (!e.data_resposta) return acc;
      
      const data = new Date(e.data_resposta);
      const mes = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
      if (!acc[mes]) {
        acc[mes] = { 
          count: 0, 
          registrados: 0,
          compartilhados: 0, 
          enviados: 0,
          arquivados: 0
        };
      }
      acc[mes].count++;
      if (e.status === 'registrado') acc[mes].registrados++;
      if (e.status === 'compartilhado') acc[mes].compartilhados++;
      if (e.status === 'enviado') acc[mes].enviados++;
      if (e.status === 'arquivado') acc[mes].arquivados++;
      return acc;
    }, {} as Record<string, { 
      count: number; 
      registrados: number;
      compartilhados: number; 
      enviados: number;
      arquivados: number;
    }>);

    // Criar array completo de meses (janeiro a dezembro)
    const mesesCompletos = [];
    for (let mes = 1; mes <= 12; mes++) {
      const chaveMs = `${String(mes).padStart(2, '0')}/${anoSelecionado}`;
      const dadosDoMes = porMes[chaveMs] || { 
        count: 0, 
        registrados: 0, 
        compartilhados: 0, 
        enviados: 0, 
        arquivados: 0 
      };
      
      mesesCompletos.push({
        mes: chaveMs,
        mesNome: new Date(2000, mes - 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        mesNumero: mes,
        ...dadosDoMes
      });
    }
    
    const porMesOrdenado = mesesCompletos;

    // Debug temporário
    console.log('📊 Dashboard Elogios Debug:', {
      anoSelecionado,
      totalElogios: elogios?.length || 0,
      elogiosProcessados: total,
      breakdown: { compartilhados, enviados, arquivados },
      registradosExcluidos: elogios?.filter(e => e.status === 'registrado').length || 0,
      porMesDetalhado: porMesOrdenado,
      exemploElogios: dados.slice(0, 3).map(e => ({
        id: e.id,
        status: e.status,
        data_resposta: e.data_resposta,
        criado_em: e.criado_em
      })),
      nota: 'Agora usando APENAS data_resposta para agrupamento'
    });

    // Calcular satisfação média baseada nas respostas das pesquisas
    const pesquisasComResposta = dados.filter(e => e.pesquisa?.resposta);
    let satisfacaoMedia = 0;
    
    if (pesquisasComResposta.length > 0) {
      // Mapear respostas para valores numéricos
      const valorResposta = (resposta: string) => {
        const resp = resposta.toLowerCase();
        if (resp.includes('muito satisfeito') || resp.includes('excelente')) return 5;
        if (resp.includes('satisfeito') || resp.includes('bom')) return 4;
        if (resp.includes('neutro') || resp.includes('regular')) return 3;
        if (resp.includes('insatisfeito') || resp.includes('ruim')) return 2;
        if (resp.includes('muito insatisfeito') || resp.includes('péssimo')) return 1;
        return 4; // Default para elogios
      };
      
      const somaNotas = pesquisasComResposta.reduce((acc, e) => {
        return acc + valorResposta(e.pesquisa?.resposta || '');
      }, 0);
      
      satisfacaoMedia = somaNotas / pesquisasComResposta.length;
    }

    return {
      total,
      registrados,
      compartilhados,
      enviados,
      arquivados,
      satisfacaoMedia,
      porEmpresa,
      porMes: porMesOrdenado
    };
  }, [elogios, anoSelecionado]);

  // Calcular estatísticas por empresa
  const statsEmpresas = useMemo(() => {
    if (!requerimentos || requerimentos.length === 0) {
      return null;
    }

    let dados = requerimentos;

    // FILTRO PRINCIPAL: Apenas requerimentos das abas "Enviar para Faturamento" e "Histórico de enviados"
    dados = dados.filter(r => 
      r.status === 'enviado_faturamento' || r.status === 'faturado'
    );

    // Filtrar por ano
    if (anoSelecionado) {
      dados = dados.filter(r => {
        if (!r.mes_cobranca) return false;
        const ano = r.mes_cobranca.split('/')[1];
        return parseInt(ano) === anoSelecionado;
      });
    }

    // Aplicar filtros
    if (filtroModulo !== 'todos') {
      dados = dados.filter(r => r.modulo === filtroModulo);
    }

    // Agrupar por empresa
    const porEmpresa = dados.reduce((acc, r) => {
      const empresa = r.cliente_nome || 'Sem empresa';
      if (!acc[empresa]) {
        acc[empresa] = { 
          count: 0, 
          horas: 0, 
          valor: 0, 
          tickets: 0,
          bancoHoras: 0,
          horasBancoHoras: 0
        };
      }
      acc[empresa].count++;
      
      // Converter horas corretamente - DESCONTAR reprovados das horas
      const horas = r.horas_total;
      let horasEmMinutos = 0;
      if (typeof horas === 'string' && horas.includes(':')) {
        const [h, m] = horas.split(':').map(Number);
        horasEmMinutos = (h * 60 + m);
      } else {
        horasEmMinutos = Number(horas) || 0;
      }
      
      // Só somar horas se não for reprovado
      if (r.tipo_cobranca !== 'Reprovado') {
        acc[empresa].horas += horasEmMinutos;
      }
      
      acc[empresa].valor += Number(r.valor_total_geral) || 0;
      acc[empresa].tickets += Number(r.quantidade_tickets) || 0;
      
      // Contar banco de horas
      if (r.tipo_cobranca === 'Banco de Horas') {
        acc[empresa].bancoHoras++;
        acc[empresa].horasBancoHoras += horasEmMinutos;
      }
      
      return acc;
    }, {} as Record<string, { 
      count: number; 
      horas: number; 
      valor: number; 
      tickets: number;
      bancoHoras: number;
      horasBancoHoras: number;
    }>);

    // Encontrar empresa que mais fatura
    const empresaMaisFatura = Object.entries(porEmpresa)
      .filter(([_, data]) => data.valor > 0)
      .sort((a, b) => b[1].valor - a[1].valor)[0];

    // Encontrar empresa que mais usa banco de horas
    const empresaMaisBancoHoras = Object.entries(porEmpresa)
      .filter(([_, data]) => data.bancoHoras > 0)
      .sort((a, b) => b[1].horasBancoHoras - a[1].horasBancoHoras)[0];

    return {
      porEmpresa,
      empresaMaisFatura: empresaMaisFatura ? {
        nome: empresaMaisFatura[0],
        valor: empresaMaisFatura[1].valor,
        count: empresaMaisFatura[1].count
      } : null,
      empresaMaisBancoHoras: empresaMaisBancoHoras ? {
        nome: empresaMaisBancoHoras[0],
        horas: empresaMaisBancoHoras[1].horasBancoHoras,
        count: empresaMaisBancoHoras[1].bancoHoras
      } : null
    };
  }, [requerimentos, filtroModulo, anoSelecionado]);

  const isLoading = loadingRequerimentos || loadingElogios;

  // Se não há abas disponíveis, mostrar mensagem
  if (availableTabs.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Acesso Restrito
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Você não possui permissão para visualizar nenhuma seção do dashboard.
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Visão geral do sistema</p>
          </div>

          {/* Linha com Abas e Filtros */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Abas Compactas */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {availableTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      activeTab === tab.key
                        ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              <Select value={String(anoSelecionado)} onValueChange={(v) => setAnoSelecionado(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map(ano => (
                    <SelectItem key={ano} value={String(ano)}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeTab === 'requerimentos' && (
                <Select value={filtroModulo} onValueChange={(v) => setFiltroModulo(v as ModuloType | 'todos')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos Módulos</SelectItem>
                    <SelectItem value="Comex">Comex</SelectItem>
                    <SelectItem value="Comply">Comply</SelectItem>
                    <SelectItem value="Comply e-DOCS">Comply e-DOCS</SelectItem>
                    <SelectItem value="Gallery">Gallery</SelectItem>
                    <SelectItem value="pw.SATI">pw.SATI</SelectItem>
                    <SelectItem value="pw.SPED">pw.SPED</SelectItem>
                    <SelectItem value="pw.SATI/pw.SPED">pw.SATI/pw.SPED</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <DashboardLoading />
        ) : (
          <div className="space-y-6">
            {/* Conteúdo das Abas */}
            
            {/* Aba de Requerimentos */}
            {activeTab === 'requerimentos' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-6 w-6 text-blue-600" />
                  Requerimentos
                </h2>

                {/* Layout Principal - Cards Expandidos */}
                <div className="space-y-6">
                  {/* Cards de Resumo - Linha Superior (Largura Completa) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-white dark:bg-gray-800 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Requerimentos</p>
                          <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold">{statsRequerimentos?.total || 0}</p>
                            {/* Sempre mostrar crescimento mensal de requerimentos */}
                            {statsRequerimentos?.crescimentoMensalRequerimentos !== undefined && (
                              <span className={`text-xs font-medium ${
                                statsRequerimentos.crescimentoMensalRequerimentos >= 0 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {statsRequerimentos.crescimentoMensalRequerimentos >= 0 ? '+' : ''}
                                {statsRequerimentos.crescimentoMensalRequerimentos.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                      </CardHeader>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Horas</p>
                          <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold">{converterMinutosParaHoras(statsRequerimentos?.totalHoras || 0).replace('h', '')}</p>
                          </div>
                        </div>
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                          <Clock className="h-4 w-4 text-purple-600" />
                        </div>
                      </CardHeader>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Faturamento</p>
                          <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsRequerimentos?.totalValor || 0)}</p>
                            {/* Sempre mostrar crescimento mensal de faturamento */}
                            {statsRequerimentos?.crescimentoMensalFaturamento !== undefined && (
                              <span className={`text-xs font-medium ${
                                statsRequerimentos.crescimentoMensalFaturamento >= 0 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {statsRequerimentos.crescimentoMensalFaturamento >= 0 ? '+' : ''}
                                {statsRequerimentos.crescimentoMensalFaturamento.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                          <DollarSign className="h-4 w-4 text-green-600" />
                        </div>
                      </CardHeader>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Tickets</p>
                          <p className="text-2xl font-bold">{statsRequerimentos?.totalTickets || 0}</p>
                        </div>
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                          <Ticket className="h-4 w-4 text-orange-600" />
                        </div>
                      </CardHeader>
                    </Card>
                  </div>

                  {/* Seção com Gráfico de Evolução Mensal e Cards de Destaque lado a lado */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Gráfico de Evolução Mensal - 2/3 da largura */}
                    <div className="lg:col-span-2">
                      <Card className="bg-white dark:bg-gray-800 shadow-sm">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-5 w-5 text-gray-600" />
                              <CardTitle className="text-lg font-semibold">Evolução Mensal</CardTitle>
                            </div>
                            <button
                              onClick={() => setEvolucaoMensalMode(prev => prev === 'requerimentos' ? 'faturamento' : 'requerimentos')}
                              className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors duration-200 flex items-center gap-1"
                              title={`Alternar para ${evolucaoMensalMode === 'requerimentos' ? 'Faturamento' : 'Requerimentos'}`}
                            >
                              {evolucaoMensalMode === 'requerimentos' ? (
                                <>
                                  <FileText className="h-3 w-3" />
                                  <span>→</span>
                                  <DollarSign className="h-3 w-3" />
                                </>
                              ) : (
                                <>
                                  <DollarSign className="h-3 w-3" />
                                  <span>→</span>
                                  <FileText className="h-3 w-3" />
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Comparativo de {evolucaoMensalMode === 'requerimentos' ? 'Requerimentos' : 'Faturamento'} por mês
                          </p>
                        </CardHeader>
                        <CardContent>
                          {statsRequerimentos && statsRequerimentos.porMes && statsRequerimentos.porMes.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                              <AreaChart 
                                data={statsRequerimentos.porMes.map((item, index, array) => {
                                // Calcular crescimento do mês anterior
                                const valorAtual = evolucaoMensalMode === 'requerimentos' ? item.count : item.valor;
                                const valorAnterior = index > 0 ? 
                                  (evolucaoMensalMode === 'requerimentos' ? array[index - 1].count : array[index - 1].valor) : 0;
                                
                                const crescimento = valorAnterior > 0 ? 
                                  ((valorAtual - valorAnterior) / valorAnterior) * 100 : 0;
                                
                                return {
                                  ...item,
                                  valorExibicao: valorAtual,
                                  crescimento: index > 0 ? crescimento : 0,
                                  temCrescimento: index > 0
                                };
                              })}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                              >
                                <defs>
                                  <linearGradient id={`color${evolucaoMensalMode}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={evolucaoMensalMode === 'requerimentos' ? "#3b82f6" : "#10b981"} stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor={evolucaoMensalMode === 'requerimentos' ? "#3b82f6" : "#10b981"} stopOpacity={0.1}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="mesNome" tick={{ fontSize: 11 }} />
                                <YAxis 
                                  tick={{ fontSize: 11 }}
                                  tickFormatter={(value) => {
                                    if (evolucaoMensalMode === 'faturamento') {
                                      // Formatação customizada para manter R$ e abreviar valores grandes
                                      if (value >= 1000000) {
                                        return `R$ ${(value / 1000000).toFixed(0)} mi`;
                                      } else if (value >= 1000) {
                                        return `R$ ${(value / 1000).toFixed(0)} mil`;
                                      } else {
                                        return new Intl.NumberFormat('pt-BR', { 
                                          style: 'currency', 
                                          currency: 'BRL',
                                          maximumFractionDigits: 0
                                        }).format(value);
                                      }
                                    }
                                    return value.toString();
                                  }}
                                />
                                <Tooltip 
                                  formatter={(value: number, name: string, props: any) => {
                                    const crescimento = props?.payload?.crescimento || 0;
                                    const temCrescimento = props?.payload?.temCrescimento || false;
                                    
                                    let valorFormatado = value.toString();
                                    if (evolucaoMensalMode === 'faturamento') {
                                      valorFormatado = new Intl.NumberFormat('pt-BR', { 
                                        style: 'currency', 
                                        currency: 'BRL' 
                                      }).format(value);
                                    }
                                    
                                    const crescimentoTexto = temCrescimento ? 
                                      ` (${crescimento >= 0 ? '+' : ''}${crescimento.toFixed(1)}% vs mês anterior)` : '';
                                    
                                    return [
                                      `${valorFormatado}${crescimentoTexto}`,
                                      evolucaoMensalMode === 'requerimentos' ? 'Requerimentos' : 'Faturamento'
                                    ];
                                  }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Area 
                                  type="monotone" 
                                  dataKey="valorExibicao" 
                                  stroke={evolucaoMensalMode === 'requerimentos' ? "#3b82f6" : "#10b981"} 
                                  strokeWidth={2}
                                  fillOpacity={1} 
                                  fill={`url(#color${evolucaoMensalMode})`} 
                                  name={evolucaoMensalMode === 'requerimentos' ? 'Requerimentos' : 'Faturamento'}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-[300px] text-gray-500">
                              Sem dados para exibir
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Cards de Destaque - 1/3 da largura, organizados verticalmente com altura alinhada */}
                    <div className="flex flex-col gap-4">
                      {/* Maior Faturamento */}
                      {statsEmpresas?.empresaMaisFatura && (
                        <Card className="bg-white dark:bg-gray-800 shadow-sm flex-1">
                          <CardHeader className="pb-3 h-full flex flex-col justify-center">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Maior Faturamento</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                                  {statsEmpresas.empresaMaisFatura.nome.length > 20 
                                    ? statsEmpresas.empresaMaisFatura.nome.substring(0, 20) + '...' 
                                    : statsEmpresas.empresaMaisFatura.nome}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsEmpresas.empresaMaisFatura.valor)}
                                </p>
                              </div>
                              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                                <Award className="h-4 w-4 text-orange-600" />
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      )}

                      {/* Maior Banco de Horas */}
                      {statsEmpresas?.empresaMaisBancoHoras && (
                        <Card className="bg-white dark:bg-gray-800 shadow-sm flex-1">
                          <CardHeader className="pb-3 h-full flex flex-col justify-center">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Maior Banco de Horas</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                                  {statsEmpresas.empresaMaisBancoHoras.nome.length > 20 
                                    ? statsEmpresas.empresaMaisBancoHoras.nome.substring(0, 20) + '...' 
                                    : statsEmpresas.empresaMaisBancoHoras.nome}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {converterMinutosParaHoras(statsEmpresas.empresaMaisBancoHoras.horas)}
                                </p>
                              </div>
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                <Clock className="h-4 w-4 text-blue-600" />
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      )}

                      {/* Card de Módulos */}
                      <Card className="bg-white dark:bg-gray-800 shadow-sm flex-1">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-gray-600" />
                            <CardTitle className="text-sm font-semibold">Módulos</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                          {statsRequerimentos?.porModulo ? (
                            <div className="space-y-3">
                              {Object.entries(statsRequerimentos.porModulo)
                                .sort((a, b) => b[1].count - a[1].count)
                                .slice(0, 5)
                                .map(([modulo, data]) => (
                                  <div key={modulo} className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                      {modulo}
                                    </span>
                                    <span className="text-xs font-medium">
                                      {data.count}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">Sem dados</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

                {/* Seção Inferior - Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                  {/* Top Faturamento */}
                  <Card className="bg-white dark:bg-gray-800 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className={`h-4 w-4 ${topFaturamentoMode === 'faturamento' ? 'text-orange-600' : 'text-blue-600'}`} />
                          <CardTitle className="text-sm font-semibold">
                            {topFaturamentoMode === 'faturamento' ? 'Top Faturamento' : 'Top Banco de Horas'}
                          </CardTitle>
                        </div>
                        <button
                          onClick={() => setTopFaturamentoMode(prev => prev === 'faturamento' ? 'banco_horas' : 'faturamento')}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors duration-200"
                          title={`Alternar para ${topFaturamentoMode === 'faturamento' ? 'Banco de Horas' : 'Faturamento'}`}
                        >
                          {topFaturamentoMode === 'faturamento' ? '💰→⏰' : '⏰→💰'}
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {statsEmpresas && Object.keys(statsEmpresas.porEmpresa).length > 0 ? (
                        <div className="space-y-3">
                          {(() => {
                            if (topFaturamentoMode === 'faturamento') {
                              // Modo Faturamento
                              const empresasComFaturamento = Object.entries(statsEmpresas.porEmpresa)
                                .filter(([_, data]) => data.valor > 0)
                                .sort((a, b) => b[1].valor - a[1].valor)
                                .slice(0, 5);
                              
                              const maiorValor = empresasComFaturamento[0]?.[1]?.valor || 1;
                              
                              return empresasComFaturamento.map(([empresa, data]) => {
                                const porcentagem = (data.valor / maiorValor) * 100;
                                return (
                                  <div key={empresa} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                        {empresa.length > 15 ? empresa.substring(0, 15) + '...' : empresa}
                                      </span>
                                      <span className="text-xs font-medium">
                                        {new Intl.NumberFormat('pt-BR', { 
                                          style: 'currency', 
                                          currency: 'BRL'
                                        }).format(data.valor)}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                      <div 
                                        className="h-1.5 rounded-full transition-all duration-300 bg-orange-500 cursor-pointer"
                                        style={{ 
                                          width: `${porcentagem}%`
                                        }}
                                        title={`${porcentagem.toFixed(1)}% do maior valor`}
                                      />
                                    </div>
                                  </div>
                                );
                              });
                            } else {
                              // Modo Banco de Horas
                              const empresasComBancoHoras = Object.entries(statsEmpresas.porEmpresa)
                                .filter(([_, data]) => data.horasBancoHoras > 0)
                                .sort((a, b) => b[1].horasBancoHoras - a[1].horasBancoHoras)
                                .slice(0, 5);
                              
                              const maiorHoras = empresasComBancoHoras[0]?.[1]?.horasBancoHoras || 1;
                              
                              return empresasComBancoHoras.map(([empresa, data]) => {
                                const porcentagem = (data.horasBancoHoras / maiorHoras) * 100;
                                return (
                                  <div key={empresa} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                        {empresa.length > 15 ? empresa.substring(0, 15) + '...' : empresa}
                                      </span>
                                      <span className="text-xs font-medium">
                                        {converterMinutosParaHoras(data.horasBancoHoras)}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                      <div 
                                        className="h-1.5 rounded-full transition-all duration-300 bg-blue-500 cursor-pointer"
                                        style={{ 
                                          width: `${porcentagem}%`
                                        }}
                                        title={`${porcentagem.toFixed(1)}% do maior valor`}
                                      />
                                    </div>
                                  </div>
                                );
                              });
                            }
                          })()}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Sem dados</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Distribuição Faturamento */}
                  <Card className="bg-white dark:bg-gray-800 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <PieChart className="h-4 w-4 text-green-600" />
                        <CardTitle className="text-sm font-semibold">Distribuição de Faturamento</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {statsRequerimentos && statsRequerimentos.porTipoCobranca && statsRequerimentos.porTipoCobranca.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <RechartsPieChart>
                            {(() => {
                              // Buscar dados específicos por tipo
                              const faturado = statsRequerimentos.porTipoCobranca.find(item => item.tipo === 'Faturado');
                              const horaExtra = statsRequerimentos.porTipoCobranca.find(item => item.tipo === 'Hora Extra');
                              const sobreaviso = statsRequerimentos.porTipoCobranca.find(item => item.tipo === 'Sobreaviso');
                              const bolsaoEnel = statsRequerimentos.porTipoCobranca.find(item => item.tipo === 'Bolsão Enel');
                              const bancoHoras = statsRequerimentos.porTipoCobranca.find(item => item.tipo === 'Banco de Horas');
                              const reprovado = statsRequerimentos.porTipoCobranca.find(item => item.tipo === 'Reprovado');
                              
                              const categorias = [
                                { name: 'Faturado', value: faturado?.valor || 0, tipo: 'Faturado' as TipoCobrancaType },
                                { name: 'Hora Extra', value: horaExtra?.valor || 0, tipo: 'Hora Extra' as TipoCobrancaType },
                                { name: 'Sobreaviso', value: sobreaviso?.valor || 0, tipo: 'Sobreaviso' as TipoCobrancaType },
                                { name: 'Bolsão Enel', value: bolsaoEnel?.valor || 0, tipo: 'Bolsão Enel' as TipoCobrancaType },
                                { name: 'Banco de Horas', value: bancoHoras?.valor || 0, tipo: 'Banco de Horas' as TipoCobrancaType },
                                { name: 'Reprovado', value: reprovado?.valor || 0, tipo: 'Reprovado' as TipoCobrancaType }
                              ]
                              .filter(item => item.value > 0)
                              .sort((a, b) => a.value - b.value); // Ordenar do menor para o maior (menor no centro)
                              
                              const anelEspessura = 12;
                              const espacamento = 3;
                              const raioInicial = 25;
                              
                              // Calcular ângulos com visibilidade mínima garantida
                              const maxValue = Math.max(...categorias.map(c => c.value));
                              const minAngle = 45; // Ângulo mínimo de 45 graus para visibilidade
                              const maxAngle = 270; // Ângulo máximo disponível
                              
                              return categorias.map((categoria, index) => {
                                // Calcular ângulo proporcional
                                const proportionalAngle = (categoria.value / maxValue) * maxAngle;
                                // Garantir ângulo mínimo para visibilidade
                                const finalAngle = Math.max(proportionalAngle, minAngle);
                                
                                return (
                                  <Pie
                                    key={`anel-${index}`}
                                    data={[
                                      { name: categoria.name, value: categoria.value, tipo: categoria.tipo, originalValue: categoria.value },
                                      { name: 'Vazio', value: 0.1, tipo: 'Vazio' }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={raioInicial + (index * (anelEspessura + espacamento))}
                                    outerRadius={raioInicial + (index * (anelEspessura + espacamento)) + anelEspessura}
                                    startAngle={90}
                                    endAngle={90 + finalAngle}
                                    paddingAngle={0}
                                    dataKey="value"
                                    cornerRadius={6}
                                  >
                                    <Cell fill={getHexColor(categoria.tipo)} />
                                    <Cell fill="transparent" />
                                  </Pie>
                                );
                              });
                            })()}
                            
                            <Tooltip 
                              formatter={(value: number, name: string, props: any) => {
                                if (name === 'Vazio') return null;
                                
                                // Usar valor original se disponível
                                const originalValue = props?.payload?.originalValue || value;
                                const totalValor = statsRequerimentos.porTipoCobranca.reduce((acc, item) => acc + item.valor, 0);
                                const porcentagem = totalValor > 0 ? ((originalValue / totalValor) * 100).toFixed(1) : '0';
                                return [
                                  `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalValue)} (${porcentagem}%)`,
                                  `${name}`
                                ];
                              }}
                              labelFormatter={(label: string) => label !== 'Vazio' ? `Categoria: ${label}` : ''}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[200px] text-gray-500 text-sm">
                          Sem dados
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Tipo de Cobrança */}
                  <Card className="bg-white dark:bg-gray-800 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-gray-600" />
                        <CardTitle className="text-sm font-semibold">Tipo de Cobrança</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {statsRequerimentos?.porTipoCobranca ? (
                        <div className="space-y-3">
                          {statsRequerimentos.porTipoCobranca
                            .sort((a, b) => b.count - a.count)
                            .map((item) => (
                              <div key={item.tipo} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-600 dark:text-gray-400">
                                    {item.tipo}
                                  </span>
                                  <span className="text-xs font-medium">
                                    {item.count}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                  <div 
                                    className="h-1.5 rounded-full transition-all duration-300 cursor-pointer"
                                    style={{ 
                                      width: `${item.porcentagem}%`,
                                      backgroundColor: getHexColor(item.tipo)
                                    }}
                                    title={`${item.porcentagem.toFixed(1)}% do total`}
                                  />
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Sem dados</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Mensagem quando não há dados */}
                {(!statsRequerimentos || statsRequerimentos.total === 0) && (
                  <EmptyState
                    icon={FileText}
                    title="Nenhum requerimento encontrado"
                    description={`Não há requerimentos para o ano selecionado: ${anoSelecionado}`}
                  />
                )}
              </div>
            )}

            {/* Aba de Elogios */}
            {activeTab === 'elogios' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Heart className="h-6 w-6 text-blue-600" />
                  Elogios
                </h2>

                {/* Sub-abas de Elogios */}
                <ElogiosSubTabs 
                  statsElogios={statsElogios}
                  anoSelecionado={anoSelecionado}
                  elogios={elogios}
                />
              </div>
            )}


          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Dashboard;