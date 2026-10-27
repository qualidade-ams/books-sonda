// Aba Reajustes do Controle: os reajustes do banco no período, inclusive os inativos, com a
// situação (aplicado ou aguardando a retificação do Book do mês fechado).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, MoreHorizontal, Plus, Sigma, XCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { formatarHoras } from '@/components/ds/horas';
import { itemMenu } from '@/components/ds/estilos';
import { cn } from '@/lib/utils';
import { formatarDataHora } from '@/hooks/useUltimaAlteracao';
import { useNomesUsuarios } from '@/hooks/useNomesUsuarios';
import { chaveMes } from '@/services/controleBancoHorasService';
import { rotuloMesLocal } from '@/utils/controleTela';
import type { TipoContrato } from '@/services/bancosHoras/calculo';
import type { ReajusteControle } from '@/types/controleBancoHoras';

/** Saída soma ao consumo (+); entrada abate do consumo (−), RC-24 */
function textoReajuste(
  r: Pick<ReajusteControle, 'tipo' | 'minutos' | 'tickets'>,
  tipoContrato: TipoContrato
) {
  const sinal = r.tipo === 'saida' ? 1 : -1;
  const partes = [
    ...(tipoContrato !== 'tickets' ? [formatarHoras(sinal * r.minutos, { sinal: 'sempre' })] : []),
    ...(tipoContrato !== 'horas' && (r.tickets || tipoContrato === 'tickets')
      ? [`${sinal > 0 ? '+' : '−'}${r.tickets}`]
      : []),
  ];
  return partes.join(' · ');
}

export function AbaReajustes({
  reajustes,
  tipoContrato,
  carregando,
  erro,
  podeEditar,
  mesesFechados,
  onLancar,
  onInativar,
  onTentarNovamente,
}: {
  reajustes: ReajusteControle[];
  tipoContrato: TipoContrato;
  carregando: boolean;
  erro: Error | null;
  podeEditar: boolean;
  /** Chaves AAAA-MM dos meses fechados do período */
  mesesFechados?: string[];
  onLancar: () => void;
  onInativar: (r: ReajusteControle, motivo: string) => Promise<void>;
  onTentarNovamente: () => void;
}) {
  const { t, i18n } = useTranslation();
  const r = (chave: string, valores?: Record<string, unknown>) =>
    t(`controleBancoHoras.reajustes.${chave}`, valores);
  const nomes = useNomesUsuarios(reajustes.map((x) => x.criadoPor));
  const [inativar, setInativar] = useState<ReajusteControle | null>(null);
  const [processando, setProcessando] = useState(false);

  const colunas: ColunaTabela<ReajusteControle>[] = [
    {
      id: 'mes',
      cabecalho: r('colunaMes'),
      mobile: 'titulo',
      celula: (x) => <span className="font-semibold">{rotuloMesLocal(x.mes, i18n.language)}</span>,
    },
    {
      id: 'valor',
      cabecalho: r('colunaReajuste'),
      alinhar: 'direita',
      celula: (x) => (
        <span className={cn(!x.ativo && 'line-through opacity-60')}>
          <span className="font-medium tabular-nums">{textoReajuste(x, tipoContrato)}</span>
          <span className="block text-[11px] text-ds-fg-muted">
            {x.tipo === 'saida' ? r('somaConsumo') : r('abateConsumo')}
          </span>
        </span>
      ),
    },
    {
      id: 'motivo',
      cabecalho: r('colunaMotivo'),
      celula: (x) => (
        <span className="text-sm">
          {x.justificativa}
          {x.anotacaoInterna && (
            <span className="mt-0.5 flex items-start gap-1 text-xs text-ds-fg-muted">
              <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-label={r('anotacaoInterna')} />
              {x.anotacaoInterna}
            </span>
          )}
          {!x.ativo && x.motivoInativacao && (
            <span className="mt-0.5 block text-xs text-ds-fg-muted">
              {r('inativadoPor', { motivo: x.motivoInativacao })}
            </span>
          )}
        </span>
      ),
    },
    {
      id: 'por',
      cabecalho: r('colunaPor'),
      celula: (x) => (
        <span className="text-xs">
          {(x.criadoPor && nomes[x.criadoPor]) || r(`origem.${x.origem}`)}
          <span className="block text-ds-fg-muted">
            {formatarDataHora(x.criadoEm, i18n.language)}
          </span>
        </span>
      ),
    },
    {
      id: 'situacao',
      cabecalho: r('colunaSituacao'),
      celula: (x) => (
        <span className="flex flex-wrap gap-1">
          {!x.ativo && <StatusBadge>{r('inativo')}</StatusBadge>}
          {x.aguardandoRetificacao ? (
            <StatusBadge tom="warning">{r('aguardando')}</StatusBadge>
          ) : (
            x.ativo && <StatusBadge tom="success">{r('aplicado')}</StatusBadge>
          )}
        </span>
      ),
    },
    ...(podeEditar
      ? [
          {
            id: 'acoes',
            cabecalho: '',
            mobile: 'acoes' as const,
            celula: (x: ReajusteControle) =>
              x.ativo ? (
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        tamanho="icone"
                        variante="fantasma"
                        aria-label={r('acoesDe', { mes: rotuloMesLocal(x.mes, i18n.language) })}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      data-ds="v2"
                      align="end"
                      className="min-w-44 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
                    >
                      <DropdownMenuItem
                        className={cn(itemMenu, 'text-ds-danger-fg focus:bg-ds-danger-bg')}
                        onSelect={() => setInativar(x)}
                      >
                        <XCircle className="h-4 w-4" /> {r('inativar')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : null,
          },
        ]
      : []),
  ];

  const confirmar = async (motivo?: string) => {
    if (!inativar) return;
    setProcessando(true);
    try {
      await onInativar(inativar, motivo ?? '');
      setInativar(null);
    } finally {
      setProcessando(false);
    }
  };

  if (erro)
    return (
      <div className="space-y-3 rounded-xl border border-ds-border bg-ds-bg-surface p-4">
        <Callout tom="danger" titulo={r('erro')}>
          {t('fase3Comum.verifiqueConexao')}
        </Callout>
        <Button onClick={onTentarNovamente}>{t('fase3Comum.tentarNovamente')}</Button>
      </div>
    );

  return (
    <div className="space-y-3">
      {podeEditar && (
        <div className="flex justify-end">
          <Button variante="primario" onClick={onLancar}>
            <Plus /> {r('lancar')}
          </Button>
        </div>
      )}
      <div className="ds-surgir overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        <DataTable
          rotulo={r('rotulo')}
          colunas={colunas}
          linhas={reajustes}
          chaveLinha={(x) => x.id}
          carregando={carregando}
          vazio={<EmptyState icone={<Sigma />} titulo={r('vazio')} />}
        />
      </div>
      <ConfirmDialog
        aberto={!!inativar}
        onOpenChange={(v) => !v && setInativar(null)}
        titulo={r('inativarTitulo')}
        descricao={
          inativar
            ? `${textoReajuste(inativar, tipoContrato)} · ${rotuloMesLocal(inativar.mes, i18n.language)}: ${inativar.justificativa}`
            : undefined
        }
        consequencias={[
          r('inativarRecalcula'),
          r('inativarHistorico'),
          ...(inativar && mesesFechados?.includes(chaveMes(inativar.mes))
            ? [r('inativarFechado')]
            : []),
        ]}
        rotuloConfirmar={r('inativar')}
        tom="perigo"
        justificativa={{ rotulo: r('motivo'), placeholder: r('motivoPlaceholder') }}
        processando={processando}
        onConfirmar={confirmar}
      />
    </div>
  );
}
