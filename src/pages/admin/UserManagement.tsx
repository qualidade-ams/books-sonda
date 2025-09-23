import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/admin/LayoutAdmin';
import ProtectedAction from '@/components/auth/ProtectedAction';
import { UserPlus, Save, RefreshCw, User, Edit, Plus } from 'lucide-react';
import { userManagementService, type UserData, type CreateUserData } from '@/services/userManagementService';



interface UserFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  active: boolean;
  sendWelcomeEmail: boolean;
}

interface EditUserFormData {
  fullName: string;
  email: string;
  active: boolean;
  resetPassword: boolean;
  newPassword: string;
  confirmNewPassword: string;
}

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    active: true,
    sendWelcomeEmail: true
  });

  const [errors, setErrors] = useState<Partial<UserFormData>>({});

  // Estados para edição de usuário
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editFormData, setEditFormData] = useState<EditUserFormData>({
    fullName: '',
    email: '',
    active: true,
    resetPassword: false,
    newPassword: '',
    confirmNewPassword: ''
  });
  const [editErrors, setEditErrors] = useState<Partial<EditUserFormData>>({});

  // Carregar usuários
  const loadUsers = async () => {
    try {
      setIsLoading(true);

      const users = await userManagementService.listUsers();
      setUsers(users);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: error.message || "Ocorreu um erro ao carregar a lista de usuários.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Validar formulário
  const validateForm = (): boolean => {
    const newErrors: Partial<UserFormData> = {};

    if (!formData.email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Nome completo é obrigatório';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof UserFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // Criar usuário
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os erros no formulário.",
        variant: "destructive",
      });
      return;
    }

    setIsCreateLoading(true);

    try {
      const createUserData: CreateUserData = {
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        active: formData.active,
        sendWelcomeEmail: formData.sendWelcomeEmail
      };

      const result = await userManagementService.createUser(createUserData);

      if (result.success) {
        toast({
          title: "Usuário criado com sucesso",
          description: `O usuário ${formData.fullName} foi cadastrado com sucesso.`,
        });

        // Limpar formulário e fechar modal
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          fullName: '',
          active: true,
          sendWelcomeEmail: true
        });
        setIsCreateDialogOpen(false);

        // Recarregar lista
        loadUsers();
      } else {
        throw new Error(result.error || 'Erro desconhecido ao criar usuário');
      }

    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);

      let errorMessage = 'Ocorreu um erro ao criar o usuário.';

      if (error?.message?.includes('already registered')) {
        errorMessage = 'Este email já está cadastrado no sistema.';
      } else if (error?.message?.includes('invalid email')) {
        errorMessage = 'Email inválido.';
      } else if (error?.message?.includes('não tem permissões')) {
        errorMessage = 'Você não tem permissões para criar usuários.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Erro ao criar usuário",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreateLoading(false);
    }
  };

  // Desativar usuário (usando Supabase Auth)
  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const result = await userManagementService.updateUserStatus(userId, !currentStatus);

      if (result.success) {
        toast({
          title: "Status atualizado",
          description: `Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso.`,
        });
        loadUsers(); // Recarregar lista
      } else {
        throw new Error(result.error || 'Erro ao atualizar status');
      }
    } catch (error: any) {
      let errorMessage = 'Ocorreu um erro ao atualizar o status do usuário.';

      if (error?.message?.includes('não tem permissões')) {
        errorMessage = 'Você não tem permissões para atualizar usuários.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Erro ao atualizar status",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Abrir modal de edição
  const openEditDialog = (user: UserData) => {
    setEditingUser(user);
    setEditFormData({
      fullName: user.full_name || '',
      email: user.email,
      active: user.active || true,
      resetPassword: false,
      newPassword: '',
      confirmNewPassword: ''
    });
    setEditErrors({});
    setIsEditDialogOpen(true);
  };

  // Validar formulário de edição
  const validateEditForm = (): boolean => {
    const newErrors: Partial<EditUserFormData> = {};

    if (!editFormData.fullName.trim()) {
      newErrors.fullName = 'Nome completo é obrigatório';
    } else if (editFormData.fullName.trim().length < 2) {
      newErrors.fullName = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (!editFormData.email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (editFormData.resetPassword) {
      if (!editFormData.newPassword) {
        newErrors.newPassword = 'Nova senha é obrigatória';
      } else if (editFormData.newPassword.length < 6) {
        newErrors.newPassword = 'Senha deve ter pelo menos 6 caracteres';
      }

      if (!editFormData.confirmNewPassword) {
        newErrors.confirmNewPassword = 'Confirmação de senha é obrigatória';
      } else if (editFormData.newPassword !== editFormData.confirmNewPassword) {
        newErrors.confirmNewPassword = 'Senhas não coincidem';
      }
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditInputChange = (field: keyof EditUserFormData, value: string | boolean) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (editErrors[field]) {
      setEditErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // Editar usuário
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEditForm() || !editingUser) {
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os erros no formulário.",
        variant: "destructive",
      });
      return;
    }

    setIsEditLoading(true);

    try {
      const updateData = {
        userId: editingUser.id,
        fullName: editFormData.fullName,
        email: editFormData.email,
        active: editFormData.active,
        resetPassword: editFormData.resetPassword,
        newPassword: editFormData.resetPassword ? editFormData.newPassword : undefined
      };

      const result = await userManagementService.updateUser(updateData);

      if (result.success) {
        toast({
          title: "Usuário atualizado com sucesso",
          description: `Os dados de ${editFormData.fullName} foram atualizados.`,
        });

        setIsEditDialogOpen(false);
        setEditingUser(null);
        loadUsers(); // Recarregar lista
      } else {
        throw new Error(result.error || 'Erro desconhecido ao atualizar usuário');
      }

    } catch (error: any) {
      console.error('Erro ao editar usuário:', error);

      let errorMessage = 'Ocorreu um erro ao atualizar o usuário.';

      if (error?.message?.includes('não tem permissões')) {
        errorMessage = 'Você não tem permissões para editar usuários.';
      } else if (error?.message?.includes('email')) {
        errorMessage = 'Erro relacionado ao email. Verifique se o email é válido.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Erro ao editar usuário",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsEditLoading(false);
    }
  };

  // Filtrar usuários
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.group_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
            <p className="text-gray-600">Gerencie usuários do sistema</p>
          </div>

          <ProtectedAction screenKey="cadastro-usuarios" requiredLevel="edit">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Cadastrar Usuário</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Novo Usuário</DialogTitle>
                  <DialogDescription>
                    Preencha as informações abaixo para criar um novo usuário
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateUser} className="space-y-6">
                  {/* Informações Pessoais */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                      <User className="h-4 w-4" />
                      <span>Informações Pessoais</span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Nome Completo *</Label>
                        <Input
                          id="fullName"
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          placeholder="Digite o nome completo do usuário"
                          className={errors.fullName ? 'border-red-500' : ''}
                        />
                        {errors.fullName && (
                          <p className="text-sm text-red-500">{errors.fullName}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="Digite o email do usuário"
                          className={errors.email ? 'border-red-500' : ''}
                        />
                        {errors.email && (
                          <p className="text-sm text-red-500">{errors.email}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Configurações de Segurança */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">Senha *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          placeholder="Digite a senha (mín. 6 caracteres)"
                          className={errors.password ? 'border-red-500' : ''}
                        />
                        {errors.password && (
                          <p className="text-sm text-red-500">{errors.password}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          placeholder="Confirme a senha"
                          className={errors.confirmPassword ? 'border-red-500' : ''}
                        />
                        {errors.confirmPassword && (
                          <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Configurações do Usuário */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="active">Usuário Ativo</Label>
                        <p className="text-sm text-gray-500">
                          Determina se o usuário pode fazer login no sistema
                        </p>
                      </div>
                      <Switch
                        id="active"
                        checked={formData.active}
                        onCheckedChange={(checked) => handleInputChange('active', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="sendWelcomeEmail">Enviar Email de Boas-vindas</Label>
                        <p className="text-sm text-gray-500">
                          Envia um email de confirmação para o usuário
                        </p>
                      </div>
                      <Switch
                        id="sendWelcomeEmail"
                        checked={formData.sendWelcomeEmail}
                        onCheckedChange={(checked) => handleInputChange('sendWelcomeEmail', checked)}
                      />
                    </div>
                  </div>

                  {/* Botões */}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={isCreateLoading}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isCreateLoading}>
                      {isCreateLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Criar Usuário
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </ProtectedAction>
        </div>

        {/* Modal de Edição de Usuário */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Edite as informações do usuário {editingUser?.full_name || editingUser?.email}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditUser} className="space-y-6">
              {/* Informações Pessoais */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <User className="h-4 w-4" />
                  <span>Informações Pessoais</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editFullName">Nome Completo *</Label>
                    <Input
                      id="editFullName"
                      type="text"
                      value={editFormData.fullName}
                      onChange={(e) => handleEditInputChange('fullName', e.target.value)}
                      placeholder="Digite o nome completo do usuário"
                      className={editErrors.fullName ? 'border-red-500' : ''}
                    />
                    {editErrors.fullName && (
                      <p className="text-sm text-red-500">{editErrors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editEmail">Email *</Label>
                    <Input
                      id="editEmail"
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => handleEditInputChange('email', e.target.value)}
                      placeholder="Digite o email do usuário"
                      className={editErrors.email ? 'border-red-500' : ''}
                    />
                    {editErrors.email && (
                      <p className="text-sm text-red-500">{editErrors.email}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Configurações do Usuário */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="editActive">Usuário Ativo</Label>
                    <p className="text-sm text-gray-500">
                      Determina se o usuário pode fazer login no sistema
                    </p>
                  </div>
                  <Switch
                    id="editActive"
                    checked={editFormData.active}
                    onCheckedChange={(checked) => handleEditInputChange('active', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="resetPassword">Resetar Senha</Label>
                    <p className="text-sm text-gray-500">
                      Marque para definir uma nova senha para o usuário
                    </p>
                  </div>
                  <Switch
                    id="resetPassword"
                    checked={editFormData.resetPassword}
                    onCheckedChange={(checked) => handleEditInputChange('resetPassword', checked)}
                  />
                </div>
              </div>

              {/* Configurações de Senha (se resetar senha estiver marcado) */}
              {editFormData.resetPassword && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <RefreshCw className="h-4 w-4" />
                    <span>Nova Senha</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nova Senha *</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={editFormData.newPassword}
                        onChange={(e) => handleEditInputChange('newPassword', e.target.value)}
                        placeholder="Digite a nova senha (mín. 6 caracteres)"
                        className={editErrors.newPassword ? 'border-red-500' : ''}
                      />
                      {editErrors.newPassword && (
                        <p className="text-sm text-red-500">{editErrors.newPassword}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmNewPassword">Confirmar Nova Senha *</Label>
                      <Input
                        id="confirmNewPassword"
                        type="password"
                        value={editFormData.confirmNewPassword}
                        onChange={(e) => handleEditInputChange('confirmNewPassword', e.target.value)}
                        placeholder="Confirme a nova senha"
                        className={editErrors.confirmNewPassword ? 'border-red-500' : ''}
                      />
                      {editErrors.confirmNewPassword && (
                        <p className="text-sm text-red-500">{editErrors.confirmNewPassword}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isEditLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isEditLoading}>
                  {isEditLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Lista de Usuários */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg lg:text-xl">Usuários Cadastrados ({filteredUsers.length})</CardTitle>
              </div>
            </div>

            {/* Filtros dentro do card */}
            <div className="flex gap-4 mt-4 pt-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nome, email ou grupo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Button variant="outline" onClick={loadUsers} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Último Login</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'Sem nome'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.group_name ? (
                          <Badge variant="outline">{user.group_name}</Badge>
                        ) : (
                          <span className="text-gray-500">Sem grupo</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? "default" : "destructive"}>
                          {user.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Nunca'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <ProtectedAction screenKey="cadastro-usuarios" requiredLevel="edit">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(user)}
                              className="h-8 w-8 p-0"
                              title='Editar'
                            >
                              
                              <Edit className="h-4 w-4" />
                            </Button>
                          </ProtectedAction>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default UserManagement;
