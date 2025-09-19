import React from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Edit,
  Trash2,
  ExternalLink,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ProtectedAction from '@/components/auth/ProtectedAction';
import { useBookTemplates } from '@/hooks/useBookTemplates';

import type {
  EmpresaClienteCompleta
} from '@/types/clientBooks';

interface EmpresasTableProps {
  empresas: EmpresaClienteCompleta[];
  loading: boolean;
  selectedEmpresas: string[];
  onToggleSelection: (empresaId: string) => void;
  onEdit: (empresa: EmpresaClienteCompleta) => void;
  onDelete: (empresa: EmpresaClienteCompleta) => void;
}

const EmpresasTable: React.FC<EmpresasTableProps> = ({
  empresas,
  loading,
  selectedEmpresas,
  onToggleSelection,
  onEdit,
  onDelete,
}) => {
  const { getTemplateById, isDefaultTemplate } = useBookTemplates();



  const getStatusBadge = (status: string) => {
    const variants = {
      ativo: 'default',
      inativo: 'destructive',
      suspenso: 'outline' // Usar outline como base para customizar
    } as const;

    const labels = {
      ativo: 'Ativo',
      inativo: 'Inativo',
      suspenso: 'Suspenso'
    };

    // Classe customizada para suspenso (bege)
    const customClass = status === 'suspenso'
      ? 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
      : '';

    return (
      <div className="flex justify-center">
        <Badge
          variant={variants[status as keyof typeof variants] || 'default'}
          className={`text-xs px-2 py-1 ${customClass}`}
        >
          {labels[status as keyof typeof labels] || status}
        </Badge>
      </div>
    );
  };

  const getProdutosBadges = (produtos: any[]) => {
    if (!produtos || produtos.length === 0) return '-';

    const produtoLabels = {
      CE_PLUS: 'CE Plus',
      FISCAL: 'Fiscal',
      GALLERY: 'Gallery'
    };

    return (
      <div className="flex flex-wrap gap-1">
        {produtos.map((produto, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            {produtoLabels[produto.produto as keyof typeof produtoLabels] || produto.produto}
          </Badge>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const getTemplateBadge = (templateId: string) => {
    const template = getTemplateById(templateId);

    if (!template) {
      return (
        <Badge variant="destructive" className="text-xs">
          Template não encontrado
        </Badge>
      );
    }

    // Mapear templates para siglas mais concisas
    const getTemplateDisplayName = (label: string) => {
      if (label.toLowerCase().includes('português') || label.toLowerCase().includes('portugues')) return 'PT-BR';
      if (label.toLowerCase().includes('inglês') || label.toLowerCase().includes('ingles')) return 'EN';
      return label; // Para outros templates, manter o nome original
    };

    return (
      <div className="flex items-center gap-1">
        <Mail className="h-3 w-3" />
        <Badge
          variant={isDefaultTemplate(templateId) ? "secondary" : "default"}
          className="text-xs"
        >
          {getTemplateDisplayName(template.label)}
        </Badge>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Carregando empresas...</div>
      </div>
    );
  }

  if (empresas.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Nenhuma empresa encontrada</div>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">
              <span className="sr-only">Seleção</span>
            </TableHead>
            <TableHead className="min-w-[290px]">Nome</TableHead>
            <TableHead className="min-w-[40px]">Status</TableHead>
            <TableHead className="min-w-[80px]">Template</TableHead>
            <TableHead className="min-w-[150px] hidden md:table-cell">Produtos</TableHead>
            <TableHead className="min-w-[180px] hidden lg:table-cell">E-mail Gestor</TableHead>
            <TableHead className="min-w-[80px] hidden xl:table-cell">Data Status</TableHead>
            <TableHead className="w-32">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empresas.map((empresa) => (
            <TableRow key={empresa.id}>
              <TableCell>
                <Checkbox
                  checked={selectedEmpresas.includes(empresa.id)}
                  onCheckedChange={() => onToggleSelection(empresa.id)}
                />
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span className="truncate max-w-[290px]" title={empresa.nome_completo}>
                    {empresa.nome_completo}
                  </span>
                  {empresa.link_sharepoint && (
                    <a
                      href={empresa.link_sharepoint}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mt-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      SharePoint
                    </a>
                  )}
                  {/* Mostrar produtos em telas pequenas */}
                  <div className="md:hidden mt-1">
                    {getProdutosBadges(empresa.produtos || [])}
                  </div>
                  {/* Mostrar email em telas pequenas */}
                  {empresa.email_gestor && (
                    <div className="lg:hidden mt-1">
                      <a
                        href={`mailto:${empresa.email_gestor}`}
                        className="text-blue-600 hover:text-blue-800 text-xs truncate max-w-[150px] block"
                        title={empresa.email_gestor}
                      >
                        {empresa.email_gestor}
                      </a>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex">
                  {getStatusBadge(empresa.status)}
                  {/* Mostrar data do status em telas pequenas */}
                  <span className="xl:hidden text-xs text-gray-400">
                    {formatDate(empresa.data_status)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {getTemplateBadge(empresa.template_padrao)}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {getProdutosBadges(empresa.produtos || [])}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {empresa.email_gestor ? (
                  <a
                    href={`mailto:${empresa.email_gestor}`}
                    className="text-blue-600 hover:text-blue-800 text-sm truncate max-w-[200px] block"
                    title={empresa.email_gestor}
                  >
                    {empresa.email_gestor}
                  </a>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="hidden xl:table-cell text-sm text-gray-500">
                {formatDate(empresa.data_status)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <ProtectedAction screenKey="empresas_clientes" requiredLevel="edit">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(empresa)}
                      className="h-8 w-8 p-0"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </ProtectedAction>
                  <ProtectedAction screenKey="empresas_clientes" requiredLevel="edit">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(empresa)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                      title="Excluir"
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
  );
};

export default EmpresasTable;