import { describe, it, expect } from 'vitest';
import {
  ASSUNTO_REGULARIZACAO,
  gerarHtmlRegularizacao,
  textoRegularizacao,
} from '../emailRegularizacao';

const ITENS = [
  {
    empresa: 'ALFA',
    chamado: 'CH-1',
    tarefa: 'T-1',
    consultor: 'Ana Souza',
    minutos: 90,
    mes: { ano: 2026, mes: 9 },
  },
  {
    empresa: 'BETA <b>',
    chamado: 'CH-2',
    tarefa: null,
    consultor: 'Ana Souza',
    minutos: 30,
    mes: { ano: 2026, mes: 8 },
  },
];

describe('e-mail de regularização aos consultores', () => {
  it('assunto do aviso atual', () => {
    expect(ASSUNTO_REGULARIZACAO).toBe('Ajuste de Apontamento - Banco de Horas');
  });

  it('texto pelo primeiro nome, no singular ou no plural', () => {
    const um = textoRegularizacao('Ana Souza', 1);
    expect(um.startsWith('Prezado(a) Ana,')).toBe(true);
    expect(um).toContain('identificamos o registro de horas realizado após o fechamento');
    expect(um).toContain('- Excluir a tarefa que contém o apontamento retroativo;');

    const varios = textoRegularizacao('Ana Souza', 2);
    expect(varios).toContain('identificamos registros de horas realizados após o fechamento');
    expect(varios).toContain('- Excluir as tarefas que contêm os apontamentos retroativos;');
    expect(varios.trim().endsWith('Atenciosamente.')).toBe(true);
  });

  it('HTML com o texto, os meses, o total de horas e a tabela, escapado', () => {
    const html = gerarHtmlRegularizacao(ITENS, textoRegularizacao('Ana Souza', 2));
    expect(html).toContain('Prezado(a) Ana,');
    expect(html).toContain(
      '<strong>Excluir as tarefas que contêm os apontamentos retroativos;</strong>'
    );
    expect(html).toContain('agosto de 2026, setembro de 2026');
    expect(html).toContain('2h');
    expect(html).toContain('CH-1');
    expect(html).toContain('BETA &lt;b&gt;');
    expect(html).not.toContain('BETA <b>');
  });
});
