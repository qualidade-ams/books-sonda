
import AdminLayout from '@/components/admin/LayoutAdmin';
import { VigenciaMonitor } from '@/components/admin/VigenciaMonitor';
import { JobSchedulerManager } from '@/components/admin/JobSchedulerManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useVigenciaStats } from '@/hooks/useVigenciaMonitor';
import { useJobStatus } from '@/hooks/useJobScheduler';
import { Building2, Calendar, Activity, AlertTriangle } from 'lucide-react';

const Dashboard = () => {
  const { estatisticas: vigenciaStats } = useVigenciaStats();
  const { isRunning: schedulerRunning, activeJobs } = useJobStatus();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Bem-vindo ao painel administrativo</p>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Empresas Ativas</p>
                  <p className="text-2xl font-bold">{vigenciaStats?.empresas_ativas || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium">Vigências Vencidas</p>
                  <p className="text-2xl font-bold">{vigenciaStats?.vigencias_vencidas || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">Vencem em 30 dias</p>
                  <p className="text-2xl font-bold">{vigenciaStats?.vigencias_vencendo_30_dias || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Jobs Automáticos</p>
                  <p className="text-2xl font-bold">{activeJobs}</p>
                  <p className="text-xs text-muted-foreground">
                    {schedulerRunning ? 'Ativos' : 'Parados'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Componentes de Monitoramento */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VigenciaMonitor compacto showLogs={false} />
          <JobSchedulerManager compacto />
        </div>

        {/* Seção de Alertas */}
        {vigenciaStats && vigenciaStats.vigencias_vencidas > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-red-700">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Atenção: Vigências Vencidas
                </div>
              </CardTitle>
              <CardDescription className="text-red-600">
                Existem {vigenciaStats.vigencias_vencidas} empresa(s) com vigência vencida que podem ser inativadas automaticamente.
                <br />
                <span className="text-sm">
                  Acesse "Monitoramento de Vigências" para gerenciar ou execute a verificação automática.
                </span>
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!schedulerRunning && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700">
                <Activity className="h-5 w-5" />
                Job Scheduler Inativo
              </CardTitle>
              <CardDescription className="text-yellow-600">
                O sistema de jobs automáticos está parado. Verificações de vigência não serão executadas automaticamente.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
