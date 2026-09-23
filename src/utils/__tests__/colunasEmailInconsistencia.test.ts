import { describe, it, expect } from 'vitest';
import { colunasEmailPorTipo, valorColunaEmail } from '../colunasEmailInconsistencia';
import type { InconsistenciaChamado } from '@/types/inconsistenciasChamados';

function criarItem(overrides: Partial<InconsistenciaChamado> = {}): InconsistenciaChamado {
  return {
    id: '1',
    origem: 'apontamentos',
    nro_chamado: 'RF 9182318',
    nro_tarefa: 'TK-9383147',
    data_abertura: '2026-08-01T12:00:00Z',
    data_atividade: '2026-08-31T15:00:00Z',
    data_sistema: '2026-09-02T15:00:00Z',
    tempo_gasto_horas: '24:00',
    tempo_gasto_minutos: 1440,
    empresa: 'SHELL',
    analista: 'Flavio de Souza Silva',
    tipo_chamado: 'RF',
    item_configuracao: null,
    cod_resolucao: null,
    tipo_inconsistencia: 'tempo_excessivo',
    descricao_inconsistencia: 'Descrição',
    ...overrides,
  };
}

const titulos = (tipo: Parameters<typeof colunasEmailPorTipo>[0]) =>
  colunasEmailPorTipo(tipo).map(c => c.titulo);

describe('colunasEmailPorTipo', () => {
  it('Sem Atualização 16+ dias não tem coluna Tarefa', () => {
    expect(titulos('sem_atualizacao')).toEqual(['Empresa', 'Chamado', 'Analista']);
  });

  it('IC 999999 não tem coluna Tarefa', () => {
    expect(titulos('ic_999999')).toEqual(['Empresa', 'Chamado', 'Analista']);
  });

  it('Tempo Excessivo tem coluna Tempo', () => {
    expect(titulos('tempo_excessivo')).toEqual(['Empresa', 'Chamado', 'Tarefa', 'Tempo', 'Analista']);
  });

  it('Mês Diferente tem colunas Data Atividade e Data Sistema', () => {
    expect(titulos('mes_diferente')).toEqual(['Empresa', 'Chamado', 'Tarefa', 'Data Atividade', 'Data Sistema', 'Analista']);
  });
});

describe('valorColunaEmail', () => {
  const ctx = { empresa: 'SHELL', analista: 'Flavio de Souza Silva' };

  it('usa empresa e analista do contexto', () => {
    const item = criarItem({ empresa: 'Shell Brasil Ltda', analista: 'outro' });
    expect(valorColunaEmail('empresa', item, ctx)).toBe('SHELL');
    expect(valorColunaEmail('analista', item, ctx)).toBe('Flavio de Souza Silva');
  });

  it('retorna chamado, tarefa e tempo do item', () => {
    const item = criarItem();
    expect(valorColunaEmail('chamado', item, ctx)).toBe('RF 9182318');
    expect(valorColunaEmail('tarefa', item, ctx)).toBe('TK-9383147');
    expect(valorColunaEmail('tempo', item, ctx)).toBe('24:00');
  });

  it('formata as datas como dd/MM/yyyy no horário de Brasília', () => {
    const item = criarItem({ data_atividade: '2026-09-01T02:00:00Z', data_sistema: '2026-09-02T15:00:00Z' });
    // 02:00 UTC de 01/09 ainda é 31/08 em Brasília
    expect(valorColunaEmail('data_atividade', item, ctx)).toBe('31/08/2026');
    expect(valorColunaEmail('data_sistema', item, ctx)).toBe('02/09/2026');
  });

  it('usa "-" quando o valor está vazio', () => {
    const item = criarItem({ nro_tarefa: null, tempo_gasto_horas: null, data_atividade: null, data_sistema: null });
    expect(valorColunaEmail('tarefa', item, ctx)).toBe('-');
    expect(valorColunaEmail('tempo', item, ctx)).toBe('-');
    expect(valorColunaEmail('data_atividade', item, ctx)).toBe('-');
    expect(valorColunaEmail('data_sistema', item, ctx)).toBe('-');
  });
});
