// Peças pequenas da tela Produtos e Módulos: texto com lista na dica, grupos do Aranda,
// bancos que usam e o menu "⋯" das linhas.
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, MoreHorizontal, Pencil, Trash2, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ds/Button';
import { Vazio } from '@/components/ds/Formulario';
import { itemMenu } from '@/components/ds/estilos';
import { cn } from '@/lib/utils';
import { plural } from '@/utils/plural';
import type { UsoEmBanco } from '@/types/catalogo';

/** Texto com uma lista na dica (grupos do Aranda, bancos que usam) */
export function ComLista({
  rotulo,
  itens,
  children,
}: {
  rotulo: string;
  itens: ReactNode[];
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="cursor-default rounded underline decoration-ds-border-strong decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent
        data-ds="v2"
        className="max-w-sm border-ds-border bg-ds-bg-raised font-ds-sans text-xs text-ds-fg"
      >
        <p className="mb-1 font-medium">{rotulo}</p>
        <ul className="space-y-0.5 text-ds-fg-secondary">
          {itens.map((i, n) => (
            <li key={n}>{i}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

export function ListaGrupos({ titulo, grupos }: { titulo: string; grupos: string[] }) {
  const { t } = useTranslation();
  if (!grupos.length)
    return (
      <span className="inline-flex items-center gap-1.5 text-ds-warning-fg">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        {t('fase3Comum.nenhum')}
      </span>
    );
  return (
    <ComLista rotulo={titulo} itens={grupos}>
      <span className="font-mono text-xs">{grupos[0]}</span>
      {grupos.length > 1 && (
        <span className="ml-1.5 text-xs text-ds-fg-muted">+{grupos.length - 1}</span>
      )}
    </ComLista>
  );
}

export function ListaUsos({ usos }: { usos: (UsoEmBanco & { produtoInteiro?: boolean })[] }) {
  const { t } = useTranslation();
  if (!usos.length) return <Vazio />;
  return (
    <ComLista
      rotulo={t('produtosModulos.usos.titulo')}
      itens={usos.map(
        (u) =>
          `${u.empresa} › ${u.banco}${u.produtoInteiro ? ` (${t('produtosModulos.usos.produtoInteiro')})` : ''}`
      )}
    >
      <span className="tabular-nums">{plural(t, 'fase3Comum.bancos', usos.length)}</span>
    </ComLista>
  );
}

/** Bancos que usam, por extenso, na tela de edição */
export function UsosNaEdicao({
  usos,
  nenhum,
}: {
  usos: (UsoEmBanco & { produtoInteiro?: boolean })[];
  nenhum: string;
}) {
  const { t } = useTranslation();
  return usos.length ? (
    <ul className="space-y-1.5 text-sm">
      {usos.map((u) => (
        <li key={`${u.bancoId}|${u.moduloId ?? ''}`}>
          <span className="font-medium">{u.empresa}</span>
          <span className="text-ds-fg-secondary"> › {u.banco}</span>
          {u.produtoInteiro && (
            <span className="text-xs text-ds-fg-muted">
              {' '}
              · {t('produtosModulos.usos.produtoInteiro')}
            </span>
          )}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-ds-fg-muted">{nenhum}</p>
  );
}

export function MenuAcoes({
  nome,
  ativo,
  onEditar,
  onAlterarStatus,
  onExcluir,
  extras,
}: {
  nome: string;
  ativo: boolean;
  onEditar: () => void;
  onAlterarStatus: () => void;
  /** Só para o item que nunca foi usado */
  onExcluir?: () => void;
  /** Ações a mais, antes de inativar (ex.: mover módulo "A classificar") */
  extras?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    // O menu fica dentro da linha clicável: o clique nele não pode abrir a edição
    <div
      className="flex justify-end"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            tamanho="icone"
            variante="fantasma"
            aria-label={t('fase3Comum.acoesDe', { nome })}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          data-ds="v2"
          align="end"
          className="min-w-48 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
        >
          <DropdownMenuItem className={itemMenu} onSelect={onEditar}>
            <Pencil className="h-4 w-4" /> {t('fase3Comum.editar')}
          </DropdownMenuItem>
          {extras}
          <DropdownMenuItem
            className={cn(itemMenu, ativo && 'text-ds-danger-fg focus:bg-ds-danger-bg')}
            onSelect={onAlterarStatus}
          >
            {ativo ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {ativo ? t('fase3Comum.inativar') : t('fase3Comum.reativar')}
          </DropdownMenuItem>
          {onExcluir && (
            <DropdownMenuItem
              className={cn(itemMenu, 'text-ds-danger-fg focus:bg-ds-danger-bg')}
              onSelect={onExcluir}
            >
              <Trash2 className="h-4 w-4" /> {t('fase3Comum.excluir')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
