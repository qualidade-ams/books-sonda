import { describe, it, expect } from 'vitest';
import { menuDaRota, menuVisivel } from '../menuLateral';
import { MENU_PADRAO } from '@/config/menuPadrao';
import { ICONES_MENU } from '@/components/admin/iconesMenu';
import type { NoMenu } from '@/types/menuOrganizado';

const tela = (chave: string, screenKey: string): NoMenu => ({
  chave,
  tipo: 'tela',
  rotuloI18n: `nav.${screenKey}`,
  icone: 'FileText',
  screenKey,
});

const ARVORE: NoMenu[] = [
  tela('/admin/dashboard', 'dashboard'),
  {
    chave: 'clientes',
    tipo: 'menu',
    rotuloI18n: 'nav.clients',
    icone: 'Building2',
    filhos: [tela('/admin/empresas', 'empresas'), tela('/admin/clientes', 'clientes')],
  },
  {
    chave: 'administracao',
    tipo: 'menu',
    rotuloI18n: 'nav.administration',
    icone: 'Shield',
    filhos: [tela('/admin/grupos', 'grupos')],
  },
];

describe('menuVisivel', () => {
  it('tira as telas sem permissão e os menus que ficam vazios', () => {
    const visivel = menuVisivel(ARVORE, (k) => k !== 'clientes' && k !== 'grupos');
    expect(visivel.map((n) => n.chave)).toEqual(['/admin/dashboard', 'clientes']);
    expect(visivel[1].filhos!.map((f) => f.chave)).toEqual(['/admin/empresas']);
  });

  it('não altera a árvore recebida', () => {
    menuVisivel(ARVORE, () => false);
    expect(ARVORE[1].filhos).toHaveLength(2);
  });
});

describe('menuDaRota', () => {
  it('o menu que contém a rota; tela solta ou rota fora do menu, nulo', () => {
    expect(menuDaRota(ARVORE, '/admin/clientes')).toBe('clientes');
    expect(menuDaRota(ARVORE, '/admin/grupos')).toBe('administracao');
    expect(menuDaRota(ARVORE, '/admin/dashboard')).toBeNull();
    expect(menuDaRota(ARVORE, '/admin/outra')).toBeNull();
  });

  it('rota de uma subpágina abre o menu da tela (ex.: detalhe da empresa)', () => {
    expect(menuDaRota(ARVORE, '/admin/empresas/123')).toBe('clientes');
  });
});

describe('MENU_PADRAO', () => {
  const telas = MENU_PADRAO.flatMap((n) => (n.tipo === 'tela' ? [n] : (n.filhos ?? [])));

  it('cada tela tem rota única, permissão e ícone conhecido', () => {
    const rotas = telas.map((t) => t.chave);
    expect(new Set(rotas).size).toBe(rotas.length);
    for (const t of telas) {
      expect(t.chave.startsWith('/admin/')).toBe(true);
      expect(t.screenKey).toBeTruthy();
    }
    for (const n of [...MENU_PADRAO, ...telas]) expect(ICONES_MENU[n.icone!]).toBeDefined();
  });

  it('os menus têm as chaves fixas do Organizar Menu', () => {
    expect(MENU_PADRAO.filter((n) => n.tipo === 'menu').map((n) => n.chave)).toEqual([
      'requerimentos',
      'pesquisas',
      'elogios',
      'comunicacao',
      'auditoria',
      'clientes',
      'configuracoes',
      'administracao',
    ]);
  });
});
