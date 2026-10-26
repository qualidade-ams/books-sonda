import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useTemaDoDocumento } from '../useTemaDoDocumento';

describe('useTemaDoDocumento', () => {
  afterEach(() => document.documentElement.classList.remove('dark'));

  it('segue a classe dark do html, mesmo trocada por outro componente', async () => {
    const { result } = renderHook(() => useTemaDoDocumento());
    expect(result.current).toBe('claro');

    act(() => document.documentElement.classList.add('dark'));
    await waitFor(() => expect(result.current).toBe('escuro'));
  });
});
