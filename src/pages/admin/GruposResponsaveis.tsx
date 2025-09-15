import React, { useState } from 'react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Users, 
  Settings,
  RefreshCw
} from 'lucide-react';
import { GruposTable } from '@/components/admin/grupos/GruposTable';
import { GrupoFormModal } from '@/components/admin/grupos/GrupoFormModal';
import { GrupoDetailsModal } from '@/components/admin/grupos/GrupoDetailsModal';
import { useGruposResponsaveis } from '@/hooks/useGruposResponsaveis';
import { GrupoFormData, GrupoResponsavelCompleto } from '@/types/clientBooksTypes';
import { toast } from 'sonner';
import ProtectedAction from '@/components/auth/ProtectedAction';

export default function GruposResponsaveis() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrupo, setSelectedGrupo] = useState<GrupoResponsavelCompleto | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const {
    grupos,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isCreatingPadrao,
    criarGrupo,
    atualizarGrupo,
    deletarGrupo,
    criarGruposPadrao,
    refetch,
  } = useGruposResponsaveis();

  // Filtrar grupos baseado no termo de busca
  const gruposFiltrados = grupos.filter(grupo =>
    grupo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grupo.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grupo.emails?.some(email => 
      email.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.nome?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleCreateGrupo = () => {
    setSelectedGrupo(null);
    setIsFormModalOpen(true);
  };

  const handleEditGrupo = (grupo: GrupoResponsavelCompleto) => {
    setSelectedGrupo(grupo);
    setIsFormModalOpen(true);
  };

  const handleViewGrupo = (grupo: GrupoResponsavelCompleto) => {
    setSelectedGrupo(grupo);
    setIsDetailsModalOpen(true);
  };

  const handleSubmitGrupo = async (data: GrupoFormData) => {
    try {
      if (selectedGrupo) {
        await atualizarGrupo({ id: selectedGrupo.id, data });
      } else {
        await criarGrupo(data);
      }
    } catch (error) {
      console.error('Erro ao salvar grupo:', error);
    }
  };

  const handleDeleteGrupo = async (id: string) => {
    try {
      await deletarGrupo(id);
    } catch (error) {
      console.error('Erro ao deletar grupo:', error);
    }
  };

  const handleCreateGruposPadrao = async () => {
    try {
      await criarGruposPadrao();
    } catch (error) {
      console.error('Erro ao criar grupos padrão:', error);
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Lista de grupos atualizada!');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grupos de Responsáveis</h1>
          <p className="text-gray-600">
            Gerencie grupos de e-mails para envio de books em cópia
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <ProtectedAction screenKey="grupos_responsaveis" requiredLevel="edit">
            <Button
              variant="outline"
              onClick={handleCreateGruposPadrao}
              disabled={isCreatingPadrao}
            >
              <Settings className="h-4 w-4 mr-2" />
              {isCreatingPadrao ? 'Criando...' : 'Criar Grupos Padrão'}
            </Button>
          </ProtectedAction>
          <ProtectedAction screenKey="grupos_responsaveis" requiredLevel="edit">
            <Button onClick={handleCreateGrupo}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Grupo
            </Button>
          </ProtectedAction>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Grupos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{grupos.length}</div>
            <p className="text-xs text-muted-foreground">
              grupos cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de E-mails</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {grupos.reduce((total, grupo) => total + (grupo.emails?.length || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              e-mails cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grupos com E-mails</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {grupos.filter(grupo => grupo.emails && grupo.emails.length > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              grupos ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, descrição ou e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de grupos */}
      <GruposTable
        grupos={gruposFiltrados}
        onEdit={handleEditGrupo}
        onDelete={handleDeleteGrupo}
        onView={handleViewGrupo}
        isLoading={isLoading}
        isDeleting={isDeleting}
      />

      {/* Modal de formulário */}
      <GrupoFormModal
        grupo={selectedGrupo}
        open={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
        onSubmit={handleSubmitGrupo}
        isLoading={isCreating || isUpdating}
      />

      {/* Modal de detalhes */}
      <GrupoDetailsModal
        grupo={selectedGrupo}
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
      />
      </div>
    </AdminLayout>
  );
}