import { useTranslation } from 'react-i18next';

/** Períodos de apuração com nome próprio; os demais saem como "N meses" */
export const PERIODOS_COM_NOME = [1, 2, 3, 4, 6, 12];

/** Períodos que o banco aceita: de 1 a 12 meses (CHECK de bancos_horas.periodo_apuracao) */
export const PERIODOS_APURACAO = Array.from({ length: 12 }, (_, i) => i + 1);

/** "Mensal", "Trimestral"… ou "5 meses" */
export function usePeriodoTexto() {
  const { t } = useTranslation();
  return (n: number) =>
    PERIODOS_COM_NOME.includes(n)
      ? t(`empresasCadastro.bancos.periodo.${n}`)
      : t('empresasCadastro.bancos.periodoMeses', { n });
}
