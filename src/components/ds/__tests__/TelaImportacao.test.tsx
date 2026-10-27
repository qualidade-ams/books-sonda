import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TelaImportacao } from '@/components/ds/TelaImportacao';
import { lerPlanilha, type LinhaPlanilha } from '@/utils/importarPlanilha';
import { exportarTabela } from '@/utils/exportarTabela';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));
vi.mock('@/utils/importarPlanilha', async (original) => ({
  ...(await original<typeof import('@/utils/importarPlanilha')>()),
  lerPlanilha: vi.fn(),
}));
vi.mock('@/utils/exportarTabela', async (original) => ({
  ...(await original<typeof import('@/utils/exportarTabela')>()),
  exportarTabela: vi.fn(async () => undefined),
}));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

const COLUNAS = [
  { id: 'codigo', rotulo: 'Código', obrigatoria: true },
  { id: 'horas', rotulo: 'Conta horas' },
];
// Conferência fictícia: "novo" vira novo, "muda" já existe e muda, "igual" já existe, o resto é erro
const conferir = (linhas: LinhaPlanilha[]) =>
  linhas.map((l) => {
    const c = l.valores.codigo;
    if (c === 'novo' || c === 'muda' || c === 'igual')
      return {
        ...l,
        situacao:
          c === 'muda'
            ? ('atualiza' as const)
            : c === 'novo'
              ? ('novo' as const)
              : ('igual' as const),
      };
    return { ...l, situacao: 'erro' as const, erros: [`Código ${c} inválido.`] };
  });

const props = {
  voltarPara: 'Regras',
  titulo: 'Importar códigos',
  colunas: COLUNAS,
  regras: ['Uma regra.'],
  modelo: { arquivo: 'modelo-codigos', exemplo: [{ codigo: 'Consultoria', horas: 'Sim' }] },
  conferir,
};

const enviar = async (nome = 'codigos.xlsx') => {
  fireEvent.change(screen.getByLabelText(/ds.importar.escolher/), {
    target: { files: [new File(['x'], nome)] },
  });
  await screen.findByRole('group', { name: 'ds.importar.mostrar' });
};

describe('TelaImportacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(lerPlanilha).mockResolvedValue([
      ['Código', 'Conta horas'],
      ['novo', 'Sim'],
      ['muda', 'Não'],
      ['igual', 'Sim'],
      ['xx', 'Sim'],
    ]);
  });

  it('baixa o modelo com as colunas e o exemplo', async () => {
    render(<TelaImportacao {...props} onImportar={vi.fn()} onFechar={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /ds.importar.baixarModelo/ }));
    await waitFor(() => expect(exportarTabela).toHaveBeenCalled());
    const [modelo, formato] = vi.mocked(exportarTabela).mock.calls[0];
    expect(formato).toBe('xlsx');
    expect(modelo.arquivo).toBe('modelo-codigos');
    expect(modelo.abas[0].colunas.map((c) => c.rotulo)).toEqual(['Código', 'Conta horas']);
    expect(modelo.abas[0].linhas).toEqual([{ codigo: 'Consultoria', horas: 'Sim' }]);
  });

  it('confere a planilha e importa os novos e os que mudam; erro fica de fora', async () => {
    const onImportar = vi.fn().mockResolvedValue(undefined);
    const onFechar = vi.fn();
    render(<TelaImportacao {...props} onImportar={onImportar} onFechar={onFechar} />);
    await enviar();

    const filtros = screen.getByRole('group', { name: 'ds.importar.mostrar' });
    expect(within(filtros).getByText('ds.importar.ver.erro {"n":1}')).toBeInTheDocument();
    expect(screen.getByText('Código xx inválido.')).toBeInTheDocument();
    expect(screen.getByText(/ds.importar.comErro.um/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ds.importar.importarN.varios {"n":2}' }));
    const dialogo = screen.getByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ds.importar.botao' }));
    await waitFor(() => expect(onImportar).toHaveBeenCalled());
    expect(onImportar.mock.calls[0][0].map((l: LinhaPlanilha) => l.valores.codigo)).toEqual([
      'novo',
      'muda',
    ]);
    expect(onFechar).toHaveBeenCalled();
  });

  it('ignorar as que já existem importa só os novos', async () => {
    const onImportar = vi.fn().mockResolvedValue(undefined);
    render(<TelaImportacao {...props} onImportar={onImportar} onFechar={vi.fn()} />);
    await enviar();
    fireEvent.click(screen.getByRole('radio', { name: 'ds.importar.ignorar' }));
    fireEvent.click(screen.getByRole('button', { name: 'ds.importar.importarN.um {"n":1}' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ds.importar.botao' })
    );
    await waitFor(() => expect(onImportar).toHaveBeenCalled());
    expect(onImportar.mock.calls[0][0]).toHaveLength(1);
  });

  it('sem poder atualizar, não oferece a escolha e o que já existe fica de fora', async () => {
    render(
      <TelaImportacao {...props} podeAtualizar={false} onImportar={vi.fn()} onFechar={vi.fn()} />
    );
    await enviar();
    expect(screen.queryByRole('radio', { name: 'ds.importar.atualizar' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'ds.importar.importarN.um {"n":1}' })
    ).toBeInTheDocument();
  });

  it('coluna obrigatória faltando: avisa e não confere', async () => {
    vi.mocked(lerPlanilha).mockResolvedValue([['Conta horas'], ['Sim']]);
    render(<TelaImportacao {...props} onImportar={vi.fn()} onFechar={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/ds.importar.escolher/), {
      target: { files: [new File(['x'], 'codigos.xlsx')] },
    });
    expect(
      await screen.findByText('ds.importar.faltando {"colunas":"Código"}')
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'ds.importar.mostrar' })).not.toBeInTheDocument();
  });

  it('arquivo que não abre: avisa', async () => {
    vi.mocked(lerPlanilha).mockRejectedValue(new Error('corrompido'));
    render(<TelaImportacao {...props} onImportar={vi.fn()} onFechar={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/ds.importar.escolher/), {
      target: { files: [new File(['x'], 'codigos.xlsx')] },
    });
    expect(await screen.findByText('ds.importar.erroLeitura')).toBeInTheDocument();
  });
});
