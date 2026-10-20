import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { permissionsService } from '../permissionsService';

type Resultado = { data: any; error: any };

/** Builder encadeável por tabela: registra as chamadas e resolve com o resultado da tabela */
function mockTabelas(resultados: Record<string, Resultado>) {
  const chamadas: Record<string, [string, any[]][]> = {};
  (supabase.from as any).mockImplementation((tabela: string) => {
    const resultado = resultados[tabela] ?? { data: null, error: null };
    const registro = (chamadas[tabela] ??= []);
    const builder: any = new Proxy(
      {},
      {
        get(_a, prop: string) {
          if (prop === 'then') return (ok: any, falha: any) => Promise.resolve(resultado).then(ok, falha);
          return (...args: any[]) => {
            registro.push([prop, args]);
            if (prop === 'single' || prop === 'maybeSingle') return Promise.resolve(resultado);
            return builder;
          };
        },
      }
    );
    return builder;
  });
  return chamadas;
}

describe('permissionsService — usuário em vários grupos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('soma as permissões de todos os grupos usando o maior nível por tela', async () => {
    const chamadas = mockTabelas({
      user_group_assignments: { data: [{ group_id: 'g1' }, { group_id: 'g2' }], error: null },
      screen_permissions: {
        data: [
          { screen_key: 'requerimentos', permission_level: 'view' },
          { screen_key: 'requerimentos', permission_level: 'edit' },
          { screen_key: 'books', permission_level: 'edit' },
          { screen_key: 'books', permission_level: 'none' },
          { screen_key: 'elogios', permission_level: 'none' },
          { screen_key: 'elogios', permission_level: 'view' },
        ],
        error: null,
      },
    });

    const permissoes = await permissionsService.getUserPermissions('u1');

    expect(chamadas.screen_permissions).toContainEqual(['in', ['group_id', ['g1', 'g2']]]);
    expect(permissoes).toEqual({ requerimentos: 'edit', books: 'edit', elogios: 'view' });
  });

  it('usuário sem grupo fica sem permissões e não consulta screen_permissions', async () => {
    const chamadas = mockTabelas({ user_group_assignments: { data: [], error: null } });

    const permissoes = await permissionsService.getUserPermissions('u1');

    expect(permissoes).toEqual({});
    expect(chamadas.screen_permissions).toBeUndefined();
  });

  it('lista todos os grupos do usuário', async () => {
    const admin = { id: 'g1', name: 'Administradores' };
    const consultores = { id: 'g2', name: 'Requerimentos - Consultores' };
    const chamadas = mockTabelas({
      user_group_assignments: {
        data: [
          { group_id: 'g1', user_groups: admin },
          { group_id: 'g2', user_groups: consultores },
        ],
        error: null,
      },
    });

    const grupos = await permissionsService.getUserGroups('u1');

    expect(chamadas.user_group_assignments).toContainEqual(['eq', ['user_id', 'u1']]);
    expect(grupos).toEqual([admin, consultores]);
  });

  it('substitui os grupos do usuário numa chamada só', async () => {
    (supabase.rpc as any).mockResolvedValue({ data: null, error: null });

    await permissionsService.setUserGroups('u1', ['g1', 'g2']);

    expect(supabase.rpc).toHaveBeenCalledWith('set_user_groups', {
      p_user_id: 'u1',
      p_group_ids: ['g1', 'g2'],
    });
  });

  it('propaga erro ao substituir os grupos', async () => {
    (supabase.rpc as any).mockResolvedValue({ data: null, error: { message: 'sem permissão', code: '42501' } });

    await expect(permissionsService.setUserGroups('u1', ['g1'])).rejects.toThrow('sem permissão');
  });

  it('agrupa os grupos por usuário na lista de atribuição', async () => {
    mockTabelas({
      profiles: {
        data: [
          { id: 'u1', email: 'a@x.com', full_name: 'Ana' },
          { id: 'u2', email: 'b@x.com', full_name: 'Bia' },
        ],
        error: null,
      },
      user_group_assignments: {
        data: [
          { user_id: 'u1', group_id: 'g1', user_groups: { id: 'g1', name: 'Coordenadores' } },
          { user_id: 'u1', group_id: 'g2', user_groups: { id: 'g2', name: 'Consultores' } },
        ],
        error: null,
      },
    });

    const usuarios = await permissionsService.getAllUsersWithGroups();

    expect(usuarios).toEqual([
      { id: 'u1', email: 'a@x.com', full_name: 'Ana', group_ids: ['g1', 'g2'], group_names: ['Coordenadores', 'Consultores'] },
      { id: 'u2', email: 'b@x.com', full_name: 'Bia', group_ids: [], group_names: [] },
    ]);
  });
});
