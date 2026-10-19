# Implementation Plan — Desabilitar filtro de mês na aba "Enviados" durante a busca

## Contexto (do relatório de investigação)

Toda a mudança cabe em **`src/pages/admin/LancarRequerimentos.tsx`**. O service `buscarRequerimentosEnviados(mesCobranca?)` e o hook `useRequerimentosEnviados(filtros)` **não serão alterados** — o service já retorna todos os meses quando `mes_cobranca` é ausente, e o hook apenas repassa `filtros?.mes_cobranca`. O problema é duplo: (1) o hook envia `mes_cobranca` à API (que restringe ao mês), e (2) o `useMemo` `requerimentosFiltrados` reaplica o filtro de mês no cliente — mesmo quando o usuário digitou no "Buscar".

Estado relevante (aba Enviados): `filtrosEnviados.busca` (`string | undefined`, atualizado via debounce de 300 ms em `debouncedSearchEnviados`) e `filtrosEnviados.mes_cobranca` (`string | undefined`, formato `MM/YYYY`, padrão `getDefaultMesCobranca()`).

## Decisões de design (registradas)

1. **Preservar `mesSelecionado` sem snapshot.** Não zeramos `filtrosEnviados.mes_cobranca` ao digitar. Em vez disso, criamos um filtro "efetivo" (com `mes_cobranca: undefined`) somente para passar ao hook; o estado original `filtrosEnviados.mes_cobranca` permanece intacto. Ao limpar a busca, o mês preservado volta a filtrar automaticamente. _Rationale:_ satisfaz o requisito 3 com a mudança mínima, sem lógica extra de "lembrar mês anterior".

2. **Desabilitar também os botões "Mês anterior/Próximo mês" (linhas ~826-896) durante a busca.** O requisito 1c nomeia o "campo Mês de Cobrança" (o `MonthYearPicker`), mas existem botões de navegação de mês equivalentes no cabeçalho da aba enviados que também chamam `handleFiltroEnviadosChange('mes_cobranca', ...)`. Se ficarem ativos, o usuário mudaria o mês durante a busca e o "mês preservado" deixaria de ser o original — violando o requisito 3. _Rationale:_ desabilitar ambos é a única forma de garantir preservação real e mantém UX consistente (não faz sentido desabilitar o picker e deixar botões equivalentes ativos).

3. **Indicação visual via `opacity-50` + texto explicativo inline em pt-BR** ("Mês ignorado durante a busca"), sem editar arquivos de i18n. _Rationale:_ o requisito exige "opacidade reduzida OU tooltip"; o próprio arquivo já usa strings inline em português (ex.: `aria-label="Mês anterior"`, `aria-label="Próximo mês"`), então o precedente permite manter o escopo mínimo e não tocar em `src/i18n/locales/*`.

4. **Mudança B aplicada no `useMemo` compartilhado** com `&& !currentFiltros.busca` (afeta ambas as abas via `currentFiltros`). A aba `nao-enviados` tem `filtros.mes_cobranca` padrão `undefined`, então o bloco do mês já é no-op nela — nenhuma mudança observável no uso normal. _Rationale:_ abordagem minimalista recomendada pelo relatório, evita adicionar `activeTab` às dependências do memo.

---

## Plano

- [ ] 1. **Mudança A — Buscar todos os meses no servidor quando houver busca.**
      Criar `filtrosEnviadosEfetivos` imediatamente antes da chamada do hook `useRequerimentosEnviados`. Quando `filtrosEnviados.busca` for truthy, espalhar `filtrosEnviados` sobrescrevendo `mes_cobranca: undefined`; caso contrário, usar `filtrosEnviados` como está. Passar `filtrosEnviadosEfetivos` ao hook no lugar de `filtrosEnviados`. A chave de cache do hook inclui o objeto `filtros` inteiro, então "busca ativa" gera entrada de cache distinta (sem mês) — correto.
      Files: `src/pages/admin/LancarRequerimentos.tsx` (linhas ~166-170)
      De (atual):
      `ts
        const {
            data: requerimentosEnviados = [],
            isLoading: isLoadingEnviados,
            refetch: refetchEnviados
        } = useRequerimentosEnviados(filtrosEnviados);
    `
      Para:
      ```ts
      // Quando há texto de busca, ignorar o filtro de mês no servidor para buscar todos os meses.
      // mes_cobranca permanece preservado em filtrosEnviados.mes_cobranca e é reaplicado ao limpar a busca.
      const filtrosEnviadosEfetivos: FiltrosRequerimentos = filtrosEnviados.busca
      ? { ...filtrosEnviados, mes_cobranca: undefined }
      : filtrosEnviados;

          const {
              data: requerimentosEnviados = [],
              isLoading: isLoadingEnviados,
              refetch: refetchEnviados
          } = useRequerimentosEnviados(filtrosEnviadosEfetivos);
      ```
      Verify: `npm run typecheck` — sem erros de tipo (confirma `FiltrosRequerimentos` compatível e `filtrosEnviadosEfetivos` tipado).

