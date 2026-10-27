// Bancos da empresa à esquerda do Controle: um cartão por banco, com o saldo e o consumo do mês
// atual. Escolher um banco mostra o período e as seções dele.
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { BarraConsumo, atraso } from '@/components/ds/Visual';
import { formatarHoras } from '@/components/ds/horas';
import { cn } from '@/lib/utils';
import { rotuloMesLocal, unidadePrincipal } from '@/utils/controleTela';
import type { MesAno } from '@/services/bancosHoras/calculo';
import type { BancoCadastro, ResultadoBancoMes } from '@/services/bancosHoras/motorBancosHoras';
import { usePeriodoTexto } from '@/components/admin/empresas/periodoTexto';

export function ListaBancosControle({
  bancos,
  resultados,
  mes,
  selecionado,
  onSelecionar,
}: {
  bancos: Pick<BancoCadastro, 'bancoId' | 'nome' | 'padrao' | 'tipoContrato' | 'periodoApuracao'>[];
  /** Resultado de cada banco no mês atual */
  resultados: Record<string, ResultadoBancoMes | undefined>;
  mes: MesAno;
  selecionado: string | undefined;
  onSelecionar: (bancoId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const periodoTexto = usePeriodoTexto();
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-1">
      {bancos.map((b, i) => {
        const unidade = unidadePrincipal(b.tipoContrato);
        const u = resultados[b.bancoId]?.[unidade] ?? null;
        const saldo = u?.saldo ?? 0;
        const ativo = b.bancoId === selecionado;
        return (
          <button
            key={b.bancoId}
            type="button"
            aria-pressed={ativo}
            onClick={() => onSelecionar(b.bancoId)}
            style={atraso(280 + i * 70)}
            className={cn(
              'ds-surgir group relative w-[78%] shrink-0 snap-start overflow-hidden rounded-xl border bg-ds-bg-surface p-3 text-left transition duration-200 sm:w-auto',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg-page',
              ativo
                ? 'border-[#00D4E8] shadow-[0_10px_24px_-14px_rgba(0,212,232,0.6)]'
                : 'border-ds-border hover:-translate-y-0.5 hover:border-ds-border-strong'
            )}
          >
            <span
              aria-hidden
              className={cn(
                'absolute inset-y-0 left-0 w-[3px] bg-[#00D4E8] transition-transform duration-300',
                ativo ? 'scale-y-100' : 'scale-y-0'
              )}
            />
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-sm text-ds-fg-secondary">{b.nome}</span>
              {b.padrao && (
                <StatusBadge tom="neutral" className="h-5 px-2 text-[11px]">
                  {t('controleBancoHoras.bancos.padrao')}
                </StatusBadge>
              )}
            </span>
            <span
              className={cn(
                'mt-1 block text-lg font-semibold leading-6 tracking-tight tabular-nums',
                saldo < 0 ? 'text-ds-danger-fg' : saldo > 0 ? 'text-ds-success-fg' : 'text-ds-fg'
              )}
            >
              {u ? (unidade === 'horas' ? formatarHoras(saldo) : saldo) : '—'}
            </span>
            {u && unidade === 'horas' && (
              <BarraConsumo
                className="mt-2"
                legenda={false}
                consumo={u.consumoTotal}
                disponivel={u.saldoAUtilizar}
                rotulo={t('controleBancoHoras.bancos.consumoDe', {
                  mes: rotuloMesLocal(mes, i18n.language),
                  banco: b.nome,
                })}
              />
            )}
            <span className="mt-1.5 block text-[11px] text-ds-fg-muted">
              {periodoTexto(b.periodoApuracao)} · {rotuloMesLocal(mes, i18n.language)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
