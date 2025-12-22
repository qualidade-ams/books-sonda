import { useState, useMemo, useRef, useEffect } from 'react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { StatCard } from '@/components/admin/dashboard/StatCard';
import { ModernChart } from '@/components/admin/dashboard/ModernChart';
import { DashboardGrid } from '@/components/admin/dashboard/DashboardGrid';
import { DashboardLoading } from '@/components/admin/dashboard/DashboardLoading';
import { EmptyState } from '@/components/admin/dashboard/EmptyState';
import { useRequerimentos } from '@/hooks/useRequerimentos';
import { useElogios, useEstatisticasElogios } from '@/hooks/useElogios';
import { useEstatisticasPesquisas, type EstatisticasPesquisas } from '@/hooks/useEstatisticasPesquisas';
import { usePermissions } from '@/hooks/usePermissions';
import { useDeParaCategoria } from '@/hooks/useDeParaCategoria';
import { useEmpresas } from '@/hooks/useEmpresas';
import { usePlanosAcao, useEstatisticasPlanosAcao } from '@/hooks/usePlanosAcao';
import { PlanosAcaoTable } from '@/components/admin/plano-acao/PlanosAcaoTable';
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
  ChevronUp,
  Search,
  X
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
const ElogiosSubTabs = ({ statsElogios, anoSelecionado, mesSelecionado, elogios, hasPermission }: { 
  statsElogios: any; 
  anoSelecionado: number;
  mesSelecionado: number | 'todos';
  elogios?: any[];
  hasPermission: (screenKey: string, level?: string) => boolean;
}) => {
  const [activeElogiosTab, setActiveElogiosTab] = useState<string>('visao-geral');

  const elogiosSubTabs = [
    { key: 'visao-geral', label: 'Visão Geral' },
    { key: 'mapeamento', label: 'Mapeamento' },
    { key: 'volume', label: 'Volume' },
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
        <VisaoGeralElogios statsElogios={statsElogios} anoSelecionado={anoSelecionado} mesSelecionado={mesSelecionado} elogios={elogios} />
      )}
      
      {activeElogiosTab === 'mapeamento' && (
        <MapeamentoElogios statsElogios={statsElogios} anoSelecionado={anoSelecionado} mesSelecionado={mesSelecionado} elogios={elogios} />
      )}
      
      {activeElogiosTab === 'volume' && (
        <VolumeElogios statsElogios={statsElogios} anoSelecionado={anoSelecionado} mesSelecionado={mesSelecionado} elogios={elogios} />
      )}
      
      {activeElogiosTab === 'pesquisas' && (
        <PesquisasElogios statsElogios={statsElogios} anoSelecionado={anoSelecionado} mesSelecionado={mesSelecionado} elogios={elogios} />
      )}
    </div>
  );
};

