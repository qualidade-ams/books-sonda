import React, { useState } from 'react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Users, 
  Filter,
  Mail,
  UserCheck
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-gray-600" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Total de Grupos</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{grupos.length}</p>
            <p className="text-xs text-gray-500 mt-1">grupos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-600">Total de E-mails</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {grupos.reduce((total, grupo) => total + (grupo.emails?.length || 0), 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">e-mails cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-600">Grupos com E-mails</p>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {grupos.filter(grupo => grupo.emails && grupo.emails.length > 0).length}
            </p>
            <p className="text-xs text-gray-500 mt-1">grupos ativos</p>
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