- [ ] 2. **Mudança B — Ignorar o filtro de mês no cliente quando houver busca.**
      No `useMemo` `requerimentosFiltrados`, condicionar o bloco de mês a `!currentFiltros.busca`. Isto usa `currentFiltros` (que aponta para o estado original `filtrosEnviados` com o mês real preservado), garantindo que ao limpar a busca o mês volte a filtrar pelo valor selecionado.
      Files: `src/pages/admin/LancarRequerimentos.tsx` (linhas ~211-215)
      De (atual):
      `ts
                // Filtro de mês/ano - SEMPRE aplicar se estiver definido
                if (currentFiltros.mes_cobranca) {
                    if (req.mes_cobranca !== currentFiltros.mes_cobranca) return false;
                }
    `
      Para:
      `ts
                // Filtro de mês/ano - aplicar apenas quando NÃO houver busca textual.
                // Durante a busca, o mês é ignorado (a query já busca todos os meses) e o mês selecionado é preservado no estado.
                if (currentFiltros.mes_cobranca && !currentFiltros.busca) {
                    if (req.mes_cobranca !== currentFiltros.mes_cobranca) return false;
                }
    `
      Verify: `npm run typecheck` e `npm run lint` — sem erros. (A aba `nao-enviados` não é afetada: seu `filtros.mes_cobranca` padrão é `undefined`, tornando o bloco no-op.)

- [ ] 3. **Mudança C1 — Desabilitar o `MonthYearPicker` da aba Enviados durante a busca.**
      Adicionar `disabled={!!filtrosEnviados.busca}` ao `MonthYearPicker` que usa `filtrosEnviados.mes_cobranca` (o da aba enviados, linhas ~1213-1218 — NÃO mexer no picker da aba nao-enviados, linhas ~1017-1022, que usa `filtros.mes_cobranca`).
      Files: `src/pages/admin/LancarRequerimentos.tsx` (linhas ~1213-1218)
      De (atual):
      `tsx
                                                    <MonthYearPicker
                                                        value={filtrosEnviados.mes_cobranca || ''}
                                                        onChange={(value) => handleFiltroEnviadosChange('mes_cobranca', value)}
                                                        placeholder={t('requirements.allMonths')}
                                                    />
    `
      Para:
      `tsx
                                                    <MonthYearPicker
                                                        value={filtrosEnviados.mes_cobranca || ''}
                                                        onChange={(value) => handleFiltroEnviadosChange('mes_cobranca', value)}
                                                        placeholder={t('requirements.allMonths')}
                                                        disabled={!!filtrosEnviados.busca}
                                                    />
    `
      Verify: `npm run typecheck` e `npm run lint` — sem erros (confirma que `MonthYearPicker` aceita `disabled`, já suportado em `src/components/ui/month-year-picker.tsx`).

