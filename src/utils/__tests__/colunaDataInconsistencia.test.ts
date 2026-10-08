import { describe, it, expect } from 'vitest';
import { colunaDataInconsistencia } from '../colunaDataInconsistencia';
import type { InconsistenciaChamado } from '@/types/inconsistenciasChamados';

function criarItem(overrides: Partial<InconsistenciaChamado> = {}): InconsistenciaChamado {
  return {
    id: '1',
    origem: 'tickets',
    nro_chamado: 'RF 9424236',
    nro_tarefa: null,
    data_abertura: '2026-09-21T10:00:00Z',
    data_atividade: '2026-09-21T10:00:00Z',
    data_sistema: null,
    tempo_gasto_horas: null,
    tempo_gasto_minutos: null,
    empresa: 'SPRINGER',
    analista: 'Analista',
    tipo_chamado: 'RF',
    item_configuracao: null,
    cod_resolucao: null,
    tipo_inconsistencia: 'sem_atualizacao',
    descricao_inconsistencia: 'Descrição',
    data_ultima_nota_publica: '2026-09-05T14:00:00Z',
    ...overrides,
  };
}

describe('colunaDataInconsistencia', () => {
  it('filtrando só Sem Atualização 16+ dias, a coluna vira Data Anotação Pública com a última nota pública', () => {
    const coluna = colunaDataInconsistencia('sem_atualizacao');

    expect(coluna.tituloKey).toBe('inconsistencias.publicNoteDate');
    expect(coluna.valor(criarItem())).toBe('2026-09-05T14:00:00Z');
  });

  it('chamado sem nota pública fica sem data na coluna Data Anotação Pública', () => {
    const coluna = colunaDataInconsistencia('sem_atualizacao');

    expect(coluna.valor(criarItem({ data_ultima_nota_publica: null }))).toBeNull();
    expect(coluna.valor(criarItem({ data_ultima_nota_publica: undefined }))).toBeNull();
  });

  it.each(['all', 'mes_diferente', 'tempo_excessivo', 'ic_999999', undefined] as const)(
    'com o filtro de tipo "%s" mantém Data Atividade',
    (tipo) => {
      const coluna = colunaDataInconsistencia(tipo);

      expect(coluna.tituloKey).toBe('inconsistencias.activityDate');
      expect(coluna.valor(criarItem())).toBe('2026-09-21T10:00:00Z');
    }
  );
});
