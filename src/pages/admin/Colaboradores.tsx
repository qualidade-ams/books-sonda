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
import { ColaboradorForm, ColaboradoresTable } from '@/components/admin/client-books';
import { ClientImportExportButtons } from '@/components/admin/client-books/ClientImportExportButtons';
import { useColaboradores } from '@/hooks/useColaboradores';
import { useEmpresas } from '@/hooks/useEmpresas';
import ProtectedAction from '@/components/auth/ProtectedAction';
import type { ColaboradorCompleto, ColaboradorFormData, ColaboradorFiltros, ColaboradorStatus } from '@/types/clientBooksTypes';

const Colaboradores: React.FC = () => {
  // Estados para modais
  const [modalAberto, setModalAberto] = useState(false);
  const [colaboradorEditando, setColaboradorEditando] = useState<ColaboradorCompleto | null>(null);
  const [colaboradorExcluindo, setColaboradorExcluindo] = useState<ColaboradorCompleto | null>(null);

  // Hooks
  const {
    colaboradores,
    isLoading,
    error,
    filtrosAtivos,
    atualizarFiltros,
    criarColaborador,
    atualizarColaborador,
    deletarColaborador,
    isCriando,
    isAtualizando,
    isDeletando,
  } = useColaboradores();

  const { empresas, isLoading: isLoadingEmpresas } = useEmpresas({ status: ['ativo', 'inativo', 'suspenso'] });

  // Garantir que empresas é sempre um array válido
  const empresasArray = Array.isArray(empresas) ? empresas : [];

  // Handlers para ações
  const handleNovoColaborador = () => {
    setColaboradorEditando(null);
    setModalAberto(true);
  };

  const handleEditarColaborador = (colaborador: ColaboradorCompleto) => {
    setColaboradorEditando(colaborador);
    setModalAberto(true);
  };

  const handleExcluirColaborador = (colaborador: ColaboradorCompleto) => {
    setColaboradorExcluindo(colaborador);
  };

  const handleConfirmarExclusao = async () => {
    if (!colaboradorExcluindo) return;

    try {
      await deletarColaborador(colaboradorExcluindo.id);
      setColaboradorExcluindo(null);
    } catch (error) {
      console.error('Erro ao excluir colaborador:', error);
    }
  };

  const handleSalvarColaborador = async (data: ColaboradorFormData) => {
    try {
      if (colaboradorEditando) {
        await atualizarColaborador({
          id: colaboradorEditando.id,
          data,
        });
      } else {
        await criarColaborador(data);
      }
      setModalAberto(false);
      setColaboradorEditando(null);
    } catch (error) {
      console.error('Erro ao salvar colaborador:', error);
      throw error; // Re-throw para o form lidar com o erro
    }
  };

  const handleFiltrosChange = (novosFiltros: ColaboradorFiltros) => {
    atualizarFiltros(novosFiltros);
  };

  const handleFecharModal = () => {
    setModalAberto(false);
    setColaboradorEditando(null);
  };

  // Preparar dados iniciais do formulário
  const dadosIniciais = colaboradorEditando
    ? {
      nomeCompleto: colaboradorEditando.nome_completo,
      email: colaboradorEditando.email,
      funcao: colaboradorEditando.funcao || '',
      empresaId: colaboradorEditando.empresa_id,
      status: colaboradorEditando.status as ColaboradorStatus,
      descricaoStatus: colaboradorEditando.descricao_status || '',
      principalContato: colaboradorEditando.principal_contato,
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
                  Erro ao carregar colaboradores
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
              colaboradores={colaboradores}
              showColaboradores={true}
            />         
            <ProtectedAction screenKey="colaboradores" requiredLevel="edit">
              <Button
                onClick={handleNovoColaborador}
                className="flex items-center space-x-2"
                disabled={isLoadingEmpresas}
              >
                <Plus className="h-4 w-4" />
                <span>Novo Cliente</span>
              </Button>
            </ProtectedAction>
          </div>
        </div>

        {/* Tabela de Colaboradores */}
        <ColaboradoresTable
          colaboradores={colaboradores}
          empresas={empresasArray}
          loading={isLoading}
          filtros={filtrosAtivos}
          onFiltrosChange={handleFiltrosChange}
          onEdit={handleEditarColaborador}
          onDelete={handleExcluirColaborador}
          showEmpresaColumn={true}
        />

        {/* Modal de Formulário */}
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {colaboradorEditando ? 'Editar Colaborador' : 'Novo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {colaboradorEditando
                  ? 'Atualize as informações do colaborador'
                  : 'Preencha os dados para cadastrar um novo cliente'}
              </DialogDescription>
            </DialogHeader>

            <ColaboradorForm
              initialData={dadosIniciais}
              empresas={empresasArray}
              onSubmit={handleSalvarColaborador}
              onCancel={handleFecharModal}
              isLoading={isCriando || isAtualizando}
              mode={colaboradorEditando ? 'edit' : 'create'}
            />
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog
          open={!!colaboradorExcluindo}
          onOpenChange={() => setColaboradorExcluindo(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o colaborador{' '}
                <strong>{colaboradorExcluindo?.nome_completo}</strong>?
                <br />
                <br />
                Esta ação não pode ser desfeita. O colaborador será removido permanentemente
                do sistema.
                <br />
                <br />
                <strong>Nota:</strong> Colaboradores com histórico de disparos de e-mail não
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

export default Colaboradores;