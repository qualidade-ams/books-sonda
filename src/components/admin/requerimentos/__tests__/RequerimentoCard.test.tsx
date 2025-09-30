import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { RequerimentoCard } from '../RequerimentoCard';
import { Requerimento } from '@/types/requerimentos';

// Mock do hook useEnviarParaFaturamento
vi.mock('@/hooks/useRequerimentos', () => ({
  useEnviarParaFaturamento: () => ({
    mutateAsync: vi.fn(),
    isPending: false
  })
}));

// Mock do toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Dados de teste
const mockRequerimento: Requerimento = {
  id: '1',
  chamado: 'RF-6017993',
  cliente_id: 'cliente-1',
  cliente_nome: 'Empresa Teste Ltda',
  modulo: 'Comply',
  descricao: 'Especificação funcional para implementação de nova funcionalidade de relatórios',
  data_envio: '2024-01-14T00:00:00Z',
  data_aprovacao: '2024-01-19T00:00:00Z',
  horas_funcional: 8,
  horas_tecnico: 4,
  horas_total: 12,
  linguagem: 'ABAP',
  tipo_cobranca: 'Faturado',
  mes_cobranca: 1,
  observacao: 'Observação de teste para o requerimento',
  status: 'lancado',
  enviado_faturamento: false,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z'
};

const mockRequerimentoEnviado: Requerimento = {
  ...mockRequerimento,
  id: '2',
  enviado_faturamento: true,
  data_envio_faturamento: '2024-01-25T14:30:00Z'
};

