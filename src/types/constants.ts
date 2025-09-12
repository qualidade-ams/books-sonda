/**
 * Constants for the permissions system
 */

import { PermissionLevel } from './permissions';

// Permission levels in order of hierarchy (none < view < edit)
export const PERMISSION_LEVELS: PermissionLevel[] = ['none', 'view', 'edit'];

// Permission level labels for UI
export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  none: 'Sem Acesso',
  view: 'Visualização',
  edit: 'Edição'
};

// Permission level descriptions
export const PERMISSION_LEVEL_DESCRIPTIONS: Record<PermissionLevel, string> = {
  none: 'Usuário não pode acessar esta tela',
  view: 'Usuário pode visualizar mas não editar',
  edit: 'Usuário pode visualizar e editar'
};

// Default admin group name (cannot be deleted)
export const DEFAULT_ADMIN_GROUP_NAME = 'Administradores';

// Screen categories
export const SCREEN_CATEGORIES = {
  ADMIN: 'admin',
  FORMS: 'forms',
  REPORTS: 'reports',
  CONFIG: 'config'
} as const;

export type ScreenCategory = typeof SCREEN_CATEGORIES[keyof typeof SCREEN_CATEGORIES];

// Screen category labels
export const SCREEN_CATEGORY_LABELS: Record<ScreenCategory, string> = {
  admin: 'Administração',
  forms: 'Formulários',
  reports: 'Relatórios',
  config: 'Configurações'
};

// Error codes for permission system
export const PERMISSION_ERROR_CODES = {
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
  USER_NOT_ASSIGNED: 'USER_NOT_ASSIGNED',
  INVALID_PERMISSION_LEVEL: 'INVALID_PERMISSION_LEVEL',
  CANNOT_DELETE_ADMIN_GROUP: 'CANNOT_DELETE_ADMIN_GROUP',
  DUPLICATE_GROUP_NAME: 'DUPLICATE_GROUP_NAME',
  USER_ALREADY_ASSIGNED: 'USER_ALREADY_ASSIGNED'
} as const;

export type PermissionErrorCode = typeof PERMISSION_ERROR_CODES[keyof typeof PERMISSION_ERROR_CODES];

// Default screens that should be registered in the system
export const DEFAULT_SCREENS = [
  {
    key: 'admin.dashboard',
    name: 'Dashboard Administrativo',
    description: 'Painel principal de administração',
    category: SCREEN_CATEGORIES.ADMIN,
    route: '/admin/dashboard'
  },
  {
    key: 'admin.aprovacoes',
    name: 'Aprovações',
    description: 'Gerenciamento de aprovações',
    category: SCREEN_CATEGORIES.ADMIN,
    route: '/admin/aprovacoes'
  },
  {
    key: 'admin.email-config',
    name: 'Configuração de Email',
    description: 'Configurações de email do sistema',
    category: SCREEN_CATEGORIES.CONFIG,
    route: '/admin/email-config'
  },
  {
    key: 'admin.precificacao',
    name: 'Precificação',
    description: 'Gerenciamento de preços',
    category: SCREEN_CATEGORIES.ADMIN,
    route: '/admin/precificacao'
  },
  {
    key: 'admin.aplicativos',
    name: 'Aplicativos',
    description: 'Gerenciamento de aplicativos',
    category: SCREEN_CATEGORIES.ADMIN,
    route: '/admin/aplicativos'
  },
  {
    key: 'admin.historico-orcamentos',
    name: 'Histórico de Orçamentos',
    description: 'Visualização do histórico de orçamentos',
    category: SCREEN_CATEGORIES.REPORTS,
    route: '/admin/historico-orcamentos'
  },
  {
    key: 'admin.user-config',
    name: 'Configuração de Usuários',
    description: 'Gerenciamento de usuários do sistema',
    category: SCREEN_CATEGORIES.CONFIG,
    route: '/admin/user-config'
  },
  {
    key: 'admin.grupos-usuarios',
    name: 'Grupos de Usuários',
    description: 'Gerenciamento de grupos e permissões',
    category: SCREEN_CATEGORIES.CONFIG,
    route: '/admin/grupos-usuarios'
  }
] as const;

// Permission hierarchy helper
export const getPermissionHierarchy = (level: PermissionLevel): number => {
  return PERMISSION_LEVELS.indexOf(level);
};

// Check if one permission level includes another
export const hasPermissionLevel = (userLevel: PermissionLevel, requiredLevel: PermissionLevel): boolean => {
  return getPermissionHierarchy(userLevel) >= getPermissionHierarchy(requiredLevel);
};