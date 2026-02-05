/**
 * Testes para o sistema de internacionalização do Banco de Horas
 */

import { 
  isEnglishTemplate, 
  isEnglishTemplateByName,
  getMonthName, 
  getLabels, 
  getPeriodName 
} from '../bancoHorasI18n';

describe('bancoHorasI18n', () => {
  describe('isEnglishTemplateByName', () => {
    it('should detect English templates by name correctly', () => {
      expect(isEnglishTemplateByName('Template Books English')).toBe(true);
      expect(isEnglishTemplateByName('Template Books Inglês')).toBe(true);
      expect(isEnglishTemplateByName('Template Books Ingles')).toBe(true);
      expect(isEnglishTemplateByName('Template EN')).toBe(true);
      expect(isEnglishTemplateByName('EN Template')).toBe(true);
      expect(isEnglishTemplateByName('Books EN')).toBe(true);
      
      expect(isEnglishTemplateByName('Template Books Português')).toBe(false);
      expect(isEnglishTemplateByName('Template Padrão')).toBe(false);
      expect(isEnglishTemplateByName('Template Centro')).toBe(false); // "en" dentro de "centro"
      expect(isEnglishTemplateByName('')).toBe(false);
      expect(isEnglishTemplateByName(undefined)).toBe(false);
    });
  });

  describe('isEnglishTemplate', () => {
    it('should detect English templates correctly', () => {
      expect(isEnglishTemplate('template_books_english')).toBe(true);
      expect(isEnglishTemplate('template_books_ingles')).toBe(true);
      expect(isEnglishTemplate('template_books_inglês')).toBe(true);
      expect(isEnglishTemplate('english_template')).toBe(true);
      expect(isEnglishTemplate('template_en')).toBe(true);
      
      expect(isEnglishTemplate('template_books_portugues')).toBe(false);
      expect(isEnglishTemplate('template_padrao')).toBe(false);
      expect(isEnglishTemplate('')).toBe(false);
      expect(isEnglishTemplate(undefined)).toBe(false);
    });
  });

  describe('getMonthName', () => {
    it('should return Portuguese month names by default', () => {
      expect(getMonthName(1, false)).toBe('Janeiro');
      expect(getMonthName(6, false)).toBe('Junho');
      expect(getMonthName(12, false)).toBe('Dezembro');
    });

    it('should return English month names when requested', () => {
      expect(getMonthName(1, true)).toBe('January');
      expect(getMonthName(6, true)).toBe('June');
      expect(getMonthName(12, true)).toBe('December');
    });
  });

  describe('getLabels', () => {
    it('should return Portuguese labels by default', () => {
      const labels = getLabels(false);
      expect(labels.periodo).toBe('Período');
      expect(labels.mes).toBe('Mês');
      expect(labels.bancoContratado).toBe('Banco Contratado');
      expect(labels.visaoConsolidada).toBe('Visão Consolidada');
    });

    it('should return English labels when requested', () => {
      const labels = getLabels(true);
      expect(labels.periodo).toBe('Period');
      expect(labels.mes).toBe('Month');
      expect(labels.bancoContratado).toBe('Contracted Hours');
      expect(labels.visaoConsolidada).toBe('Consolidated View');
    });
  });

  describe('getPeriodName', () => {
    it('should return Portuguese period names by default', () => {
      expect(getPeriodName(1, 1, false)).toBe('Mensal');
      expect(getPeriodName(3, 1, false)).toBe('1º Trimestre');
      expect(getPeriodName(3, 2, false)).toBe('2º Trimestre');
      expect(getPeriodName(6, 1, false)).toBe('1º Semestre');
      expect(getPeriodName(12, 1, false)).toBe('Anual');
    });

    it('should return English period names when requested', () => {
      expect(getPeriodName(1, 1, true)).toBe('Monthly');
      expect(getPeriodName(3, 1, true)).toBe('1st Quarter');
      expect(getPeriodName(3, 2, true)).toBe('2nd Quarter');
      expect(getPeriodName(6, 1, true)).toBe('1st Semester');
      expect(getPeriodName(12, 1, true)).toBe('Annual');
    });
  });
});