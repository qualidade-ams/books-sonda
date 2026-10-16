# Inventário de componentes — Design System v2

Versão de 14/10/2026. Passo 2 do [Briefing](../Briefing_Design_System_v2.md).

**Objetivo:** listar o que as 9 telas novas precisam, para construir só o necessário e na ordem certa.

**Fontes:**

- As 11 figuras de tela da Especificação v2.0 (Figuras 2 a 12).
- As telas atuais que serão substituídas: Ajustes Retroativos, Auditoria, Envio de Saldo Parcial, Empresas e Controle. Elas valem para a regra "mesmas funções de hoje".
- O Inventário de Regras, seção 5, para os Contatos.

**Legenda das tabelas:**

- **Base:** o primitivo existente em `src/components/ui/` que o componente embrulha. "Novo" quando não há base.
- **Onda:** **1** = necessário no protótipo (Controle, Empresas e Comparação); **2** = só nas demais telas.
- **Celular:** como o componente se comporta abaixo de `md`, para cumprir a paridade de funções (briefing, item 3).

---

## 1. Achados que mudam a abordagem

1. **Componentes compartilhados existem, mas não são usados.** `page-header`, `filter-bar`, `stats-card`, `empty-state`, `month-year-picker`, `multi-select`, `input-horas` e `confirm-dialog` estão em `src/components/ui/`, e nenhuma das 5 telas atuais os importa. Cada tela remonta cabeçalho, cartões de indicador, filtros, abas, paginação e estado vazio à mão, com classes coladas. **Lição:** ter o componente não basta. O v2 precisa de documentação, da skill e de revisão que barre a remontagem manual.
2. **Hora `HH:MM` validada à mão em pelo menos 3 lugares**, embora o `input-horas` exista. Hora é o dado central do domínio e merece um componente de entrada e um de exibição.
3. **Datas com `<input type="date">` nativo e mês com máscara manual.** Falta um padrão de seletor de data, mês e período.
4. **`Tooltip` é a forma de explicar campos e linhas** (ícone "i"). Tooltip não funciona no toque, então a paridade no celular exige trocar por `Popover` ou por texto de ajuda visível.
5. **Nenhuma tela usa `Drawer` ou `Sheet`**, e todos os modais são `Dialog` de largura fixa (até `max-w-4xl`). No celular, isso vira tela cheia ou drawer.
6. **Duas convenções de toast** nas telas atuais (`sonner` e `useToast`). O v2 usa só `useToast` (briefing, item 7).

---

## 2. Matriz componente × tela

Siglas das telas:

| Sigla | Tela                       |
| ----- | -------------------------- |
| EMP   | Empresas                   |
| PM    | Produtos e Módulos         |
| DP    | De-para de Grupos          |
| RA    | Ramos de Atividade         |
| CTL   | Controle de Banco de Horas |
| AR    | Ajustes Retroativos        |
| AUD   | Auditoria                  |
| SP    | Envio de Saldo Parcial     |
| CMP   | Comparação Legado x Novo   |

