// Linha da lista de Ramos de Atividade: renomear no próprio lugar, inativar, excluir (só sem uso)
// e reordenar arrastando. Tudo fica no rascunho da tela até salvar.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, GripVertical, MoreHorizontal, Pencil, Trash2, XCircle } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { Button } from '@/components/ds/Button';
import { campo, itemMenu } from '@/components/ds/estilos';
import { cn } from '@/lib/utils';
import { plural } from '@/utils/plural';
import { nomeRepetido, usoDoRamo, type Pendencia } from '@/utils/ramosTela';
import type { RamoAtividade } from '@/types/ramosAtividade';

const TOM_DO_SELO: Record<Exclude<Pendencia, null>, 'info' | 'warning'> = {
  novo: 'info',
  alterado: 'info',
  inativado: 'warning',
  reativado: 'info',
};

export function LinhaRamo({
  ramo,
  pendencia,
  podeEditar,
  podeArrastar,
  outros,
  onRenomear,
  onAlterarStatus,
  onExcluir,
}: {
  ramo: RamoAtividade;
  pendencia: Pendencia;
  podeEditar: boolean;
  /** Com busca ou filtro a lista está incompleta: a ordem não muda */
  podeArrastar: boolean;
  /** Os outros ramos do rascunho, para o nome não repetir */
  outros: RamoAtividade[];
  onRenomear: (nome: string) => void;
  onAlterarStatus: () => void;
  onExcluir: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ramo.id,
    disabled: !podeArrastar,
  });
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(ramo.nome);
  const erro = !nome.trim()
    ? t('fase3Comum.obrigatorio')
    : nomeRepetido(nome, outros)
      ? t('ramosAtividade.lista.repetido')
      : null;
  const empresas = usoDoRamo(ramo);

  // Enter ou sair do campo aplica o nome no rascunho; Esc desfaz
  const aplicar = () => {
    if (erro) return;
    if (nome.trim() !== ramo.nome) onRenomear(nome.trim());
    setEditando(false);
  };
  const desfazer = () => {
    setNome(ramo.nome);
    setEditando(false);
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 md:px-4',
        pendencia && 'bg-ds-accent-subtle/40',
        isDragging &&
          'relative z-10 rounded-lg bg-ds-bg-raised shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]'
      )}
    >
      {podeEditar && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={!podeArrastar}
          aria-label={t('fase3Comum.reordenar', { nome: ramo.nome })}
          title={
            podeArrastar
              ? t('fase3Comum.arrasteParaOrdenar')
              : t('ramosAtividade.linha.limpeParaReordenar')
          }
          className="grid h-9 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-md text-ds-fg-muted hover:bg-ds-bg-subtle hover:text-ds-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
      )}

      {editando ? (
        <div className="min-w-0 flex-1">
          <input
            autoFocus
            aria-label={t('ramosAtividade.linha.novoNome', { nome: ramo.nome })}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onBlur={() => (erro ? desfazer() : aplicar())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') aplicar();
              if (e.key === 'Escape') desfazer();
            }}
            aria-invalid={!!erro}
            className={cn(campo, erro && 'border-ds-danger-fg')}
          />
          <p className={cn('mt-1.5 text-xs', erro ? 'text-ds-danger-fg' : 'text-ds-fg-muted')}>
            {erro ?? (
              <>
                {t('ramosAtividade.linha.enterAplica')}
                {empresas > 0 &&
                  ` ${t('ramosAtividade.linha.aoSalvarNome', {
                    empresas: plural(t, 'ramosAtividade.empresas', empresas),
                  })}`}
              </>
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'flex flex-wrap items-center gap-2 text-sm font-medium',
                !ramo.ativo && 'text-ds-fg-muted'
              )}
            >
              <span className="truncate">{ramo.nome}</span>
              {!ramo.ativo && pendencia !== 'inativado' && (
                <StatusBadge>{t('fase3Comum.inativo')}</StatusBadge>
              )}
              {pendencia && (
                <StatusBadge tom={TOM_DO_SELO[pendencia]}>
                  {t(`ramosAtividade.selo.${pendencia}`)}
                </StatusBadge>
              )}
            </p>
            <p className="text-xs text-ds-fg-muted">
              {empresas
                ? t('ramosAtividade.linha.uso', {
                    principal: plural(t, 'ramosAtividade.empresas', ramo.empresasPrincipal),
                    secundario: ramo.empresasSecundario,
                  })
                : t('ramosAtividade.linha.nenhumaEmpresa')}
            </p>
          </div>
          {podeEditar && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  tamanho="icone"
                  variante="fantasma"
                  aria-label={t('fase3Comum.acoesDe', { nome: ramo.nome })}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                data-ds="v2"
                align="end"
                className="min-w-52 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
              >
                <DropdownMenuItem className={itemMenu} onSelect={() => setEditando(true)}>
                  <Pencil className="h-4 w-4" /> {t('ramosAtividade.linha.renomear')}
                </DropdownMenuItem>
                <DropdownMenuItem className={itemMenu} onSelect={onAlterarStatus}>
                  {ramo.ativo ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {ramo.ativo ? t('fase3Comum.inativar') : t('fase3Comum.reativar')}
                </DropdownMenuItem>
                {/* Só ramo sem uso pode ser excluído; o que está em uso é inativado */}
                <DropdownMenuItem
                  className={cn(
                    itemMenu,
                    'text-ds-danger-fg focus:bg-ds-danger-bg data-[disabled]:pointer-events-none data-[disabled]:text-ds-fg-disabled'
                  )}
                  disabled={empresas > 0}
                  onSelect={onExcluir}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="flex flex-col">
                    {t('ramosAtividade.linha.excluir')}
                    {empresas > 0 && (
                      <span className="text-xs font-normal">{t('ramosAtividade.linha.emUso')}</span>
                    )}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      )}
    </li>
  );
}
