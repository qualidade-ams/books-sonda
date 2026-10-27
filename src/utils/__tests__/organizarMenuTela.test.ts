import { describe, it, expect } from 'vitest';
import {
  achatar,
  mesmaEstrutura,
  menusVazios,
  montar,
  mudancasDaOrdem,
  projetar,
  soltar,
  corMudou,
  mudancasDaAparencia,
  type Linha,
} from '../organizarMenuTela';
import { APARENCIA_PADRAO } from '@/config/aparenciaPadrao';
import type { NoMenu } from '@/types/menuOrganizado';

const tela = (chave: string): NoMenu => ({
  chave,
  tipo: 'tela',
  rotuloI18n: `nav.${chave}`,
  icone: 'FileText',
  screenKey: chave,
});
const menu = (chave: string, filhos: NoMenu[]): NoMenu => ({
  chave,
  tipo: 'menu',
  rotuloI18n: `nav.${chave}`,
  icone: 'Shield',
  filhos,
});

const ARVORE: NoMenu[] = [
  tela('dash'),
  menu('clientes', [tela('empresas'), tela('ramos')]),
  menu('admin', [tela('grupos')]),
];
const ids = (linhas: Linha[]) => linhas.map((l) => `${l.nivel}:${l.id}`);
const estrutura = (a: NoMenu[]) =>
  a.map((n) => (n.filhos ? `${n.chave}[${n.filhos.map((f) => f.chave).join(',')}]` : n.chave));

describe('achatar e montar', () => {
  it('a árvore vira linhas com nível; arrastando um menu, só o primeiro nível', () => {
    expect(ids(achatar(ARVORE, false))).toEqual([
      '0:dash',
      '0:clientes',
      '1:empresas',
      '1:ramos',
      '0:admin',
      '1:grupos',
    ]);
    expect(ids(achatar(ARVORE, true))).toEqual(['0:dash', '0:clientes', '0:admin']);
    expect(achatar(ARVORE, false)[1].total).toBe(2);
  });

  it('montar desfaz o achatar', () => {
    expect(estrutura(montar(achatar(ARVORE, false)))).toEqual(estrutura(ARVORE));
  });

  it('tela de nível 1 abaixo de uma tela solta cria um menu com o nome dela', () => {
    const linhas = achatar(ARVORE, false);
    // "ramos" vai para logo abaixo de "dash", no nível 1
    const movidas = [
      linhas[0],
      { ...linhas[3], nivel: 1 as const },
      linhas[1],
      linhas[2],
      linhas[4],
      linhas[5],
    ];
    const arvore = montar(movidas);
    expect(estrutura(arvore)).toEqual([
      'menu:dash[dash,ramos]',
      'clientes[empresas]',
      'admin[grupos]',
    ]);
    expect(arvore[0]).toMatchObject({ tipo: 'menu', rotuloI18n: 'nav.dash', icone: 'FileText' });

    // Voltando a ter só a tela de origem, ela volta a ser solta
    expect(estrutura(montar(achatar(arvore, false).filter((l) => l.id !== 'ramos')))).toEqual([
      'dash',
      'clientes[empresas]',
      'admin[grupos]',
    ]);
  });
});

describe('projetar', () => {
  const linhas = achatar(ARVORE, false);

  it('dentro de um menu, a tela fica no nível 1 e o pai é o menu', () => {
    // "grupos" sobre "ramos"
    expect(projetar(linhas, 'grupos', 'ramos', 0)).toMatchObject({ nivel: 1 });
    expect(projetar(linhas, 'grupos', 'ramos', 0).pai?.id).toBe('clientes');
  });

  it('logo abaixo de uma tela solta, só vira subitem arrastando para a direita', () => {
    expect(projetar(linhas, 'ramos', 'clientes', 0)).toMatchObject({ nivel: 0, pai: null });
    expect(projetar(linhas, 'ramos', 'clientes', 40).nivel).toBe(1);
    expect(projetar(linhas, 'ramos', 'clientes', 40).pai?.id).toBe('dash');
  });

  it('arrastando para a esquerda, a tela fica solta; não separa um menu das telas dele', () => {
    expect(projetar(linhas, 'grupos', 'grupos', -40)).toMatchObject({ nivel: 0, pai: null });
    // Sobre "empresas" (primeira de Clientes), a seguinte é de nível 1: fica dentro
    expect(projetar(linhas, 'dash', 'empresas', -40).nivel).toBe(1);
  });

  it('menu sempre no primeiro nível', () => {
    expect(projetar(achatar(ARVORE, true), 'admin', 'dash', 40)).toMatchObject({
      nivel: 0,
      pai: null,
    });
  });
});

