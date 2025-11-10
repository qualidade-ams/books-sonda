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
  onEdit: (empresa: EmpresaClienteCompleta) => void;
  onDelete: (empresa: EmpresaClienteCompleta) => void;
}

const EmpresasTable: React.FC<EmpresasTableProps> = ({
  empresas,
  loading,
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

  const getTipoCobrancaBadge = (tipoCobranca: string | null) => {
    if (!tipoCobranca) return '-';

    const variants = {
      banco_horas: 'default',
      ticket: 'secondary'
    } as const;

    const labels = {
      banco_horas: 'Banco de Horas',
      ticket: 'Ticket'
    };

    return (
      <div className="flex justify-center">
        <Badge
          variant={variants[tipoCobranca as keyof typeof variants] || 'default'}
          className="text-xs px-2 py-1"
        >
          {labels[tipoCobranca as keyof typeof labels] || tipoCobranca}
        </Badge>
      </div>
    );
  };

  const getAmsBadge = (temAms: boolean) => {
    return (
      <div className="flex justify-center">
        <Badge
          variant={temAms ? 'default' : 'secondary'}
          className={`text-xs px-2 py-1 ${
            temAms 
              ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 dark:bg-primary/20 dark:text-primary-foreground dark:border-primary/30'
              : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
          }`}
        >
          {temAms ? 'Sim' : 'Não'}
        </Badge>
      </div>
    );
  };

  const getProdutosBadges = (produtos: any[]) => {
    if (!produtos || produtos.length === 0) return '-';

    const produtoLabels = {
      COMEX: 'Comex',
      FISCAL: 'Fiscal',
      GALLERY: 'Gallery'
    };


    return (
      <div className="flex flex-wrap gap-1">
        {produtos.map((produto, index) => (
          <Badge key={index} variant="outline" className="text-xs text-blue-600 border-blue-600">
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
      if (label.toLowerCase().includes('samarco')) return 'SAMARCO';
      if (label.toLowerCase().includes('novo nordisk')) return 'NOVO NORDISK';
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
    <div className="rounded-md mt-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[35%] min-w-[200px]">Nome</TableHead>
            <TableHead className="w-[8%] min-w-[70px]">Status</TableHead>
            <TableHead className="w-[12%] min-w-[90px]">Template</TableHead>
            <TableHead className="w-[8%] min-w-[70px] hidden xl:table-cell">Tem AMS</TableHead>
            <TableHead className="w-[15%] min-w-[120px] hidden xl:table-cell">Produtos</TableHead>
            <TableHead className="w-[15%] min-w-[140px] hidden 2xl:table-cell">E-mail Gestor</TableHead>
            <TableHead className="w-[7%] min-w-[90px] hidden 2xl:table-cell">Data Status</TableHead>
            <TableHead className="w-[10%] min-w-[90px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empresas.map((empresa) => (
            <TableRow key={empresa.id}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span className="truncate" title={empresa.nome_abreviado}>
                    {empresa.nome_abreviado}
                  </span>
                  {empresa.link_sharepoint && (
                    <a
                      href={empresa.link_sharepoint}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 mt-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span className="hidden lg:inline">SharePoint</span>
                      <span className="lg:hidden">SP</span>
                    </a>
                  )}
                  {/* Mostrar produtos em telas pequenas */}
                  <div className="xl:hidden mt-1">
                    {getProdutosBadges(empresa.produtos || [])}
                  </div>
                  {/* Mostrar email em telas pequenas */}
                  {empresa.email_gestor && (
                    <div className="2xl:hidden mt-1">
                      <a
                        href={`mailto:${empresa.email_gestor}`}
                        className="text-blue-600 hover:text-blue-800 text-xs truncate block"
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
              <TableCell className="hidden xl:table-cell">
                {getAmsBadge(empresa.tem_ams || false)}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                {getProdutosBadges(empresa.produtos || [])}
              </TableCell>
              <TableCell className="hidden 2xl:table-cell">
                {empresa.email_gestor ? (
                  <a
                    href={`mailto:${empresa.email_gestor}`}
                    className="text-blue-600 hover:text-blue-800 text-sm truncate block"
                    title={empresa.email_gestor}
                  >
                    {empresa.email_gestor}
                  </a>
                ) : (
                  '-'
                )}
              </TableCell>

              <TableCell className="hidden 2xl:table-cell text-sm text-gray-500">
                {formatDate(empresa.data_status)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <ProtectedAction screenKey="empresas_clientes" requiredLevel="edit">
                    <Button
                      variant="outline"
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
                      variant="outline"
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