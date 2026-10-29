import { describe, it, expect } from 'vitest';
import { criarTradutor } from '../tradutor';

describe('criarTradutor', () => {
  it('traduz pelos mesmos textos do app, no idioma pedido', () => {
    expect(criarTradutor('pt-BR')('controleBancoHoras.saldoParcial.abaResumo')).toBe('Resumo');
    expect(criarTradutor('en')('controleBancoHoras.saldoParcial.abaResumo')).toBe('Summary');
    expect(criarTradutor('es')('controleBancoHoras.saldoParcial.abaResumo')).toBe('Resumen');
  });

  it('interpola valores, sem escapar (o texto vai para Excel e e-mail, não para o DOM)', () => {
    expect(
      criarTradutor('pt-BR')('controleBancoHoras.saldoParcial.arquivo', {
        empresa: 'A & B',
        data: '30-09-2026',
      })
    ).toBe('Consumo por banco - A & B - 30-09-2026.xlsx');
  });

  it('idioma sem tradução cai no português', () => {
    expect(criarTradutor('fr')('controleBancoHoras.saldoParcial.abaResumo')).toBe('Resumo');
  });
});
