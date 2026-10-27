import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { EdicaoBanco } from '../EdicaoBanco';
import type { BancoCadastro } from '@/types/bancosHorasCadastro';
import type { Catalogo } from '@/types/catalogo';
import type { EmpresaDetalhe } from '@/types/empresas';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));
vi.mock('@/hooks/useUltimaAlteracao', async (original) => ({
  ...(await original<typeof import('@/hooks/useUltimaAlteracao')>()),
  useUltimaAlteracao: () => undefined,
}));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const autoria = { atualizadoEm: '2026-10-22T12:00:00Z', atualizadoPor: null };
const CATALOGO: Catalogo = {
  solucoes: [{ id: 's1', codigo: 'COMEX', nome: 'COMEX', ordem: 1, ativo: true, ...autoria }],
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
  modulos: [],
};
const EMPRESA = {
  id: 'e1',
  nomeAbreviado: 'ALFA',
  vigenciaInicio: '2026-01-01',
  solucoes: [
    {
      id: 'es1',
      solucaoId: 's1',
      codigo: 'COMEX',
      nome: 'COMEX',
      temAms: true,
      emProjeto: false,
      justificativaProjeto: null,
    },
  ],
} as unknown as EmpresaDetalhe;
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
  periodoApuracao: 1,
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
      id: 'v1',
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
const PADRAO = banco('padrao', { padrao: true });

const renderizar = (props: Partial<React.ComponentProps<typeof EdicaoBanco>> = {}) =>
  render(
    <TooltipProvider>
      <EdicaoBanco
        empresa={EMPRESA}
        banco={null}
        bancos={[PADRAO]}
        catalogo={CATALOGO}
        mesAtual="2026-10-01"
        onFechar={vi.fn()}
        onCriar={vi.fn(async () => undefined)}
        onSalvar={vi.fn(async () => undefined)}
        onNovaVigencia={vi.fn(async () => undefined)}
        {...props}
      />
    </TooltipProvider>
  );
const campo = (nome: RegExp) => screen.getByLabelText(nome, { selector: 'input' });

describe('EdicaoBanco', () => {
  it('primeiro banco da empresa é o Banco padrão, sem escopo; cria com baseline e repasse', async () => {
    const onCriar = vi.fn(async () => undefined);
    const onFechar = vi.fn();
    renderizar({ bancos: [], onCriar, onFechar });
    expect(
      screen.getByRole('heading', { name: 'empresasCadastro.edicaoBanco.novoPadrao' })
    ).toBeInTheDocument();
    expect(screen.queryByText('empresasCadastro.edicaoBanco.escopo')).not.toBeInTheDocument();
    const criar = screen.getByRole('button', { name: 'empresasCadastro.edicaoBanco.criar' });
    expect(criar).toBeDisabled();
    fireEvent.change(campo(/empresasCadastro.edicaoBanco.nome/), {
      target: { value: ' Banco padrão ' },
    });
    fireEvent.change(campo(/empresasCadastro.edicaoBanco.baselineHoras/), {
      target: { value: '40:00' },
    });
    fireEvent.click(criar);
    await waitFor(() =>
      expect(onCriar).toHaveBeenCalledWith(
        expect.objectContaining({
          empresaId: 'e1',
          nome: ' Banco padrão ',
          padrao: true,
          escopo: [],
          inicioVigencia: '2026-10-01',
          baseline: { baselineMinutos: 2400, baselineTickets: null, credito: 'mensal' },
          repasse: {
            percentualMensal: 100,
            percentualDentroPeriodo: null,
            percentualEntrePeriodos: null,
          },
        })
      )
    );
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
  });

  it('banco novo precisa de escopo ou filtro e de um nome que não repete', () => {
    renderizar();
    fireEvent.change(campo(/empresasCadastro.edicaoBanco.nome/), { target: { value: 'padrao' } });
    expect(screen.getByText('empresasCadastro.edicaoBanco.nomeRepetido')).toBeInTheDocument();
    fireEvent.change(campo(/empresasCadastro.edicaoBanco.nome/), { target: { value: 'COMEX' } });
    fireEvent.change(campo(/empresasCadastro.edicaoBanco.baselineHoras/), {
      target: { value: '10:00' },
    });
    expect(screen.getByText('empresasCadastro.edicaoBanco.semEscopo')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'empresasCadastro.edicaoBanco.criar' })
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'empresasCadastro.edicaoBanco.inteiro {"produto":"CE PLUS"}',
      })
    );
    expect(screen.getByText('empresasCadastro.edicaoBanco.semConflito')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'empresasCadastro.edicaoBanco.criar' })
    ).toBeEnabled();
  });

  it('editar: as vigências aparecem com histórico; salvar manda os parâmetros com o escopo', async () => {
    const onSalvar = vi.fn(async () => undefined);
    const existente = banco('comex', { escopo: [{ produtoId: 'ce', moduloId: null }] });
    renderizar({ banco: existente, bancos: [PADRAO, existente], onSalvar });
    expect(
      screen.getByRole('heading', { name: 'empresasCadastro.edicaoBanco.editar {"nome":"COMEX"}' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('empresasCadastro.bancos.porMes {"valor":"10:00"}')
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/empresasCadastro.edicaoBanco.baselineHoras/, { selector: 'input' })
    ).not.toBeInTheDocument();
    fireEvent.change(campo(/empresasCadastro.edicaoBanco.descricao/), {
      target: { value: 'Banco do COMEX' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ds.formulario.salvar' }));
    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(
        'comex',
        expect.objectContaining({
          descricao: 'Banco do COMEX',
          escopo: [{ produtoId: 'ce', moduloId: null }],
        })
      )
    );
  });

  it('repasse por período: meses × períodos precisa fechar o período de apuração', () => {
    const existente = banco('comex', {
      escopo: [{ produtoId: 'ce', moduloId: null }],
      periodoApuracao: 6,
    });
    renderizar({ banco: existente, bancos: [PADRAO, existente] });
    fireEvent.click(
      screen.getByRole('switch', { name: 'empresasCadastro.edicaoBanco.repassePorPeriodo' })
    );
    fireEvent.change(campo(/empresasCadastro.edicaoBanco.mesesPorPeriodo/), {
      target: { value: '4' },
    });
    fireEvent.change(campo(/empresasCadastro.edicaoBanco.periodosAteZerar/), {
      target: { value: '2' },
    });
    expect(
      screen.getByText('empresasCadastro.edicaoBanco.periodoNaoFecha {"n":6}')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ds.formulario.salvar' })).toBeDisabled();
    fireEvent.change(campo(/empresasCadastro.edicaoBanco.mesesPorPeriodo/), {
      target: { value: '3' },
    });
    expect(screen.getByRole('button', { name: 'ds.formulario.salvar' })).toBeEnabled();
  });

  it('consumo entre bancos só com outro banco do mesmo tipo e apuração', () => {
    const existente = banco('comex', {
      escopo: [{ produtoId: 'ce', moduloId: null }],
      tipoContrato: 'tickets',
    });
    renderizar({ banco: existente, bancos: [PADRAO, existente] });
    const consumo = screen.getByRole('switch', { name: 'empresasCadastro.edicaoBanco.consome' });
    expect(consumo).toBeDisabled();
    expect(screen.getByText('empresasCadastro.edicaoBanco.nenhumElegivel')).toBeInTheDocument();
    const lista = within(
      screen.getByRole('list', { name: 'empresasCadastro.edicaoBanco.consumo' })
    );
    expect(lista.getByText(/PADRAO/)).toHaveTextContent('empresasCadastro.edicaoBanco.motivoTipo');
  });
});
