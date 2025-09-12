import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Shield, AlertTriangle } from 'lucide-react';
import type { UserGroup } from '@/types/permissions';

interface DeleteGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: UserGroup | null;
  onConfirm: () => Promise<void>;
}

const DeleteGroupDialog: React.FC<DeleteGroupDialogProps> = ({
  open,
  onOpenChange,
  group,
  onConfirm,
}) => {
  if (!group) return null;

  const isAdminGroup = group.is_default_admin;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center space-x-2">
            {isAdminGroup ? (
              <Shield className="h-5 w-5 text-blue-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <span>
              {isAdminGroup ? 'Grupo Protegido' : 'Confirmar Exclusão'}
            </span>
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {isAdminGroup ? (
              <div className="space-y-2">
                <p>
                  O grupo <strong>"{group.name}"</strong> é um grupo de administradores
                  e não pode ser excluído por questões de segurança.
                </p>
                <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                  Este grupo garante que sempre haverá usuários com acesso total ao sistema.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p>
                  Tem certeza que deseja excluir o grupo <strong>"{group.name}"</strong>?
                </p>
                <p className="text-sm text-gray-600">
                  Esta ação não pode ser desfeita. Todas as configurações de permissão
                  associadas a este grupo serão perdidas.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Atenção:</strong> Certifique-se de que não há usuários
                    atribuídos a este grupo antes de excluí-lo.
                  </p>
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {isAdminGroup ? 'Entendi' : 'Cancelar'}
          </AlertDialogCancel>
          {!isAdminGroup && (
            <AlertDialogAction
              onClick={onConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Excluir Grupo
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteGroupDialog;