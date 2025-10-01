import React, { useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Mail,
  Users,
  Eye,
  Filter,
  Search
} from 'lucide-react';
import ProtectedAction from '@/components/auth/ProtectedAction';
import { GrupoResponsavelCompleto } from '@/types/clientBooksTypes';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GruposTableProps {
  grupos: GrupoResponsavelCompleto[];
  onEdit: (grupo: GrupoResponsavelCompleto) => void;
  onDelete: (id: string) => void;
  onView: (grupo: GrupoResponsavelCompleto) => void;
  isLoading?: boolean;
  isDeleting?: boolean;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

export function GruposTable({
  grupos,
  onEdit,
  onDelete,
  onView,
  isLoading = false,
  isDeleting = false,
  searchTerm = '',
  onSearchChange
}: GruposTableProps) {
  const [grupoToDelete, setGrupoToDelete] = useState<GrupoResponsavelCompleto | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const handleDeleteClick = (grupo: GrupoResponsavelCompleto) => {
    setGrupoToDelete(grupo);
  };

  const handleConfirmDelete = () => {
    if (grupoToDelete) {
      onDelete(grupoToDelete.id);
      setGrupoToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return 'Data inválida';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Carregando grupos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (grupos.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum grupo encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comece criando um novo grupo de responsáveis.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg lg:text-xl">Grupos de Responsáveis ({grupos.length})</CardTitle>
            {onSearchChange && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>Filtros</span>
              </Button>
            )}
          </div>

          {/* Filtros */}
          {mostrarFiltros && onSearchChange && (
            <div className="pt-4 border-t">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar por nome, descrição ou e-mail..."
                      value={searchTerm}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>E-mails</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupos.map((grupo) => (
                  <TableRow key={grupo.id}>
                    <TableCell className="font-medium">
                      {grupo.nome}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[350px] truncate">
                        {grupo.descricao || (
                          <span className="text-gray-400 italic">Sem descrição</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-600" />
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          {grupo.emails?.length || 0} e-mail{(grupo.emails?.length || 0) !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex space-x-2">
                        <ProtectedAction screenKey="grupos_responsaveis" requiredLevel="view">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onView(grupo)}
                            className='h-8 w-8 p-0'
                            title="Editar cliente"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </ProtectedAction>
                        <ProtectedAction screenKey="grupos_responsaveis" requiredLevel="edit">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(grupo)}
                            className='h-8 w-8 p-0'
                            title="Editar cliente"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </ProtectedAction>
                        <ProtectedAction screenKey="grupos_responsaveis" requiredLevel="edit">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(grupo)}
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
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!grupoToDelete} onOpenChange={() => setGrupoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o grupo "{grupoToDelete?.nome}"?
              {grupoToDelete?.emails && grupoToDelete.emails.length > 0 && (
                <span className="block mt-2 text-sm">
                  Este grupo possui {grupoToDelete.emails.length} e-mail{grupoToDelete.emails.length !== 1 ? 's' : ''} cadastrado{grupoToDelete.emails.length !== 1 ? 's' : ''}.
                </span>
              )}
              <span className="block mt-2 font-medium text-red-600">
                Esta ação não pode ser desfeita.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}