/**
 * Testes de integração para permissões do Sistema de Requerimentos
 * Valida o controle de acesso e integração com ProtectedRoute
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        })),
        in: vi.fn(() => ({
          order: vi.fn()
        }))
      }))
    }))
  }
}));

// Mock do PermissionsContext
vi.mock('@/contexts/PermissionsContext', () => ({
  PermissionsProvider: ({ children }: { children: React.ReactNode }) => children,
  usePermissions: () => ({
    userPermissions: {},
    userGroup: null,
    loading: false,
    error: null,
    retryCount: 0,
    refreshPermissions: vi.fn(),
    hasPermission: vi.fn(() => false)
  })
}));

// Componente de teste para tela protegida
const TelaLancarRequerimentos = () => {
  return (
    <div data-testid="tela-lancar-requerimentos">
      <h1>Lançar Requerimentos</h1>
      <p>Tela para lançamento de requerimentos</p>
    </div>
  );
};

const TelaFaturarRequerimentos = () => {
  return (
    <div data-testid="tela-faturar-requerimentos">
      <h1>Enviar Requerimentos</h1>
      <p>Tela para faturamento de requerimentos</p>
    </div>
  );
};

// Mock do hook usePermissions
const mockUsePermissions = vi.fn();

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions()
}));

// Wrapper de teste com providers
const TestWrapper = ({ children, userPermissions = [] }: { 
  children: React.ReactNode; 
  userPermissions?: string[];
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  // Configurar mock do usePermissions
  mockUsePermissions.mockReturnValue({
    userPermissions: userPermissions.reduce((acc, perm) => {
      acc[perm] = 'edit';
      return acc;
    }, {} as Record<string, string>),
    userGroup: null,
    loading: false,
    error: null,
    retryCount: 0,
    refreshPermissions: vi.fn(),
    hasPermission: (screenKey: string, level: string = 'view') => userPermissions.includes(screenKey)
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PermissionsProvider>
          {children}
        </PermissionsProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Sistema de Requerimentos - Permissões', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock do usuário autenticado
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'admin@test.com',
          user_metadata: {},
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString()
        }
      },
      error: null
    });
  });

  describe('Usuário Administrador', () => {
    it('deve ter acesso à tela Lançar Requerimentos', async () => {
      render(
        <TestWrapper userPermissions={['lancar_requerimentos']}>
          <ProtectedRoute screenKey="lancar_requerimentos">
            <TelaLancarRequerimentos />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('tela-lancar-requerimentos')).toBeInTheDocument();
      });

      expect(screen.getByText('Lançar Requerimentos')).toBeInTheDocument();
      expect(screen.getByText('Tela para lançamento de requerimentos')).toBeInTheDocument();
    });

    it('deve ter acesso à tela Enviar Requerimentos', async () => {
      render(
        <TestWrapper userPermissions={['faturar_requerimentos']}>
          <ProtectedRoute screenKey="faturar_requerimentos">
            <TelaFaturarRequerimentos />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('tela-faturar-requerimentos')).toBeInTheDocument();
      });

      expect(screen.getByText('Enviar Requerimentos')).toBeInTheDocument();
      expect(screen.getByText('Tela para faturamento de requerimentos')).toBeInTheDocument();
    });
  });

  describe('Usuário Não Administrador', () => {
    it('deve ser bloqueado na tela Lançar Requerimentos', async () => {
      render(
        <TestWrapper userPermissions={[]}>
          <ProtectedRoute screenKey="lancar_requerimentos">
            <TelaLancarRequerimentos />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('tela-lancar-requerimentos')).not.toBeInTheDocument();
      });

      // Deve exibir mensagem de acesso negado
      expect(screen.getByText(/acesso negado/i)).toBeInTheDocument();
    });

    it('deve ser bloqueado na tela Enviar Requerimentos', async () => {
      render(
        <TestWrapper userPermissions={[]}>
          <ProtectedRoute screenKey="faturar_requerimentos">
            <TelaFaturarRequerimentos />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('tela-faturar-requerimentos')).not.toBeInTheDocument();
      });

      // Deve exibir mensagem de acesso negado
      expect(screen.getByText(/acesso negado/i)).toBeInTheDocument();
    });
  });

  describe('Integração com ProtectedRoute', () => {
    it('deve validar screenKey corretamente', async () => {
      const { rerender } = render(
        <TestWrapper userPermissions={['lancar_requerimentos']}>
          <ProtectedRoute screenKey="lancar_requerimentos">
            <TelaLancarRequerimentos />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Com permissão correta
      await waitFor(() => {
        expect(screen.getByTestId('tela-lancar-requerimentos')).toBeInTheDocument();
      });

      // Alterar para screenKey sem permissão
      rerender(
        <TestWrapper userPermissions={['lancar_requerimentos']}>
          <ProtectedRoute screenKey="faturar_requerimentos">
            <TelaFaturarRequerimentos />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('tela-faturar-requerimentos')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/acesso negado/i)).toBeInTheDocument();
    });
  });
});