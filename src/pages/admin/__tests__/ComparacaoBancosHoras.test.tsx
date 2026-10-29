import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import ComparacaoBancosHoras from '../ComparacaoBancosHoras';
import { exportarTabela } from '@/utils/exportarTabela';
import type { ComparacaoEmpresa, MesComparacao } from '@/types/comparacao';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));
vi.mock('@/utils/exportarTabela', async (original) => ({
  ...(await original<typeof import('@/utils/exportarTabela')>()),
  exportarTabela: vi.fn(async () => undefined),
}));
vi.mock('@/components/admin/LayoutAdmin', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

const empresa = (v: Partial<ComparacaoEmpresa>): ComparacaoEmpresa => ({
  empresaId: 'e',
  empresa: 'EMPRESA',
  bancosAtivos: 1,
  situacao: 'identico',
  mesesComparados: 12,
  consumoLegadoMinutos: 600,
  consumoNovoMinutos: 600,
  consumoLegadoTickets: 0,
  consumoNovoTickets: 0,
  calculadoEm: '2026-10-28T11:12:00Z',
  erro: null,
  erroEm: null,
  validacao: null,
  liberacao: null,
  ...v,
});

const zero = { consumo: 0, requerimentos: 0, reajustes: 0, saldo: 0, repasse: 0, excedente: 0 };
const medidas = (horas: Partial<typeof zero>) => ({
  horas: { ...zero, ...horas },
  tickets: { ...zero },
  valorAFaturar: 0,
});
const mes = (m: number, v: Partial<MesComparacao> = {}): MesComparacao => ({
  mes: { mes: m, ano: 2026 },
  situacao: 'igual',
  legado: medidas({ consumo: 600, saldo: 120 }),
  novo: {
    ...medidas({ consumo: 600, saldo: 120 }),
    porBanco: [{ bancoId: 'b1', nome: 'Banco padrão', minutos: 600, tickets: 0 }],
  },
  origemSaldo: null,
  itens: [],
  itensTotal: 0,
  fechamentoLegadoEm: '2026-10-05T12:00:00Z',
  ...v,
});

const estado = {
  empresas: [] as ComparacaoEmpresa[],
  contagem: { conferem: 1, explicada: 0, divergente: 1, validada: 1, liberada: 1 },
  isLoading: false,
  error: null as Error | null,
  recarregar: vi.fn(),
  validar: vi.fn(async () => undefined),
  recalcular: vi.fn(async () => undefined),
  liberar: vi.fn(async () => undefined),
  voltar: vi.fn(async () => undefined),
  enviarSaldoParcialTeste: vi.fn(async () => undefined),
  enviandoSaldoParcialTeste: false,
  recalculando: null as string | null,
  isSalvando: false,
};
const booksPedidos: unknown[][] = [];
const meses = {
  meses: [] as MesComparacao[],
  isLoading: false,
  error: null as Error | null,
  recarregar: vi.fn(),
};
const mesesPedidos: (string | null)[] = [];
const lancamentosPedidos: (string | null)[] = [];
vi.mock('@/hooks/useComparacao', () => ({
  useComparacao: () => estado,
  useMesesComparacao: (id: string | null) => {
    mesesPedidos.push(id);
    return meses;
  },
  useLancamentosParaLegado: (id: string | null) => {
    lancamentosPedidos.push(id);
    return {
      lancamentos: id ? { reajustes: 2, observacoes: 1 } : null,
      isLoading: false,
      error: null,
    };
  },
  useBookDeTeste: (...args: unknown[]) => {
    booksPedidos.push(args);
    return { bancos: [], isLoading: false, error: null, recarregar: vi.fn() };
  },
}));
let permissoes: string[] = [];
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (tela: string, nivel: string) => permissoes.includes(`${tela}:${nivel}`),
  }),
}));

const ALFA = empresa({ empresaId: 'e1', empresa: 'EMPRESA ALFA' });
const GAMA = empresa({
  empresaId: 'e3',
  empresa: 'EMPRESA GAMA',
  situacao: 'divergente',
  consumoNovoMinutos: 660,
});
const BETA = empresa({
  empresaId: 'e2',
  empresa: 'EMPRESA BETA',
  validacao: { por: 'Usuário Teste', em: '2026-10-27T15:00:00Z', situacao: 'identico' },
});
const ZETA = empresa({
  empresaId: 'e4',
  empresa: 'EMPRESA ZETA',
  situacao: null,
  calculadoEm: null,
  erro: 'Falha ao ler o fechamento',
  erroEm: '2026-10-28T11:00:00Z',
});

const OMEGA = empresa({
  empresaId: 'e5',
  empresa: 'EMPRESA OMEGA',
  validacao: { por: 'Usuário Teste', em: '2026-10-27T15:00:00Z', situacao: 'identico' },
  liberacao: { por: 'Usuário Dois', em: '2026-10-29T12:00:00Z', desde: { mes: 10, ano: 2026 } },
});

