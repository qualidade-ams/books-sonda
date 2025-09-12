import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Settings } from 'lucide-react';
import type { UserGroup } from '@/types/permissions';
import PermissionMatrix from './PermissionMatrix';

interface PermissionConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: UserGroup | null;
}

const PermissionConfigDialog: React.FC<PermissionConfigDialogProps> = ({
  open,
  onOpenChange,
  group,
}) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePermissionsUpdated = () => {
    toast({
      title: "Permissões atualizadas",
      description: `As permissões do grupo "${group?.name}" foram salvas com sucesso.`,
    });
  };

  if (!group) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <DialogTitle>Configurar Permissões</DialogTitle>
          </div>
          <DialogDescription>
            Configure as permissões de acesso às telas do sistema para o grupo "{group.name}".
            Defina o nível de acesso para cada tela: sem acesso, apenas visualização ou edição completa.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <PermissionMatrix
            group={group}
            onPermissionsUpdated={handlePermissionsUpdated}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionConfigDialog;