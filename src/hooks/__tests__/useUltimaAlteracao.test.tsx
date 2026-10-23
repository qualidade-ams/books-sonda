import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUltimaAlteracao } from '../useUltimaAlteracao';

let idioma = 'pt-BR';
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) => `${chave} ${JSON.stringify(valores)}`,
    i18n: { language: idioma },
  }),
}));
const nomes: Record<string, string> = { u1: 'Pessoa A' };
vi.mock('@/hooks/useNomesUsuarios', () => ({ useNomesUsuarios: () => nomes }));

describe('useUltimaAlteracao', () => {
  it('data no horário de Brasília e o nome de quem alterou', () => {
    const { result } = renderHook(() => useUltimaAlteracao('2026-10-22T15:30:00Z', 'u1'));
    expect(result.current).toBe(
      'fase3Comum.ultimaAlteracaoPor {"data":"22/10/2026 12:30","nome":"Pessoa A"}'
    );
  });

  it('sem o nome (sem permissão ou carga), só a data', () => {
    const { result } = renderHook(() => useUltimaAlteracao('2026-10-22T15:30:00Z', null));
    expect(result.current).toBe('fase3Comum.ultimaAlteracao {"data":"22/10/2026 12:30"}');
  });

  it('a data segue o idioma', () => {
    idioma = 'en';
    const { result } = renderHook(() => useUltimaAlteracao('2026-10-22T15:30:00Z', null));
    expect(result.current).toBe('fase3Comum.ultimaAlteracao {"data":"10/22/2026 12:30"}');
    idioma = 'pt-BR';
  });

  it('sem data, nada', () => {
    const { result } = renderHook(() => useUltimaAlteracao(undefined, 'u1'));
    expect(result.current).toBeUndefined();
  });
});
