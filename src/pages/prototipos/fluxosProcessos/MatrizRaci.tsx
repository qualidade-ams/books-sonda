// Matriz RACI derivada das tarefas do fluxo: etapa × cargo, editável por clique.
import { AlertTriangle, CheckCircle2, Table2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { CargoProcesso, FluxoProcesso, PapelRaci } from '../mocks/fluxosProcessos';
import { CLASSE_PAPEL, PAPEIS_RACI, ordenarEtapas, validarRaci } from './utils';

const CICLO: (PapelRaci | undefined)[] = [undefined, 'R', 'A', 'C', 'I'];

interface MatrizRaciProps {
  fluxo: FluxoProcesso;
  cargos: CargoProcesso[];
  somenteLeitura: boolean;
  onAlterar: (noId: string, cargoId: string, papel: PapelRaci | undefined) => void;
}

export function MatrizRaci({ fluxo, cargos, somenteLeitura, onAlterar }: MatrizRaciProps) {
  const tarefas = ordenarEtapas(fluxo.nodes, fluxo.edges).filter((n) => n.type === 'tarefa');

  if (tarefas.length === 0) {
    return (
      <EmptyState
        icon={<Table2 className="h-12 w-12 text-gray-400" />}
        title="Nenhuma tarefa no fluxo"
        description="A matriz RACI é montada a partir das tarefas desenhadas na aba Fluxo."
      />
    );
  }

  const pendentes = tarefas.filter((t) => validarRaci(t)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          {PAPEIS_RACI.map((p) => (
            <div key={p.papel} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded border font-semibold',
                  p.classe
                )}
              >
                {p.papel}
              </span>
              <span className="font-medium text-gray-900">{p.rotulo}</span>— {p.descricao}
            </div>
          ))}
        </div>
        {pendentes > 0 ? (
          <Badge className="bg-red-100 text-red-800">{pendentes} etapa(s) com pendência</Badge>
        ) : (
          <Badge className="bg-green-100 text-green-800">Matriz consistente</Badge>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-10 font-semibold text-gray-700">#</TableHead>
              <TableHead className="min-w-[240px] font-semibold text-gray-700">Etapa</TableHead>
              {cargos.map((c) => (
                <TableHead key={c.id} className="text-center text-xs font-semibold text-gray-700">
                  {c.nome}
                </TableHead>
              ))}
              <TableHead className="text-center font-semibold text-gray-700">Validação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tarefas.map((tarefa, i) => {
              const pendencia = validarRaci(tarefa);
              return (
                <TableRow key={tarefa.id} className="hover:bg-gray-50">
                  <TableCell className="text-sm text-gray-500">{i + 1}</TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-gray-900">{tarefa.data.rotulo}</span>
                    {tarefa.data.doc?.prazo && (
                      <div className="mt-1 text-xs text-gray-500">
                        Prazo: {tarefa.data.doc.prazo}
                      </div>
                    )}
                  </TableCell>
                  {cargos.map((c) => {
                    const papel = tarefa.data.doc?.raci[c.id];
                    const proximo = CICLO[(CICLO.indexOf(papel) + 1) % CICLO.length];
                    return (
                      <TableCell key={c.id} className="text-center">
                        <button
                          type="button"
                          disabled={somenteLeitura}
                          onClick={() => onAlterar(tarefa.id, c.id, proximo)}
                          title={somenteLeitura ? undefined : 'Clique para alternar o papel'}
                          className={cn(
                            'h-8 w-8 rounded border text-sm font-semibold transition-colors disabled:cursor-default',
                            papel
                              ? CLASSE_PAPEL[papel]
                              : 'border-dashed border-gray-200 text-transparent hover:border-gray-300'
                          )}
                        >
                          {papel ?? '·'}
                        </button>
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">
                    {pendencia ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {pendencia}
                      </span>
                    ) : (
                      <CheckCircle2 className="mx-auto h-4 w-4 text-green-600" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
