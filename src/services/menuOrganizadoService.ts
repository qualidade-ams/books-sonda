/**
 * Organizar Menu (Modelagem_Fase3.md, seção 12.1; migration 20261022000009).
 *
 * O menu do código é a ordem padrão. menu_itens guarda a ordem salva na tela;
 * aplicarOrdemSalva junta as duas: tela nova (sem linha) entra no fim do menu em
 * que o código a coloca, tela que saiu do código some e menu sem telas some. Os
 * rótulos e ícones das telas vêm do código, para as traduções continuarem valendo.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  AparenciaMenu,
  ItemMenuSalvo,
  MenuSalvo,
  NoMenu,
  TemaMenu,
} from '@/types/menuOrganizado';

type Cliente = typeof supabase;
type Linha = Record<string, any>;

const BUCKET = 'menu-logos';
const LIMITE_LOGO_BYTES = 512_000;
const VALIDADE_URL_LOGO_S = 3600;
const EXTENSAO_POR_TIPO: Record<string, string> = {
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
};
const TEMAS: TemaMenu[] = ['claro', 'escuro'];

const CAMPOS_APARENCIA: [keyof AparenciaMenu, string][] = [
  ['menuFundo', 'menu_fundo'],
  ['menuTexto', 'menu_texto'],
  ['itemFundo', 'item_fundo'],
  ['itemTexto', 'item_texto'],
  ['subitemFundo', 'subitem_fundo'],
  ['subitemTexto', 'subitem_texto'],
  ['hoverFundo', 'hover_fundo'],
  ['hoverTexto', 'hover_texto'],
  ['selecionadoFundo', 'selecionado_fundo'],
  ['selecionadoTexto', 'selecionado_texto'],
  ['logoPath', 'logo_path'],
  ['logoRecolhidoPath', 'logo_recolhido_path'],
];
const CAMPOS_LOGO = new Set<keyof AparenciaMenu>(['logoPath', 'logoRecolhidoPath']);

// ---------------------------------------------------------------------------
// Regras puras
// ---------------------------------------------------------------------------

/** Junta a ordem salva com o menu do código */
export function aplicarOrdemSalva(padrao: NoMenu[], salvos: ItemMenuSalvo[]): NoMenu[] {
  if (salvos.length === 0) return padrao;

  const telasDoCodigo = new Map<string, NoMenu>();
  const menusDoCodigo = new Map<string, NoMenu>();
  for (const no of padrao) {
    if (no.tipo === 'tela') telasDoCodigo.set(no.chave, no);
    else {
      menusDoCodigo.set(no.chave, no);
      for (const filho of no.filhos ?? []) telasDoCodigo.set(filho.chave, filho);
    }
  }

  const porPosicao = (a: ItemMenuSalvo, b: ItemMenuSalvo) => a.posicao - b.posicao;
  const salvas = new Set(salvos.filter((s) => s.tipo === 'tela').map((s) => s.chave));

  const montar = (item: ItemMenuSalvo): NoMenu | null => {
    if (item.tipo === 'tela') return telasDoCodigo.get(item.chave) ?? null;
    const doCodigo = menusDoCodigo.get(item.chave);
    return {
      chave: item.chave,
      tipo: 'menu',
      rotuloI18n: doCodigo?.rotuloI18n ?? item.rotuloI18n,
      icone: doCodigo ? doCodigo.icone : item.icone,
      filhos: salvos
        .filter((s) => s.pai === item.chave)
        .sort(porPosicao)
        .map((s) => telasDoCodigo.get(s.chave))
        .filter((t): t is NoMenu => !!t),
    };
  };

  const topo = salvos
    .filter((s) => s.pai === null)
    .sort(porPosicao)
    .map(montar)
    .filter((n): n is NoMenu => !!n);

  // O que o código tem e a ordem salva não conhece entra no fim
  for (const no of padrao) {
    if (no.tipo === 'tela') {
      if (!salvas.has(no.chave)) topo.push(no);
      continue;
    }
    const novas = (no.filhos ?? []).filter((f) => !salvas.has(f.chave));
    if (novas.length === 0) continue;
    const destino = topo.find((n) => n.tipo === 'menu' && n.chave === no.chave);
    if (destino) destino.filhos = [...(destino.filhos ?? []), ...novas];
    else topo.push({ ...no, filhos: novas });
  }

  return topo.filter((n) => n.tipo === 'tela' || (n.filhos?.length ?? 0) > 0);
}

/** Lista completa para salvar: o nó e, em seguida, as telas dele */
export function achatarMenu(arvore: NoMenu[]): ItemMenuSalvo[] {
  return arvore.flatMap((no, i) => [
    {
      chave: no.chave,
      tipo: no.tipo,
      pai: null,
      posicao: i,
      rotuloI18n: no.rotuloI18n,
      icone: no.icone,
    },
    ...(no.filhos ?? []).map((f, j) => ({
      chave: f.chave,
      tipo: f.tipo,
      pai: no.chave,
      posicao: j,
      rotuloI18n: f.rotuloI18n,
      icone: f.icone,
    })),
  ]);
}

/** Só os campos que mudaram, como salvar_menu espera; nada mudou = nulo */
export function diferencaAparencia(
  atual: AparenciaMenu,
  nova: AparenciaMenu
): Record<string, string | null> | null {
  const mudou: Record<string, string | null> = {};
  for (const [campo, coluna] of CAMPOS_APARENCIA) {
    const antes = atual[campo];
    const depois = nova[campo];
    if (CAMPOS_LOGO.has(campo)) {
      if (antes !== depois) mudou[coluna] = depois;
    } else if (String(antes).toUpperCase() !== String(depois).toUpperCase()) {
      mudou[coluna] = String(depois).toUpperCase();
    }
  }
  return Object.keys(mudou).length > 0 ? mudou : null;
}

const aparenciaDaLinha = (l: Linha): AparenciaMenu =>
  Object.fromEntries(
    CAMPOS_APARENCIA.map(([campo, coluna]) => [campo, l[coluna] ?? null])
  ) as unknown as AparenciaMenu;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class MenuOrganizadoService {
  constructor(
    private readonly cliente: Cliente = supabase,
    private readonly agora: () => number = () => Date.now()
  ) {}

  async carregar(): Promise<MenuSalvo> {
    const [itens, aparencia] = await Promise.all([
      this.cliente.from('menu_itens').select('*').order('posicao'),
      this.cliente.from('menu_aparencia').select('*'),
    ]);
    const erro = itens.error ?? aparencia.error;
    if (erro) throw new Error(`Falha ao carregar o menu: ${erro.message}`);

    const porTema = new Map((aparencia.data as Linha[]).map((a) => [a.tema, aparenciaDaLinha(a)]));
    return {
      itens: (itens.data as Linha[]).map((i) => ({
        chave: i.chave,
        tipo: i.tipo,
        pai: i.pai ?? null,
        posicao: i.posicao,
        rotuloI18n: i.rotulo_i18n,
        icone: i.icone ?? null,
      })),
      aparencia: { claro: porTema.get('claro')!, escuro: porTema.get('escuro')! },
    };
  }

  /** arvore nula = "Ordem padrão" (volta ao menu do código) */
  async salvar(input: {
    arvore: NoMenu[] | null;
    aparenciaAtual: Record<TemaMenu, AparenciaMenu>;
    aparenciaNova: Record<TemaMenu, AparenciaMenu>;
  }): Promise<void> {
    const aparencia: Record<string, Record<string, string | null>> = {};
    for (const tema of TEMAS) {
      const diferenca = diferencaAparencia(input.aparenciaAtual[tema], input.aparenciaNova[tema]);
      if (diferenca) aparencia[tema] = diferenca;
    }

    const { error } = await this.cliente.rpc('salvar_menu', {
      p_itens: (input.arvore ? achatarMenu(input.arvore) : []).map((i) => ({
        chave: i.chave,
        tipo: i.tipo,
        pai: i.pai,
        posicao: i.posicao,
        rotulo_i18n: i.rotuloI18n,
        icone: i.icone,
      })),
      p_aparencia: Object.keys(aparencia).length > 0 ? aparencia : null,
    });
    if (error) throw new Error(`Falha ao salvar o menu: ${error.message}`);
  }

  /** Sobe o logo e devolve o caminho; ele só vale depois de salvo na aparência */
  async enviarLogo(tema: TemaMenu, tipo: 'aberto' | 'recolhido', arquivo: File): Promise<string> {
    const extensao = EXTENSAO_POR_TIPO[arquivo.type];
    if (!extensao) throw new Error('Use PNG, SVG, WebP ou JPG.');
    if (arquivo.size > LIMITE_LOGO_BYTES) throw new Error('O logo passa de 500 KB.');

    const caminho = `${tema}/${tipo}-${this.agora()}.${extensao}`;
    const { error } = await this.cliente.storage
      .from(BUCKET)
      .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
    if (error) throw new Error(`Falha ao enviar o logo: ${error.message}`);
    return caminho;
  }

  /** Endereço temporário do logo (o bucket é privado) */
  async urlDoLogo(caminho: string): Promise<string> {
    const { data, error } = await this.cliente.storage
      .from(BUCKET)
      .createSignedUrl(caminho, VALIDADE_URL_LOGO_S);
    if (error) throw new Error(`Falha ao carregar o logo: ${error.message}`);
    return data.signedUrl;
  }
}

export const menuOrganizadoService = new MenuOrganizadoService();
