import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { EdicaoMapeamento } from '../EdicaoMapeamento';
import type { Catalogo } from '@/types/catalogo';
import type { GrupoNaoMapeado, MapeamentoGrupo, UsoGrupo } from '@/types/dePara';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));
vi.mock('@/hooks/useUltimaAlteracao', () => ({ useUltimaAlteracao: () => 'Última alteração' }));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
// O Radix Select usa captura de ponteiro e rolagem, que o jsdom não implementa
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
const EXISTENTE: MapeamentoGrupo = {
  id: 'g1',
  grupoAranda: 'AMS DBA',
  grupoBook: 'DBA',
  solucaoId: 's1',
  produtoId: null,
  moduloId: null,
  classificacao: 'solucao',
  vinculos: [{ solucaoId: 's1', produtoId: null, moduloId: null }],
  ...autoria,
};
// Em dois lugares: o serviço da COMEX e o produto CE PLUS
const EM_DOIS: MapeamentoGrupo = {
  ...EXISTENTE,
  id: 'g2',
  grupoAranda: 'AMS INTEGRACAO',
  grupoBook: 'Integração',
  vinculos: [
    { solucaoId: 's1', produtoId: null, moduloId: null },
    { solucaoId: 's1', produtoId: 'ce', moduloId: null },
  ],
};
const USO: Record<string, UsoGrupo> = {
  g1: { apontamentos: 10, tickets: 2, empresasMultiplos: ['ALFA'] },
};
const NOVO: GrupoNaoMapeado = {
  grupoAranda: 'AMS NOVO',
  apontamentos: 5,
  tickets: 1,
  empresas: ['BETA'],
  primeiraOcorrencia: '2026-10-01',
};
const comuns = { catalogo: CATALOGO, mapeamentos: [EXISTENTE], uso: USO };
const renderizar = (ui: React.ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);
const campo = (nome: RegExp) => screen.getByLabelText(nome);

describe('EdicaoMapeamento', () => {
  it('mapear um grupo da aba de não mapeados: exige o Grupo do Book e grava o destino', async () => {
    const onSalvar = vi.fn(async () => undefined);
    const onFechar = vi.fn();
    renderizar(
      <EdicaoMapeamento
        {...comuns}
        mapeamento={null}
        grupoNovo={NOVO}
        onSalvar={onSalvar}
        onFechar={onFechar}
      />
    );
    expect(campo(/deParaGrupos.edicao.grupoAranda/)).toHaveValue('AMS NOVO');
    const mapear = screen.getByRole('button', { name: 'deParaGrupos.edicao.mapear' });
    expect(mapear).toBeDisabled();
    fireEvent.change(campo(/deParaGrupos.edicao.grupoBook/), { target: { value: ' Novo ' } });
    await userEvent.click(screen.getByRole('combobox', { name: 'deParaGrupos.destino.solucao' }));
    await userEvent.click(screen.getByRole('option', { name: 'COMEX' }));
    fireEvent.click(mapear);
    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith({
        grupoAranda: 'AMS NOVO',
        grupoBook: 'Novo',
        destino: { solucaoId: 's1', produtoId: null, moduloId: null },
      })
    );
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
  });

  it('novo: o grupo do Aranda não pode repetir', () => {
    renderizar(
      <EdicaoMapeamento {...comuns} mapeamento={null} onSalvar={vi.fn()} onFechar={vi.fn()} />
    );
    fireEvent.change(campo(/deParaGrupos.edicao.grupoAranda/), { target: { value: 'ams dba' } });
    fireEvent.change(campo(/deParaGrupos.edicao.grupoBook/), { target: { value: 'DBA' } });
    expect(screen.getByText('deParaGrupos.edicao.repetido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'deParaGrupos.edicao.mapear' })).toBeDisabled();
  });

  it('editar: o grupo do Aranda não muda; mudar o Grupo do Book pede confirmação', async () => {
    const onSalvar = vi.fn(async () => undefined);
    renderizar(
      <EdicaoMapeamento {...comuns} mapeamento={EXISTENTE} onSalvar={onSalvar} onFechar={vi.fn()} />
    );
    expect(campo(/deParaGrupos.edicao.grupoAranda/)).toBeDisabled();
    fireEvent.change(campo(/deParaGrupos.edicao.grupoBook/), {
      target: { value: 'Banco de dados' },
    });
    expect(screen.getByText('deParaGrupos.edicao.impactoBook')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ds.formulario.salvar' }));
    const dialogo = screen.getByRole('alertdialog', {
      name: 'deParaGrupos.edicao.confirmarTitulo',
    });
    expect(within(dialogo).getByText('deParaGrupos.edicao.confirmarBook')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ds.formulario.salvar' }));
    // O destino não mudou: os lugares do grupo ficam como estão
    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith({
        id: 'g1',
        grupoAranda: 'AMS DBA',
        grupoBook: 'Banco de dados',
      })
    );
  });

  it('grupo em mais de um lugar: o destino é só leitura, com os lugares e onde mudar', async () => {
    const onSalvar = vi.fn(async () => undefined);
    renderizar(
      <EdicaoMapeamento
        {...comuns}
        mapeamentos={[EXISTENTE, EM_DOIS]}
        mapeamento={EM_DOIS}
        onSalvar={onSalvar}
        onFechar={vi.fn()}
      />
    );
    expect(
      screen.queryByRole('combobox', { name: 'deParaGrupos.destino.solucao' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('deParaGrupos.destino.textoSolucao {"solucao":"COMEX"}')
    ).toBeInTheDocument();
    expect(
      screen.getByText('deParaGrupos.destino.textoProduto {"produto":"CE PLUS"}')
    ).toBeInTheDocument();
    expect(screen.getByText('deParaGrupos.edicao.variosLugares')).toBeInTheDocument();

    fireEvent.change(campo(/deParaGrupos.edicao.grupoBook/), { target: { value: 'Integração 2' } });
    fireEvent.click(screen.getByRole('button', { name: 'ds.formulario.salvar' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ds.formulario.salvar' })
    );
    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith({
        id: 'g2',
        grupoAranda: 'AMS INTEGRACAO',
        grupoBook: 'Integração 2',
      })
    );
  });

  it('mudar o destino avisa as empresas com bancos múltiplos afetadas', async () => {
    renderizar(
      <EdicaoMapeamento {...comuns} mapeamento={EXISTENTE} onSalvar={vi.fn()} onFechar={vi.fn()} />
    );
    await userEvent.click(screen.getByRole('combobox', { name: 'deParaGrupos.destino.solucao' }));
    await userEvent.click(
      screen.getByRole('option', { name: 'deParaGrupos.destino.nenhumaSolucao' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'ds.formulario.salvar' }));
    const dialogo = screen.getByRole('alertdialog', {
      name: 'deParaGrupos.edicao.confirmarTitulo',
    });
    expect(
      within(dialogo).getByText('deParaGrupos.edicao.confirmarMover {"empresas":"ALFA"}')
    ).toBeInTheDocument();
  });

  it('sem mudança, salvar só fecha', () => {
    const onSalvar = vi.fn();
    const onFechar = vi.fn();
    renderizar(
      <EdicaoMapeamento
        {...comuns}
        mapeamento={EXISTENTE}
        onSalvar={onSalvar}
        onFechar={onFechar}
      />
    );
    expect(screen.getByText('deParaGrupos.edicao.usoTexto.varios {"n":12}')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ds.formulario.salvar' }));
    expect(onSalvar).not.toHaveBeenCalled();
    expect(onFechar).toHaveBeenCalled();
  });
});
