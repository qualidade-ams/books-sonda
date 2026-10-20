import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MultiSelect } from '@/components/ui/multi-select';
import { useToast } from '@/hooks/use-toast';
import { permissionsService } from '@/services/permissionsService';
import type { UserWithGroup, UserGroup } from '@/types/permissions';
import { Users, UserCheck, UserX, RefreshCw } from 'lucide-react';

interface UserGroupAssignmentTableProps {
  onUserAssignmentChange?: () => void;
}

const UserGroupAssignmentTable: React.FC<UserGroupAssignmentTableProps> = ({
  onUserAssignmentChange
}) => {
  const [users, setUsers] = useState<UserWithGroup[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningUsers, setAssigningUsers] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Load users and groups
  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, groupsData] = await Promise.all([
        permissionsService.getAllUsersWithGroups(),
        permissionsService.getAllGroups()
      ]);

      setUsers(usersData);
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading users and groups:', error instanceof Error ? error.message : error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar a lista de usuários e grupos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const groupOptions = groups
    .filter((group) => group.id && group.id.trim() !== '')
    .map((group) => ({ label: group.name, value: group.id }));

  // Replace the user's groups with the selected list
  const handleChangeUserGroups = async (userId: string, groupIds: string[]) => {
    setAssigningUsers(prev => new Set(prev).add(userId));

    try {
      await permissionsService.setUserGroups(userId, groupIds);

      // Update only this row, so the selector stays open to add more groups
      const groupNames = groupIds.map(id => groups.find(g => g.id === id)?.name || 'Grupo');
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, group_ids: groupIds, group_names: groupNames } : user
      ));

      toast({
        title: "Grupos atualizados",
        description: groupIds.length > 0
          ? `Grupos do usuário: ${groupNames.join(', ')}.`
          : "O usuário ficou sem grupo.",
      });
      onUserAssignmentChange?.();
    } catch (error) {
      console.error('Error setting user groups:', error instanceof Error ? error.message : error);
      toast({
        title: "Erro ao atribuir grupos",
        description: "Não foi possível atualizar os grupos do usuário.",
        variant: "destructive",
      });
    } finally {
      setAssigningUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando usuários...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0 && !loading) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nenhum usuário encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              Não há usuários cadastrados no sistema
            </p>
            <Button
              variant="outline"
              onClick={loadData}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Atualizar Lista</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary and Update Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span className="flex items-center">
            <UserCheck className="h-4 w-4 mr-1" />
            {users.filter(u => u.group_ids.length > 0).length} usuários com grupo
          </span>
          <span className="flex items-center">
            <UserX className="h-4 w-4 mr-1" />
            {users.filter(u => u.group_ids.length === 0).length} usuários sem grupo
          </span>
        </div>
      </div>

      <Card>
        <CardContent>
          {/* Users Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Grupos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name || 'Usuário sem nome'}
                    {assigningUsers.has(user.id) && (
                      <RefreshCw className="h-4 w-4 animate-spin ml-2 inline" />
                    )}
                  </TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>
                    {/* Badges removíveis no próprio seletor; o popover lista os grupos ainda não atribuídos */}
                    <MultiSelect
                      options={groupOptions}
                      selected={user.group_ids}
                      onChange={(groupIds) => handleChangeUserGroups(user.id, groupIds)}
                      placeholder="Sem grupo"
                      maxCount={groupOptions.length}
                      showSelectAll={false}
                      disabled={assigningUsers.has(user.id)}
                      className="max-w-[420px]"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserGroupAssignmentTable;