- [ ] 4. **Mudança C2 — Desabilitar os botões "Mês anterior/Próximo mês" durante a busca e adicionar indicação visual.**
      No card de "Navegação de Período" (apenas na aba enviados), aplicar `opacity-50` no `div` flex interno quando houver busca, adicionar `disabled={!!filtrosEnviados.busca}` aos dois `<Button>` (mês anterior e próximo mês) e inserir um texto explicativo condicional abaixo do contador de resultados.
      Files: `src/pages/admin/LancarRequerimentos.tsx` (linhas ~823-870)
      De (atual, trechos-chave):
      ```tsx
      <div className="flex items-center justify-between gap-4">
      <Button
      variant="outline"
      size="sm"
      onClick={() => { ... handleFiltroEnviadosChange('mes_cobranca', novoMesCobranca); }}
      className="flex items-center gap-2"
      aria-label="Mês anterior" >
      <ChevronLeft className="h-4 w-4" />
      {t('common.previous')}
      </Button>

                                  <div className="text-center">
                                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                          {(() => { ... return `${mesesNomes[mesNum - 1]} ${anoNum}`; })()}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {requerimentosFiltrados.length} {t('common.results')}
                                      </div>
                                  </div>

                                  <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => { ... handleFiltroEnviadosChange('mes_cobranca', novoMesCobranca); }}
                                      className="flex items-center gap-2"
                                      aria-label="Próximo mês"
                                  >
                                      {t('common.next')}
                                      <ChevronRight className="h-4 w-4" />
                                  </Button>
                              </div>
      ```
      Para (trechos alterados):
      ```tsx
                              <div className={`flex items-center justify-between gap-4 ${filtrosEnviados.busca ? 'opacity-50' : ''}`}>
                                  <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => { ... handleFiltroEnviadosChange('mes_cobranca', novoMesCobranca); }}
                                      className="flex items-center gap-2"
                                      aria-label="Mês anterior"
                                      disabled={!!filtrosEnviados.busca}
                                  >
                                      <ChevronLeft className="h-4 w-4" />
                                      {t('common.previous')}
                                  </Button>

                                  <div className="text-center">
                                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                          {(() => { ... return `${mesesNomes[mesNum - 1]} ${anoNum}`; })()}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {requerimentosFiltrados.length} {t('common.results')}
                                      </div>
                                      {filtrosEnviados.busca && (
                                          <div className="text-xs text-amber-600 dark:text-amber-500">
                                              Mês ignorado durante a busca
                                          </div>
                                      )}
                                  </div>

                                  <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => { ... handleFiltroEnviadosChange('mes_cobranca', novoMesCobranca); }}
                                      className="flex items-center gap-2"
                                      aria-label="Próximo mês"
                                      disabled={!!filtrosEnviados.busca}
                                  >
                                      {t('common.next')}
                                      <ChevronRight className="h-4 w-4" />
                                  </Button>
                              </div>
      ```
      Verify: `npm run typecheck` e `npm run lint` — sem erros. Confirma que os `Button` aceitam `disabled` e que o JSX está balanceado.

- [ ] 5. **Verificação final (build + lint + testes existentes + teste manual).**
      Rodar typecheck, lint, build e os testes existentes do hook (não adicionar novos testes — restrição do requisito). Os testes do hook validam que a camada service/hook (intocada) segue funcionando; a mudança é só no componente.
      Files: nenhum (validação)
      Verify: - `npm run typecheck` → 0 erros (`tsc --noEmit -p tsconfig.app.json`). - `npm run lint` → 0 erros (`eslint .`). - `npm run build` → build conclui sem erro (`vite build`). - `npm run test:run -- src/hooks/__tests__/useRequerimentos.test.ts` → testes do hook passam (sem regressão). - Teste manual na aba "Enviados": (a) digitar um número de chamado de um mês diferente do corrente e confirmar que o resultado aparece sem trocar de mês; (b) confirmar que o `MonthYearPicker` e os botões "Mês anterior/Próximo mês" ficam desabilitados/opacos e aparece o texto "Mês ignorado durante a busca"; (c) limpar a busca e confirmar que o filtro de mês volta a ativar pelo mês que estava selecionado (preservado) e que os controles são reabilitados; (d) usar "Limpar Filtro" e confirmar comportamento normal (mês corrente, busca vazia).

---

## Pontos de atenção / edge cases

- **Debounce (300 ms):** o `Input` de busca usa `defaultValue` (não controlado); `filtrosEnviados.busca` só atualiza após o debounce. Logo, o `disabled`/`opacity` reagem ~300 ms depois de o usuário parar de digitar — aceitável e já observado no relatório.
- **Preservação do mês:** ao limpar a busca, `filtrosEnviados.busca` volta a `undefined`; `filtrosEnviadosEfetivos` volta a ser `filtrosEnviados` (com o `mes_cobranca` original) e o `useMemo` reaplica o mês — exatamente o comportamento pedido.
- **"Limpar Filtro" (`limparFiltrosEnviados`):** continua funcionando (restaura `mes_cobranca` ao corrente e limpa `busca`). Não alterado.
- **Performance:** durante a busca, a API retorna todos os requerimentos `enviado_faturamento`+`faturado` (sem paginação no service). A listagem usa `useVirtualPagination` (20/página), então a renderização é paginada, mas o fetch é completo. Fora do escopo desta tarefa; se necessário, otimização server-side futura.
- **Escopo:** somente `src/pages/admin/LancarRequerimentos.tsx` é alterado. Nenhuma mudem em `src/services/*`, `src/hooks/*` ou testes.
