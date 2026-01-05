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
  danger: '#dc2626', // Mudando para um vermelho mais escuro e visível
  info: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
  orange: '#f97316',
  gray: '#6b7280'
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
    { name: 'Fiscal', value: stats.empresasComFiscal, color: COLORS.primary },
    { name: 'Comex', value: stats.empresasComComex, color: COLORS.info },
    { name: 'Fiscal + Comex', value: stats.empresasComFiscalEComex, color: COLORS.purple }
  ];

  const bookData = [
    { name: 'Qualidade', value: stats.empresasComBookQualidade, color: COLORS.success },
    { name: 'Outros', value: stats.empresasComBookOutros, color: COLORS.warning },
    { name: 'Sem Book', value: stats.empresasSemBook, color: COLORS.gray }
  ];

  return (
    <div className="space-y-6">
      {/* Cards principais sem cor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Empresas Ativas</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.empresasAtivas}</p>
              </div>
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
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.clientesAtivos}</p>
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
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Em Projeto (Novo cliente)</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.empresasEmProjeto}</p>
              </div>
            </div>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Settings className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
        </Card>
      </div>

            {/* Cards de Tipos de Cobrança e AMS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Banco de Horas</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.empresasBancoHoras}</p>
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
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Ticket</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.empresasTicket}</p>
              </div>
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
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.empresasComAms}</p>
              </div>
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
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.empresasSemAms}</p>
              </div>
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
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={90}
                    innerRadius={65}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                    cornerRadius={10}
                    paddingAngle={3}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name: string) => {
                      const total = statusData.reduce((sum, item) => sum + item.value, 0);
                      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                      return [`${value} (${percentage}%)`, name];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Legenda dentro do card */}
              <div className="flex flex-wrap justify-center gap-4 text-sm px-4 -mt-4">
                {[
                  { name: 'Ativas', value: stats.empresasAtivas, color: COLORS.success },
                  { name: 'Inativas', value: stats.empresasInativas, color: COLORS.danger },
                  { name: 'Suspensas', value: stats.empresasSuspensas, color: COLORS.warning }
                ].map((entry, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-2 group cursor-pointer"
                    title={`${entry.name}: ${entry.value}`}
                  >
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0 transition-transform group-hover:scale-125" 
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                      {entry.name}: {entry.value}
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
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={amsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={90}
                    innerRadius={65}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                    cornerRadius={10}
                    paddingAngle={3}
                  >
                    {amsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name: string) => {
                      const total = amsData.reduce((sum, item) => sum + item.value, 0);
                      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                      return [`${value} (${percentage}%)`, name];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Legenda dentro do card */}
              <div className="flex flex-wrap justify-center gap-4 text-sm px-4 -mt-4">
                {[
                  { name: 'Com AMS', value: stats.empresasComAms, color: COLORS.primary },
                  { name: 'Sem AMS', value: stats.empresasSemAms, color: COLORS.gray }
                ].map((entry, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-2 group cursor-pointer"
                    title={`${entry.name}: ${entry.value}`}
                  >
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0 transition-transform group-hover:scale-125" 
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                      {entry.name}: {entry.value}
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
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.empresasComFiscal}</p>
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
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Comex</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.empresasComComex}</p>
              </div>
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
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.empresasComFiscalEComex}</p>
              </div>
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
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.empresasSomenteFiscal || 0}</p>
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
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Somente Gallery</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.empresasSomenteGallery || 0}</p>
              </div>
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
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.empresasSomenteComex || 0}</p>
              </div>
            </div>
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/20 rounded-lg">
              <Briefcase className="h-4 w-4 text-cyan-600" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Gráficos de Produtos e Tipos */}
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
            <div className="h-64">
              <ResponsiveContainer width="100%" height="120%">
                <BarChart data={produtosData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any) => [value, 'Empresas']}
                  />
                  <Bar dataKey="value" fill={COLORS.primary} radius={[4, 4, 0, 0]}>
                    {produtosData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-lg font-semibold">Tipos de Book</CardTitle>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Distribuição por tipo de book
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bookData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={90}
                    innerRadius={65}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                    cornerRadius={10}
                    paddingAngle={3}
                  >
                    {bookData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name: string) => {
                      const total = bookData.reduce((sum, item) => sum + item.value, 0);
                      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                      return [`${value} (${percentage}%)`, name];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Legenda dentro do card */}
              <div className="flex flex-wrap justify-center gap-4 text-sm px-4 -mt-4">
                {[
                  { name: 'Qualidade', value: stats.empresasComBookQualidade, color: COLORS.success },
                  { name: 'Outros', value: stats.empresasComBookOutros, color: COLORS.warning },
                  { name: 'Sem Book', value: stats.empresasSemBook, color: COLORS.gray }
                ].map((entry, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-2 group cursor-pointer"
                    title={`${entry.name}: ${entry.value}`}
                  >
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0 transition-transform group-hover:scale-125" 
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                      {entry.name}: {entry.value}
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