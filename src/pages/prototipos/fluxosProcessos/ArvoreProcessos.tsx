// Árvore hierárquica de processos (dimensão → grupo → processo) com busca.
import { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GrupoArvore, Processo } from '../mocks/fluxosProcessos';
import { BADGE_STATUS } from './utils';

interface ArvoreProcessosProps {
  grupos: GrupoArvore[];
  processos: Processo[];
  selecionadoId: string | null;
  busca: string;
  onSelecionar: (id: string) => void;
}

export function caminhoDoGrupo(
  grupos: GrupoArvore[],
  grupoId: string,
  trilha: string[] = []
): string[] | null {
  for (const g of grupos) {
    if (g.id === grupoId) return [...trilha, g.nome];
    const achou = caminhoDoGrupo(g.filhos, grupoId, [...trilha, g.nome]);
    if (achou) return achou;
  }
  return null;
}

export function gruposFolha(grupos: GrupoArvore[]): GrupoArvore[] {
  return grupos.flatMap((g) => (g.filhos.length ? gruposFolha(g.filhos) : [g]));
}

export function ArvoreProcessos({
  grupos,
  processos,
  selecionadoId,
  busca,
  onSelecionar,
}: ArvoreProcessosProps) {
  const [recolhidos, setRecolhidos] = useState<Set<string>>(new Set());
  const termo = busca.trim().toLowerCase();
  const visiveis = processos.filter(
    (p) => !termo || `${p.codigo} ${p.nome}`.toLowerCase().includes(termo)
  );

  const temProcesso = (g: GrupoArvore): boolean =>
    visiveis.some((p) => p.grupoId === g.id) || g.filhos.some(temProcesso);

  const alternar = (id: string) =>
    setRecolhidos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });

  const renderGrupo = (g: GrupoArvore, nivel: number) => {
    if (termo && !temProcesso(g)) return null;
    const aberto = termo ? true : !recolhidos.has(g.id);
    const Seta = aberto ? ChevronDown : ChevronRight;
    const Pasta = aberto ? FolderOpen : Folder;

    return (
      <li key={g.id}>
        <button
          type="button"
          onClick={() => alternar(g.id)}
          className="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-sm font-medium text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          style={{ paddingLeft: nivel * 12 + 4 }}
        >
          <Seta className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <Pasta className="h-4 w-4 shrink-0 text-sonda-blue" />
          <span className="truncate">{g.nome}</span>
        </button>
        {aberto && (
          <ul>
            {g.filhos.map((f) => renderGrupo(f, nivel + 1))}
            {visiveis
              .filter((p) => p.grupoId === g.id)
              .map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelecionar(p.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left text-sm transition-colors',
                      p.id === selecionadoId
                        ? 'bg-blue-50 font-medium text-sonda-blue dark:bg-gray-800'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    )}
                    style={{ paddingLeft: (nivel + 1) * 12 + 22 }}
                  >
                    <Workflow className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">
                      {p.codigo} {p.nome}
                    </span>
                    <span
                      className={cn('h-2 w-2 shrink-0 rounded-full', BADGE_STATUS[p.status].ponto)}
                      title={BADGE_STATUS[p.status].rotulo}
                    />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </li>
    );
  };

  if (termo && visiveis.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-sm text-gray-500">
        Nenhum processo encontrado para “{busca}”.
      </p>
    );
  }

  return <ul className="space-y-0.5">{grupos.map((g) => renderGrupo(g, 0))}</ul>;
}
