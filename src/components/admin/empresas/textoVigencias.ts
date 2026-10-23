import { useTranslation } from 'react-i18next';
import { formatarHoras } from '@/components/ds/horas';
import type {
  BancoCadastro,
  VigenciaBaselineCadastro,
  VigenciaRepasseCadastro,
} from '@/types/bancosHorasCadastro';

/** Valor de uma vigência de baseline ou repasse em texto, conforme o contrato do banco */
export function useTextoVigencias(banco: Pick<BancoCadastro, 'tipoContrato' | 'repasseEspecial'>) {
  const { t } = useTranslation();
  const b = (chave: string, valores?: Record<string, unknown>) =>
    t(`empresasCadastro.bancos.${chave}`, valores);

  const baseline = (v: VigenciaBaselineCadastro | undefined) => {
    if (!v) return '—';
    const partes = [
      ...(banco.tipoContrato !== 'tickets' && v.baselineMinutos !== null
        ? [b('porMes', { valor: formatarHoras(v.baselineMinutos) })]
        : []),
      ...(banco.tipoContrato !== 'horas' && v.baselineTickets !== null
        ? [b('tickets', { n: v.baselineTickets })]
        : []),
      ...(v.credito === 'anual' ? [t('empresasCadastro.edicaoBanco.creditoAnual')] : []),
    ];
    return partes.join(' · ') || '—';
  };

  const repasse = (v: VigenciaRepasseCadastro | undefined) => {
    if (!v) return '—';
    return banco.repasseEspecial === 'por_periodo'
      ? b('repassePeriodo', { dentro: v.percentualDentroPeriodo, entre: v.percentualEntrePeriodos })
      : b('percentual', { n: v.percentualMensal });
  };

  return { baseline, repasse };
}