describe('mudancasDaOrdem', () => {
  it('nada mudou', () => {
    expect(mudancasDaOrdem(ARVORE, ARVORE)).toEqual({
      ordemDosMenus: false,
      menusCriados: 0,
      telasMovidas: 0,
      menusReordenados: [],
    });
  });

  it('ordem dos menus, telas que trocaram de menu, menus criados e reordenados', () => {
    const atual: NoMenu[] = [
      menu('admin', [tela('grupos'), tela('ramos')]),
      menu('menu:dash', [tela('dash')]),
      menu('clientes', [tela('empresas')]),
    ];
    expect(mudancasDaOrdem(ARVORE, atual)).toEqual({
      ordemDosMenus: true,
      menusCriados: 1,
      telasMovidas: 2,
      menusReordenados: [],
    });

    const reordenado = [
      tela('dash'),
      menu('clientes', [tela('ramos'), tela('empresas')]),
      ARVORE[2],
    ];
    expect(mudancasDaOrdem(ARVORE, reordenado).menusReordenados).toEqual(['clientes']);
  });
});

describe('mesmaEstrutura e menusVazios', () => {
  it('compara a estrutura e acha os menus sem telas', () => {
    expect(mesmaEstrutura(ARVORE, montar(achatar(ARVORE, false)))).toBe(true);
    expect(mesmaEstrutura(ARVORE, [...ARVORE].reverse())).toBe(false);
    expect(menusVazios([menu('admin', []), tela('dash'), menu('clientes', [tela('x')])])).toEqual([
      'admin',
    ]);
  });
});

describe('soltar', () => {
  it('tela solta no menu de destino, na posição e no nível projetados', () => {
    // "grupos" sobre "ramos": entra em Clientes, antes de Ramos
    expect(estrutura(soltar(ARVORE, 'grupos', 'ramos', 0))).toEqual([
      'dash',
      'clientes[empresas,grupos,ramos]',
      'admin[]',
    ]);
  });

  it('menu troca de lugar com o primeiro nível, levando as telas', () => {
    expect(estrutura(soltar(ARVORE, 'admin', 'dash', 0))).toEqual([
      'admin[grupos]',
      'dash',
      'clientes[empresas,ramos]',
    ]);
  });

  it('soltar fora da lista não muda nada', () => {
    expect(soltar(ARVORE, 'grupos', null, 0)).toBe(ARVORE);
  });
});

describe('aparência', () => {
  const salva = APARENCIA_PADRAO;

  it('cores padrão: as da carga de menu_aparencia, sem logo próprio', () => {
    expect(APARENCIA_PADRAO.claro).toMatchObject({
      menuFundo: '#FAFBFC',
      selecionadoFundo: '#2563EB',
      logoPath: null,
    });
    expect(APARENCIA_PADRAO.escuro.selecionadoFundo).toBe('#00D4E8');
  });

  it('o que mudou: fundo ou texto de cada parte, por tema; cores e logo separados', () => {
    const rascunho = {
      ...salva,
      claro: { ...salva.claro, hoverTexto: '#000000' },
      escuro: { ...salva.escuro, logoRecolhidoPath: 'escuro/recolhido-1.png' },
    };
    expect(corMudou(salva.claro, rascunho.claro, 'hover')).toBe(true);
    expect(corMudou(salva.claro, rascunho.claro, 'menu')).toBe(false);
    expect(mudancasDaAparencia(salva, rascunho)).toEqual({ cores: ['claro'], logo: ['escuro'] });
    expect(mudancasDaAparencia(salva, salva)).toEqual({ cores: [], logo: [] });
  });
});
