# Modelagem da Fase 5: liberação por empresa

Versão 0.2, 29/10/2026. As perguntas da seção 13 foram respondidas em 29/10/2026: P4 com a cópia para o legado; as demais conforme a proposta. Nenhuma migration foi escrita ainda.

Base:

- Especificação v2.0, seções 5.7, 6, 7.2, 7.4 e 10 (CA-01, CA-08, CA-09, CA-13);
- `Decisoes_Negocio_Bancos_de_Horas.md`: D-05, D-09, D-10, D-11, D-15 e 9.3-1, 9.3-2, 9.3-4;
- `Modelagem_Fase2.md` (motor), `Modelagem_Fase3.md` (seções 7, 8 e 11) e `Modelagem_Fase4.md` (seção 7);
- levantamento do código atual do Book, da imagem do e-mail e do Saldo Parcial (29/10/2026, seção 2).

---

## 1. O que a Fase 5 entrega

| Entra                                                                                                | Fica para depois                                   |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Liberar** e **Voltar para legado** por empresa, na tela Comparação Legado x Novo                   | Virada do cadastro de empresas (Fase 6)            |
| **Saldo de abertura:** a empresa liberada continua do saldo do último Book do legado                 | Religação dos demais módulos (Fase 7)              |
| **Geração do Book** da empresa liberada fecha o mês no modelo novo (D-11), com retificação explícita | Aviso de apontamento acima de 24 h (etapa à parte) |
| **Seção de consumo do Book** com uma página por banco que o cliente vê, também no PDF                |                                                    |
| **Imagem do e-mail do Book** com uma tabela por banco                                                |                                                    |
| **Saldo Parcial agendado e "Executar agora"** com uma tabela por banco e Excel com uma aba por banco |                                                    |
| **Retroativos do modelo novo:** job de detecção no sync-api (Fase 3, seção 8.2)                      |                                                    |

**Regra geral (CA-01):** para empresa em Legado, nada muda. Book, PDF, imagem do e-mail, Saldo Parcial e Excel saem exatamente como hoje. Toda mudança fica atrás de `empresas.modelo_calculo = 'multiplo'`.

---

## 2. Como funciona hoje

| Parte                                          | Onde                                                                                                                                                       | O que importa para a Fase 5                                                                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Geração do Book                                | `booksService.gerarBooksLote`. É chamada pela tela Geração de Books, pelo teste de envio e pela geração automática no sync-api (`vendor/geracaoBooks.cjs`) | Calcula pelo legado, coleta, grava `books` e chama `bancoHorasQuarentenaService.fecharPeriodo`. Com `forcar_atualizacao`, reabre o período antes |
| Coleta do consumo                              | `booksDataCollectorService.gerarDadosConsumo` e `gerarDadosConsumoSegmentado`                                                                              | Grava `books.dados_consumo` e `dados_consumo_segmentado`                                                                                         |
| Página de consumo                              | `BookPrintView` (rota `/pdf/book/:id`) e `BookViewer`, com `BookConsumo` e `BookConsumoSegmentado`                                                         | **Os componentes ainda leem dados ao vivo** (`banco_horas_calculos`, repasse vigente, gráfico de 6 meses), mesmo com o snapshot gravado          |
| PDF                                            | Só o `booksPDFServiceV2` está em uso: Puppeteer em `api/pdf/generate.ts` abre a rota de impressão                                                          | Os outros três serviços de PDF não têm chamador                                                                                                  |
| Imagem do e-mail do Book                       | `booksDisparoService.montarEmailBookEmpresa` → `bancoHorasTableService.gerarImagemBancoHoras` → `/api/email/render-image`                                  | Só no navegador. Ao montar a imagem, recalcula e grava `banco_horas_calculos`                                                                    |
| Saldo Parcial agendado e "Executar agora"      | `agendadorSaldoParcial` no sync-api (`vendor/saldoParcial.cjs`) → `executarSaldoParcial` → `coletorSaldoParcial`                                           | Calcula pelo legado. **Não olha o `modelo_calculo`**: uma empresa liberada continuaria recebendo o e-mail antigo                                 |
| Saldo Parcial manual do Controle novo (Fase 3) | `envioControle.ts` com `conteudoBancos.ts` (`gerarHtmlTabelasBancos`, `gerarExcelBancos`)                                                                  | Já faz uma tabela e uma aba por banco. Só roda no navegador e só para empresa liberada                                                           |
| Fechamento novo                                | `fecharMes` (`fechamento.ts`)                                                                                                                              | Hoje só o modo sombra chama, e só para empresas em Legado                                                                                        |
| Retroativos novos                              | `bancos_horas_retroativos` e `_itens`, RPC `bancos_horas_registrar_retroativo` (migration 20261022000007), tela Apontamentos Retroativos                   | **Nenhum job grava.** A detecção do legado (`deteccaoAjustesRetroativosService`) não olha o `modelo_calculo`                                     |
| Liberação                                      | `empresas.modelo_calculo`, `modelo_alterado_em`, `modelo_alterado_por`; gatilho `desligar_espelho_ao_liberar`                                              | Não existe função, RPC nem botão. Nada grava `modelo_alterado_*`                                                                                 |