beforeEach(() => {
  permissoes = ['bancos_horas_comparacao:edit'];
  estado.empresas = [ALFA, BETA, GAMA, ZETA, OMEGA];
  estado.liberar.mockClear();
  estado.voltar.mockClear();
  lancamentosPedidos.length = 0;
  booksPedidos.length = 0;
  estado.enviarSaldoParcialTeste.mockClear();
  estado.enviandoSaldoParcialTeste = false;
  estado.error = null;
  estado.isLoading = false;
  estado.recalculando = null;
  estado.validar.mockClear();
  estado.recalcular.mockClear();
  estado.recarregar.mockClear();
  meses.meses = [];
  mesesPedidos.length = 0;
  vi.mocked(exportarTabela).mockClear();
});

const renderizar = () =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <ComparacaoBancosHoras />
      </TooltipProvider>
    </MemoryRouter>
  );
const tabela = () => within(screen.getByRole('list', { name: 'comparacaoBancosHoras.lista' }));
const abrir = (nome: string) =>
  fireEvent.click(
    screen.getByRole('button', { name: `comparacaoBancosHoras.ver {"empresa":"${nome}"}` })
  );

describe('ComparacaoBancosHoras: lista', () => {
  it('mostra as empresas, a situação e quem validou', () => {
    renderizar();
    expect(tabela().getByText('EMPRESA ALFA')).toBeInTheDocument();
    expect(tabela().getByText('comparacaoBancosHoras.situacoes.divergente')).toBeInTheDocument();
    expect(
      tabela().getByText(/comparacaoBancosHoras.validadaPor .*Usuário Teste/)
    ).toBeInTheDocument();
    // Só erro da rotina: sem resultado, com o erro
    expect(tabela().getByText('comparacaoBancosHoras.semResultado')).toBeInTheDocument();
    expect(tabela().getByText(/Falha ao ler o fechamento/)).toBeInTheDocument();
  });

  it('o indicador filtra pelo grupo e, clicado de novo, limpa', () => {
    renderizar();
    const divergentes = screen.getByRole('button', {
      name: /comparacaoBancosHoras.grupos.divergente/,
    });
    fireEvent.click(divergentes);
    expect(tabela().getByText('EMPRESA GAMA')).toBeInTheDocument();
    expect(tabela().queryByText('EMPRESA ALFA')).not.toBeInTheDocument();
    fireEvent.click(divergentes);
    expect(tabela().getByText('EMPRESA ALFA')).toBeInTheDocument();
  });

  it('busca filtra e, sem resultado, oferece limpar', () => {
    renderizar();
    fireEvent.change(screen.getByRole('searchbox', { name: 'comparacaoBancosHoras.buscar' }), {
      target: { value: 'nada' },
    });
    expect(screen.getByText('comparacaoBancosHoras.vazio.filtro')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'fase3Comum.limparFiltros' })[0]);
    expect(tabela().getByText('EMPRESA ALFA')).toBeInTheDocument();
  });

  it('liberada: selo, quem liberou no lugar de quem validou, e o indicador Liberadas', () => {
    renderizar();
    expect(tabela().getByText('comparacaoBancosHoras.liberada')).toBeInTheDocument();
    expect(
      tabela().getByText(/comparacaoBancosHoras.liberadaPor .*Usuário Dois/)
    ).toBeInTheDocument();
    // Só a BETA mostra quem validou
    expect(tabela().getAllByText(/comparacaoBancosHoras.validadaPor/)).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /comparacaoBancosHoras.grupos.liberada/ }));
    expect(tabela().getByText('EMPRESA OMEGA')).toBeInTheDocument();
    expect(tabela().queryByText('EMPRESA BETA')).not.toBeInTheDocument();
  });

  it('sem empresas: explica de onde vêm os dados', () => {
    estado.empresas = [];
    renderizar();
    expect(screen.getByText('comparacaoBancosHoras.vazio.semDados')).toBeInTheDocument();
  });

  it('erro ao carregar: tentar de novo', () => {
    estado.error = new Error('x');
    renderizar();
    expect(screen.getByText('comparacaoBancosHoras.erro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.tentarNovamente' }));
    expect(estado.recarregar).toHaveBeenCalled();
  });

  it('exporta a lista filtrada', async () => {
    renderizar();
    fireEvent.click(
      screen.getByRole('button', { name: /comparacaoBancosHoras.grupos.divergente/ })
    );
    await userEvent.click(screen.getByRole('button', { name: 'ds.exportar.botao' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'ds.exportar.excel' }));
    const [exportacao] = vi.mocked(exportarTabela).mock.calls[0];
    expect(exportacao.abas[0].linhas).toEqual([GAMA]);
  });
});

