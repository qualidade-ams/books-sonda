import { describe, it, expect } from 'vitest';
import {
  ACAO_CORRECAO_TEXTO,
  TIPO_INCONSISTENCIA_COLORS,
  TIPO_INCONSISTENCIA_COR_EMAIL_HEX,
  TIPO_INCONSISTENCIA_LABELS,
  TIPO_INCONSISTENCIA_ORDEM,
  TIPOS_TELA_INCONSISTENCIAS,
  TIPOS_TELA_MONITORAMENTO,
} from '../inconsistenciasChamados';

describe('tipos de inconsistência por tela', () => {
  it('a tela de inconsistências mostra todos os tipos menos a troca de código de resolução', () => {
    expect(TIPOS_TELA_INCONSISTENCIAS).toEqual([
      'mes_diferente',
      'tempo_excessivo',
      'ic_999999',
      'sem_atualizacao',
      'validacao_solucao',
    ]);
  });

  it('a validação do campo Solução tem rótulo, cor e ação de correção próprios', () => {
    expect(TIPO_INCONSISTENCIA_LABELS.validacao_solucao).toBe('Validação campo Solução');
    expect(TIPO_INCONSISTENCIA_COLORS.validacao_solucao).toBeTruthy();
    expect(TIPO_INCONSISTENCIA_COR_EMAIL_HEX.validacao_solucao).toEqual({
      bg: expect.any(String),
      text: expect.any(String),
    });
    expect(ACAO_CORRECAO_TEXTO.validacao_solucao).toContain(
      'CENÁRIO, CAUSA, SOLUÇÃO PALIATIVA, SOLUÇÃO DEFINITIVA e PREVENÇÃO'
    );
  });

  it('o Monitoramento de Chamados mostra a troca de código de resolução e o IC inativo', () => {
    expect(TIPOS_TELA_MONITORAMENTO).toEqual(['troca_codigo_resolucao', 'ic_inativo']);
  });

  it('o IC inativo tem rótulo, cor e ação de correção próprios', () => {
    expect(TIPO_INCONSISTENCIA_LABELS.ic_inativo).toBe('IC Inativos');
    expect(TIPO_INCONSISTENCIA_COLORS.ic_inativo).toBeTruthy();
    expect(TIPO_INCONSISTENCIA_COR_EMAIL_HEX.ic_inativo).toEqual({
      bg: expect.any(String),
      text: expect.any(String),
    });
    expect(ACAO_CORRECAO_TEXTO.ic_inativo).toContain('APPLICATION ADMINISTRATOR');
  });

  it('as duas telas juntas cobrem todos os tipos, sem repetir', () => {
    const todos = [...TIPOS_TELA_INCONSISTENCIAS, ...TIPOS_TELA_MONITORAMENTO];
    expect([...todos].sort()).toEqual([...TIPO_INCONSISTENCIA_ORDEM].sort());
  });
});