---

## 3. Liberar e Voltar para legado

### 3.1 Liberar

- **Onde:** detalhe da empresa na tela Comparação Legado x Novo. O botão "Liberar" fica ao lado de "Desfazer validação".
- **Quem:** Edição na tela `bancos_horas_comparacao` (pergunta P6).
- **Pré-condições**, conferidas na função do banco:
  - a empresa está validada (`validada_em` preenchido);
  - a situação atual não é Divergente;
  - há ao menos um banco ativo.
- **Função `liberar_empresa(p_empresa_id, p_motivo)`:** `SECURITY DEFINER`, com auditoria. Ela:
  - grava `modelo_calculo = 'multiplo'`, `modelo_alterado_em` e `modelo_alterado_por`;
  - grava o fechamento de transição (seção 4);
  - pelo gatilho que já existe, desliga o espelho dos parâmetros do legado (`espelha_legado = false`).
- **Mês de corte:** o primeiro mês que o legado ainda não fechou. Esse mês e os seguintes saem pelo modelo novo. Os meses já fechados ficam como o cliente recebeu, como decidido para a ANGLO (9.3-2).

### 3.2 Voltar para legado (CA-09)

- **Função `voltar_para_legado(p_empresa_id, p_motivo)`:** motivo obrigatório, com auditoria. Volta `modelo_calculo = 'legado'`. O comportamento atual volta na hora: as rotas de Book, imagem e Saldo Parcial voltam a usar o legado.
- **Meses que o modelo novo fechou durante a liberação:** continuam fechados no modelo novo. O legado não tem fechamento desses meses e passa a calculá-los ao vivo, como faz com qualquer mês aberto.
- **Reajustes e observações lançados no Controle novo durante a liberação (P4):** a própria função os copia para as tabelas atuais (`banco_horas_reajustes` e `banco_horas_observacoes`). Não há gatilho novo nas tabelas atuais. A confirmação mostra quantos lançamentos serão copiados.
  - Só entram os lançamentos ativos, dos bancos que o cliente vê, nos meses depois do corte. O Banco padrão interno fica de fora, como no Book.
  - **Sem duplicar:** a função liga `app.sincronizando` durante a cópia, para o espelho da Fase 4 não trazer o reajuste de volta. Cada reajuste novo copiado recebe o `reajuste_legado_id` da linha criada no legado.
  - Empresa com vários bancos: o legado tem um banco só, então os lançamentos de todos os bancos vão para ele. A justificativa leva o nome do banco de origem.
- A empresa volta para a Comparação. A validação é desfeita, com o motivo "Voltou para legado".

---

## 4. Saldo de abertura

**Problema:** "Explicada" quer dizer que a diferença tem motivo, mas os números podem ser diferentes. Exemplos:

- código trocado no Aranda depois do fechamento;
- apontamento lançado no mês seguinte.

Se o modelo novo simplesmente seguisse do saldo que ele mesmo calcula, o cliente veria o saldo mudar entre o último Book do legado e o primeiro do modelo novo.

