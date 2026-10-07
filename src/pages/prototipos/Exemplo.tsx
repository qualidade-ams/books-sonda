// Protótipo de referência da skill `prototipo`: copie este arquivo como ponto de partida.
import { AlertTriangle, Clock, Edit, FileText, FileX, Plus } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PrototipoProps } from '@/utils/prototipos';
import { ITENS_EXEMPLO, type ItemExemplo } from './mocks/exemplo';

const BADGE_STATUS: Record<ItemExemplo['status'], { classe: string; rotulo: string }> = {
  ativo: { classe: 'bg-green-100 text-green-800', rotulo: 'Ativo' },
  pendente: { classe: 'bg-yellow-100 text-yellow-800', rotulo: 'Pendente' },
  inativo: { classe: 'bg-red-100 text-red-800', rotulo: 'Inativo' },
};

function Conteudo({ estado }: PrototipoProps) {
  if (estado === 'carregando') {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (estado === 'erro') {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-12 w-12 text-red-500" />}
        title="Erro ao carregar os chamados"
        description="Não foi possível buscar os dados. Tente novamente."
        action={<Button variant="outline">Tentar novamente</Button>}
      />
    );
  }

  if (estado === 'vazio') {
    return (
      <EmptyState
        icon={<FileX className="h-12 w-12 text-gray-400" />}
        title="Nenhum chamado encontrado"
        description="Não há chamados lançados neste período."
        action={
          <Button className="bg-sonda-blue hover:bg-sonda-dark-blue">
            <Plus className="h-4 w-4 mr-2" />
            Novo Chamado
          </Button>
        }
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50">
          <TableHead className="font-semibold text-gray-700">Chamado</TableHead>
          <TableHead className="font-semibold text-gray-700">Cliente</TableHead>
          <TableHead className="font-semibold text-gray-700">Módulo</TableHead>
          <TableHead className="font-semibold text-gray-700 text-center">Horas</TableHead>
          <TableHead className="font-semibold text-gray-700 text-center">Status</TableHead>
          <TableHead className="font-semibold text-gray-700 text-center w-24">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ITENS_EXEMPLO.map(item => (
          <TableRow key={item.id} className="hover:bg-gray-50">
            <TableCell>
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-blue-600">{item.chamado}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{item.tipo}</div>
            </TableCell>
            <TableCell><span className="font-medium">{item.cliente}</span></TableCell>
            <TableCell><Badge className="bg-blue-100 text-blue-800 text-xs">{item.modulo}</Badge></TableCell>
            <TableCell className="text-center"><span className="font-mono text-sm font-semibold">{item.horas}</span></TableCell>
            <TableCell className="text-center">
              <Badge className={`${BADGE_STATUS[item.status].classe} text-xs`}>{BADGE_STATUS[item.status].rotulo}</Badge>
            </TableCell>
            <TableCell className="text-center">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Edit className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function Exemplo({ estado }: PrototipoProps) {
  const total = estado === 'dados' ? ITENS_EXEMPLO.length : 0;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="px-6 py-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Chamados (exemplo)</h1>
              <p className="text-muted-foreground mt-1">Protótipo de referência com dados fictícios</p>
            </div>
            <Button size="sm" className="bg-sonda-blue hover:bg-sonda-dark-blue">
              <Plus className="h-4 w-4 mr-2" />
              Novo Chamado
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Total
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-sonda-blue">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Horas
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-sonda-blue">{estado === 'dados' ? '25:30' : '00:00'}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sonda-blue">Chamados do período</CardTitle>
              <CardDescription>Lista de chamados lançados</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Conteudo estado={estado} />
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
