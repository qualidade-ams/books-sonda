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
  Edit, 
  Trash2, 
  Shield, 
  Search, 
  Filter,
  Mail,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';
import type { GrupoResponsavelCompleto } from '@/types/clientBooks';

interface GruposFiltros {
  busca?: string;
}

interface GruposTableProps {
  grupos: GrupoResponsavelCompleto[];
  loading: boolean;
  onEdit: (grupo: GrupoResponsavelCompleto) => void;
  onDelete: (grupo: GrupoResponsavelCompleto) => void;
  onViewEmails: (grupo: GrupoResponsavelCompleto) => void;
}

const GruposTable: React.FC<GruposTableProps> = ({
  grupos,
  loading,
  onEdit,
  onDelete,
  onViewEmails,
}) => {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState<GruposFiltros>({});
  const [gruposExpandidos, setGruposExpandidos] = useState<Set<string>>(new Set());

  const handleBuscaChange = (busca: string) => {
    setFiltros({ ...filtros, busca });
  };

  const toggleGrupoExpandido = (grupoId: string) => {
    const novosExpandidos = new Set(gruposExpandidos);
    if (novosExpandidos.has(grupoId)) {
      novosExpandidos.delete(grupoId);
    } else {
      novosExpandidos.add(grupoId);
    }
    setGruposExpandidos(novosExpandidos);
  };

  // Filtrar grupos baseado na busca
  const gruposFiltrados = grupos.filter(grupo => {
    if (!filtros.busca) return true;
    
    const busca = filtros.busca.toLowerCase();
    return (
      grupo.nome.toLowerCase().includes(busca) ||
      grupo.descricao?.toLowerCase().includes(busca) ||
      grupo.emails.some(email => 
        email.email.toLowerCase().includes(busca) ||
        email.nome?.toLowerCase().includes(busca)
      )
    );
  });

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const renderEmails = (emails: any[], grupoId: string) => {
    const isExpandido = gruposExpandidos.has(grupoId);
    const emailsParaMostrar = isExpandido ? emails : emails.slice(0, 2);
    
    return (
      <div className="space-y-1">
        {emailsParaMostrar.map((email, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <Mail className="h-3 w-3 text-gray-400" />
            <span className="text-gray-700">{email.email}</span>
            {email.nome && (
              <span className="text-gray-500">({email.nome})</span>
            )}
          </div>
        ))}
        
        {emails.length > 2 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleGrupoExpandido(grupoId)}
            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
          >
            {isExpandido ? (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Mostrar menos
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                +{emails.length - 2} mais
              </>
            )}
          </Button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando grupos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Grupos de Responsáveis ({gruposFiltrados.length})</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
          </Button>
        </div>

        {/* Filtros */}
        {mostrarFiltros && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nome do grupo ou e-mail..."
                  value={filtros.busca || ''}
                  onChange={(e) => handleBuscaChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {gruposFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nenhum grupo encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              {filtros.busca
                ? 'Tente ajustar os filtros para encontrar grupos'
                : 'Crie o primeiro grupo de responsáveis para começar'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Grupo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>E-mails</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gruposFiltrados.map((grupo) => (
                <TableRow key={grupo.id}>
                  <TableCell>
                    <div className="font-medium flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span>{grupo.nome}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {grupo.descricao || '-'}
                    </span>
                  </TableCell>

                  <TableCell className="max-w-md">
                    {grupo.emails.length > 0 ? (
                      renderEmails(grupo.emails, grupo.id)
                    ) : (
                      <span className="text-gray-500 text-sm">Nenhum e-mail</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="flex items-center space-x-1 text-blue-600 border-blue-600">
                      <Users className="h-3 w-3" />
                      <span>{grupo.emails.length}</span>
                    </Badge>
                  </TableCell>

                  <TableCell className="text-sm text-gray-500">
                    {formatarData(grupo.updated_at)}
                  </TableCell>

                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewEmails(grupo)}
                        title="Ver todos os e-mails"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(grupo)}
                        title="Editar grupo"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(grupo)}
                        title="Excluir grupo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default GruposTable;