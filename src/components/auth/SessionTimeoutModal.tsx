import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock } from 'lucide-react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  remainingTime: string;
  onExtendSession: () => void;
  onLogout: () => void;
}

const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  remainingTime,
  onExtendSession,
  onLogout
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => { }}>
      <DialogContent className="sm:max-w-md" hideCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Sessão Expirando</span>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-center py-4">
              <div className="flex flex-col items-center space-y-3">
                <Clock className="h-12 w-12 text-amber-500" />
                <p className="text-sm text-gray-600">
                  Sua sessão expirará por inatividade em:
                </p>
                <div className="text-2xl font-mono font-bold text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                  {remainingTime}
                </div>
                <p className="text-sm text-gray-600">
                  Clique em "Continuar Sessão" para permanecer conectado ou "Sair" para fazer logout agora.
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-center space-x-3">
          <Button
            variant="outline"
            onClick={onLogout}
            className="flex items-center space-x-2"
          >
            <span>Sair Agora</span>
          </Button>
          <Button
            onClick={onExtendSession}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
          >
            <Clock className="h-4 w-4" />
            <span>Continuar Sessão</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SessionTimeoutModal;