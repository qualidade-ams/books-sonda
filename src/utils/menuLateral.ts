// Regras do menu lateral montado a partir de dados (Modelagem_Fase3.md, seção 12.1): o que cada
// usuário vê e qual menu fica aberto pela tela atual.
import type { NoMenu } from '@/types/menuOrganizado';

/** Só as telas que o usuário pode ver; menu sem nenhuma tela visível some */
export function menuVisivel(arvore: NoMenu[], podeVer: (screenKey: string) => boolean): NoMenu[] {
  const telaVisivel = (n: NoMenu) => !n.screenKey || podeVer(n.screenKey);
  return arvore.flatMap((no) => {
    if (no.tipo === 'tela') return telaVisivel(no) ? [no] : [];
    const filhos = (no.filhos ?? []).filter(telaVisivel);
    return filhos.length ? [{ ...no, filhos }] : [];
  });
}

const daRota = (chave: string, rota: string) => rota === chave || rota.startsWith(`${chave}/`);

/** Chave do menu que contém a tela da rota (ou uma subpágina dela); tela solta ou fora do menu, nulo */
export function menuDaRota(arvore: NoMenu[], rota: string): string | null {
  const menu = arvore.find(
    (no) => no.tipo === 'menu' && (no.filhos ?? []).some((f) => daRota(f.chave, rota))
  );
  return menu?.chave ?? null;
}
