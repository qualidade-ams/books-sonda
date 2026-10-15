import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button } from './Button';

export interface AcaoPagina {
  rotulo: string;
  onClick: () => void;
  icone?: React.ReactNode;
  /** No máximo uma por página: fica visível também no celular */
  primaria?: boolean;
  desabilitada?: boolean;
}

interface PageHeaderProps {
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  acoes?: AcaoPagina[];
}

const MD_QUERY = '(min-width: 768px)';

/** Título da página (Kumbh Sans) + ações. No celular, as secundárias vão para "Mais ações". */
export function PageHeader({ titulo, descricao, acoes = [] }: PageHeaderProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(MD_QUERY);
  const primaria = acoes.find((a) => a.primaria);
  const secundarias = acoes.filter((a) => !a.primaria);

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-ds-title text-[22px] font-medium leading-7 text-ds-fg md:text-[28px] md:leading-9">
          {titulo}
        </h1>
        {descricao && <p className="mt-1 text-sm text-ds-fg-secondary">{descricao}</p>}
      </div>

      {acoes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {isDesktop &&
            secundarias.map((acao) => (
              <Button key={acao.rotulo} onClick={acao.onClick} disabled={acao.desabilitada}>
                {acao.icone}
                {acao.rotulo}
              </Button>
            ))}

          {!isDesktop && secundarias.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button tamanho="icone" aria-label={t('ds.moreActions')}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" data-ds="v2" className="font-ds-sans">
                {secundarias.map((acao) => (
                  <DropdownMenuItem
                    key={acao.rotulo}
                    onSelect={acao.onClick}
                    disabled={acao.desabilitada}
                    className="min-h-11 gap-2"
                  >
                    {acao.icone}
                    {acao.rotulo}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {primaria && (
            <Button variante="primario" onClick={primaria.onClick} disabled={primaria.desabilitada}>
              {primaria.icone}
              {primaria.rotulo}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
