import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AbaBancos } from '../AbaBancos';
import type { BancoCadastro } from '@/types/bancosHorasCadastro';
import type { Catalogo } from '@/types/catalogo';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));

const autoria = { atualizadoEm: '2026-10-22T12:00:00Z', atualizadoPor: null };
const banco = (id: string, extra: Partial<BancoCadastro> = {}): BancoCadastro => ({
  id,
  empresaId: 'e1',
  ordem: 1,
  ativo: true,
  visivelCliente: true,
  espelhaLegado: false,
  nome: id.toUpperCase(),
  descricao: null,
  padrao: false,
  tipoContrato: 'horas',
  periodoApuracao: 3,
  inicioVigencia: '2026-01-01',
  fimVigencia: null,
  diaInicioApuracao: 1,
  diaFimApuracao: 0,
  taxaProduto: 'OUTROS',
  taxaTipoHora: 'excedente',
  repasseEspecial: 'nenhum',
  duracaoPeriodoMeses: null,
  periodosAteZerar: null,
  consomeOutrosBancos: false,
  filtroIc: null,
  escopo: [],
  baselines: [
    {
      id: 'b1',
      dataInicio: '2026-01-01',
      dataFim: null,
      baselineMinutos: 600,
      baselineTickets: null,
      credito: 'mensal',
      motivo: null,
      ...autoria,
    },
  ],
  repasses: [
    {
      id: 'r1',
      dataInicio: '2026-01-01',
      dataFim: null,
      percentualMensal: 100,
      percentualDentroPeriodo: null,
      percentualEntrePeriodos: null,
      motivo: null,
      ...autoria,
    },
  ],
  ...autoria,
  ...extra,
});
const CATALOGO: Catalogo = {
  solucoes: [],
  produtos: [
    {
      id: 'ce',
      solucaoId: 's1',
      codigo: 'CE',
      nome: 'CE PLUS',
      descricao: null,
      ordem: 1,
      ativo: true,
      aClassificar: false,
      ...autoria,
    },
  ],
  modulos: [
    {
      id: 'cambio',
      produtoId: 'ce',
      nome: 'Câmbio',
      descricao: null,
      ordem: 1,
      ativo: true,
      ...autoria,
    },
  ],
};
const BANCOS = [
  banco('comex', {
    escopo: [{ produtoId: 'ce', moduloId: 'cambio' }],
    filtroIc: { operador: 'contem', valor: 'NIQUEL' },
    consomeOutrosBancos: true,
  }),
  banco('padrao', { padrao: true }),
  banco('antigo', { ativo: false }),
];
const props = {
  bancos: BANCOS,
  catalogo: CATALOGO,
  carregando: false,
  erro: null,
  podeEditar: true,
  onNovo: vi.fn(),
  onEditar: vi.fn(),
  onReordenar: vi.fn(async () => undefined),
  onInativar: vi.fn(async () => undefined),
  onReativar: vi.fn(async () => undefined),
  onTentarNovamente: vi.fn(),
};
const renderizar = (extra = {}) =>
  render(
    <TooltipProvider>
      <AbaBancos {...props} {...extra} />
    </TooltipProvider>
  );
const cartao = (nome: string) => within(screen.getByRole('article', { name: nome }));

