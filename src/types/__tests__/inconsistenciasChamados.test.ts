import { describe, it, expect } from 'vitest';
import {
  TIPO_INCONSISTENCIA_ORDEM,
  TIPOS_TELA_INCONSISTENCIAS,
  TIPOS_TELA_TROCA_CODIGO_RESOLUCAO,
} from '../inconsistenciasChamados';

describe('tipos de inconsistência por tela', () => {
  it('a tela de inconsistências mostra todos os tipos menos a troca de código de resolução', () => {
    expect(TIPOS_TELA_INCONSISTENCIAS).toEqual(['mes_diferente', 'tempo_excessivo', 'ic_999999', 'sem_atualizacao']);
  });

  it('a tela de troca de código de resolução mostra só esse tipo', () => {
    expect(TIPOS_TELA_TROCA_CODIGO_RESOLUCAO).toEqual(['troca_codigo_resolucao']);
  });

  it('as duas telas juntas cobrem todos os tipos, sem repetir', () => {
    const todos = [...TIPOS_TELA_INCONSISTENCIAS, ...TIPOS_TELA_TROCA_CODIGO_RESOLUCAO];
    expect([...todos].sort()).toEqual([...TIPO_INCONSISTENCIA_ORDEM].sort());
  });
});
