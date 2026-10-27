// "Exportar" da faixa do topo das telas novas: Excel ou PDF do que está filtrado na tela.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { botaoVidro, itemMenu } from '@/components/ds/estilos';
import { buttonVariants } from '@/components/ds/Button';
import { cn } from '@/lib/utils';
import type { FormatoExportacao } from '@/utils/exportarTabela';

export function MenuExportar({
  descricao,
  onExportar,
  variante = 'vidro',
  className,
}: {
  /** O que será exportado (ex.: "Exporta 3 ramos, com os filtros aplicados") */
  descricao: string;
  onExportar: (formato: FormatoExportacao) => void | Promise<void>;
  /** vidro: na faixa escura do topo · secundario: sobre o fundo da página */
  variante?: 'vidro' | 'secundario';
  /** Ajuste do botão ao lado dos outros (ex.: altura) */
  className?: string;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [exportando, setExportando] = useState(false);

  const exportar = async (formato: FormatoExportacao) => {
    setExportando(true);
    try {
      await onExportar(formato);
    } catch (err) {
      toast({
        title: t('ds.exportar.erro'),
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setExportando(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            variante === 'vidro' ? botaoVidro : buttonVariants({ variante: 'secundario' }),
            className
          )}
          disabled={exportando}
        >
          <Download className="h-4 w-4" aria-hidden /> {t('ds.exportar.botao')}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-ds="v2"
        align="start"
        className="min-w-56 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
      >
        <DropdownMenuLabel className="max-w-72 px-2.5 py-1.5 text-xs font-normal text-ds-fg-muted">
          {descricao}
        </DropdownMenuLabel>
        <DropdownMenuItem className={itemMenu} onSelect={() => exportar('xlsx')}>
          <FileSpreadsheet className="h-4 w-4" aria-hidden /> {t('ds.exportar.excel')}
        </DropdownMenuItem>
        <DropdownMenuItem className={itemMenu} onSelect={() => exportar('pdf')}>
          <FileText className="h-4 w-4" aria-hidden /> {t('ds.exportar.pdf')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
