// Aba "Grupos não mapeados": grupos com consumo recente que ainda não estão no de-para.
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { formatarDia } from '@/hooks/useUltimaAlteracao';
import type { GrupoNaoMapeado } from '@/types/dePara';

/** Quantidade com a lista na dica */
function ListaNaDica({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (!itens.length) return <span className="text-ds-fg-muted">—</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="cursor-default rounded tabular-nums underline decoration-ds-border-strong decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
        >
          {itens.length}
        </span>
      </TooltipTrigger>
      <TooltipContent
        data-ds="v2"
        className="max-w-xs border-ds-border bg-ds-bg-raised font-ds-sans text-xs text-ds-fg"
      >
        <p className="mb-1 font-medium">{titulo}</p>
        <ul className="space-y-0.5 text-ds-fg-secondary">
          {itens.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

export function AbaNaoMapeados({
  naoMapeados,
  carregando,
  erro,
  podeEditar,
  onMapear,
  onTentarNovamente,
}: {
  naoMapeados: GrupoNaoMapeado[];
  carregando: boolean;
  erro: Error | null;
  podeEditar: boolean;
  onMapear: (g: GrupoNaoMapeado) => void;
  onTentarNovamente: () => void;
}) {
  const { t, i18n } = useTranslation();
  const colunas: ColunaTabela<GrupoNaoMapeado>[] = [
    {
      id: 'grupo',
      cabecalho: t('deParaGrupos.lista.colunaGrupo'),
      mobile: 'titulo',
      celula: (g) => <span className="font-mono text-xs font-medium">{g.grupoAranda}</span>,
    },
    {
      id: 'apontamentos',
      cabecalho: t('deParaGrupos.naoMapeados.colunaApontamentos'),
      alinhar: 'direita',
      celula: (g) => <span className="tabular-nums">{g.apontamentos}</span>,
    },
    {
      id: 'empresas',
      cabecalho: t('deParaGrupos.naoMapeados.colunaEmpresas'),
      alinhar: 'direita',
      celula: (g) => (
        <ListaNaDica titulo={t('deParaGrupos.naoMapeados.empresasCom')} itens={g.empresas} />
      ),
    },
    {
      id: 'primeiro',
      cabecalho: t('deParaGrupos.naoMapeados.colunaPrimeira'),
      celula: (g) => (
        <span className="tabular-nums">{formatarDia(g.primeiraOcorrencia, i18n.language)}</span>
      ),
    },
    {
      id: 'acoes',
      cabecalho: '',
      mobile: podeEditar ? 'acoes' : 'oculta',
      celula: (g) =>
        podeEditar ? (
          <div className="flex justify-end">
            <Button
              tamanho="sm"
              aria-label={t('deParaGrupos.naoMapeados.mapearGrupo', { grupo: g.grupoAranda })}
              onClick={(e) => {
                e.stopPropagation();
                onMapear(g);
              }}
            >
              {t('deParaGrupos.naoMapeados.mapear')}
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <Callout tom="warning">{t('deParaGrupos.naoMapeados.aviso')}</Callout>
      <section className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        {erro ? (
          <div className="space-y-3 p-4">
            <Callout tom="danger" titulo={t('deParaGrupos.naoMapeados.erro')}>
              {t('fase3Comum.verifiqueConexao')}
            </Callout>
            <Button onClick={onTentarNovamente}>{t('fase3Comum.tentarNovamente')}</Button>
          </div>
        ) : (
          <DataTable
            rotulo={t('deParaGrupos.naoMapeados.rotulo')}
            colunas={colunas}
            linhas={naoMapeados}
            chaveLinha={(g) => g.grupoAranda}
            carregando={carregando}
            vazio={<EmptyState icone={<Check />} titulo={t('deParaGrupos.naoMapeados.vazio')} />}
          />
        )}
      </section>
    </div>
  );
}
