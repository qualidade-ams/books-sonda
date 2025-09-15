import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBookTemplates } from '../useBookTemplates';

// Mock do hook useEmailTemplates
vi.mock('../useEmailTemplates', () => ({
  useEmailTemplates: () => ({
    templates: [
      {
        id: 'template-1',
        nome: 'Template Book Mensal',
        assunto: 'Book Mensal - {{empresa}}',
        corpo: '<p>Conteúdo do template mensal</p>',
        descricao: 'Template para books mensais',
        ativo: true,
        formulario: 'book',
        modalidade: 'mensal'
      },
      {
        id: 'template-2',
        nome: 'Template Book Semanal',
        assunto: 'Book Semanal - {{empresa}}',
        corpo: '<p>Conteúdo do template semanal</p>',
        descricao: 'Template para books semanais',
        ativo: true,
        formulario: 'book',
        modalidade: 'semanal'
      },
      {
        id: 'template-3',
        nome: 'Template Inativo',
        assunto: 'Template Inativo',
        corpo: '<p>Template inativo</p>',
        descricao: 'Template desativado',
        ativo: false,
        formulario: 'book',
        modalidade: null
      },
      {
        id: 'template-4',
        nome: 'Template Outro Formulário',
        assunto: 'Outro formulário',
        corpo: '<p>Template para outro formulário</p>',
        descricao: 'Template para outro tipo de formulário',
        ativo: true,
        formulario: 'orcamento',
        modalidade: null
      }
    ],
    loading: false
  })
}));

describe('useBookTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar templates padrão e personalizados', () => {
    const { result } = renderHook(() => useBookTemplates());

    expect(result.current.bookTemplateOptions).toHaveLength(4); // 2 padrão + 2 personalizados ativos para book
    
    // Verificar templates padrão
    const defaultTemplates = result.current.getDefaultTemplates();
    expect(defaultTemplates).toHaveLength(2);
    expect(defaultTemplates[0].value).toBe('portugues');
    expect(defaultTemplates[1].value).toBe('ingles');
    
    // Verificar templates personalizados
    const customTemplates = result.current.getCustomTemplates();
    expect(customTemplates).toHaveLength(2);
    expect(customTemplates[0].value).toBe('template-1');
    expect(customTemplates[1].value).toBe('template-2');
  });

  it('deve filtrar apenas templates ativos e do formulário book', () => {
    const { result } = renderHook(() => useBookTemplates());

    const customTemplates = result.current.getCustomTemplates();
    
    // Não deve incluir template inativo
    expect(customTemplates.find(t => t.value === 'template-3')).toBeUndefined();
    
    // Não deve incluir template de outro formulário
    expect(customTemplates.find(t => t.value === 'template-4')).toBeUndefined();
    
    // Deve incluir apenas os templates ativos do formulário book
    expect(customTemplates).toHaveLength(2);
    expect(customTemplates.map(t => t.value)).toEqual(['template-1', 'template-2']);
  });

  it('deve identificar corretamente templates padrão', () => {
    const { result } = renderHook(() => useBookTemplates());

    expect(result.current.isDefaultTemplate('portugues')).toBe(true);
    expect(result.current.isDefaultTemplate('ingles')).toBe(true);
    expect(result.current.isDefaultTemplate('template-1')).toBe(false);
    expect(result.current.isDefaultTemplate('template-inexistente')).toBe(false);
  });

  it('deve buscar template por ID corretamente', () => {
    const { result } = renderHook(() => useBookTemplates());

    // Template padrão
    const templatePt = result.current.getTemplateById('portugues');
    expect(templatePt).toBeDefined();
    expect(templatePt?.label).toBe('Português (Padrão)');
    expect(templatePt?.isDefault).toBe(true);

    // Template personalizado
    const templateCustom = result.current.getTemplateById('template-1');
    expect(templateCustom).toBeDefined();
    expect(templateCustom?.label).toBe('Template Book Mensal');
    expect(templateCustom?.isDefault).toBe(false);

    // Template inexistente
    const templateInexistente = result.current.getTemplateById('inexistente');
    expect(templateInexistente).toBeNull();
  });

  it('deve retornar apenas templates padrão quando solicitado', () => {
    const { result } = renderHook(() => useBookTemplates());

    const defaultTemplates = result.current.getDefaultTemplates();
    
    expect(defaultTemplates).toHaveLength(2);
    expect(defaultTemplates.every(t => t.isDefault)).toBe(true);
    expect(defaultTemplates.map(t => t.value)).toEqual(['portugues', 'ingles']);
  });

  it('deve retornar apenas templates personalizados quando solicitado', () => {
    const { result } = renderHook(() => useBookTemplates());

    const customTemplates = result.current.getCustomTemplates();
    
    expect(customTemplates).toHaveLength(2);
    expect(customTemplates.every(t => !t.isDefault)).toBe(true);
    expect(customTemplates.map(t => t.value)).toEqual(['template-1', 'template-2']);
  });

  it('deve incluir descrições corretas nos templates', () => {
    const { result } = renderHook(() => useBookTemplates());

    const templatePt = result.current.getTemplateById('portugues');
    expect(templatePt?.description).toBe('Template padrão em português');

    const templateCustom = result.current.getTemplateById('template-1');
    expect(templateCustom?.description).toBe('Template para books mensais');
  });
});