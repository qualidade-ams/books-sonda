import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConsultoresCoordenadores from '../ConsultoresCoordenadores';
import { useAtualizarAoAbrir } from '@/hooks/useAtualizarAoAbrir';

vi.mock('@/hooks/useAtualizarAoAbrir', () => ({ useAtualizarAoAbrir: vi.fn() }));
vi.mock('@/components/admin/LayoutAdmin', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/hooks/useConsultoresCoordenadores', () => ({
  useConsultoresCoordenadores: () => ({
    consultores: [],
    responsaveis: [],
    isLoading: false,
    error: null,
    definirCoordenador: vi.fn(),
    isSalvando: false,
  }),
}));
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));

describe('ConsultoresCoordenadores: ao abrir', () => {
  it('recarrega os consultores e coordenadores', () => {
    render(<ConsultoresCoordenadores />);
    expect(useAtualizarAoAbrir).toHaveBeenCalledWith('consultores-coordenadores');
  });
});
