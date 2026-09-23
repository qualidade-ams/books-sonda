import type { EnviosPorInconsistencia } from '@/types/inconsistenciasChamados';

export type FiltroEnvioEmail = 'all' | 'enviado' | 'nao_enviado';

/** Indica se a inconsistência passa no filtro de "Email enviado" */
export function passaFiltroEnvioEmail(
  inconsistenciaId: string,
  envios: EnviosPorInconsistencia,
  filtro: FiltroEnvioEmail
): boolean {
  if (filtro === 'all') return true;
  const foiEnviado = (envios[inconsistenciaId]?.length ?? 0) > 0;
  return filtro === 'enviado' ? foiEnviado : !foiEnviado;
}
