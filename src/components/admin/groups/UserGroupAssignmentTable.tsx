import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
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
  const { user: currentUser } = useAuth();

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
      console.error('Error loading users and groups:', error);
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

  // Handle user group assignment
  const handleAssignUserToGroup = async (userId: string, groupId: string | null) => {
    if (!currentUser?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      return;
    }

    setAssigningUsers(prev => new Set(prev).add(userId));

    try {
      if (groupId === null) {
        // Remove user from current group
        await permissionsService.removeUserFromGroup(userId);
        toast({
          title: "Usuário removido do grupo",
          description: "O usuário foi removido do grupo com sucesso.",
        });
      } else {
        // Assign user to new group
        await permissionsService.assignUserToGroup(userId, groupId, currentUser.id);
        const groupName = groups.find(g => g.id === groupId)?.name || 'Grupo';
        toast({
          title: "Usuário atribuído ao grupo",
          description: `O usuário foi atribuído ao grupo "${groupName}" com sucesso.`,
        });
      }

      // Reload data to reflect changes
      await loadData();
      onUserAssignmentChange?.();
    } catch (error) {
      console.error('Error assigning user to group:', error);
      toast({
        title: "Erro ao atribuir usuário",
        description: "Não foi possível atribuir o usuário ao grupo.",
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
            {users.filter(u => u.group_id).length} usuários com grupo
          </span>
          <span className="flex items-center">
            <UserX className="h-4 w-4 mr-1" />
            {users.filter(u => !u.group_id).length} usuários sem grupo
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
                <TableHead>Grupo Atual</TableHead>
                <TableHead>Atribuir Grupo</TableHead>
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
                    {user.group_name ? (
                      <Badge variant="default">{user.group_name}</Badge>
                    ) : (
                      <Badge variant="secondary">Sem grupo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.group_id && user.group_id.trim() !== '' ? user.group_id : 'no-group'}
                      onValueChange={(value) => {
                        const groupId = value === 'no-group' ? null : value;
                        handleAssignUserToGroup(user.id, groupId);
                      }}
                      disabled={assigningUsers.has(user.id)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Selecionar grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-group">Sem grupo</SelectItem>
                        {groups
                          .filter((group) => group.id && group.id.trim() !== '')
                          .map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
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