describe('AbaBancos', () => {
  it('cartão com contrato, vigência, baseline, repasse, excedente e escopo', () => {
    renderizar();
    const c = cartao('COMEX');
    expect(c.getByText(/empresasCadastro.bancos.tipo.horas/)).toHaveTextContent(
      'empresasCadastro.bancos.periodo.3'
    );
    expect(
      c.getByText('empresasCadastro.bancos.vigenciaDesde {"inicio":"01/2026"}')
    ).toBeInTheDocument();
    expect(c.getByText('empresasCadastro.bancos.porMes {"valor":"10:00"}')).toBeInTheDocument();
    expect(c.getByText('empresasCadastro.bancos.percentual {"n":100}')).toBeInTheDocument();
    expect(
      c.getByText('empresasCadastro.bancos.produtoModulo {"produto":"CE PLUS","modulo":"Câmbio"}')
    ).toBeInTheDocument();
    expect(
      c.getByText(
        'empresasCadastro.bancos.filtroIc {"operador":"empresasCadastro.bancos.operador.contem","valor":"NIQUEL"}'
      )
    ).toBeInTheDocument();
    expect(c.getByText('empresasCadastro.bancos.consomeOutros')).toBeInTheDocument();
    expect(cartao('PADRAO').getByText('empresasCadastro.bancos.recebeResto')).toBeInTheDocument();
  });

  it('subir e descer gravam a nova ordem', async () => {
    const onReordenar = vi.fn(async () => undefined);
    renderizar({ onReordenar });
    expect(
      screen.getByRole('button', { name: 'empresasCadastro.bancos.subir {"nome":"COMEX"}' })
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'empresasCadastro.bancos.descer {"nome":"COMEX"}' })
    );
    await waitFor(() => expect(onReordenar).toHaveBeenCalledWith(['padrao', 'comex', 'antigo']));
  });

  it('inativar pede o motivo; o padrão não inativa; o inativo reativa', async () => {
    const onInativar = vi.fn(async () => undefined);
    const onReativar = vi.fn(async () => undefined);
    renderizar({ onInativar, onReativar });
    expect(
      screen.getByRole('button', { name: 'empresasCadastro.bancos.inativar {"nome":"PADRAO"}' })
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'empresasCadastro.bancos.inativar {"nome":"COMEX"}' })
    );
    const dialogo = screen.getByRole('alertdialog', {
      name: 'empresasCadastro.bancos.inativarTitulo {"nome":"COMEX"}',
    });
    fireEvent.change(within(dialogo).getByLabelText(/empresasCadastro.bancos.motivo/), {
      target: { value: 'Fim do contrato' },
    });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'fase3Comum.inativar' }));
    await waitFor(() => expect(onInativar).toHaveBeenCalledWith(BANCOS[0], 'Fim do contrato'));

    fireEvent.click(
      screen.getByRole('button', { name: 'empresasCadastro.bancos.reativar {"nome":"ANTIGO"}' })
    );
    fireEvent.click(
      within(
        screen.getByRole('alertdialog', {
          name: 'empresasCadastro.bancos.reativarTitulo {"nome":"ANTIGO"}',
        })
      ).getByRole('button', { name: 'fase3Comum.reativar' })
    );
    await waitFor(() => expect(onReativar).toHaveBeenCalledWith(BANCOS[2]));
  });

  it('editar e novo banco chamam a tela; só visualiza mostra a prioridade sem botões', () => {
    const onEditar = vi.fn();
    const onNovo = vi.fn();
    const { unmount } = renderizar({ onEditar, onNovo });
    fireEvent.click(
      screen.getByRole('button', { name: 'empresasCadastro.bancos.editarBanco {"nome":"COMEX"}' })
    );
    expect(onEditar).toHaveBeenCalledWith(BANCOS[0]);
    fireEvent.click(screen.getByRole('button', { name: 'empresasCadastro.bancos.novo' }));
    expect(onNovo).toHaveBeenCalled();
    unmount();
    renderizar({ podeEditar: false });
    expect(
      screen.getByLabelText('empresasCadastro.bancos.prioridadeN {"n":1}')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /editarBanco/ })).not.toBeInTheDocument();
  });

  it('sem bancos, convida a criar o Banco padrão', () => {
    const onNovo = vi.fn();
    renderizar({ bancos: [], onNovo });
    expect(screen.getByText('empresasCadastro.bancos.vazioTitulo')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'empresasCadastro.edicaoBanco.novoPadrao' })
    );
    expect(onNovo).toHaveBeenCalled();
  });

  it('erro, com tentar novamente', () => {
    const onTentarNovamente = vi.fn();
    renderizar({ erro: new Error('x'), onTentarNovamente });
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.tentarNovamente' }));
    expect(onTentarNovamente).toHaveBeenCalled();
  });
});
