import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RequerimentoForm } from '../RequerimentoForm';
import { RequerimentoFormData, Requerimento } from '@/types/requerimentos';
import React, { ReactNode } from 'react';

// Mock do hook useClientesRequerimentos
vi.mock('@/hooks/useRequerimentos', () => ({
  useClientesRequerimentos: vi.fn(() => ({
    data: [
      { id: '1', nome_completo: 'Cliente Teste 1' },
      { id: '2', nome_completo: 'Cliente Teste 2' }
    ],
    isLoading: false
  }))
}));

// Mock do date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') {
      return '2024-01-15';
    }
    return '15/01/2024';
  })
}));

// Mock do date-fns/locale
vi.mock('date-fns/locale', () => ({
  ptBR: {}
}));

describe('RequerimentoForm', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;
  let mockOnSubmit: vi.MockedFunction<(data: RequerimentoFormData) => Promise<void>>;
  let mockOnCancel: vi.MockedFunction<() => void>;

  const mockRequerimento: Requerimento = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    chamado: 'RF-6017993',
    cliente_id: '1',
    cliente_nome: 'Cliente Teste 1',
    modulo: 'Comply',
    descricao: 'Descrição do requerimento de teste',
    data_envio: '2024-01-15',
    data_aprovacao: '2024-01-16',
    horas_funcional: 10,
    horas_tecnico: 5,
    horas_total: 15,
    linguagem: 'Funcional',
    tipo_cobranca: 'Faturado',
    mes_cobranca: 1,
    observacao: 'Observação de teste',
    status: 'lancado',
    enviado_faturamento: false,
    data_envio_faturamento: null,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }: { children: ReactNode }) => 
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    mockOnCancel = vi.fn();

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
    vi.resetAllMocks();
  });

  describe('Renderização', () => {
    it('deve renderizar formulário de novo requerimento', () => {
      render(
        <RequerimentoForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
        { wrapper }
      );

      expect(screen.getByText('Novo Requerimento')).toBeInTheDocument();
      expect(screen.getByLabelText(/chamado/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument();
      expect(screen.getByText('Criar Requerimento')).toBeInTheDocument();
    });

    it('deve renderizar formulário de edição com dados preenchidos', () => {
      render(
        <RequerimentoForm
          requerimento={mockRequerimento}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
        { wrapper }
      );

      expect(screen.getByText('Editar Requerimento')).toBeInTheDocument();
      expect(screen.getByDisplayValue('RF-6017993')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Descrição do requerimento de teste')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10.5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Observação de teste')).toBeInTheDocument();
      expect(screen.getByText('Atualizar')).toBeInTheDocument();
    });

    it('deve calcular horas total automaticamente', async () => {
      const user = userEvent.setup();

      render(
        <RequerimentoForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
        { wrapper }
      );

      const horasFuncionalInput = screen.getByLabelText(/horas funcionais/i);
      const horasTecnicoInput = screen.getByLabelText(/horas técnicas/i);

      await user.clear(horasFuncionalInput);
      await user.type(horasTecnicoInput, '5');

      await waitFor(() => {
        expect(screen.getByText('5.00h')).toBeInTheDocument();
      });
    });
  });

  describe('Validação', () => {
    it('deve renderizar campos obrigatórios', () => {
      render(
        <RequerimentoForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
        { wrapper }
      );

      // Verificar se campos obrigatórios estão presentes
      expect(screen.getByLabelText(/chamado/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/horas funcionais/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/horas técnicas/i)).toBeInTheDocument();
    });

    it('deve ter placeholders corretos', () => {
      render(
        <RequerimentoForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
        { wrapper }
      );

      const chamadoInput = screen.getByLabelText(/chamado/i);
      expect(chamadoInput).toHaveAttribute('placeholder', 'Ex: RF-6017993');

      const descricaoInput = screen.getByLabelText(/descrição/i);
      expect(descricaoInput).toHaveAttribute('placeholder', 'Descreva o requerimento...');
    });
  });

  describe('Interações', () => {
    it('deve chamar onCancel quando botão cancelar é clicado', async () => {
      const user = userEvent.setup();

      render(
        <RequerimentoForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
        { wrapper }
      );

      const cancelButton = screen.getByText('Cancelar');
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('deve ter classe uppercase no campo chamado', () => {
      render(
        <RequerimentoForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
        { wrapper }
      );

      const chamadoInput = screen.getByLabelText(/chamado/i);
      expect(chamadoInput).toHaveClass('uppercase');
    });
  });

  describe('Seleções', () => {
    it('deve renderizar selects necessários', () => {
      render(
        <RequerimentoForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
        { wrapper }
      );

      // Verificar se os selects estão presentes
      expect(screen.getByRole('combobox', { name: /cliente/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /módulo/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /linguagem/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /tipo de cobrança/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /mês de cobrança/i })).toBeInTheDocument();
    });
  });

  describe('Estados de carregamento', () => {
    it('deve renderizar formulário com estado de loading', () => {
      render(
        <RequerimentoForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={true}
        />,
        { wrapper }
      );

      expect(screen.getByText('Salvando...')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeDisabled();
    });

    it('deve renderizar formulário sem loading', () => {
      render(
        <RequerimentoForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={false}
        />,
        { wrapper }
      );

      expect(screen.getByText('Criar Requerimento')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).not.toBeDisabled();
    });
  });
});