| Componente                     | EMP | PM  | DP  | RA  | CTL | AR  | AUD | SP  | CMP | Total |
| ------------------------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | ----- |
| AppShell                       | ●   | ●   | ●   | ●   | ●   | ●   | ●   | ●   | ●   | 9     |
| PageHeader                     | ●   | ●   | ●   | ●   | ●   | ●   | ●   | ●   | ●   | 9     |
| StatusBadge                    | ●   | ●   | ●   | ●   | ●   | ●   | ●   | ●   | ●   | 9     |
| Toast                          | ●   | ●   | ●   | ●   | ●   | ●   | ●   | ●   | ●   | 9     |
| EmptyState / Skeleton          | ●   | ●   | ●   | ●   | ●   | ●   | ●   | ●   | ●   | 9     |
| DataTable                      | ●   | ●   | ●   | ●   | ●   | ●   | ●   | ●   | ●   | 9     |
| ConfirmDialog                  | ●   | ●   | ●   | ●   | ●   | ●   |     | ●   | ●   | 8     |
| FormDialog / FormField         | ●   | ●   | ●   | ●   | ●   | ●   |     | ●   |     | 7     |
| FilterBar + SearchInput        | ●   | ●   | ●   | ●   |     | ●   | ●   |     | ●   | 7     |
| Callout (alerta inline)        | ●   | ●   | ●   |     | ●   | ●   |     | ●   | ●   | 7     |
| Tabs                           | ●   |     | ●   |     | ●   | ●   |     | ●   |     | 5     |
| StatCard (KPI)                 | ●   |     | ●   |     | ●   | ●   | ●   |     | ●   | 6     |
| ExportMenu                     | ●   |     | ●   |     |     | ●   | ●   |     | ●   | 5     |
| Pagination                     | ●   |     | ●   |     |     | ●   | ●   | ●   | ●   | 6     |
| HoursValue / HoursInput        | ●   |     |     |     | ●   | ●   |     |     | ●   | 4     |
| Select / Combobox              | ●   | ●   | ●   |     | ●   | ●   | ●   | ●   | ●   | 8     |
| Switch / SegmentedControl      | ●   | ●   |     | ●   | ●   |     |     | ●   |     | 5     |
| BulkActionBar                  | ●   |     | ●   |     |     | ●   |     |     |     | 3     |
| Chip / ChipInput               | ●   | ●   |     |     |     |     |     | ●   |     | 3     |
| DetailRow / KeyValueList       | ●   |     |     |     | ●   | ●   | ●   |     | ●   | 5     |
| HistoryList                    | ●   |     | ●   |     | ●   |     | ●   | ●   |     | 5     |
| MonthPicker / PeriodPicker     |     |     |     |     | ●   | ●   | ●   |     | ●   | 4     |
| DateRangePicker                |     |     |     |     |     |     | ●   | ●   |     | 2     |
| EmailComposer / EmailListInput | ●   |     |     |     | ●   | ●   |     | ●   |     | 4     |
| FileUpload                     | ●   |     |     |     | ●   | ●   |     |     |     | 3     |
| MatrixTable                    |     |     |     |     | ●   |     |     |     |     | 1     |
| TreeCheckbox                   | ●   |     |     |     |     |     |     |     |     | 1     |
| MasterDetail                   |     | ●   |     |     |     |     |     |     |     | 1     |
| RecurrenceEditor               |     |     |     |     |     |     |     | ●   |     | 1     |
| ImportExcelFlow                | ●   |     |     |     |     |     |     |     |     | 1     |

**Leitura:** os 6 primeiros componentes aparecem nas 9 telas e mais 6 aparecem em 7 ou mais. Construídos bem, cobrem a maior parte de cada tela. Os de 1 tela são componentes de domínio e entram por último.

---

## 3. Fundação

Não são componentes, mas todos dependem deles.

| Item                             | Conteúdo                                                                                                                                | Onda |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Tokens de cor                    | Superfícies, texto, borda, destaque ciano, foco e status (sucesso, alerta, perigo, info, neutro) em claro e escuro (briefing, item 9.1) | 1    |
| Tipografia                       | Escala Kumbh Sans / Roboto (briefing, item 9.2), mais `tabular-nums` e uma fonte monoespaçada para códigos (Grupo Aranda, JSON)         | 1    |
| Espaçamento, raio, sombra, borda | Escala única; densidade "confortável" nas tabelas                                                                                       | 1    |
| Ícones                           | `lucide-react`, traço fino, tamanhos fixos (16/20/24)                                                                                   | 1    |
| Foco e teclado                   | Anel de foco visível em todo elemento interativo                                                                                        | 1    |
| Formatação                       | Funções de `HH:MM` (com sinal), data, mês/ano e número pelo idioma ativo                                                                | 1    |
| i18n                             | Convenção de chaves para os textos dos componentes (pt-BR, en, es)                                                                      | 1    |