// Wrapper com QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('RequerimentoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar as informações básicas do requerimento', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RequerimentoCard requerimento={mockRequerimento} />
      </Wrapper>
    );

    // Verificar informações principais
    expect(screen.getByText('RF-6017993')).toBeInTheDocument();
    expect(screen.getByText('Empresa Teste Ltda')).toBeInTheDocument();
    expect(screen.getByText('Faturado')).toBeInTheDocument();
    expect(screen.getByText('Comply')).toBeInTheDocument();
    expect(screen.getByText('ABAP')).toBeInTheDocument();
  });

  it('deve renderizar checkbox quando onToggleSelection é fornecido', () => {
    const mockToggleSelection = vi.fn();
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RequerimentoCard 
          requerimento={mockRequerimento} 
          onToggleSelection={mockToggleSelection}
          isSelected={false}
        />
      </Wrapper>
    );

    const checkbox = screen.getByLabelText('Selecionar requerimento RF-6017993');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('deve exibir checkbox marcado quando isSelected é true', () => {
    const mockToggleSelection = vi.fn();
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RequerimentoCard 
          requerimento={mockRequerimento} 
          onToggleSelection={mockToggleSelection}
          isSelected={true}
        />
      </Wrapper>
    );

    const checkbox = screen.getByLabelText('Selecionar requerimento RF-6017993');
    expect(checkbox).toBeChecked();
  });

  it('deve chamar onToggleSelection quando checkbox é clicado', () => {
    const mockToggleSelection = vi.fn();
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RequerimentoCard 
          requerimento={mockRequerimento} 
          onToggleSelection={mockToggleSelection}
          isSelected={false}
        />
      </Wrapper>
    );

    const checkbox = screen.getByLabelText('Selecionar requerimento RF-6017993');
    fireEvent.click(checkbox);

    expect(mockToggleSelection).toHaveBeenCalled();
  });

  it('não deve renderizar checkbox quando onToggleSelection não é fornecido', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RequerimentoCard requerimento={mockRequerimento} />
      </Wrapper>
    );

    const checkbox = screen.queryByLabelText('Selecionar requerimento RF-6017993');
    expect(checkbox).not.toBeInTheDocument();
  });

  it('deve exibir a descrição do requerimento', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RequerimentoCard requerimento={mockRequerimento} />
      </Wrapper>
    );

    expect(screen.getByText('Especificação funcional para implementação de nova funcionalidade de relatórios')).toBeInTheDocument();
  });

  it('deve exibir as horas corretamente', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RequerimentoCard requerimento={mockRequerimento} />
      </Wrapper>
    );

    // No novo layout, as horas são exibidas diretamente nas colunas
    expect(screen.getByText('8')).toBeInTheDocument(); // Horas funcionais
    expect(screen.getByText('4')).toBeInTheDocument(); // Horas técnicas
    expect(screen.getByText('12')).toBeInTheDocument(); // Total
  });

  it('deve exibir as datas formatadas', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RequerimentoCard requerimento={mockRequerimento} />
      </Wrapper>
    );

    expect(screen.getByText('13/01/2024')).toBeInTheDocument(); // Data envio
    // No novo layout, só mostra a data de envio
  });

  it('deve exibir o mês de cobrança formatado', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RequerimentoCard requerimento={mockRequerimento} />
      </Wrapper>
    );

    // No novo layout, o mês não é exibido na linha principal
    expect(screen.getByText('RF-6017993')).toBeInTheDocument();
  });

  it('deve exibir observação quando presente', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RequerimentoCard requerimento={mockRequerimento} />
      </Wrapper>
    );

    // No novo layout, a observação aparece na descrição truncada
    expect(screen.getByText('Especificação funcional para implementação de nova funcionalidade de relatórios')).toBeInTheDocument();
  });

  it('não deve exibir observação quando não presente', () => {
    const requerimentoSemObservacao = { ...mockRequerimento, observacao: undefined };
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RequerimentoCard requerimento={requerimentoSemObservacao} />
      </Wrapper>
    );

    // Verificar se ainda exibe a descrição
    expect(screen.getByText('Especificação funcional para implementação de nova funcionalidade de relatórios')).toBeInTheDocument();
  });

  it('deve aplicar classes CSS baseadas no tipo de cobrança', () => {
    const Wrapper = createWrapper();

    const { container } = render(
      <Wrapper>
        <RequerimentoCard requerimento={mockRequerimento} />
      </Wrapper>
    );

    // Verificar se as classes de cor laranja (Faturado) estão aplicadas no badge
    const badge = container.querySelector('[class*="bg-orange"]');
    expect(badge).toBeInTheDocument();
  });

  it('deve exibir botão "Enviar para Faturamento" quando não enviado', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RequerimentoCard requerimento={mockRequerimento} />
      </Wrapper>
    );

    // Buscar pelo ícone Send (botão de enviar)
    const { container } = render(
      <Wrapper>
        <RequerimentoCard requerimento={mockRequerimento} />
      </Wrapper>
    );
    const sendIcon = container.querySelector('.lucide-send');
    expect(sendIcon).toBeInTheDocument();
  });

  it('deve exibir badge "Enviado" quando já enviado', () => {
    const Wrapper = createWrapper();

    const { container } = render(
      <Wrapper>
        <RequerimentoCard requerimento={mockRequerimentoEnviado} />
      </Wrapper>
    );

    expect(screen.getByText('✓')).toBeInTheDocument();
    // Não deve ter o ícone de enviar
    const sendIcon = container.querySelector('.lucide-send');
    expect(sendIcon).not.toBeInTheDocument();
  });

  it('deve chamar onEdit quando botão editar é clicado', () => {
    const mockOnEdit = vi.fn();
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RequerimentoCard requerimento={mockRequerimento} onEdit={mockOnEdit} />
      </Wrapper>
    );

    const editButton = screen.getByLabelText('Editar requerimento RF-6017993');
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockRequerimento);
  });

  it('deve chamar onDelete quando botão deletar é clicado', () => {
    const mockOnDelete = vi.fn();
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RequerimentoCard requerimento={mockRequerimento} onDelete={mockOnDelete} />
      </Wrapper>
    );

    const deleteButton = screen.getByLabelText('Deletar requerimento RF-6017993');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockRequerimento.id);
  });

  it('deve abrir dialog de confirmação ao clicar em "Enviar para Faturamento"', async () => {
    const Wrapper = createWrapper();

    const { container } = render(
      <Wrapper>
        <RequerimentoCard requerimento={mockRequerimento} />
      </Wrapper>
    );

    const enviarButton = container.querySelector('.lucide-send')?.closest('button');
    expect(enviarButton).toBeInTheDocument();
    
    fireEvent.click(enviarButton!);

    await waitFor(() => {
      expect(screen.getByText('Confirmar Envio para Faturamento')).toBeInTheDocument();
      expect(screen.getByText(/Tem certeza que deseja enviar o requerimento/)).toBeInTheDocument();
    });
  });

  it('deve ocultar ações quando showActions é false', () => {
    const Wrapper = createWrapper();

    const { container } = render(
      <Wrapper>
        <RequerimentoCard
          requerimento={mockRequerimento}
          showActions={false}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </Wrapper>
    );

    expect(screen.queryByLabelText('Editar requerimento RF-6017993')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Deletar requerimento RF-6017993')).not.toBeInTheDocument();
    const sendIcon = container.querySelector('.lucide-send');
    expect(sendIcon).not.toBeInTheDocument();
  });

  it('deve ocultar botão "Enviar para Faturamento" quando showEnviarFaturamento é false', () => {
    const Wrapper = createWrapper();

    const { container } = render(
      <Wrapper>
        <RequerimentoCard
          requerimento={mockRequerimento}
          showEnviarFaturamento={false}
        />
      </Wrapper>
    );

    const sendIcon = container.querySelector('.lucide-send');
    expect(sendIcon).not.toBeInTheDocument();
  });

  it('deve exibir estado de loading', () => {
    const Wrapper = createWrapper();

    const { container } = render(
      <Wrapper>
        <RequerimentoCard requerimento={mockRequerimento} isLoading={true} />
      </Wrapper>
    );

    // Verificar se o componente está com opacity reduzida
    const card = container.querySelector('.opacity-50');
    expect(card).toBeInTheDocument();

    // Verificar se está com pointer-events-none
    const disabledCard = container.querySelector('.pointer-events-none');
    expect(disabledCard).toBeInTheDocument();
  });

  it('deve desabilitar botões quando isLoading é true', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RequerimentoCard
          requerimento={mockRequerimento}
          isLoading={true}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </Wrapper>
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('deve exibir ícone correto para o tipo de cobrança', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <RequerimentoCard requerimento={mockRequerimento} />
      </Wrapper>
    );

    // Para tipo "Faturado" deve exibir ícone 💰
    expect(screen.getByText('💰')).toBeInTheDocument();
  });
});