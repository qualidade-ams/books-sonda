import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (chave: string) => chave, i18n: { language: 'pt-BR' } }),
}));
vi.mock('@/components/admin/LayoutAdmin', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/auth/ProtectedAction', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

const permissoes = { editaGrupos: true };
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (tela: string, nivel: string) => tela !== 'usuarios-grupos' || (nivel === 'edit' && permissoes.editaGrupos),
  }),
}));

const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));

vi.mock('@/services/userManagementService', () => ({
  userManagementService: {
    listUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
  },
}));
vi.mock('@/services/permissionsService', () => ({
  permissionsService: { getAllGroups: vi.fn() },
}));

import { userManagementService } from '@/services/userManagementService';
import { permissionsService } from '@/services/permissionsService';
import UserManagement from '../UserManagement';

const usuarios = [
  {
    id: 'u1',
    email: 'ana@x.com',
    full_name: 'Ana',
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    group_ids: ['g1', 'g2'],
    group_names: ['Coordenadores e Gerentes', 'Requerimentos - Consultores'],
  },
  {
    id: 'u2',
    email: 'bia@x.com',
    full_name: 'Bia',
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    group_ids: ['g1'],
    group_names: ['Coordenadores e Gerentes'],
  },
];

const grupos = [
  { id: 'g1', name: 'Coordenadores e Gerentes' },
  { id: 'g2', name: 'Requerimentos - Consultores' },
];

async function abrirEdicao(user: ReturnType<typeof userEvent.setup>, nome: string) {
  const linha = (await screen.findByText(nome)).closest('tr')!;
  await user.click(within(linha).getByTitle('Editar'));
  return screen.findByRole('dialog');
}

describe('UserManagement — vários grupos por usuário', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissoes.editaGrupos = true;
    Element.prototype.scrollIntoView = vi.fn();
    (userManagementService.listUsers as any).mockResolvedValue(usuarios);
    (userManagementService.updateUser as any).mockResolvedValue({ success: true });
    (userManagementService.createUser as any).mockResolvedValue({ success: true, userId: 'novo' });
    (permissionsService.getAllGroups as any).mockResolvedValue(grupos);
  });

  it('lista todos os grupos do usuário', async () => {
    render(<UserManagement />);

    const linhaAna = (await screen.findByText('Ana')).closest('tr')!;
    expect(within(linhaAna).getByText('Coordenadores e Gerentes')).toBeInTheDocument();
    expect(within(linhaAna).getByText('Requerimentos - Consultores')).toBeInTheDocument();
  });

  it('a busca encontra o usuário por qualquer um dos grupos', async () => {
    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText('Ana');

    await user.type(screen.getByPlaceholderText('Nome ou e-mail...'), 'Consultores');

    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText('Bia')).not.toBeInTheDocument();
  });

  it('edição: remover um grupo envia a nova lista', async () => {
    const user = userEvent.setup();
    render(<UserManagement />);

    const dialogo = await abrirEdicao(user, 'Ana');
    await user.click(within(dialogo).getByText('Coordenadores e Gerentes'));
    await user.click(within(dialogo).getByRole('button', { name: /Salvar Alterações/ }));

    await waitFor(() =>
      expect(userManagementService.updateUser).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', groupIds: ['g2'] }))
    );
  });

  it('edição sem mexer nos grupos não envia grupos', async () => {
    const user = userEvent.setup();
    render(<UserManagement />);

    const dialogo = await abrirEdicao(user, 'Ana');
    await within(dialogo).findByText('Requerimentos - Consultores');
    await user.click(within(dialogo).getByRole('button', { name: /Salvar Alterações/ }));

    await waitFor(() => expect(userManagementService.updateUser).toHaveBeenCalled());
    expect((userManagementService.updateUser as any).mock.calls[0][0].groupIds).toBeUndefined();
  });

  it('sem edição em usuarios-grupos o campo de grupos não aparece', async () => {
    permissoes.editaGrupos = false;
    const user = userEvent.setup();
    render(<UserManagement />);

    const dialogo = await abrirEdicao(user, 'Ana');

    expect(within(dialogo).queryByText('Grupos')).not.toBeInTheDocument();
    expect(permissionsService.getAllGroups).not.toHaveBeenCalled();
  });

  it('cadastro envia os grupos escolhidos', async () => {
    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText('Ana');

    await user.click(screen.getByRole('button', { name: /Cadastrar Usuário/ }));
    const dialogo = await screen.findByRole('dialog');
    await user.type(within(dialogo).getByLabelText(/Nome Completo/), 'Carla Souza');
    await user.type(within(dialogo).getByLabelText(/^Email/), 'carla@x.com');
    await user.type(within(dialogo).getByLabelText(/^Senha/), '123456');
    await user.type(within(dialogo).getByLabelText(/Confirmar Senha/), '123456');
    await user.click(within(dialogo).getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /Requerimentos - Consultores/ }));
    await user.keyboard('{Escape}'); // fecha a lista de grupos
    await user.click(within(dialogo).getByRole('button', { name: /Criar Usuário/ }));

    await waitFor(() =>
      expect(userManagementService.createUser).toHaveBeenCalledWith(expect.objectContaining({ email: 'carla@x.com', groupIds: ['g2'] }))
    );
  });
});
