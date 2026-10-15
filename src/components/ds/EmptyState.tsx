import * as React from 'react';

interface EmptyStateProps {
  titulo: string;
  descricao?: string;
  icone?: React.ReactNode;
  acao?: React.ReactNode;
}

/** Lista vazia, sem resultado de filtro ou sem seleção. */
export function EmptyState({ titulo, descricao, icone, acao }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      {icone && (
        <div className="mb-1 text-ds-fg-muted [&_svg]:size-8" aria-hidden>
          {icone}
        </div>
      )}
      <p className="text-base text-ds-fg">{titulo}</p>
      {descricao && <p className="max-w-md text-sm text-ds-fg-muted">{descricao}</p>}
      {acao && <div className="mt-3">{acao}</div>}
    </div>
  );
}
