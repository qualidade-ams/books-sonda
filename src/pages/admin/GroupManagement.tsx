import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Users, Plus, Edit, Trash2, Shield } from 'lucide-react';
import { permissionsService } from '@/services/permissionsService';
import type { UserGroup } from '@/types/permissions';
import GroupsTable from '@/components/admin/groups/GroupsTable';
import GroupFormDialog from '@/components/admin/groups/GroupFormDialog';
import DeleteGroupDialog from '@/components/admin/groups/DeleteGroupDialog';
import PermissionConfigDialog from '@/components/admin/groups/PermissionConfigDialog';

const GroupManagement = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // Load groups on component mount
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const groupsData = await permissionsService.getAllGroups();
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast({
        title: "Erro ao carregar grupos",
        description: "Não foi possível carregar a lista de grupos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = () => {
    setSelectedGroup(null);
    setFormMode('create');
    setIsFormDialogOpen(true);
  };

  const handleEditGroup = (group: UserGroup) => {
    setSelectedGroup(group);
    setFormMode('edit');
    setIsFormDialogOpen(true);
  };

  const handleDeleteGroup = (group: UserGroup) => {
    setSelectedGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const handleConfigurePermissions = (group: UserGroup) => {
    setSelectedGroup(group);
    setIsPermissionDialogOpen(true);
  };

  const handleFormSubmit = async (formData: { name: string; description: string }) => {
    try {
      if (formMode === 'create') {
        await permissionsService.createGroup({
          name: formData.name,
          description: formData.description,
          is_default_admin: false
        }, user?.id);
        toast({
          title: "Grupo criado",
          description: `O grupo "${formData.name}" foi criado com sucesso.`,
        });
      } else if (selectedGroup) {
        await permissionsService.updateGroup(selectedGroup.id, {
          name: formData.name,
          description: formData.description
        }, user?.id);
        toast({
          title: "Grupo atualizado",
          description: `O grupo "${formData.name}" foi atualizado com sucesso.`,
        });
      }
      
      setIsFormDialogOpen(false);
      setSelectedGroup(null);
      await loadGroups();
    } catch (error: any) {
      console.error('Error saving group:', error);
      
      // Handle specific error cases
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        toast({
          title: "Nome já existe",
          description: "Já existe um grupo com este nome. Escolha um nome diferente.",
          variant: "destructive",
        });
      } else {
        toast({
          title: formMode === 'create' ? "Erro ao criar grupo" : "Erro ao atualizar grupo",
          description: "Ocorreu um erro ao salvar o grupo. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedGroup) return;

    try {
      await permissionsService.deleteGroup(selectedGroup.id);
      toast({
        title: "Grupo excluído",
        description: `O grupo "${selectedGroup.name}" foi excluído com sucesso.`,
      });
      
      setIsDeleteDialogOpen(false);
      setSelectedGroup(null);
      await loadGroups();
    } catch (error: any) {
      console.error('Error deleting group:', error);
      
      // Handle specific error cases
      if (error.message?.includes('Administradores') || error.message?.includes('admin')) {
        toast({
          title: "Não é possível excluir",
          description: "O grupo Administradores não pode ser excluído.",
          variant: "destructive",
        });
      } else if (error.message?.includes('usuários') || error.message?.includes('users')) {
        toast({
          title: "Grupo possui usuários",
          description: "Remova todos os usuários do grupo antes de excluí-lo.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao excluir grupo",
          description: "Ocorreu um erro ao excluir o grupo. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Grupos</h1>
            <p className="text-gray-600">Gerencie grupos de usuários e suas permissões</p>
          </div>
          <Button onClick={handleCreateGroup} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Criar Novo Grupo</span>
          </Button>
        </div>

        <Card>

          <CardContent>
            <GroupsTable
              groups={groups}
              loading={loading}
              onEdit={handleEditGroup}
              onDelete={handleDeleteGroup}
              onConfigurePermissions={handleConfigurePermissions}
            />
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <GroupFormDialog
          open={isFormDialogOpen}
          onOpenChange={setIsFormDialogOpen}
          mode={formMode}
          group={selectedGroup}
          onSubmit={handleFormSubmit}
        />

        {/* Delete Dialog */}
        <DeleteGroupDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          group={selectedGroup}
          onConfirm={handleDeleteConfirm}
        />

        {/* Permission Configuration Dialog */}
        <PermissionConfigDialog
          open={isPermissionDialogOpen}
          onOpenChange={setIsPermissionDialogOpen}
          group={selectedGroup}
        />
      </div>
    </AdminLayout>
  );
};

export default GroupManagement;