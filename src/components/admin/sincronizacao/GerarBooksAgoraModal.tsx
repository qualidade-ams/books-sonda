/**
 * Confirmação do "Gerar books agora" (tela Sincronização SQL Server), com a
 * escolha das empresas: todas as liberadas ou somente as selecionadas.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SeletorEmpresasBooks, type ModoEmpresasBooks } from './SeletorEmpresasBooks';

interface GerarBooksAgoraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Empresas escolhidas; vazio = todas as liberadas e ainda não enviadas */
  onConfirmar: (empresaIds: string[]) => void;
}

export function GerarBooksAgoraModal({ open, onOpenChange, onConfirmar }: GerarBooksAgoraModalProps) {
  const { t } = useTranslation();
  const [modo, setModo] = useState<ModoEmpresasBooks>('todas');
  const [empresaIds, setEmpresaIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setModo('todas');
      setEmpresaIds([]);
    }
  }, [open]);

  const semEmpresa = modo === 'selecionadas' && empresaIds.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-sonda-blue">{t('sincronizacaoSql.books.confirmarTitulo')}</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">{t('sincronizacaoSql.books.confirmarDescricao')}</DialogDescription>
        </DialogHeader>

        <SeletorEmpresasBooks modo={modo} empresaIds={empresaIds} onChangeModo={setModo} onChangeEmpresaIds={setEmpresaIds} />

        <DialogFooter className="pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('sincronizacaoSql.agendamentos.cancelar')}
          </Button>
          <Button
            type="button"
            className="bg-sonda-blue hover:bg-sonda-dark-blue"
            disabled={semEmpresa}
            onClick={() => onConfirmar(modo === 'selecionadas' ? empresaIds : [])}
          >
            {t('sincronizacaoSql.books.confirmarGerar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
