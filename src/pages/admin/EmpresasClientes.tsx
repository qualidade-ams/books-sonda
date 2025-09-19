import { useState } from 'react';
import { Plus, Filter, Upload, Download, FileSpreadsheet, RefreshCw, FileText, ChevronDown } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

import { Checkbox } from '@/components/ui/checkbox';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useGrupos } from '@/hooks/useGrupos';
import { useEmpresasStats } from '@/hooks/useEmpresasStats';

import { EmpresaForm, EmpresasTable } from '@/components/admin/client-books';
import { ExcelImportDialog } from '@/components/admin/excel';
import ProtectedAction from '@/components/auth/ProtectedAction';
import { exportEmpresasToExcel, exportEmpresasToPDF } from '@/utils/empresasExportUtils';
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
    status: ['ativo'] // Por padrão, mostrar apenas empresas ativas
  });

  // Estados para modais
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Estados para empresa selecionada
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaClienteCompleta | null>(null);



  // Hooks
  const {
    empresas,
    selectedEmpresas,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,

    criarEmpresa,
    atualizarEmpresa,
    deletarEmpresa,

    toggleEmpresaSelection,
    selectAllEmpresas,
    clearSelection,
    forceRefresh,
  } = useEmpresas(filtros);

  // Garantir que empresas é sempre um array
  const empresasArray = Array.isArray(empresas) ? empresas : [];



  const { grupos } = useGrupos();

  // Hook para estatísticas reais do banco (independente dos filtros)
  const { data: statsReais } = useEmpresasStats();

  // Hook para monitoramento automático de vigências - DESABILITADO
  // useVigenciaMonitor({
  //   intervaloMinutos: 60, // Verificar a cada 1 hora
  //   diasAlerta: 30, // Alertar 30 dias antes do vencimento
  //   inativarAutomaticamente: true,
  //   executarAoIniciar: false // Não executar ao carregar a página para evitar sobrecarga
  // });

  // Handler para refresh após importação
  const handleImportComplete = () => {
    // O hook useEmpresas já tem revalidação automática via React Query
    // Não é necessário fazer nada específico aqui
  };

  // Handler para exportar empresas para Excel
  const handleExportEmpresasExcel = async () => {
    try {
      if (empresasArray.length === 0) {
        toast.warning('Nenhuma empresa encontrada para exportar');
        return;
      }
      await exportEmpresasToExcel(empresasArray);
      toast.success('Dados de empresas exportados para Excel com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar dados de empresas para Excel');
      console.error('Erro na exportação Excel:', error);
    }
  };

  // Handler para exportar empresas para PDF
  const handleExportEmpresasPDF = async () => {
    try {
      if (empresasArray.length === 0) {
        toast.warning('Nenhuma empresa encontrada para exportar');
        return;
      }
      await exportEmpresasToPDF(empresasArray);
      toast.success('Relatório PDF gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar relatório PDF');
      console.error('Erro na exportação PDF:', error);
    }
  };

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

  const handleStatusFilterChange = (status: StatusEmpresa, checked: boolean) => {
    setFiltros(prev => ({
      ...prev,
      status: checked
        ? [...(prev.status || []), status]
        : (prev.status || []).filter(s => s !== status)
    }));
  };

  const handleProdutoFilterChange = (produto: Produto, checked: boolean) => {
    setFiltros(prev => ({
      ...prev,
      produtos: checked
        ? [...(prev.produtos || []), produto]
        : (prev.produtos || []).filter(p => p !== produto)
    }));
  };

  const limparFiltros = () => {
    setFiltros({ status: ['ativo'] }); // Voltar ao padrão: apenas empresas ativas
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 text-sm"
                    size="sm"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Exportar</span>
                    <span className="sm:hidden">Export</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportEmpresasExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar Empresas para Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportEmpresasPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar para PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ProtectedAction>
            <ProtectedAction screenKey="empresas_clientes" requiredLevel="edit">
              <ExcelImportDialog
                onImportComplete={handleImportComplete}
                trigger={
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 text-sm"
                    size="sm"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Importar Excel</span>
                    <span className="sm:hidden">Importar</span>
                  </Button>
                }
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
              <CardTitle className="text-lg lg:text-xl">Empresas Cadastradas</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={forceRefresh}
                  disabled={isLoading}
                  className="flex items-center justify-center space-x-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                  className="flex items-center justify-center space-x-2"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filtros</span>
                </Button>
                {selectedEmpresas.length === 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllEmpresas}
                    disabled={empresasArray.length === 0}
                    className="whitespace-nowrap"
                  >
                    Selecionar Todas
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    className="whitespace-nowrap"
                  >
                    Limpar Seleção
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros Responsivos */}
            {mostrarFiltros && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-t space-y-4">
                {/* Busca */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Buscar empresa..."
                    value={filtros.busca || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFiltroChange('busca', e.target.value)}
                    className="h-8 flex-1"
                  />
                </div>

                {/* Filtros em Grid Responsivo */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Status */}
                  <div className="space-y-2">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Status:</span>
                    <div className="flex flex-wrap gap-3">
                      {STATUS_EMPRESA_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center space-x-1">
                          <Checkbox
                            id={`status-${option.value}`}
                            checked={filtros.status?.includes(option.value as StatusEmpresa) || false}
                            onCheckedChange={(checked) =>
                              handleStatusFilterChange(option.value as StatusEmpresa, checked as boolean)
                            }
                            className="h-4 w-4"
                          />
                          <Label htmlFor={`status-${option.value}`} className="text-xs cursor-pointer whitespace-nowrap">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Produtos */}
                  <div className="space-y-2">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Produtos:</span>
                    <div className="flex flex-wrap gap-3">
                      {PRODUTOS_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center space-x-1">
                          <Checkbox
                            id={`produto-${option.value}`}
                            checked={filtros.produtos?.includes(option.value as Produto) || false}
                            onCheckedChange={(checked) =>
                              handleProdutoFilterChange(option.value as Produto, checked as boolean)
                            }
                            className="h-4 w-4"
                          />
                          <Label htmlFor={`produto-${option.value}`} className="text-xs cursor-pointer whitespace-nowrap">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Botão Limpar */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={limparFiltros}
                    className="h-8 text-xs"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            )}


            <EmpresasTable
              empresas={empresasArray}
              loading={isLoading}
              selectedEmpresas={selectedEmpresas}
              onToggleSelection={toggleEmpresaSelection}
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