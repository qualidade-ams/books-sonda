import { describe, it, expect, vi } from 'vitest';
import { criarSupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import {
  MenuOrganizadoService,
  achatarMenu,
  aplicarOrdemSalva,
  diferencaAparencia,
} from '../menuOrganizadoService';
import type { AparenciaMenu, ItemMenuSalvo, NoMenu } from '@/types/menuOrganizado';

const tela = (chave: string, rotuloI18n = `nav.${chave}`): NoMenu => ({
  chave,
  tipo: 'tela',
  rotuloI18n,
  icone: null,
});
const menu = (chave: string, filhos: NoMenu[]): NoMenu => ({
  chave,
  tipo: 'menu',
  rotuloI18n: `nav.${chave}`,
  icone: 'Folder',
  filhos,
});

// Menu do código: Dashboard solto, Requerimentos e Administração
const PADRAO: NoMenu[] = [
  tela('/admin/dashboard', 'nav.dashboard'),
  menu('requerimentos', [tela('/admin/lancar'), tela('/admin/faturar')]),
  menu('administracao', [tela('/admin/usuarios'), tela('/admin/organizar-menu')]),
];

const salvo = (
  chave: string,
  tipo: 'menu' | 'tela',
  pai: string | null,
  posicao: number,
  rotuloI18n = `nav.${chave}`
): ItemMenuSalvo => ({
  chave,
  tipo,
  pai,
  posicao,
  rotuloI18n,
  icone: tipo === 'menu' ? 'Folder' : null,
});

describe('aplicarOrdemSalva', () => {
  it('sem ordem salva, vale o menu do código', () => {
    expect(aplicarOrdemSalva(PADRAO, [])).toEqual(PADRAO);
  });

  it('aplica ordem, mudança de menu e tela solta, com rótulo das telas vindo do código', () => {
    const itens = [
      salvo('administracao', 'menu', null, 0),
      salvo('/admin/usuarios', 'tela', 'administracao', 0),
      salvo('/admin/faturar', 'tela', 'administracao', 1, 'rotulo.antigo'),
      salvo('/admin/dashboard', 'tela', null, 1),
      salvo('requerimentos', 'menu', null, 2),
      salvo('/admin/lancar', 'tela', 'requerimentos', 0),
      salvo('/admin/organizar-menu', 'tela', null, 3),
    ];
    expect(aplicarOrdemSalva(PADRAO, itens)).toEqual([
      menu('administracao', [tela('/admin/usuarios'), tela('/admin/faturar')]),
      tela('/admin/dashboard', 'nav.dashboard'),
      menu('requerimentos', [tela('/admin/lancar')]),
      tela('/admin/organizar-menu'),
    ]);
  });

  it('tela nova entra no fim do menu em que o código a coloca; tela que saiu do código some', () => {
    const padrao = [
      ...PADRAO.slice(0, 2),
      menu('administracao', [
        tela('/admin/usuarios'),
        tela('/admin/organizar-menu'),
        tela('/admin/nova'),
      ]),
    ];
    const itens = [
      salvo('/admin/dashboard', 'tela', null, 0),
      salvo('administracao', 'menu', null, 1),
      salvo('/admin/organizar-menu', 'tela', 'administracao', 0),
      salvo('/admin/usuarios', 'tela', 'administracao', 1),
      salvo('/admin/removida', 'tela', 'administracao', 2),
      salvo('requerimentos', 'menu', null, 2),
      salvo('/admin/lancar', 'tela', 'requerimentos', 0),
      salvo('/admin/faturar', 'tela', 'requerimentos', 1),
    ];
    const arvore = aplicarOrdemSalva(padrao, itens);
    expect(arvore[1].filhos!.map((f) => f.chave)).toEqual([
      '/admin/organizar-menu',
      '/admin/usuarios',
      '/admin/nova',
    ]);
  });

  it('menu novo do código entra no fim do primeiro nível; menu sem telas some', () => {
    const padrao = [...PADRAO, menu('bancos', [tela('/admin/controle')])];
    const itens = [
      salvo('/admin/dashboard', 'tela', null, 0),
      salvo('requerimentos', 'menu', null, 1),
      salvo('/admin/lancar', 'tela', 'requerimentos', 0),
      salvo('/admin/faturar', 'tela', 'requerimentos', 1),
      salvo('administracao', 'menu', null, 2),
      salvo('/admin/usuarios', 'tela', 'administracao', 0),
      salvo('/admin/organizar-menu', 'tela', 'administracao', 1),
      // Menu criado na tela que ficou vazio
      salvo('menu:/admin/dashboard', 'menu', null, 3, 'nav.dashboard'),
    ];
    const arvore = aplicarOrdemSalva(padrao, itens);
    expect(arvore.map((n) => n.chave)).toEqual([
      '/admin/dashboard',
      'requerimentos',
      'administracao',
      'bancos',
    ]);
  });

  it('tela solta que recebeu telas vira um menu com o rótulo dela', () => {
    const itens = [
      salvo('menu:/admin/dashboard', 'menu', null, 0, 'nav.dashboard'),
      salvo('/admin/dashboard', 'tela', 'menu:/admin/dashboard', 0),
      salvo('/admin/lancar', 'tela', 'menu:/admin/dashboard', 1),
      salvo('requerimentos', 'menu', null, 1),
      salvo('/admin/faturar', 'tela', 'requerimentos', 0),
      salvo('administracao', 'menu', null, 2),
      salvo('/admin/usuarios', 'tela', 'administracao', 0),
      salvo('/admin/organizar-menu', 'tela', 'administracao', 1),
    ];
    const [primeiro] = aplicarOrdemSalva(PADRAO, itens);
    expect(primeiro).toMatchObject({
      chave: 'menu:/admin/dashboard',
      tipo: 'menu',
      rotuloI18n: 'nav.dashboard',
    });
    expect(primeiro.filhos!.map((f) => f.chave)).toEqual(['/admin/dashboard', '/admin/lancar']);
  });
});

describe('achatarMenu', () => {
  it('gera a lista completa com pai e posição, para salvar', () => {
    expect(achatarMenu(PADRAO)).toEqual([
      salvo('/admin/dashboard', 'tela', null, 0, 'nav.dashboard'),
      salvo('requerimentos', 'menu', null, 1),
      salvo('/admin/lancar', 'tela', 'requerimentos', 0),
      salvo('/admin/faturar', 'tela', 'requerimentos', 1),
      salvo('administracao', 'menu', null, 2),
      salvo('/admin/usuarios', 'tela', 'administracao', 0),
      salvo('/admin/organizar-menu', 'tela', 'administracao', 1),
    ]);
  });

  it('ida e volta: achatar e aplicar devolve a mesma árvore', () => {
    expect(aplicarOrdemSalva(PADRAO, achatarMenu(PADRAO))).toEqual(PADRAO);
  });
});

const CLARO: AparenciaMenu = {
  menuFundo: '#FAFBFC',
  menuTexto: '#5F6670',
  itemFundo: '#FAFBFC',
  itemTexto: '#5F6670',
  subitemFundo: '#FAFBFC',
  subitemTexto: '#5F6670',
  hoverFundo: '#EEF1F4',
  hoverTexto: '#1B1F24',
  selecionadoFundo: '#2563EB',
  selecionadoTexto: '#FFFFFF',
  logoPath: null,
  logoRecolhidoPath: null,
};

describe('diferencaAparencia', () => {
  it('só os campos que mudaram, em snake_case; nada mudou = nulo', () => {
    expect(diferencaAparencia(CLARO, { ...CLARO })).toBeNull();
    expect(
      diferencaAparencia(CLARO, {
        ...CLARO,
        selecionadoFundo: '#00d4e8',
        logoPath: 'claro/logo.png',
      })
    ).toEqual({ selecionado_fundo: '#00D4E8', logo_path: 'claro/logo.png' });
    // Voltar ao logo da Sonda manda a chave com nulo
    expect(diferencaAparencia({ ...CLARO, logoPath: 'x.png' }, CLARO)).toEqual({ logo_path: null });
  });
});

function cenario() {
  const fake = criarSupabaseEmMemoria(
    {
      menu_itens: [
        {
          chave: 'requerimentos',
          tipo: 'menu',
          pai: null,
          posicao: 1,
          rotulo_i18n: 'nav.requerimentos',
          icone: 'Folder',
        },
        {
          chave: '/admin/dashboard',
          tipo: 'tela',
          pai: null,
          posicao: 0,
          rotulo_i18n: 'nav.dashboard',
          icone: null,
        },
      ],
      menu_aparencia: [
        {
          tema: 'claro',
          menu_fundo: '#FAFBFC',
          menu_texto: '#5F6670',
          item_fundo: '#FAFBFC',
          item_texto: '#5F6670',
          subitem_fundo: '#FAFBFC',
          subitem_texto: '#5F6670',
          hover_fundo: '#EEF1F4',
          hover_texto: '#1B1F24',
          selecionado_fundo: '#2563EB',
          selecionado_texto: '#FFFFFF',
          logo_path: null,
          logo_recolhido_path: null,
        },
        {
          tema: 'escuro',
          menu_fundo: '#1C1C1C',
          menu_texto: '#B1B1B1',
          item_fundo: '#1C1C1C',
          item_texto: '#B1B1B1',
          subitem_fundo: '#1C1C1C',
          subitem_texto: '#B1B1B1',
          hover_fundo: '#262626',
          hover_texto: '#FFFFFF',
          selecionado_fundo: '#00D4E8',
          selecionado_texto: '#000000',
          logo_path: 'escuro/aberto.png',
          logo_recolhido_path: null,
        },
      ],
    },
    { salvar_menu: () => null }
  );
  const upload = vi.fn(async () => ({ data: { path: 'ok' }, error: null }));
  const createSignedUrl = vi.fn(async (path: string) => ({
    data: { signedUrl: `https://assinado/${path}` },
    error: null,
  }));
  const storage = { from: vi.fn(() => ({ upload, createSignedUrl })) };
  return { fake: Object.assign(fake, { storage }), upload, createSignedUrl, storage };
}

describe('MenuOrganizadoService', () => {
  it('carrega a ordem salva e a aparência dos dois temas', async () => {
    const { fake } = cenario();
    const menuSalvo = await new MenuOrganizadoService(fake as any).carregar();
    expect(menuSalvo.itens.map((i) => i.chave)).toEqual(['/admin/dashboard', 'requerimentos']);
    expect(menuSalvo.itens[1]).toEqual(salvo('requerimentos', 'menu', null, 1));
    expect(menuSalvo.aparencia.claro).toEqual(CLARO);
    expect(menuSalvo.aparencia.escuro).toMatchObject({
      selecionadoFundo: '#00D4E8',
      logoPath: 'escuro/aberto.png',
    });
  });

  it('salva a ordem completa e só as cores que mudaram, numa chamada', async () => {
    const { fake } = cenario();
    const s = new MenuOrganizadoService(fake as any);
    const atual = await s.carregar();
    await s.salvar({
      arvore: PADRAO,
      aparenciaAtual: atual.aparencia,
      aparenciaNova: { ...atual.aparencia, claro: { ...CLARO, hoverFundo: '#E0E0E0' } },
    });
    expect(fake.chamadasRpc.at(-1)).toEqual({
      nome: 'salvar_menu',
      args: {
        p_itens: achatarMenu(PADRAO).map((i) => ({
          chave: i.chave,
          tipo: i.tipo,
          pai: i.pai,
          posicao: i.posicao,
          rotulo_i18n: i.rotuloI18n,
          icone: i.icone,
        })),
        p_aparencia: { claro: { hover_fundo: '#E0E0E0' } },
      },
    });
  });

  it('"Ordem padrão" manda a lista vazia; sem mudança de cor, aparência nula', async () => {
    const { fake } = cenario();
    const s = new MenuOrganizadoService(fake as any);
    const atual = await s.carregar();
    await s.salvar({
      arvore: null,
      aparenciaAtual: atual.aparencia,
      aparenciaNova: atual.aparencia,
    });
    expect(fake.chamadasRpc.at(-1)!.args).toEqual({ p_itens: [], p_aparencia: null });
  });

  it('envia o logo para o bucket e devolve o caminho; recusa arquivo grande ou de outro tipo', async () => {
    const { fake, upload } = cenario();
    const s = new MenuOrganizadoService(fake as any, () => 1234);
    const png = new File(['x'], 'logo.png', { type: 'image/png' });
    await expect(s.enviarLogo('claro', 'recolhido', png)).resolves.toBe('claro/recolhido-1234.png');
    expect(upload).toHaveBeenCalledWith('claro/recolhido-1234.png', png, {
      contentType: 'image/png',
      upsert: false,
    });

    const grande = new File([new Uint8Array(512001)], 'grande.png', { type: 'image/png' });
    await expect(s.enviarLogo('claro', 'aberto', grande)).rejects.toMatchObject({
      message: 'O logo passa de 500 KB.',
      chave: 'erros.menu.logoGrande',
    });
    const gif = new File(['x'], 'logo.gif', { type: 'image/gif' });
    await expect(s.enviarLogo('claro', 'aberto', gif)).rejects.toMatchObject({
      message: 'Use PNG, SVG, WebP ou JPG.',
      chave: 'erros.menu.formatoLogo',
    });
  });

  it('gera o endereço temporário do logo (bucket privado)', async () => {
    const { fake, createSignedUrl } = cenario();
    const url = await new MenuOrganizadoService(fake as any).urlDoLogo('escuro/aberto.png');
    expect(url).toBe('https://assinado/escuro/aberto.png');
    expect(createSignedUrl).toHaveBeenCalledWith('escuro/aberto.png', 3600);
  });
});
