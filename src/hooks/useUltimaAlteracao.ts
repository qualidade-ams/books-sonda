import { useTranslation } from 'react-i18next';
import { useNomesUsuarios } from '@/hooks/useNomesUsuarios';

/** Data e hora no horário de Brasília, no formato do idioma */
export function formatarDataHora(dataIso: string, idioma: string): string {
  return new Intl.DateTimeFormat(idioma, {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(new Date(dataIso))
    .replace(',', '');
}

/**
 * "Última alteração em 22/10/2026 12:30 por <nome>" para o subtítulo das edições. Sem o
 * nome (sem permissão, ou alteração da carga), só a data.
 */
export function useUltimaAlteracao(
  atualizadoEm: string | null | undefined,
  atualizadoPor: string | null | undefined
): string | undefined {
  const { t, i18n } = useTranslation();
  const nomes = useNomesUsuarios([atualizadoPor]);
  if (!atualizadoEm) return undefined;
  const data = formatarDataHora(atualizadoEm, i18n.language);
  const nome = atualizadoPor ? nomes[atualizadoPor] : undefined;
  return nome
    ? t('fase3Comum.ultimaAlteracaoPor', { data, nome })
    : t('fase3Comum.ultimaAlteracao', { data });
}
