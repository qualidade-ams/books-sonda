// Regras da aba Ordem de Organizar Menu (Modelagem_Fase3.md, seção 12.1). A árvore vira uma lista
// achatada (padrão "sortable tree" do dnd-kit): o arrasto vertical escolhe a posição e o horizontal,
// o nível. Uma tela solta que recebe outra vira menu, com o nome e o ícone dela.
import { arrayMove } from '@dnd-kit/sortable';
import type { AparenciaMenu, NoMenu, TemaMenu } from '@/types/menuOrganizado';

/** Recuo de cada nível; também é o quanto arrastar na horizontal para trocar de nível */
export const RECUO = 32;
/** Menu criado ao soltar uma tela dentro de outra tela solta */
export const PREFIXO_NOVO_MENU = 'menu:';

export interface Linha {
  id: string;
  tipo: 'menu' | 'tela';
  /** 0: primeiro nível; 1: tela dentro de um menu */
  nivel: 0 | 1;
  no: NoMenu;
  /** Telas do menu */
  total?: number;
}

/** Arrastando um menu, as telas somem: ele só troca de lugar com o primeiro nível */
export function achatar(arvore: NoMenu[], soPrimeiroNivel: boolean): Linha[] {
  return arvore.flatMap((no) => {
    const linha: Linha = {
      id: no.chave,
      tipo: no.tipo,
      nivel: 0,
      no,
      total: no.tipo === 'menu' ? (no.filhos?.length ?? 0) : undefined,
    };
    if (no.tipo === 'tela' || soPrimeiroNivel) return [linha];
    return [
      linha,
      ...(no.filhos ?? []).map<Linha>((f) => ({ id: f.chave, tipo: 'tela', nivel: 1, no: f })),
    ];
  });
}

/** A tela como item da árvore, sem a lista de filhos */
const semFilhos = (no: NoMenu): NoMenu => {
  const copia = { ...no };
  delete copia.filhos;
  return copia;
};

/**
 * A tela de nível 1 pertence ao item mais próximo acima dela. Se esse item é uma tela solta, ela
 * vira um menu com o mesmo nome, e a própria tela passa a ser a primeira dele. Se esse menu volta a
 * ter só a tela de origem, ela volta a ser solta.
 */
export function montar(linhas: Linha[]): NoMenu[] {
  const arvore: NoMenu[] = [];
  for (const l of linhas) {
    const ultimo = arvore[arvore.length - 1];
    if (l.tipo === 'menu') arvore.push({ ...l.no, filhos: [] });
    else if (l.nivel === 0 || !ultimo) arvore.push(semFilhos(l.no));
    else if (ultimo.tipo === 'menu') ultimo.filhos = [...(ultimo.filhos ?? []), semFilhos(l.no)];
    else
      arvore[arvore.length - 1] = {
        chave: `${PREFIXO_NOVO_MENU}${ultimo.chave}`,
        tipo: 'menu',
        rotuloI18n: ultimo.rotuloI18n,
        icone: ultimo.icone,
        filhos: [ultimo, semFilhos(l.no)],
      };
  }
  return arvore.map((no) =>
    no.chave.startsWith(PREFIXO_NOVO_MENU) &&
    no.filhos?.length === 1 &&
    `${PREFIXO_NOVO_MENU}${no.filhos[0].chave}` === no.chave
      ? no.filhos[0]
      : no
  );
}

/** Nível em que a linha arrastada cai, pela posição e pelo deslocamento horizontal */
export function projetar(
  linhas: Linha[],
  ativo: string,
  sobre: string,
  deslocamento: number
): { nivel: 0 | 1; pai: Linha | null } {
  const de = linhas.findIndex((l) => l.id === ativo);
  const para = linhas.findIndex((l) => l.id === sobre);
  const movidas = arrayMove(linhas, de, para);
  const linha = movidas[para];
  if (linha.tipo === 'menu') return { nivel: 0, pai: null };
  const anterior = movidas[para - 1];
  const seguinte = movidas[para + 1];
  // Dentro de menu (ou junto das telas de um menu) entra direto; numa tela solta, só arrastando
  // para a direita, senão quem só quer deixar a tela ao lado dela criaria um menu sem querer
  const maximo = !anterior
    ? 0
    : anterior.tipo === 'menu' || anterior.nivel === 1
      ? 1
      : deslocamento >= RECUO / 2
        ? 1
        : 0;
  // Não separa um menu das suas telas
  const minimo = seguinte?.nivel === 1 ? 1 : 0;
  const desejado = linha.nivel + Math.round(deslocamento / RECUO);
  const nivel = Math.min(maximo, Math.max(minimo, desejado)) as 0 | 1;
  const pai =
    nivel === 1
      ? (movidas
          .slice(0, para)
          .reverse()
          .find((l) => l.nivel === 0) ?? null)
      : null;
  return { nivel, pai };
}

/** Onde cada item está: o menu ('' no primeiro nível) e a posição */
export function posicoes(arvore: NoMenu[]) {
  const p = new Map<string, { pai: string; i: number }>();
  arvore.forEach((no, i) => {
    p.set(no.chave, { pai: '', i });
    no.filhos?.forEach((f, j) => p.set(f.chave, { pai: no.chave, i: j }));
  });
  return p;
}

/** O que mudou na ordem em relação à salva, para o resumo da barra de salvar */
export function mudancasDaOrdem(salvo: NoMenu[], atual: NoMenu[]) {
  const antes = posicoes(salvo);
  const depois = posicoes(atual);
  const ehMenu = new Set(atual.filter((n) => n.tipo === 'menu').map((n) => n.chave));
  // Ordem relativa entre os que estavam juntos antes e continuam juntos
  const ordem = (pai: string, de: typeof antes) =>
    [...de.entries()]
      .filter(([k, v]) => v.pai === pai && antes.get(k)?.pai === depois.get(k)?.pai)
      .sort((a, b) => a[1].i - b[1].i)
      .map(([k]) => k)
      .join('|');

  return {
    ordemDosMenus: ordem('', depois) !== ordem('', antes),
    menusCriados: atual.filter((n) => n.tipo === 'menu' && !antes.has(n.chave)).length,
    telasMovidas: [...depois.keys()].filter(
      (k) => !ehMenu.has(k) && depois.get(k)?.pai !== antes.get(k)?.pai
    ).length,
    menusReordenados: atual
      .filter((n) => n.tipo === 'menu' && ordem(n.chave, depois) !== ordem(n.chave, antes))
      .map((n) => n.chave),
  };
}

const estrutura = (arvore: NoMenu[]) =>
  arvore.map((n) => `${n.chave}:${(n.filhos ?? []).map((f) => f.chave).join(',')}`).join('/');

export const mesmaEstrutura = (a: NoMenu[], b: NoMenu[]) => estrutura(a) === estrutura(b);

/** Menus sem telas: saem do menu ao salvar */
export const menusVazios = (arvore: NoMenu[]) =>
  arvore.filter((n) => n.tipo === 'menu' && !n.filhos?.length).map((n) => n.chave);

/** A árvore depois de soltar `ativo` sobre `sobre` (nulo: fora da lista, nada muda) */
export function soltar(
  arvore: NoMenu[],
  ativo: string,
  sobre: string | null,
  deslocamento: number
): NoMenu[] {
  if (!sobre) return arvore;
  const no = arvore.find((n) => n.chave === ativo);
  if (no?.tipo === 'menu') {
    const para = arvore.findIndex((n) => n.chave === sobre);
    return para < 0 ? arvore : arrayMove(arvore, arvore.indexOf(no), para);
  }
  const linhas = achatar(arvore, false);
  const de = linhas.findIndex((l) => l.id === ativo);
  const para = linhas.findIndex((l) => l.id === sobre);
  if (de < 0 || para < 0) return arvore;
  const { nivel } = projetar(linhas, ativo, sobre, deslocamento);
  const movidas = arrayMove(linhas, de, para);
  movidas[para] = { ...movidas[para], nivel };
  return montar(movidas);
}

/* Aba Cores */

/** As cinco partes do menu; cada uma tem fundo e texto */
export type ParteDoMenu = 'menu' | 'item' | 'subitem' | 'hover' | 'selecionado';
export const PARTES_DO_MENU: ParteDoMenu[] = ['menu', 'item', 'subitem', 'hover', 'selecionado'];

const TEMAS: TemaMenu[] = ['claro', 'escuro'];
const mesmaCor = (a: string, b: string) => a.toUpperCase() === b.toUpperCase();

/** Fundo ou texto da parte mudou em relação ao salvo */
export const corMudou = (salva: AparenciaMenu, atual: AparenciaMenu, parte: ParteDoMenu) =>
  !mesmaCor(salva[`${parte}Fundo`], atual[`${parte}Fundo`]) ||
  !mesmaCor(salva[`${parte}Texto`], atual[`${parte}Texto`]);

/** Temas com cores e com logo diferentes do salvo, para o resumo da barra de salvar */
export function mudancasDaAparencia(
  salva: Record<TemaMenu, AparenciaMenu>,
  atual: Record<TemaMenu, AparenciaMenu>
) {
  return {
    cores: TEMAS.filter((t) => PARTES_DO_MENU.some((p) => corMudou(salva[t], atual[t], p))),
    logo: TEMAS.filter(
      (t) =>
        salva[t].logoPath !== atual[t].logoPath ||
        salva[t].logoRecolhidoPath !== atual[t].logoRecolhidoPath
    ),
  };
}
