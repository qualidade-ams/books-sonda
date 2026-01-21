/**
 * Testes para o componente ModalReajuste
 * 
 * Testa validação de formulário, preview de impacto e feedback visual.
 * 
 * @module components/admin/banco-horas/__tests__/ModalReajuste
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModalReajuste } from '../ModalReajuste';
import type { BancoHorasCalculo } from '@/types/bancoHoras';

// Mock do hook useCriarReajuste
vi.mock('@/hooks/useBancoHoras', () => ({
  useCriarReajuste: () => ({
    criarReajuste: vi.fn().mockResolvedValue({}),
    isCreating: false,
    error: null,
  }),
}));

// Mock do hook useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock do supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      }),
    },
  },
}));

// Mock das funções de conversão de horas
vi.mock('@/utils/horasUtils', () => ({
  converterHorasParaMinutos: (horas: string) => {
    const [h, m] = horas.replace('-', '').split(':').map(Number);
    const minutos = h * 60 + m;
    return horas.startsWith('-') ? -minutos : minutos;
  },
  converterMinutosParaHoras: (minutos: number) => {
    const abs = Math.abs(minutos);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    const sinal = minutos < 0 ? '-' : '';
    return `${sinal}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },
}));

describe('ModalReajuste', () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const calculoMock: BancoHorasCalculo = {
    id: 'calculo-1',
    empresa_id: 'empresa-1',
    mes: 3,
    ano: 2024,
    versao: 1,
    saldo_horas: '10:30',
    is_fim_periodo: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderModal = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ModalReajuste
          open={true}
          onClose={mockOnClose}
          empresaId="empresa-1"
          mes={3}
          ano={2024}
          calculoAtual={calculoMock}
          onSuccess={mockOnSuccess}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  it('deve renderizar o modal quando aberto', () => {
    renderModal();
    
    expect(screen.getByText('Criar Reajuste Manual')).toBeInTheDocument();
    expect(screen.getByText(/Ajuste manual no cálculo de 3\/2024/)).toBeInTheDocument();
  });

  it('deve exibir alerta sobre recálculo de meses subsequentes', () => {
    renderModal();
    
    expect(screen.getByText('Atenção')).toBeInTheDocument();
    expect(screen.getByText(/todos os meses subsequentes/)).toBeInTheDocument();
  });

  it('deve validar observação privada com mínimo 10 caracteres', async () => {
    const user = userEvent.setup();
    renderModal();

    const observacaoInput = screen.getByPlaceholderText(/Descreva o motivo do reajuste/);
    
    // Tentar enviar com observação curta
    await user.type(observacaoInput, 'Curto');
    
    const submitButton = screen.getByRole('button', { name: /Aplicar Reajuste/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Observação deve ter no mínimo 10 caracteres/)).toBeInTheDocument();
    });
  });

  it('deve validar formato de horas (HH:MM)', async () => {
    const user = userEvent.setup();
    renderModal();

    const horasInput = screen.getByPlaceholderText(/Ex: 10:30 ou -05:15/);
    
    // Formato inválido
    await user.type(horasInput, '1030');
    
    const submitButton = screen.getByRole('button', { name: /Aplicar Reajuste/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Formato inválido. Use HH:MM ou -HH:MM/)).toBeInTheDocument();
    });
  });

  it('deve exibir preview do impacto para reajuste positivo', async () => {
    const user = userEvent.setup();
    renderModal();

    const horasInput = screen.getByPlaceholderText(/Ex: 10:30 ou -05:15/);
    
    // Reajuste positivo
    await user.type(horasInput, '05:30');

    await waitFor(() => {
      expect(screen.getByText('Preview do Impacto')).toBeInTheDocument();
      expect(screen.getByText('Reajuste Positivo')).toBeInTheDocument();
    });
  });

  it('deve exibir preview do impacto para reajuste negativo', async () => {
    const user = userEvent.setup();
    renderModal();

    const horasInput = screen.getByPlaceholderText(/Ex: 10:30 ou -05:15/);
    
    // Reajuste negativo
    await user.type(horasInput, '-03:15');

    await waitFor(() => {
      expect(screen.getByText('Preview do Impacto')).toBeInTheDocument();
      expect(screen.getByText('Reajuste Negativo')).toBeInTheDocument();
    });
  });

  it('deve exibir badge verde para reajuste positivo', async () => {
    const user = userEvent.setup();
    renderModal();

    const horasInput = screen.getByPlaceholderText(/Ex: 10:30 ou -05:15/);
    await user.type(horasInput, '02:00');

    await waitFor(() => {
      const badge = screen.getByText('Reajuste Positivo');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-green-100');
      expect(badge.className).toContain('text-green-800');
    });
  });

  it('deve exibir badge vermelho para reajuste negativo', async () => {
    const user = userEvent.setup();
    renderModal();

    const horasInput = screen.getByPlaceholderText(/Ex: 10:30 ou -05:15/);
    await user.type(horasInput, '-02:00');

    await waitFor(() => {
      const badge = screen.getByText('Reajuste Negativo');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-red-100');
      expect(badge.className).toContain('text-red-800');
    });
  });

  it('deve exigir pelo menos um valor (horas ou tickets)', async () => {
    const user = userEvent.setup();
    renderModal();

    const observacaoInput = screen.getByPlaceholderText(/Descreva o motivo do reajuste/);
    await user.type(observacaoInput, 'Observação válida com mais de 10 caracteres');

    const submitButton = screen.getByRole('button', { name: /Aplicar Reajuste/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Informe pelo menos um valor de reajuste/)).toBeInTheDocument();
    });
  });

  it('deve exibir contador de caracteres da observação', async () => {
    const user = userEvent.setup();
    renderModal();

    const observacaoInput = screen.getByPlaceholderText(/Descreva o motivo do reajuste/);
    
    expect(screen.getByText('0/1000 caracteres (mínimo 10)')).toBeInTheDocument();
    
    await user.type(observacaoInput, 'Teste');
    
    await waitFor(() => {
      expect(screen.getByText('5/1000 caracteres (mínimo 10)')).toBeInTheDocument();
    });
  });

  it('deve fechar o modal ao clicar em Cancelar', async () => {
    const user = userEvent.setup();
    renderModal();

    const cancelButton = screen.getByRole('button', { name: /Cancelar/ });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('não deve renderizar quando open=false', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ModalReajuste
          open={false}
          onClose={mockOnClose}
          empresaId="empresa-1"
          mes={3}
          ano={2024}
          onSuccess={mockOnSuccess}
        />
      </QueryClientProvider>
    );

    expect(screen.queryByText('Criar Reajuste Manual')).not.toBeInTheDocument();
  });

  it('deve calcular preview corretamente para reajuste positivo', async () => {
    const user = userEvent.setup();
    renderModal();

    const horasInput = screen.getByPlaceholderText(/Ex: 10:30 ou -05:15/);
    await user.type(horasInput, '05:00');

    await waitFor(() => {
      // Saldo atual: 10:30 (630 minutos)
      // Reajuste: +05:00 (300 minutos)
      // Novo saldo: 15:30 (930 minutos)
      expect(screen.getByText('10:30')).toBeInTheDocument(); // Saldo atual
      expect(screen.getByText('+05:00')).toBeInTheDocument(); // Reajuste
      expect(screen.getByText('15:30')).toBeInTheDocument(); // Novo saldo
    });
  });

  it('deve calcular preview corretamente para reajuste negativo', async () => {
    const user = userEvent.setup();
    renderModal();

    const horasInput = screen.getByPlaceholderText(/Ex: 10:30 ou -05:15/);
    await user.type(horasInput, '-03:00');

    await waitFor(() => {
      // Saldo atual: 10:30 (630 minutos)
      // Reajuste: -03:00 (-180 minutos)
      // Novo saldo: 07:30 (450 minutos)
      expect(screen.getByText('10:30')).toBeInTheDocument(); // Saldo atual
      expect(screen.getByText('-03:00')).toBeInTheDocument(); // Reajuste
      expect(screen.getByText('07:30')).toBeInTheDocument(); // Novo saldo
    });
  });
});
