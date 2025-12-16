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
import { useElogios } from '@/hooks/useElogios';
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
  Star
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
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';

const Dashboard = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  const [anoSelecionado, setAnoSelecionado] = useState(currentYear);
  const [filtroModulo, setFiltroModulo] = useState<ModuloType | 'todos'>('todos');
  const [activeTab, setActiveTab] = useState<string>('');
  const [topFaturamentoMode, setTopFaturamentoMode] = useState<'faturamento' | 'banco_horas'>('faturamento');

  // Hooks de permissões
  const { hasPermission } = usePermissions();

  // Buscar dados de requerimentos - buscar TODOS sem filtro
  const { data: requerimentos, isLoading: loadingRequerimentos } = useRequerimentos();
  
  // Buscar dados de elogios
  const { data: elogios, isLoading: loadingElogios } = useElogios();

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
    
    if (hasPermission('empresas_clientes', 'view') || hasPermission('clientes', 'view')) {
      tabs.push({
        key: 'clientes',
        label: 'Clientes',
        icon: Users,
        screenKeys: ['empresas_clientes', 'clientes']
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

    return {
      total,
      totalHoras,
      totalValor,
      totalTickets,
      porTipoCobranca: porcentagensTipo,
      porModulo,
      porMes: porMesOrdenado
    };
  }, [requerimentos, filtroModulo, anoSelecionado]);

  // Calcular estatísticas de elogios
  const statsElogios = useMemo(() => {
    if (!elogios || elogios.length === 0) {
      return null;
    }

    let dados = elogios;

    // Filtrar por ano
    if (anoSelecionado) {
      dados = dados.filter(e => {
        if (!e.criado_em) return false;
        const ano = new Date(e.criado_em).getFullYear();
        return ano === anoSelecionado;
      });
    }

    const total = dados.length;
    const compartilhados = dados.filter(e => e.status === 'compartilhado').length;
    const registrados = dados.filter(e => e.status === 'registrado').length;

    // Agrupar por empresa
    const porEmpresa = dados.reduce((acc, e) => {
      const empresa = e.pesquisa?.empresa || 'Sem empresa';
      if (!acc[empresa]) {
        acc[empresa] = { count: 0, compartilhados: 0 };
      }
      acc[empresa].count++;
      if (e.status === 'compartilhado') {
        acc[empresa].compartilhados++;
      }
      return acc;
    }, {} as Record<string, { count: number; compartilhados: number }>);

    // Agrupar por mês
    const porMes = dados.reduce((acc, e) => {
      const data = new Date(e.criado_em);
      const mes = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
      if (!acc[mes]) {
        acc[mes] = { count: 0, compartilhados: 0 };
      }
      acc[mes].count++;
      if (e.status === 'compartilhado') {
        acc[mes].compartilhados++;
      }
      return acc;
    }, {} as Record<string, { count: number; compartilhados: number }>);

    // Ordenar por mês
    const porMesOrdenado = Object.entries(porMes)
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

    // Calcular satisfação média (funcionalidade removida - propriedade não existe)
    const satisfacaoMedia = 0;

    return {
      total,
      compartilhados,
      registrados,
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
                            <span className="text-xs text-green-600 font-medium">+12%</span>
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
                            <span className="text-xs text-green-600 font-medium">+5.3%</span>
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
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-gray-600" />
                            <CardTitle className="text-lg font-semibold">Evolução Mensal</CardTitle>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Comparativo de Requerimentos por mês</p>
                        </CardHeader>
                        <CardContent>
                          {statsRequerimentos && statsRequerimentos.porMes && statsRequerimentos.porMes.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                              <AreaChart data={statsRequerimentos.porMes}>
                                <defs>
                                  <linearGradient id="colorRequerimentos" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="mesNome" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Area 
                                  type="monotone" 
                                  dataKey="count" 
                                  stroke="#3b82f6" 
                                  strokeWidth={2}
                                  fillOpacity={1} 
                                  fill="url(#colorRequerimentos)" 
                                  name="Requerimentos"
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
                  <Heart className="h-6 w-6 text-pink-600" />
                  Elogios
                </h2>

                {/* Cards de Resumo - Elogios */}
                <DashboardGrid columns={4} gap="md">
                  <StatCard
                    title="Total de Elogios"
                    value={statsElogios?.total || 0}
                    description={`Ano: ${anoSelecionado}`}
                    icon={Heart}
                    color="pink"
                  />
                  
                  <StatCard
                    title="Compartilhados"
                    value={statsElogios?.compartilhados || 0}
                    description={statsElogios?.total ? `${((statsElogios.compartilhados / statsElogios.total) * 100).toFixed(1)}% do total` : '0% do total'}
                    icon={Users}
                    color="green"
                  />
                  
                  <StatCard
                    title="Registrados"
                    value={statsElogios?.registrados || 0}
                    description="Aguardando aprovação"
                    icon={Calendar}
                    color="orange"
                  />
                  
                  <StatCard
                    title="Satisfação Média"
                    value={statsElogios?.satisfacaoMedia ? `${statsElogios.satisfacaoMedia.toFixed(1)}/5` : 'N/A'}
                    description="Nota média"
                    icon={Star}
                    color="yellow"
                  />
                </DashboardGrid>

                {/* Mensagem quando não há dados */}
                {(!statsElogios || statsElogios.total === 0) && (
                  <EmptyState
                    icon={Heart}
                    title="Nenhum elogio encontrado"
                    description={`Não há elogios para o ano selecionado: ${anoSelecionado}`}
                  />
                )}

                {/* Gráficos de Elogios */}
                {statsElogios && statsElogios.total > 0 && (
                  <DashboardGrid columns={2} gap="lg">
                    {/* Gráfico de Evolução Mensal */}
                    <ModernChart
                      title="Evolução Mensal de Elogios"
                      icon={TrendingUp}
                      data={statsElogios.porMes}
                      type="area"
                      height={320}
                      color="#ec4899"
                      dataKey="count"
                      xAxisKey="mesNome"
                      gradient={true}
                      formatTooltip={(value, name) => [
                        `${value} elogios`,
                        name === 'count' ? 'Total' : 'Compartilhados'
                      ]}
                    />

                    {/* Top Empresas com Mais Elogios */}
                    <ModernChart
                      title="Top 10 Empresas com Mais Elogios"
                      icon={Award}
                      data={Object.entries(statsElogios.porEmpresa)
                        .sort((a, b) => b[1].count - a[1].count)
                        .slice(0, 10)
                        .map(([empresa, data]) => ({
                          name: empresa.length > 15 ? empresa.substring(0, 15) + '...' : empresa,
                          value: data.count,
                          compartilhados: data.compartilhados
                        }))}
                      type="bar"
                      height={320}
                      color="#ec4899"
                      dataKey="value"
                      xAxisKey="name"
                      layout="vertical"
                      formatTooltip={(value, name) => [
                        `${value} elogios`,
                        name === 'value' ? 'Total' : 'Compartilhados'
                      ]}
                    />
                  </DashboardGrid>
                )}
              </div>
            )}

            {/* Aba de Clientes */}
            {activeTab === 'clientes' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="h-6 w-6 text-purple-600" />
                  Clientes
                </h2>

                {/* Cards de Resumo - Clientes */}
                <DashboardGrid columns={4} gap="md">
                  <StatCard
                    title="Total de Empresas"
                    value={statsEmpresas ? Object.keys(statsEmpresas.porEmpresa).length : 0}
                    description="Empresas ativas"
                    icon={Building2}
                    color="purple"
                  />
                  
                  <StatCard
                    title="Maior Faturamento"
                    value={statsEmpresas?.empresaMaisFatura?.nome?.length > 15 
                      ? statsEmpresas.empresaMaisFatura.nome.substring(0, 15) + '...' 
                      : statsEmpresas?.empresaMaisFatura?.nome || 'N/A'}
                    description={statsEmpresas?.empresaMaisFatura ? 
                      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsEmpresas.empresaMaisFatura.valor)
                      : 'R$ 0'
                    }
                    icon={DollarSign}
                    color="indigo"
                  />
                  
                  <StatCard
                    title="Mais Banco de Horas"
                    value={statsEmpresas?.empresaMaisBancoHoras?.nome?.length > 15 
                      ? statsEmpresas.empresaMaisBancoHoras.nome.substring(0, 15) + '...' 
                      : statsEmpresas?.empresaMaisBancoHoras?.nome || 'N/A'}
                    description={statsEmpresas?.empresaMaisBancoHoras ? 
                      converterMinutosParaHoras(statsEmpresas.empresaMaisBancoHoras.horas)
                      : '0h'
                    }
                    icon={Clock}
                    color="cyan"
                  />
                  
                  <StatCard
                    title="Mais Ativa"
                    value={statsEmpresas ? 
                      (Object.entries(statsEmpresas.porEmpresa)
                        .sort((a, b) => b[1].count - a[1].count)[0]?.[0]?.length > 15 
                        ? Object.entries(statsEmpresas.porEmpresa)
                          .sort((a, b) => b[1].count - a[1].count)[0]?.[0].substring(0, 15) + '...'
                        : Object.entries(statsEmpresas.porEmpresa)
                          .sort((a, b) => b[1].count - a[1].count)[0]?.[0]) || 'N/A'
                      : 'N/A'
                    }
                    description={statsEmpresas ? 
                      `${Object.entries(statsEmpresas.porEmpresa)
                        .sort((a, b) => b[1].count - a[1].count)[0]?.[1]?.count || 0} requerimentos`
                      : '0 requerimentos'
                    }
                    icon={TrendingUp}
                    color="teal"
                  />
                </DashboardGrid>

                {/* Gráfico de Empresas */}
                {statsEmpresas && Object.keys(statsEmpresas.porEmpresa).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-purple-600" />
                        Atividade por Empresa
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                          data={Object.entries(statsEmpresas.porEmpresa)
                            .sort((a, b) => b[1].count - a[1].count)
                            .slice(0, 15)
                            .map(([empresa, data]) => ({
                              empresa: empresa.length > 20 ? empresa.substring(0, 20) + '...' : empresa,
                              requerimentos: data.count,
                              valor: data.valor,
                              horas: converterMinutosParaHorasDecimal(data.horas)
                            }))}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="empresa" type="category" width={140} />
                          <Tooltip 
                            formatter={(value: number, name: string) => {
                              if (name === 'valor') return [
                                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                                'Valor Faturado'
                              ];
                              if (name === 'horas') return [`${value.toFixed(2)}h`, 'Horas'];
                              return [value, 'Requerimentos'];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="requerimentos" fill="#8b5cf6" name="Requerimentos" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Dashboard;