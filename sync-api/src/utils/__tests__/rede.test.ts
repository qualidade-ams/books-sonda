import { describe, it, expect } from 'vitest';
import { hostDeEscuta } from '../rede';

describe('hostDeEscuta', () => {
  it('escuta só na máquina local por padrão (acesso externo é pelo Cloudflare Tunnel)', () => {
    expect(hostDeEscuta({})).toBe('127.0.0.1');
  });

  it('ignora HOST vazio', () => {
    expect(hostDeEscuta({ HOST: '   ' })).toBe('127.0.0.1');
  });

  it('respeita HOST quando definido', () => {
    expect(hostDeEscuta({ HOST: '0.0.0.0' })).toBe('0.0.0.0');
  });
});
