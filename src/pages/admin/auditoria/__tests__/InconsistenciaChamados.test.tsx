import { describe, it, expect } from 'vitest';
import {
  agruparInconsistenciasPorAnalista,
  agruparPorTipoOrdenado,
  encontrarEmpresaCadastrada,
  encontrarEmailEspecialista,
  agruparGestoresIC999999,
  montarTextoGestorIC999999,
} from '../InconsistenciaChamados';
import { listarAnalistasDaAba } from '@/utils/listarAnalistasDaAba';
import type { InconsistenciaChamado, TipoInconsistencia } from '@/types/inconsistenciasChamados';

// Helper para criar uma inconsistência de teste com defaults, sobrescrevendo só o necessário
function criarInconsistencia(overrides: Partial<InconsistenciaChamado> = {}): InconsistenciaChamado {
  return {
    id: overrides.id ?? '1',
    origem: 'apontamentos',
    nro_chamado: 'RF0001',
    nro_tarefa: 'T1',
    data_abertura: '2026-01-01',
    data_atividade: '2026-01-01',
    data_sistema: '2026-01-01',
    tempo_gasto_horas: '01:00',
    tempo_gasto_minutos: 60,
    empresa: 'Empresa A',
    analista: 'João Silva',
    tipo_chamado: 'Incidente',
    item_configuracao: 'IC001',
    cod_resolucao: null,
    tipo_inconsistencia: 'mes_diferente',
    descricao_inconsistencia: 'Descrição',
    ...overrides,
  };
}

describe('agruparInconsistenciasPorAnalista', () => {
  it('agrupa itens por analista distintos', () => {
    const itens = [
      criarInconsistencia({ id: '1', analista: 'João Silva' }),
      criarInconsistencia({ id: '2', analista: 'Maria Souza' }),
      criarInconsistencia({ id: '3', analista: 'João Silva' }),
    ];

    const grupos = agruparInconsistenciasPorAnalista(itens);

    expect(grupos.size).toBe(2);
    expect(grupos.get('João Silva')).toHaveLength(2);
    expect(grupos.get('Maria Souza')).toHaveLength(1);
  });

  it('usa "Sem analista" como chave quando analista é null', () => {
    const itens = [criarInconsistencia({ id: '1', analista: null })];

    const grupos = agruparInconsistenciasPorAnalista(itens);

    expect(grupos.has('Sem analista')).toBe(true);
    expect(grupos.get('Sem analista')).toHaveLength(1);
  });

  it('retorna mapa vazio quando não há itens', () => {
    expect(agruparInconsistenciasPorAnalista([]).size).toBe(0);
  });
});

describe('agruparPorTipoOrdenado', () => {
  it('agrupa quando há apenas um tipo', () => {
    const itens = [criarInconsistencia({ tipo_inconsistencia: 'tempo_excessivo' })];
    const grupos = agruparPorTipoOrdenado(itens);
    expect(Array.from(grupos.keys())).toEqual(['tempo_excessivo']);
  });

  it('retorna as chaves na ordem fixa TIPO_INCONSISTENCIA_ORDEM independente da ordem de entrada', () => {
    const itens = [
      criarInconsistencia({ id: '5', tipo_inconsistencia: 'troca_codigo_resolucao' }),
      criarInconsistencia({ id: '1', tipo_inconsistencia: 'sem_atualizacao' }),
      criarInconsistencia({ id: '2', tipo_inconsistencia: 'ic_999999' }),
      criarInconsistencia({ id: '3', tipo_inconsistencia: 'tempo_excessivo' }),
      criarInconsistencia({ id: '4', tipo_inconsistencia: 'mes_diferente' }),
    ];

    const grupos = agruparPorTipoOrdenado(itens);

    expect(Array.from(grupos.keys())).toEqual([
      'mes_diferente', 'tempo_excessivo', 'ic_999999', 'sem_atualizacao', 'troca_codigo_resolucao',
    ]);
  });

  it('não inclui tipos sem nenhum item', () => {
    const itens = [criarInconsistencia({ tipo_inconsistencia: 'mes_diferente' })];
    const grupos = agruparPorTipoOrdenado(itens);
    expect(grupos.has('tempo_excessivo' as TipoInconsistencia)).toBe(false);
  });
});

