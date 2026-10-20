import type { ComponentType } from 'react';

/**
 * Registro dos protótipos visuais de `src/pages/prototipos/` (rota `/prototipos/:slug`, só em dev).
 * Ver skill `prototipo`.
 */

export type EstadoPrototipo = 'dados' | 'carregando' | 'vazio' | 'erro';

export interface PrototipoProps {
  estado: EstadoPrototipo;
}

export type PrototipoLoader = () => Promise<{ default: ComponentType<PrototipoProps> }>;

export interface Prototipo {
  slug: string;
  nome: string;
  load: PrototipoLoader;
}

export const ESTADOS_PROTOTIPO: { valor: EstadoPrototipo; rotulo: string }[] = [
  { valor: 'dados', rotulo: 'Com dados' },
  { valor: 'carregando', rotulo: 'Carregando' },
  { valor: 'vazio', rotulo: 'Vazio' },
  { valor: 'erro', rotulo: 'Erro' },
];

function palavrasDoArquivo(caminho: string): string[] {
  const base = caminho.split('/').pop()?.replace(/\.tsx$/, '') ?? '';
  return base.match(/[A-Z][a-z]*\d*|[a-z]+\d*|\d+/g) ?? [];
}

export function slugDoArquivo(caminho: string): string {
  return palavrasDoArquivo(caminho).join('-').toLowerCase();
}

export function nomeDoArquivo(caminho: string): string {
  return palavrasDoArquivo(caminho).join(' ');
}

export function montarRegistroPrototipos(modulos: Record<string, PrototipoLoader>): Prototipo[] {
  return Object.entries(modulos)
    .map(([caminho, load]) => ({ slug: slugDoArquivo(caminho), nome: nomeDoArquivo(caminho), load }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function encontrarPrototipo(registro: Prototipo[], slug: string | undefined): Prototipo | undefined {
  if (!slug) return undefined;
  return registro.find(p => p.slug === slug);
}
