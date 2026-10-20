import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, isReady: true }),
}));

vi.mock('@/services/permissionsService', () => ({
  permissionsService: {
    getUserPermissions: vi.fn(),
    getUserGroups: vi.fn(),
  },
}));

import { permissionsService } from '@/services/permissionsService';
import { PermissionsProvider } from '../PermissionsContext';
import { usePermissions } from '@/hooks/usePermissions';

const wrapper = ({ children }: { children: React.ReactNode }) => <PermissionsProvider>{children}</PermissionsProvider>;

const coordenadores = { id: 'g1', name: 'Coordenadores e Gerentes' } as any;
const consultores = { id: 'g2', name: 'Requerimentos - Consultores' } as any;

describe('PermissionsContext — usuário em vários grupos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('expõe todos os grupos e mantém userGroup como o primeiro', async () => {
    (permissionsService.getUserPermissions as any).mockResolvedValue({ requerimentos: 'edit' });
    (permissionsService.getUserGroups as any).mockResolvedValue([coordenadores, consultores]);

    const { result } = renderHook(() => usePermissions(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.userGroups).toEqual([coordenadores, consultores]);
    expect(result.current.userGroup).toEqual(coordenadores);
    expect(result.current.hasPermission('requerimentos', 'edit')).toBe(true);
  });

  it('usuário sem grupo: lista vazia e userGroup nulo', async () => {
    (permissionsService.getUserPermissions as any).mockResolvedValue({});
    (permissionsService.getUserGroups as any).mockResolvedValue([]);

    const { result } = renderHook(() => usePermissions(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.userGroups).toEqual([]);
    expect(result.current.userGroup).toBeNull();
  });
});
