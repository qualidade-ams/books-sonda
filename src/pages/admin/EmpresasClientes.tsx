import { useState, useEffect } from 'react';
import { Plus, Filter, Search } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useEmpresas } from '@/hooks/useEmpresas';
import { useGrupos } from '@/hooks/useGrupos';
import { useEmpresasStats } from '@/hooks/useEmpresasStats';

import { EmpresaForm, EmpresasTable, EmpresaImportExportButtons } from '@/components/admin/client-books';
import ProtectedAction from '@/components/auth/ProtectedAction';
import { toast } from 'sonner';
import type {
  EmpresaFormData,
  EmpresaFiltros,
  Produto,
  EmpresaClienteCompleta,
  StatusEmpresa
} from '@/types/clientBooks';
import {
  STATUS_EMPRESA_OPTIONS,
  PRODUTOS_OPTIONS
} from '@/types/clientBooks';

const EmpresasClientes = () => {
  // Estados para filtros
  const [filtros, setFiltros] = useState<EmpresaFiltros>({
    // Por padrão, mostrar todos os status
  });

  // Estados para modais
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [buscaLocal, setBuscaLocal] = useState(filtros.busca || '');

  // Estados para empresa selecionada
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaClienteCompleta | null>(null);

  // Debounce para a busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltros(prev => ({ ...prev, busca: buscaLocal }));
    }, 500); // 500ms de delay

    return () => clearTimeout(timer);
  }, [buscaLocal]);

  // Sincronizar busca local com filtros externos
  useEffect(() => {
    setBuscaLocal(filtros.busca || '');
  }, [filtros.busca]);

  // Hooks
  const {
    empresas,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,

    criarEmpresa,
    atualizarEmpresa,
    deletarEmpresa,

    forceRefresh,
  } = useEmpresas(filtros);

  // Garantir que empresas é sempre um array
  const empresasArray = Array.isArray(empresas) ? empresas : [];

  const { grupos } = useGrupos();

  // Hook para estatísticas reais do banco (independente dos filtros)
  const { data: statsReais } = useEmpresasStats();

  // Usar estatísticas reais do banco ou fallback para dados filtrados
  const stats = statsReais || {
    total: empresasArray.length,
    ativas: empresasArray.filter(e => e.status === 'ativo').length,
    inativas: empresasArray.filter(e => e.status === 'inativo').length,
    suspensas: empresasArray.filter(e => e.status === 'suspenso').length,
  };

  // Handlers para filtros
  const handleFiltroChange = (key: keyof EmpresaFiltros, value: any) => {
    setFiltros(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleBuscaChange = (busca: string) => {
    setBuscaLocal(busca);
  };



  const handleStatusSelectChange = (value: string) => {
    if (value === '__todos_status__') {
      setFiltros(prev => ({
        ...prev,
        status: undefined
      }));
    } else {
      setFiltros(prev => ({
        ...prev,
        status: [value as StatusEmpresa]
      }));
    }
  };

  const handleProdutoSelectChange = (value: string) => {
    if (value === '__todos_produtos__') {
      setFiltros(prev => ({
        ...prev,
        produtos: undefined
      }));
    } else {
      setFiltros(prev => ({
        ...prev,
        produtos: [value as Produto]
      }));
    }
  };

  // Handler para refresh após importação
  const handleImportComplete = async () => {
    // Forçar refresh da lista de empresas após importação
    await forceRefresh();
    toast.success('Lista de empresas atualizada!');
  };

  // Handlers para ações
  const handleCreate = async (data: EmpresaFormData) => {
    await criarEmpresa(data);
    setShowCreateModal(false);
  };

  const handleEdit = (empresa: EmpresaClienteCompleta) => {
    setSelectedEmpresa(empresa);
    setShowEditModal(true);
  };

  const handleUpdate = async (data: EmpresaFormData) => {
    if (!selectedEmpresa) return;
    await atualizarEmpresa(selectedEmpresa.id, data);
    setShowEditModal(false);
    setSelectedEmpresa(null);
  };

  const handleDelete = (empresa: EmpresaClienteCompleta) => {
    setSelectedEmpresa(empresa);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedEmpresa) return;
    await deletarEmpresa(selectedEmpresa.id);
    setShowDeleteModal(false);
    setSelectedEmpresa(null);
  };

  // Preparar dados iniciais para edição
  const getInitialDataForEdit = (empresa: EmpresaClienteCompleta): Partial<EmpresaFormData> => {
    return {
      nomeCompleto: empresa.nome_completo,
      nomeAbreviado: empresa.nome_abreviado,
      linkSharepoint: empresa.link_sharepoint || '',
      templatePadrao: empresa.template_padrao as any,
      status: empresa.status as StatusEmpresa,
      descricaoStatus: empresa.descricao_status || '',
      emailGestor: empresa.email_gestor || '',
      produtos: empresa.produtos?.map(p => p.produto as Produto) || [],
      grupos: empresa.grupos?.map(g => g.grupo_id) || [],
      temAms: empresa.tem_ams || false,
      tipoBook: empresa.tipo_book as any || 'nao_tem_book',
      vigenciaInicial: empresa.vigencia_inicial || '',
      vigenciaFinal: empresa.vigencia_final || '',
      bookPersonalizado: empresa.book_personalizado || false,
      anexo: empresa.anexo || false,
    };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              Cadastro de Empresas
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gerencie empresas clientes e seus dados
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <ProtectedAction screenKey="empresas_clientes" requiredLevel="view">
              <EmpresaImportExportButtons
                empresas={empresasArray}
                onImportComplete={handleImportComplete}
              />
            </ProtectedAction>
            <ProtectedAction screenKey="empresas_clientes" requiredLevel="edit">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 text-sm"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nova Empresa</span>
                <span className="sm:hidden">Nova</span>
              </Button>
            </ProtectedAction>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-green-600">
                Ativas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl lg:text-2xl font-bold text-green-600">
                {stats.ativas}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-red-600">
                Inativas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl lg:text-2xl font-bold text-red-600">
                {stats.inativas}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-yellow-600">
                Suspensas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl lg:text-2xl font-bold text-yellow-600">
                {stats.suspensas}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Empresas */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <CardTitle className="text-lg lg:text-xl">Empresas Cadastradas ({empresas.length})</CardTitle>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                  className="flex items-center justify-center space-x-2"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filtros</span>
                </Button>
              </div>
            </div>
            {/* Filtros */}
            {mostrarFiltros && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Nome ou e-mail..."
                      value={buscaLocal}
                      onChange={(e) => handleBuscaChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={filtros.status?.[0] || '__todos_status__'}
                    onValueChange={handleStatusSelectChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__todos_status__">Todos os status</SelectItem>
                      {STATUS_EMPRESA_OPTIONS.filter(option => option.value !== 'Selecione').map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Produtos</label>
                  <Select
                    value={filtros.produtos?.[0] || '__todos_produtos__'}
                    onValueChange={handleProdutoSelectChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os produtos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__todos_produtos__">Todos os produtos</SelectItem>
                      {PRODUTOS_OPTIONS.filter(option => option.value !== 'Selecione').map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">E-mail Gestor</label>
                  <Input
                    placeholder="Filtrar por e-mail..."
                    value={filtros.emailGestor || ''}
                    onChange={(e) => handleFiltroChange('emailGestor', e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            <EmpresasTable
              empresas={empresasArray}
              loading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>

        {/* Modal de Criação */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Empresa</DialogTitle>
              <p>Preencha os dados para cadastrar um novo cliente</p>
            </DialogHeader>
            <EmpresaForm
              mode="create"
              grupos={grupos}
              onSubmit={handleCreate}
              onCancel={() => setShowCreateModal(false)}
              isLoading={isCreating}
            />
          </DialogContent>
        </Dialog>

        {/* Modal de Edição */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Empresa</DialogTitle>
            </DialogHeader>
            {selectedEmpresa && (
              <EmpresaForm
                mode="edit"
                initialData={getInitialDataForEdit(selectedEmpresa)}
                grupos={grupos}
                onSubmit={handleUpdate}
                onCancel={() => {
                  setShowEditModal(false);
                  setSelectedEmpresa(null);
                }}
                isLoading={isUpdating}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação de Exclusão */}
        <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a empresa "{selectedEmpresa?.nome_completo}"?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default EmpresasClientes;