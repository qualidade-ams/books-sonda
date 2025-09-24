/**
 * Exportações centralizadas dos componentes de anexos
 */

export { default as InfrastructureChecker } from './InfrastructureChecker';
export { AnexoUpload } from './AnexoUpload';
export { AnexoDashboard } from './AnexoDashboard';
export { AnexoAlertsMonitor } from './AnexoAlertsMonitor';
export { AnexoPerformanceReport } from './AnexoPerformanceReport';
export { AnexoMonitoringConfig } from './AnexoMonitoringConfig';
export { default as AnexoUploadExample } from './AnexoUploadExample';

// Tipos e interfaces
export type { InfrastructureStatus } from '@/utils/anexoInfrastructureUtils';
export type { AnexoData, AnexosSummary } from './AnexoUpload';