import React, { useState } from 'react';
import { Plus, Users, AlertCircle } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import type { ClienteCompleto, ClienteFormData, ClienteFiltros, ClienteStatus } from '@/types/clientBooksTypes';

const Clientes: React.FC = () => {
  // Estados para modais
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<ClienteCompleto | null>(null);
  const [clienteExcluindo, setClienteExcluindo] = useState<ClienteCompleto | null>(null);

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

  // Garantir que empresas é sempre um array válido
  const empresasArray = Array.isArray(empresas) ? empresas : [];

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
    for (const cliente of clientes) {
      try {
        const resultado = await criarCliente(cliente);
        resultados.push(resultado);
      } catch (error) {
        console.error('Erro ao importar cliente:', cliente.nomeCompleto, error);
        throw error;
      }
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

  // Preparar dados iniciais do formulário
  const dadosIniciais = clienteEditando
    ? {
      nomeCompleto: clienteEditando.nome_completo,
      email: clienteEditando.email,
      funcao: clienteEditando.funcao || '',
      empresaId: clienteEditando.empresa_id,
      status: clienteEditando.status as ClienteStatus,
      descricaoStatus: clienteEditando.descricao_status || '',
      principalContato: clienteEditando.principal_contato,
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
                className="flex items-center space-x-2"
                disabled={isLoadingEmpresas}
              >
                <Plus className="h-4 w-4" />
                <span>Novo Cliente</span>
              </Button>
            </ProtectedAction>
          </div>
        </div>

        {/* Tabela de Clientes */}
        <ClientesTable
          clientes={clientes}
          empresas={empresasArray}
          loading={isLoading}
          filtros={filtrosAtivos}
          onFiltrosChange={handleFiltrosChange}
          onEdit={handleEditarCliente}
          onDelete={handleExcluirCliente}
          showEmpresaColumn={true}
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