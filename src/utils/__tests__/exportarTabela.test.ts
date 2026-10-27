import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  exportarTabela,
  larguras,
  matrizDaAba,
  nomeDoArquivo,
  nomesDasAbas,
  type AbaExportacao,
} from '../exportarTabela';

const xlsx = vi.hoisted(() => ({
  book_new: vi.fn(() => ({ planilhas: [] as string[] })),
  aoa_to_sheet: vi.fn((matriz: unknown[][]) => ({ matriz })),
  book_append_sheet: vi.fn(),
  writeFile: vi.fn(),
}));
vi.mock('xlsx', () => ({
  utils: {
    book_new: xlsx.book_new,
    aoa_to_sheet: xlsx.aoa_to_sheet,
    book_append_sheet: xlsx.book_append_sheet,
  },
  writeFile: xlsx.writeFile,
}));

const pdf = vi.hoisted(() => ({
  instancias: [] as { addPage: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> }[],
  autoTable: vi.fn(),
}));
vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => {
    const doc = {
      addPage: vi.fn(),
      save: vi.fn(),
      text: vi.fn(),
      setFontSize: vi.fn(),
    };
    pdf.instancias.push(doc);
    return doc;
  }),
}));
vi.mock('jspdf-autotable', () => ({ default: pdf.autoTable }));

type Ramo = { nome: string; empresas: number | null };
const RAMOS: AbaExportacao<Ramo> = {
  nome: 'Ramos',
  colunas: [
    { rotulo: 'Ramo', valor: (r) => r.nome },
    { rotulo: 'Empresas', valor: (r) => r.empresas },
  ],
  linhas: [
    { nome: 'Varejo', empresas: 3 },
    { nome: 'Químico e Petroquímico', empresas: null },
  ],
};
const HOJE = new Date(2026, 9, 7, 23, 30);

describe('exportarTabela', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pdf.instancias.length = 0;
  });

  it('a matriz tem o cabeçalho e uma linha por item; vazio vira texto vazio', () => {
    expect(matrizDaAba(RAMOS)).toEqual([
      ['Ramo', 'Empresas'],
      ['Varejo', 3],
      ['Químico e Petroquímico', ''],
    ]);
  });

  it('o nome do arquivo leva a data local', () => {
    expect(nomeDoArquivo('ramos-de-atividade', 'xlsx', HOJE)).toBe(
      'ramos-de-atividade-2026-10-07.xlsx'
    );
    expect(nomeDoArquivo('ramos-de-atividade', 'pdf', HOJE)).toBe(
      'ramos-de-atividade-2026-10-07.pdf'
    );
  });

  it('nomes das abas seguem os limites do Excel: até 31 caracteres, sem símbolos, sem repetir', () => {
    expect(
      nomesDasAbas([
        'Banco: COMEX/FISCAL',
        'Um nome de aba muito comprido que passa do limite',
        'Varejo',
        'varejo',
        '',
      ])
    ).toEqual([
      'Banco  COMEX FISCAL',
      'Um nome de aba muito comprido q',
      'Varejo',
      'varejo (2)',
      'Planilha',
    ]);
  });

  it('largura da coluna acompanha o texto mais longo, com limite', () => {
    expect(
      larguras([
        ['Ramo', 'Empresas'],
        ['Químico e Petroquímico', 3],
        ['x'.repeat(200), ''],
      ])
    ).toEqual([{ wch: 60 }, { wch: 10 }]);
  });

  it('Excel: uma planilha por aba, gravada com o nome do arquivo', async () => {
    await exportarTabela(
      {
        arquivo: 'controle',
        titulo: 'Controle',
        abas: [RAMOS, { ...RAMOS, nome: 'Outro' }],
      },
      'xlsx',
      HOJE
    );
    expect(xlsx.aoa_to_sheet).toHaveBeenCalledWith(matrizDaAba(RAMOS));
    expect(xlsx.book_append_sheet).toHaveBeenCalledTimes(2);
    expect(xlsx.book_append_sheet.mock.calls.map((c) => c[2])).toEqual(['Ramos', 'Outro']);
    expect(xlsx.writeFile).toHaveBeenCalledWith(expect.anything(), 'controle-2026-10-07.xlsx');
  });

  it('PDF: uma tabela por aba, cada aba a partir da segunda em página nova', async () => {
    await exportarTabela(
      { arquivo: 'controle', titulo: 'Controle', abas: [RAMOS, { ...RAMOS, nome: 'Outro' }] },
      'pdf',
      HOJE
    );
    const [doc] = pdf.instancias;
    expect(pdf.autoTable).toHaveBeenCalledTimes(2);
    expect(pdf.autoTable.mock.calls[0][1]).toMatchObject({
      head: [['Ramo', 'Empresas']],
      body: [
        ['Varejo', 3],
        ['Químico e Petroquímico', ''],
      ],
    });
    expect(doc.addPage).toHaveBeenCalledTimes(1);
    expect(doc.save).toHaveBeenCalledWith('controle-2026-10-07.pdf');
  });
});
