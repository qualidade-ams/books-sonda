import { describe, it, expect } from 'vitest';
import { matrizDaAba } from '@/utils/exportarTabela';
import {
  conferirRamos,
  exportacaoRamos,
  filtrarRamos,
  mudancasRamos,
  nomeRepetido,
  novoRamo,
  paraRascunho,
  rascunhoComImportados,
  pendenciaDoRamo,
  totaisRamos,
} from '../ramosTela';
import type { RamoAtividade } from '@/types/ramosAtividade';

const ramo = (id: string, nome: string, extra: Partial<RamoAtividade> = {}): RamoAtividade => ({
  id,
  nome,
  ordem: 1,
  ativo: true,
  empresasPrincipal: 0,
  empresasSecundario: 0,
  atualizadoEm: '2026-10-22T12:00:00Z',
  atualizadoPor: null,
  ...extra,
});

const SALVOS = [
  ramo('r1', 'Agronegócio', { empresasPrincipal: 3, empresasSecundario: 1 }),
  ramo('r2', 'Indústria', { empresasPrincipal: 2 }),
  ramo('r3', 'Varejo', { ativo: false }),
];

describe('nomeRepetido', () => {
  it('sem diferenciar maiúsculas e espaços nas pontas, ignorando o próprio ramo', () => {
    expect(nomeRepetido(' agronegócio ', SALVOS)).toBe(true);
    expect(nomeRepetido('Agronegócio', SALVOS, 'r1')).toBe(false);
    expect(nomeRepetido('Saúde', SALVOS)).toBe(false);
  });
});

describe('pendenciaDoRamo', () => {
  it('novo, alterado, inativado, reativado ou nada', () => {
    expect(pendenciaDoRamo(novoRamo('Saúde', 1), SALVOS)).toBe('novo');
    expect(pendenciaDoRamo({ ...SALVOS[0], nome: 'Agro' }, SALVOS)).toBe('alterado');
    expect(pendenciaDoRamo({ ...SALVOS[0], ativo: false }, SALVOS)).toBe('inativado');
    expect(pendenciaDoRamo({ ...SALVOS[2], ativo: true }, SALVOS)).toBe('reativado');
    expect(pendenciaDoRamo(SALVOS[1], SALVOS)).toBeNull();
  });
});

describe('mudancasRamos', () => {
  it('sem mudança, nada', () => {
    expect(mudancasRamos(SALVOS, SALVOS).algo).toBe(false);
  });

  it('separa o que entrou, mudou, saiu e se a ordem mudou', () => {
    const rascunho = [
      { ...SALVOS[1], ativo: false },
      { ...SALVOS[0], nome: 'Agro' },
      novoRamo('Saúde', 1),
    ];
    const m = mudancasRamos(rascunho, SALVOS);
    expect(m.algo).toBe(true);
    expect(m.incluidos.map((r) => r.nome)).toEqual(['Saúde']);
    expect(m.renomeados.map((r) => r.id)).toEqual(['r1']);
    expect(m.inativados.map((r) => r.id)).toEqual(['r2']);
    expect(m.reativados).toEqual([]);
    expect(m.excluidos.map((r) => r.id)).toEqual(['r3']);
    expect(m.ordemAlterada).toBe(true);
  });

  it('excluir do fim não conta como mudança de ordem', () => {
    expect(mudancasRamos(SALVOS.slice(0, 2), SALVOS).ordemAlterada).toBe(false);
  });
});

describe('paraRascunho', () => {
  it('na ordem da lista, sem id nos novos e com o nome sem espaços nas pontas', () => {
    expect(paraRascunho([novoRamo(' Saúde ', 1), SALVOS[2]])).toEqual([
      { nome: 'Saúde', ativo: true },
      { id: 'r3', nome: 'Varejo', ativo: false },
    ]);
  });
});

describe('totaisRamos', () => {
  it('ativos, inativos e empresas com e sem ramo principal', () => {
    expect(totaisRamos(SALVOS, 10)).toEqual({ ativos: 2, inativos: 1, comRamo: 5, semRamo: 5 });
  });
});

describe('filtrarRamos', () => {
  it('por nome e situação', () => {
    expect(filtrarRamos(SALVOS, 'ind', []).map((r) => r.id)).toEqual(['r2']);
    expect(filtrarRamos(SALVOS, '', ['inativo']).map((r) => r.id)).toEqual(['r3']);
  });
});

describe('exportacaoRamos', () => {
  const t = (chave: string) => chave;
  it('uma linha por ramo, na ordem, com situação e empresas', () => {
    const exportacao = exportacaoRamos([SALVOS[0], SALVOS[2]], t);
    expect(exportacao).toMatchObject({
      arquivo: 'ramosAtividade.exportar.arquivo',
      titulo: 'ramosAtividade.titulo',
    });
    expect(matrizDaAba(exportacao.abas[0])).toEqual([
      [
        'ramosAtividade.exportar.colunas.ramo',
        'fase3Comum.situacao',
        'ramosAtividade.exportar.colunas.principal',
        'ramosAtividade.exportar.colunas.secundario',
      ],
      ['Agronegócio', 'fase3Comum.ativo', 3, 1],
      ['Varejo', 'fase3Comum.inativo', 0, 0],
    ]);
  });
});

describe('importação de ramos', () => {
  const t = (chave: string, valores?: Record<string, unknown>) =>
    valores ? `${chave} ${JSON.stringify(valores)}` : chave;
  const linha = (n: number, nome: string) => ({ linha: n, valores: { nome } });

  it('confere: novo, já existe (sem diferenciar maiúsculas), repetido na planilha e vazio', () => {
    const conferidas = conferirRamos(
      [linha(2, 'Logística'), linha(3, 'varejo'), linha(4, 'logística '), linha(5, '')],
      SALVOS,
      t
    );
    expect(conferidas.map((l) => [l.situacao, l.erros])).toEqual([
      ['novo', undefined],
      ['igual', undefined],
      ['erro', ['ramosAtividade.importar.erros.repetido {"linha":2}']],
      ['erro', ['ramosAtividade.importar.erros.vazio']],
    ]);
  });

  it('os novos entram no fim da lista gravada, ativos', () => {
    expect(rascunhoComImportados(SALVOS, [linha(2, ' Logística ')])).toEqual([
      ...paraRascunho(SALVOS),
      { nome: 'Logística', ativo: true },
    ]);
  });
});