---

## 4. Componentes genéricos

### 4.1 Estrutura de página

| Componente         | O que faz                                                                                       | Variantes e estados                                                                           | Celular                                                           | Base                    | Onda |
| ------------------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------- | ---- |
| **AppShell**       | Sidebar com seções (Banco de Horas, Cadastros), header com notificações, tema, idioma e usuário | Sidebar recolhida ou expandida; item ativo                                                    | Sidebar vira drawer, aberta por botão no header                   | `sidebar`, `sheet`      | 1    |
| **PageHeader**     | Título, subtítulo e ações à direita                                                             | Até 1 ação primária e N secundárias; título com contexto ("Editar Empresa · EMPRESA EXEMPLO") | Ação primária fixa no rodapé; as secundárias vão para um menu "⋯" | `page-header` (refazer) | 1    |
| **Section / Card** | Bloco com título de seção em caixa alta e conteúdo                                              | Com ações no título; com borda tracejada (Banco padrão, Fig. 7)                               | Ocupa a largura toda                                              | `card`                  | 1    |
| **MasterDetail**   | Lista à esquerda e detalhe à direita (Produtos → Módulos, Fig. 2)                               | Item selecionado; contagem por item                                                           | Lista e detalhe em telas separadas, com botão voltar              | Novo                    | 2    |
| **ContextBar**     | Barra de contexto da tela: empresa, período e selo de modelo (Fig. 10)                          | Com selo "Legado" ou "Bancos múltiplos"                                                       | Fixa no topo, compacta; abre os seletores em drawer               | Novo                    | 1    |

### 4.2 Navegação e agrupamento

| Componente            | O que faz                                                                                                      | Variantes e estados                        | Celular                                                | Base                      | Onda |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------ | ------------------------- | ---- |
| **Tabs (sublinhado)** | Seções de um formulário ou entidade (Informações, Contatos, Bancos de Horas, Books — Fig. 6)                   | Com contador; desabilitada                 | Rolagem horizontal, sem quebra                         | `tabs`                    | 1    |
| **Tabs (segmentado)** | Troca de visão ou filtro (Mapeamentos / Não mapeados; bancos no Controle; Pendentes / Aprovados / Descartados) | Com contador; com selo ("padrão")          | Rolagem horizontal; com mais de 4 itens, vira `Select` | `tabs`                    | 1    |
| **Pagination**        | Paginação e tamanho de página                                                                                  | Cliente ou servidor; "Exibindo 1–7 de 172" | Só anterior/próxima e "pág. X de Y"                    | `pagination` (refazer)    | 1    |
| **DropdownMenu**      | Menu de ações secundárias e de exportação                                                                      | Item destrutivo                            | Abre como drawer de baixo                              | `dropdown-menu`, `drawer` | 1    |

### 4.3 Exibição de dados

