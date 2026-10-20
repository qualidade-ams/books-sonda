import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (chave: string) => chave, i18n: { language: 'pt-BR' } }),
}));

const empresasMock = vi.fn<(...args: any[]) => any>();
vi.mock('@/hooks/useSyncAgendamentos', () => ({
  useEmpresasBook: (...args: any[]) => empresasMock(...args),
}));

import { SeletorEmpresasBooks } from '../SeletorEmpresasBooks';

const EMPRESAS = [
  { id: 'e1', nome: 'ABBOTT' },
  { id: 'e2', nome: 'HYPERA PHARMA' },
  { id: 'e3', nome: 'VOTORANTIM' },
];

describe('SeletorEmpresasBooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    empresasMock.mockReturnValue({ empresas: EMPRESAS, isLoading: false, error: null });
  });

  function renderizar(props: Partial<React.ComponentProps<typeof SeletorEmpresasBooks>> = {}) {
    const onChangeModo = vi.fn();
    const onChangeEmpresaIds = vi.fn();
    render(
      <SeletorEmpresasBooks
        modo="todas"
        empresaIds={[]}
        onChangeModo={onChangeModo}
        onChangeEmpresaIds={onChangeEmpresaIds}
        {...props}
      />
    );
    return { onChangeModo, onChangeEmpresaIds };
  }

  it('em "todas" não mostra a lista de empresas', () => {
    renderizar();
    expect(screen.getByLabelText('sincronizacaoSql.empresas.todas')).toBeChecked();
    expect(screen.queryByText('VOTORANTIM')).not.toBeInTheDocument();
  });

  it('escolher "somente selecionadas" avisa o formulário', () => {
    const { onChangeModo } = renderizar();
    fireEvent.click(screen.getByLabelText('sincronizacaoSql.empresas.selecionadas'));
    expect(onChangeModo).toHaveBeenCalledWith('selecionadas');
  });

  it('em "selecionadas" lista as empresas e marca/desmarca', () => {
    const { onChangeEmpresaIds } = renderizar({ modo: 'selecionadas', empresaIds: ['e1'] });

    expect(screen.getByRole('checkbox', { name: 'ABBOTT' })).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'VOTORANTIM' }));
    expect(onChangeEmpresaIds).toHaveBeenLastCalledWith(['e1', 'e3']);

    fireEvent.click(screen.getByRole('checkbox', { name: 'ABBOTT' }));
    expect(onChangeEmpresaIds).toHaveBeenLastCalledWith([]);
  });

  it('busca filtra pelo nome', () => {
    renderizar({ modo: 'selecionadas' });
    fireEvent.change(screen.getByPlaceholderText('sincronizacaoSql.empresas.buscar'), { target: { value: 'hyp' } });

    expect(screen.getByText('HYPERA PHARMA')).toBeInTheDocument();
    expect(screen.queryByText('ABBOTT')).not.toBeInTheDocument();
  });

  it('mostra o erro de validação', () => {
    renderizar({ modo: 'selecionadas', erro: 'sincronizacaoSql.validacao.empresaObrigatoria' });
    expect(screen.getByText('sincronizacaoSql.validacao.empresaObrigatoria')).toBeInTheDocument();
  });

  it('só busca as empresas quando a lista é necessária', () => {
    renderizar();
    expect(empresasMock).toHaveBeenLastCalledWith(false);
  });
});
