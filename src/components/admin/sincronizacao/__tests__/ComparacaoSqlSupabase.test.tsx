import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, opcoes?: Record<string, unknown>) =>
      opcoes?.count !== undefined ? `${chave}:${opcoes.count}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));

import { ComparacaoSqlSupabase } from '../ComparacaoSqlSupabase';

// Formato gravado pelo orquestrador do sync-api em sync_execucoes.resultado.validacao
const validacao = {
  sucesso: true,
  resumo: { total_tabelas: 4, tabelas_ok: 1, tabelas_com_diferenca: 2, tabelas_com_erro: 1 },
  tabelas: {
    pesquisas: {
      sql_server: 13202,
      supabase: 13184,
      diferenca: 18,
      status: '⚠️ Faltam 18 registros',
    },
    especialistas: {
      sql_server_total: 426,
      supabase: 446,
      diferenca: -20,
      status: '🔄 Supabase tem 20 a mais',
    },
    apontamentos: { sql_server: 105491, supabase: 105491, diferenca: 0, status: '✅ OK' },
    tickets: { erro: 'Timeout ao contar' },
  },
};

const cartao = (tabela: string) =>
  screen.getByText(`sincronizacaoSql.tabelas.${tabela}`).closest('[data-tabela]') as HTMLElement;

describe('ComparacaoSqlSupabase', () => {
  it('mostra o título e um cartão por tabela comparada', () => {
    render(<ComparacaoSqlSupabase validacao={validacao} />);

    expect(screen.getByText('sincronizacaoSql.historico.comparacao.titulo')).toBeInTheDocument();
    ['pesquisas', 'especialistas', 'apontamentos', 'tickets'].forEach((tb) =>
      expect(cartao(tb)).toBeInTheDocument()
    );
  });

  it('mostra as contagens do SQL Server, do Supabase e a diferença', () => {
    render(<ComparacaoSqlSupabase validacao={validacao} />);

    const pesquisas = within(cartao('pesquisas'));
    expect(pesquisas.getByText((13202).toLocaleString('pt-BR'))).toBeInTheDocument();
    expect(pesquisas.getByText((13184).toLocaleString('pt-BR'))).toBeInTheDocument();
    expect(pesquisas.getByText('+18')).toBeInTheDocument();
    expect(
      pesquisas.getByText('sincronizacaoSql.historico.comparacao.faltam:18')
    ).toBeInTheDocument();
  });

  it('usa o total do SQL Server dos especialistas e indica sobra no Supabase', () => {
    render(<ComparacaoSqlSupabase validacao={validacao} />);

    const especialistas = within(cartao('especialistas'));
    expect(especialistas.getByText('426')).toBeInTheDocument();
    expect(especialistas.getByText('-20')).toBeInTheDocument();
    expect(
      especialistas.getByText('sincronizacaoSql.historico.comparacao.sobram:20')
    ).toBeInTheDocument();
  });

  it('marca a tabela igual como OK e a com erro com a mensagem', () => {
    render(<ComparacaoSqlSupabase validacao={validacao} />);

    expect(
      within(cartao('apontamentos')).getByText('sincronizacaoSql.historico.comparacao.ok')
    ).toBeInTheDocument();
    expect(within(cartao('tickets')).getByText('Timeout ao contar')).toBeInTheDocument();
  });

  it('não renderiza nada sem tabelas na validação', () => {
    const { container } = render(
      <ComparacaoSqlSupabase validacao={{ sucesso: false, erro: 'x' }} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
