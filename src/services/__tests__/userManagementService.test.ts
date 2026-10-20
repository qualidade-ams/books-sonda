import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    supabaseUrl: 'http://localhost',
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { getSession: vi.fn(), getUser: vi.fn() },
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { userManagementService } from '../userManagementService';

const sessao = { data: { session: { access_token: 'token', user: { id: 'admin' } } } };

/** fetch das Edge Functions (create-user, admin-ban-user) sempre com sucesso */
function mockFetchOk(corpo: any) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => corpo, text: async () => '' });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function chamadasRpc(nome: string) {
  return (supabase.rpc as any).mock.calls.filter(([fn]: [string]) => fn === nome);
}

const dadosEdicao = {
  userId: 'u1',
  fullName: 'Ana',
  email: 'ana@x.com',
  active: true,
  resetPassword: false,
};

describe('userManagementService — grupos do usuário', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getSession as any).mockResolvedValue(sessao);
    (supabase.rpc as any).mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lista usuários com todos os grupos', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: [
        {
          user_id: 'u1',
          user_email: 'ana@x.com',
          user_full_name: 'Ana',
          user_active: true,
          user_created_at: '2026-01-01T00:00:00Z',
          user_last_sign_in_at: null,
          group_name: 'Consultores, Coordenadores',
          group_ids: ['g1', 'g2'],
          group_names: ['Consultores', 'Coordenadores'],
        },
        {
          user_id: 'u2',
          user_email: 'bia@x.com',
          user_full_name: 'Bia',
          user_active: true,
          user_created_at: '2026-01-01T00:00:00Z',
          user_last_sign_in_at: null,
          group_name: null,
          group_ids: [],
          group_names: [],
        },
      ],
      error: null,
    });

    const usuarios = await userManagementService.listUsers();

    expect(usuarios[0]).toMatchObject({ id: 'u1', group_ids: ['g1', 'g2'], group_names: ['Consultores', 'Coordenadores'] });
    expect(usuarios[1]).toMatchObject({ id: 'u2', group_ids: [], group_names: [] });
  });

  it('cria usuário e atribui os grupos escolhidos', async () => {
    mockFetchOk({ success: true, userId: 'novo' });

    const resultado = await userManagementService.createUser({
      email: 'novo@x.com',
      password: '123456',
      fullName: 'Novo',
      active: true,
      sendWelcomeEmail: false,
      groupIds: ['g1', 'g2'],
    });

    expect(resultado).toMatchObject({ success: true, userId: 'novo' });
    expect(chamadasRpc('set_user_groups')).toEqual([
      ['set_user_groups', { p_user_id: 'novo', p_group_ids: ['g1', 'g2'] }],
    ]);
  });

  it('cria usuário sem grupos sem chamar a atribuição', async () => {
    mockFetchOk({ success: true, userId: 'novo' });

    await userManagementService.createUser({
      email: 'novo@x.com',
      password: '123456',
      fullName: 'Novo',
      active: true,
      sendWelcomeEmail: false,
    });

    expect(chamadasRpc('set_user_groups')).toEqual([]);
  });

  it('usuário criado mas grupos não atribuídos: sucesso com aviso', async () => {
    mockFetchOk({ success: true, userId: 'novo' });
    (supabase.rpc as any).mockResolvedValue({ data: null, error: { message: 'sem permissão' } });

    const resultado = await userManagementService.createUser({
      email: 'novo@x.com',
      password: '123456',
      fullName: 'Novo',
      active: true,
      sendWelcomeEmail: false,
      groupIds: ['g1'],
    });

    expect(resultado.success).toBe(true);
    expect(resultado.warning).toMatch(/grupos/i);
  });

  it('edita usuário e substitui os grupos quando informados', async () => {
    mockFetchOk({ success: true });

    const resultado = await userManagementService.updateUser({ ...dadosEdicao, groupIds: ['g2'] });

    expect(resultado.success).toBe(true);
    expect(chamadasRpc('admin_update_user')).toHaveLength(1);
    expect(chamadasRpc('set_user_groups')).toEqual([
      ['set_user_groups', { p_user_id: 'u1', p_group_ids: ['g2'] }],
    ]);
  });

  it('edita usuário sem mexer nos grupos quando não informados', async () => {
    mockFetchOk({ success: true });

    await userManagementService.updateUser(dadosEdicao);

    expect(chamadasRpc('set_user_groups')).toEqual([]);
  });

  it('falha ao salvar os grupos na edição devolve erro', async () => {
    mockFetchOk({ success: true });
    (supabase.rpc as any).mockImplementation(async (fn: string) =>
      fn === 'set_user_groups' ? { data: null, error: { message: 'sem permissão' } } : { data: null, error: null }
    );

    const resultado = await userManagementService.updateUser({ ...dadosEdicao, groupIds: ['g2'] });

    expect(resultado.success).toBe(false);
    expect(resultado.error).toMatch(/grupos/i);
  });
});
