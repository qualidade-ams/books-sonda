import { describe, it, expect } from 'vitest';
import {
  agruparItensPorConsultor,
  calcularStatusSelecao,
  type DetalheItem,
} from '../AjustesRetroativos';

describe('agruparItensPorConsultor', () => {
  it('agrupa itens pelo nome do consultor', () => {
    const itens: DetalheItem[] = [
      { id: '1', ajusteId: 'a1', chamado: 'C1', tarefa: 'T1', consultor: 'João Silva', empresa: 'Empresa A' },
      { id: '2', ajusteId: 'a1', chamado: 'C2', tarefa: 'T2', consultor: 'Maria Souza', empresa: 'Empresa A' },
      { id: '3', ajusteId: 'a2', chamado: 'C3', tarefa: 'T3', consultor: 'João Silva', empresa: 'Empresa B' },
    ];

    const grupos = agruparItensPorConsultor(itens);

    expect(grupos.size).toBe(2);
    expect(grupos.get('João Silva')).toHaveLength(2);
    expect(grupos.get('Maria Souza')).toHaveLength(1);
    expect(grupos.get('João Silva')?.map(i => i.id)).toEqual(['1', '3']);
  });

  it('usa "Sem consultor" como chave quando o consultor é nulo', () => {
    const itens: DetalheItem[] = [
      { id: '1', ajusteId: 'a1', chamado: 'C1', tarefa: null, consultor: null, empresa: 'Empresa A' },
    ];

    const grupos = agruparItensPorConsultor(itens);

    expect(grupos.has('Sem consultor')).toBe(true);
    expect(grupos.get('Sem consultor')).toHaveLength(1);
  });

  it('retorna mapa vazio quando não há itens', () => {
    expect(agruparItensPorConsultor([]).size).toBe(0);
  });
});

describe('calcularStatusSelecao', () => {
  it('retorna "none" quando não há itens elegíveis', () => {
    expect(calcularStatusSelecao([], new Set())).toBe('none');
  });

  it('retorna "none" quando nenhum item elegível está selecionado', () => {
    expect(calcularStatusSelecao(['a', 'b'], new Set(['c']))).toBe('none');
  });

  it('retorna "partial" quando parte dos itens elegíveis está selecionada', () => {
    expect(calcularStatusSelecao(['a', 'b', 'c'], new Set(['a']))).toBe('partial');
  });

  it('retorna "all" quando todos os itens elegíveis estão selecionados', () => {
    expect(calcularStatusSelecao(['a', 'b'], new Set(['a', 'b', 'z']))).toBe('all');
  });
});