| Componente          | O que faz                                                                                                              | Variantes e estados                                                                                                                                                                                                                                    | Celular                                                                                                          | Base                   | Onda |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------- | ---- |
| **DataTable**       | Tabela padrão de listas                                                                                                | Ordenação; coluna numérica alinhada à direita; coluna monoespaçada; linha selecionada; linha destacada; linha expansível (AR); ações por linha; edição inline de célula (Select de banco nos Requerimentos, Fig. 9); cabeçalho fixo; carregando; vazio | **Vira lista de cartões**: título, 2–4 campos-chave, selo e ações. Linha expansível vira cartão que abre detalhe | `table`                | 1    |
| **Seleção em lote** | Checkbox por linha e "selecionar tudo" com estado parcial                                                              | Combina com a BulkActionBar                                                                                                                                                                                                                            | Toque longo ou botão "Selecionar" ativa o modo de seleção                                                        | `checkbox`             | 2    |
| **StatCard**        | Indicador numérico (Fig. 3 e 12)                                                                                       | Cor semântica no valor; com ícone; carregando; clicável (filtra a tabela)                                                                                                                                                                              | Grade 2×2, valor menor                                                                                           | `stats-card` (refazer) | 1    |
| **StatusBadge**     | Estado em pílula, sempre com texto                                                                                     | sucesso, alerta, perigo, info, neutro, destaque ("Novo", "padrão")                                                                                                                                                                                     | Igual                                                                                                            | `badge`                | 1    |
| **Chip**            | Valor discreto (organizações Aranda, grupos vinculados, escopo)                                                        | Removível; somente leitura; "+ adicionar" tracejado                                                                                                                                                                                                    | Quebra linha                                                                                                     | `badge`                | 1    |
| **HoursValue**      | Exibe `HH:MM` com sinal                                                                                                | Positivo ou negativo em cor semântica; negrito em totais; "—" para vazio; `+06:30` explícito                                                                                                                                                           | Igual                                                                                                            | Novo                   | 1    |
| **KeyValueList**    | Pares rótulo/valor (parâmetros do banco, Fig. 7; detalhe de auditoria; resumo da aprovação)                            | 1 ou 2 colunas; valor com link "Gerenciar ›"                                                                                                                                                                                                           | Sempre 1 coluna                                                                                                  | Novo                   | 1    |
| **HistoryList**     | Linha do tempo de versões e alterações (histórico do banco, baseline e repasse, execuções do Saldo Parcial, auditoria) | Com tipo (selo), autor, data e motivo; item com ação                                                                                                                                                                                                   | Igual, compacto                                                                                                  | Novo                   | 1    |
| **CodeBlock**       | JSON ou texto técnico (dados da ação na auditoria)                                                                     | Rolagem; copiar                                                                                                                                                                                                                                        | Rolagem horizontal                                                                                               | Novo                   | 2    |

### 4.4 Filtros

| Componente          | O que faz                                                         | Variantes e estados                                                               | Celular                                                 | Base                             | Onda |
| ------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------- | ---- |
| **FilterBar**       | Agrupa busca e filtros, com "Limpar"                              | Filtros ativos visíveis; lembra a última escolha (uso frequente, briefing item 3) | Busca visível; o resto vai para um drawer "Filtros (n)" | `filter-bar` (refazer), `drawer` | 1    |
| **SearchInput**     | Busca com ícone e limpar                                          | Com atraso (debounce)                                                             | Largura total                                           | `input`                          | 1    |
| **MonthPicker**     | Mês/ano (Comparação, AR, observações)                             | Mínimo e máximo; meses fechados indicados                                         | Abre em drawer                                          | `month-year-picker` (refazer)    | 1    |
| **PeriodPicker**    | Período de apuração (Jul–Set/2026, Fig. 10), com anterior/próximo | Navegação desabilitada fora da vigência                                           | Botões anterior/próximo e período no centro             | Novo                             | 1    |
| **DateRangePicker** | Intervalo de datas (Auditoria, histórico do SP)                   | Atalhos (7 dias, mês atual)                                                       | Abre em drawer                                          | `calendar`, `popover`            | 2    |

### 4.5 Formulário

