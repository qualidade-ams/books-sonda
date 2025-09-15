import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TemplatePreview from '../TemplatePreview';

// Mock dos hooks
vi.mock('@/hooks/useBookTemplates', () => ({
  useBookTemplates: () => ({
    getTemplateById: vi.fn((id: string) => {
      if (id === 'portugues') {
        return {
          value: 'portugues',
          label: 'Português (Padrão)',
          description: 'Template padrão em português',
          isDefault: true
        };
      }
      if (id === 'custom-template-id') {
        return {
          value: 'custom-template-id',
          label: 'Template Personalizado',
          description: 'Template personalizado para books',
          isDefault: false
        };
      }
      return null;
    }),
    isDefaultTemplate: vi.fn((id: string) => ['portugues', 'ingles'].includes(id))
  })
}));

vi.mock('@/hooks/useEmailTemplates', () => ({
  useEmailTemplates: () => ({
    templates: [
      {
        id: 'custom-template-id',
        nome: 'Template Personalizado',
        assunto: 'Assunto do Template Personalizado',
        corpo: '<p>Conteúdo do template personalizado para teste</p>',
        descricao: 'Template personalizado para books',
        ativo: true,
        formulario: 'book',
        modalidade: 'mensal'
      }
    ]
  })
}));

describe('TemplatePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar template padrão corretamente', () => {
    render(<TemplatePreview templateId="portugues" />);
    
    expect(screen.getByText('Template Selecionado')).toBeInTheDocument();
    expect(screen.getByText('Português (Padrão)')).toBeInTheDocument();
    expect(screen.getByText('Template padrão em português')).toBeInTheDocument();
    expect(screen.getByText('Padrão')).toBeInTheDocument();
  });

  it('deve renderizar template personalizado corretamente', () => {
    render(<TemplatePreview templateId="custom-template-id" />);
    
    expect(screen.getByText('Template Selecionado')).toBeInTheDocument();
    expect(screen.getByText('Template Personalizado')).toBeInTheDocument();
    expect(screen.getByText('Template personalizado para books')).toBeInTheDocument();
    expect(screen.getByText('Personalizado')).toBeInTheDocument();
    expect(screen.getByText('Assunto:')).toBeInTheDocument();
    expect(screen.getByText('Assunto do Template Personalizado')).toBeInTheDocument();
    expect(screen.getByText('Prévia do conteúdo:')).toBeInTheDocument();
    expect(screen.getByText('Modalidade:')).toBeInTheDocument();
    expect(screen.getByText('mensal')).toBeInTheDocument();
  });

  it('não deve renderizar nada quando template não existe', () => {
    const { container } = render(<TemplatePreview templateId="template-inexistente" />);
    
    expect(container.firstChild).toBeNull();
  });

  it('deve mostrar erro quando template personalizado não é encontrado', () => {
    // Mock para simular template option encontrado mas template completo não encontrado
    vi.mocked(require('@/hooks/useBookTemplates').useBookTemplates).mockReturnValue({
      getTemplateById: vi.fn(() => ({
        value: 'template-perdido',
        label: 'Template Perdido',
        description: 'Template que não existe mais',
        isDefault: false
      })),
      isDefaultTemplate: vi.fn(() => false)
    });

    vi.mocked(require('@/hooks/useEmailTemplates').useEmailTemplates).mockReturnValue({
      templates: [] // Nenhum template encontrado
    });

    render(<TemplatePreview templateId="template-perdido" />);
    
    expect(screen.getByText('Template não encontrado')).toBeInTheDocument();
  });

  it('deve aplicar className personalizada', () => {
    const { container } = render(
      <TemplatePreview templateId="portugues" className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});