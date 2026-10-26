// Cartão de um agendamento de Saldo Parcial: recorrência, empresas, cópia, próximo e último envio,
// e as ações (ativar, editar, executar agora, excluir) para quem edita.
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { Button } from '@/components/ds/Button';
import { ChaveCompacta } from '@/components/ds/Formulario';
import { itemMenu } from '@/components/ds/estilos';
import { cn } from '@/lib/utils';
import { plural } from '@/utils/plural';
import { descreverRecorrencia } from '@/utils/descreverRecorrencia';
import type { AgendamentoSaldoParcial } from '@/types/envioSaldoParcial';
import { dataHoraBrasilia } from './formato';

export function CartaoAgendamento({
  agendamento,
  proximoEnvio,
  semContato,
  agendadorDesligado,
  podeEditar,
  podeExecutar,
  onAtivo,
  onEditar,
  onExecutar,
  onExcluir,
}: {
  agendamento: AgendamentoSaldoParcial;
  /** Gravado pelo servidor ou previsto pela regra; nulo se inativo ou sem cálculo */
  proximoEnvio: string | null;
  /** Empresas do agendamento sem contato de Saldo Parcial */
  semContato: number;
  agendadorDesligado: boolean;
  podeEditar: boolean;
  /** O sync-api precisa estar no ar para executar agora */
  podeExecutar: boolean;
  onAtivo: () => void;
  onEditar: () => void;
  onExecutar: () => void;
  onExcluir: () => void;
}) {
  const { t, i18n } = useTranslation();
  const c = (chave: string, valores?: Record<string, unknown>) =>
    t(`rotinasSaldoParcial.cartao.${chave}`, valores);
  const vazio = <span className="text-ds-fg-muted">—</span>;
  const status = agendamento.ultimo_status;

  return (
    <li
      className={cn(
        'ds-surgir rounded-xl border bg-ds-bg-surface p-4 md:p-5',
        agendamento.ativo ? 'border-ds-border' : 'border-dashed border-ds-border-strong'
      )}
    >
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <span
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-lg',
            agendamento.ativo
              ? 'bg-ds-accent-subtle text-ds-fg-accent'
              : 'bg-ds-bg-subtle text-ds-fg-muted'
          )}
          aria-hidden
        >
          <CalendarClock className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 basis-60">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {agendamento.nome}
            {!agendamento.ativo && <StatusBadge>{c('inativo')}</StatusBadge>}
          </p>
          <p className="text-sm text-ds-fg-secondary">{descreverRecorrencia(agendamento, t)}</p>
          <p className="mt-1 text-xs text-ds-fg-muted">
            {plural(t, 'rotinasSaldoParcial.cartao.empresas', agendamento.empresas?.length ?? 0)}
            {semContato > 0 && (
              <span className="text-ds-warning-fg">
                {' · '}
                {plural(t, 'rotinasSaldoParcial.cartao.semContato', semContato)}
              </span>
            )}
            {agendamento.emails_cc?.length > 0 &&
              ` · ${c('copia', { emails: agendamento.emails_cc.join(', ') })}`}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 text-sm">
          <div>
            <dt className="text-xs text-ds-fg-muted">{c('proximo')}</dt>
            <dd className="tabular-nums">
              {proximoEnvio ? (
                dataHoraBrasilia(proximoEnvio, i18n.language)
              ) : agendamento.ativo && agendadorDesligado ? (
                <span className="text-ds-warning-fg">{c('aguardandoServico')}</span>
              ) : (
                vazio
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ds-fg-muted">{c('ultimo')}</dt>
            <dd className="flex items-center gap-1.5 tabular-nums">
              {agendamento.ultima_execucao ? (
                <>
                  {dataHoraBrasilia(agendamento.ultima_execucao, i18n.language)}
                  {status === 'executando' ? (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin text-ds-fg-accent"
                      aria-label={t('rotinasSaldoParcial.situacoes.executando')}
                    />
                  ) : status === 'sucesso' ? (
                    <CheckCircle2
                      className="h-3.5 w-3.5 text-ds-success-fg"
                      aria-label={t('rotinasSaldoParcial.situacoes.sucesso')}
                    />
                  ) : status ? (
                    <AlertTriangle
                      className={cn(
                        'h-3.5 w-3.5',
                        status === 'erro' ? 'text-ds-danger-fg' : 'text-ds-warning-fg'
                      )}
                      aria-label={t(`rotinasSaldoParcial.situacoes.${status}`)}
                    />
                  ) : null}
                </>
              ) : (
                vazio
              )}
            </dd>
          </div>
        </dl>
        {podeEditar && (
          <div className="flex items-center gap-2">
            <ChaveCompacta
              ligado={agendamento.ativo}
              rotulo={c('ativo', { nome: agendamento.nome })}
              onClick={onAtivo}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  tamanho="icone"
                  variante="fantasma"
                  aria-label={t('fase3Comum.acoesDe', { nome: agendamento.nome })}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                data-ds="v2"
                align="end"
                className="min-w-48 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
              >
                <DropdownMenuItem className={itemMenu} onSelect={onEditar}>
                  <Pencil className="h-4 w-4" /> {c('editar')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={itemMenu}
                  disabled={!podeExecutar}
                  onSelect={onExecutar}
                >
                  <Play className="h-4 w-4" /> {c('executar')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={cn(itemMenu, 'text-ds-danger-fg focus:bg-ds-danger-bg')}
                  onSelect={onExcluir}
                >
                  <Trash2 className="h-4 w-4" /> {c('excluir')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </li>
  );
}
