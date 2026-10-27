// Um retroativo da tela Apontamentos Retroativos: o mês de um banco, com o consumo no fechamento,
// com os retroativos e a diferença; aberto, os apontamentos e tickets que chegaram depois.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, CheckCircle2, ChevronDown, ExternalLink, Mail, XCircle } from 'lucide-react';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { Button } from '@/components/ds/Button';
import { HoursValue } from '@/components/ds/HoursValue';
import { cn } from '@/lib/utils';
import { formatarDataHora, formatarDia } from '@/hooks/useUltimaAlteracao';
import { rotuloMesLocal } from '@/utils/controleTela';
import { plural } from '@/utils/plural';
import type { ItemRetroativo, Retroativo, SituacaoRetroativo } from '@/types/retroativos';

const TOM: Record<SituacaoRetroativo, 'warning' | 'info' | 'success' | 'neutral'> = {
  pendente: 'warning',
  aprovado: 'info',
  aplicado: 'success',
  descartado: 'neutral',
};

/** Só a data: o dia puro (AAAA-MM-DD) como está; a data e hora, em Brasília */
function dataCurta(valor: string | null, idioma: string) {
  if (!valor) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return formatarDia(valor, idioma);
  return new Intl.DateTimeFormat(idioma, {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(valor));
}

function CaixaMarcar({
  marcado,
  parcial,
  rotulo,
  onClick,
}: {
  marcado: boolean;
  parcial?: boolean;
  rotulo: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={parcial ? 'mixed' : marcado}
      aria-label={rotulo}
      onClick={onClick}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
    >
      <span
        aria-hidden
        className={cn(
          'grid h-4 w-4 place-items-center rounded border transition',
          marcado || parcial
            ? 'border-ds-accent bg-ds-accent text-ds-fg-on-accent'
            : 'border-ds-border-strong bg-ds-bg-surface'
        )}
      >
        {marcado && <Check className="h-3 w-3" strokeWidth={3} />}
        {parcial && !marcado && <span className="h-0.5 w-2 rounded bg-current" />}
      </span>
    </button>
  );
}

export function CartaoRetroativo({
  retroativo: r,
  aberto,
  onAlternar,
  podeEditar,
  onAprovar,
  onDescartar,
  selecionados = [],
  onSelecionar,
}: {
  retroativo: Retroativo;
  aberto: boolean;
  onAlternar: () => void;
  podeEditar: boolean;
  onAprovar: () => void;
  onDescartar: () => void;
  /** Ids das linhas marcadas para pedir a regularização aos consultores */
  selecionados?: string[];
  onSelecionar?: (ids: string[], marcar: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const a = (chave: string, valores?: Record<string, unknown>) =>
    t(`apontamentosRetroativos.${chave}`, valores);
  const mes = rotuloMesLocal(r.mes, i18n.language);
  const nomes = { empresa: r.empresa, banco: r.banco };
  const comTickets = r.consumoAntesTickets !== 0 || r.consumoDepoisTickets !== 0;
  const todosAvisados = r.itens.length > 0 && r.itens.every((i) => i.aviso);
  // Pedir a regularização: só no pendente, só quem edita e só o que ainda não foi avisado
  const podeSelecionar = podeEditar && r.situacao === 'pendente' && !!onSelecionar;
  const elegiveis = podeSelecionar ? r.itens.filter((i) => !i.aviso).map((i) => i.id) : [];
  const marcados = elegiveis.filter((id) => selecionados.includes(id));
  const quantidade = (i: Pick<ItemRetroativo, 'tipo' | 'minutos' | 'tickets'>) =>
    i.tipo === 'ticket' ? (
      a('cartao.ticketsN', { n: i.tickets })
    ) : (
      <HoursValue minutos={i.minutos} />
    );

  return (
    <li className="ds-surgir overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 md:px-5">
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={aberto}
          aria-label={a(aberto ? 'cartao.fechar' : 'cartao.ver', nomes)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-ds-fg-muted hover:bg-ds-bg-subtle hover:text-ds-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', aberto && 'rotate-180')} />
        </button>
        <div className="min-w-0 flex-1 basis-56">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {r.empresa}
            <span className="font-normal text-ds-fg-secondary">› {r.banco}</span>
          </p>
          <p className="text-xs text-ds-fg-muted">
            {[
              mes,
              plural(t, 'apontamentosRetroativos.cartao.apontamentos', r.itens.length),
              a('cartao.detectadoEm', { data: formatarDataHora(r.detectadoEm, i18n.language) }),
            ].join(' · ')}
          </p>
        </div>
        <dl className="flex items-center gap-5 text-sm">
          <div>
            <dt className="text-xs text-ds-fg-muted">{a('cartao.noFechamento')}</dt>
            <dd>
              <HoursValue minutos={r.consumoAntesMinutos} />
              {comTickets && (
                <span className="block text-xs">
                  {a('cartao.ticketsN', { n: r.consumoAntesTickets })}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ds-fg-muted">{a('cartao.comRetroativos')}</dt>
            <dd>
              <HoursValue minutos={r.consumoDepoisMinutos} className="font-medium" />
              {comTickets && (
                <span className="block text-xs font-medium">
                  {a('cartao.ticketsN', { n: r.consumoDepoisTickets })}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ds-fg-muted">{a('cartao.diferenca')}</dt>
            <dd>
              <HoursValue
                minutos={r.consumoDepoisMinutos - r.consumoAntesMinutos}
                sinal="sempre"
                cor="danger"
                className="font-semibold"
              />
              {comTickets && (
                <span className="block text-xs font-semibold text-ds-danger-fg">
                  {a('cartao.ticketsN', { n: r.consumoDepoisTickets - r.consumoAntesTickets })}
                </span>
              )}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tom={TOM[r.situacao]}>{a(`situacoes.${r.situacao}`)}</StatusBadge>
          {todosAvisados && r.situacao === 'pendente' && (
            <StatusBadge tom="info">
              <Mail className="h-3 w-3" /> {a('cartao.consultoresAvisados')}
            </StatusBadge>
          )}
        </div>
        {podeEditar && r.situacao === 'pendente' && (
          <div className="flex gap-2">
            <Button tamanho="sm" onClick={onDescartar}>
              <XCircle /> {a('cartao.descartar')}
            </Button>
            <Button tamanho="sm" variante="primario" onClick={onAprovar}>
              <CheckCircle2 /> {a('cartao.aprovar')}
            </Button>
          </div>
        )}
      </div>

      {r.decisao && (
        <p className="border-t border-ds-border bg-ds-bg-subtle px-4 py-2 text-xs text-ds-fg-secondary md:px-5">
          <span className="font-medium text-ds-fg">
            {a(r.situacao === 'descartado' ? 'cartao.descartadoPor' : 'cartao.aprovadoPor', {
              nome: r.decisao.por ?? a('cartao.semNome'),
              data: formatarDataHora(r.decisao.em, i18n.language),
            })}
          </span>{' '}
          {r.decisao.justificativa}
          {r.retificacao && (
            <>
              {' '}
              · {a('cartao.aplicado', { data: formatarDataHora(r.retificacao.em, i18n.language) })}
            </>
          )}
          {r.situacao === 'aprovado' && <> · {a('cartao.aguardando', { mes })}</>}
        </p>
      )}

      {aberto && (
        <div className="border-t border-ds-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ds-bg-subtle text-left text-xs font-medium uppercase tracking-[0.04em] text-ds-fg-muted">
                <tr>
                  <th className="w-10 px-3 py-2">
                    {elegiveis.length > 0 && (
                      <CaixaMarcar
                        marcado={marcados.length === elegiveis.length}
                        parcial={marcados.length > 0 && marcados.length < elegiveis.length}
                        rotulo={a('selecao.todos', nomes)}
                        onClick={() => onSelecionar!(elegiveis, marcados.length < elegiveis.length)}
                      />
                    )}
                  </th>
                  <th className="px-3 py-2">{a('colunas.chamado')}</th>
                  <th className="px-3 py-2">{a('colunas.dataAtividade')}</th>
                  <th className="px-3 py-2">{a('colunas.dataSistema')}</th>
                  <th className="px-3 py-2">{a('colunas.consultor')}</th>
                  <th className="px-3 py-2">{a('colunas.status')}</th>
                  <th className="px-3 py-2 text-right">{a('colunas.quantidade')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ds-border">
                {r.itens.map((i) => (
                  <tr key={i.id}>
                    <td className="px-3 py-2">
                      {elegiveis.includes(i.id) && (
                        <CaixaMarcar
                          marcado={selecionados.includes(i.id)}
                          rotulo={a('selecao.item', {
                            chamado: [i.chamado, i.tarefa].filter(Boolean).join(' · '),
                          })}
                          onClick={() => onSelecionar!([i.id], !selecionados.includes(i.id))}
                        />
                      )}
                      {i.aviso && (
                        <Mail className="mx-auto h-4 w-4 text-ds-fg-accent" aria-hidden />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium">{i.chamado ?? '—'}</span>
                      {i.tarefa && <span className="text-ds-fg-muted"> · {i.tarefa}</span>}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {dataCurta(i.dataAtividade, i18n.language)}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {dataCurta(i.lancadoEm, i18n.language)}
                      {i.aviso && (
                        <span className="block text-[11px] text-ds-fg-muted">
                          {a('avisadoEm', { data: formatarDataHora(i.aviso.em, i18n.language) })}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{i.consultor ?? '—'}</td>
                    <td className="px-3 py-2">
                      {i.statusChamado && (
                        <StatusBadge tom={i.statusChamado === 'Closed' ? 'neutral' : 'info'}>
                          {i.statusChamado}
                        </StatusBadge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{quantidade(i)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-ds-border px-4 py-2.5 md:px-5">
            <Link
              to={`/admin/bancos-horas?empresa=${r.empresaId}&banco=${r.bancoId}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ds-fg-accent hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />{' '}
              {a('cartao.verNoControle', { banco: r.banco })}
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}
