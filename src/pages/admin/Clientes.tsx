import React, { useState } from 'react';
import { Plus, Users, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ClienteForm, ClientesTable } from '@/components/admin/client-books';
import { ClientImportExportButtons } from '@/components/admin/client-books/ClientImportExportButtons';
import { useClientes } from '@/hooks/useClientes';
import { useEmpresas } from '@/hooks/useEmpresas';
import ProtectedAction from '@/components/auth/ProtectedAction';
import { useVirtualPagination } from '@/utils/requerimentosPerformance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { 
  ClienteCompleto, 
  ClienteFormData, 
  ClienteFiltros, 
  ClienteStatus,
  EmpresaClienteCompleta 
} from '@/types/clientBooksTypes';

const Clientes: React.FC = () => {
  // Estados para modais
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<ClienteCompleto | null>(null);
  const [clienteExcluindo, setClienteExcluindo] = useState<ClienteCompleto | null>(null);
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Hooks
  const {
    clientes,
    isLoading,
    error,
    filtrosAtivos,
    atualizarFiltros,
    criarCliente,
    atualizarCliente,
    deletarCliente,
    isCriando,
    isAtualizando,
    isDeletando,
  } = useClientes();

  const { empresas, isLoading: isLoadingEmpresas } = useEmpresas({ status: ['ativo', 'inativo', 'suspenso'] });

  // Garantir que empresas é sempre um array válido e converter para o tipo correto
  const empresasArray = Array.isArray(empresas) 
    ? empresas as unknown as EmpresaClienteCompleta[]
    : [];
  
  // Paginação
  const paginatedData = useVirtualPagination(clientes, itemsPerPage, currentPage);

  // Handlers para ações
  const handleNovoCliente = () => {
    setClienteEditando(null);
    setModalAberto(true);
  };

  const handleEditarCliente = (cliente: ClienteCompleto) => {
    setClienteEditando(cliente);
    setModalAberto(true);
  };

  const handleExcluirCliente = (cliente: ClienteCompleto) => {
    setClienteExcluindo(cliente);
  };

  const handleConfirmarExclusao = async () => {
    if (!clienteExcluindo) return;

    try {
      await deletarCliente(clienteExcluindo.id);
      setClienteExcluindo(null);
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
    }
  };

  const handleSalvarCliente = async (data: ClienteFormData) => {
    try {
      if (clienteEditando) {
        await atualizarCliente({
          id: clienteEditando.id,
          data,
        });
      } else {
        await criarCliente(data);
      }
      setModalAberto(false);
      setClienteEditando(null);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      throw error; // Re-throw para o form lidar com o erro
    }
  };

  // Handler para importação de clientes em lote
  const handleImportClientes = async (clientes: ClienteFormData[]) => {
    const resultados = [];
    const erros = [];
    
    for (const cliente of clientes) {
      try {
        const resultado = await criarCliente(cliente);
        resultados.push(resultado);
      } catch (error) {
        console.error('Erro ao importar cliente:', cliente.nomeCompleto, error);
        erros.push({
          cliente: cliente.nomeCompleto,
          erro: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
    
    // Se houver erros, incluir na resposta mas não interromper o processo
    if (erros.length > 0) {
      console.warn('Erros na importação de clientes:', erros);
    }
    
    return resultados;
  };

  const handleFiltrosChange = (novosFiltros: ClienteFiltros) => {
    atualizarFiltros(novosFiltros);
  };

  const handleFecharModal = () => {
    setModalAberto(false);
    setClienteEditando(null);
  };

  // Calcular estatísticas dos clientes
  const stats = {
    total: clientes.length,
    ativos: clientes.filter(c => c.status === 'ativo').length,
    inativos: clientes.filter(c => c.status === 'inativo').length,
    principais: clientes.filter(c => c.principal_contato).length,
  };

  // Preparar dados iniciais do formulário
  const dadosIniciais = clienteEditando
    ? {
      nomeCompleto: clienteEditando.nome_completo || '',
      email: clienteEditando.email || '',
      funcao: clienteEditando.funcao || '',
      empresaId: clienteEditando.empresa_id || '',
      status: (clienteEditando.status as ClienteStatus) || 'ativo',
      descricaoStatus: clienteEditando.descricao_status || '',
      principalContato: clienteEditando.principal_contato || false,
    }
    : undefined;

  if (error) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Erro ao carregar clientes
                </h3>
                <p className="text-gray-600 mb-4">
                  Ocorreu um erro ao carregar os dados. Tente novamente.
                </p>
                <Button onClick={() => window.location.reload()}>
                  Tentar Novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Gerenciamento de Clientes
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
                Cadastre e gerencie clientes relacionados a empresas
            </p>
          </div>
          <div className="flex gap-2">
            <ClientImportExportButtons 
              empresas={empresasArray}
              clientes={clientes}
              onImportClientes={handleImportClientes}
              showClientes={true}
            />         
            <ProtectedAction screenKey="clientes" requiredLevel="edit">
              <Button
                onClick={handleNovoCliente}
                className="flex items-center gap-2 text-sm"
                size="sm"
                disabled={isLoadingEmpresas}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Cliente</span>
                <span className="sm:hidden">Novo</span>
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
              <CardTitle className="text-xs lg:text-sm font-medium text-blue-600">
                Ativos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl lg:text-2xl font-bold text-blue-600">
                {stats.ativos}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-gray-600">
                Inativos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl lg:text-2xl font-bold text-gray-600">
                {stats.inativos}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-orange-600">
                Principais
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl lg:text-2xl font-bold text-orange-600">
                {stats.principais}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Clientes */}
        <ClientesTable
          clientes={paginatedData.items}
          empresas={empresasArray}
          loading={isLoading}
          filtros={filtrosAtivos}
          onFiltrosChange={handleFiltrosChange}
          onEdit={handleEditarCliente}
          onDelete={handleExcluirCliente}
          showEmpresaColumn={true}
          paginationControls={
            !isLoading && clientes.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Mostrar</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      const newValue = value === 'todos' ? clientes.length : parseInt(value);
                      setItemsPerPage(newValue);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="todos">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Navegação de páginas */}
                {paginatedData.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={!paginatedData.hasPrevPage}
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                      Página {currentPage} de {paginatedData.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(paginatedData.totalPages, prev + 1))}
                      disabled={!paginatedData.hasNextPage}
                      aria-label="Próxima página"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Contador de registros */}
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {paginatedData.startIndex}-{paginatedData.endIndex} de {paginatedData.totalItems} clientes
                </div>
              </div>
            ) : undefined
          }
        />

        {/* Modal de Formulário */}
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {clienteEditando ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {clienteEditando
                  ? 'Atualize as informações do cliente'
                  : 'Preencha os dados para cadastrar um novo cliente'}
              </DialogDescription>
            </DialogHeader>

            <ClienteForm
              initialData={dadosIniciais}
              empresas={empresasArray}
              onSubmit={handleSalvarCliente}
              onCancel={handleFecharModal}
              isLoading={isCriando || isAtualizando}
              mode={clienteEditando ? 'edit' : 'create'}
            />
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog
          open={!!clienteExcluindo}
          onOpenChange={() => setClienteExcluindo(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o cliente{' '}
                <strong>{clienteExcluindo?.nome_completo}</strong>?
                <br />
                <br />
                Esta ação não pode ser desfeita. O cliente será removido permanentemente
                do sistema.
                <br />
                <br />
                <strong>Nota:</strong> Clientes com histórico de disparos de e-mail não
                podem ser excluídos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletando}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmarExclusao}
                disabled={isDeletando}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeletando ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default Clientes;