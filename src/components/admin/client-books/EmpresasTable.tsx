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
  Users,
  Mail,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ProtectedAction from '@/components/auth/ProtectedAction';
import { useBookTemplates } from '@/hooks/useBookTemplates';
import { verificarVigenciaEmpresa } from '@/services/vigenciaService';
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
  
  const getVigenciaIndicator = (empresa: EmpresaClienteCompleta) => {
    // Verificar se a empresa tem campos de vigência (pode não ter se migração não foi aplicada)
    if (!('vigencia_final' in empresa) || !empresa.vigencia_final) {
      return null;
    }

    const vigenciaInfo = verificarVigenciaEmpresa(empresa.vigencia_final, 30);
    
    if (vigenciaInfo.vencida) {
      return (
        <div className="flex items-center gap-1 text-red-600" title="Vigência vencida">
          <AlertTriangle className="h-3 w-3" />
          <span className="text-xs">Vencida</span>
        </div>
      );
    }
    
    if (vigenciaInfo.proximaVencimento) {
      const dias = vigenciaInfo.diasRestantes || 0;
      return (
        <div className="flex items-center gap-1 text-orange-600" title={`Vence em ${dias} dias`}>
          <Clock className="h-3 w-3" />
          <span className="text-xs">{dias}d</span>
        </div>
      );
    }
    
    return null;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      ativo: 'default',
      inativo: 'destructive',
      suspenso: 'secondary'
    } as const;

    const labels = {
      ativo: 'Ativo',
      inativo: 'Inativo',
      suspenso: 'Suspenso'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <span className="sr-only">Seleção</span>
            </TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Nome Abreviado</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Vigência</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Produtos</TableHead>
            <TableHead>Colaboradores</TableHead>
            <TableHead>E-mail Gestor</TableHead>
            <TableHead>Data Status</TableHead>
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
                  <span>{empresa.nome_completo}</span>
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
                </div>
              </TableCell>
              <TableCell>{empresa.nome_abreviado}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {getStatusBadge(empresa.status)}
                  {empresa.descricao_status && (
                    <span className="text-xs text-gray-500 max-w-32 truncate" title={empresa.descricao_status}>
                      {empresa.descricao_status}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {getVigenciaIndicator(empresa)}
              </TableCell>
              <TableCell>
                {getTemplateBadge(empresa.template_padrao)}
              </TableCell>
              <TableCell>
                {getProdutosBadges(empresa.produtos || [])}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span>{empresa.colaboradores?.length || 0}</span>
                  {empresa.colaboradores?.some(c => c.principal_contato) && (
                    <Badge variant="outline" className="text-xs ml-1">
                      Principal
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {empresa.email_gestor ? (
                  <a
                    href={`mailto:${empresa.email_gestor}`}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {empresa.email_gestor}
                  </a>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {formatDate(empresa.data_status)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <ProtectedAction screenKey="empresas_clientes" requiredLevel="edit">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(empresa)}
                      className="h-8 w-8 p-0"
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