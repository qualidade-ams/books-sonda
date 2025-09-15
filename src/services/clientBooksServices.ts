/**
 * Exportações centralizadas dos serviços do sistema de gerenciamento de clientes e books
 */

// Serviços
export { 
  EmpresasClientesService, 
  empresasClientesService,
  EmpresaError 
} from './empresasClientesService';

export { 
  ColaboradoresService, 
  colaboradoresService,
  ColaboradorError 
} from './colaboradoresService';

export { 
  GruposResponsaveisService, 
  gruposResponsaveisService,
  GrupoResponsavelError 
} from './gruposResponsaveisService';

// Re-exportar tipos para conveniência
export type {
  EmpresaCliente,
  EmpresaClienteCompleta,
  EmpresaFormData,
  EmpresaFiltros,
  Colaborador,
  ColaboradorCompleto,
  ColaboradorFormData,
  ColaboradorFiltros,
  GrupoResponsavel,
  GrupoResponsavelCompleto,
  GrupoFormData,
  ImportResult,
  DisparoResult,
  StatusMensal
} from '@/types/clientBooksTypes';