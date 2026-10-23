// Aba "Códigos sem regra": códigos usados nos apontamentos e tickets AMS que não estão na lista.
import { useTranslation } from 'react-i18next';
import { ListChecks, Plus } from 'lucide-react';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { formatarDia } from '@/hooks/useUltimaAlteracao';
import type { CodigoSemRegra } from '@/types/regrasContagem';

export function AbaSemRegra({
  semRegra,
  carregando,
  podeEditar,
  onIncluir,
}: {
  semRegra: CodigoSemRegra[];
  carregando: boolean;
  podeEditar: boolean;
  onIncluir: (c: CodigoSemRegra) => void;
}) {
  const { t, i18n } = useTranslation();
  const colunas: ColunaTabela<CodigoSemRegra>[] = [
    {
      id: 'codigo',
      cabecalho: t('regrasContagem.codigos.colunaCodigo'),
      mobile: 'titulo',
      celula: (c) => <span className="whitespace-pre-wrap font-medium">{c.codigo}</span>,
    },
    {
      id: 'apontamentos',
      cabecalho: t('regrasContagem.semRegra.colunaApontamentos'),
      alinhar: 'direita',
      celula: (c) => <span className="tabular-nums">{c.apontamentos6m}</span>,
    },
    {
      id: 'tickets',
      cabecalho: t('regrasContagem.semRegra.colunaTickets'),
      alinhar: 'direita',
      celula: (c) => <span className="tabular-nums">{c.tickets6m}</span>,
    },
    {
      id: 'primeira',
      cabecalho: t('regrasContagem.semRegra.colunaPrimeira'),
      celula: (c) =>
        c.primeiraOcorrencia ? (
          <span className="tabular-nums">{formatarDia(c.primeiraOcorrencia, i18n.language)}</span>
        ) : (
          <span className="text-ds-fg-muted">—</span>
        ),
    },
    ...(podeEditar
      ? [
          {
            id: 'acoes',
            cabecalho: '',
            mobile: 'acoes' as const,
            celula: (c: CodigoSemRegra) => (
              <div className="flex justify-end">
                <Button
                  tamanho="sm"
                  aria-label={t('regrasContagem.semRegra.incluirCodigo', { codigo: c.codigo })}
                  onClick={() => onIncluir(c)}
                >
                  <Plus /> {t('regrasContagem.semRegra.incluir')}
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];
  return (
    <div className="space-y-4">
      <Callout tom="warning">{t('regrasContagem.semRegra.aviso')}</Callout>
      <section className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        <DataTable
          rotulo={t('regrasContagem.semRegra.rotulo')}
          colunas={colunas}
          linhas={semRegra}
          chaveLinha={(c) => c.codigo}
          carregando={carregando}
          vazio={<EmptyState icone={<ListChecks />} titulo={t('regrasContagem.semRegra.vazio')} />}
        />
      </section>
    </div>
  );
}
