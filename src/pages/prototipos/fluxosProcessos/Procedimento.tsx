// Procedimento documentado: leitura sequencial do processo gerada a partir do fluxo e da documentação.
import { GitBranch, ListOrdered } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import type { CargoProcesso, FluxoProcesso, NoFluxo, Processo } from '../mocks/fluxosProcessos';
import { cargosComPapel, nomeCargo, ordenarEtapas } from './utils';

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{rotulo}</dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
        {valor || <span className="text-gray-400">Não informado</span>}
      </dd>
    </div>
  );
}

function Lista({ rotulo, itens }: { rotulo: string; itens: string[] }) {
  if (!itens.length) return null;
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{rotulo}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {itens.map((i) => (
          <Badge key={i} variant="outline" className="text-xs font-normal">
            {i}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function Etapa({
  etapa,
  numero,
  cargos,
}: {
  etapa: NoFluxo;
  numero: number;
  cargos: CargoProcesso[];
}) {
  const doc = etapa.data.doc;

  if (etapa.type === 'decisao') {
    return (
      <div className="flex gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
        <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-yellow-700" />
        <div>
          <p className="text-sm font-medium text-gray-900">Decisão: {etapa.data.rotulo}</p>
          {doc?.descricao && <p className="mt-1 text-sm text-gray-600">{doc.descricao}</p>}
        </div>
      </div>
    );
  }

  const papeis = (papel: 'R' | 'A' | 'C' | 'I') =>
    cargosComPapel(etapa, papel)
      .map((c) => nomeCargo(cargos, c))
      .join(', ') || '—';

  return (
    <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sonda-blue text-sm font-semibold text-white">
          {numero}
        </span>
        <div className="flex-1 space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              {etapa.data.rotulo}
            </h4>
            {doc?.prazo && (
              <Badge className="bg-blue-100 text-blue-800 text-xs">Prazo: {doc.prazo}</Badge>
            )}
          </div>
          {doc?.descricao && <p className="text-sm text-gray-600">{doc.descricao}</p>}
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ['Responsável', 'R'],
                ['Aprovador', 'A'],
                ['Consultado', 'C'],
                ['Informado', 'I'],
              ] as const
            ).map(([rotulo, papel]) => (
              <div key={papel}>
                <dt className="text-xs text-gray-500">{rotulo}</dt>
                <dd className="font-medium text-gray-900">{papeis(papel)}</dd>
              </div>
            ))}
          </dl>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Lista rotulo="Entradas" itens={doc?.entradas ?? []} />
            <Lista rotulo="Saídas" itens={doc?.saidas ?? []} />
            <Lista rotulo="Sistemas" itens={doc?.sistemas ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Procedimento({
  processo,
  fluxo,
  cargos,
}: {
  processo: Processo;
  fluxo: FluxoProcesso;
  cargos: CargoProcesso[];
}) {
  const etapas = ordenarEtapas(fluxo.nodes, fluxo.edges);
  let numero = 0;

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 md:grid-cols-2 dark:bg-gray-800">
        <Campo rotulo="Objetivo" valor={processo.objetivo} />
        <Campo rotulo="Escopo" valor={processo.escopo} />
        <Campo rotulo="Gatilho" valor={processo.gatilho} />
        <Campo rotulo="Dono do processo" valor={nomeCargo(cargos, processo.donoCargoId)} />
        {processo.regras.length > 0 && (
          <div className="md:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Regras de negócio
            </dt>
            <dd>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-gray-900 dark:text-gray-100">
                {processo.regras.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>

      <div className="space-y-3">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Etapas</h3>
        {etapas.length === 0 ? (
          <EmptyState
            icon={<ListOrdered className="h-12 w-12 text-gray-400" />}
            title="Sem etapas documentadas"
            description="Desenhe o fluxo na aba Fluxo para gerar o procedimento."
          />
        ) : (
          etapas.map((etapa) => (
            <Etapa
              key={etapa.id}
              etapa={etapa}
              cargos={cargos}
              numero={etapa.type === 'tarefa' ? ++numero : numero}
            />
          ))
        )}
      </div>
    </div>
  );
}
