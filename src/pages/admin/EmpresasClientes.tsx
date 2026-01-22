import { useState, useEffect } from 'react';
import { Plus, Filter, Search, ChevronLeft, ChevronRight, FileText, X, Building2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
import { useVirtualPagination } from '@/utils/requerimentosPerformance';

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
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [buscaLocal, setBuscaLocal] = useState(filtros.busca || '');
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Estados para empresa selecionada
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaClienteCompleta | null>(null);

  // Debounce para a busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltros(prev => ({ ...prev, busca: buscaLocal }));
      setCurrentPage(1); // Reset página ao filtrar
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
  
  // Paginação
  const paginatedData = useVirtualPagination(empresasArray, itemsPerPage, currentPage);

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
    setCurrentPage(1); // Reset página ao filtrar
  };

  const handleBuscaChange = (busca: string) => {
    setBuscaLocal(busca);
    setCurrentPage(1); // Reset página ao buscar
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
    setCurrentPage(1); // Reset página ao filtrar
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
    setCurrentPage(1); // Reset página ao filtrar
  };

  // Função para limpar todos os filtros
  const limparFiltros = () => {
    setFiltros({});
    setBuscaLocal('');
    setCurrentPage(1);
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

  const handleView = (empresa: EmpresaClienteCompleta) => {
    setSelectedEmpresa(empresa);
    setShowViewModal(true);
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
    // Converter inicio_vigencia (DATE) para formato MM/YYYY
    // IMPORTANTE: Usar UTC para evitar problemas de timezone
    let inicioVigenciaFormatado = '';
    if (empresa.inicio_vigencia) {
      const data = new Date(empresa.inicio_vigencia);
      // Usar getUTCMonth e getUTCFullYear para evitar conversão de timezone
      const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
      const ano = data.getUTCFullYear();
      inicioVigenciaFormatado = `${mes}/${ano}`;
    }

    // Converter baseline_horas_mensal de HH:MM:SS para HH:MM
    let baselineHorasFormatado = '';
    if (empresa.baseline_horas_mensal) {
      const horasStr = empresa.baseline_horas_mensal.toString();
      // Se está no formato HH:MM:SS (ex: "60:00:00"), converter para HH:MM
      if (horasStr.includes(':')) {
        const partes = horasStr.split(':');
        if (partes.length >= 2) {
          baselineHorasFormatado = `${partes[0]}:${partes[1]}`;
        }
      } else {
        baselineHorasFormatado = horasStr;
      }
    }

    return {
      id: empresa.id, // IMPORTANTE: Incluir o ID da empresa
      nomeCompleto: empresa.nome_completo,
      nomeAbreviado: empresa.nome_abreviado,
      linkSharepoint: empresa.link_sharepoint || '',
      templatePadrao: empresa.template_padrao as any,
      status: empresa.status as StatusEmpresa,
      descricaoStatus: empresa.descricao_status || '',
      emProjeto: empresa.em_projeto || false, // NOVO: Campo Em Projeto
      emailGestor: empresa.email_gestor || '',
      produtos: empresa.produtos?.map(p => p.produto as Produto) || [],
      grupos: empresa.grupos?.map(g => g.grupo_id) || [],
      temAms: empresa.tem_ams || false,
      tipoBook: empresa.tipo_book as any || 'nao_tem_book',
      tipoCobranca: empresa.tipo_cobranca as any || 'banco_horas',
      vigenciaInicial: empresa.vigencia_inicial || '',
      vigenciaFinal: empresa.vigencia_final || '',
      bookPersonalizado: empresa.book_personalizado || false,
      anexo: empresa.anexo || false,
      observacao: empresa.observacao || '',
      // NOVO: Parâmetros de Banco de Horas
      tipo_contrato: empresa.tipo_contrato as any || undefined,
      periodo_apuracao: empresa.periodo_apuracao || undefined,
      inicio_vigencia_banco_horas: inicioVigenciaFormatado,
      baseline_horas_mensal: baselineHorasFormatado || '00:00',
      baseline_tickets_mensal: empresa.baseline_tickets_mensal || undefined,
      possui_repasse_especial: empresa.possui_repasse_especial || false,
      ciclos_para_zerar: empresa.ciclos_para_zerar || undefined,
      percentual_repasse_mensal: empresa.percentual_repasse_mensal || 0,
      percentual_repasse_especial: empresa.percentual_repasse_especial || 0,
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-gray-600" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <p className="text-sm text-green-600">Ativas</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.ativas}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-600">Inativas</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.inativas}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <p className="text-sm text-orange-600">Suspensas</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">{stats.suspensas}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Empresas */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Empresas Cadastradas ({empresas.length})
              </CardTitle>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                  className="flex items-center justify-center space-x-2"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filtros</span>
                </Button>
                
                {/* Botão Limpar Filtro - só aparece se há filtros ativos */}
                {(buscaLocal !== '' || filtros.status || filtros.produtos || filtros.temAms !== undefined || filtros.emProjeto !== undefined) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={limparFiltros}
                    className="whitespace-nowrap hover:border-red-300"
                  >
                    <X className="h-4 w-4 mr-2 text-red-600" />
                    Limpar Filtro
                  </Button>
                )}
              </div>
            </div>

            {/* Área de filtros expansível - PADRÃO DESIGN SYSTEM */}
            {mostrarFiltros && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Campo de busca com ícone */}
                  <div>
                    <div className="text-sm font-medium mb-2">Buscar</div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Nome, e-mail gestor..."
                        value={buscaLocal}
                        onChange={(e) => handleBuscaChange(e.target.value)}
                        className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                      />
                    </div>
                  </div>

                  {/* Filtro Status */}
                  <div>
                    <div className="text-sm font-medium mb-2">Status</div>
                    <Select
                      value={filtros.status?.[0] || '__todos_status__'}
                      onValueChange={handleStatusSelectChange}
                    >
                      <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
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

                  {/* Filtro Produtos */}
                  <div>
                    <div className="text-sm font-medium mb-2">Produtos</div>
                    <Select
                      value={filtros.produtos?.[0] || '__todos_produtos__'}
                      onValueChange={handleProdutoSelectChange}
                    >
                      <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
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

                  {/* Filtro Tem AMS */}
                  <div>
                    <div className="text-sm font-medium mb-2">Tem AMS</div>
                    <Select
                      value={filtros.temAms === undefined ? '__todos_ams__' : filtros.temAms ? 'sim' : 'nao'}
                      onValueChange={(value) => {
                        if (value === '__todos_ams__') {
                          handleFiltroChange('temAms', undefined);
                        } else {
                          handleFiltroChange('temAms', value === 'sim');
                        }
                      }}
                    >
                      <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__todos_ams__">Todos</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro Em Projeto */}
                  <div>
                    <div className="text-sm font-medium mb-2">Em Projeto</div>
                    <Select
                      value={filtros.emProjeto === undefined ? '__todos_projeto__' : filtros.emProjeto ? 'sim' : 'nao'}
                      onValueChange={(value) => {
                        if (value === '__todos_projeto__') {
                          handleFiltroChange('emProjeto', undefined);
                        } else {
                          handleFiltroChange('emProjeto', value === 'sim');
                        }
                      }}
                    >
                      <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__todos_projeto__">Todos</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            <EmpresasTable
              empresas={paginatedData.items}
              loading={isLoading}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />

            {/* Controles de Paginação */}
            {!isLoading && empresasArray.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Mostrar</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      const newValue = value === 'todos' ? empresasArray.length : parseInt(value);
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
                  {paginatedData.startIndex}-{paginatedData.endIndex} de {paginatedData.totalItems} empresas
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Criação */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-sonda-blue">Nova Empresa</DialogTitle>
              <p className="text-sm text-gray-500">Preencha os dados para cadastrar um novo cliente</p>
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

        {/* Modal de Visualização */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-sonda-blue">Visualizar Empresa</DialogTitle>
              <p className="text-sm text-gray-500">Informações detalhadas da empresa</p>
            </DialogHeader>
            {selectedEmpresa && (
              <EmpresaForm
                mode="view"
                initialData={getInitialDataForEdit(selectedEmpresa)}
                grupos={grupos}
                onSubmit={async () => {}} // Não faz nada no modo view
                onCancel={() => {
                  setShowViewModal(false);
                  setSelectedEmpresa(null);
                }}
                isLoading={false}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Edição */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-sonda-blue">Editar Empresa</DialogTitle>
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