| Componente             | O que faz                                                                        | Variantes e estados                                                                                                        | Celular                                               | Base                                 | Onda |
| ---------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------ | ---- |
| **FormField**          | Rótulo, obrigatório (*), ajuda, erro e selo "Novo"                               | Desabilitado; somente leitura (modo "ver")                                                                                 | Rótulo acima, largura total                           | `form`                               | 1    |
| **Input / Textarea**   | Texto livre                                                                      | Com contador (observação de 700 caracteres); monoespaçado                                                                  | Teclado adequado ao tipo                              | `input`, `textarea`                  | 1    |
| **NumberInput**        | Número com unidade ("2 atualizações por ano")                                    | Mínimo e máximo                                                                                                            | Teclado numérico                                      | `input`                              | 1    |
| **HoursInput**         | Entrada `HH:MM`, com ou sem sinal (reajuste, baseline)                           | Entrada/saída; erro de formato                                                                                             | Teclado numérico; máscara                             | `input-horas` (refazer)              | 1    |
| **Select**             | Lista curta                                                                      | Placeholder "Todos"                                                                                                        | Abre em drawer                                        | `select`                             | 1    |
| **Combobox**           | Lista longa com busca (empresa, módulo "FISCAL › COMPLY e-DOCS")                 | Com grupos; múltipla seleção                                                                                               | Tela cheia com busca                                  | `command`, `popover`, `multi-select` | 1    |
| **Switch**             | Liga/desliga com rótulo e descrição ("Ao zerar, consumir saldo…", Fig. 8)        | Inline na tabela (Ativo no SP)                                                                                             | Área de toque de 44 px                                | `switch`                             | 1    |
| **SegmentedControl**   | Escolha única entre 2 a 4 opções visíveis (SaaS / On Premise; Sim / Não; DBA)    | Desabilitado                                                                                                               | Até 3 opções em linha; com 4 ou rótulo longo, empilha | `toggle-group`                       | 1    |
| **CheckboxCard**       | Múltipla escolha em cartões (Produtos contratados, Fig. 6)                       | Marcado; desabilitado com motivo                                                                                           | Quebra linha                                          | `checkbox`                           | 1    |
| **TreeCheckbox**       | Hierarquia produto › módulos com estado parcial (Escopo, Fig. 8)                 | Item desabilitado com motivo ("já usado em…", "produto não contratado"); "… mais 20 módulos" recolhido; contador "1 de 25" | Igual, com áreas de toque maiores                     | Novo                                 | 1    |
| **ChipInput**          | Lista de valores digitados (Organizações no Aranda)                              | Validação por item; duplicado                                                                                              | Igual                                                 | Novo                                 | 1    |
| **FieldWithHistory**   | Valor vigente + "desde dd/mm/aaaa" + "Gerenciar ›" (Baseline, % repasse, Fig. 8) | Abre a HistoryList em diálogo                                                                                              | Igual                                                 | Novo                                 | 1    |
| **ConditionalSection** | Bloco que só aparece por condição (contrato FISCAL; ambiente On Premise)         | Com explicação de quando aparece                                                                                           | Igual                                                 | `card`                               | 1    |
| **RepeatableList**     | Lista de linhas adicionáveis e removíveis (horários, segmentos)                  | Mínimo e máximo de itens                                                                                                   | Uma linha por item, com remover visível               | Novo                                 | 2    |
| **DatePicker**         | Data única (Início de vigência)                                                  | Mínimo (não antes do contrato, D-12)                                                                                       | Abre em drawer                                        | `calendar`, `popover`                | 1    |

### 4.6 Feedback

| Componente       | O que faz                                                          | Variantes e estados                                                                                                        | Celular               | Base                    | Onda |
| ---------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------- | ---- |
| **Callout**      | Aviso inline com ícone, título e texto ou lista                    | info, alerta, sucesso, perigo; "Observação automática" (Fig. 11); "Impacto da alteração" (Fig. 5); "Sem conflito" (Fig. 8) | Igual                 | `alert` (refazer)       | 1    |
| **PageBanner**   | Aviso da tela inteira (agendador desligado, API offline)           | alerta, perigo; com ação                                                                                                   | Igual                 | `alert`                 | 2    |
| **Toast**        | Confirmação passageira                                             | sucesso, erro, info; com ação "Desfazer" quando couber                                                                     | Rodapé, largura total | `toast` / `useToast`    | 1    |
| **EmptyState**   | Lista vazia ou sem seleção                                         | Sem dados; sem resultado de filtro (com "Limpar filtros"); "Selecione uma empresa"; com ação ("Calcular agora")            | Igual                 | `empty-state` (refazer) | 1    |
| **Skeleton**     | Carregamento com o formato do conteúdo                             | Tabela, cartão, KPI, matriz                                                                                                | Igual                 | `skeleton`              | 1    |
| **InlineStatus** | Estado de processo ("Calculando…", "Executando", "Gerando imagem") | Com spinner                                                                                                                | Igual                 | Novo                    | 1    |

