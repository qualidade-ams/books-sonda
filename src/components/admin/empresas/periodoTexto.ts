import { useTranslation } from 'react-i18next';

/** Períodos de apuração com nome próprio; os demais saem como "N meses" */
export const PERIODOS_COM_NOME = [1, 2, 3, 4, 6, 12];

/** "Mensal", "Trimestral"… ou "5 meses" */
export function usePeriodoTexto() {
  const { t } = useTranslation();
  return (n: number) =>
    PERIODOS_COM_NOME.includes(n)
      ? t(`empresasCadastro.bancos.periodo.${n}`)
      : t('empresasCadastro.bancos.periodoMeses', { n });
}
