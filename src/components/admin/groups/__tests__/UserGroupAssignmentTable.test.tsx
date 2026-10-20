import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'admin' } }),
}));

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

vi.mock('@/services/permissionsService', () => ({
  permissionsService: {
    getAllUsersWithGroups: vi.fn(),
    getAllGroups: vi.fn(),
    setUserGroups: vi.fn(),
  },
}));

import { permissionsService } from '@/services/permissionsService';
import UserGroupAssignmentTable from '../UserGroupAssignmentTable';

const grupos = [
  { id: 'g1', name: 'Coordenadores e Gerentes' },
  { id: 'g2', name: 'Requerimentos - Consultores' },
];

describe('UserGroupAssignmentTable — vários grupos por usuário', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    (permissionsService.getAllGroups as any).mockResolvedValue(grupos);
    (permissionsService.getAllUsersWithGroups as any).mockResolvedValue([
      { id: 'u1', email: 'ana@x.com', full_name: 'Ana', group_ids: ['g1', 'g2'], group_names: ['Coordenadores e Gerentes', 'Requerimentos - Consultores'] },
      { id: 'u2', email: 'bia@x.com', full_name: 'Bia', group_ids: [], group_names: [] },
    ]);
    (permissionsService.setUserGroups as any).mockResolvedValue(undefined);
  });

  it('mostra todos os grupos do usuário e conta quem tem grupo', async () => {
    render(<UserGroupAssignmentTable />);

    const linhaAna = (await screen.findByText('Ana')).closest('tr')!;
    expect(within(linhaAna).getAllByText('Coordenadores e Gerentes').length).toBeGreaterThan(0);
    expect(within(linhaAna).getAllByText('Requerimentos - Consultores').length).toBeGreaterThan(0);
    expect(screen.getByText(/1 usuários com grupo/)).toBeInTheDocument();
    expect(screen.getByText(/1 usuários sem grupo/)).toBeInTheDocument();
  });

  it('adicionar um grupo salva a lista completa do usuário', async () => {
    const user = userEvent.setup();
    render(<UserGroupAssignmentTable />);

    const linhaBia = (await screen.findByText('Bia')).closest('tr')!;
    await user.click(within(linhaBia).getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /Requerimentos - Consultores/ }));

    await waitFor(() => expect(permissionsService.setUserGroups).toHaveBeenCalledWith('u2', ['g2']));
  });

  it('remover um grupo mantém os demais', async () => {
    const user = userEvent.setup();
    render(<UserGroupAssignmentTable />);

    const linhaAna = (await screen.findByText('Ana')).closest('tr')!;
    await user.click(within(linhaAna).getByText('Coordenadores e Gerentes'));

    await waitFor(() => expect(permissionsService.setUserGroups).toHaveBeenCalledWith('u1', ['g2']));
    await waitFor(() => expect(within(linhaAna).queryByText('Coordenadores e Gerentes')).not.toBeInTheDocument());
  });
});