### 4.7 Sobreposições

| Componente           | O que faz                                                                                                     | Variantes e estados                                                                                          | Celular                     | Base                                       | Onda |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------- | ------------------------------------------ | ---- |
| **FormDialog**       | Formulário em modal: título, subtítulo, corpo rolável, rodapé fixo e "Última alteração: … por …" (Fig. 5 e 8) | P, M, G; com seções; salvando                                                                                | **Tela cheia**, rodapé fixo | `dialog`, `drawer`                         | 1    |
| **ConfirmDialog**    | Confirmação que diz a consequência                                                                            | Simples; destrutiva; com justificativa obrigatória (AR); com lista de consequências (recálculo); processando | Drawer de baixo             | `alert-dialog`, `confirm-dialog` (refazer) | 1    |
| **DetailDialog**     | Detalhe somente leitura (auditoria, divergência da Comparação)                                                | Com KeyValueList e CodeBlock                                                                                 | Tela cheia                  | `dialog`                                   | 1    |
| **Popover de ajuda** | Explicação de campo ou linha, no lugar do Tooltip                                                             | Ícone "i" clicável                                                                                           | Toque abre e fecha          | `popover`                                  | 1    |

---

## 5. Componentes de domínio

Composições dos genéricos, específicas do Banco de Horas.

| Componente                      | Telas                 | O que faz                                                                                                                                                                                                                                                                          | Celular                                                                                            | Onda |
| ------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---- |
| **MatrixTable** (quadro mensal) | CTL                   | Indicadores nas linhas e meses nas colunas (Fig. 10 e 11). Linhas de total em destaque; Saldo em cor semântica; linhas "Consumido de outros bancos" (info) e "Cedido a outros bancos" (alerta) com selo "novo"; mês de fechamento marcado; ação inline (reajuste); ajuda por linha | Primeira coluna fixa e rolagem horizontal, **ou** um mês por vez com setas. A decidir no protótipo | 1    |
| **BancoCard**                   | EMP                   | Cartão do banco (Fig. 7): nome, selo de status ou padrão, descrição, parâmetros (KeyValueList), escopo (Chips) e ações (Editar, Histórico, Inativar). **Ordenável**, porque a ordem define a prioridade (RN-06)                                                                    | Pilha vertical; reordenar por botões ↑ ↓ em vez de arrastar                                        | 1    |
| **ModeloCalculoBadge**          | EMP, CTL, CMP         | Selo "Legado (em validação)" / "Bancos múltiplos" / "Liberada em dd/mm"                                                                                                                                                                                                            | Igual                                                                                              | 1    |
| **ComparisonRow**               | CMP                   | Linha da comparação com diferença em `HH:MM`, situação e ação contextual (Liberar empresa / Ver detalhes / Voltar para legado)                                                                                                                                                     | Cartão com a diferença em destaque e a ação no rodapé                                              | 1    |
| **ClassificationCell**          | CTL                   | Banco escolhido (Select inline) + origem ("Automática: módulo → …" / "Ajustada por … em …", Fig. 9)                                                                                                                                                                                | Cartão com o Select em largura total                                                               | 1    |
| **BulkActionBar**               | DP, AR, EMP           | "N selecionados · Atribuir módulo [ ] Aplicar Cancelar" (Fig. 3); "Enviar e-mail (n)"; inativar em lote                                                                                                                                                                            | Barra fixa no rodapé                                                                               | 2    |
| **ImpactNotice**                | DP, EMP               | Callout de alerta com o efeito de uma alteração ("pode mover horas entre bancos de 8 empresas")                                                                                                                                                                                    | Igual                                                                                              | 2    |
| **ExportMenu**                  | EMP, DP, AR, AUD, CMP | Menu Excel / PDF com estado "gerando"                                                                                                                                                                                                                                              | Item no menu "⋯"                                                                                   | 1    |
| **ImportExcelFlow**             | EMP                   | Baixar modelo → enviar arquivo → prévia (linhas, duplicados com "atualizar existentes", erros por linha) → resultado                                                                                                                                                               | Mesmo fluxo em tela cheia; arquivo pelo seletor do sistema                                         | 2    |
| **EmailListInput**              | SP, AR, CTL           | Lista de e-mails que aceita colar do Outlook, valida cada um e conta ("✓ 3 e-mails")                                                                                                                                                                                               | Igual                                                                                              | 2    |
| **EmailComposer**               | CTL, AR               | Destinatários, CC, CCO, assunto, texto de abertura, anexos e prévia do e-mail                                                                                                                                                                                                      | Tela cheia; prévia em aba própria                                                                  | 2    |
| **FileUpload**                  | EMP, CTL, AR          | Anexar arquivos com limite (25 MB), lista com tamanho, baixar e remover, contador "n/máx"                                                                                                                                                                                          | Seletor do sistema                                                                                 | 2    |
| **RecurrenceEditor**            | SP                    | Frequência (diária / semanal / mensal), dias da semana, grade de dias do mês + "último dia", horários fixos ou intervalo, e prévia das próximas execuções                                                                                                                          | Grade de dias 7×5 mantida; horários em lista                                                       | 2    |
| **ChecklistPicker**             | SP                    | Lista pesquisável com checkbox, contador e aviso por item ("sem contatos")                                                                                                                                                                                                         | Tela cheia com busca                                                                               | 2    |
| **ContatosTable**               | EMP                   | Contatos da empresa: principal (um só por empresa), finalidade (Book / Saldo Parcial / Ambos), status com justificativa (Inventário, seção 5)                                                                                                                                      | Cartões                                                                                            | 1    |
| **ObservacoesList**             | CTL                   | Observações por mês: tipo (manual / ajuste / automática), autor, edição inline com contador; editar e excluir só pelo autor ou administrador (D-06)                                                                                                                                | Cartões; edição em tela cheia                                                                      | 1    |

