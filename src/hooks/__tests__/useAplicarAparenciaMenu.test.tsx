import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { CHAVE_CACHE_APARENCIA, useAplicarAparenciaMenu } from '../useAplicarAparenciaMenu';
import { cssDaAparencia } from '@/utils/aparenciaMenu';
import type { AparenciaMenu } from '@/types/menuOrganizado';

const estado: { menu: unknown } = { menu: null };
vi.mock('@/hooks/useMenuOrganizado', () => ({ useMenuOrganizado: () => estado }));

const tema = (selecionadoFundo: string): AparenciaMenu => ({
  menuFundo: '#FAFBFC',
  menuTexto: '#5F6670',
  itemFundo: '#FAFBFC',
  itemTexto: '#5F6670',
  subitemFundo: '#FAFBFC',
  subitemTexto: '#5F6670',
  hoverFundo: '#EEF1F4',
  hoverTexto: '#1B1F24',
  selecionadoFundo,
  selecionadoTexto: '#FFFFFF',
  logoPath: null,
  logoRecolhidoPath: null,
});
const aparencia = (cor: string) => ({ claro: tema(cor), escuro: tema(cor) });
const folha = () => document.getElementById('aparencia-menu')?.textContent ?? null;

describe('useAplicarAparenciaMenu', () => {
  beforeEach(() => {
    localStorage.clear();
    document.getElementById('aparencia-menu')?.remove();
    estado.menu = null;
  });

  it('antes da leitura chegar, aplica a última aparência guardada no navegador', () => {
    localStorage.setItem(CHAVE_CACHE_APARENCIA, cssDaAparencia(aparencia('#123456')));
    renderHook(() => useAplicarAparenciaMenu());
    expect(folha()).toContain('--ds-accent: #123456;');
  });

  it('sem nada guardado e sem leitura, fica o visual do código', () => {
    renderHook(() => useAplicarAparenciaMenu());
    expect(folha()).toBeNull();
  });

  it('com a aparência salva, aplica e guarda para a próxima vez', () => {
    localStorage.setItem(CHAVE_CACHE_APARENCIA, cssDaAparencia(aparencia('#123456')));
    estado.menu = { itens: [], aparencia: aparencia('#2563EB') };
    renderHook(() => useAplicarAparenciaMenu());
    expect(folha()).toContain('--ds-accent: #2563EB;');
    expect(localStorage.getItem(CHAVE_CACHE_APARENCIA)).toContain('--ds-accent: #2563EB;');
  });
});
