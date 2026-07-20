import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DashboardLoading } from '@/components/admin/dashboard/DashboardLoading';
import { EmptyState } from '@/components/admin/dashboard/EmptyState';
import { useEstatisticasEmpresas } from '@/hooks/useEstatisticasEmpresas';
import { useEmpresas } from '@/hooks/useEmpresas';
import {
  Building2,
  Users,
  Settings,
  CheckCircle,
  FileText,
  CreditCard,
  Package,
  Briefcase,
  Clock,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#dc2626',
  info: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
  orange: '#f97316',
  gray: '#6b7280'
};

const RADIAN = Math.PI / 180;

// Label customizado com percentual dentro da fatia (mesmo estilo Distribuição por Grupo)
const renderCustomizedLabel = (data: any[], coresClaras: string[] = []) => 
  ({ cx, cy, midAngle, innerRadius, outerRadius, value, payload }: any) => {
    const totalVisivel = data.reduce((acc, item) => acc + item.value, 0);
    const porcentagem = totalVisivel > 0 ? (value / totalVisivel) * 100 : 0;
    if (porcentagem < 3) return null;
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    const corTexto = coresClaras.includes(payload?.color) ? '#000000' : 'white';
    
    return (
      <text 
        x={x} 
        y={y} 
        fill={corTexto} 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize="9"
        fontWeight="200"
      >
        {`${porcentagem.toFixed(1)}%`}
      </text>
    );
  };

interface EmpresasTabProps {
  hasPermission: (screenKey: string, level?: string) => boolean;
}

// Tipos de filtro possíveis ao clicar nos cards
type FiltroEmpresaType = 
  | 'ativas' 
  | 'inativas'
  | 'suspensas'
  | 'clientes_ativos'
  | 'em_projeto' 
  | 'entraram_ano' 
  | 'sairam_ano' 
  | 'banco_horas' 
  | 'ticket' 
  | 'com_ams' 
  | 'sem_ams'
  | 'fiscal'
  | 'comex'
  | 'fiscal_comex'
  | 'somente_fiscal'
  | 'somente_gallery'
  | 'somente_comex'
  | 'book_qualidade'
  | 'book_outros'
  | 'sem_book'
  | null;

