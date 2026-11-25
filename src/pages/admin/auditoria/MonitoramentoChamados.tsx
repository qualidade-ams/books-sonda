import { useTranslation } from 'react-i18next';
import InconsistenciaChamados from './InconsistenciaChamados';
import { TIPOS_TELA_MONITORAMENTO } from '@/types/inconsistenciasChamados';

/**
 * Monitoramento de Chamados: mesma tela de inconsistências, restrita à troca
 * de código de resolução e ao IC inativo (IC 999999 ou fila ICS INATIVOS).
 */
export default function MonitoramentoChamados() {
  const { t } = useTranslation();

  return (
    <InconsistenciaChamados
      tipos={TIPOS_TELA_MONITORAMENTO}
      titulo={t('nav.ticketMonitoring')}
      subtitulo={t('inconsistencias.monitoringSubtitle')}
    />
  );
}
