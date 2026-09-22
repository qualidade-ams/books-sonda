import { describe, it, expect, beforeEach, vi } from 'vitest';
import { auditService } from '../auditService';

const insertMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => ({
      insert: (payload: unknown) => insertMock(tabela, payload)
    })
  }
}));

describe('AuditService.registrarLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertMock.mockResolvedValue({ error: null });
  });

  it('grava o log na permission_audit_logs com os campos esperados', async () => {
    const gravou = await auditService.registrarLog({
      table_name: 'historico_disparos',
      record_id: 'empresa-1',
      action: 'INSERT',
      new_values: { status: 'enviado' },
      changed_by: 'user-1'
    });

    expect(gravou).toBe(true);
    const [tabela, payload] = insertMock.mock.calls[0];
    expect(tabela).toBe('permission_audit_logs');
    expect(payload).toMatchObject({
      table_name: 'historico_disparos',
      record_id: 'empresa-1',
      action: 'INSERT',
      changed_by: 'user-1'
    });
    expect(payload.changed_at).toEqual(expect.any(String));
  });

  it('não engole falha do banco: retorna false e registra o código do erro', async () => {
    const erroConsole = vi.spyOn(console, 'error').mockImplementation(() => {});
    insertMock.mockResolvedValue({
      error: { code: '42501', message: 'new row violates row-level security policy' }
    });

    const gravou = await auditService.registrarLog({
      table_name: 'historico_disparos',
      record_id: 'empresa-1',
      action: 'INSERT',
      new_values: { status: 'enviado' },
      changed_by: 'user-1'
    });

    expect(gravou).toBe(false);
    expect(erroConsole).toHaveBeenCalledWith(
      expect.stringContaining('42501'),
      expect.anything()
    );
    erroConsole.mockRestore();
  });

  it('não propaga exceção quando o insert rejeita, para não derrubar o fluxo principal', async () => {
    const erroConsole = vi.spyOn(console, 'error').mockImplementation(() => {});
    insertMock.mockRejectedValue(new Error('network down'));

    await expect(
      auditService.registrarLog({
        table_name: 'historico_disparos',
        record_id: 'empresa-1',
        action: 'INSERT',
        new_values: { status: 'enviado' },
        changed_by: 'user-1'
      })
    ).resolves.toBe(false);

    expect(erroConsole).toHaveBeenCalled();
    erroConsole.mockRestore();
  });
});
