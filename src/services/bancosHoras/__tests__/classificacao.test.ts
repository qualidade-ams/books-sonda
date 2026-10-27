import { describe, it, expect } from 'vitest';
import {
  criarClassificador,
  distribuirPorBanco,
  type BancoClassificavel,
  type GrupoDePara,
} from '../classificacao';

const MES = { mes: 9, ano: 2026 };

const banco = (v: Partial<BancoClassificavel> & { bancoId: string }): BancoClassificavel => ({
  ordem: 1,
  padrao: false,
  ativo: true,
  inicioVigencia: { mes: 1, ano: 2026 },
  escopo: [],
  filtroIc: null,
  ...v,
});

const dePara = (
  grupoAranda: string,
  produtoId: string | null,
  moduloId: string | null
): GrupoDePara => ({
  grupoAranda,
  produtoId,
  moduloId,
  ativo: true,
});

// Caso 8.1 da spec: Empresa Exemplo S.A., três bancos
const bancosExemplo = [
  banco({ bancoId: 'comex', ordem: 1, escopo: [{ produtoId: 'COMEX', moduloId: null }] }),
  banco({ bancoId: 'edocs', ordem: 2, escopo: [{ produtoId: 'FISCAL', moduloId: 'EDOCS' }] }),
  banco({ bancoId: 'fiscal', ordem: 3, padrao: true }),
];
const deParaExemplo = [
  dePara('AMS APL - IMPORTACAO - N2', 'COMEX', 'IMPORTACAO'),
  dePara('AMS APL - CAMBIO - N2', 'COMEX', 'CAMBIO'),
  dePara('AMS APL - E-DOCS - N2', 'FISCAL', 'EDOCS'),
  dePara('AMS APL - SPED FISCAL/PRIS - N2', 'FISCAL', 'EFD_ICMS'),
  dePara('AMS APL - DEDICADOS - CLIENTE X', null, null),
  dePara('AMS T&M - TIME & MATERIAL', null, null),
];

describe('classificação — caso 8.1 da spec', () => {
  const linhas = [
    { grupo: 'AMS APL - IMPORTACAO - N2', itemConfiguracao: 'X', minutos: 2480, tickets: 0 },
    { grupo: 'AMS APL - CAMBIO - N2', itemConfiguracao: 'X', minutos: 1740, tickets: 0 },
    { grupo: 'AMS APL - E-DOCS - N2', itemConfiguracao: 'X', minutos: 1720, tickets: 0 },
    { grupo: 'AMS APL - SPED FISCAL/PRIS - N2', itemConfiguracao: 'X', minutos: 1865, tickets: 0 },
    { grupo: 'AMS APL - DEDICADOS - CLIENTE X', itemConfiguracao: 'X', minutos: 490, tickets: 0 },
    { grupo: 'AMS T&M - TIME & MATERIAL', itemConfiguracao: 'X', minutos: 260, tickets: 0 },
  ];

  it('cada banco recebe o seu consumo, e DEDICADOS e T&M vão para o padrão (CA-05)', () => {
    const classificador = criarClassificador(bancosExemplo, deParaExemplo, MES);
    const r = distribuirPorBanco(linhas, (l) =>
      classificador.porGrupo(l.grupo, l.itemConfiguracao)
    );
    expect(r.porBanco).toEqual({
      comex: { minutos: 4220, tickets: 0 },
      edocs: { minutos: 1720, tickets: 0 },
      fiscal: { minutos: 2615, tickets: 0 },
    });
    expect(r.semBanco).toEqual({ minutos: 0, tickets: 0 });
  });

  it('a soma dos bancos é igual ao consumo total da empresa (RN-02)', () => {
    const classificador = criarClassificador(bancosExemplo, deParaExemplo, MES);
    const r = distribuirPorBanco(linhas, (l) =>
      classificador.porGrupo(l.grupo, l.itemConfiguracao)
    );
    const soma = Object.values(r.porBanco).reduce((s, v) => s + v.minutos, 0);
    expect(soma).toBe(8555); // 142:35
  });
});

