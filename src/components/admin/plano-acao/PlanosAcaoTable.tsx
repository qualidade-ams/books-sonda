// =====================================================
// COMPONENTE: TABELA DE PLANOS DE AÇÃO
// =====================================================

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2, Eye, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import type { PlanoAcaoCompleto } from '@/types/planoAcao';
import { getCorPrioridade, getCorStatus } from '@/types/planoAcao';

interface PlanosAcaoTableProps {
  planos: PlanoAcaoCompleto[];
  onEdit: (plano: PlanoAcaoCompleto) => void;
  onDelete: (id: string) => void;
  onView: (plano: PlanoAcaoCompleto) => void;
  isLoading?: boolean;
}

export function PlanosAcaoTable({
  planos,
  onEdit,
  onDelete,
  onView,
  isLoading,
}: PlanosAcaoTableProps) {
  const [planoParaDeletar, setPlanoParaDeletar] = useState<string | null>(null);

  const handleConfirmarDelecao = () => {
    if (planoParaDeletar) {
      onDelete(planoParaDeletar);
      setPlanoParaDeletar(null);
    }
  };

  if (planos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum plano de ação encontrado</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Empresa</TableHead>
              <TableHead className="w-[150px]">Cliente</TableHead>
              <TableHead className="w-[120px]">Chamado</TableHead>
              <TableHead>Ação Corretiva</TableHead>
              <TableHead className="w-[100px]">Prioridade</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[110px]">Data Início</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {planos.map((plano) => (
              <TableRow key={plano.id}>
                <TableCell className="font-medium">
                  {plano.pesquisa?.empresa || '-'}
                </TableCell>
                <TableCell>{plano.pesquisa?.cliente || '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {plano.pesquisa?.tipo_caso && (
                      <span className="text-xs text-muted-foreground">
                        {plano.pesquisa.tipo_caso}
                      </span>
                    )}
                    {plano.pesquisa?.nro_caso && (
                      <span className="font-mono text-xs">
                        {plano.pesquisa.nro_caso}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[300px] truncate">
                    {plano.descricao_acao_corretiva}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getCorPrioridade(plano.prioridade)}>
                    {plano.prioridade.charAt(0).toUpperCase() + plano.prioridade.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getCorStatus(plano.status_plano)}>
                    {plano.status_plano === 'em_andamento'
                      ? 'Em Andamento'
                      : plano.status_plano === 'aguardando_retorno'
                      ? 'Aguardando'
                      : plano.status_plano.charAt(0).toUpperCase() + plano.status_plano.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(plano.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(plano)}
                      title="Visualizar detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(plano)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPlanoParaDeletar(plano.id)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!planoParaDeletar} onOpenChange={() => setPlanoParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este plano de ação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarDelecao} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
