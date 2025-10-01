import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Shield, Settings } from 'lucide-react';
import type { UserGroup } from '@/types/permissions';

interface GroupsTableProps {
  groups: UserGroup[];
  loading: boolean;
  onEdit: (group: UserGroup) => void;
  onDelete: (group: UserGroup) => void;
  onConfigurePermissions: (group: UserGroup) => void;
}

const GroupsTable: React.FC<GroupsTableProps> = ({
  groups,
  loading,
  onEdit,
  onDelete,
  onConfigurePermissions,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando grupos...</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          Nenhum grupo encontrado
        </h3>
        <p className="text-gray-600 mb-4">
          Crie seu primeiro grupo para começar a organizar usuários
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((group) => (
          <TableRow key={group.id}>
            <TableCell className="font-medium">
              <div className="flex items-center space-x-2">
                {group.is_default_admin && (
                  <Shield className="h-4 w-4 text-blue-600" />
                )}
                <span>{group.name}</span>
              </div>
            </TableCell>
            <TableCell>{group.description || '-'}</TableCell>
            <TableCell>
              {group.is_default_admin ? (
                <Badge variant="default" className="text-blue-600 border-blue-600 bg-blue-50">
                  Administrador
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-blue-600 border-blue-600 bg-blue-50">
                  Personalizado
                </Badge>
              )}
            </TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onConfigurePermissions(group)}
                  className="h-8 w-8 p-0"
                  title="Configurar permissões"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(group)}
                  className="h-8 w-8 p-0"
                  title="Editar grupo"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(group)}
                  disabled={group.is_default_admin}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                  title={group.is_default_admin ? "Grupo administrador não pode ser excluído" : "Excluir grupo"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default GroupsTable;