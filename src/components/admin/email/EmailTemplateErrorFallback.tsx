import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface EmailTemplateErrorFallbackProps {
  onRetry?: () => void;
}

const EmailTemplateErrorFallback: React.FC<EmailTemplateErrorFallbackProps> = ({ onRetry }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Erro de Template
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Não foi possível encontrar um template de e-mail apropriado para esta configuração. 
            Entre em contato com o suporte ou configure os templates necessários.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Possíveis soluções:
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>Verifique se as variáveis de ambiente do Supabase estão configuradas</li>
            <li>Certifique-se de que as migrações do banco foram executadas</li>
            <li>Verifique se existem templates ativos no banco de dados</li>
          </ul>
        </div>

        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailTemplateErrorFallback;