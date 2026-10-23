import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { IdentidadeEmpresa } from '../IdentidadeEmpresa';
import { EdicaoAmsProjetos } from '../EdicaoAmsProjetos';
import type { EmpresaDetalhe } from '@/types/empresas';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

const EMPRESA = {
  id: 'e1',
  nomeAbreviado: 'ALFA',
  nomeCompleto: 'ALFA INDÚSTRIA LTDA',
  grupoEmpresarial: null,
  status: 'ativo',
  modelo: 'multiplo',
  vigenciaInicio: '2026-01-01',
  vigenciaFim: null,
  emailCs: 'cs@sonda.com',
  emailComercial: null,
  emailTm: null,
  observacao: 'Cliente estratégico',
  emProjeto: true,
  idAranda: null,
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
    {
      id: 'es2',
      solucaoId: 's2',
      codigo: 'FISCAIS',
      nome: 'FISCAIS',
      temAms: false,
      emProjeto: true,
      justificativaProjeto: 'Implantação',
    },
  ],
  anexos: [
    { id: 'a1', nome: 'contrato.pdf', tamanhoBytes: 1000, storagePath: 'empresas/e1/contrato.pdf' },
  ],
  atualizadoEm: '2026-10-22T12:00:00Z',
  atualizadoPor: null,
} as unknown as EmpresaDetalhe;

const renderizar = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <TooltipProvider>{ui}</TooltipProvider>
    </MemoryRouter>
  );

describe('IdentidadeEmpresa', () => {
  it('mostra os dados que vêm da tela atual, com — no que falta', () => {
    renderizar(
      <IdentidadeEmpresa
        empresa={EMPRESA}
        podeEditar={false}
        onEditarAms={vi.fn()}
        onBaixarAnexo={vi.fn()}
      />
    );
    expect(screen.getByText('ALFA INDÚSTRIA LTDA')).toBeInTheDocument();
    expect(
      screen.getByText(
        'empresasCadastro.identidade.vigenciaAte {"inicio":"01/01/2026","fim":"empresasCadastro.identidade.semFim"}'
      )
    ).toBeInTheDocument();
    const solucoes = within(
      screen.getByRole('list', { name: 'empresasCadastro.identidade.solucoes' })
    );
    expect(solucoes.getByText('empresasCadastro.identidade.ams')).toBeInTheDocument();
    expect(solucoes.getByText('empresasCadastro.identidade.semAms')).toBeInTheDocument();
    expect(
      solucoes.getByLabelText(
        'empresasCadastro.identidade.emProjetoDe {"justificativa":"Implantação"}'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Cliente estratégico')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /amsEProjetos/ })).not.toBeInTheDocument();
  });

  it('anexo baixa pelo clique; quem edita tem AMS e projetos e o atalho para a tela atual', () => {
    const onBaixarAnexo = vi.fn();
    const onEditarAms = vi.fn();
    renderizar(
      <IdentidadeEmpresa
        empresa={EMPRESA}
        podeEditar
        onEditarAms={onEditarAms}
        onBaixarAnexo={onBaixarAnexo}
      />
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'empresasCadastro.identidade.baixar {"nome":"contrato.pdf"}',
      })
    );
    expect(onBaixarAnexo).toHaveBeenCalledWith(EMPRESA.anexos[0]);
    fireEvent.click(
      screen.getByRole('button', { name: 'empresasCadastro.identidade.amsEProjetos' })
    );
    expect(onEditarAms).toHaveBeenCalled();
    expect(
      screen.getByRole('link', { name: 'empresasCadastro.editarNaTelaAtual' })
    ).toHaveAttribute('href', '/admin/empresas-clientes');
  });
});

describe('EdicaoAmsProjetos', () => {
  it('liga e desliga AMS; colocar em projeto pede a justificativa; salva todas as soluções', async () => {
    const onSalvar = vi.fn(async () => undefined);
    const onFechar = vi.fn();
    renderizar(<EdicaoAmsProjetos empresa={EMPRESA} onFechar={onFechar} onSalvar={onSalvar} />);

    fireEvent.click(
      screen.getByRole('switch', { name: 'empresasCadastro.ams.amsEm {"solucao":"FISCAIS"}' })
    );
    fireEvent.click(
      screen.getByRole('switch', { name: 'empresasCadastro.ams.projetoDe {"solucao":"COMEX"}' })
    );
    const dialogo = screen.getByRole('alertdialog', {
      name: 'empresasCadastro.ams.projetoTitulo {"solucao":"COMEX"}',
    });
    const confirmar = within(dialogo).getByRole('button', {
      name: 'empresasCadastro.ams.colocarEmProjeto',
    });
    expect(confirmar).toBeDisabled();
    fireEvent.change(within(dialogo).getByLabelText(/empresasCadastro.ams.justificativa/), {
      target: { value: ' Migração ' },
    });
    fireEvent.click(confirmar);
    expect(screen.getByText('Migração')).toBeInTheDocument();

    // Tirar do projeto apaga a justificativa
    fireEvent.click(
      screen.getByRole('switch', { name: 'empresasCadastro.ams.projetoDe {"solucao":"FISCAIS"}' })
    );

    fireEvent.click(screen.getByRole('button', { name: 'ds.formulario.salvar' }));
    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith([
        { id: 'es1', temAms: true, emProjeto: true, justificativaProjeto: 'Migração' },
        { id: 'es2', temAms: true, emProjeto: false, justificativaProjeto: null },
      ])
    );
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
  });

  it('tirar o AMS de todas avisa que a empresa deixa de ter Book', () => {
    renderizar(<EdicaoAmsProjetos empresa={EMPRESA} onFechar={vi.fn()} onSalvar={vi.fn()} />);
    fireEvent.click(
      screen.getByRole('switch', { name: 'empresasCadastro.ams.amsEm {"solucao":"COMEX"}' })
    );
    expect(screen.getByText('empresasCadastro.ams.semAmsAviso')).toBeInTheDocument();
  });

  it('editar a justificativa existente', () => {
    renderizar(<EdicaoAmsProjetos empresa={EMPRESA} onFechar={vi.fn()} onSalvar={vi.fn()} />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'empresasCadastro.ams.editarJustificativa {"solucao":"FISCAIS"}',
      })
    );
    const dialogo = screen.getByRole('alertdialog');
    expect(within(dialogo).getByLabelText(/empresasCadastro.ams.justificativa/)).toHaveValue(
      'Implantação'
    );
    fireEvent.change(within(dialogo).getByLabelText(/empresasCadastro.ams.justificativa/), {
      target: { value: 'Implantação até 03/2027' },
    });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ds.formulario.salvar' }));
    expect(screen.getByText('Implantação até 03/2027')).toBeInTheDocument();
  });
});
