/**
 * Repositório que guarda cada consulta pelos argumentos. Calcular um mês refaz a
 * cadeia desde o início do período: sem o cache, montar o quadro de um semestre
 * repetiria as mesmas consultas várias vezes. Erro não fica guardado.
 *
 * Só para leitura: uma gravação passada por aqui também seria guardada.
 */
export function comCache<T extends object>(repo: T): T {
  const guardadas = new Map<string, Promise<unknown>>();
  const embrulhado = {} as T;
  for (const nome of Object.keys(repo) as (keyof T & string)[]) {
    const original = repo[nome] as unknown as (...args: unknown[]) => Promise<unknown>;
    (embrulhado as Record<string, unknown>)[nome] = (...args: unknown[]) => {
      const chave = `${nome}:${JSON.stringify(args)}`;
      if (!guardadas.has(chave)) {
        const promessa = original.apply(repo, args);
        promessa.catch(() => guardadas.delete(chave));
        guardadas.set(chave, promessa);
      }
      return guardadas.get(chave);
    };
  }
  return embrulhado;
}
