// Escopo do banco em árvore Solução › Produto › Módulos (decisão de 21/10/2026): a solução só
// agrupa; marca-se o produto inteiro (inclui módulos criados depois) ou módulos dele. O que outro
// banco já cobre fica bloqueado (RN-05), e soluções sem AMS não entram em banco.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelecaoEscopo } from '@/utils/bancosTela';
import type { Catalogo } from '@/types/catalogo';
import type { SolucaoDaEmpresa } from '@/types/empresas';

/** A seleção sem o produto (desmarcado por inteiro ou sem nenhum módulo) */
const semProduto = (s: SelecaoEscopo, produtoId: string): SelecaoEscopo =>
  Object.fromEntries(Object.entries(s).filter(([id]) => id !== produtoId));

const porOrdem = <T extends { ordem: number }>(lista: T[]) =>
  [...lista].sort((a, b) => a.ordem - b.ordem);

export function ArvoreEscopo({
  catalogo,
  solucoesEmpresa,
  cobertos,
  selecao,
  onChange,
}: {
  catalogo: Catalogo;
  /** Soluções contratadas pela empresa; sem AMS aparecem bloqueadas */
  solucoesEmpresa: SolucaoDaEmpresa[];
  /** "produtoId|*" ou "produtoId|moduloId" → nome do outro banco que já cobre */
  cobertos: Record<string, string>;
  selecao: SelecaoEscopo;
  onChange: (s: SelecaoEscopo) => void;
}) {
  const { t } = useTranslation();
  const e = (chave: string, valores?: Record<string, unknown>) =>
    t(`empresasCadastro.edicaoBanco.${chave}`, valores);
  const [abertos, setAbertos] = useState<string[]>([]);
  const contratadas = porOrdem(catalogo.solucoes).filter((s) =>
    solucoesEmpresa.some((x) => x.solucaoId === s.id)
  );

  return (
    <div className="space-y-3">
      {contratadas.map((sol) => {
        const semAms = !solucoesEmpresa.find((x) => x.solucaoId === sol.id)?.temAms;
        // Ativos e definitivos; o que já está no escopo continua visível
        const produtos = porOrdem(
          catalogo.produtos.filter(
            (p) =>
              p.solucaoId === sol.id &&
              ((p.ativo && !p.aClassificar) || selecao[p.id] !== undefined)
          )
        );
        return (
          <section key={sol.id} aria-label={sol.nome}>
            <h4 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-ds-fg-secondary">
              {sol.nome}
              {semAms && (
                <span className="font-normal normal-case tracking-normal text-ds-fg-muted">
                  · {e('semAms')}
                </span>
              )}
            </h4>
            <ul className="divide-y divide-ds-border overflow-hidden rounded-xl border border-ds-border">
              {produtos.map((p) => {
                const selecionado = selecao[p.id];
                const modulos = porOrdem(
                  catalogo.modulos.filter(
                    (m) =>
                      m.produtoId === p.id &&
                      (m.ativo || (Array.isArray(selecionado) && selecionado.includes(m.id)))
                  )
                );
                const inteiroEmOutro = cobertos[`${p.id}|*`];
                // RN-05: o produto inteiro conflita com qualquer módulo dele em outro banco
                const moduloEmOutro = modulos.some((m) => cobertos[`${p.id}|${m.id}`]);
                const bloqueioProduto = semAms || !!inteiroEmOutro || moduloEmOutro;
                const total = selecionado === 'todos';
                const marcados = total
                  ? modulos.map((m) => m.id)
                  : ((selecionado as string[]) ?? []);
                const parcial = !total && marcados.length > 0;
                const aberto = abertos.includes(p.id);
                return (
                  <li key={p.id}>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <input
                        type="checkbox"
                        aria-label={e('inteiro', { produto: p.nome })}
                        checked={total}
                        ref={(el) => {
                          if (el) el.indeterminate = parcial;
                        }}
                        disabled={bloqueioProduto}
                        onChange={(ev) => {
                          const resto = semProduto(selecao, p.id);
                          onChange(ev.target.checked ? { ...selecao, [p.id]: 'todos' } : resto);
                        }}
                        className="h-4 w-4 accent-ds-accent"
                      />
                      <button
                        type="button"
                        disabled={!modulos.length}
                        onClick={() =>
                          setAbertos((a) =>
                            a.includes(p.id) ? a.filter((x) => x !== p.id) : [...a, p.id]
                          )
                        }
                        aria-expanded={modulos.length ? aberto : undefined}
                        className="flex flex-1 items-center justify-between gap-2 text-left text-sm font-medium text-ds-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus disabled:cursor-default"
                      >
                        <span className={bloqueioProduto ? 'text-ds-fg-disabled' : undefined}>
                          {p.nome}
                          {inteiroEmOutro && (
                            <span className="font-normal text-ds-fg-muted">
                              {' '}
                              · {e('emOutro', { banco: inteiroEmOutro })}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-2 text-xs font-normal text-ds-fg-muted">
                          {modulos.length ? (
                            <>
                              <span className="tabular-nums">
                                {total
                                  ? e('todosModulos')
                                  : e('modulosDe', { n: marcados.length, total: modulos.length })}
                              </span>
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 transition-transform',
                                  aberto && 'rotate-180'
                                )}
                              />
                            </>
                          ) : (
                            e('semModulos')
                          )}
                        </span>
                      </button>
                    </div>
                    {aberto && modulos.length > 0 && (
                      <ul className="grid gap-x-4 bg-ds-bg-subtle px-3 py-2 sm:grid-cols-2">
                        {modulos.map((m) => {
                          const emOutro = cobertos[`${p.id}|${m.id}`] ?? inteiroEmOutro;
                          const bloqueado = semAms || !!emOutro;
                          return (
                            <li key={m.id}>
                              <label
                                className={cn(
                                  'flex min-h-11 items-center gap-3 py-1 text-sm md:min-h-9',
                                  bloqueado ? 'text-ds-fg-disabled' : 'text-ds-fg'
                                )}
                                title={emOutro ? e('jaEm', { banco: emOutro }) : undefined}
                              >
                                <input
                                  type="checkbox"
                                  aria-label={m.nome}
                                  disabled={bloqueado || total}
                                  checked={total || marcados.includes(m.id)}
                                  onChange={(ev) => {
                                    const lista = ev.target.checked
                                      ? [...marcados, m.id]
                                      : marcados.filter((x) => x !== m.id);
                                    const resto = semProduto(selecao, p.id);
                                    onChange(lista.length ? { ...selecao, [p.id]: lista } : resto);
                                  }}
                                  className="h-4 w-4 accent-ds-accent"
                                />
                                <span className="min-w-0 flex-1 truncate">{m.nome}</span>
                                {emOutro && (
                                  <span className="shrink-0 text-xs text-ds-fg-muted">
                                    {e('emOutro', { banco: emOutro })}
                                  </span>
                                )}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
