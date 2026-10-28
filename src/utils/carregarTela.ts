/**
 * Telas carregadas sob demanda (React.lazy): o app não baixa todas as telas na
 * primeira abertura, só a que for aberta.
 *
 * Depois de um deploy, os arquivos das telas mudam de nome. Quem estava com o sistema
 * aberto e abre uma tela ainda não carregada pediria um arquivo que não existe mais:
 * nesse caso a página é recarregada uma vez, para pegar a versão nova.
 */
import { lazy, type ComponentType } from 'react';

const MARCA = 'tela-recarregada';

interface Armazenamento {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
  removeItem(chave: string): void;
}

/** Falha ao baixar o arquivo da tela (Chrome, Firefox e Safari), não erro do código dela */
export function ehFalhaDeCarga(erro: unknown): boolean {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  return /dynamically imported module|Importing a module script failed/i.test(mensagem);
}

const tentar = <T>(fn: () => T): T | null => {
  try {
    return fn();
  } catch {
    return null;
  }
};

export async function carregarComRecarga<M>(
  importar: () => Promise<M>,
  {
    recarregar = () => window.location.reload(),
    armazenamento = tentar(() => window.sessionStorage),
  }: { recarregar?: () => void; armazenamento?: Armazenamento | null } = {}
): Promise<M> {
  try {
    const modulo = await importar();
    tentar(() => armazenamento?.removeItem(MARCA));
    return modulo;
  } catch (erro) {
    const jaRecarregou = tentar(() => armazenamento?.getItem(MARCA)) === '1';
    if (!ehFalhaDeCarga(erro) || jaRecarregou || !armazenamento) throw erro;
    tentar(() => armazenamento.setItem(MARCA, '1'));
    recarregar();
    // A página está sendo recarregada: não há tela para mostrar
    return new Promise<M>(() => undefined);
  }
}

/** React.lazy com a recarga de segurança */
export function telaSobDemanda<P>(importar: () => Promise<{ default: ComponentType<P> }>) {
  return lazy(() => carregarComRecarga(importar));
}