describe('classificação — de-para (RN-03, RN-04)', () => {
  const classificador = criarClassificador(bancosExemplo, deParaExemplo, MES);

  it('o grupo é procurado sem diferenciar maiúsculas', () => {
    expect(classificador.porGrupo('ams apl - cambio - n2', null)).toBe('comex');
  });

  it('grupo sem de-para vai para o padrão', () => {
    expect(classificador.porGrupo('AMS APL - GRUPO NOVO', null)).toBe('fiscal');
  });

  it('de-para inativo é tratado como sem de-para', () => {
    const c = criarClassificador(
      bancosExemplo,
      [{ ...dePara('AMS APL - CAMBIO - N2', 'COMEX', 'CAMBIO'), ativo: false }],
      MES
    );
    expect(c.porGrupo('AMS APL - CAMBIO - N2', null)).toBe('fiscal');
  });

  it('grupo do produto sem módulo: entra no banco do produto inteiro, não no de um módulo', () => {
    const c = criarClassificador(
      bancosExemplo,
      [
        dePara('AMS APL - COMEX GERAL', 'COMEX', null),
        dePara('AMS APL - FISCAL GERAL', 'FISCAL', null),
      ],
      MES
    );
    expect(c.porGrupo('AMS APL - COMEX GERAL', null)).toBe('comex');
    expect(c.porGrupo('AMS APL - FISCAL GERAL', null)).toBe('fiscal');
  });

  it('classifica direto por produto e módulo (requerimentos, RN-09)', () => {
    expect(classificador.porProdutoModulo('FISCAL', 'EDOCS', null)).toBe('edocs');
    expect(classificador.porProdutoModulo('FISCAL', null, null)).toBe('fiscal');
    expect(classificador.porProdutoModulo(null, null, null)).toBe('fiscal');
  });
});

describe('classificação — bancos que participam', () => {
  it('banco inativo não recebe', () => {
    const c = criarClassificador(
      [
        banco({ bancoId: 'comex', ativo: false, escopo: [{ produtoId: 'COMEX', moduloId: null }] }),
        banco({ bancoId: 'p', padrao: true }),
      ],
      deParaExemplo,
      MES
    );
    expect(c.porGrupo('AMS APL - CAMBIO - N2', null)).toBe('p');
  });

  it('banco cuja vigência ainda não começou não recebe (vai para o padrão)', () => {
    const c = criarClassificador(
      [
        banco({
          bancoId: 'comex',
          inicioVigencia: { mes: 10, ano: 2026 },
          escopo: [{ produtoId: 'COMEX', moduloId: null }],
        }),
        banco({ bancoId: 'p', padrao: true }),
      ],
      deParaExemplo,
      MES
    );
    expect(c.porGrupo('AMS APL - CAMBIO - N2', null)).toBe('p');
  });

  it('banco cuja vigência terminou não recebe (vai para o padrão)', () => {
    const c = criarClassificador(
      [
        banco({
          bancoId: 'comex',
          fimVigencia: { mes: 8, ano: 2026 },
          escopo: [{ produtoId: 'COMEX', moduloId: null }],
        }),
        banco({ bancoId: 'p', padrao: true }),
      ],
      deParaExemplo,
      MES
    );
    expect(c.porGrupo('AMS APL - CAMBIO - N2', null)).toBe('p');
  });

  it('no último mês da vigência o banco ainda recebe', () => {
    const c = criarClassificador(
      [
        banco({
          bancoId: 'comex',
          fimVigencia: { mes: 9, ano: 2026 },
          escopo: [{ produtoId: 'COMEX', moduloId: null }],
        }),
        banco({ bancoId: 'p', padrao: true }),
      ],
      deParaExemplo,
      MES
    );
    expect(c.porGrupo('AMS APL - CAMBIO - N2', null)).toBe('comex');
  });

  it('sem Banco padrão vigente, o que não se encaixa fica sem banco', () => {
    const c = criarClassificador([bancosExemplo[0]], deParaExemplo, MES);
    expect(c.porGrupo('AMS T&M - TIME & MATERIAL', null)).toBeNull();
  });

  it('banco não padrão sem escopo e sem filtro é recusado (Q2)', () => {
    expect(() =>
      criarClassificador(
        [banco({ bancoId: 'solto' }), banco({ bancoId: 'p', padrao: true })],
        [],
        MES
      )
    ).toThrow(/sem escopo e sem filtro/);
  });
});

