// Aba Histórico do Controle: a auditoria das alterações do banco, as versões de cada mês
// fechado (geração e retificação do Book) e o consumo entre bancos, do mais recente ao mais antigo.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, FileClock, History, PencilLine } from 'lucide-react';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { HoursValue } from '@/components/ds/HoursValue';
import { FiltroMultiplo } from '@/components/ds/Filtros';
import { formatarHoras } from '@/components/ds/horas';
import { formatarDataHora } from '@/hooks/useUltimaAlteracao';
import { camposAlterados, rotuloMesLocal } from '@/utils/controleTela';
import type { EventoHistorico } from '@/types/controleBancoHoras';

type TipoEvento = EventoHistorico['tipo'];
const TIPOS: TipoEvento[] = ['alteracao', 'versao', 'transferencia'];
const TABELAS = new Set([
  'bancos_horas',
  'bancos_horas_escopo',
  'bancos_horas_baseline',
  'bancos_horas_repasse',
  'codigos_resolucao_banco',
  'bancos_horas_reajustes',
  'bancos_horas_observacoes',
  'requerimentos_bancos',
  'bancos_horas_retroativos',
  'bancos_horas_retroativos_itens',
]);
const ICONES = { alteracao: PencilLine, versao: FileClock, transferencia: ArrowLeftRight };

export function AbaHistorico({
  eventos,
  carregando,
  erro,
  onTentarNovamente,
}: {
  eventos: EventoHistorico[];
  carregando: boolean;
  erro: Error | null;
  onTentarNovamente: () => void;
}) {
  const { t, i18n } = useTranslation();
  const h = (chave: string, valores?: Record<string, unknown>) =>
    t(`controleBancoHoras.historico.${chave}`, valores);
  const mes = (m: { ano: number; mes: number }) => rotuloMesLocal(m, i18n.language);
  const [tipos, setTipos] = useState<TipoEvento[]>([]);
  const visiveis = tipos.length ? eventos.filter((e) => tipos.includes(e.tipo)) : eventos;

  const conteudo = (e: EventoHistorico) => {
    if (e.tipo === 'alteracao') {
      const mudancas = camposAlterados(e);
      return (
        <>
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {h(`acoes.${e.acao}`)} · {h(`tabelas.${TABELAS.has(e.tabela) ? e.tabela : 'outra'}`)}
            {e.origem !== 'app' && <StatusBadge tom="info">{h(`origem.${e.origem}`)}</StatusBadge>}
          </p>
          {e.motivo && <p className="mt-1 text-sm">{h('motivo', { motivo: e.motivo })}</p>}
          {mudancas.length > 0 && (
            <details className="mt-1.5 text-xs">
              <summary className="cursor-pointer text-ds-fg-secondary">{h('detalhes')}</summary>
              <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
                {mudancas.map((m) => (
                  <div key={m.campo} className="contents">
                    <dt className="font-mono text-ds-fg-muted">{m.campo}</dt>
                    <dd className="break-words">
                      {m.antes} → {m.depois}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </>
      );
    }
    if (e.tipo === 'versao')
      return (
        <>
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {h('versao', { versao: e.versao, mes: mes(e.mes) })}
            <StatusBadge tom={e.motivo === 'retificacao' ? 'warning' : 'neutral'}>
              {h(`motivoVersao.${e.motivo}`)}
            </StatusBadge>
            {e.vigente ? (
              <StatusBadge tom="success">{h('vigente')}</StatusBadge>
            ) : (
              <StatusBadge>{h('substituida')}</StatusBadge>
            )}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-ds-fg-secondary">
            {e.saldoFinalMinutos !== null && (
              <span>
                {h('saldoFinal')}:{' '}
                <HoursValue minutos={e.saldoFinalMinutos} cor="saldo" className="font-medium" />
              </span>
            )}
            {e.saldoFinalTickets !== null && (
              <span>
                {h('saldoFinal')}: {h('ticketsN', { n: e.saldoFinalTickets })}
              </span>
            )}
            {!!e.excedenteMinutos && (
              <span>
                {h('excedente')}: {formatarHoras(e.excedenteMinutos)}
              </span>
            )}
          </p>
        </>
      );
    return (
      <p className="text-sm font-medium">
        {h(e.papel, {
          quantidade:
            e.unidade === 'horas'
              ? formatarHoras(e.quantidade)
              : h('ticketsN', { n: e.quantidade }),
          banco: e.outroBanco,
          mes: mes(e.mes),
        })}
      </p>
    );
  };

  if (erro)
    return (
      <div className="space-y-3 rounded-xl border border-ds-border bg-ds-bg-surface p-4">
        <Callout tom="danger" titulo={h('erro')}>
          {t('fase3Comum.verifiqueConexao')}
        </Callout>
        <Button onClick={onTentarNovamente}>{t('fase3Comum.tentarNovamente')}</Button>
      </div>
    );

  return (
    <div className="space-y-3">
      {eventos.length > 0 && (
        <FiltroMultiplo<TipoEvento>
          rotulo={h('filtroTipo')}
          opcoes={TIPOS.map((v) => ({ valor: v, rotulo: h(`tipos.${v}`) }))}
          selecionados={tipos}
          onChange={setTipos}
        />
      )}
      {carregando ? (
        <div
          className="h-40 animate-pulse rounded-xl bg-ds-bg-surface"
          role="status"
          aria-label={t('controleBancoHoras.carregando')}
        />
      ) : visiveis.length === 0 ? (
        <div className="rounded-xl border border-ds-border bg-ds-bg-surface">
          <EmptyState icone={<History />} titulo={eventos.length ? h('vazioFiltro') : h('vazio')} />
        </div>
      ) : (
        <ol
          aria-label={h('rotulo')}
          className="ds-surgir divide-y divide-ds-border rounded-xl border border-ds-border bg-ds-bg-surface"
        >
          {visiveis.map((e) => {
            const Icone = ICONES[e.tipo];
            const autor = e.tipo === 'transferencia' ? null : (e.usuario ?? h('sistema'));
            return (
              <li key={`${e.tipo}-${e.id}`} className="flex gap-3 px-4 py-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ds-bg-subtle text-ds-fg-secondary">
                  <Icone className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  {conteudo(e)}
                  <p className="mt-1 text-xs text-ds-fg-muted">
                    {[autor, formatarDataHora(e.em, i18n.language)].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
