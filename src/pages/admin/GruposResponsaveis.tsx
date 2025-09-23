import React, { useState } from 'react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Users, 
  Filter
} from 'lucide-react';
import { GruposTable } from '@/components/admin/grupos/GruposTable';
import { GrupoFormModal } from '@/components/admin/grupos/GrupoFormModal';
import { GrupoDetailsModal } from '@/components/admin/grupos/GrupoDetailsModal';
import { ImportExportButtons } from '@/components/admin/grupos/ImportExportButtons';
import { useGruposResponsaveis } from '@/hooks/useGruposResponsaveis';
import { GrupoFormData, GrupoResponsavelCompleto } from '@/types/clientBooksTypes';
import { toast } from 'sonner';
import ProtectedAction from '@/components/auth/ProtectedAction';

export default function GruposResponsaveis() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrupo, setSelectedGrupo] = useState<GrupoResponsavelCompleto | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const {
    grupos,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isImporting,
    criarGrupo,
    atualizarGrupo,
    deletarGrupo,
    importarGrupos,
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
      // Fechar modal após sucesso
      setIsFormModalOpen(false);
      setSelectedGrupo(null);
    } catch (error) {
      console.error('Erro ao salvar grupo:', error);
      // Não fechar modal em caso de erro para permitir correção
    }
  };

  const handleDeleteGrupo = async (id: string) => {
    try {
      await deletarGrupo(id);
      // Limpar seleção após exclusão bem-sucedida
      if (selectedGrupo?.id === id) {
        setSelectedGrupo(null);
        setIsDetailsModalOpen(false);
      }
    } catch (error) {
      console.error('Erro ao deletar grupo:', error);
    }
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
          <ImportExportButtons 
            grupos={grupos}
            onImportGrupos={importarGrupos}
            isImporting={isImporting}
          />
          <ProtectedAction screenKey="grupos_responsaveis" requiredLevel="edit">
            <Button 
              onClick={handleCreateGrupo}
              className="flex items-center gap-2 text-sm"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Grupo</span>
              <span className="sm:hidden">Novo</span>
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

      {/* Tabela de grupos */}
      <GruposTable
        grupos={gruposFiltrados}
        onEdit={handleEditGrupo}
        onDelete={handleDeleteGrupo}
        onView={handleViewGrupo}
        isLoading={isLoading}
        isDeleting={isDeleting}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
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