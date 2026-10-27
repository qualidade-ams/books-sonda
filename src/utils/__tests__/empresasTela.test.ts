import { describe, it, expect } from 'vitest';
import {
  codigosDeSolucao,
  exportacaoEmpresas,
  filtrarEmpresas,
  SEM_FILTRO_EMPRESAS,
} from '../empresasTela';
import { matrizDaAba } from '@/utils/exportarTabela';
import type { EmpresaLista, SolucaoDaEmpresa } from '@/types/empresas';

const solucao = (codigo: string, temAms: boolean, emProjeto = false): SolucaoDaEmpresa => ({
  id: `es-${codigo}`,
  solucaoId: `s-${codigo}`,
  codigo,
  nome: codigo,
  temAms,
  emProjeto,
  justificativaProjeto: emProjeto ? 'Implantação' : null,
});
const empresa = (id: string, extra: Partial<EmpresaLista>): EmpresaLista => ({
  id,
  nomeAbreviado: id.toUpperCase(),
  nomeCompleto: `${id.toUpperCase()} LTDA`,
  status: 'ativo',
  modelo: 'legado',
  solucoes: [],
  temAms: false,
  emProjeto: false,
  pendencias: [],
  emailCs: null,
  emailComercial: null,
  nomeCs: null,
  nomeComercial: null,
  observacao: null,
  ...extra,
});

const LISTA = [
  empresa('alfa', { solucoes: [solucao('COMEX', true)], temAms: true, modelo: 'liberada' }),
  empresa('beta', {
    solucoes: [solucao('FISCAIS', false, true)],
    emProjeto: true,
    pendencias: ['ramo'],
    nomeCompleto: 'BETA INDÚSTRIA SA',
  }),
  empresa('gama', {
    status: 'inativo',
    solucoes: [solucao('COMEX', false), solucao('FISCAIS', true)],
    temAms: true,
  }),
];

const ids = (lista: EmpresaLista[]) => lista.map((e) => e.id);

describe('filtrarEmpresas', () => {
  it('sem filtro, todas', () => {
    expect(ids(filtrarEmpresas(LISTA, SEM_FILTRO_EMPRESAS))).toEqual(['alfa', 'beta', 'gama']);
  });

  it('busca no nome abreviado e no completo', () => {
    expect(ids(filtrarEmpresas(LISTA, { ...SEM_FILTRO_EMPRESAS, busca: 'indústria' }))).toEqual([
      'beta',
    ]);
  });

  it('dentro de um filtro vale qualquer opção; entre filtros, todos', () => {
    expect(ids(filtrarEmpresas(LISTA, { ...SEM_FILTRO_EMPRESAS, solucoes: ['FISCAIS'] }))).toEqual([
      'beta',
      'gama',
    ]);
    expect(
      ids(
        filtrarEmpresas(LISTA, { ...SEM_FILTRO_EMPRESAS, solucoes: ['FISCAIS'], status: ['ativo'] })
      )
    ).toEqual(['beta']);
    expect(ids(filtrarEmpresas(LISTA, { ...SEM_FILTRO_EMPRESAS, temAms: ['nao'] }))).toEqual([
      'beta',
    ]);
    expect(ids(filtrarEmpresas(LISTA, { ...SEM_FILTRO_EMPRESAS, emProjeto: ['sim'] }))).toEqual([
      'beta',
    ]);
    expect(ids(filtrarEmpresas(LISTA, { ...SEM_FILTRO_EMPRESAS, modelo: ['liberada'] }))).toEqual([
      'alfa',
    ]);
    expect(ids(filtrarEmpresas(LISTA, { ...SEM_FILTRO_EMPRESAS, soPendentes: true }))).toEqual([
      'beta',
    ]);
  });
});

describe('codigosDeSolucao', () => {
  it('as soluções que aparecem na lista, sem repetir, em ordem', () => {
    expect(codigosDeSolucao(LISTA)).toEqual(['COMEX', 'FISCAIS']);
  });
});

describe('exportacaoEmpresas', () => {
  const t = (chave: string) => chave;
  it('uma linha por empresa, com soluções, AMS, projeto e contatos', () => {
    const exportacao = exportacaoEmpresas(
      [{ ...LISTA[2], emailCs: 'cs@exemplo.com', observacao: 'Ver contrato' }, LISTA[1]],
      t
    );
    expect(exportacao.arquivo).toBe('empresasCadastro.exportar.arquivo');
    expect(matrizDaAba(exportacao.abas[0])).toEqual([
      [
        'empresasCadastro.exportar.colunas.abreviado',
        'empresasCadastro.exportar.colunas.completo',
        'empresasCadastro.filtros.status',
        'empresasCadastro.filtros.modelo',
        'empresasCadastro.lista.colunaSolucoes',
        'empresasCadastro.exportar.colunas.ams',
        'empresasCadastro.exportar.colunas.projeto',
        'empresasCadastro.exportar.colunas.cs',
        'empresasCadastro.exportar.colunas.comercial',
        'empresasCadastro.exportar.colunas.observacao',
      ],
      [
        'GAMA',
        'GAMA LTDA',
        'empresasCadastro.situacao.inativa',
        'empresasCadastro.modelo.legado',
        'COMEX, FISCAIS',
        'FISCAIS',
        '',
        'cs@exemplo.com',
        '',
        'Ver contrato',
      ],
      [
        'BETA',
        'BETA INDÚSTRIA SA',
        'empresasCadastro.situacao.ativa',
        'empresasCadastro.modelo.legado',
        'FISCAIS',
        '',
        'FISCAIS: Implantação',
        '',
        '',
        '',
      ],
    ]);
  });
});
