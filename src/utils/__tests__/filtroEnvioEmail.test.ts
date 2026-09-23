import { describe, it, expect } from 'vitest';
import { passaFiltroEnvioEmail } from '../filtroEnvioEmail';
import type { EnviosPorInconsistencia } from '@/types/inconsistenciasChamados';

const envios: EnviosPorInconsistencia = {
  'inc-enviada': [{ email_para: 'a@x.com', email_cc: null, data_envio: '2026-09-15T13:30:00Z' }],
  'inc-lista-vazia': [],
};

describe('passaFiltroEnvioEmail', () => {
  it('"all" aceita qualquer linha', () => {
    expect(passaFiltroEnvioEmail('inc-enviada', envios, 'all')).toBe(true);
    expect(passaFiltroEnvioEmail('inc-sem-envio', envios, 'all')).toBe(true);
  });

  it('"enviado" aceita só linhas com pelo menos um envio', () => {
    expect(passaFiltroEnvioEmail('inc-enviada', envios, 'enviado')).toBe(true);
    expect(passaFiltroEnvioEmail('inc-sem-envio', envios, 'enviado')).toBe(false);
    expect(passaFiltroEnvioEmail('inc-lista-vazia', envios, 'enviado')).toBe(false);
  });

  it('"nao_enviado" aceita só linhas sem nenhum envio', () => {
    expect(passaFiltroEnvioEmail('inc-enviada', envios, 'nao_enviado')).toBe(false);
    expect(passaFiltroEnvioEmail('inc-sem-envio', envios, 'nao_enviado')).toBe(true);
    expect(passaFiltroEnvioEmail('inc-lista-vazia', envios, 'nao_enviado')).toBe(true);
  });
});
