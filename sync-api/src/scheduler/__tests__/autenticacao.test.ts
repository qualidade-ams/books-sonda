import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exigirPermissao } from '../autenticacao';
import { criarSupabaseFake } from '../../__tests__/helpers/supabaseFake';

function criarRes() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe('exigirPermissao', () => {
  let getUser: ReturnType<typeof vi.fn>;
  let nivelNoBanco: string[];

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    nivelNoBanco = ['edit'];
    getUser = vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null }));
  });

  afterEach(() => vi.restoreAllMocks());

  function middleware(nivel: 'view' | 'edit' = 'edit') {
    const fake = criarSupabaseFake((tabela) => {
      if (tabela === 'user_group_assignments') return { data: [{ group_id: 'g1' }], error: null };
      if (tabela === 'screen_permissions') {
        return { data: nivelNoBanco.map((n) => ({ permission_level: n })), error: null };
      }
      return null;
    });
    const cliente = { ...fake.cliente, auth: { getUser } };
    return { mw: exigirPermissao(cliente, 'sincronizacao_sql_server', nivel), fake };
  }

  it('401 sem token', async () => {
    const res = criarRes();
    const next = vi.fn();
    await middleware().mw({ headers: {} } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('401 com token inválido', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } });
    const res = criarRes();
    const next = vi.fn();
    await middleware().mw({ headers: { authorization: 'Bearer xyz' } } as any, res, next);
    expect(getUser).toHaveBeenCalledWith('xyz');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('403 quando o nível é insuficiente', async () => {
    nivelNoBanco = ['view'];
    const res = criarRes();
    const next = vi.fn();
    await middleware('edit').mw({ headers: { authorization: 'Bearer ok' } } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('403 sem permissão na tela', async () => {
    nivelNoBanco = [];
    const res = criarRes();
    const next = vi.fn();
    await middleware('view').mw({ headers: { authorization: 'Bearer ok' } } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('libera e identifica o usuário quando tem permissão', async () => {
    const req: any = { headers: { authorization: 'Bearer ok' } };
    const res = criarRes();
    const next = vi.fn();
    const { mw, fake } = middleware('edit');
    await mw(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.usuarioId).toBe('u1');
    const perm = fake.consultas.find((c) => c.tabela === 'screen_permissions')!;
    expect(perm.chamadas).toContainEqual(['eq', ['screen_key', 'sincronizacao_sql_server']]);
    expect(perm.chamadas).toContainEqual(['in', ['group_id', ['g1']]]);
  });

  it('view é suficiente quando edit existe', async () => {
    nivelNoBanco = ['view', 'edit'];
    const next = vi.fn();
    await middleware('view').mw({ headers: { authorization: 'Bearer ok' } } as any, criarRes(), next);
    expect(next).toHaveBeenCalled();
  });
});