**Proposta (pergunta P1): fechamento de transição.**

- Na liberação, a função grava, para o último mês fechado no legado, uma versão do fechamento novo com o motivo `transicao`.
- Os valores vêm do `snapshot_calculo` do legado: consumo, requerimentos, reajustes, saldo, repasse e excedente.
- O motor já parte do repasse do último mês fechado dentro do período (`motorBancosHoras.ts`, "ponto de partida"). Com isso, o primeiro mês novo continua exatamente do saldo que o cliente viu.
- Os itens do fechamento de transição são os do legado (`apontamentos_ids` e `tickets_ids`). Assim a detecção de retroativos do mês de transição compara com o que o cliente recebeu.

**Empresa com mais de um banco na liberação (pergunta P2):** o legado tem um só saldo. Proposta:

- cada banco recebe o saldo que o modelo novo calculou para ele;
- a diferença entre o total do legado e a soma dos bancos vai para o Banco padrão, com uma observação automática interna.

A ANGLO é o caso real. As outras empresas validadas hoje têm um banco só.

---

## 5. Geração do Book da empresa liberada

| Situação                                                                | Hoje (legado)                    | Empresa liberada                                                                                                                                                                                      |
| ----------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primeira geração do mês                                                 | Calcula, coleta, `fecharPeriodo` | `fecharMes(..., 'geracao_book')` e coleta a partir do fechamento                                                                                                                                      |
| Gerar de novo (inclusive a geração automática com `forcar_atualizacao`) | Reabre e fecha de novo           | **Não reabre (D-11):** coleta de novo a partir do fechamento vigente                                                                                                                                  |
| Retificar                                                               | Igual a gerar de novo            | Ação explícita: `fecharMes(..., 'retificacao')` grava nova versão e aplica os reajustes, as observações e os retroativos aprovados pendentes (D-05, D-09). Depois coleta e regera o PDF (pergunta P5) |

- **O legado não fecha** o mês da empresa liberada: `fecharPeriodo` não é chamado.
- **Book precisa de retificação:** o aviso que já existe (`books.precisa_retificacao`, sino) continua valendo.
- **sync-api:** a geração automática usa `vendor/geracaoBooks.cjs`, que precisa ser refeito. O teste `pacote*.test.ts` acusa se ficar desatualizado.

---

## 6. Seção de consumo do Book por banco

### 6.1 Snapshot

**`books_consumo_bancos`** (nova, spec A.2): uma linha por Book e banco.

| Coluna                       | Regra                                                                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `book_id`                    | FK para `books`, NOT NULL                                                                                                                                                                      |
| `banco_id`                   | FK para `bancos_horas`, NOT NULL                                                                                                                                                               |
| `empresa_id`                 | Empresa dona do banco. Difere do Book quando o banco é de uma consolidada (D-15)                                                                                                               |
| `nome_banco`, `nome_empresa` | Os nomes vigentes na geração (spec 4.2: Books gerados mantêm o nome)                                                                                                                           |
| `ordem`                      | A ordem do cadastro                                                                                                                                                                            |
| `dados` (jsonb)              | O que a página mostra: período de apuração, meses do período com as medidas, requerimentos, reajustes, observações para o cliente e consumo entre bancos (RN-24). Também os 6 meses do gráfico |
| `fechamento_id`              | A versão do fechamento usada                                                                                                                                                                   |

- Unicidade em (`book_id`, `banco_id`). Gerar de novo regrava as linhas do Book.
- **RLS:** a mesma visibilidade de `books`.
- **Quem aparece:** só bancos com `visivel_cliente` (o Banco padrão interno fica de fora, 9.3-1), ativos e vigentes no mês.
- **Consolidadas (D-15):** os bancos da consolidada entram como seções a mais, com o nome da empresa, sem somar saldos.

### 6.2 Página

- **`BookConsumoBancos`** (novo): uma página por linha do snapshot, com o nome do banco e o período de apuração no título. Reaproveita o layout de `BookConsumo`.
- **Lê só o snapshot.** Nenhuma consulta ao vivo, para o PDF de um Book enviado não mudar com o tempo.
- `BookPrintView` e `BookViewer` escolhem pela existência de linhas em `books_consumo_bancos` do Book, e não pelo `modelo_calculo` de hoje. Assim, um Book antigo continua abrindo do jeito que foi gerado, mesmo depois de Voltar para legado.
- `BookConsumoSegmentado` deixa de aparecer para a empresa liberada (spec 6.1).

### 6.3 Excel detalhado do Book

O "Exportar consumo" do Book da empresa liberada usa o `gerarExcelBancos` da Fase 3: uma aba de resumo, uma aba por banco e as colunas Banco e Módulo (spec 6.3).

---

## 7. Imagem do e-mail do Book

- Em `montarEmailBookEmpresa`, a empresa liberada gera a imagem a partir de `books_consumo_bancos` do Book do mês, com `gerarHtmlTabelasBancos` (uma tabela por banco na mesma imagem).
- **Não recalcula nada**: para essas empresas, some o efeito colateral de gravar `banco_horas_calculos`.
- O caminho especial da Novo Nordisk só vale para Legado.

---

## 8. Saldo Parcial agendado e "Executar agora"

- `executarSaldoParcial` passa a escolher pelo `modelo_calculo`:
  - **Legado:** o conteúdo de hoje, sem mudança.
  - **Liberada:** o conteúdo do envio manual do Controle novo (`controleSaldoParcialService` e `conteudoBancos`), com uma tabela por banco, o aviso da RN-25 e o Excel com uma aba por banco.
- O destinatário, o agendamento, a trava contra envio em dobro e o histórico não mudam. O assunto continua por empresa (9.3-4).
- O serviço do Controle hoje roda no navegador. Ele passa a receber o cliente Supabase por parâmetro, como o motor, para rodar também no sync-api pelo `vendor/saldoParcial.cjs`, que precisa ser refeito.
- Para a empresa liberada, a geração da imagem usa a rota `/api/email/render-image`, como hoje. Se a imagem falhar, o e-mail sai com a tabela em HTML, como no envio manual do Controle.

---

## 9. Retroativos do modelo novo

Job no sync-api, na etapa seguinte aos `ajustesRetroativos` do orquestrador. Roda só para as empresas liberadas (Fase 3, seção 8.2):

- para cada banco com fechamento vigente nos meses do período de apuração aberto (D-10):
  - recalcula os itens do mês (`itensDeConsumoPorBanco`);
  - compara com `bancos_horas_fechamento_itens`;
  - chama `bancos_horas_registrar_retroativo`, que cria, atualiza ou descarta sozinho o registro aberto;
- a notificação "ajuste retroativo pendente" do sino já existe.

**A detecção do legado passa a ignorar as empresas liberadas**, para não criar pendência na tela atual de Ajustes Retroativos.

---

## 10. O legado para a empresa liberada

| Parte                                    | O que acontece                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Fechamento do legado (`fecharPeriodo`)   | Não é chamado                                                                                          |
| Detecção de retroativos do legado        | Ignora a empresa                                                                                       |
| Espelho dos reajustes do legado (Fase 4) | Já para sozinho: o gatilho só espelha empresa em Legado                                                |
| Modo sombra e Comparação                 | A rotina ignora a empresa. A tela mostra a empresa no grupo "Liberadas", com "Voltar para legado"      |
| Controle de Banco de Horas atual         | Mostra um aviso de que a empresa usa o Controle novo e não grava reajuste nem observação (pergunta P3) |

---

## 11. Tabelas e migrations

| #   | Migration                    | Conteúdo                                                                                                                                                                                    |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 27  | `fase5_liberacao`            | Funções `liberar_empresa` e `voltar_para_legado`, com a cópia dos lançamentos para o legado. Fechamento de transição (motivo `transicao` no CHECK de `bancos_horas_fechamentos`). Auditoria |
| 28  | `fase5_books_consumo_bancos` | Tabela, RLS e índice                                                                                                                                                                        |
| 29  | `fase5_retroativos`          | Leitura para o job, se faltar alguma. A gravação já existe                                                                                                                                  |

Cada migration vem com um teste SQL num único bloco `DO`, validado antes no PGlite.

---

## 12. Sequência de entrega (TDD)

1. **Protótipos:**
   - o Liberar e o Voltar para legado na Comparação, com as confirmações (seção 3) e o Book e o Saldo Parcial de teste (P7);
   - a página de consumo por banco do Book;
   - o botão "Retificar" na Geração de Books e no Histórico de Books (P5).
2. **Migration 27 e a regra do saldo de abertura:** `fecharMes` com motivo `transicao` e os valores do legado.
3. **Geração do Book da empresa liberada:** fechamento novo, retificação e coleta para `books_consumo_bancos` (migration 28).
4. **`BookConsumoBancos`** no PDF e no visualizador.
5. **Imagem do e-mail do Book.**
6. **Saldo Parcial agendado.** O serviço do Controle passa a receber o cliente Supabase. Pacote do sync-api.
7. **Job de retroativos** e a detecção do legado ignorando as liberadas. Pacote do sync-api.
8. **Liberar e Voltar** na tela, e o aviso no Controle atual.

Cada etapa, um commit aprovado. As etapas 3 a 7 não mudam nada para as empresas em Legado, e um teste por etapa garante isso (CA-01). Nenhuma empresa é liberada antes da etapa 8.

---

## 13. Perguntas decididas em 29/10/2026

| #   | Pergunta                                                                                                   | Decisão                                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | De que saldo a empresa liberada parte?                                                                     | **Do saldo do último Book do legado**, pelo fechamento de transição (seção 4)                                                                                                       |
| P2  | Empresa com vários bancos na liberação: onde fica a diferença entre o saldo do legado e a soma dos bancos? | **No Banco padrão**, com observação interna                                                                                                                                         |
| P3  | O Controle atual deve bloquear reajuste e observação para empresa liberada?                                | **Sim:** aviso e sem gravação. É a única mudança numa tela atual antes da Fase 8                                                                                                    |
| P4  | Ao Voltar para legado, o que fazer com os reajustes e observações lançados no Controle novo?               | **Copiar para o legado**, pela função `voltar_para_legado` (seção 3.2)                                                                                                              |
| P5  | Onde fica a retificação do Book da empresa liberada?                                                       | **Botão "Retificar"** na Geração de Books e no Histórico de Books, com motivo. Para a empresa liberada, o "forçar atualização" (inclusive o da geração automática) deixa de reabrir |
| P6  | Quem pode liberar e voltar?                                                                                | **Quem tem Edição** na tela Comparação Legado x Novo                                                                                                                                |
| P7  | Antes de liberar, ver o Book e o Saldo Parcial de teste pelo modelo novo (spec 7.4)?                       | **Sim:** "Ver Book de teste" e "Enviar Saldo Parcial de teste para mim" no detalhe da Comparação, sem fechar mês nem enviar ao cliente                                              |

---

## 14. Riscos

- **PDF que muda com o tempo:** os componentes atuais do Book leem dados ao vivo. A página nova lê só o snapshot. Os componentes atuais ficam como estão, só para Legado.
- **Pacotes do sync-api:** `geracaoBooks.cjs` e `saldoParcial.cjs` são cópias do código do front. Cada etapa que mexer nesses serviços refaz o pacote. Já existe um teste que acusa pacote desatualizado.
- **Arquivos gigantes:** `booksDataCollectorService` e `booksDisparoService` têm mais de 2.000 linhas. A lógica nova fica em arquivos próprios (`src/services/bancosHoras/book*.ts`), e os atuais só ganham o desvio pela empresa liberada.
- **Achado fora do escopo:** `booksDataCollectorService.ts:3869` lê `banco_horas_calculos_segmentados` só pelo `calculo_id`, com `.maybeSingle()`. Com dois ou mais segmentos, isso falha em silêncio e zera o consumo do segmento. Afeta a ANGLO no legado hoje. Fica registrado para corrigir à parte, com o usuário decidindo.