---

## 6. Ordem de construção proposta

1. **Fundação** (seção 3) e **AppShell** responsivo e repintado: entrega própria, com regressão das telas atuais.
2. **Onda 1 genérica:** PageHeader, Section, Tabs, DataTable (com a forma de cartões), StatCard, StatusBadge, Chip, HoursValue, KeyValueList, HistoryList, FilterBar, SearchInput, MonthPicker, PeriodPicker, campos de formulário, FormDialog, ConfirmDialog, DetailDialog, Callout, Toast, EmptyState, Skeleton.
3. **Onda 1 de domínio:** MatrixTable, BancoCard, ModeloCalculoBadge, ComparisonRow, ClassificationCell, ContatosTable, ObservacoesList, ExportMenu.
4. **Protótipo:** Controle, Empresas e Comparação, nos 3 tamanhos, 2 temas e 3 idiomas.
5. **Onda 2:** o restante, na Fase 3, à medida que cada tela for construída.

**Contagem:** 48 componentes genéricos e 16 de domínio, 64 no total. A Onda 1 tem 50 (42 genéricos e 8 de domínio). Cerca de metade dos genéricos é um invólucro fino sobre um primitivo shadcn que já existe, só com tokens e variantes. O esforço real se concentra em DataTable (com a forma de cartões), MatrixTable, TreeCheckbox, FormDialog responsivo e FilterBar.

---

## 7. Pontos a decidir no protótipo

1. **MatrixTable no celular:** primeira coluna fixa com rolagem lateral, ou um mês por vez com setas. O protótipo testa os dois.
2. **Arrastar para reordenar bancos no desktop:** arrastar + botões ↑ ↓, ou só botões. Arrastar exige uma biblioteca nova; os botões não.
3. **Exportação PDF:** as telas atuais exportam PDF (`jspdf`) em AR e Empresas. Precisa saber se o PDF continua nas telas novas ou se fica só o Excel.
