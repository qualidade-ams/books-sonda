import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Shield, LogOut } from 'lucide-react';

/**
 * Componente para mostrar informações da sessão atual
 * Útil para debug e monitoramento
 */
const SessionInfo: React.FC = () => {
  const { user, session, signOut } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!user || !session) {
    return null;
  }

  const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
  const timeUntilExpiry = expiresAt ? Math.max(0, expiresAt.getTime() - currentTime.getTime()) : 0;
  const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));
  const secondsUntilExpiry = Math.floor((timeUntilExpiry % (1000 * 60)) / 1000);

  const isExpiringSoon = minutesUntilExpiry < 5;
  const isExpired = timeUntilExpiry <= 0;

  const formatTime = (date: Date) => {
    return date.toLocaleString('pt-BR');
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4" />
          Informações da Sessão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-3 w-3" />
          <span className="font-medium">Usuário:</span>
          <span className="text-muted-foreground">{user.email}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-3 w-3" />
          <span className="font-medium">Expira em:</span>
          {isExpired ? (
            <Badge variant="destructive">Expirada</Badge>
          ) : isExpiringSoon ? (
            <Badge variant="secondary" className="text-orange-600">
              {minutesUntilExpiry}m {secondsUntilExpiry}s
            </Badge>
          ) : (
            <Badge variant="outline">
              {minutesUntilExpiry}m {secondsUntilExpiry}s
            </Badge>
          )}
        </div>

        {expiresAt && (
          <div className="text-xs text-muted-foreground">
            <div>Expira às: {formatTime(expiresAt)}</div>
            <div>Agora: {formatTime(currentTime)}</div>
          </div>
        )}

        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="w-full flex items-center gap-2"
          >
            <LogOut className="h-3 w-3" />
            Sair Manualmente
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <div>Tipo de armazenamento: sessionStorage</div>
          <div>Sessão expira ao fechar o navegador</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionInfo;