import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import FaturarRequerimentos from '../FaturarRequerimentos';

// Mock dos hooks
vi.mock('@/hooks/useRequerimentos', () => ({
  useRequerimentosFaturamento: vi.fn(() => ({
    data: {
      requerimentos: []
    },
    isLoading: false,
    error: null,
    refetch: vi.fn()
  }))
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: '1', email: 'test@test.com' },
    signOut: vi.fn()
  }))
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    hasPermission: vi.fn(() => true),
    isLoading: false
  }))
}));

vi.mock('@/components/auth/ProtectedAction', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/admin/LayoutAdmin', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('FaturarRequerimentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar a página corretamente', async () => {
    renderWithProviders(<FaturarRequerimentos />);

    await waitFor(() => {
      expect(screen.getByText('Faturar Requerimentos')).toBeInTheDocument();
    });

    expect(screen.getByText('Visualize e processe requerimentos enviados para faturamento')).toBeInTheDocument();
  });

  it('deve exibir os filtros corretamente', async () => {
    renderWithProviders(<FaturarRequerimentos />);

    await waitFor(() => {
      expect(screen.getByText('Filtros')).toBeInTheDocument();
    });

    expect(screen.getByText('Mês')).toBeInTheDocument();
    expect(screen.getByText('Ano')).toBeInTheDocument();
    expect(screen.getByText('Tipo de Cobrança')).toBeInTheDocument();
  });

  it('deve exibir o botão de disparar faturamento', async () => {
    renderWithProviders(<FaturarRequerimentos />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /disparar faturamento/i })).toBeInTheDocument();
    });
  });

  it('deve exibir as estatísticas do período', async () => {
    renderWithProviders(<FaturarRequerimentos />);

    await waitFor(() => {
      expect(screen.getByText('Total de Requerimentos')).toBeInTheDocument();
      expect(screen.getByText('Total de Horas')).toBeInTheDocument();
      expect(screen.getByText('Tipos Ativos')).toBeInTheDocument();
      expect(screen.getByText('Período')).toBeInTheDocument();
    });
  });

  it('deve exibir mensagem quando não há requerimentos', async () => {
    renderWithProviders(<FaturarRequerimentos />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum requerimento encontrado')).toBeInTheDocument();
    });

    expect(screen.getByText(/não há requerimentos enviados para faturamento/i)).toBeInTheDocument();
  });

  it('deve desabilitar o botão de disparar quando não há requerimentos', async () => {
    renderWithProviders(<FaturarRequerimentos />);

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /disparar faturamento/i });
      expect(button).toBeDisabled();
    });
  });
});