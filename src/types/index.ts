// Export all permission-related types
export * from './permissions';
export * from './database';
export * from './api';
export * from './constants';

// Export banco de horas types
export * from './bancoHoras';

// Re-export commonly used types for convenience
export type {
  PermissionLevel,
  UserGroup,
  Screen,
  ScreenPermission,
  UserGroupAssignment,
  UserPermissions,
  PermissionsContextType,
  UsePermissionsReturn,
  CreateUserGroupInput,
  UpdateUserGroupInput,
  PermissionMatrix,
  PermissionError,
  ProtectedRouteProps,
  ProtectedActionProps
} from './permissions';

export type {
  DbUserGroup,
  DbScreen,
  DbScreenPermission,
  DbUserGroupAssignment,
  UserWithGroup,
  GroupWithPermissions,
  UserPermissionsQuery
} from './database';

export type {
  ApiResponse,
  ApiError,
  CreateGroupRequest,
  UpdateGroupRequest,
  AssignUserToGroupRequest,
  UpdateGroupPermissionsRequest,
  GetUserPermissionsResponse,
  ValidationError,
  PermissionCheckRequest,
  PermissionCheckResponse
} from './api';

export type {
  ParametrosContrato,
  Alocacao,
  BancoHorasCalculo,
  BancoHorasCalculoSegmentado,
  BancoHorasReajuste,
  BancoHorasVersao,
  BancoHorasAuditLog,
  DiferencasVersao,
  ValidacaoDadosIntegrados,
  ResultadoExcedente,
  DescricaoFaturamento
} from './bancoHoras';