describe('ComparacaoBancosHoras: detalhe', () => {
  const comDiferenca = () => {
    meses.meses = [
      mes(8, {
        situacao: 'divergente',
        novo: { ...medidas({ consumo: 720, saldo: 0 }), porBanco: [] },
        itens: [
          {
            chave: 'g3',
            fonte: 'apontamento',
            chamado: 'CH-201877',
            data: '2026-08-18T17:05:00Z',
            grupo: 'AMS SUPORTE - PORTAL',
            minutosLegado: 120,
            minutosNovo: null,
            ticketsLegado: null,
            ticketsNovo: null,
            motivo: 'organizacao_fora_do_cadastro',
            explicado: false,
          },
        ],
        itensTotal: 1,
      }),
      mes(9),
    ];
  };

  it('abre pelo nome, carrega os meses e mostra o mês mais recente com diferença', () => {
    comDiferenca();
    renderizar();
    abrir('EMPRESA GAMA');

    expect(screen.getByRole('heading', { name: 'EMPRESA GAMA' })).toBeInTheDocument();
    expect(mesesPedidos).toContain('e3');
    expect(
      screen.getByText('comparacaoBancosHoras.resumo.divergente.um {"n":1}')
    ).toBeInTheDocument();
    const itens = within(
      screen.getByRole('list', { name: /comparacaoBancosHoras.detalhe.diferencasEm/ })
    );
    expect(itens.getByText('CH-201877')).toBeInTheDocument();
    expect(
      itens.getByText('comparacaoBancosHoras.motivos.organizacao_fora_do_cadastro')
    ).toBeInTheDocument();
    expect(itens.getByText('comparacaoBancosHoras.semExplicacao')).toBeInTheDocument();
  });

  it('voltar fecha o detalhe', () => {
    renderizar();
    abrir('EMPRESA ALFA');
    fireEvent.click(screen.getByRole('button', { name: /comparacaoBancosHoras.titulo/ }));
    expect(screen.getByRole('list', { name: 'comparacaoBancosHoras.lista' })).toBeInTheDocument();
  });

  it('divergente não pode ser validada', () => {
    comDiferenca();
    renderizar();
    abrir('EMPRESA GAMA');
    expect(
      screen.getByRole('button', { name: 'comparacaoBancosHoras.acoes.validar' })
    ).toBeDisabled();
  });

  it('validar pede confirmação e grava', () => {
    meses.meses = [mes(9)];
    renderizar();
    abrir('EMPRESA ALFA');
    fireEvent.click(screen.getByRole('button', { name: 'comparacaoBancosHoras.acoes.validar' }));
    const dialogo = within(screen.getByRole('alertdialog'));
    fireEvent.click(dialogo.getByRole('button', { name: 'comparacaoBancosHoras.acoes.validar' }));
    expect(estado.validar).toHaveBeenCalledWith({ empresaId: 'e1', validar: true });
  });

  it('desfazer a validação exige motivo', () => {
    renderizar();
    abrir('EMPRESA BETA');
    fireEvent.click(screen.getByRole('button', { name: 'comparacaoBancosHoras.acoes.desfazer' }));
    const dialogo = within(screen.getByRole('alertdialog'));
    const confirmar = dialogo.getByRole('button', { name: 'comparacaoBancosHoras.acoes.desfazer' });
    expect(confirmar).toBeDisabled();
    fireEvent.change(dialogo.getByLabelText(/comparacaoBancosHoras.desfazer.motivo/), {
      target: { value: 'Book retificado' },
    });
    fireEvent.click(confirmar);
    expect(estado.validar).toHaveBeenCalledWith({
      empresaId: 'e2',
      validar: false,
      motivo: 'Book retificado',
    });
  });

  it('recalcular pede ao sync-api e mostra o andamento', () => {
    const { rerender } = renderizar();
    abrir('EMPRESA ALFA');
    fireEvent.click(screen.getByRole('button', { name: 'comparacaoBancosHoras.acoes.recalcular' }));
    expect(estado.recalcular).toHaveBeenCalledWith('e1');

    estado.recalculando = 'e1';
    rerender(
      <MemoryRouter>
        <TooltipProvider>
          <ComparacaoBancosHoras />
        </TooltipProvider>
      </MemoryRouter>
    );
    expect(
      screen.getByRole('button', { name: 'comparacaoBancosHoras.acoes.recalculando' })
    ).toBeDisabled();
  });

  it('sem permissão de edição: sem recalcular nem validar', () => {
    permissoes = ['bancos_horas_comparacao:view'];
    renderizar();
    abrir('EMPRESA ALFA');
    expect(
      screen.queryByRole('button', { name: 'comparacaoBancosHoras.acoes.recalcular' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'comparacaoBancosHoras.acoes.validar' })
    ).not.toBeInTheDocument();
  });

  it('sem validação não há Liberar', () => {
    renderizar();
    abrir('EMPRESA ALFA');
    expect(
      screen.queryByRole('button', { name: 'comparacaoBancosHoras.acoes.liberar' })
    ).not.toBeInTheDocument();
  });

  it('validada: Liberar pede confirmação com o mês de corte e grava', () => {
    meses.meses = [mes(8), mes(9)];
    renderizar();
    abrir('EMPRESA BETA');
    fireEvent.click(screen.getByRole('button', { name: 'comparacaoBancosHoras.acoes.liberar' }));
    const dialogo = within(screen.getByRole('alertdialog'));
    // Corte: o mês seguinte ao último comparado (Set/2026)
    expect(
      dialogo.getByText(/comparacaoBancosHoras.liberar.descricao .*"mes":"out/i)
    ).toBeInTheDocument();
    expect(dialogo.getByText(/comparacaoBancosHoras.liberar.saldoUmBanco/)).toBeInTheDocument();
    fireEvent.click(dialogo.getByRole('button', { name: 'comparacaoBancosHoras.acoes.liberar' }));
    expect(estado.liberar).toHaveBeenCalledWith('e2');
  });

  it('liberada: só Voltar para legado, com o que vai para o legado e o motivo obrigatório', () => {
    renderizar();
    abrir('EMPRESA OMEGA');
    expect(screen.getByText(/comparacaoBancosHoras.liberadaTexto/)).toBeInTheDocument();
    for (const acao of ['recalcular', 'validar', 'desfazer', 'liberar'])
      expect(
        screen.queryByRole('button', { name: `comparacaoBancosHoras.acoes.${acao}` })
      ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'comparacaoBancosHoras.acoes.voltar' }));
    expect(lancamentosPedidos).toContain('e5');
    const dialogo = within(screen.getByRole('alertdialog'));
    expect(dialogo.getByText(/comparacaoBancosHoras.voltar.lancamentos/)).toBeInTheDocument();
    const confirmar = dialogo.getByRole('button', { name: 'comparacaoBancosHoras.acoes.voltar' });
    expect(confirmar).toBeDisabled();
    fireEvent.change(dialogo.getByLabelText(/comparacaoBancosHoras.voltar.motivo/), {
      target: { value: 'Banco errado' },
    });
    fireEvent.click(confirmar);
    expect(estado.voltar).toHaveBeenCalledWith({ empresaId: 'e5', motivo: 'Banco errado' });
  });

  it('validada: Ver Book de teste abre a prévia do último mês comparado e volta ao detalhe', () => {
    meses.meses = [mes(8), mes(9)];
    renderizar();
    abrir('EMPRESA BETA');
    fireEvent.click(
      screen.getByRole('button', { name: 'comparacaoBancosHoras.acoes.verBookTeste' })
    );
    expect(booksPedidos.at(-1)).toEqual(['e2', { mes: 9, ano: 2026 }]);
    expect(screen.getByText(/comparacaoBancosHoras.bookTeste.aviso/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /comparacaoBancosHoras.bookTeste.voltar/ }));
    expect(
      screen.getByRole('button', { name: 'comparacaoBancosHoras.acoes.liberar' })
    ).toBeInTheDocument();
  });

  it('validada: Enviar Saldo Parcial de teste para mim', () => {
    renderizar();
    abrir('EMPRESA BETA');
    fireEvent.click(
      screen.getByRole('button', { name: 'comparacaoBancosHoras.acoes.enviarSaldoTeste' })
    );
    expect(estado.enviarSaldoParcialTeste).toHaveBeenCalledWith({
      empresaId: 'e2',
      empresaNome: 'EMPRESA BETA',
    });
  });

  it('testes só para a empresa validada e ainda não liberada', () => {
    renderizar();
    abrir('EMPRESA ALFA');
    expect(
      screen.queryByRole('button', { name: 'comparacaoBancosHoras.acoes.verBookTeste' })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /comparacaoBancosHoras.titulo/ }));
    abrir('EMPRESA OMEGA');
    expect(
      screen.queryByRole('button', { name: 'comparacaoBancosHoras.acoes.enviarSaldoTeste' })
    ).not.toBeInTheDocument();
  });

  it('sem permissão de edição: sem Liberar nem Voltar para legado', () => {
    permissoes = ['bancos_horas_comparacao:view'];
    renderizar();
    abrir('EMPRESA OMEGA');
    expect(
      screen.queryByRole('button', { name: 'comparacaoBancosHoras.acoes.voltar' })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /comparacaoBancosHoras.titulo/ }));
    abrir('EMPRESA BETA');
    expect(
      screen.queryByRole('button', { name: 'comparacaoBancosHoras.acoes.liberar' })
    ).not.toBeInTheDocument();
  });
});
