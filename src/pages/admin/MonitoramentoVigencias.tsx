/**
 * Página de monitoramento completo de vigências
 * Interface administrativa para gerenciar vigências de contratos
 */

import React from 'react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { VigenciaMonitor } from '@/components/admin/VigenciaMonitor';
import { JobSchedulerManager } from '@/components/admin/JobSchedulerManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Activity, Settings, BarChart3 } from 'lucide-react';

const MonitoramentoVigencias = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Monitoramento de Vigências</h1>
            <p className="text-gray-600">
              Gerencie vigências de contratos e jobs automáticos do sistema
            </p>
          </div>
        </div>

        <Tabs defaultValue="vigencias" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="vigencias" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Vigências
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Jobs Automáticos
            </TabsTrigger>
            <TabsTrigger value="configuracoes" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vigencias" className="space-y-6">
            <VigenciaMonitor showLogs={true} />
          </TabsContent>

          <TabsContent value="jobs" className="space-y-6">
            <JobSchedulerManager />
          </TabsContent>

          <TabsContent value="configuracoes" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configurações de Vigência
                  </CardTitle>
                  <CardDescription>
                    Configurações relacionadas ao monitoramento de vigências
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Inativação Automática</h4>
                    <p className="text-sm text-muted-foreground">
                      Empresas com vigência vencida são automaticamente inativadas pelo sistema.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Alertas de Vencimento</h4>
                    <p className="text-sm text-muted-foreground">
                      Alertas são exibidos quando a vigência vence em até 30 dias.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Verificação Automática</h4>
                    <p className="text-sm text-muted-foreground">
                      O sistema verifica vigências automaticamente a cada 6 horas.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Informações do Sistema
                  </CardTitle>
                  <CardDescription>
                    Detalhes técnicos sobre o funcionamento do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Função de Banco</h4>
                    <p className="text-sm text-muted-foreground">
                      <code>inativar_empresas_vencidas()</code> - Executa a inativação automática
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Trigger de Validação</h4>
                    <p className="text-sm text-muted-foreground">
                      Valida automaticamente as datas de vigência nos formulários
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Logs do Sistema</h4>
                    <p className="text-sm text-muted-foreground">
                      Todas as operações são registradas na tabela <code>logs_sistema</code>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Índices Otimizados</h4>
                    <p className="text-sm text-muted-foreground">
                      Consultas otimizadas com índices específicos para vigências
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default MonitoramentoVigencias;