// Componente Visão Geral
const VisaoGeralElogios = ({ statsElogios, anoSelecionado, mesSelecionado, elogios }: { 
  statsElogios: any; 
  anoSelecionado: number;
  mesSelecionado: number | 'todos';
  elogios?: any[];
}) => {
  // Hook para buscar de-para de categorias
  const { data: deParaCategorias = [] } = useDeParaCategoria();
  
  // Hook para buscar empresas
  const { empresas } = useEmpresas();

  // Função para fazer de-para da categoria para grupo
  const obterGrupoPorCategoria = (categoria: string): string => {
    if (!categoria) return '';
    
    // Busca exata primeiro
    let deParaEncontrado = deParaCategorias.find(
      dp => dp.categoria === categoria
    );
    
    // Se não encontrar, tentar busca parcial (mais flexível)
    if (!deParaEncontrado) {
      deParaEncontrado = deParaCategorias.find(
        dp => categoria.includes(dp.categoria) || dp.categoria.includes(categoria)
      );
    }
    
    if (deParaEncontrado) {
      return deParaEncontrado.grupo;
    } else {
      return categoria; // Fallback para categoria original
    }
  };

  // Função para obter nome abreviado da empresa
  const obterNomeAbreviadoEmpresa = (nomeEmpresa: string): string => {
    if (!nomeEmpresa || nomeEmpresa === 'N/A') {
      return 'N/A';
    }
    
    // Buscar empresa correspondente pelo nome completo ou abreviado
    const empresaEncontrada = empresas.find(
      empresa => 
        empresa.nome_completo === nomeEmpresa || 
        empresa.nome_abreviado === nomeEmpresa ||
        empresa.nome_completo?.toLowerCase() === nomeEmpresa.toLowerCase() ||
        empresa.nome_abreviado?.toLowerCase() === nomeEmpresa.toLowerCase()
    );
    
    if (empresaEncontrada) {
      return empresaEncontrada.nome_abreviado || empresaEncontrada.nome_completo;
    }
    
    // Fallback para nome original
    return nomeEmpresa;
  };

  const [empresasExpandido, setEmpresasExpandido] = useState(false);
  const [colaboradoresExpandido, setColaboradoresExpandido] = useState(false);
  const [elogiosExpandido, setElogiosExpandido] = useState(false);
  const [areasExpandido, setAreasExpandido] = useState(false);
  
  // Estados para controlar seleção e detalhes
  const [itemSelecionado, setItemSelecionado] = useState<{
    tipo: 'empresa' | 'colaborador' | 'elogio' | 'volume' | null;
    dados: any;
  } | null>(null);

  // Função para filtrar elogios baseado na seleção
  const obterElogiosFiltrados = () => {
    if (!itemSelecionado) return [];
    
    const elogiosFiltrados = elogios?.filter(e => {
      if (!e.data_resposta) return false;
      const dataResposta = new Date(e.data_resposta);
      return dataResposta.getFullYear() === anoSelecionado &&
             (e.status === 'compartilhado' || e.status === 'enviado');
    }) || [];

    switch (itemSelecionado.tipo) {
      case 'empresa':
        return elogiosFiltrados.filter(e => 
          obterNomeAbreviadoEmpresa(e.pesquisa?.empresa || '') === itemSelecionado.dados
        );
      case 'colaborador':
        return elogiosFiltrados.filter(e => 
          e.pesquisa?.prestador === itemSelecionado.dados
        );
      case 'elogio':
        return [itemSelecionado.dados];
      case 'volume':
        return elogiosFiltrados;
      default:
        return [];
    }
  };

  const elogiosDetalhados = obterElogiosFiltrados();

  // Estado para controlar linhas expandidas
  const [linhasExpandidas, setLinhasExpandidas] = useState<Set<string>>(new Set());

  // Função para alternar expansão de linha
  const toggleLinha = (elogioId: string) => {
    const novasLinhasExpandidas = new Set(linhasExpandidas);
    if (novasLinhasExpandidas.has(elogioId)) {
      novasLinhasExpandidas.delete(elogioId);
    } else {
      novasLinhasExpandidas.add(elogioId);
    }
    setLinhasExpandidas(novasLinhasExpandidas);
  };

  // Componente de detalhes dos elogios
  const DetalhesElogios = () => {
    if (!itemSelecionado) return null;

    return (
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                Detalhes dos Elogios
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {itemSelecionado.tipo === 'empresa' && `Empresa: ${itemSelecionado.dados}`}
                {itemSelecionado.tipo === 'colaborador' && `Colaborador: ${itemSelecionado.dados}`}
                {itemSelecionado.tipo === 'elogio' && 'Elogio Selecionado'}
                {itemSelecionado.tipo === 'volume' && 'Todos os Elogios do Ano'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItemSelecionado(null)}
            >
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total de elogios encontrados: {elogiosDetalhados.length}
            </div>
            
            {/* Cabeçalho da tabela */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <div className="col-span-2">Nº Chamado</div>
                <div className="col-span-2">Empresa</div>
                <div className="col-span-3">Colaborador</div>
                <div className="col-span-2">Data Resposta</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1 text-center"></div>
              </div>
            </div>
            
            {/* Lista de elogios como linhas expansíveis */}
            <div className="max-h-96 overflow-y-auto space-y-1">
              {elogiosDetalhados.map((elogio, index) => {
                const elogioId = elogio.id || `elogio-${index}`;
                const isExpanded = linhasExpandidas.has(elogioId);
                
                return (
                  <div key={elogioId} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {/* Linha principal (sempre visível) */}
                    <div 
                      className="grid grid-cols-12 gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      onClick={() => toggleLinha(elogioId)}
                    >
                      <div className="col-span-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {elogio.pesquisa?.nro_caso || 'N/A'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {obterNomeAbreviadoEmpresa(elogio.pesquisa?.empresa || 'N/A')}
                        </span>
                      </div>
                      <div className="col-span-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {elogio.pesquisa?.prestador || 'N/A'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {elogio.data_resposta ? new Date(elogio.data_resposta).toLocaleDateString('pt-BR') : 'N/A'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          elogio.status === 'enviado' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}>
                          {elogio.status === 'enviado' ? 'Enviado' : 'Validado'}
                        </span>
                      </div>
                      <div className="col-span-1 text-center">
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`} />
                      </div>
                    </div>
                    
                    {/* Conteúdo expandido (comentário) */}
                    {isExpanded && elogio.pesquisa?.comentario_pesquisa && (
                      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                        <div className="space-y-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Comentário:
                          </span>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {elogio.pesquisa.comentario_pesquisa}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Mensagem quando não há comentário */}
                    {isExpanded && !elogio.pesquisa?.comentario_pesquisa && (
                      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          Nenhum comentário disponível para este elogio.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Mensagem quando não há elogios */}
            {elogiosDetalhados.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum elogio encontrado para a seleção atual.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

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
                  onClick={() => setItemSelecionado({
                    tipo: 'volume',
                    dados: 'todos'
                  })}
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
            
            {/* Legenda centralizada */}
            <div className="flex items-center justify-center text-sm mt-4 pt-4 border-t">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Validados</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Enviados</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Destaques ou Detalhes dos Elogios */}
        {itemSelecionado ? (
          <DetalhesElogios />
        ) : (
          <div className="space-y-4">
            {/* Top Colaborador Mensal */}
            <Card className="bg-white dark:bg-gray-800 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  {(() => {
                    // Calcular colaborador com mais elogios no período selecionado
                    let elogiosFiltrados = elogios?.filter(e => {
                      if (!e.data_resposta) return false;
                      const dataResposta = new Date(e.data_resposta);
                      
                      // Filtrar por ano
                      if (dataResposta.getFullYear() !== anoSelecionado) return false;
                      
                      // Filtrar por mês se selecionado
                      if (mesSelecionado !== 'todos') {
                        if (dataResposta.getMonth() + 1 !== mesSelecionado) return false;
                      }
                      
                      return e.status === 'compartilhado' || e.status === 'enviado';
                    }) || [];

                    // Contar elogios por prestador
                    const contagemPorPrestador: Record<string, number> = {};
                    elogiosFiltrados.forEach(elogio => {
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
                            <p className="text-xs text-gray-600 dark:text-gray-400">Nenhum elogio no período</p>
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
                          <p className="text-xs font-medium text-green-600 uppercase tracking-wide">
                            Top Colaborador {mesSelecionado === 'todos' ? 'Ano' : 'Mês'}
                          </p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white mt-1 uppercase">{nome}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{quantidade} {quantidade === 1 ? 'Elogio' : 'Elogios'} no período</p>
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

            {/* Maior Crescimento - Grupo */}
            <Card className="bg-white dark:bg-gray-800 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  {(() => {
                    // Função para obter grupo da categoria usando de_para_categoria e extrair primeira palavra
                    const obterGrupoSimplificado = (categoria: string): string => {
                      if (!categoria) return 'OUTROS';
                      
                      // Usar a função existente que faz o de-para com a tabela
                      const grupoCompleto = obterGrupoPorCategoria(categoria);
                      
                      if (!grupoCompleto) return 'OUTROS';
                      
                      // Extrair apenas a primeira palavra do grupo
                      const primeiraPalavra = grupoCompleto.split(/[\s-]+/)[0].trim().toUpperCase();
                      
                      return primeiraPalavra || 'OUTROS';
                    };

                    // Calcular crescimento por grupo baseado no filtro selecionado
                    let mesComparacao: number;
                    let anoComparacao: number;
                    let mesAnterior: number;
                    let anoAnterior: number;

                    if (mesSelecionado === 'todos') {
                      // Se "todos os meses", comparar ano atual vs ano anterior
                      mesComparacao = 0; // Não usado
                      anoComparacao = anoSelecionado;
                      mesAnterior = 0; // Não usado
                      anoAnterior = anoSelecionado - 1;
                    } else {
                      // Se mês específico, comparar mês selecionado vs mês anterior
                      mesComparacao = mesSelecionado as number;
                      anoComparacao = anoSelecionado;
                      mesAnterior = mesComparacao === 1 ? 12 : mesComparacao - 1;
                      anoAnterior = mesComparacao === 1 ? anoSelecionado - 1 : anoSelecionado;
                    }
                    
                    // Elogios do período atual
                    const elogiosPeriodoAtual = elogios?.filter(e => {
                      if (!e.data_resposta) return false;
                      const dataResposta = new Date(e.data_resposta);
                      
                      if (mesSelecionado === 'todos') {
                        return dataResposta.getFullYear() === anoComparacao &&
                               (e.status === 'compartilhado' || e.status === 'enviado');
                      } else {
                        return dataResposta.getMonth() + 1 === mesComparacao && 
                               dataResposta.getFullYear() === anoComparacao &&
                               (e.status === 'compartilhado' || e.status === 'enviado');
                      }
                    }) || [];
                    
                    // Elogios do período anterior
                    const elogiosPeriodoAnterior = elogios?.filter(e => {
                      if (!e.data_resposta) return false;
                      const dataResposta = new Date(e.data_resposta);
                      
                      if (mesSelecionado === 'todos') {
                        return dataResposta.getFullYear() === anoAnterior &&
                               (e.status === 'compartilhado' || e.status === 'enviado');
                      } else {
                        return dataResposta.getMonth() + 1 === mesAnterior && 
                               dataResposta.getFullYear() === anoAnterior &&
                               (e.status === 'compartilhado' || e.status === 'enviado');
                      }
                    }) || [];
                    
                    // Contar por grupo
                    const contagemAtual: Record<string, number> = {};
                    const contagemAnterior: Record<string, number> = {};
                    
                    elogiosPeriodoAtual.forEach(elogio => {
                      const categoria = elogio.pesquisa?.categoria || '';
                      const grupo = obterGrupoSimplificado(categoria);
                      contagemAtual[grupo] = (contagemAtual[grupo] || 0) + 1;
                    });
                    
                    elogiosPeriodoAnterior.forEach(elogio => {
                      const categoria = elogio.pesquisa?.categoria || '';
                      const grupo = obterGrupoSimplificado(categoria);
                      contagemAnterior[grupo] = (contagemAnterior[grupo] || 0) + 1;
                    });
                    
                    // Calcular crescimento - apenas valores positivos
                    let maiorCrescimento: { grupo: string; percentual: number } | null = null;
                    
                    Object.keys(contagemAtual).forEach(grupo => {
                      const atual = contagemAtual[grupo] || 0;
                      const anterior = contagemAnterior[grupo] || 0;
                      
                      if (anterior > 0) {
                        const crescimento = ((atual - anterior) / anterior) * 100;
                        // Só considerar crescimentos positivos
                        if (crescimento > 0 && (!maiorCrescimento || crescimento > maiorCrescimento.percentual)) {
                          maiorCrescimento = { grupo, percentual: crescimento };
                        }
                      } else if (atual > 0) {
                        // Novo grupo (crescimento infinito, consideramos 100%)
                        if (!maiorCrescimento || 100 > maiorCrescimento.percentual) {
                          maiorCrescimento = { grupo, percentual: 100 };
                        }
                      }
                    });
                    
                    if (!maiorCrescimento) {
                      return (
                        <>
                          <div>
                            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Maior Crescimento - Grupo</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">-</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Sem crescimento positivo</p>
                          </div>
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                          </div>
                        </>
                      );
                    }
                    
                    const sinal = maiorCrescimento.percentual >= 0 ? '+' : '';
                    const grupoFormatado = maiorCrescimento.grupo;
                    
                    return (
                      <>
                        <div>
                          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Maior Crescimento - Grupo</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{grupoFormatado}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {sinal}{maiorCrescimento.percentual.toFixed(0)}% vs período anterior
                          </p>
                        </div>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardHeader>
            </Card>

            {/* Maior Crescimento - Módulo */}
            <Card className="bg-white dark:bg-gray-800 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  {(() => {
                    // Função para extrair módulo da categoria (última parte após qualquer ponto)
                    const extrairModulo = (categoria: string): string => {
                      if (!categoria) return '';
                      const partes = categoria.split('.');
                      // Pegar apenas a última parte
                      return partes[partes.length - 1].trim();
                    };

                    // Calcular crescimento por módulo baseado no filtro selecionado
                    let mesComparacao: number;
                    let anoComparacao: number;
                    let mesAnterior: number;
                    let anoAnterior: number;

                    if (mesSelecionado === 'todos') {
                      // Se "todos os meses", comparar ano atual vs ano anterior
                      mesComparacao = 0; // Não usado
                      anoComparacao = anoSelecionado;
                      mesAnterior = 0; // Não usado
                      anoAnterior = anoSelecionado - 1;
                    } else {
                      // Se mês específico, comparar mês selecionado vs mês anterior
                      mesComparacao = mesSelecionado as number;
                      anoComparacao = anoSelecionado;
                      mesAnterior = mesComparacao === 1 ? 12 : mesComparacao - 1;
                      anoAnterior = mesComparacao === 1 ? anoSelecionado - 1 : anoSelecionado;
                    }
                    
                    // Elogios do período atual
                    const elogiosPeriodoAtual = elogios?.filter(e => {
                      if (!e.data_resposta) return false;
                      const dataResposta = new Date(e.data_resposta);
                      
                      if (mesSelecionado === 'todos') {
                        return dataResposta.getFullYear() === anoComparacao &&
                               (e.status === 'compartilhado' || e.status === 'enviado');
                      } else {
                        return dataResposta.getMonth() + 1 === mesComparacao && 
                               dataResposta.getFullYear() === anoComparacao &&
                               (e.status === 'compartilhado' || e.status === 'enviado');
                      }
                    }) || [];
                    
                    // Elogios do período anterior
                    const elogiosPeriodoAnterior = elogios?.filter(e => {
                      if (!e.data_resposta) return false;
                      const dataResposta = new Date(e.data_resposta);
                      
                      if (mesSelecionado === 'todos') {
                        return dataResposta.getFullYear() === anoAnterior &&
                               (e.status === 'compartilhado' || e.status === 'enviado');
                      } else {
                        return dataResposta.getMonth() + 1 === mesAnterior && 
                               dataResposta.getFullYear() === anoAnterior &&
                               (e.status === 'compartilhado' || e.status === 'enviado');
                      }
                    }) || [];
                    
                    // Contar por módulo
                    const contagemAtual: Record<string, number> = {};
                    const contagemAnterior: Record<string, number> = {};
                    
                    elogiosPeriodoAtual.forEach(elogio => {
                      const categoria = elogio.pesquisa?.categoria || '';
                      const modulo = extrairModulo(categoria);
                      if (modulo) {
                        contagemAtual[modulo] = (contagemAtual[modulo] || 0) + 1;
                      }
                    });
                    
                    elogiosPeriodoAnterior.forEach(elogio => {
                      const categoria = elogio.pesquisa?.categoria || '';
                      const modulo = extrairModulo(categoria);
                      if (modulo) {
                        contagemAnterior[modulo] = (contagemAnterior[modulo] || 0) + 1;
                      }
                    });
                    
                    // Calcular crescimento - apenas valores positivos
                    let maiorCrescimento: { modulo: string; percentual: number } | null = null;
                    
                    Object.keys(contagemAtual).forEach(modulo => {
                      const atual = contagemAtual[modulo] || 0;
                      const anterior = contagemAnterior[modulo] || 0;
                      
                      if (anterior > 0) {
                        const crescimento = ((atual - anterior) / anterior) * 100;
                        // Só considerar crescimentos positivos
                        if (crescimento > 0 && (!maiorCrescimento || crescimento > maiorCrescimento.percentual)) {
                          maiorCrescimento = { modulo, percentual: crescimento };
                        }
                      } else if (atual > 0) {
                        // Novo módulo (crescimento infinito, consideramos 100%)
                        if (!maiorCrescimento || 100 > maiorCrescimento.percentual) {
                          maiorCrescimento = { modulo, percentual: 100 };
                        }
                      }
                    });
                    
                    if (!maiorCrescimento) {
                      return (
                        <>
                          <div>
                            <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Maior Crescimento - Módulo</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">-</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Sem crescimento positivo</p>
                          </div>
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                            <Users className="h-4 w-4 text-purple-600" />
                          </div>
                        </>
                      );
                    }
                    
                    const sinal = maiorCrescimento.percentual >= 0 ? '+' : '';
                    // Exibir apenas o nome do módulo
                    const moduloFormatado = maiorCrescimento.modulo.toUpperCase();
                    
                    return (
                      <>
                        <div>
                          <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Maior Crescimento - Módulo</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{moduloFormatado}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {sinal}{maiorCrescimento.percentual.toFixed(0)}% vs período anterior
                          </p>
                        </div>
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                          <Users className="h-4 w-4 text-purple-600" />
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardHeader>
            </Card>
          </div>
        )}
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
                    <div 
                      key={empresa} 
                      className="space-y-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors"
                      onClick={() => setItemSelecionado({
                        tipo: 'empresa',
                        dados: obterNomeAbreviadoEmpresa(empresa)
                      })}
                    >
                      {/* Linha superior: nome da empresa e valores */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[180px]">
                          {obterNomeAbreviadoEmpresa(empresa)}
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

              // Contar elogios por prestador e mapear grupos
              const contagemPorPrestador: Record<string, number> = {};
              const gruposPorPrestador: Record<string, Record<string, number>> = {};
              
              elogiosAno.forEach(elogio => {
                const prestador = elogio.pesquisa?.prestador || 'Sem nome';
                const categoria = elogio.pesquisa?.categoria || '';
                const grupoMapeado = obterGrupoPorCategoria(categoria);
                
                // Contar elogios
                contagemPorPrestador[prestador] = (contagemPorPrestador[prestador] || 0) + 1;
                
                // Mapear grupos por prestador
                if (!gruposPorPrestador[prestador]) {
                  gruposPorPrestador[prestador] = {};
                }
                if (grupoMapeado) {
                  gruposPorPrestador[prestador][grupoMapeado] = (gruposPorPrestador[prestador][grupoMapeado] || 0) + 1;
                }
              });
              
              // Função para obter o grupo principal de um prestador
              const obterGrupoPrincipal = (prestador: string): string => {
                const grupos = gruposPorPrestador[prestador];
                if (!grupos || Object.keys(grupos).length === 0) return '';
                
                // Pegar o grupo com mais elogios
                const grupoPrincipal = Object.entries(grupos)
                  .sort((a, b) => b[1] - a[1])[0];
                
                return grupoPrincipal ? grupoPrincipal[0] : '';
              };

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
                      <div 
                        key={nome} 
                        className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                        onClick={() => setItemSelecionado({
                          tipo: 'colaborador',
                          dados: nome
                        })}
                      >
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
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {quantidade} {quantidade === 1 ? 'Elogio' : 'Elogios'}
                              </p>
                              {(() => {
                                const grupoPrincipal = obterGrupoPrincipal(nome);
                                return grupoPrincipal ? (
                                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                                    {grupoPrincipal}
                                  </span>
                                ) : null;
                              })()}
                            </div>
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
                    <div 
                      key={elogio.id} 
                      className="flex items-start gap-3 pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors"
                      onClick={() => setItemSelecionado({
                        tipo: 'elogio',
                        dados: elogio
                      })}
                    >
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
const MapeamentoElogios = ({ statsElogios, anoSelecionado, mesSelecionado, elogios }: { 
  statsElogios: any; 
  anoSelecionado: number;
  mesSelecionado: number | 'todos';
  elogios?: any[];
}) => {
  // Estado para controlar expansão das áreas
  const [areasExpandido, setAreasExpandido] = useState(false);
  
  // Estados para controlar seleção e detalhes (similar à aba Visão Geral)
  const [itemSelecionado, setItemSelecionado] = useState<{
    tipo: 'empresa' | 'colaborador' | 'grupo' | 'volume' | 'grupos-principais' | null;
    dados: any;
  } | null>({
    tipo: 'grupos-principais',
    dados: ['FISCAL', 'COMEX']
  });

  // Estado para controlar linhas expandidas
  const [linhasExpandidas, setLinhasExpandidas] = useState<Set<string>>(new Set());
  
  // Hook para buscar de-para de categorias
  const { data: deParaCategorias = [] } = useDeParaCategoria();

  // Hook para buscar empresas
  const { empresas } = useEmpresas();

  // Função para fazer de-para da categoria para grupo
  const obterGrupoPorCategoria = (categoria: string): string => {
    if (!categoria) return '';
    
    // Busca exata primeiro
    let deParaEncontrado = deParaCategorias.find(
      dp => dp.categoria === categoria
    );
    
    // Se não encontrar, tentar busca parcial (mais flexível)
    if (!deParaEncontrado) {
      deParaEncontrado = deParaCategorias.find(
        dp => categoria.includes(dp.categoria) || dp.categoria.includes(categoria)
      );
    }
    
    if (deParaEncontrado) {
      console.log('✅ De-para encontrado:', {
        categoria,
        grupoMapeado: deParaEncontrado.grupo
      });
      return deParaEncontrado.grupo;
    } else {
      console.log('❌ De-para NÃO encontrado para categoria:', categoria);
      console.log('📋 Categorias disponíveis:', deParaCategorias.map(dp => dp.categoria));
      return categoria; // Fallback para categoria original
    }
  };

  // Função para obter nome abreviado da empresa
  const obterNomeAbreviadoEmpresa = (nomeEmpresa: string): string => {
    if (!nomeEmpresa || nomeEmpresa === 'N/A') {
      return 'N/A';
    }
    
    // Buscar empresa correspondente pelo nome completo ou abreviado
    const empresaEncontrada = empresas.find(
      empresa => 
        empresa.nome_completo === nomeEmpresa || 
        empresa.nome_abreviado === nomeEmpresa ||
        empresa.nome_completo?.toLowerCase() === nomeEmpresa.toLowerCase() ||
        empresa.nome_abreviado?.toLowerCase() === nomeEmpresa.toLowerCase()
    );
    
    if (empresaEncontrada) {
      return empresaEncontrada.nome_abreviado || empresaEncontrada.nome_completo;
    }
    
    // Fallback para nome original
    return nomeEmpresa;
  };

  // Função para filtrar elogios baseado na seleção
  const obterElogiosFiltrados = () => {
    if (!itemSelecionado) return [];
    
    const elogiosFiltrados = elogios?.filter(e => {
      if (!e.data_resposta) return false;
      const dataResposta = new Date(e.data_resposta);
      
      // Filtrar por ano
      if (dataResposta.getFullYear() !== anoSelecionado) return false;
      
      // Filtrar por mês se selecionado
      if (mesSelecionado !== 'todos') {
        if (dataResposta.getMonth() + 1 !== mesSelecionado) return false;
      }
      
      return e.status === 'compartilhado' || e.status === 'enviado';
    }) || [];

    switch (itemSelecionado.tipo) {
      case 'empresa':
        return elogiosFiltrados.filter(e => 
          obterNomeAbreviadoEmpresa(e.pesquisa?.empresa || '') === itemSelecionado.dados
        );
      case 'colaborador':
        return elogiosFiltrados.filter(e => 
          e.pesquisa?.prestador === itemSelecionado.dados
        );
      case 'grupo':
        return elogiosFiltrados.filter(e => {
          const categoria = e.pesquisa?.categoria || '';
          const grupoMapeado = obterGrupoPorCategoria(categoria);
          
          // Se clicou em uma área específica (FISCAL, COMEX, QUALIDADE, BPO)
          // filtrar por grupos que começam com essa área
          if (itemSelecionado.dados === 'FISCAL') {
            return grupoMapeado.toUpperCase().includes('FISCAL');
          } else if (itemSelecionado.dados === 'COMEX') {
            return grupoMapeado.toUpperCase().includes('COMEX');
          } else if (itemSelecionado.dados === 'QUALIDADE') {
            return grupoMapeado.toUpperCase().includes('QUALIDADE');
          } else if (itemSelecionado.dados === 'BPO') {
            return grupoMapeado.toUpperCase().includes('BPO');
          } else {
            // Para grupos específicos, busca exata
            return grupoMapeado === itemSelecionado.dados;
          }
        });
      case 'grupos-principais':
        return elogiosFiltrados.filter(e => {
          const categoria = e.pesquisa?.categoria || '';
          const grupoMapeado = obterGrupoPorCategoria(categoria);
          
          // Filtrar por FISCAL e COMEX
          return grupoMapeado.toUpperCase().includes('FISCAL') || 
                 grupoMapeado.toUpperCase().includes('COMEX');
        });
      case 'volume':
        return elogiosFiltrados;
      default:
        return [];
    }
  };

  const elogiosDetalhados = obterElogiosFiltrados();

  // Função para alternar expansão de linha
  const toggleLinha = (elogioId: string) => {
    const novasLinhasExpandidas = new Set(linhasExpandidas);
    if (novasLinhasExpandidas.has(elogioId)) {
      novasLinhasExpandidas.delete(elogioId);
    } else {
      novasLinhasExpandidas.add(elogioId);
    }
    setLinhasExpandidas(novasLinhasExpandidas);
  };

  // Filtrar elogios baseado no ano e mês selecionados
  const elogiosFiltrados = elogios?.filter(e => {
    if (!e.data_resposta) return false;
    const dataResposta = new Date(e.data_resposta);
    
    // Filtrar por ano
    if (dataResposta.getFullYear() !== anoSelecionado) return false;
    
    // Filtrar por mês se selecionado
    if (mesSelecionado !== 'todos') {
      if (dataResposta.getMonth() + 1 !== mesSelecionado) return false;
    }
    
    return e.status === 'compartilhado' || e.status === 'enviado';
  }) || [];

  // Para comparação mensal (quando mês específico selecionado)
  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();
  
  const elogiosMesAtual = elogios?.filter(e => {
    if (!e.data_resposta) return false;
    const dataResposta = new Date(e.data_resposta);
    return dataResposta.getMonth() + 1 === mesAtual && 
           dataResposta.getFullYear() === anoAtual &&
           (e.status === 'compartilhado' || e.status === 'enviado');
  }) || [];

  // Top grupos baseado no filtro selecionado
  const contagemPeriodo: Record<string, number> = {};
  elogiosFiltrados.forEach(elogio => {
    const categoria = elogio.pesquisa?.categoria || '';
    const grupoMapeado = obterGrupoPorCategoria(categoria);
    if (grupoMapeado) {
      contagemPeriodo[grupoMapeado] = (contagemPeriodo[grupoMapeado] || 0) + 1;
    }
  });
  const topPeriodo = Object.entries(contagemPeriodo).sort((a, b) => b[1] - a[1])[0];

  // Top grupos do mês atual (para comparação quando necessário)
  const contagemMes: Record<string, number> = {};
  elogiosMesAtual.forEach(elogio => {
    const categoria = elogio.pesquisa?.categoria || '';
    const grupoMapeado = obterGrupoPorCategoria(categoria);
    if (grupoMapeado) {
      contagemMes[grupoMapeado] = (contagemMes[grupoMapeado] || 0) + 1;
    }
  });
  const topMes = Object.entries(contagemMes).sort((a, b) => b[1] - a[1])[0];

  // Top grupos do ano completo (para comparação quando necessário)
  const elogiosAnoCompleto = elogios?.filter(e => {
    if (!e.data_resposta) return false;
    const dataResposta = new Date(e.data_resposta);
    return dataResposta.getFullYear() === anoSelecionado &&
           (e.status === 'compartilhado' || e.status === 'enviado');
  }) || [];
  
  const contagemAno: Record<string, number> = {};
  elogiosAnoCompleto.forEach(elogio => {
    const categoria = elogio.pesquisa?.categoria || '';
    const grupoMapeado = obterGrupoPorCategoria(categoria);
    if (grupoMapeado) {
      contagemAno[grupoMapeado] = (contagemAno[grupoMapeado] || 0) + 1;
    }
  });
  const topAno = Object.entries(contagemAno).sort((a, b) => b[1] - a[1])[0];

  // Total de colaboradores únicos
  const colaboradoresUnicos = new Set(elogiosFiltrados.map(e => e.pesquisa?.prestador).filter(Boolean)).size;

  // Setor em alta baseado no período selecionado
  const setorDestaque = topPeriodo;

  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Destaque do {mesSelecionado === 'todos' ? 'Ano' : 'Mês'}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {topPeriodo ? topPeriodo[0] : '-'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {topPeriodo ? `${topPeriodo[1]} ${topPeriodo[1] === 1 ? 'Elogio' : 'Elogios'}` : 'Nenhum elogio'}
              </p>
            </div>
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <Award className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {mesSelecionado === 'todos' ? 'Destaque Geral' : 'Destaque do Ano'}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {mesSelecionado === 'todos' ? (topAno ? topAno[0] : '-') : (topAno ? topAno[0] : '-')}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {mesSelecionado === 'todos' 
                  ? (topAno ? `${topAno[1]} ${topAno[1] === 1 ? 'Elogio' : 'Elogios'} no ano` : 'Nenhum elogio')
                  : (topAno ? `${topAno[1]} ${topAno[1] === 1 ? 'Elogio' : 'Elogios'} no ano` : 'Nenhum elogio')
                }
              </p>
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
                <p className="text-2xl font-bold">{colaboradoresUnicos}</p>
                <span className="text-xs font-medium text-green-600">colaboradores</span>
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
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {setorDestaque ? setorDestaque[0].split(/[\s-]+/)[0].trim().toUpperCase() : '-'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {setorDestaque 
                  ? `${setorDestaque[1]} ${setorDestaque[1] === 1 ? 'Elogio' : 'Elogios'} ${mesSelecionado === 'todos' ? 'no ano' : 'no mês'}`
                  : 'Sem dados'
                }
              </p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 - Período Selecionado */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg font-semibold">
                  Top 5 Grupos - {mesSelecionado === 'todos' ? 'Ano' : 'Mês Selecionado'}
                </CardTitle>
              </div>
              <span className="text-xs text-gray-500">
                {mesSelecionado === 'todos' 
                  ? `Ano ${anoSelecionado}`
                  : `${new Date(2000, mesSelecionado - 1).toLocaleDateString('pt-BR', { month: 'long' })} ${anoSelecionado}`
                }
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(contagemPeriodo)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([nome, quantidade], index) => {
                  const cores = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500'];
                  const porcentagem = Object.values(contagemPeriodo).reduce((a, b) => a + b, 0) > 0 
                    ? (quantidade / Object.values(contagemPeriodo).reduce((a, b) => a + b, 0)) * 100 
                    : 0;
                  
                  return (
                    <div 
                      key={nome} 
                      className="space-y-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                      onClick={() => setItemSelecionado({
                        tipo: 'grupo',
                        dados: nome
                      })}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{nome}</span>
                        <span className="text-gray-600 dark:text-gray-400">{quantidade}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`${cores[index]} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${porcentagem}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              }
              {Object.keys(contagemPeriodo).length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Nenhum grupo com elogios no período selecionado
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top 5 - Acumulado do Ano */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg font-semibold">Top 5 Grupos - Acumulado do Ano</CardTitle>
              </div>
              <span className="text-xs text-gray-500">Ano {anoSelecionado}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(contagemAno)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([nome, quantidade], index) => {
                  const cores = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500'];
                  const porcentagem = Object.values(contagemAno).reduce((a, b) => a + b, 0) > 0 
                    ? (quantidade / Object.values(contagemAno).reduce((a, b) => a + b, 0)) * 100 
                    : 0;
                  
                  return (
                    <div 
                      key={nome} 
                      className="space-y-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                      onClick={() => setItemSelecionado({
                        tipo: 'grupo',
                        dados: nome
                      })}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{nome}</span>
                        <span className="text-gray-600 dark:text-gray-400">{quantidade}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`${cores[index]} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${porcentagem}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              }
              {Object.keys(contagemAno).length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Nenhum grupo com elogios este ano
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detalhes dos Elogios ou Distribuição por Área */}
        {itemSelecionado ? (
          <Card className="bg-white dark:bg-gray-800 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">
                    Detalhes dos Elogios
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {itemSelecionado.tipo === 'empresa' && `Empresa: ${itemSelecionado.dados}`}
                    {itemSelecionado.tipo === 'colaborador' && `Colaborador: ${itemSelecionado.dados}`}
                    {itemSelecionado.tipo === 'grupo' && `Grupo: ${itemSelecionado.dados}`}
                    {itemSelecionado.tipo === 'grupos-principais' && 'Grupos: FISCAL e COMEX'}
                    {itemSelecionado.tipo === 'volume' && 'Todos os Elogios do Período'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setItemSelecionado(null)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Fechar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total de elogios encontrados: {elogiosDetalhados.length}
                </div>
                
                {/* Cabeçalho da tabela */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                  <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <div className="col-span-2">Nº Chamado</div>
                    <div className="col-span-2">Empresa</div>
                    <div className="col-span-3">Colaborador</div>
                    <div className="col-span-2">Data Resposta</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-1 text-center"></div>
                  </div>
                </div>
                
                {/* Lista de elogios como linhas expansíveis */}
                <div className="max-h-96 overflow-y-auto space-y-1">
                  {elogiosDetalhados.map((elogio, index) => {
                    const elogioId = elogio.id || `elogio-${index}`;
                    const isExpanded = linhasExpandidas.has(elogioId);
                    
                    return (
                      <div key={elogioId} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        {/* Linha principal (sempre visível) */}
                        <div 
                          className="grid grid-cols-12 gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                          onClick={() => toggleLinha(elogioId)}
                        >
                          <div className="col-span-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {elogio.pesquisa?.nro_caso || 'N/A'}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {obterNomeAbreviadoEmpresa(elogio.pesquisa?.empresa || 'N/A')}
                            </span>
                          </div>
                          <div className="col-span-3">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {elogio.pesquisa?.prestador || 'N/A'}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {elogio.data_resposta ? new Date(elogio.data_resposta).toLocaleDateString('pt-BR') : 'N/A'}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              elogio.status === 'enviado' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                            }`}>
                              {elogio.status === 'enviado' ? 'Enviado' : 'Validado'}
                            </span>
                          </div>
                          <div className="col-span-1 text-center">
                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`} />
                          </div>
                        </div>
                        
                        {/* Conteúdo expandido (comentário) */}
                        {isExpanded && elogio.pesquisa?.comentario_pesquisa && (
                          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                            <div className="space-y-2">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                Comentário:
                              </span>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {elogio.pesquisa.comentario_pesquisa}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Mensagem quando não há comentário */}
                        {isExpanded && !elogio.pesquisa?.comentario_pesquisa && (
                          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                              Nenhum comentário disponível para este elogio.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Mensagem quando não há elogios */}
                {elogiosDetalhados.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum elogio encontrado para a seleção atual.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white dark:bg-gray-800 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-orange-600" />
                <CardTitle className="text-sm font-semibold">Clique nos itens para ver detalhes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um item nos gráficos ou cards acima para ver os detalhes dos elogios.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Distribuição por Área */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-green-600" />
                <CardTitle className="text-sm font-semibold">Distribuição por Área</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAreasExpandido(!areasExpandido)}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors duration-200"
                  title={areasExpandido ? 'Mostrar apenas principais (FISCAL e COMEX)' : 'Mostrar todas as áreas'}
                >
                  {areasExpandido ? 'Principais' : 'Todas'}
                </button>
                <span className="text-xs text-gray-500">
                  {mesSelecionado === 'todos' 
                    ? `Ano ${anoSelecionado}`
                    : `${new Date(2000, mesSelecionado - 1).toLocaleDateString('pt-BR', { month: 'long' })} ${anoSelecionado}`
                  }
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                // Contar pesquisas por área (COMEX, FISCAL, QUALIDADE, BPO)
                const contagemAreas: Record<string, number> = {
                  'COMEX': 0,
                  'FISCAL': 0,
                  'QUALIDADE': 0,
                  'BPO': 0
                };
                
                // Debug: Log dos grupos para investigação
                console.log('🔍 Debug Distribuição por Área:');
                console.log('Total de elogios filtrados:', elogiosFiltrados.length);
                
                const gruposUnicos = new Set();
                
                elogiosFiltrados.forEach(elogio => {
                  const categoria = elogio.pesquisa?.categoria || '';
                  const grupoOriginal = elogio.pesquisa?.grupo || '';
                  
                  // Fazer de-para da categoria para obter o grupo correto
                  const grupoMapeado = obterGrupoPorCategoria(categoria);
                  
                  gruposUnicos.add(`${categoria} → ${grupoMapeado}`);
                  
                  // Classificar baseado no grupo mapeado
                  const grupoUpper = grupoMapeado.toUpperCase();
                  
                  console.log('🔄 De-para:', {
                    categoria,
                    grupoOriginal,
                    grupoMapeado,
                    elogioId: elogio.id
                  });
                  
                  // Lógica de classificação baseada no grupo mapeado
                  if (
                    grupoUpper.includes('COMEX') || 
                    grupoUpper.includes('CÂMBIO') || 
                    grupoUpper.includes('CAMBIO') ||
                    grupoUpper.includes('CE+') ||
                    grupoUpper.includes('EXPORTAÇÃO') ||
                    grupoUpper.includes('IMPORTAÇÃO')
                  ) {
                    contagemAreas['COMEX']++;
                    console.log('📊 COMEX encontrado:', grupoMapeado);
                  } else if (
                    grupoUpper.includes('FISCAL') || 
                    grupoUpper.includes('TRIBUTÁRIO') || 
                    grupoUpper.includes('TRIBUTARIO') ||
                    grupoUpper.includes('TRIBUT') ||
                    grupoUpper.includes('IMPOSTO') ||
                    grupoUpper.includes('FISC') ||
                    grupoUpper.includes('COMPLY') ||
                    grupoUpper.includes('PW_SATI') ||
                    grupoUpper.includes('GALLERY') ||
                    grupoUpper.includes('NF-E') ||
                    grupoUpper.includes('NFS-E') ||
                    grupoUpper.includes('SPED') ||
                    grupoUpper.includes('REINF') ||
                    grupoUpper.includes('ICMS') ||
                    grupoUpper.includes('CIAP') ||
                    grupoUpper.includes('EFD')
                  ) {
                    contagemAreas['FISCAL']++;
                    console.log('📊 FISCAL encontrado:', grupoMapeado);
                  } else if (grupoUpper.includes('QUALIDADE') || grupoUpper.includes('QUALITY')) {
                    contagemAreas['QUALIDADE']++;
                    console.log('📊 QUALIDADE encontrado:', grupoMapeado);
                  } else if (
                    grupoUpper.includes('BPO') || 
                    grupoUpper.includes('BUSINESS PROCESS') ||
                    grupoUpper.includes('ADMINISTRAÇÃO') ||
                    grupoUpper.includes('ADMIN')
                  ) {
                    contagemAreas['BPO']++;
                    console.log('📊 BPO encontrado:', grupoMapeado);
                  } else {
                    console.log('❌ Grupo não classificado:', {
                      categoria,
                      grupoMapeado,
                      grupoUpper
                    });
                  }
                });
                
                console.log('Grupos únicos encontrados:', Array.from(gruposUnicos));
                console.log('Contagem por área:', contagemAreas);
                console.log('📊 RESUMO FINAL:');
                console.log('  - Total de elogios processados:', elogiosFiltrados.length);
                console.log('  - Total classificado nas áreas:', Object.values(contagemAreas).reduce((a, b) => a + b, 0));
                console.log('  - COMEX:', contagemAreas['COMEX']);
                console.log('  - FISCAL:', contagemAreas['FISCAL']);
                console.log('  - QUALIDADE:', contagemAreas['QUALIDADE']);
                console.log('  - BPO:', contagemAreas['BPO']);
                
                const totalPesquisas = Object.values(contagemAreas).reduce((a, b) => a + b, 0);
                
                // Preparar dados para o gráfico de pizza
                let dadosPizza = [
                  { nome: 'FISCAL', valor: contagemAreas['FISCAL'], cor: '#3b82f6' },
                  { nome: 'COMEX', valor: contagemAreas['COMEX'], cor: '#8b5cf6' },
                  { nome: 'QUALIDADE', valor: contagemAreas['QUALIDADE'], cor: '#10b981' },
                  { nome: 'BPO', valor: contagemAreas['BPO'], cor: '#f59e0b' }
                ].filter(item => item.valor > 0); // Só mostra áreas com pesquisas
                
                // Se expandido (modo todas), mostrar todas as áreas
                // Se não expandido (modo principais), mostrar apenas FISCAL e COMEX
                if (areasExpandido) {
                  // Modo "Todas" - mostrar todas as áreas (não filtrar)
                  // dadosPizza já contém todas as áreas
                } else {
                  // Modo "Principais" - mostrar apenas FISCAL e COMEX
                  dadosPizza = dadosPizza.filter(item => item.nome === 'FISCAL' || item.nome === 'COMEX');
                }
                
                // Ordenar por valor (maior primeiro)
                dadosPizza.sort((a, b) => b.valor - a.valor);
                
                if (dadosPizza.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      {areasExpandido 
                        ? 'Nenhuma pesquisa encontrada para todas as áreas'
                        : 'Nenhuma pesquisa encontrada para FISCAL e COMEX'
                      }
                    </div>
                  );
                }
                
                return (
                  <div className="flex flex-col items-center space-y-6">
                    {/* Gráfico de Pizza Centralizado */}
                    <div className="flex justify-center">
                      <ResponsiveContainer width={280} height={280}>
                        <RechartsPieChart>
                          <Pie
                            data={dadosPizza}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="valor"
                            strokeWidth={0}
                            label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                              // Calcular porcentagem baseada apenas nas áreas visíveis
                              const totalVisivel = dadosPizza.reduce((acc, item) => acc + item.valor, 0);
                              const porcentagem = totalVisivel > 0 ? (value / totalVisivel) * 100 : 0;
                              if (porcentagem < 3) return null;
                              
                              const RADIAN = Math.PI / 180;
                              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                              const x = cx + radius * Math.cos(-midAngle * RADIAN);
                              const y = cy + radius * Math.sin(-midAngle * RADIAN);
                              
                              return (
                                <text 
                                  x={x} 
                                  y={y} 
                                  fill="white" 
                                  textAnchor="middle" 
                                  dominantBaseline="central"
                                  fontSize="9"
                                  fontWeight="200"
                                >
                                  {`${porcentagem.toFixed(1)}%`}
                                </text>
                              );
                            }}
                            labelLine={false}
                          >
                            {dadosPizza.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.cor} 
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  console.log('🖱️ Clique na célula:', entry.nome);
                                  setItemSelecionado({
                                    tipo: 'grupo',
                                    dados: entry.nome
                                  });
                                }}
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any, name: string, props: any) => {
                              // Calcular porcentagem baseada apenas nas áreas visíveis
                              const totalVisivel = dadosPizza.reduce((acc, item) => acc + item.valor, 0);
                              const porcentagem = totalVisivel > 0 ? (value / totalVisivel) * 100 : 0;
                              const nomeArea = props?.payload?.nome || name;
                              return [`${value} (${porcentagem.toFixed(1)}%)`, nomeArea];
                            }}
                            contentStyle={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              fontSize: '12px'
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Legenda em Uma Linha */}
                    <div className="flex items-center justify-center gap-6 flex-wrap">
                      {dadosPizza.map((area) => {
                        return (
                          <div key={area.nome} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: area.cor }}
                            ></div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {area.nome}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Componente de Seleção Múltipla Personalizada
interface MultiSelectProps {
  options: string[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder: string;
  searchPlaceholder: string;
}

const MultiSelect = ({ options, selected, onSelectionChange, placeholder, searchPlaceholder }: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleOption = (option: string) => {
    if (selected.includes(option)) {
      onSelectionChange(selected.filter(item => item !== option));
    } else {
      onSelectionChange([...selected, option]);
    }
  };

  const handleRemoveTag = (option: string) => {
    onSelectionChange(selected.filter(item => item !== option));
  };

  const handleSelectAll = () => {
    onSelectionChange(filteredOptions);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Campo principal com tags selecionadas */}
      <div 
        className="min-h-[42px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1">
          {selected.map(item => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-2.5 py-0.5 text-xs font-medium text-white"
            >
              {item}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTag(item);
                }}
                className="ml-1 hover:bg-blue-600 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {selected.length === 0 && (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`absolute right-3 top-3 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown com opções */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg">
          {/* Campo de busca */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Botões de controle */}
          <div className="p-2 border-b flex gap-2">
            <button
              onClick={handleSelectAll}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Selecionar todos
            </button>
            <button
              onClick={handleClearAll}
              className="text-xs text-gray-600 hover:text-gray-800 font-medium"
            >
              Limpar seleção
            </button>
          </div>

          {/* Lista de opções */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                Nenhum item encontrado
              </div>
            ) : (
              filteredOptions.map(option => (
                <div
                  key={option}
                  className="flex items-center space-x-2 p-2 hover:bg-accent cursor-pointer"
                  onClick={() => handleToggleOption(option)}
                >
                  <Checkbox
                    checked={selected.includes(option)}
                    onChange={() => {}} // Controlado pelo onClick do div
                  />
                  <span className="text-sm flex-1">{option}</span>
                </div>
              ))
            )}
          </div>

          {/* Contador de selecionados */}
          {selected.length > 0 && (
            <div className="p-2 border-t bg-muted/50">
              <span className="text-xs text-muted-foreground">
                {selected.length} item(ns) selecionado(s)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Componente Volume
const VolumeElogios = ({ statsElogios, anoSelecionado, mesSelecionado, elogios }: { 
  statsElogios: any; 
  anoSelecionado: number;
  mesSelecionado: number | 'todos';
  elogios?: any[];
}) => {
  // Estados para filtros múltiplos
  const [colaboradoresSelecionados, setColaboradoresSelecionados] = useState<string[]>([]);
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<string[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState<'colaborador' | 'empresa'>('colaborador');

  // Hook para buscar empresas
  const { empresas } = useEmpresas();

  // Função para obter nome abreviado da empresa
  const obterNomeAbreviadoEmpresa = (nomeEmpresa: string): string => {
    if (!nomeEmpresa || nomeEmpresa === 'N/A') {
      return 'N/A';
    }
    
    const empresaEncontrada = empresas.find(
      empresa => 
        empresa.nome_completo === nomeEmpresa || 
        empresa.nome_abreviado === nomeEmpresa ||
        empresa.nome_completo?.toLowerCase() === nomeEmpresa.toLowerCase() ||
        empresa.nome_abreviado?.toLowerCase() === nomeEmpresa.toLowerCase()
    );
    
    if (empresaEncontrada) {
      return empresaEncontrada.nome_abreviado || empresaEncontrada.nome_completo;
    }
    
    return nomeEmpresa;
  };

  // Filtrar elogios do ano
  const elogiosFiltrados = elogios?.filter(e => {
    if (!e.data_resposta) return false;
    const dataResposta = new Date(e.data_resposta);
    return dataResposta.getFullYear() === anoSelecionado &&
           (e.status === 'compartilhado' || e.status === 'enviado');
  }) || [];

  // Aplicar filtros múltiplos
  const elogiosFiltradosComFiltro = elogiosFiltrados.filter(elogio => {
    if (tipoFiltro === 'colaborador' && colaboradoresSelecionados.length > 0) {
      const prestador = elogio.pesquisa?.prestador || '';
      return colaboradoresSelecionados.includes(prestador);
    }
    
    if (tipoFiltro === 'empresa' && empresasSelecionadas.length > 0) {
      const empresa = elogio.pesquisa?.empresa || '';
      const nomeAbreviado = obterNomeAbreviadoEmpresa(empresa);
      return empresasSelecionadas.includes(nomeAbreviado);
    }
    
    return true;
  });

  // Obter listas únicas para os filtros
  const colaboradoresUnicos = [...new Set(elogiosFiltrados.map(e => e.pesquisa?.prestador).filter(Boolean))].sort();
  const empresasUnicas = [...new Set(elogiosFiltrados.map(e => {
    const empresa = e.pesquisa?.empresa;
    return empresa ? obterNomeAbreviadoEmpresa(empresa) : null;
  }).filter(Boolean))].sort();

  // Calcular dados por mês para comparação múltipla
  const dadosPorMes = useMemo(() => {
    const meses = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    
    if (tipoFiltro === 'colaborador' && colaboradoresSelecionados.length > 0) {
      // Dados separados por colaborador
      const dadosPorColaborador: Record<string, Record<number, number>> = {};
      
      colaboradoresSelecionados.forEach(colaborador => {
        dadosPorColaborador[colaborador] = {};
      });
      
      elogiosFiltrados.forEach(elogio => {
        const prestador = elogio.pesquisa?.prestador || '';
        if (colaboradoresSelecionados.includes(prestador)) {
          const dataResposta = new Date(elogio.data_resposta!);
          const mes = dataResposta.getMonth() + 1;
          dadosPorColaborador[prestador][mes] = (dadosPorColaborador[prestador][mes] || 0) + 1;
        }
      });
      
      return meses.map((nome, index) => {
        const dadosMes: any = { mes: nome };
        colaboradoresSelecionados.forEach(colaborador => {
          dadosMes[colaborador] = dadosPorColaborador[colaborador][index + 1] || 0;
        });
        return dadosMes;
      });
    }
    
    if (tipoFiltro === 'empresa' && empresasSelecionadas.length > 0) {
      // Dados separados por empresa
      const dadosPorEmpresa: Record<string, Record<number, number>> = {};
      
      empresasSelecionadas.forEach(empresa => {
        dadosPorEmpresa[empresa] = {};
      });
      
      elogiosFiltrados.forEach(elogio => {
        const empresa = elogio.pesquisa?.empresa || '';
        const nomeAbreviado = obterNomeAbreviadoEmpresa(empresa);
        if (empresasSelecionadas.includes(nomeAbreviado)) {
          const dataResposta = new Date(elogio.data_resposta!);
          const mes = dataResposta.getMonth() + 1;
          dadosPorEmpresa[nomeAbreviado][mes] = (dadosPorEmpresa[nomeAbreviado][mes] || 0) + 1;
        }
      });
      
      return meses.map((nome, index) => {
        const dadosMes: any = { mes: nome };
        empresasSelecionadas.forEach(empresa => {
          dadosMes[empresa] = dadosPorEmpresa[empresa][index + 1] || 0;
        });
        return dadosMes;
      });
    }
    
    // Dados totais quando nenhum filtro específico
    const contagemPorMes: Record<number, number> = {};
    
    elogiosFiltradosComFiltro.forEach(elogio => {
      const dataResposta = new Date(elogio.data_resposta!);
      const mes = dataResposta.getMonth() + 1;
      contagemPorMes[mes] = (contagemPorMes[mes] || 0) + 1;
    });
    
    return meses.map((nome, index) => ({
      mes: nome,
      elogios: contagemPorMes[index + 1] || 0
    }));
  }, [elogiosFiltrados, colaboradoresSelecionados, empresasSelecionadas, tipoFiltro]);

  // Calcular estatísticas
  const mesAtual = new Date().getMonth() + 1;
  const elogiosMesAtual = elogiosFiltradosComFiltro.filter(e => {
    const dataResposta = new Date(e.data_resposta!);
    return dataResposta.getMonth() + 1 === mesAtual;
  });

  const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
  const anoAnterior = mesAtual === 1 ? anoSelecionado - 1 : anoSelecionado;
  const elogiosMesAnterior = elogios?.filter(e => {
    if (!e.data_resposta) return false;
    const dataResposta = new Date(e.data_resposta);
    return dataResposta.getMonth() + 1 === mesAnterior && 
           dataResposta.getFullYear() === anoAnterior &&
           (e.status === 'compartilhado' || e.status === 'enviado');
  }) || [];

  const crescimento = elogiosMesAnterior.length > 0 
    ? ((elogiosMesAtual.length - elogiosMesAnterior.length) / elogiosMesAnterior.length) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Linha com botões de filtro e seleção múltipla */}
            <div className="flex flex-col lg:flex-row gap-4 items-start">
              {/* Botões de tipo de filtro */}
              <div className="flex-shrink-0">
                <Label className="text-sm font-medium mb-2 block">Filtrar por:</Label>
                <div className="flex gap-2">
                  <Button
                    variant={tipoFiltro === 'colaborador' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setTipoFiltro('colaborador');
                      setColaboradoresSelecionados([]);
                      setEmpresasSelecionadas([]);
                    }}
                  >
                    Colaborador
                  </Button>
                  <Button
                    variant={tipoFiltro === 'empresa' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setTipoFiltro('empresa');
                      setColaboradoresSelecionados([]);
                      setEmpresasSelecionadas([]);
                    }}
                  >
                    Empresa
                  </Button>
                </div>
              </div>

              {/* Seleção múltipla de colaboradores */}
              {tipoFiltro === 'colaborador' && (
                <div className="flex-1 min-w-0">
                  <Label className="text-sm font-medium mb-2 block">Colaboradores para comparação:</Label>
                  <MultiSelect
                    options={colaboradoresUnicos}
                    selected={colaboradoresSelecionados}
                    onSelectionChange={setColaboradoresSelecionados}
                    placeholder="Selecione colaboradores para comparar..."
                    searchPlaceholder="Buscar colaborador..."
                  />
                </div>
              )}

              {/* Seleção múltipla de empresas */}
              {tipoFiltro === 'empresa' && (
                <div className="flex-1 min-w-0">
                  <Label className="text-sm font-medium mb-2 block">Empresas para comparação:</Label>
                  <MultiSelect
                    options={empresasUnicas}
                    selected={empresasSelecionadas}
                    onSelectionChange={setEmpresasSelecionadas}
                    placeholder="Selecione empresas para comparar..."
                    searchPlaceholder="Buscar empresa..."
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Elogios no Mês</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{elogiosMesAtual.length}</p>
                <span className={`text-xs font-medium ${crescimento >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {crescimento >= 0 ? '+' : ''}{crescimento.toFixed(0)}%
                </span>
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
              <p className="text-2xl font-bold">{elogiosFiltradosComFiltro.length}</p>
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
              <p className="text-2xl font-bold">{new Set(elogiosFiltradosComFiltro.map(e => e.pesquisa?.prestador).filter(Boolean)).size}</p>
            </div>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Users className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Categorias Citadas</p>
              <p className="text-2xl font-bold">{new Set(elogiosFiltradosComFiltro.map(e => e.pesquisa?.categoria).filter(Boolean)).size}</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Building2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Gráfico de Volume por Mês */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Volume de Elogios por Mês - Comparação</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {tipoFiltro === 'colaborador' && colaboradoresSelecionados.length > 0
              ? `Comparando ${colaboradoresSelecionados.length} colaborador(es): ${colaboradoresSelecionados.slice(0, 3).join(', ')}${colaboradoresSelecionados.length > 3 ? '...' : ''}`
              : tipoFiltro === 'empresa' && empresasSelecionadas.length > 0
              ? `Comparando ${empresasSelecionadas.length} empresa(s): ${empresasSelecionadas.slice(0, 3).join(', ')}${empresasSelecionadas.length > 3 ? '...' : ''}`
              : 'Todos os elogios - Selecione itens para comparação'
            }
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                // Cores para as linhas
                const cores = [
                  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
                  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
                ];

                if (tipoFiltro === 'colaborador' && colaboradoresSelecionados.length > 0) {
                  return (
                    <AreaChart data={dadosPorMes} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <XAxis 
                        dataKey="mes" 
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
                        content={({ active, payload, label }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          
                          // Quebrar dados em colunas de máximo 10 itens
                          const maxItemsPerColumn = 10;
                          const columns = [];
                          
                          for (let i = 0; i < payload.length; i += maxItemsPerColumn) {
                            columns.push(payload.slice(i, i + maxItemsPerColumn));
                          }
                          
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-4xl">
                              <p className="font-semibold mb-2 text-gray-800">Mês: {label}</p>
                              <div className="flex gap-6">
                                {columns.map((column, columnIndex) => (
                                  <div key={columnIndex} className="flex flex-col gap-1">
                                    {column.map((entry, index) => (
                                      <div key={index} className="flex items-center gap-2 text-sm">
                                        <div 
                                          className="w-3 h-3 rounded-full" 
                                          style={{ backgroundColor: entry.color }}
                                        />
                                        <span className="text-gray-700">
                                          {entry.name}: {entry.value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Legend />
                      {colaboradoresSelecionados.map((colaborador, index) => (
                        <Area
                          key={colaborador}
                          type="monotone"
                          dataKey={colaborador}
                          stroke={cores[index % cores.length]}
                          strokeWidth={2}
                          fillOpacity={0.1}
                          fill={cores[index % cores.length]}
                        />
                      ))}
                    </AreaChart>
                  );
                }

                if (tipoFiltro === 'empresa' && empresasSelecionadas.length > 0) {
                  return (
                    <AreaChart data={dadosPorMes} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <XAxis 
                        dataKey="mes" 
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
                        content={({ active, payload, label }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          
                          // Quebrar dados em colunas de máximo 10 itens
                          const maxItemsPerColumn = 10;
                          const columns = [];
                          
                          for (let i = 0; i < payload.length; i += maxItemsPerColumn) {
                            columns.push(payload.slice(i, i + maxItemsPerColumn));
                          }
                          
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-4xl">
                              <p className="font-semibold mb-2 text-gray-800">Mês: {label}</p>
                              <div className="flex gap-6">
                                {columns.map((column, columnIndex) => (
                                  <div key={columnIndex} className="flex flex-col gap-1">
                                    {column.map((entry, index) => (
                                      <div key={index} className="flex items-center gap-2 text-sm">
                                        <div 
                                          className="w-3 h-3 rounded-full" 
                                          style={{ backgroundColor: entry.color }}
                                        />
                                        <span className="text-gray-700">
                                          {entry.name}: {entry.value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Legend />
                      {empresasSelecionadas.map((empresa, index) => (
                        <Area
                          key={empresa}
                          type="monotone"
                          dataKey={empresa}
                          stroke={cores[index % cores.length]}
                          strokeWidth={2}
                          fillOpacity={0.1}
                          fill={cores[index % cores.length]}
                        />
                      ))}
                    </AreaChart>
                  );
                }

                // Gráfico padrão quando nenhum filtro específico
                return (
                  <AreaChart data={dadosPorMes} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorElogios" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="mes" 
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
                      formatter={(value: any) => [value, 'Elogios']}
                      labelFormatter={(label) => `Mês: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="elogios"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorElogios)"
                    />
                  </AreaChart>
                );
              })()}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente Motivos (implementação concisa)
const MotivosElogios = ({ statsElogios, anoSelecionado, mesSelecionado, elogios }: { 
  statsElogios: any; 
  anoSelecionado: number;
  mesSelecionado: number | 'todos';
  elogios?: any[];
}) => {
  const elogiosFiltrados = elogios?.filter(e => {
    if (!e.data_resposta) return false;
    const dataResposta = new Date(e.data_resposta);
    return dataResposta.getFullYear() === anoSelecionado &&
           (e.status === 'compartilhado' || e.status === 'enviado');
  }) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Motivos Identificados</p>
              <p className="text-2xl font-bold">{elogiosFiltrados.length}</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Heart className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
        </Card>
      </div>
      
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Análise de Motivos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Análise de {elogiosFiltrados.length} elogios para identificar motivos principais
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente Pesquisas (implementação concisa)
const PesquisasElogios = ({ statsElogios, anoSelecionado, mesSelecionado, elogios }: { 
  statsElogios: any; 
  anoSelecionado: number;
  mesSelecionado: number | 'todos';
  elogios?: any[];
}) => {
  // Hook para buscar estatísticas de pesquisas do SQL Server (sempre todos os grupos)
  const { data: estatisticasPesquisas, isLoading: loadingEstatisticas, error } = useEstatisticasPesquisas(
    anoSelecionado, 
    'todos'
  );
  
  // Garantir que temos dados válidos com cast explícito
  const stats: EstatisticasPesquisas = (estatisticasPesquisas as EstatisticasPesquisas) ?? {
    total_enviadas: 0,
    total_respondidas: 0,
    total_nao_respondidas: 0,
    taxa_resposta: 0
  };
  
  // Dados dos elogios filtrados (apenas para comparação)
  const elogiosFiltrados = elogios?.filter(e => {
    if (!e.data_resposta) return false;
    const dataResposta = new Date(e.data_resposta);
    return dataResposta.getFullYear() === anoSelecionado &&
           (e.status === 'compartilhado' || e.status === 'enviado');
  }) || [];

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Pesquisas Enviadas</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {loadingEstatisticas ? '...' : stats.total_enviadas}
                </p>
                {error && (
                  <span className="text-xs text-red-500" title="Erro ao carregar dados do SQL Server">
                    ⚠️
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
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Pesquisas Respondidas</p>
              <p className="text-2xl font-bold">
                {loadingEstatisticas ? '...' : stats.total_respondidas}
              </p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Heart className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Não Respondidas</p>
              <p className="text-2xl font-bold">
                {loadingEstatisticas ? '...' : stats.total_nao_respondidas}
              </p>
            </div>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Taxa de Resposta</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {loadingEstatisticas ? '...' : `${stats.taxa_resposta}%`}
                </p>
                {!loadingEstatisticas && (
                  <span className={`text-xs font-medium ${
                    stats.taxa_resposta >= 80 ? 'text-green-600' : 
                    stats.taxa_resposta >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {stats.taxa_resposta >= 80 ? '✓ Boa' : 
                     stats.taxa_resposta >= 60 ? '⚠ Regular' : '✗ Baixa'}
                  </span>
                )}
              </div>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
        </Card>
      </div>
      
      {/* Gráfico de Comparação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Enviadas vs Respondidas</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Comparação entre pesquisas enviadas e respondidas - Todos os Grupos
            </p>
          </CardHeader>
          <CardContent>
            {loadingEstatisticas ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-gray-500">Carregando dados...</div>
              </div>
            ) : error ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-red-500 text-center">
                  <p>Erro ao carregar dados do SQL Server</p>
                  <p className="text-xs mt-1">Verifique se a API de sincronização está ativa</p>
                </div>
              </div>
            ) : estatisticasPesquisas ? (
              <div className="space-y-4">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          categoria: 'Pesquisas',
                          enviadas: stats.total_enviadas,
                          respondidas: stats.total_respondidas,
                          nao_respondidas: stats.total_nao_respondidas
                        }
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      barCategoryGap="40%"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="categoria" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          const labels: Record<string, string> = {
                            'enviadas': 'Enviadas',
                            'respondidas': 'Respondidas', 
                            'nao_respondidas': 'Não Respondidas'
                          };
                          return [value, labels[name] || name];
                        }}
                      />
                      <Bar 
                        dataKey="enviadas" 
                        fill="#3b82f6" 
                        name="enviadas" 
                        radius={[4, 4, 0, 0]}
                        maxBarSize={60}
                      />
                      <Bar 
                        dataKey="respondidas" 
                        fill="#10b981" 
                        name="respondidas" 
                        radius={[4, 4, 0, 0]}
                        maxBarSize={60}
                      />
                      <Bar 
                        dataKey="nao_respondidas" 
                        fill="#f59e0b" 
                        name="nao_respondidas" 
                        radius={[4, 4, 0, 0]}
                        maxBarSize={60}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legenda customizada com círculos */}
                <div className="flex items-center justify-center text-sm pt-4 border-t">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600">Enviadas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-600">Respondidas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-gray-600">Não Respondidas</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Dados Processados no Sistema</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Elogios já sincronizados e processados no sistema
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Elogios Processados
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Dados sincronizados da ferramenta ITSM
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {elogiosFiltrados.length}
                  </p>
                  <p className="text-xs text-gray-500">
                    no ano {anoSelecionado}
                  </p>
                </div>
              </div>
              
              {!loadingEstatisticas && (
                <div className="text-center p-4 border-t">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Cobertura de Sincronização:</strong>
                  </p>
                  <p className="text-lg font-semibold">
                    {stats.total_respondidas > 0 
                      ? ((elogiosFiltrados.length / stats.total_respondidas) * 100).toFixed(1)
                      : '0'
                    }%
                  </p>
                  <p className="text-xs text-gray-500">
                    dos elogios respondidos foram sincronizados
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Componente Planos de Ação
const PlanosAcaoElogios = ({ statsElogios, anoSelecionado, mesSelecionado, elogios }: { 
  statsElogios: any; 
  anoSelecionado: number;
  mesSelecionado: number | 'todos';
  elogios?: any[];
}) => {
  // Estados para controlar seleção e detalhes
  const [itemSelecionado, setItemSelecionado] = useState<{
    tipo: 'empresa' | 'status' | 'acao-paliativa' | null;
    dados: any;
  } | null>(null);

  // Buscar dados reais da tabela planos_acao
  const { data: planosAcao = [], isLoading: loadingPlanos } = usePlanosAcao({
    ano: anoSelecionado,
    mes: mesSelecionado === 'todos' ? undefined : mesSelecionado
  });

  // Buscar estatísticas dos planos de ação
  const { data: estatisticasPlanos } = useEstatisticasPlanosAcao({
    ano: anoSelecionado,
    mes: mesSelecionado === 'todos' ? undefined : mesSelecionado
  });

  // Se estiver carregando, mostrar loading
  if (loadingPlanos) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando planos de ação...</p>
        </div>
      </div>
    );
  }

  // Usar dados das estatísticas ou valores padrão
  const totalPlanos = estatisticasPlanos?.total || 0;
  const abertos = estatisticasPlanos?.abertos || 0;
  const emAndamento = estatisticasPlanos?.em_andamento || 0;
  const aguardandoRetorno = estatisticasPlanos?.aguardando_retorno || 0;
  const concluidos = estatisticasPlanos?.concluidos || 0;
  const cancelados = estatisticasPlanos?.cancelados || 0;
  const porPrioridade = estatisticasPlanos?.por_prioridade || { baixa: 0, media: 0, alta: 0, critica: 0 };

  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total de Planos</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{totalPlanos}</p>
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
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Concluídos</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-green-600">{concluidos}</p>
                <span className="text-xs text-gray-500">
                  ({totalPlanos > 0 ? Math.round((concluidos / totalPlanos) * 100) : 0}%)
                </span>
              </div>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Award className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Em Andamento</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-blue-600">{emAndamento}</p>
                <span className="text-xs text-gray-500">
                  ({totalPlanos > 0 ? Math.round((emAndamento / totalPlanos) * 100) : 0}%)
                </span>
              </div>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Abertos</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-orange-600">{abertos}</p>
                <span className="text-xs text-gray-500">
                  ({totalPlanos > 0 ? Math.round((abertos / totalPlanos) * 100) : 0}%)
                </span>
              </div>
            </div>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <FileText className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Segunda linha de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Aguardando Retorno</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-yellow-600">{aguardandoRetorno}</p>
                <span className="text-xs text-gray-500">
                  ({totalPlanos > 0 ? Math.round((aguardandoRetorno / totalPlanos) * 100) : 0}%)
                </span>
              </div>
            </div>
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <TrendingUp className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Cancelados</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-red-600">{cancelados}</p>
                <span className="text-xs text-gray-500">
                  ({totalPlanos > 0 ? Math.round((cancelados / totalPlanos) * 100) : 0}%)
                </span>
              </div>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Users className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Gráficos e tabelas */}
      <div className="grid grid-cols-1 gap-6">
        {/* Distribuição por Prioridade */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-lg font-semibold">Distribuição por Prioridade</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Crítica</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-red-600">{porPrioridade.critica}</span>
                  <span className="text-xs text-gray-500">
                    ({totalPlanos > 0 ? Math.round((porPrioridade.critica / totalPlanos) * 100) : 0}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Alta</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-orange-600">{porPrioridade.alta}</span>
                  <span className="text-xs text-gray-500">
                    ({totalPlanos > 0 ? Math.round((porPrioridade.alta / totalPlanos) * 100) : 0}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Média</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-yellow-600">{porPrioridade.media}</span>
                  <span className="text-xs text-gray-500">
                    ({totalPlanos > 0 ? Math.round((porPrioridade.media / totalPlanos) * 100) : 0}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Baixa</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-blue-600">{porPrioridade.baixa}</span>
                  <span className="text-xs text-gray-500">
                    ({totalPlanos > 0 ? Math.round((porPrioridade.baixa / totalPlanos) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Planos de Ação */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-lg font-semibold">Lista de Planos de Ação</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <PlanosAcaoTable
            planos={planosAcao}
            onEdit={(plano) => {
              console.log('Editar plano:', plano);
              // Implementar lógica de edição
            }}
            onDelete={(id) => {
              console.log('Deletar plano:', id);
              // Implementar lógica de exclusão
            }}
            onView={(plano) => {
              console.log('Visualizar plano:', plano);
              // Implementar lógica de visualização
            }}
            isLoading={loadingPlanos}
          />
        </CardContent>
      </Card>
    </div>
  );
};

const Dashboard = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  const [anoSelecionado, setAnoSelecionado] = useState(currentYear);
  const [mesSelecionado, setMesSelecionado] = useState<number | 'todos'>('todos');
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
    
    // Aba Planos de Ação com verificação de permissão correta
    if (hasPermission('plano_acao', 'view') || hasPermission('plano_acao', 'view')) {
      tabs.push({
        key: 'planos-acao',
        label: 'Planos de Ação',
        icon: BarChart3,
        screenKeys: ['plano_acao_visualizar']
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

    // Filtrar por mês
    if (mesSelecionado !== 'todos') {
      dados = dados.filter(r => {
        if (!r.mes_cobranca) return false;
        const mes = r.mes_cobranca.split('/')[0];
        return parseInt(mes) === mesSelecionado;
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
  }, [requerimentos, filtroModulo, anoSelecionado, mesSelecionado]);

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

    // Filtrar por mês baseado na data_resposta
    if (mesSelecionado !== 'todos') {
      dados = dados.filter(e => {
        if (!e.data_resposta) return false;
        const mes = new Date(e.data_resposta).getMonth() + 1; // getMonth() retorna 0-11, então +1
        return mes === mesSelecionado;
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
  }, [elogios, anoSelecionado, mesSelecionado]);

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

    // Filtrar por mês
    if (mesSelecionado !== 'todos') {
      dados = dados.filter(r => {
        if (!r.mes_cobranca) return false;
        const mes = r.mes_cobranca.split('/')[0];
        return parseInt(mes) === mesSelecionado;
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
  }, [requerimentos, filtroModulo, anoSelecionado, mesSelecionado]);

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
                  {[currentYear, currentYear - 1].map(ano => (
                    <SelectItem key={ano} value={String(ano)}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={String(mesSelecionado)} onValueChange={(v) => setMesSelecionado(v === 'todos' ? 'todos' : parseInt(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Meses</SelectItem>
                  <SelectItem value="1">Janeiro</SelectItem>
                  <SelectItem value="2">Fevereiro</SelectItem>
                  <SelectItem value="3">Março</SelectItem>
                  <SelectItem value="4">Abril</SelectItem>
                  <SelectItem value="5">Maio</SelectItem>
                  <SelectItem value="6">Junho</SelectItem>
                  <SelectItem value="7">Julho</SelectItem>
                  <SelectItem value="8">Agosto</SelectItem>
                  <SelectItem value="9">Setembro</SelectItem>
                  <SelectItem value="10">Outubro</SelectItem>
                  <SelectItem value="11">Novembro</SelectItem>
                  <SelectItem value="12">Dezembro</SelectItem>
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
                  mesSelecionado={mesSelecionado}
                  elogios={elogios}
                  hasPermission={hasPermission}
                />
              </div>
            )}

            {/* Aba de Planos de Ação */}
            {activeTab === 'planos-acao' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-6 w-6 text-blue-600" />
                  Planos de Ação
                </h2>

                {/* Conteúdo dos Planos de Ação */}
                <PlanosAcaoElogios 
                  statsElogios={statsElogios}
                  anoSelecionado={anoSelecionado}
                  mesSelecionado={mesSelecionado}
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