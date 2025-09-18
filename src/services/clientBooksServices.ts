/**
 * Exportações centralizadas dos serviços do sistema de gerenciamento de clientes e books
 */

// Serviços
export { 
  EmpresasClientesService, 
  empresasClientesService,
  EMPRESA_STATUS,
  PRODUTOS
} from './empresasClientesService';

export { 
  ClientesService, 
  clientesService
} from './clientesService';

export { 
  GruposResponsaveisService, 
  gruposResponsaveisService
} from './gruposResponsaveisService';

// Erros centralizados
export {
  ClientBooksError,
  ClientBooksErrorFactory
} from '@/errors/clientBooksErrors';

// Re-exportar tipos para conveniência
export type {
  EmpresaCliente,
  EmpresaClienteCompleta,
  EmpresaFormData,
  EmpresaFiltros,
  Cliente,
  ClienteCompleto,
  ClienteFormData,
  ClienteFiltros,
  GrupoResponsavel,
  GrupoResponsavelCompleto,
  GrupoFormData,
  ImportResult,
  DisparoResult,
  StatusMensal
} from '@/types/clientBooksTypes';