import { describe, it, expect } from 'vitest';
import { formatarHoras, tomDasHoras } from '@/components/ds/horas';

describe('formatarHoras', () => {
  it('formata minutos como HH:MM com duas casas na hora', () => {
    expect(formatarHoras(165)).toBe('02:45');
    expect(formatarHoras(2400)).toBe('40:00');
    expect(formatarHoras(0)).toBe('00:00');
  });

  it('mantém horas com mais de dois dígitos', () => {
    expect(formatarHoras(142 * 60 + 35)).toBe('142:35');
  });

  // Sinal de menos tipográfico (U+2212): com algarismos tabulares, o hífen ficava largo e separado do número
  it('mostra o sinal de menos tipográfico em valores negativos', () => {
    expect(formatarHoras(-460)).toBe('−07:40');
  });

  it('mostra o sinal de mais quando pedido', () => {
    expect(formatarHoras(390, { sinal: 'sempre' })).toBe('+06:30');
    expect(formatarHoras(-390, { sinal: 'sempre' })).toBe('−06:30');
    expect(formatarHoras(0, { sinal: 'sempre' })).toBe('00:00');
  });

  it('mostra travessão para valor ausente', () => {
    expect(formatarHoras(null)).toBe('—');
    expect(formatarHoras(undefined)).toBe('—');
  });
});

describe('tomDasHoras', () => {
  it('positivo é sucesso, negativo é perigo e zero é neutro', () => {
    expect(tomDasHoras(10)).toBe('success');
    expect(tomDasHoras(-10)).toBe('danger');
    expect(tomDasHoras(0)).toBe('neutral');
    expect(tomDasHoras(null)).toBe('neutral');
  });
});
