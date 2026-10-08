import type {
  ArestaFluxo,
  CargoProcesso,
  NoFluxo,
  PapelRaci,
  StatusProcesso,
  TipoNo,
} from '../mocks/fluxosProcessos';

export const BADGE_STATUS: Record<
  StatusProcesso,
  { classe: string; rotulo: string; ponto: string }
> = {
  rascunho: { classe: 'bg-gray-100 text-gray-800', rotulo: 'Rascunho', ponto: 'bg-gray-400' },
  em_revisao: {
    classe: 'bg-yellow-100 text-yellow-800',
    rotulo: 'Em revisão',
    ponto: 'bg-yellow-500',
  },
  publicado: { classe: 'bg-green-100 text-green-800', rotulo: 'Publicado', ponto: 'bg-green-500' },
};

export const PAPEIS_RACI: {
  papel: PapelRaci;
  rotulo: string;
  descricao: string;
  classe: string;
}[] = [
  {
    papel: 'R',
    rotulo: 'Responsável',
    descricao: 'Executa a etapa',
    classe: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    papel: 'A',
    rotulo: 'Aprovador',
    descricao: 'Responde pelo resultado (apenas um)',
    classe: 'bg-green-100 text-green-800 border-green-200',
  },
  {
    papel: 'C',
    rotulo: 'Consultado',
    descricao: 'Opina antes da execução',
    classe: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  {
    papel: 'I',
    rotulo: 'Informado',
    descricao: 'É comunicado do resultado',
    classe: 'bg-gray-100 text-gray-700 border-gray-200',
  },
];

export const CLASSE_PAPEL: Record<PapelRaci, string> = Object.fromEntries(
  PAPEIS_RACI.map((p) => [p.papel, p.classe])
) as Record<PapelRaci, string>;

export const ROTULO_TIPO: Record<TipoNo, string> = {
  inicio: 'Evento de início',
  fim: 'Evento de fim',
  link: 'Link com outro processo',
  tarefa: 'Tarefa',
  decisao: 'Decisão (exclusiva)',
  paralelo: 'Paralelo',
  raia: 'Raia (cargo)',
};

/** Distância (px) entre um nó e o próximo passo criado pela alça, e tamanho da tarefa criada. */
export const DISTANCIA_PROXIMO = 60;
export const TAMANHO_TAREFA = { w: 160, h: 72 };

export function nomeCargo(cargos: CargoProcesso[], id: string | undefined): string {
  return cargos.find((c) => c.id === id)?.nome ?? '—';
}

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function cargosComPapel(no: NoFluxo, papel: PapelRaci): string[] {
  return Object.entries(no.data.doc?.raci ?? {})
    .filter(([, p]) => p === papel)
    .map(([cargoId]) => cargoId);
}

/** Valida a linha RACI de uma tarefa: exatamente um Aprovador e ao menos um Responsável. */
export function validarRaci(no: NoFluxo): string | null {
  const aprovadores = cargosComPapel(no, 'A').length;
  if (cargosComPapel(no, 'R').length === 0) return 'Sem Responsável';
  if (aprovadores === 0) return 'Sem Aprovador';
  if (aprovadores > 1) return 'Mais de um Aprovador';
  return null;
}

/** Percorre o fluxo a partir dos nós sem entrada (início/links) e devolve tarefas e decisões na ordem de execução. */
export function ordenarEtapas(nodes: NoFluxo[], edges: ArestaFluxo[]): NoFluxo[] {
  const porId = new Map(nodes.map((n) => [n.id, n]));
  const comEntrada = new Set(edges.map((e) => e.target));
  const fila = nodes.filter((n) => n.type !== 'raia' && !comEntrada.has(n.id)).map((n) => n.id);
  const visitados = new Set<string>();
  const ordem: NoFluxo[] = [];

  while (fila.length) {
    const id = fila.shift()!;
    if (visitados.has(id)) continue;
    visitados.add(id);
    const no = porId.get(id);
    if (no && (no.type === 'tarefa' || no.type === 'decisao')) ordem.push(no);
    edges.filter((e) => e.source === id).forEach((e) => fila.push(e.target));
  }

  // Etapas soltas (sem ligação com o fluxo) vão para o fim.
  nodes.filter((n) => n.type === 'tarefa' && !visitados.has(n.id)).forEach((n) => ordem.push(n));
  return ordem;
}
