import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from './Button';

interface ConfirmDialogProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  titulo: string;
  /** O efeito da ação, em uma frase */
  descricao?: string;
  consequencias?: string[];
  rotuloConfirmar: string;
  tom?: 'padrao' | 'perigo';
  /** Exige texto antes de confirmar (ex.: aprovar ou descartar ajuste retroativo) */
  justificativa?: { rotulo: string; placeholder?: string };
  processando?: boolean;
  /** Campo próprio da confirmação (ex.: produto de destino ao mover um módulo) */
  children?: React.ReactNode;
  /** O campo próprio ainda não está pronto */
  confirmarDesabilitado?: boolean;
  onConfirmar: (justificativa?: string) => void;
}

/** Confirmação que diz a consequência. No celular, ocupa a largura toda na base da tela. */
export function ConfirmDialog({
  aberto,
  onOpenChange,
  titulo,
  descricao,
  consequencias,
  rotuloConfirmar,
  tom = 'padrao',
  justificativa,
  processando,
  children,
  confirmarDesabilitado,
  onConfirmar,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const idJustificativa = React.useId();
  const [texto, setTexto] = React.useState('');

  React.useEffect(() => {
    if (!aberto) setTexto('');
  }, [aberto]);

  const faltaJustificativa = !!justificativa && texto.trim() === '';

  return (
    <AlertDialog open={aberto} onOpenChange={onOpenChange}>
      <AlertDialogContent
        data-ds="v2"
        className={cn(
          'border-ds-border bg-ds-bg-raised font-ds-sans text-ds-fg shadow-[var(--ds-shadow-lg)] sm:rounded-xl',
          'max-sm:bottom-0 max-sm:top-auto max-sm:translate-y-0 max-sm:rounded-t-2xl'
        )}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-medium text-ds-fg">{titulo}</AlertDialogTitle>
          {descricao && (
            <AlertDialogDescription className="text-sm text-ds-fg-secondary">
              {descricao}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {consequencias && consequencias.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-ds-fg-secondary">
            {consequencias.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )}

        {children}

        {justificativa && (
          <div>
            <label htmlFor={idJustificativa} className="mb-1.5 block text-sm font-medium">
              {justificativa.rotulo}{' '}
              <span className="text-ds-danger-fg" aria-hidden>
                *
              </span>
            </label>
            <textarea
              id={idJustificativa}
              aria-required
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={justificativa.placeholder}
              rows={3}
              className="w-full rounded-lg border border-ds-border-strong bg-ds-bg-surface px-3 py-2 text-base text-ds-fg placeholder:text-ds-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus md:text-sm"
            />
          </div>
        )}

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel
            disabled={processando}
            className={cn(buttonVariants({ variante: 'secundario' }), 'mt-0')}
          >
            {t('ds.cancel')}
          </AlertDialogCancel>
          <Button
            variante={tom === 'perigo' ? 'perigo' : 'primario'}
            disabled={processando || faltaJustificativa || confirmarDesabilitado}
            onClick={() => onConfirmar(justificativa ? texto.trim() : undefined)}
          >
            {processando && <Loader2 className="animate-spin" />}
            {rotuloConfirmar}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
