import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AbaInformacoes } from '../AbaInformacoes';
import type { ContratoFiscal, EmpresaDetalhe } from '@/types/empresas';
import type { RamoAtividade } from '@/types/ramosAtividade';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const FISCAL_VAZIO: ContratoFiscal = {
  modalidade: null,
  edocs24x7: null,
  atualizacaoContratada: null,
  atualizacoesPorAno: null,
  dba: null,
  minutosAtendimento: null,
  minutosMonitoramento: null,
  bancoDados: null,
};
const ramo = (id: string, nome: string, ativo = true) =>
  ({ id, nome, ativo, ordem: 1, empresasPrincipal: 0, empresasSecundario: 0 }) as RamoAtividade;
const RAMOS = [ramo('r1', 'Agronegócio'), ramo('r2', 'Indústria'), ramo('r3', 'Antigo', false)];
const solucao = (codigo: string) => ({
  id: `es-${codigo}`,
  solucaoId: `s-${codigo}`,
  codigo,
  nome: codigo,
  temAms: true,
  emProjeto: false,
  justificativaProjeto: null,
});
const empresa = (extra: Partial<EmpresaDetalhe> = {}) =>
  ({
    id: 'e1',
    idAranda: null,
    solucoes: [solucao('COMEX'), solucao('FISCAIS')],
    organizacoes: [{ id: 'o1', nome: 'ALFA SA' }],
    informacoes: {
      ramoId: null,
      ramoSecundarioId: null,
      descricaoAtividade: null,
      fiscal: FISCAL_VAZIO,
    },
    ...extra,
  }) as unknown as EmpresaDetalhe;

const renderizar = (props: Partial<React.ComponentProps<typeof AbaInformacoes>> = {}) =>
  render(
    <TooltipProvider>
      <AbaInformacoes
        empresa={empresa()}
        ramos={RAMOS}
        podeEditar
        onSalvar={vi.fn(async () => undefined)}
        {...props}
      />
    </TooltipProvider>
  );

describe('AbaInformacoes (edição)', () => {
  it('organizações em maiúsculas, sem repetir; ramo e secundário; salva o rascunho', async () => {
    const onSalvar = vi.fn(async () => undefined);
    renderizar({ onSalvar });
    const nova = screen.getByRole('textbox', {
      name: 'empresasCadastro.informacoes.novaOrganizacao',
    });
    fireEvent.change(nova, { target: { value: 'alfa sa' } });
    fireEvent.click(screen.getByRole('button', { name: 'empresasCadastro.informacoes.adicionar' }));
    expect(
      screen.getByText('empresasCadastro.informacoes.organizacaoRepetida')
    ).toBeInTheDocument();
    fireEvent.change(nova, { target: { value: 'alfa filial' } });
    fireEvent.keyDown(nova, { key: 'Enter' });
    expect(screen.getByText('ALFA FILIAL')).toBeInTheDocument();
    expect(screen.getByText('empresasCadastro.informacoes.naoSalvo')).toBeInTheDocument();

    // Campo obrigatório: o rótulo leva o asterisco
    await userEvent.click(
      screen.getByRole('combobox', { name: /^empresasCadastro\.informacoes\.ramo( \*)?$/ })
    );
    expect(screen.queryByRole('option', { name: 'Antigo' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'Agronegócio' }));
    await userEvent.click(
      screen.getByRole('combobox', { name: 'empresasCadastro.informacoes.ramoSecundario' })
    );
    expect(screen.queryByRole('option', { name: 'Agronegócio' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'Indústria' }));

    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.salvar' }));
    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith({
        idAranda: null,
        organizacoes: ['ALFA SA', 'ALFA FILIAL'],
        informacoes: {
          ramoId: 'r1',
          ramoSecundarioId: 'r2',
          descricaoAtividade: null,
          fiscal: {
            ...FISCAL_VAZIO,
            modalidade: 'on_premise',
            edocs24x7: false,
            atualizacaoContratada: false,
            dba: 'nao_contratado',
            bancoDados: 'sql_server',
          },
        },
      })
    );
  });

  it('Contrato FISCAL com o padrão; SaaS esconde DBA e banco; DBA pede as horas válidas', () => {
    renderizar();
    const fiscal = within(
      screen.getByRole('region', { name: 'empresasCadastro.informacoes.fiscal' })
    );
    expect(
      fiscal.getByRole('radio', { name: 'empresasCadastro.informacoes.onPremise' })
    ).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(
      fiscal.getByRole('radio', { name: 'empresasCadastro.informacoes.dbaOpcoes.atendimento' })
    );
    fireEvent.change(
      fiscal.getByLabelText(/empresasCadastro.informacoes.horasAtendimento/, { selector: 'input' }),
      {
        target: { value: '1' },
      }
    );
    expect(screen.getByText('empresasCadastro.informacoes.horasInvalidas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'fase3Comum.salvar' })).toBeDisabled();

    fireEvent.click(fiscal.getByRole('radio', { name: 'empresasCadastro.informacoes.saas' }));
    expect(
      fiscal.queryByRole('radiogroup', { name: 'empresasCadastro.informacoes.dba' })
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(
        fiscal.getByRole('radiogroup', { name: 'empresasCadastro.informacoes.atualizacao' })
      ).getByRole('radio', {
        name: 'empresasCadastro.informacoes.sim',
      })
    );
    expect(
      fiscal.getByLabelText(/empresasCadastro.informacoes.atualizacoesAno/, { selector: 'input' })
    ).toBeInTheDocument();
  });

  it('sem FISCAIS, não há Contrato FISCAL; descartar volta ao salvo', () => {
    renderizar({ empresa: empresa({ solucoes: [solucao('COMEX')] } as Partial<EmpresaDetalhe>) });
    expect(
      screen.queryByRole('region', { name: 'empresasCadastro.informacoes.fiscal' })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ds.formulario.remover/ }));
    expect(screen.queryByText('ALFA SA')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.descartar' }));
    expect(screen.getByText('ALFA SA')).toBeInTheDocument();
    expect(screen.queryByText('empresasCadastro.informacoes.naoSalvo')).not.toBeInTheDocument();
  });
});

describe('AbaInformacoes (leitura)', () => {
  it('mostra o que está gravado; o que falta aparece como pendente ou —', () => {
    renderizar({
      podeEditar: false,
      empresa: empresa({
        informacoes: {
          ramoId: null,
          ramoSecundarioId: null,
          descricaoAtividade: null,
          fiscal: {
            ...FISCAL_VAZIO,
            modalidade: 'on_premise',
            atualizacaoContratada: true,
            atualizacoesPorAno: 2,
            dba: 'atendimento',
            minutosAtendimento: 600,
          },
        },
      } as Partial<EmpresaDetalhe>),
    });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('empresasCadastro.informacoes.naoInformado')).toBeInTheDocument();
    expect(screen.getByText('empresasCadastro.informacoes.porAno {"n":2}')).toBeInTheDocument();
    expect(
      screen.getByText('empresasCadastro.informacoes.porMes {"horas":"10:00"}')
    ).toBeInTheDocument();
    expect(screen.getByText('ALFA SA')).toBeInTheDocument();
  });
});
