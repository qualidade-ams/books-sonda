import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Notificacao } from '@/types/notificacoes';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (chave: string) => chave }),
}));

const estado = {
  notificacoes: [] as Notificacao[],
  naoLidas: 0,
  isLoading: false,
  marcarComoLida: vi.fn(),
  marcarTodasComoLidas: vi.fn(),
  isMarcando: false,
};
vi.mock('@/hooks/useNotificacoes', () => ({ useNotificacoes: () => estado }));

import NotificacoesSino from '../NotificacoesSino';

const notificacao = (id: string, lida: boolean, sobrescrever: Partial<Notificacao> = {}): Notificacao => ({
  id,
  tipo: 'book_precisa_retificacao',
  screen_key: 'geracao_books',
  titulo: `Título ${id}`,
  mensagem: `Mensagem ${id}`,
  link: '/admin/geracao-books',
  empresa_id: 'e1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  lida,
  ...sobrescrever,
});

const abrir = async () => userEvent.click(screen.getByRole('button', { name: 'layout.notifications.open' }));

describe('NotificacoesSino', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estado.notificacoes = [];
    estado.naoLidas = 0;
    estado.marcarComoLida.mockResolvedValue(undefined);
    estado.marcarTodasComoLidas.mockResolvedValue(undefined);
  });

  it('mostra a quantidade de não lidas no sino', () => {
    estado.notificacoes = [notificacao('n1', false), notificacao('n2', false), notificacao('n3', true)];
    estado.naoLidas = 2;

    render(<NotificacoesSino />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('não mostra contador quando não há não lidas', () => {
    estado.notificacoes = [notificacao('n1', true)];

    render(<NotificacoesSino />);

    expect(screen.queryByTestId('notificacoes-contador')).not.toBeInTheDocument();
  });

  it('limita o contador a 99+', () => {
    estado.naoLidas = 150;

    render(<NotificacoesSino />);

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('lista título e mensagem das notificações ao abrir', async () => {
    estado.notificacoes = [notificacao('n1', false)];
    estado.naoLidas = 1;
    render(<NotificacoesSino />);

    await abrir();

    expect(screen.getByText('Título n1')).toBeInTheDocument();
    expect(screen.getByText('Mensagem n1')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há pendências', async () => {
    render(<NotificacoesSino />);

    await abrir();

    expect(screen.getByText('layout.notifications.empty')).toBeInTheDocument();
  });

  it('ao clicar numa não lida, marca como lida e abre a tela da pendência', async () => {
    estado.notificacoes = [notificacao('n1', false, { link: '/admin/ajustes-retroativos' })];
    estado.naoLidas = 1;
    render(<NotificacoesSino />);
    await abrir();

    await userEvent.click(screen.getByText('Título n1'));

    expect(estado.marcarComoLida).toHaveBeenCalledWith('n1');
    expect(navigate).toHaveBeenCalledWith('/admin/ajustes-retroativos');
  });

  it('ao clicar numa já lida, só navega', async () => {
    estado.notificacoes = [notificacao('n1', true)];
    render(<NotificacoesSino />);
    await abrir();

    await userEvent.click(screen.getByText('Título n1'));

    expect(estado.marcarComoLida).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/admin/geracao-books');
  });

  it('marca todas como lidas', async () => {
    estado.notificacoes = [notificacao('n1', false)];
    estado.naoLidas = 1;
    render(<NotificacoesSino />);
    await abrir();

    await userEvent.click(screen.getByRole('button', { name: 'layout.notifications.markAllRead' }));

    expect(estado.marcarTodasComoLidas).toHaveBeenCalled();
  });

  it('desabilita "marcar todas" quando não há não lidas', async () => {
    estado.notificacoes = [notificacao('n1', true)];
    render(<NotificacoesSino />);
    await abrir();

    expect(screen.getByRole('button', { name: 'layout.notifications.markAllRead' })).toBeDisabled();
  });
});
