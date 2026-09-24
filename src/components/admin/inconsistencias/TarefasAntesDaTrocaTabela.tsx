import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TarefasAntesDaTroca } from '@/types/inconsistenciasChamados';

const formatadorData = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

interface TarefasAntesDaTrocaTabelaProps {
  dados: TarefasAntesDaTroca | undefined;
  isLoading: boolean;
}

/**
 * Tarefas apontadas antes da troca de código de resolução (soma = coluna Tempo),
 * exibidas no modal de detalhes da inconsistência.
 */
export function TarefasAntesDaTrocaTabela({ dados, isLoading }: TarefasAntesDaTrocaTabelaProps) {
  if (isLoading) {
    return <p className="text-sm text-gray-500">Carregando tarefas...</p>;
  }

  if (!dados || dados.tarefas.length === 0) {
    return <p className="text-sm text-gray-500">Nenhuma tarefa apontada antes da troca.</p>;
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="text-xs font-semibold text-gray-700">Nº Tarefa</TableHead>
            <TableHead className="text-xs font-semibold text-gray-700">Data</TableHead>
            <TableHead className="text-xs font-semibold text-gray-700">Analista</TableHead>
            <TableHead className="text-xs font-semibold text-gray-700 text-right">Tempo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dados.tarefas.map((tarefa, i) => (
            <TableRow key={`${tarefa.nro_tarefa}-${i}`}>
              <TableCell className="text-xs font-mono text-blue-600 py-2">{tarefa.nro_tarefa || '-'}</TableCell>
              <TableCell className="text-xs py-2">{formatadorData.format(new Date(tarefa.data_sistema))}</TableCell>
              <TableCell className="text-xs py-2">{tarefa.analista || '-'}</TableCell>
              <TableCell className="text-xs font-mono text-right py-2">{tarefa.tempo_gasto_horas}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-gray-50">
            <TableCell colSpan={3} className="text-xs font-semibold py-2">Total</TableCell>
            <TableCell className="text-xs font-mono font-semibold text-right py-2">{dados.total_horas}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
