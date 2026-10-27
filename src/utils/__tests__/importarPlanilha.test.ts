import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { lerPlanilha, linhasDaPlanilha, type ColunaImportacao } from '../importarPlanilha';

const COLUNAS: ColunaImportacao[] = [
  { id: 'codigo', rotulo: 'Código de resolução', obrigatoria: true },
  { id: 'horas', rotulo: 'Conta horas', obrigatoria: true },
  { id: 'obs', rotulo: 'Observação' },
];

const xlsx = (matriz: unknown[][]) => {
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet(matriz), 'Planilha');
  return new File([XLSX.write(livro, { type: 'array', bookType: 'xlsx' })], 'modelo.xlsx');
};

describe('lerPlanilha', () => {
  it('lê a primeira aba do Excel como texto', async () => {
    const arquivo = xlsx([
      ['Ramo de atividade', 'Empresas'],
      ['Varejo', 3],
    ]);
    expect(await lerPlanilha(arquivo)).toEqual([
      ['Ramo de atividade', 'Empresas'],
      ['Varejo', '3'],
    ]);
  });

  it('lê CSV', async () => {
    const arquivo = new File(['Ramo de atividade\nVarejo\nLogística\n'], 'ramos.csv', {
      type: 'text/csv',
    });
    expect(await lerPlanilha(arquivo)).toEqual([['Ramo de atividade'], ['Varejo'], ['Logística']]);
  });
});

describe('linhasDaPlanilha', () => {
  it('acha as colunas pelo cabeçalho, sem diferenciar maiúsculas, acentos e o * de obrigatória', () => {
    const { linhas, faltando } = linhasDaPlanilha(
      [
        ['conta HORAS', 'CODIGO DE RESOLUCAO*', 'Outra coluna'],
        ['Sim', ' Consultoria ', 'x'],
        ['', '', ''],
        ['Não', 'Treinamento', ''],
      ],
      COLUNAS
    );
    expect(faltando).toEqual([]);
    expect(linhas).toEqual([
      { linha: 2, valores: { codigo: 'Consultoria', horas: 'Sim', obs: '' } },
      { linha: 4, valores: { codigo: 'Treinamento', horas: 'Não', obs: '' } },
    ]);
  });

  it('aponta as colunas obrigatórias que faltam no cabeçalho', () => {
    expect(linhasDaPlanilha([['Observação'], ['x']], COLUNAS).faltando).toEqual([
      'Código de resolução',
      'Conta horas',
    ]);
  });

  it('planilha vazia não tem linhas', () => {
    expect(linhasDaPlanilha([], COLUNAS)).toEqual({
      linhas: [],
      faltando: ['Código de resolução', 'Conta horas'],
    });
  });
});
