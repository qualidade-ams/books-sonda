import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TIPO_COBRANCA_OPTIONS,
  TIPO_HORA_EXTRA_OPTIONS,
  MODULO_OPTIONS,
  LINGUAGEM_OPTIONS,
  TipoCobrancaType,
  TipoHoraExtraType,
  ModuloType,
  LinguagemType
} from '@/types/requerimentos';

/**
 * Hook que retorna as opções de Tipo de Cobrança traduzidas
 */
export function useTranslatedTipoCobranca() {
  const { t } = useTranslation();

  return useMemo(() => {
    const translations: Record<string, string> = {
      'Banco de Horas': t('options.billingType.bancoHoras'),
      'Cobro Interno': t('options.billingType.cobroInterno'),
      'Contrato': t('options.billingType.contrato'),
      'Faturado': t('options.billingType.faturado'),
      'Hora Extra': t('options.billingType.horaExtra'),
      'Sobreaviso': t('options.billingType.sobreaviso'),
      'Reprovado': t('options.billingType.reprovado'),
      'Bolsão Enel': t('options.billingType.bolsaoEnel'),
    };

    return TIPO_COBRANCA_OPTIONS.map(opt => ({
      ...opt,
      label: translations[opt.value] || opt.label
    }));
  }, [t]);
}

/**
 * Hook que retorna as opções de Tipo de Hora Extra traduzidas
 */
export function useTranslatedTipoHoraExtra() {
  const { t } = useTranslation();

  return useMemo(() => {
    const translations: Record<string, string> = {
      '17h30-19h30': t('options.overtimeType.17h30'),
      'apos_19h30': t('options.overtimeType.after19h30'),
      'fim_semana': t('options.overtimeType.weekend'),
    };

    return TIPO_HORA_EXTRA_OPTIONS.map(opt => ({
      ...opt,
      label: translations[opt.value] || opt.label
    }));
  }, [t]);
}

/**
 * Hook que retorna as opções de Linguagem traduzidas
 */
export function useTranslatedLinguagem() {
  const { t } = useTranslation();

  return useMemo(() => {
    const translations: Record<string, string> = {
      'ABAP': 'ABAP',
      'DBA': 'DBA',
      'Funcional': t('options.language.functional'),
      'PL/SQL': 'PL/SQL',
      'Técnico': t('options.language.technical'),
    };

    return LINGUAGEM_OPTIONS.map(opt => ({
      ...opt,
      label: translations[opt.value] || opt.label
    }));
  }, [t]);
}
