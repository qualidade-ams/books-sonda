import { useState } from 'react';
import { Archive, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ArquivarInconsistenciaMenuProps {
  onArquivar: () => void;
  onDescartar: () => void;
  disabled?: boolean;
  /** Ação em lote: mostra o botão com rótulo "Arquivar (n)". Sem ela, botão de ícone da linha. */
  quantidade?: number;
}

/**
 * Botão "Arquivar" das inconsistências com duas opções:
 * - Arquivar inconsistência: vai para o Histórico (ação direta).
 * - Descartar: some da lista sem ir para o Histórico (pede confirmação).
 */
export function ArquivarInconsistenciaMenu({ onArquivar, onDescartar, disabled, quantidade }: ArquivarInconsistenciaMenuProps) {
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);
  const emLote = quantidade !== undefined;
  const plural = emLote && quantidade > 1;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          {emLote ? (
            <Button size="sm" variant="outline" disabled={disabled}>
              <Archive className="h-4 w-4 mr-2" />Arquivar ({quantidade})
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={disabled} title="Arquivar" aria-label="Arquivar">
              <Archive className="h-3.5 w-3.5 text-orange-600" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onArquivar}>
            <Archive className="h-4 w-4 mr-2 text-orange-600" />
            Arquivar inconsistência
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirmandoDescarte(true)} className="text-red-600 focus:text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Descartar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmandoDescarte} onOpenChange={setConfirmandoDescarte}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-sonda-blue">
              {plural ? `Descartar ${quantidade} inconsistências?` : 'Descartar inconsistência?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              {plural ? 'As inconsistências saem' : 'A inconsistência sai'} da lista e não vai para o Histórico.
              {' '}A detecção automática também não {plural ? 'as' : 'a'} recria. Use quando não houver nada a corrigir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className={buttonVariants({ variant: 'destructive' })} onClick={onDescartar}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
