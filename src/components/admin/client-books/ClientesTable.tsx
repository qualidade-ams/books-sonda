import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Edit, 
  Trash2, 
  Users, 
  Search, 
  Filter,
  Mail,
  Star,
  Building2,
  CheckCircle,
  XCircle,
  FileText,
  X
} from 'lucide-react';
import ProtectedAction from '@/components/auth/ProtectedAction';
import type { 
  ClienteCompleto, 
  ClienteFiltros, 
  ClienteStatus,
  EmpresaCliente 
} from '@/types/clientBooksTypes';
import { STATUS_Cliente_OPTIONS } from '@/types/clientBooksTypes';

interface ClientesTableProps {
  clientes: ClienteCompleto[];
  empresas?: EmpresaCliente[];
  loading: boolean;
  filtros: ClienteFiltros;
  onFiltrosChange: (filtros: ClienteFiltros) => void;
  onEdit: (cliente: ClienteCompleto) => void;
  onDelete: (cliente: ClienteCompleto) => void;
  showEmpresaColumn?: boolean; // Para quando não estiver filtrado por empresa específica
  // Props de paginação
  paginationControls?: React.ReactNode;
}

const ClientesTable: React.FC<ClientesTableProps> = ({
  clientes,
  empresas = [],
  loading,
  filtros,
  onFiltrosChange,
  onEdit,
  onDelete,
  paginationControls,
  showEmpresaColumn = true,
}) => {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [buscaLocal, setBuscaLocal] = useState(filtros.busca || '');

  // Debounce para a busca
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltrosChange({ ...filtros, busca: buscaLocal });
    }, 500); // 500ms de delay

    return () => clearTimeout(timer);
  }, [buscaLocal, filtros, onFiltrosChange]);

  // Sincronizar busca local com filtros externos
  useEffect(() => {
    setBuscaLocal(filtros.busca || '');
  }, [filtros.busca]);

  const handleBuscaChange = (busca: string) => {
    setBuscaLocal(busca);
  };

  const handleStatusChange = (status: string) => {
    if (status === 'todos') {
      onFiltrosChange({ ...filtros, status: undefined });
    } else {
      onFiltrosChange({ ...filtros, status: [status as ClienteStatus] });
    }
  };

  const handleEmpresaChange = (empresaId: string) => {
    if (empresaId === 'todas') {
      onFiltrosChange({ ...filtros, empresaId: undefined });
    } else {
      onFiltrosChange({ ...filtros, empresaId });
    }
  };

  // Função para limpar todos os filtros
  const limparFiltros = () => {
    setBuscaLocal('');
    onFiltrosChange({});
  };

  const getStatusBadge = (status: ClienteStatus) => {
    switch (status) {
      case 'ativo':
        return (
          <Badge variant="default" className="bg-blue-600 text-white border-blue-600 text-xs px-2 py-1">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ativo
          </Badge>
        );
      case 'inativo':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200 text-xs px-2 py-1">
            <XCircle className="h-3 w-3 mr-1" />
            Inativo
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xs px-2 py-1">{status}</Badge>;
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  // Filtrar empresas ativas para o select
  const empresasAtivas = empresas.filter(empresa => empresa.status === 'ativo');

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando clientes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Clientes ({clientes.length})
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
            {(buscaLocal !== '' || filtros.status || filtros.empresaId) && (
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Campo de busca com ícone */}
              <div>
                <div className="text-sm font-medium mb-2">Buscar</div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Nome ou e-mail..."
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
                  value={filtros.status?.[0] || 'todos'}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    {STATUS_Cliente_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Empresa */}
              {showEmpresaColumn && empresasAtivas.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Empresa</div>
                  <Select
                    value={filtros.empresaId || 'todas'}
                    onValueChange={handleEmpresaChange}
                  >
                    <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                      <SelectValue placeholder="Todas as empresas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as empresas</SelectItem>
                      {empresasAtivas
                        .sort((a, b) => a.nome_abreviado.localeCompare(b.nome_abreviado, 'pt-BR'))
                        .map((empresa) => (
                          <SelectItem key={empresa.id} value={empresa.id}>
                            {empresa.nome_abreviado}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {clientes.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nenhum cliente encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              {filtros.busca || filtros.status || filtros.empresaId
                ? 'Tente ajustar os filtros para encontrar clientes'
                : 'Cadastre o primeiro cliente para começar'}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <Table className="w-full" style={{ tableLayout: 'fixed' }}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Cliente</TableHead>
                {showEmpresaColumn && <TableHead className="w-[18%]">Empresa</TableHead>}
                <TableHead className="w-[12%] hidden xl:table-cell">Função</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="w-[13%]">Atualizado</TableHead>
                <TableHead className="w-[12%]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        {cliente.principal_contato && (
                          <span title="Contato Principal">
                            <Star className="h-4 w-4 text-blue-600 fill-current flex-shrink-0" />
                          </span>
                        )}
                        <span className="truncate">
                          {cliente.nome_completo}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{cliente.email}</span>
                      </div>
                      {/* Mostrar função em telas pequenas */}
                      {cliente.funcao && (
                        <div className="xl:hidden text-xs text-gray-500 mt-1">
                          {cliente.funcao}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {showEmpresaColumn && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">
                          {cliente.empresa.nome_abreviado}
                        </span>
                      </div>
                    </TableCell>
                  )}

                  <TableCell className="hidden xl:table-cell">
                    <span className="truncate block">
                      {cliente.funcao || '-'}
                    </span>
                  </TableCell>

                  <TableCell>
                    {getStatusBadge(cliente.status as ClienteStatus)}
                  </TableCell>

                  <TableCell className="text-sm text-gray-500">
                    {formatarData(cliente.updated_at)}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <ProtectedAction screenKey="clientes" requiredLevel="edit">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(cliente)}
                          className='h-8 w-8 p-0'
                          title="Editar cliente"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </ProtectedAction>
                      <ProtectedAction screenKey="clientes" requiredLevel="edit">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDelete(cliente)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                          title="Excluir cliente"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ProtectedAction>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
        
        {/* Controles de Paginação */}
        {paginationControls}
      </CardContent>
    </Card>
  );
};

export default ClientesTable;