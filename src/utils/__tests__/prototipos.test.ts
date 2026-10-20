import { describe, it, expect } from 'vitest';
import {
  slugDoArquivo,
  nomeDoArquivo,
  montarRegistroPrototipos,
  encontrarPrototipo,
  type PrototipoLoader,
} from '../prototipos';

const loader: PrototipoLoader = () => Promise.resolve({ default: () => null });

describe('slugDoArquivo', () => {
  it('converte o nome PascalCase do arquivo em kebab-case', () => {
    expect(slugDoArquivo('./prototipos/ListaContratos.tsx')).toBe('lista-contratos');
  });

  it('aceita nome de uma palavra só', () => {
    expect(slugDoArquivo('./prototipos/Exemplo.tsx')).toBe('exemplo');
  });

  it('mantém dígitos junto da palavra anterior', () => {
    expect(slugDoArquivo('./prototipos/RelatorioV2Mensal.tsx')).toBe('relatorio-v2-mensal');
  });
});

describe('nomeDoArquivo', () => {
  it('separa as palavras do nome PascalCase com espaço', () => {
    expect(nomeDoArquivo('./prototipos/ListaContratos.tsx')).toBe('Lista Contratos');
  });
});

describe('montarRegistroPrototipos', () => {
  it('cria uma entrada por arquivo, ordenada pelo nome', () => {
    const registro = montarRegistroPrototipos({
      './prototipos/Zeta.tsx': loader,
      './prototipos/ListaContratos.tsx': loader,
    });

    expect(registro.map(p => p.slug)).toEqual(['lista-contratos', 'zeta']);
    expect(registro[0]).toMatchObject({ nome: 'Lista Contratos', load: loader });
  });

  it('retorna lista vazia quando não há protótipos', () => {
    expect(montarRegistroPrototipos({})).toEqual([]);
  });
});

describe('encontrarPrototipo', () => {
  const registro = montarRegistroPrototipos({ './prototipos/ListaContratos.tsx': loader });

  it('encontra o protótipo pelo slug', () => {
    expect(encontrarPrototipo(registro, 'lista-contratos')?.nome).toBe('Lista Contratos');
  });

  it('retorna undefined para slug inexistente ou ausente', () => {
    expect(encontrarPrototipo(registro, 'nao-existe')).toBeUndefined();
    expect(encontrarPrototipo(registro, undefined)).toBeUndefined();
  });
});