export const EmpresasTab: React.FC<EmpresasTabProps> = ({ hasPermission }) => {
  const { t } = useTranslation();
  const { data: stats, isLoading, error } = useEstatisticasEmpresas();
  const { empresas, isLoading: loadingEmpresas } = useEmpresas();

  // Estado do filtro ativo
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroEmpresaType>(null);
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  // Scroll suave para a tabela
  const scrollParaTabela = () => {
    setTimeout(() => {
      document.getElementById('tabela-empresas-filtradas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Handler para clicar nos cards (toggle)
  const handleFiltrar = (filtro: FiltroEmpresaType) => {
    if (filtroAtivo === filtro) {
      setFiltroAtivo(null);
    } else {
      setFiltroAtivo(filtro);
      setPaginaAtual(1);
      scrollParaTabela();
    }
  };

  // Limpar filtro
  const limparFiltro = () => {
    setFiltroAtivo(null);
  };

  // Obter label do filtro ativo
  const getLabelFiltro = (filtro: FiltroEmpresaType): string => {
    switch (filtro) {
      case 'ativas': return t('dashboardEmpresas.activeCompanies');
      case 'inativas': return t('dashboardEmpresas.inactive');
      case 'suspensas': return t('dashboardEmpresas.suspended');
      case 'clientes_ativos': return t('dashboardEmpresas.activeClients');
      case 'em_projeto': return t('dashboardEmpresas.inProject');
      case 'entraram_ano': return t('dashboardEmpresas.joinedIn', { year: new Date().getFullYear() });
      case 'sairam_ano': return t('dashboardEmpresas.leftIn', { year: new Date().getFullYear() });
      case 'banco_horas': return t('dashboardEmpresas.hoursBank');
      case 'ticket': return t('dashboardEmpresas.ticket');
      case 'com_ams': return t('dashboardEmpresas.withAms');
      case 'sem_ams': return t('dashboardEmpresas.withoutAms');
      case 'fiscal': return t('dashboardEmpresas.fiscal');
      case 'comex': return t('dashboardEmpresas.comex');
      case 'fiscal_comex': return t('dashboardEmpresas.fiscalComex');
      case 'somente_fiscal': return t('dashboardEmpresas.onlyFiscal');
      case 'somente_gallery': return t('dashboardEmpresas.onlyGallery');
      case 'somente_comex': return t('dashboardEmpresas.onlyComex');
      case 'book_qualidade': return `${t('dashboardEmpresas.amsBookTypes')} - ${t('dashboardEmpresas.quality')}`;
      case 'book_outros': return `${t('dashboardEmpresas.amsBookTypes')} - ${t('dashboardEmpresas.others')}`;
      case 'sem_book': return `${t('dashboardEmpresas.amsBookTypes')} - ${t('dashboardEmpresas.noBook')}`;
      default: return '';
    }
  };

  // Filtrar empresas com base no filtro ativo
  const empresasFiltradas = useMemo(() => {
    if (!filtroAtivo || !empresas) return [];

    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    const anoAtual = hoje.getFullYear();

    switch (filtroAtivo) {
      case 'ativas':
        return empresas.filter(e => e.status === 'ativo');
      case 'clientes_ativos':
        // Mostrar empresas que têm clientes ativos (proxy: empresas ativas)
        return empresas.filter(e => e.status === 'ativo');
      case 'em_projeto':
        return empresas.filter(e => e.em_projeto === true);
      case 'entraram_ano':
        return empresas.filter(e => {
          if (!e.vigencia_inicial) return false;
          const dataInicio = new Date(e.vigencia_inicial + 'T00:00:00');
          return dataInicio.getFullYear() === anoAtual && dataInicio <= hoje;
        });
      case 'sairam_ano':
        return empresas.filter(e => {
          if (!e.vigencia_final) return false;
          const dataFim = new Date(e.vigencia_final + 'T00:00:00');
          return dataFim.getFullYear() === anoAtual && dataFim <= hoje;
        });
      case 'banco_horas':
        return empresas.filter(e => e.tipo_cobranca === 'banco_horas' && e.status === 'ativo');
      case 'ticket':
        return empresas.filter(e => e.tipo_cobranca === 'ticket' && e.status === 'ativo');
      case 'com_ams':
        return empresas.filter(e => e.tem_ams === true && e.status === 'ativo');
      case 'sem_ams':
        return empresas.filter(e => (e.tem_ams === false || e.tem_ams === null) && e.status === 'ativo');
      case 'fiscal':
        return empresas.filter(e => 
          e.status === 'ativo' && (
            e.produtos?.some((p: any) => p.produto === 'FISCAL') ||
            e.produtos?.some((p: any) => p.produto === 'GALLERY')
          )
        );
      case 'comex':
        return empresas.filter(e => 
          e.status === 'ativo' && e.produtos?.some((p: any) => p.produto === 'COMEX')
        );
      case 'fiscal_comex':
        return empresas.filter(e => 
          e.status === 'ativo' && (
            e.produtos?.some((p: any) => p.produto === 'FISCAL') || 
            e.produtos?.some((p: any) => p.produto === 'GALLERY')
          ) &&
          e.produtos?.some((p: any) => p.produto === 'COMEX')
        );
      case 'somente_fiscal':
        return empresas.filter(e => 
          e.status === 'ativo' &&
          e.produtos?.some((p: any) => p.produto === 'FISCAL') &&
          !e.produtos?.some((p: any) => p.produto === 'COMEX') &&
          !e.produtos?.some((p: any) => p.produto === 'GALLERY')
        );
      case 'somente_gallery':
        return empresas.filter(e => 
          e.status === 'ativo' &&
          e.produtos?.some((p: any) => p.produto === 'GALLERY') &&
          !e.produtos?.some((p: any) => p.produto === 'FISCAL') &&
          !e.produtos?.some((p: any) => p.produto === 'COMEX')
        );
      case 'somente_comex':
        return empresas.filter(e => 
          e.status === 'ativo' &&
          e.produtos?.some((p: any) => p.produto === 'COMEX') &&
          !e.produtos?.some((p: any) => p.produto === 'FISCAL') &&
          !e.produtos?.some((p: any) => p.produto === 'GALLERY')
        );
      case 'inativas':
        return empresas.filter(e => e.status === 'inativo');
      case 'suspensas':
        return empresas.filter(e => e.status === 'suspenso');
      case 'book_qualidade':
        return empresas.filter(e => e.status === 'ativo' && e.tem_ams === true && e.tipo_book === 'qualidade');
      case 'book_outros':
        return empresas.filter(e => e.status === 'ativo' && e.tem_ams === true && e.tipo_book === 'outros');
      case 'sem_book':
        return empresas.filter(e => e.status === 'ativo' && e.tem_ams === true && (e.tipo_book === 'nao_tem_book' || e.tipo_book === null));
      default:
        return [];
    }
  }, [filtroAtivo, empresas]);

  // Paginação
  const totalPaginas = Math.ceil(empresasFiltradas.length / itensPorPagina);
  const indiceInicio = (paginaAtual - 1) * itensPorPagina;
  const indiceFim = indiceInicio + itensPorPagina;
  const empresasPaginadas = empresasFiltradas.slice(indiceInicio, indiceFim);

  if (isLoading) {
    return <DashboardLoading />;
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t('dashboardEmpresas.errorLoadingData')}
        description={t('dashboardEmpresas.errorLoadingDescription')}
      />
    );
  }

  if (!stats) {
    return (
      <EmptyState
        icon={Building2}
        title={t('dashboardEmpresas.noDataAvailable')}
        description={t('dashboardEmpresas.noDataDescription')}
      />
    );
  }

  // Dados para gráficos - com mapeamento de filtros para cliques
  const statusData = [
    { name: t('dashboardEmpresas.active'), value: stats.empresasAtivas, color: COLORS.success, filtro: 'ativas' as FiltroEmpresaType },
    { name: t('dashboardEmpresas.inactive'), value: stats.empresasInativas, color: COLORS.danger, filtro: 'inativas' as FiltroEmpresaType },
    { name: t('dashboardEmpresas.suspended'), value: stats.empresasSuspensas, color: COLORS.warning, filtro: 'suspensas' as FiltroEmpresaType }
  ];

  const amsData = [
    { name: t('dashboardEmpresas.withAms'), value: stats.empresasComAms, color: COLORS.primary, filtro: 'com_ams' as FiltroEmpresaType },
    { name: t('dashboardEmpresas.withoutAms'), value: stats.empresasSemAms, color: COLORS.gray, filtro: 'sem_ams' as FiltroEmpresaType }
  ];

  const produtosData = [
    { name: t('dashboardEmpresas.fiscal'), value: stats.empresasComFiscal, color: '#00FFFF', filtro: 'fiscal' as FiltroEmpresaType },
    { name: t('dashboardEmpresas.comex'), value: stats.empresasComComex, color: '#2563eb', filtro: 'comex' as FiltroEmpresaType },
    { name: t('dashboardEmpresas.fiscalComex'), value: stats.empresasComFiscalEComex, color: '#7c3aed', filtro: 'fiscal_comex' as FiltroEmpresaType }
  ];

  const bookData = [
    { name: t('dashboardEmpresas.quality'), value: stats.empresasAmsComBookQualidade, color: COLORS.success, filtro: 'book_qualidade' as FiltroEmpresaType },
    { name: t('dashboardEmpresas.others'), value: stats.empresasAmsComBookOutros, color: COLORS.warning, filtro: 'book_outros' as FiltroEmpresaType },
    { name: t('dashboardEmpresas.noBook'), value: stats.empresasAmsSemBook, color: COLORS.gray, filtro: 'sem_book' as FiltroEmpresaType }
  ];

  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className={`bg-white dark:bg-gray-800 shadow-sm cursor-pointer transition-all hover:shadow-md ${filtroAtivo === 'ativas' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => handleFiltrar('ativas')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('dashboardEmpresas.activeCompanies')}</p>
              <p className="text-2xl font-bold">{stats.empresasAtivas}</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className={`bg-white dark:bg-gray-800 shadow-sm cursor-pointer transition-all hover:shadow-md ${filtroAtivo === 'clientes_ativos' ? 'ring-2 ring-green-500' : ''}`} onClick={() => handleFiltrar('clientes_ativos')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('dashboardEmpresas.activeClients')}</p>
              <p className="text-2xl font-bold">{stats.clientesAtivos}</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Users className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className={`bg-white dark:bg-gray-800 shadow-sm cursor-pointer transition-all hover:shadow-md ${filtroAtivo === 'em_projeto' ? 'ring-2 ring-orange-500' : ''}`} onClick={() => handleFiltrar('em_projeto')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('dashboardEmpresas.inProject')}</p>
              <p className="text-2xl font-bold">{stats.empresasEmProjeto}</p>
            </div>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Settings className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Cards de Tipos de Cobrança e AMS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className={`bg-white dark:bg-gray-800 shadow-sm cursor-pointer transition-all hover:shadow-md ${filtroAtivo === 'entraram_ano' ? 'ring-2 ring-green-500' : ''}`} onClick={() => handleFiltrar('entraram_ano')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('dashboardEmpresas.joinedIn', { year: new Date().getFullYear() })}</p>
              <p className="text-2xl font-bold text-green-600">{stats.empresasEntraramAno}</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className={`bg-white dark:bg-gray-800 shadow-sm cursor-pointer transition-all hover:shadow-md ${filtroAtivo === 'sairam_ano' ? 'ring-2 ring-red-500' : ''}`} onClick={() => handleFiltrar('sairam_ano')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('dashboardEmpresas.leftIn', { year: new Date().getFullYear() })}</p>
              <p className="text-2xl font-bold text-red-600">{stats.empresasSairamAno}</p>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className={`bg-white dark:bg-gray-800 shadow-sm cursor-pointer transition-all hover:shadow-md ${filtroAtivo === 'banco_horas' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => handleFiltrar('banco_horas')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('dashboardEmpresas.hoursBank')}</p>
              <p className="text-2xl font-bold">{stats.empresasBancoHoras}</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className={`bg-white dark:bg-gray-800 shadow-sm cursor-pointer transition-all hover:shadow-md ${filtroAtivo === 'ticket' ? 'ring-2 ring-cyan-500' : ''}`} onClick={() => handleFiltrar('ticket')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('dashboardEmpresas.ticket')}</p>
              <p className="text-2xl font-bold">{stats.empresasTicket}</p>
            </div>
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/20 rounded-lg">
              <CreditCard className="h-4 w-4 text-cyan-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className={`bg-white dark:bg-gray-800 shadow-sm cursor-pointer transition-all hover:shadow-md ${filtroAtivo === 'com_ams' ? 'ring-2 ring-purple-500' : ''}`} onClick={() => handleFiltrar('com_ams')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('dashboardEmpresas.withAms')}</p>
              <p className="text-2xl font-bold">{stats.empresasComAms}</p>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className={`bg-white dark:bg-gray-800 shadow-sm cursor-pointer transition-all hover:shadow-md ${filtroAtivo === 'sem_ams' ? 'ring-2 ring-gray-500' : ''}`} onClick={() => handleFiltrar('sem_ams')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('dashboardEmpresas.withoutAms')}</p>
              <p className="text-2xl font-bold">{stats.empresasSemAms}</p>
            </div>
            <div className="p-2 bg-gray-100 dark:bg-gray-900/20 rounded-lg">
              <Settings className="h-4 w-4 text-gray-600" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Gráficos de Status e AMS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-lg font-semibold">{t('dashboardEmpresas.companyStatus')}</CardTitle>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('dashboardEmpresas.statusDistribution')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-6">
              <div className="flex justify-center">
                <ResponsiveContainer width={280} height={280}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                      label={renderCustomizedLabel(statusData)}
                      labelLine={false}
                      onClick={(data, index) => {
                        if (statusData[index]?.filtro) {
                          handleFiltrar(statusData[index].filtro);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} className="cursor-pointer" stroke={filtroAtivo === entry.filtro ? '#1d4ed8' : 'none'} strokeWidth={filtroAtivo === entry.filtro ? 3 : 0} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: string) => {
                        const total = statusData.reduce((sum, item) => sum + item.value, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                        return [`${value} (${percentage}%)`, name];
                      }}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                {statusData.map((entry, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${filtroAtivo === entry.filtro ? 'bg-gray-100 dark:bg-gray-700 ring-1 ring-gray-300' : ''}`}
                    onClick={() => handleFiltrar(entry.filtro)}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {entry.name} ({entry.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-lg font-semibold">{t('dashboardEmpresas.amsDistribution')}</CardTitle>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('dashboardEmpresas.companiesWithAndWithoutAms')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-6">
              <div className="flex justify-center">
                <ResponsiveContainer width={280} height={280}>
                  <PieChart>
                    <Pie
                      data={amsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                      label={renderCustomizedLabel(amsData)}
                      labelLine={false}
                      onClick={(data, index) => {
                        if (amsData[index]?.filtro) {
                          handleFiltrar(amsData[index].filtro);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {amsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} className="cursor-pointer" stroke={filtroAtivo === entry.filtro ? '#1d4ed8' : 'none'} strokeWidth={filtroAtivo === entry.filtro ? 3 : 0} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: string) => {
                        const total = amsData.reduce((sum, item) => sum + item.value, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                        return [`${value} (${percentage}%)`, name];
                      }}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                {amsData.map((entry, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${filtroAtivo === entry.filtro ? 'bg-gray-100 dark:bg-gray-700 ring-1 ring-gray-300' : ''}`}
                    onClick={() => handleFiltrar(entry.filtro)}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {entry.name} ({entry.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Produtos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className={`bg-white dark:bg-gray-800 shadow-sm cursor-pointer transition-all hover:shadow-md ${filtroAtivo === 'fiscal' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => handleFiltrar('fiscal')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('dashboardEmpresas.fiscal')}</p>
              <p className="text-2xl font-bold">{stats.empresasComFiscal}</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className={`bg-white dark:bg-gray-800 shadow-sm cursor-pointer transition-all hover:shadow-md ${filtroAtivo === 'comex' ? 'ring-2 ring-cyan-500' : ''}`} onClick={() => handleFiltrar('comex')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('dashboardEmpresas.comex')}</p>
              <p className="text-2xl font-bold">{stats.empresasComComex}</p>
            </div>
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/20 rounded-lg">
              <Briefcase className="h-4 w-4 text-cyan-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className={`bg-white dark:bg-gray-800 shadow-sm cursor-pointer transition-all hover:shadow-md ${filtroAtivo === 'fiscal_comex' ? 'ring-2 ring-purple-500' : ''}`} onClick={() => handleFiltrar('fiscal_comex')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('dashboardEmpresas.fiscalComex')}</p>
              <p className="text-2xl font-bold">{stats.empresasComFiscalEComex}</p>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Package className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Cards de Produtos Exclusivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className={`bg-white dark:bg-gray-800 shadow-sm cursor-pointer transition-all hover:shadow-md ${filtroAtivo === 'somente_fiscal' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => handleFiltrar('somente_fiscal')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('dashboardEmpresas.onlyFiscal')}</p>
              <p className="text-2xl font-bold">{stats.empresasSomenteFiscal || 0}</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className={`bg-white dark:bg-gray-800 shadow-sm cursor-pointer transition-all hover:shadow-md ${filtroAtivo === 'somente_gallery' ? 'ring-2 ring-green-500' : ''}`} onClick={() => handleFiltrar('somente_gallery')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('dashboardEmpresas.onlyGallery')}</p>
              <p className="text-2xl font-bold">{stats.empresasSomenteGallery || 0}</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Package className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className={`bg-white dark:bg-gray-800 shadow-sm cursor-pointer transition-all hover:shadow-md ${filtroAtivo === 'somente_comex' ? 'ring-2 ring-cyan-500' : ''}`} onClick={() => handleFiltrar('somente_comex')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('dashboardEmpresas.onlyComex')}</p>
              <p className="text-2xl font-bold">{stats.empresasSomenteComex || 0}</p>
            </div>
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/20 rounded-lg">
              <Briefcase className="h-4 w-4 text-cyan-600" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Gráficos de Produtos e Tipos de Book */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-lg font-semibold">{t('dashboardEmpresas.productDistribution')}</CardTitle>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('dashboardEmpresas.contractedProducts')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={produtosData} 
                  margin={{ top: 10, right: 30, left: 0, bottom: 40 }} 
                  barCategoryGap="30%"
                  onClick={(data) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      const payload = data.activePayload[0].payload;
                      if (payload?.filtro) {
                        handleFiltrar(payload.filtro);
                      }
                    }
                  }}
                  className="cursor-pointer"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: any) => [value, t('dashboardEmpresas.companies')]}
                  />
                  <Bar dataKey="value" fill={COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={80}>
                    {produtosData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} className="cursor-pointer" stroke={filtroAtivo === entry.filtro ? '#1d4ed8' : 'none'} strokeWidth={filtroAtivo === entry.filtro ? 3 : 0} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Legenda */}
              <div className="flex flex-wrap justify-center gap-6 text-sm -mt-4">
                {produtosData.map((entry, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${filtroAtivo === entry.filtro ? 'bg-gray-100 dark:bg-gray-700 ring-1 ring-gray-300' : ''}`}
                    onClick={() => handleFiltrar(entry.filtro)}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {entry.name} ({entry.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-lg font-semibold">{t('dashboardEmpresas.amsBookTypes')}</CardTitle>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('dashboardEmpresas.bookTypeDistribution')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-6">
              <div className="flex justify-center">
                <ResponsiveContainer width={280} height={280}>
                  <PieChart>
                    <Pie
                      data={bookData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                      label={renderCustomizedLabel(bookData, [COLORS.warning])}
                      labelLine={false}
                      onClick={(data, index) => {
                        if (bookData[index]?.filtro) {
                          handleFiltrar(bookData[index].filtro);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {bookData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} className="cursor-pointer" stroke={filtroAtivo === entry.filtro ? '#1d4ed8' : 'none'} strokeWidth={filtroAtivo === entry.filtro ? 3 : 0} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: string) => {
                        const total = bookData.reduce((sum, item) => sum + item.value, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                        return [`${value} (${percentage}%)`, name];
                      }}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                {bookData.map((entry, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${filtroAtivo === entry.filtro ? 'bg-gray-100 dark:bg-gray-700 ring-1 ring-gray-300' : ''}`}
                    onClick={() => handleFiltrar(entry.filtro)}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {entry.name} ({entry.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Empresas Filtradas */}
      {filtroAtivo && (
        <Card id="tabela-empresas-filtradas" className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-lg font-semibold">
                  Lista de Empresas
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({empresasFiltradas.length} {empresasFiltradas.length === 1 ? 'empresa' : 'empresas'} • {getLabelFiltro(filtroAtivo)})
                  </span>
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={limparFiltro}
                className="whitespace-nowrap hover:border-red-300"
              >
                <X className="h-4 w-4 mr-2 text-red-600" />
                Limpar Filtros
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loadingEmpresas ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : empresasFiltradas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma empresa encontrada para este filtro.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">Empresa</TableHead>
                      <TableHead className="font-semibold text-gray-700">Status</TableHead>
                      <TableHead className="font-semibold text-gray-700">Tipo Cobrança</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">AMS</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Produtos</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Vigência Inicial</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Vigência Final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empresasPaginadas.map((empresa) => (
                      <TableRow key={empresa.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {empresa.nome_abreviado || empresa.nome_completo}
                            </span>
                            {empresa.nome_abreviado && empresa.nome_completo !== empresa.nome_abreviado && (
                              <p className="text-xs text-gray-500 mt-0.5">{empresa.nome_completo}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            empresa.status === 'ativo' ? 'bg-green-100 text-green-800' :
                            empresa.status === 'inativo' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {empresa.status === 'ativo' ? 'Ativo' : 
                             empresa.status === 'inativo' ? 'Inativo' : 'Suspenso'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {empresa.tipo_cobranca === 'banco_horas' ? 'Banco de Horas' :
                             empresa.tipo_cobranca === 'ticket' ? 'Ticket' :
                             empresa.tipo_cobranca === 'outros' ? 'Outros' : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {empresa.tem_ams ? (
                            <Badge className="bg-blue-100 text-blue-800">Sim</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600">Não</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap justify-center gap-1">
                            {empresa.produtos?.map((p: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {p.produto}
                              </Badge>
                            ))}
                            {(!empresa.produtos || empresa.produtos.length === 0) && (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm">
                            {empresa.vigencia_inicial 
                              ? new Date(empresa.vigencia_inicial + 'T00:00:00').toLocaleDateString('pt-BR')
                              : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm">
                            {empresa.vigencia_final 
                              ? new Date(empresa.vigencia_final + 'T00:00:00').toLocaleDateString('pt-BR')
                              : '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Paginação */}
                {empresasFiltradas.length > 0 && (
                  <div className="flex items-center justify-between px-2 py-4 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Mostrar</span>
                      <Select
                        value={itensPorPagina.toString()}
                        onValueChange={(value) => {
                          setItensPorPagina(Number(value));
                          setPaginaAtual(1);
                        }}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {totalPaginas > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
                          disabled={paginaAtual === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                          Página {paginaAtual} de {totalPaginas}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))}
                          disabled={paginaAtual === totalPaginas}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {indiceInicio + 1}-{Math.min(indiceFim, empresasFiltradas.length)} de {empresasFiltradas.length} {empresasFiltradas.length === 1 ? 'empresa' : 'empresas'}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
