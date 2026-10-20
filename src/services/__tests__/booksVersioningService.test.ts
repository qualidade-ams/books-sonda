import { describe, it, expect, vi, beforeEach } from 'vitest';
import { booksVersioningService } from '../booksVersioningService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    rpc: vi.fn()
  }
}));

describe('booksVersioningService.registrarEnvio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    (supabase.rpc as any).mockResolvedValue({ data: 'versao-1', error: null });
  });

  it('usa o usuário logado por padrão', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'u1' } } });

    const r = await booksVersioningService.registrarEnvio('book-1', ['q@sonda.com']);

    expect(r).toEqual({ success: true, versaoId: 'versao-1' });
    expect(supabase.rpc).toHaveBeenCalledWith('registrar_envio_book', {
      p_book_id: 'book-1',
      p_usuario_id: 'u1',
      p_destinatarios: ['q@sonda.com']
    });
  });

  it('sem usuário logado e sem responsável informado, não registra', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });

    const r = await booksVersioningService.registrarEnvio('book-1', ['q@sonda.com']);

    expect(r.success).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('com responsável informado (geração automática no servidor), não consulta a sessão', async () => {
    const r = await booksVersioningService.registrarEnvio('book-1', ['q@sonda.com'], { usuarioId: 'criador' });

    expect(r.success).toBe(true);
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith('registrar_envio_book', {
      p_book_id: 'book-1',
      p_usuario_id: 'criador',
      p_destinatarios: ['q@sonda.com']
    });
  });

  it('aceita responsável nulo (agendamento sem criador)', async () => {
    await booksVersioningService.registrarEnvio('book-1', ['q@sonda.com'], { usuarioId: null });

    expect(supabase.rpc).toHaveBeenCalledWith('registrar_envio_book', expect.objectContaining({ p_usuario_id: null }));
  });
});
