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
  Search,
  FileText,
  X
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

  // Remover o retorno antecipado quando não há grupos
  // Agora sempre mostra a tabela com filtros, mesmo sem resultados

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Grupos de Responsáveis ({grupos.length})
            </CardTitle>

            {onSearchChange && (
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
                {searchTerm !== '' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSearchChange('')}
                    className="whitespace-nowrap hover:border-red-300"
                  >
                    <X className="h-4 w-4 mr-2 text-red-600" />
                    Limpar Filtro
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Área de filtros expansível - PADRÃO DESIGN SYSTEM */}
          {mostrarFiltros && onSearchChange && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 gap-4">
                {/* Campo de busca com ícone */}
                <div>
                  <div className="text-sm font-medium mb-2">Buscar</div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por nome, descrição ou e-mail..."
                      value={searchTerm}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {grupos.length === 0 ? (
            // Mensagem de estado vazio DENTRO da tabela
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ? 'Nenhum grupo encontrado' : 'Nenhum grupo cadastrado'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                  ? 'Tente ajustar os filtros ou limpar a busca para ver todos os grupos.'
                  : 'Comece criando um novo grupo de responsáveis.'}
              </p>
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSearchChange && onSearchChange('')}
                  className="mt-4"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtro
                </Button>
              )}
            </div>
          ) : (
            // Tabela com dados
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">Nome</TableHead>
                  <TableHead className="font-semibold text-gray-700">E-mails</TableHead>
                  <TableHead className="font-semibold text-gray-700">Descrição</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-center w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupos.map((grupo) => (
                  <TableRow key={grupo.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{grupo.nome}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-600" />
                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs">
                          {grupo.emails?.length || 0}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-[300px] truncate text-sm text-gray-600">
                        {grupo.descricao || (
                          <span className="text-gray-400 italic">Sem descrição</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <ProtectedAction screenKey="grupos_responsaveis" requiredLevel="view">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onView(grupo)}
                            className="h-8 w-8 p-0"
                            title="Visualizar grupo"
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                        </ProtectedAction>
                        <ProtectedAction screenKey="grupos_responsaveis" requiredLevel="edit">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(grupo)}
                            className="h-8 w-8 p-0"
                            title="Editar grupo"
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
                            title="Excluir grupo"
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
          )}
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