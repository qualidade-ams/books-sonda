import { describe, it, expect } from 'vitest';
import {
  COBRANCA_COLORS,
  getCobrancaColors,
  getCardClasses,
  getBadgeClasses,
  getButtonClasses,
  getInputFocusClasses,
  getHexColor,
  getAllColors,
  isValidTipoCobranca,
  getTextContrast,
  getCobrancaIcon,
  COBRANCA_COLOR_CLASSES
} from '../requerimentosColors';
import { TipoCobrancaType } from '@/types/requerimentos';

describe('requerimentosColors', () => {
  const allTiposCobranca: TipoCobrancaType[] = [
    'Banco de Horas',
    'Cobro Interno',
    'Contrato',
    'Faturado',
    'Hora Extra',
    'Sobreaviso',
    'Reprovado',
    'Bolsão Enel'
  ];

  describe('COBRANCA_COLORS', () => {
    it('deve conter cores para todos os tipos de cobrança', () => {
      allTiposCobranca.forEach(tipo => {
        expect(COBRANCA_COLORS[tipo]).toBeDefined();
        expect(COBRANCA_COLORS[tipo]).toHaveProperty('bg');
        expect(COBRANCA_COLORS[tipo]).toHaveProperty('border');
        expect(COBRANCA_COLORS[tipo]).toHaveProperty('text');
        expect(COBRANCA_COLORS[tipo]).toHaveProperty('badge');
        expect(COBRANCA_COLORS[tipo]).toHaveProperty('hover');
        expect(COBRANCA_COLORS[tipo]).toHaveProperty('ring');
      });
    });

    it('deve ter cores específicas para cada tipo', () => {
      expect(COBRANCA_COLORS['Banco de Horas'].bg).toBe('bg-blue-50');
      expect(COBRANCA_COLORS['Banco de Horas'].badge).toBe('bg-blue-500');
      
      expect(COBRANCA_COLORS['Cobro Interno'].bg).toBe('bg-green-50');
      expect(COBRANCA_COLORS['Cobro Interno'].badge).toBe('bg-green-500');
      
      expect(COBRANCA_COLORS['Contrato'].bg).toBe('bg-gray-50');
      expect(COBRANCA_COLORS['Contrato'].badge).toBe('bg-gray-500');
      
      expect(COBRANCA_COLORS['Faturado'].bg).toBe('bg-orange-50');
      expect(COBRANCA_COLORS['Faturado'].badge).toBe('bg-orange-500');
      
      expect(COBRANCA_COLORS['Hora Extra'].bg).toBe('bg-red-50');
      expect(COBRANCA_COLORS['Hora Extra'].badge).toBe('bg-red-500');
      
      expect(COBRANCA_COLORS['Sobreaviso'].bg).toBe('bg-purple-50');
      expect(COBRANCA_COLORS['Sobreaviso'].badge).toBe('bg-purple-500');
      
      expect(COBRANCA_COLORS['Reprovado'].bg).toBe('bg-slate-50');
      expect(COBRANCA_COLORS['Reprovado'].badge).toBe('bg-slate-500');
      
      expect(COBRANCA_COLORS['Bolsão Enel'].bg).toBe('bg-yellow-50');
      expect(COBRANCA_COLORS['Bolsão Enel'].badge).toBe('bg-yellow-500');
    });

    it('deve ter estrutura consistente para todas as cores', () => {
      allTiposCobranca.forEach(tipo => {
        const colors = COBRANCA_COLORS[tipo];
        
        expect(colors.bg).toMatch(/^bg-\w+-\d+$/);
        expect(colors.border).toMatch(/^border-\w+-\d+$/);
        expect(colors.text).toMatch(/^text-\w+-\d+$/);
        expect(colors.badge).toMatch(/^bg-\w+-\d+$/);
        expect(colors.hover).toMatch(/^hover:bg-\w+-\d+$/);
        expect(colors.ring).toMatch(/^ring-\w+-\d+$/);
      });
    });
  });

  describe('getCobrancaColors', () => {
    it('deve retornar cores corretas para cada tipo', () => {
      allTiposCobranca.forEach(tipo => {
        const colors = getCobrancaColors(tipo);
        expect(colors).toEqual(COBRANCA_COLORS[tipo]);
      });
    });

    it('deve retornar objeto com todas as propriedades necessárias', () => {
      const colors = getCobrancaColors('Faturado');
      
      expect(colors).toHaveProperty('bg');
      expect(colors).toHaveProperty('border');
      expect(colors).toHaveProperty('text');
      expect(colors).toHaveProperty('badge');
      expect(colors).toHaveProperty('hover');
      expect(colors).toHaveProperty('ring');
    });
  });

  describe('getCardClasses', () => {
    it('deve retornar classes CSS completas para card', () => {
      const classes = getCardClasses('Faturado');
      
      expect(classes).toContain('bg-orange-50');
      expect(classes).toContain('border-orange-200');
      expect(classes).toContain('text-orange-800');
      expect(classes).toContain('hover:bg-orange-100');
      expect(classes).toContain('border-2');
      expect(classes).toContain('rounded-lg');
      expect(classes).toContain('transition-colors');
      expect(classes).toContain('duration-200');
    });

    it('deve gerar classes diferentes para tipos diferentes', () => {
      const classesFaturado = getCardClasses('Faturado');
      const classesBancoHoras = getCardClasses('Banco de Horas');
      
      expect(classesFaturado).not.toBe(classesBancoHoras);
      expect(classesFaturado).toContain('orange');
      expect(classesBancoHoras).toContain('blue');
    });
  });

  describe('getBadgeClasses', () => {
    it('deve retornar classes CSS para badge', () => {
      const classes = getBadgeClasses('Faturado');
      
      expect(classes).toContain('bg-orange-500');
      expect(classes).toContain('text-white');
      expect(classes).toContain('px-2');
      expect(classes).toContain('py-1');
      expect(classes).toContain('rounded-full');
      expect(classes).toContain('text-xs');
      expect(classes).toContain('font-medium');
    });

    it('deve gerar classes diferentes para tipos diferentes', () => {
      const classesFaturado = getBadgeClasses('Faturado');
      const classesBancoHoras = getBadgeClasses('Banco de Horas');
      
      expect(classesFaturado).not.toBe(classesBancoHoras);
      expect(classesFaturado).toContain('orange-500');
      expect(classesBancoHoras).toContain('blue-500');
    });
  });

  describe('getButtonClasses', () => {
    it('deve retornar classes para botão primário por padrão', () => {
      const classes = getButtonClasses('Faturado');
      
      expect(classes).toContain('bg-orange-500');
      expect(classes).toContain('hover:opacity-90');
      expect(classes).toContain('text-white');
      expect(classes).toContain('px-4');
      expect(classes).toContain('py-2');
      expect(classes).toContain('rounded-md');
      expect(classes).toContain('font-medium');
      expect(classes).toContain('transition-opacity');
    });

    it('deve retornar classes para botão secundário', () => {
      const classes = getButtonClasses('Faturado', 'secondary');
      
      expect(classes).toContain('bg-orange-50');
      expect(classes).toContain('border-orange-200');
      expect(classes).toContain('text-orange-800');
      expect(classes).toContain('hover:bg-orange-100');
      expect(classes).toContain('border');
      expect(classes).toContain('px-4');
      expect(classes).toContain('py-2');
      expect(classes).toContain('rounded-md');
      expect(classes).toContain('font-medium');
      expect(classes).toContain('transition-colors');
    });

    it('deve gerar classes diferentes para variantes diferentes', () => {
      const classesPrimary = getButtonClasses('Faturado', 'primary');
      const classesSecondary = getButtonClasses('Faturado', 'secondary');
      
      expect(classesPrimary).not.toBe(classesSecondary);
      expect(classesPrimary).toContain('bg-orange-500');
      expect(classesSecondary).toContain('bg-orange-50');
    });
  });

  describe('getInputFocusClasses', () => {
    it('deve retornar classes CSS para focus de input', () => {
      const classes = getInputFocusClasses('Faturado');
      
      expect(classes).toContain('focus:ring-orange-200');
      expect(classes).toContain('focus:ring-2');
      expect(classes).toContain('focus:ring-opacity-50');
    });

    it('deve gerar classes diferentes para tipos diferentes', () => {
      const classesFaturado = getInputFocusClasses('Faturado');
      const classesBancoHoras = getInputFocusClasses('Banco de Horas');
      
      expect(classesFaturado).not.toBe(classesBancoHoras);
      expect(classesFaturado).toContain('orange');
      expect(classesBancoHoras).toContain('blue');
    });
  });

  describe('getHexColor', () => {
    it('deve retornar cores hexadecimais válidas', () => {
      allTiposCobranca.forEach(tipo => {
        const hexColor = getHexColor(tipo);
        expect(hexColor).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('deve retornar cores específicas para cada tipo', () => {
      expect(getHexColor('Banco de Horas')).toBe('#3B82F6'); // blue-500
      expect(getHexColor('Cobro Interno')).toBe('#10B981'); // green-500
      expect(getHexColor('Contrato')).toBe('#6B7280'); // gray-500
      expect(getHexColor('Faturado')).toBe('#F59E0B'); // orange-500
      expect(getHexColor('Hora Extra')).toBe('#EF4444'); // red-500
      expect(getHexColor('Sobreaviso')).toBe('#8B5CF6'); // purple-500
      expect(getHexColor('Reprovado')).toBe('#64748B'); // slate-500
      expect(getHexColor('Bolsão Enel')).toBe('#EAB308'); // yellow-500
    });
  });

  describe('getAllColors', () => {
    it('deve retornar array com todos os tipos e suas cores', () => {
      const allColors = getAllColors();
      
      expect(allColors).toHaveLength(8);
      expect(allColors.every(item => 
        typeof item.tipo === 'string' && 
        typeof item.color === 'string' &&
        item.color.match(/^#[0-9A-F]{6}$/i)
      )).toBe(true);
    });

    it('deve incluir todos os tipos de cobrança', () => {
      const allColors = getAllColors();
      const tipos = allColors.map(item => item.tipo);
      
      allTiposCobranca.forEach(tipo => {
        expect(tipos).toContain(tipo);
      });
    });

    it('deve ter cores únicas para cada tipo', () => {
      const allColors = getAllColors();
      const cores = allColors.map(item => item.color);
      const coresUnicas = [...new Set(cores)];
      
      expect(cores).toHaveLength(coresUnicas.length);
    });
  });

  describe('isValidTipoCobranca', () => {
    it('deve validar tipos de cobrança válidos', () => {
      allTiposCobranca.forEach(tipo => {
        expect(isValidTipoCobranca(tipo)).toBe(true);
      });
    });

    it('deve rejeitar tipos de cobrança inválidos', () => {
      const tiposInvalidos = [
        'TipoInvalido',
        'Banco',
        'Faturamento',
        '',
        null,
        undefined
      ];

      tiposInvalidos.forEach(tipo => {
        expect(isValidTipoCobranca(tipo as any)).toBe(false);
      });
    });
  });

  describe('getTextContrast', () => {
    it('deve retornar contraste correto para cada tipo', () => {
      // A maioria dos tipos deve ter contraste escuro
      const tiposContrasteDark = [
        'Banco de Horas',
        'Cobro Interno',
        'Contrato',
        'Faturado',
        'Hora Extra',
        'Sobreaviso',
        'Bolsão Enel'
      ];

      tiposContrasteDark.forEach(tipo => {
        expect(getTextContrast(tipo as TipoCobrancaType)).toBe('dark');
      });

      // Apenas "Reprovado" deve ter contraste claro
      expect(getTextContrast('Reprovado')).toBe('light');
    });
  });

  describe('getCobrancaIcon', () => {
    it('deve retornar ícones para todos os tipos', () => {
      allTiposCobranca.forEach(tipo => {
        const icon = getCobrancaIcon(tipo);
        expect(typeof icon).toBe('string');
        expect(icon.length).toBeGreaterThan(0);
      });
    });

    it('deve retornar ícones específicos para cada tipo', () => {
      expect(getCobrancaIcon('Banco de Horas')).toBe('🏦');
      expect(getCobrancaIcon('Cobro Interno')).toBe('🏢');
      expect(getCobrancaIcon('Contrato')).toBe('📋');
      expect(getCobrancaIcon('Faturado')).toBe('💰');
      expect(getCobrancaIcon('Hora Extra')).toBe('⏰');
      expect(getCobrancaIcon('Sobreaviso')).toBe('🚨');
      expect(getCobrancaIcon('Reprovado')).toBe('❌');
      expect(getCobrancaIcon('Bolsão Enel')).toBe('⚡');
    });

    it('deve retornar ícones únicos para cada tipo', () => {
      const icons = allTiposCobranca.map(tipo => getCobrancaIcon(tipo));
      const iconsUnicos = [...new Set(icons)];
      
      expect(icons).toHaveLength(iconsUnicos.length);
    });
  });

  describe('COBRANCA_COLOR_CLASSES', () => {
    it('deve conter todas as classes constantes necessárias', () => {
      expect(COBRANCA_COLOR_CLASSES).toHaveProperty('CARD');
      expect(COBRANCA_COLOR_CLASSES).toHaveProperty('BADGE');
      expect(COBRANCA_COLOR_CLASSES).toHaveProperty('BUTTON_PRIMARY');
      expect(COBRANCA_COLOR_CLASSES).toHaveProperty('BUTTON_SECONDARY');
      expect(COBRANCA_COLOR_CLASSES).toHaveProperty('INPUT_FOCUS');
    });

    it('deve ter classes CSS válidas', () => {
      expect(COBRANCA_COLOR_CLASSES.CARD).toContain('border-2');
      expect(COBRANCA_COLOR_CLASSES.CARD).toContain('rounded-lg');
      expect(COBRANCA_COLOR_CLASSES.CARD).toContain('transition-colors');
      
      expect(COBRANCA_COLOR_CLASSES.BADGE).toContain('text-white');
      expect(COBRANCA_COLOR_CLASSES.BADGE).toContain('px-2');
      expect(COBRANCA_COLOR_CLASSES.BADGE).toContain('py-1');
      
      expect(COBRANCA_COLOR_CLASSES.BUTTON_PRIMARY).toContain('text-white');
      expect(COBRANCA_COLOR_CLASSES.BUTTON_PRIMARY).toContain('px-4');
      expect(COBRANCA_COLOR_CLASSES.BUTTON_PRIMARY).toContain('py-2');
      
      expect(COBRANCA_COLOR_CLASSES.INPUT_FOCUS).toContain('focus:ring-2');
      expect(COBRANCA_COLOR_CLASSES.INPUT_FOCUS).toContain('focus:ring-opacity-50');
    });
  });

  describe('Integração entre funções', () => {
    it('deve manter consistência entre getCobrancaColors e getCardClasses', () => {
      allTiposCobranca.forEach(tipo => {
        const colors = getCobrancaColors(tipo);
        const cardClasses = getCardClasses(tipo);
        
        expect(cardClasses).toContain(colors.bg);
        expect(cardClasses).toContain(colors.border);
        expect(cardClasses).toContain(colors.text);
        expect(cardClasses).toContain(colors.hover);
      });
    });

    it('deve manter consistência entre getCobrancaColors e getBadgeClasses', () => {
      allTiposCobranca.forEach(tipo => {
        const colors = getCobrancaColors(tipo);
        const badgeClasses = getBadgeClasses(tipo);
        
        expect(badgeClasses).toContain(colors.badge);
      });
    });

    it('deve manter consistência entre getCobrancaColors e getInputFocusClasses', () => {
      allTiposCobranca.forEach(tipo => {
        const colors = getCobrancaColors(tipo);
        const inputClasses = getInputFocusClasses(tipo);
        
        expect(inputClasses).toContain(`focus:${colors.ring}`);
      });
    });
  });

  describe('Performance e otimização', () => {
    it('deve executar funções rapidamente', () => {
      const start = performance.now();
      
      // Executar todas as funções múltiplas vezes
      for (let i = 0; i < 1000; i++) {
        allTiposCobranca.forEach(tipo => {
          getCobrancaColors(tipo);
          getCardClasses(tipo);
          getBadgeClasses(tipo);
          getButtonClasses(tipo);
          getInputFocusClasses(tipo);
          getHexColor(tipo);
          isValidTipoCobranca(tipo);
          getTextContrast(tipo);
          getCobrancaIcon(tipo);
        });
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Deve executar em menos de 100ms
      expect(duration).toBeLessThan(100);
    });

    it('deve retornar referências consistentes para o mesmo tipo', () => {
      const tipo: TipoCobrancaType = 'Faturado';
      
      const colors1 = getCobrancaColors(tipo);
      const colors2 = getCobrancaColors(tipo);
      
      expect(colors1).toEqual(colors2);
      
      const classes1 = getCardClasses(tipo);
      const classes2 = getCardClasses(tipo);
      
      expect(classes1).toBe(classes2);
    });
  });
});