describe('classificação — filtro por item de configuração (RN-06, ANGLO)', () => {
  const anglo = [
    banco({ bancoId: 'niquel', ordem: 1, filtroIc: { operador: 'contem', valor: 'NIQUEL' } }),
    banco({ bancoId: 'iob', ordem: 2, padrao: true }),
  ];

  it('"contém", sem diferenciar maiúsculas; banco sem escopo cobre qualquer produto (Q2)', () => {
    const c = criarClassificador(anglo, deParaExemplo, MES);
    expect(c.porGrupo('AMS APL - CAMBIO - N2', 'Mina Niquel Barro Alto')).toBe('niquel');
    expect(c.porGrupo('AMS APL - GRUPO NOVO', 'NIQUEL CODEMIN')).toBe('niquel');
    expect(c.porGrupo('AMS APL - CAMBIO - N2', 'SAP IOB')).toBe('iob');
    expect(c.porGrupo('AMS APL - CAMBIO - N2', null)).toBe('iob');
  });

  it('"igual" compara o item inteiro', () => {
    const c = criarClassificador(
      [
        banco({ bancoId: 'f', filtroIc: { operador: 'igual', valor: 'SAP NIQUEL' } }),
        banco({ bancoId: 'p', padrao: true }),
      ],
      [],
      MES
    );
    expect(c.porGrupo('G', ' sap niquel ')).toBe('f');
    expect(c.porGrupo('G', 'SAP NIQUEL 2')).toBe('p');
  });

  it('o filtro é avaliado junto com o escopo, na ordem do cadastro', () => {
    const fiscal = banco({
      bancoId: 'fiscal',
      ordem: 2,
      escopo: [{ produtoId: 'FISCAL', moduloId: null }],
    });
    const filtroPrimeiro = banco({
      bancoId: 'niquel',
      ordem: 1,
      filtroIc: { operador: 'contem', valor: 'NIQUEL' },
    });
    const padrao = banco({ bancoId: 'p', ordem: 9, padrao: true });

    const c1 = criarClassificador([fiscal, filtroPrimeiro, padrao], deParaExemplo, MES);
    expect(c1.porGrupo('AMS APL - E-DOCS - N2', 'NIQUEL')).toBe('niquel');

    const c2 = criarClassificador(
      [fiscal, { ...filtroPrimeiro, ordem: 3 }, padrao],
      deParaExemplo,
      MES
    );
    expect(c2.porGrupo('AMS APL - E-DOCS - N2', 'NIQUEL')).toBe('fiscal');
  });

  it('banco com escopo e filtro exige os dois', () => {
    const c = criarClassificador(
      [
        banco({
          bancoId: 'comexNiquel',
          escopo: [{ produtoId: 'COMEX', moduloId: null }],
          filtroIc: { operador: 'contem', valor: 'NIQUEL' },
        }),
        banco({ bancoId: 'p', padrao: true }),
      ],
      deParaExemplo,
      MES
    );
    expect(c.porGrupo('AMS APL - CAMBIO - N2', 'NIQUEL')).toBe('comexNiquel');
    expect(c.porGrupo('AMS APL - E-DOCS - N2', 'NIQUEL')).toBe('p');
    expect(c.porGrupo('AMS APL - CAMBIO - N2', 'OUTRO')).toBe('p');
  });
});
