import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { TarefasAntesDaTrocaTabela } from '../TarefasAntesDaTrocaTabela';

describe('TarefasAntesDaTrocaTabela', () => {
  it('lista cada tarefa com nº, data (Brasília), analista e tempo, e o total no fim', () => {
    render(
      <TarefasAntesDaTrocaTabela
        isLoading={false}
        dados={{
          tarefas: [
            { nro_tarefa: '111', data_sistema: '2026-09-10T02:00:00Z', analista: 'Ana', tempo_gasto_minutos: 90, tempo_gasto_horas: '01:30' },
            { nro_tarefa: '222', data_sistema: '2026-09-15T12:00:00Z', analista: null, tempo_gasto_minutos: 30, tempo_gasto_horas: '00:30' },
          ],
          total_minutos: 120,
          total_horas: '02:00',
        }}
      />
    );

    const linhas = screen.getAllByRole('row');
    // cabeçalho + 2 tarefas + total
    expect(linhas).toHaveLength(4);
    expect(within(linhas[0]).getByText('Nº Tarefa')).toBeInTheDocument();
    expect(within(linhas[1]).getByText('111')).toBeInTheDocument();
    expect(within(linhas[1]).getByText('09/09/2026')).toBeInTheDocument();
    expect(within(linhas[1]).getByText('Ana')).toBeInTheDocument();
    expect(within(linhas[1]).getByText('01:30')).toBeInTheDocument();
    expect(within(linhas[2]).getByText('-')).toBeInTheDocument();
    expect(within(linhas[3]).getByText('Total')).toBeInTheDocument();
    expect(within(linhas[3]).getByText('02:00')).toBeInTheDocument();
  });

  it('mostra carregando enquanto busca', () => {
    render(<TarefasAntesDaTrocaTabela isLoading dados={undefined} />);
    expect(screen.getByText('Carregando tarefas...')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('avisa quando não há tarefas antes da troca', () => {
    render(<TarefasAntesDaTrocaTabela isLoading={false} dados={{ tarefas: [], total_minutos: 0, total_horas: '00:00' }} />);
    expect(screen.getByText('Nenhuma tarefa apontada antes da troca.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
