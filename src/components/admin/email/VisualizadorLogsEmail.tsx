
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Mail, AlertTriangle, CheckCircle } from 'lucide-react';
import { useEmailLogs } from '@/hooks/useEmailLogs';

const EmailLogsViewer = () => {
  const { logs, loading, refreshLogs } = useEmailLogs();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enviado':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Enviado</Badge>;
      case 'erro':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Erro</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(dateString));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Logs de E-mail
          </h2>
          <p className="text-gray-600">Visualize o histórico de envios de e-mail</p>
        </div>

        <Button
          variant="outline" 
          onClick={refreshLogs}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Atualizar
        </Button>
      </div>

      <Card>
        <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum log de e-mail encontrado
          </div>
        ) : (
          <div className="space-y-4">
            {logs.slice(0, 10).map((log) => (
              <div key={log.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{log.destinatario}</div>
                  {getStatusBadge(log.status)}
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  <strong>Assunto:</strong> {log.assunto}
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  <strong>Enviado em:</strong> {formatDateTime(log.enviado_em)}
                </div>
                {log.erro && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    <strong>Erro:</strong> {log.erro}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailLogsViewer;