describe('encontrarEmpresaCadastrada', () => {
  const empresas = [
    { nome_abreviado: 'EMPA', nome_completo: 'Empresa A Completa', email_gestor: 'gestorA@x.com' },
    { nome_abreviado: 'EMPB', nome_completo: 'Empresa B Completa', email_gestor: null },
  ];

  it('encontra por match exato de nome completo', () => {
    const resultado = encontrarEmpresaCadastrada('Empresa A Completa', empresas);
    expect(resultado?.nome_abreviado).toBe('EMPA');
  });

  it('encontra por match exato de nome abreviado', () => {
    const resultado = encontrarEmpresaCadastrada('EMPB', empresas);
    expect(resultado?.nome_completo).toBe('Empresa B Completa');
  });

  it('encontra por match parcial (startsWith nos dois sentidos)', () => {
    const resultado = encontrarEmpresaCadastrada('EMPA-FILIAL', empresas);
    expect(resultado?.nome_abreviado).toBe('EMPA');
  });

  it('retorna null quando não há match', () => {
    expect(encontrarEmpresaCadastrada('Empresa Inexistente', empresas)).toBeNull();
  });

  it('retorna null quando nomeEmpresa é null', () => {
    expect(encontrarEmpresaCadastrada(null, empresas)).toBeNull();
  });
});

describe('encontrarEmailEspecialista', () => {
  // Reproduz o bug reportado: "Guilherme Augusto Baptista Marques" está cadastrado,
  // mas com espaçamento diferente do valor sincronizado no chamado (espaço duplo/trailing),
  // o que quebrava a busca antiga por ILIKE de substring exata.
  const especialistas = [
    { nome: 'Guilherme  Augusto Baptista Marques ', email: 'guilherme.baptista@sonda.com' },
    { nome: 'Maria Souza', email: 'maria.souza@sonda.com' },
  ];

  it('encontra por match exato após normalizar espaços duplicados e trailing', () => {
    const resultado = encontrarEmailEspecialista('Guilherme Augusto Baptista Marques', especialistas);
    expect(resultado).toBe('guilherme.baptista@sonda.com');
  });

  it('encontra ignorando diferença de acentuação e caixa', () => {
    const resultado = encontrarEmailEspecialista('MARIA SOUZA', especialistas);
    expect(resultado).toBe('maria.souza@sonda.com');
  });

  it('encontra por match parcial quando o nome do chamado é um trecho contíguo do nome cadastrado', () => {
    const resultado = encontrarEmailEspecialista('Augusto Baptista Marques', especialistas);
    expect(resultado).toBe('guilherme.baptista@sonda.com');
  });

  it('retorna null quando o analista não está cadastrado', () => {
    expect(encontrarEmailEspecialista('Pessoa Inexistente', especialistas)).toBeNull();
  });

  it('retorna null quando nomeAnalista é null ou vazio', () => {
    expect(encontrarEmailEspecialista(null, especialistas)).toBeNull();
    expect(encontrarEmailEspecialista('   ', especialistas)).toBeNull();
  });

  it('retorna null quando o especialista não tem email cadastrado', () => {
    const semEmail = [{ nome: 'Sem Email', email: null }];
    expect(encontrarEmailEspecialista('Sem Email', semEmail)).toBeNull();
  });
});

describe('agruparGestoresIC999999', () => {
  it('agrupa 1 empresa com email', () => {
    const grupos = agruparGestoresIC999999([{ empresa: 'Empresa A', emailGestor: 'gestor@x.com' }]);
    expect(grupos).toEqual([{ emailGestor: 'gestor@x.com', empresas: ['Empresa A'] }]);
  });

  it('agrupa 2 empresas com o MESMO email em um único grupo', () => {
    const grupos = agruparGestoresIC999999([
      { empresa: 'Empresa A', emailGestor: 'gestor@x.com' },
      { empresa: 'Empresa B', emailGestor: 'gestor@x.com' },
    ]);
    expect(grupos).toEqual([{ emailGestor: 'gestor@x.com', empresas: ['Empresa A', 'Empresa B'] }]);
  });

  it('separa 2 empresas com emails DIFERENTES em 2 grupos', () => {
    const grupos = agruparGestoresIC999999([
      { empresa: 'Empresa A', emailGestor: 'gestorA@x.com' },
      { empresa: 'Empresa B', emailGestor: 'gestorB@y.com' },
    ]);
    expect(grupos).toEqual([
      { emailGestor: 'gestorA@x.com', empresas: ['Empresa A'] },
      { emailGestor: 'gestorB@y.com', empresas: ['Empresa B'] },
    ]);
  });

  it('gera grupo com emailGestor null quando empresa não tem email cadastrado', () => {
    const grupos = agruparGestoresIC999999([{ empresa: 'Empresa A', emailGestor: null }]);
    expect(grupos).toEqual([{ emailGestor: null, empresas: ['Empresa A'] }]);
  });

  it('mistura grupo com email e grupo sem email, email primeiro', () => {
    const grupos = agruparGestoresIC999999([
      { empresa: 'Empresa Sem Email', emailGestor: null },
      { empresa: 'Empresa Com Email', emailGestor: 'gestor@x.com' },
    ]);
    expect(grupos).toEqual([
      { emailGestor: 'gestor@x.com', empresas: ['Empresa Com Email'] },
      { emailGestor: null, empresas: ['Empresa Sem Email'] },
    ]);
  });
});

