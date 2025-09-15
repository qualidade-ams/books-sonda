import { useState, useMemo } from 'react';
import { Plus, Filter, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useGrupos } from '@/hooks/useGrupos';
import { EmpresaForm, EmpresasTable } from '@/components/admin/client-books';
import { ExcelImportDialog } from '@/components/admin/excel';
import ProtectedAction from '@/components/auth/ProtectedAction';
import type {
  EmpresaFormData,
  EmpresaFiltros,
  StatusEmpresa,
  Produto,
  EmpresaClienteCompleta
} from '@/types/clientBooks';
import {
  STATUS_EMPRESA_OPTIONS,
  PRODUTOS_OPTIONS
} from '@/types/clientBooks';

const EmpresasClientes = () => {
  // Estados para filtros
  const [filtros, setFiltros] = useState<EmpresaFiltros>({
    status: ['ativo'], // Por padrão, mostrar apenas empresas ativas
  });

  // Estados para modais
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Estados para empresa selecionada
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaClienteCompleta | null>(null);

  // Estados para alteração em lote
  const [batchStatus, setBatchStatus] = useState<StatusEmpresa>('ativo');
  const [batchDescricao, setBatchDescricao] = useState('');

  // Hooks
  const {
    empresas,
    selectedEmpresas,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBatchUpdating,
    criarEmpresa,
    atualizarEmpresa,
    deletarEmpresa,
    alterarStatusLote,
    toggleEmpresaSelection,
    selectAllEmpresas,
    clearSelection,
  } = useEmpresas(filtros);

  // Garantir que empresas é sempre um array
  const empresasArray = Array.isArray(empresas) ? empresas : [];

  const { grupos } = useGrupos();

  // Handler para refresh após importação
  const handleImportComplete = () => {
    // O hook useEmpresas já tem revalidação automática via React Query
    // Não é necessário fazer nada específico aqui
  };

  // Estatísticas das empresas
  const stats = useMemo(() => {
    const total = empresasArray.length;
    const ativas = empresasArray.filter(e => e.status === 'ativo').length;
    const inativas = empresasArray.filter(e => e.status === 'inativo').length;
    const suspensas = empresasArray.filter(e => e.status === 'suspenso').length;

    return { total, ativas, inativas, suspensas };
  }, [empresasArray]);

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
    setFiltros({ status: ['ativo'] });
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

  const handleBatchUpdate = () => {
    if (selectedEmpresas.length === 0) return;
    setShowBatchModal(true);
  };

  const confirmBatchUpdate = async () => {
    if (selectedEmpresas.length === 0) return;
    await alterarStatusLote(selectedEmpresas, batchStatus, batchDescricao);
    setShowBatchModal(false);
    setBatchStatus('ativo');
    setBatchDescricao('');
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
    };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Cadastro de Empresas
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gerencie empresas clientes e seus dados
            </p>
          </div>
          <div className="flex gap-2">
            <ProtectedAction screenKey="empresas_clientes" requiredLevel="edit">
              <ExcelImportDialog
                onImportComplete={handleImportComplete}
                trigger={
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Importar Excel
                  </Button>
                }
              />
            </ProtectedAction>
            <ProtectedAction screenKey="empresas_clientes" requiredLevel="edit">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nova Empresa
              </Button>
            </ProtectedAction>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">
                Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.ativas}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">
                Inativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.inativas}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">
                Suspensas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.suspensas}
              </div>
            </CardContent>
          </Card>
        </div>



        {/* Ações em Lote */}
        {selectedEmpresas.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedEmpresas.length} empresa(s) selecionada(s)
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={clearSelection}
                  >
                    Limpar Seleção
                  </Button>
                  <ProtectedAction screenKey="empresas_clientes" requiredLevel="edit">
                    <Button
                      onClick={handleBatchUpdate}
                      disabled={isBatchUpdating}
                    >
                      Alterar Status
                    </Button>
                  </ProtectedAction>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Empresas */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Empresas Cadastradas</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                  className="flex items-center space-x-2"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filtros</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllEmpresas}
                  disabled={empresasArray.length === 0}
                >
                  Selecionar Todas
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros Compactos */}
            {mostrarFiltros && (
            <div className="flex items-center justify-between w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-t">
              <div className="flex items-center gap-6 flex-1">
                {/* Busca */}
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Buscar empresa..."
                    value={filtros.busca || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFiltroChange('busca', e.target.value)}
                    className="h-8"
                  />
                </div>

                {/* Status */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Status:</span>
                  <div className="flex gap-3">
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
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Produtos:</span>
                  <div className="flex gap-3">
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
              <Button
                variant="outline"
                size="sm"
                onClick={limparFiltros}
                className="h-8 text-xs ml-4"
              >
                Limpar
              </Button>
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
              <p>Preencha os dados para cadastrar um novo colaborador</p>
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

        {/* Modal de Alteração em Lote */}
        <Dialog open={showBatchModal} onOpenChange={setShowBatchModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Status em Lote</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="batch-status">Novo Status</Label>
                <Select
                  value={batchStatus}
                  onValueChange={(value) => setBatchStatus(value as StatusEmpresa)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_EMPRESA_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(batchStatus === 'inativo' || batchStatus === 'suspenso') && (
                <div>
                  <Label htmlFor="batch-descricao">Descrição (obrigatória)</Label>
                  <Textarea
                    id="batch-descricao"
                    value={batchDescricao}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBatchDescricao(e.target.value)}
                    placeholder="Motivo da alteração de status..."
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBatchModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmBatchUpdate}
                  disabled={
                    isBatchUpdating ||
                    ((batchStatus === 'inativo' || batchStatus === 'suspenso') && !batchDescricao.trim())
                  }
                >
                  {isBatchUpdating ? 'Alterando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>


      </div>
    </AdminLayout>
  );
};

export default EmpresasClientes;