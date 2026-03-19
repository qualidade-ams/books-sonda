import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLoading } from '@/components/admin/dashboard/DashboardLoading';
import { EmptyState } from '@/components/admin/dashboard/EmptyState';
import { useEstatisticasEmpresas } from '@/hooks/useEstatisticasEmpresas';
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
  AlertCircle
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

export const EmpresasTab: React.FC<EmpresasTabProps> = ({ hasPermission }) => {
  const { data: stats, isLoading, error } = useEstatisticasEmpresas();

  if (isLoading) {
    return <DashboardLoading />;
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Erro ao carregar dados"
        description="Não foi possível carregar as estatísticas das empresas."
      />
    );
  }

  if (!stats) {
    return (
      <EmptyState
        icon={Building2}
        title="Sem dados disponíveis"
        description="Nenhuma estatística de empresa foi encontrada."
      />
    );
  }

  // Dados para gráficos
  const statusData = [
    { name: 'Ativas', value: stats.empresasAtivas, color: COLORS.success },
    { name: 'Inativas', value: stats.empresasInativas, color: COLORS.danger },
    { name: 'Suspensas', value: stats.empresasSuspensas, color: COLORS.warning }
  ];

  const amsData = [
    { name: 'Com AMS', value: stats.empresasComAms, color: COLORS.primary },
    { name: 'Sem AMS', value: stats.empresasSemAms, color: COLORS.gray }
  ];

  const produtosData = [
    { name: 'Fiscal', value: stats.empresasComFiscal, color: '#00FFFF' },
    { name: 'Comex', value: stats.empresasComComex, color: '#2563eb' },
    { name: 'Fiscal + Comex', value: stats.empresasComFiscalEComex, color: '#7c3aed' }
  ];

  const bookData = [
    { name: 'Qualidade', value: stats.empresasAmsComBookQualidade, color: COLORS.success },
    { name: 'Outros', value: stats.empresasAmsComBookOutros, color: COLORS.warning },
    { name: 'Sem Book', value: stats.empresasAmsSemBook, color: COLORS.gray }
  ];

  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Empresas Ativas</p>
              <p className="text-2xl font-bold">{stats.empresasAtivas}</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Clientes Ativos</p>
              <p className="text-2xl font-bold">{stats.clientesAtivos}</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Users className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Em Projeto (Novo cliente)</p>
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
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Entraram em {new Date().getFullYear()}</p>
              <p className="text-2xl font-bold text-green-600">{stats.empresasEntraramAno}</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Saíram em {new Date().getFullYear()}</p>
              <p className="text-2xl font-bold text-red-600">{stats.empresasSairamAno}</p>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Banco de Horas</p>
              <p className="text-2xl font-bold">{stats.empresasBancoHoras}</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Ticket</p>
              <p className="text-2xl font-bold">{stats.empresasTicket}</p>
            </div>
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/20 rounded-lg">
              <CreditCard className="h-4 w-4 text-cyan-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Com AMS</p>
              <p className="text-2xl font-bold">{stats.empresasComAms}</p>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Sem AMS</p>
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
              <CardTitle className="text-lg font-semibold">Status das Empresas</CardTitle>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Distribuição por status atual
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
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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
                  <div key={index} className="flex items-center gap-2">
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
              <CardTitle className="text-lg font-semibold">Distribuição AMS</CardTitle>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Empresas com e sem AMS
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
                    >
                      {amsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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
                  <div key={index} className="flex items-center gap-2">
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
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Fiscal</p>
              <p className="text-2xl font-bold">{stats.empresasComFiscal}</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Comex</p>
              <p className="text-2xl font-bold">{stats.empresasComComex}</p>
            </div>
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/20 rounded-lg">
              <Briefcase className="h-4 w-4 text-cyan-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Fiscal + Comex</p>
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
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Somente Fiscal</p>
              <p className="text-2xl font-bold">{stats.empresasSomenteFiscal || 0}</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Somente Gallery</p>
              <p className="text-2xl font-bold">{stats.empresasSomenteGallery || 0}</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Package className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Somente Comex</p>
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
              <CardTitle className="text-lg font-semibold">Distribuição de Produtos</CardTitle>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Produtos contratados pelas empresas
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={produtosData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }} barCategoryGap="30%">
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
                    formatter={(value: any) => [value, 'Empresas']}
                  />
                  <Bar dataKey="value" fill={COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={80}>
                    {produtosData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Legenda */}
              <div className="flex flex-wrap justify-center gap-6 text-sm -mt-4">
                {produtosData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
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
              <CardTitle className="text-lg font-semibold">Tipos de Book AMS</CardTitle>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Distribuição por tipo de book (apenas clientes com AMS)
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
                    >
                      {bookData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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
                  <div key={index} className="flex items-center gap-2">
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
    </div>
  );
};
