import { describe, it, expect } from 'vitest';
import { clearAllAppCache } from '../clearAllAppCache';

describe('clearAllAppCache', () => {
  it('apaga as cores do menu guardadas no navegador', () => {
    localStorage.setItem('menu-aparencia-css', 'html.dark {}');
    clearAllAppCache();
    expect(localStorage.getItem('menu-aparencia-css')).toBeNull();
  });
});
