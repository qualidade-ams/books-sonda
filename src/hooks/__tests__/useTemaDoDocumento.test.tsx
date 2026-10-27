import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { mudarTemaDaPagina, useTemaDoDocumento } from '../useTemaDoDocumento';

describe('useTemaDoDocumento', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  it('mudar o tema grava como o useTheme e troca a classe do html', () => {
    mudarTemaDaPagina('escuro');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    mudarTemaDaPagina('claro');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('segue a classe dark do html, mesmo trocada por outro componente', async () => {
    const { result } = renderHook(() => useTemaDoDocumento());
    expect(result.current).toBe('claro');

    act(() => document.documentElement.classList.add('dark'));
    await waitFor(() => expect(result.current).toBe('escuro'));
  });
});
