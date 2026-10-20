import type { UserGroup } from '@/types/permissions';

/** Usuário é administrador se qualquer um dos seus grupos for de administração */
export const pertenceAGrupoAdmin = (grupos: Pick<UserGroup, 'name'>[] | undefined): boolean =>
  (grupos ?? []).some((grupo) => grupo.name?.toLowerCase().includes('admin'));
