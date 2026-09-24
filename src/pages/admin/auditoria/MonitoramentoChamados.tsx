import { useTranslation } from 'react-i18next';
import InconsistenciaChamados from './InconsistenciaChamados';
import { TIPOS_TELA_TROCA_CODIGO_RESOLUCAO } from '@/types/inconsistenciasChamados';

/**
 * Monitoramento de Chamados: mesma tela de inconsistências, restrita à troca
 * de código de resolução.
 */
export default function MonitoramentoChamados() {
  const { t } = useTranslation();

  return (
    <InconsistenciaChamados
      tipos={TIPOS_TELA_TROCA_CODIGO_RESOLUCAO}
      titulo={t('nav.ticketMonitoring')}
      subtitulo={t('inconsistencias.resolutionCodeChangeSubtitle')}
    />
  );
}