describe('montarTextoGestorIC999999', () => {
  it('retorna o texto de fallback quando não há grupos', () => {
    expect(montarTextoGestorIC999999([])).toBe('o gestor responsável pela empresa');
  });

  it('retorna apenas o email quando há 1 único grupo com email (sem citar empresa)', () => {
    const texto = montarTextoGestorIC999999([{ emailGestor: 'gestor@x.com', empresas: ['Empresa A'] }]);
    expect(texto).toBe('gestor@x.com');
  });

  it('retorna texto de "não cadastrado" quando há 1 único grupo sem email', () => {
    const texto = montarTextoGestorIC999999([{ emailGestor: null, empresas: ['Empresa A'] }]);
    expect(texto).toBe('e-mail do gestor não cadastrado para Empresa A');
  });

  it('junta múltiplos grupos com "; ", citando a empresa de cada um', () => {
    const texto = montarTextoGestorIC999999([
      { emailGestor: 'gestorA@x.com', empresas: ['Empresa A'] },
      { emailGestor: 'gestorB@y.com', empresas: ['Empresa B'] },
    ]);
    expect(texto).toBe('gestorA@x.com para Empresa A; gestorB@y.com para Empresa B');
  });

  it('mistura grupo com e sem email quando há múltiplos grupos', () => {
    const texto = montarTextoGestorIC999999([
      { emailGestor: 'gestorA@x.com', empresas: ['Empresa A'] },
      { emailGestor: null, empresas: ['Empresa B'] },
    ]);
    expect(texto).toBe('gestorA@x.com para Empresa A; e-mail do gestor não cadastrado para Empresa B');
  });

  it('agrupa múltiplas empresas no mesmo email dentro de um segmento com múltiplos grupos', () => {
    const texto = montarTextoGestorIC999999([
      { emailGestor: 'gestorA@x.com', empresas: ['Empresa A', 'Empresa C'] },
      { emailGestor: null, empresas: ['Empresa B'] },
    ]);
    expect(texto).toBe('gestorA@x.com (Empresa A, Empresa C); e-mail do gestor não cadastrado para Empresa B');
  });
});

describe('listarAnalistasDaAba', () => {
  it('lista apenas os analistas dos itens da aba, sem repetição e em ordem alfabética', () => {
    const itens = [
      criarInconsistencia({ id: '1', analista: 'Maria Souza' }),
      criarInconsistencia({ id: '2', analista: 'Ana Lima' }),
      criarInconsistencia({ id: '3', analista: 'Maria Souza' }),
    ];
    expect(listarAnalistasDaAba(itens)).toEqual(['Ana Lima', 'Maria Souza']);
  });

  it('ignora analista vazio ou nulo', () => {
    const itens = [
      criarInconsistencia({ id: '1', analista: null }),
      criarInconsistencia({ id: '2', analista: '  ' }),
      criarInconsistencia({ id: '3', analista: 'Ana Lima' }),
    ];
    expect(listarAnalistasDaAba(itens)).toEqual(['Ana Lima']);
  });

  it('mantém o analista selecionado mesmo que ele não tenha itens na aba', () => {
    const itens = [criarInconsistencia({ analista: 'Ana Lima' })];
    expect(listarAnalistasDaAba(itens, 'Zeca Pereira')).toEqual(['Ana Lima', 'Zeca Pereira']);
  });

  it('não duplica o analista selecionado quando ele já está na aba', () => {
    const itens = [criarInconsistencia({ analista: 'Ana Lima' })];
    expect(listarAnalistasDaAba(itens, 'Ana Lima')).toEqual(['Ana Lima']);
  });
});
