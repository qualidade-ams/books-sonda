# Modelagem da Fase 3: telas novas e ajustes de schema

Versão 0.2, 22/10/2026. As perguntas da seção 15 foram respondidas em 22/10/2026. Nenhuma migration foi escrita ainda. A 0.2 inclui o Organizar Menu (12.1) e as respostas.

Base: protótipos aprovados entre 15 e 21/10/2026 (`src/pages/prototipos/`, branch `feat/design-system-v2`), `Modelagem_Fase1.md`, `Modelagem_Fase2.md`, `Decisoes_Negocio_Bancos_de_Horas.md`, `Decisao_Separacao_Setores.md` (seção 6) e o schema real (baseline de 14/10/2026 e migrations 1 a 9).

---

## 1. O que a Fase 3 entrega

| Entra                                                                                                                                                                                                               | Fica para depois                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| As 10 telas com protótipo aprovado: Empresas, Produtos e Módulos, De-para de Grupos, Ramos de Atividade, Regras de contagem, Controle, Apontamentos Retroativos, Auditoria, Envio de Saldo Parcial e Organizar Menu | Comparação Legado x Novo e modo sombra (Fase 4)                                          |
| Catálogo em três níveis: Solução › Produto › Módulo (seção 2)                                                                                                                                                       | Book e e-mail de Saldo Parcial por banco (Fase 5)                                        |
| Campos novos da empresa, do contrato e do banco (seções 3 e 4)                                                                                                                                                      | Importar em Empresas e edição da identidade na tela nova (Fase 6, virada)                |
| Regras de contagem em tabela (seção 5)                                                                                                                                                                              | Solução FINANCEIRAS contratável (só depois da virada: a tela atual não tem essa solução) |
| Ajustes retroativos do modelo novo (seção 8)                                                                                                                                                                        |                                                                                          |
| Sincronização do de-para novo → atual e das soluções (seção 10)                                                                                                                                                     |                                                                                          |

**O que muda para o usuário:** bancos, organizações do Aranda, contrato FISCAL, perfil da empresa, AMS e projeto por solução, de-para, catálogo, ramos e regras de contagem passam a ser feitos nas telas novas. A identidade da empresa continua na tela atual até a virada.

**Sem dados ainda em duas telas:** ninguém grava fechamentos do modelo novo antes da Fase 4. Até lá, o Controle mostra os meses calculados na hora, sem meses fechados, e a tela Apontamentos Retroativos fica vazia.

Os padrões de schema são os da Fase 1 (seção 2 de `Modelagem_Fase1.md`): RLS por `has_screen_permission`, autoria e auditoria por gatilho, `ON DELETE RESTRICT`, exclusão lógica e listas fixas em `text` com CHECK.

---

## 2. Catálogo em três níveis

Hoje: `produtos` (COMEX, FISCAL, GALLERY) → `produto_modulos` (55 módulos). Passa a ser: `solucoes` → `produtos` → `produto_modulos`.

### 2.1 `solucoes` (nova)

| Coluna                             | Tipo              | Regras                            |
| ---------------------------------- | ----------------- | --------------------------------- |
| id                                 | uuid PK           |                                   |
| codigo                             | text NOT NULL UQ  | `COMEX`, `FISCAIS`, `FINANCEIRAS` |
| nome                               | text NOT NULL     | Editável na tela; o código não    |
| ordem                              | smallint NOT NULL | Ordem dos cartões na tela         |
| ativo, inativado_em, inativado_por |                   |                                   |

### 2.2 `produtos` (muda)

- Ganha `solucao_id uuid NOT NULL` (FK `solucoes`) e a UQ técnica (`id`, `solucao_id`), alvo das FKs compostas da seção 2.4.
- `codigo` continua UQ e não muda depois de criado (regra do protótipo, por gatilho).
- A `ordem` passa a valer dentro da solução (arrastar na tela).
- Ganha `a_classificar boolean NOT NULL DEFAULT false`. É verdadeiro só nos dois produtos provisórios "A classificar" da carga (2.6, decisão P8). Esses produtos não aparecem para escolher no escopo de bancos novos.

### 2.3 `produto_modulos` (sem mudança de estrutura)

- Os 39 módulos que continuam módulos mantêm o id; só o `produto_id` muda na reorganização (2.6). Os 16 que viram produto ou grupo de serviço deixam de ser módulos.
- Depois da reorganização, um gatilho impede trocar o produto do módulo (regra do protótipo). **Exceção (P8):** o módulo de um produto "A classificar" pode ir para um produto **da mesma solução** que não seja provisório. Como ele sai do provisório, a troca acontece uma vez só. A mesma solução garante que o vínculo dos grupos (produto e solução) continua válido.
- As FKs compostas que apontam para `produto_modulos` usam `ON UPDATE CASCADE`. Assim, ao mover o módulo, os grupos do Aranda e os escopos dos bancos o acompanham, sem perder o id.
- Na tela Produtos e Módulos, o módulo "A classificar" ganha a ação "Mover para produto…", e a solução mostra quantos módulos faltam classificar. O protótipo ainda não tem isso; entra na implementação.

### 2.4 `grupos_aranda` (muda)

- Ganha `solucao_id` (FK composta (`produto_id`, `solucao_id`) → `produtos`, para o produto pertencer à solução).
- `classificacao` passa a ter quatro valores, com o CHECK de coerência:

| Valor           | Na tela          | solucao_id | produto_id | modulo_id | Para onde vão as horas                              |
| --------------- | ---------------- | ---------- | ---------- | --------- | --------------------------------------------------- |
| `modulo`        | Com módulo       | sim        | sim        | sim       | Banco do módulo ou do produto inteiro, senão padrão |
| `produto`       | Todos os módulos | sim        | sim        | —         | Banco do produto inteiro, senão padrão              |
| `solucao`       | Grupo de serviço | sim        | —          | —         | Sempre o Banco padrão                               |
| `nao_se_aplica` | Não se aplica    | —          | —          | —         | Sempre o Banco padrão                               |

`sem_modulo` vira `produto`. Os grupos de serviço (DBA, Técnico, Atualização Ambientes, SAAS, Orçamentos e ICS Inativos) passam para `solucao`.

### 2.5 `modulos_requerimento_produto` (só dados)

A estrutura não muda. A carga refaz as 7 linhas como no protótipo:

| Módulo do requerimento | Produto       | Módulo |
| ---------------------- | ------------- | ------ |
| Comex                  | CE PLUS       | Todos  |
| Comply                 | COMPLY        | Todos  |
| Comply e-DOCS          | COMPLY e-DOCS | Todos  |
| pw.SATI                | SATI          | Todos  |
| pw.SPED                | COMPLY        | Todos  |
| pw.SATI/pw.SPED        | SATI          | Todos  |
| Gallery                | GALLERY       | Todos  |

O pw.SPED aponta para o COMPLY inteiro porque o módulo SPED ainda não existe na carga. Depois de cadastrar o SPED, a ligação é ajustada na aba "Módulos de requerimento".

### 2.6 Reorganização (migration de dados)

Ela roda numa transação só, com `origem = 'carga'` na auditoria, e aborta se a conferência final não bater.

1. Cria as 3 soluções e os produtos novos:
   - COMEX: CE PLUS, CE PLUS RECOF, CATÁLOGO DE PRODUTOS e FCI.
   - FISCAIS: COMPLY, COMPLY e-DOCS, GALLERY (a linha atual, mesmo id) e SATI.
   - FINANCEIRAS: FC, SAPC e VENDOR.
   - "A classificar" em COMEX e em FISCAIS, com `a_classificar = true`.
2. Redistribui os 55 módulos (decisões de 21 e 22/10/2026):

   | Destino                    | Módulos atuais                                                                                                                                                              |
   | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | Módulo do CE PLUS          | Câmbio, Drawback, Exportação, Importação                                                                                                                                    |
   | Módulo do COMPLY           | Cadastros Básicos, Conciliação, Contabilização, Indiretos, Infraestrutura, Obrigações Estaduais, Retidos, ECD/ECF, EFD Contribuições, EFD ICMS, REINF, Integração Indiretos |
   | "A classificar" de COMEX   | ABAP, LEGEM, TP One                                                                                                                                                         |
   | "A classificar" de FISCAIS | ETL, SVA, Framework, COMPLY Analytics, Ciclo de Vida, Controle de Terceiros                                                                                                 |
   | Vira o próprio produto     | RECOF → CE PLUS RECOF, Catálogo de Produtos, FCI, COMPLY e-DOCS, Fluxo de Caixa → FC, SAPC, VENDOR                                                                          |
   | Vira grupo de serviço      | DBA, Técnico, Atualização Ambientes, SAAS, Orçamentos (COMEX e FISCAL), ICS Inativos (COMEX, FISCAL e GALLERY)                                                              |
   | Fica no GALLERY            | os demais 14 do GALLERY                                                                                                                                                     |
   - O módulo que continua módulo muda de produto e mantém o id. As FKs compostas para `produto_modulos` são recriadas antes, já com `ON UPDATE CASCADE` (2.3), e os grupos o acompanham.
   - No que vira produto, o grupo passa a `produto`, apontando para o produto novo. No que vira grupo de serviço, o grupo passa a `solucao`. Nos dois casos a linha do módulo é apagada, e a auditoria guarda a cópia.
   - Módulo de COMEX ou FISCAL que não estiver na tabela vai para "A classificar" e aparece no aviso final.
   - **Pré-condição:** nenhum banco com escopo no produto inteiro COMEX ou FISCAL ou num módulo que deixa de existir. A tela de escopo ainda não está no ar; se houver, a migration para e lista os bancos.

3. Reclassifica `grupos_aranda` (2.4) e refaz `modulos_requerimento_produto` (2.5).
4. Converte os produtos contratados em soluções (3.2) e apaga `empresas_produtos`.
5. Apaga as linhas COMEX e FISCAL de `produtos`. A FK RESTRICT funciona como conferência: se algo ainda apontar para elas, a migration falha. A auditoria guarda o registro apagado.
6. Confere: 13 produtos, módulos = antes − convertidos, o mesmo número de grupos, soluções contratadas = produtos da tela atual convertidos e 7 módulos do requerimento.

Arquivo: `supabase/migrations/20261022000002_fase3_catalogo.sql`, com o teste `supabase/tests/fase3_01_catalogo.test.sql`. Ensaiada em 22/10/2026 num Postgres descartável (PGlite), com o schema de base, as migrations das Fases 1 e 2 e uma carga fictícia com os nomes reais dos grupos do Book: o teste falha antes da migration e passa depois, e a migration roda duas vezes sem erro.

**Depois da carga, pela tela (P8):**

- os módulos que faltam do COMPLY, FC, SAPC e VENDOR são cadastrados manualmente; a migration não os cria;
- os 9 módulos "A classificar" são movidos para o produto certo, da mesma solução;
- o pw.SPED passa para o módulo SPED do COMPLY, depois que ele for cadastrado;
- o produto "A classificar" que ficar vazio é inativado.

### 2.7 Efeito no motor

O classificador da Fase 2 já manda para o padrão todo grupo sem produto. Por isso, `solucao` e `nao_se_aplica` não pedem código novo. O TypeScript não tinha `sem_modulo` (o classificador só olha produto e módulo), então também não houve troca de nome.

---

## 3. Empresa

### 3.1 `empresas` (colunas novas)

| Coluna            | Tipo | Regras                                                                                                                         |
| ----------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------ |
| grupo_empresarial | text | CHECK `= upper(grupo_empresarial)`. As sugestões da tela vêm de `SELECT DISTINCT`. Editável só depois da virada (é identidade) |
| id_aranda         | text | Opcional, manual. Ainda não é usado no consumo: o vínculo continua pelas organizações (16/10/2026)                             |

`tem_ams` e `em_projeto` continuam na empresa:

- **Na transição**, eles espelham a tela atual (sincronização).
- **Depois da virada**, um gatilho os mantém iguais a "alguma solução tem".

### 3.2 `empresas_solucoes` (nova; substitui `empresas_produtos`)

| Coluna                | Tipo                           | Regras                                                            |
| --------------------- | ------------------------------ | ----------------------------------------------------------------- |
| id                    | uuid PK                        |                                                                   |
| empresa_id            | uuid FK NOT NULL               | UQ (`empresa_id`, `solucao_id`)                                   |
| solucao_id            | uuid FK NOT NULL               |                                                                   |
| tem_ams               | boolean NOT NULL               |                                                                   |
| em_projeto            | boolean NOT NULL DEFAULT false |                                                                   |
| justificativa_projeto | text                           | CHECK até 200 caracteres. Obrigatória quando `em_projeto` (CHECK) |

- É uma tabela de ligação: aceita DELETE com `edit` da tela Empresas.
- `empresas_produtos` só é lida pela sincronização e pela carga da Fase 1. Ela é convertida e apagada na mesma migration.
- **Pendência "em projeto sem solução definida"** (decisão de 21/10/2026): é calculada, e não gravada. A empresa fica pendente quando `empresas.em_projeto` é verdadeiro e nenhuma solução está em projeto.

### 3.3 `empresas_informacoes_contrato` (colunas novas)

| Coluna                           | Tipo    | Regras                                                            |
| -------------------------------- | ------- | ----------------------------------------------------------------- |
| ramo_secundario_id               | uuid FK | CHECK diferente de `ramo_atividade_id`                            |
| descricao_atividade              | text    | CHECK até 500 caracteres                                          |
| fiscal_dba_minutos_atendimento   | integer | CHECK ≥ 0. Horas de atendimento contratadas por mês (pergunta P2) |
| fiscal_dba_minutos_monitoramento | integer | CHECK ≥ 0. Horas de monitoramento contratadas por mês             |

Os campos aceitam nulo, como os da Fase 1. As horas que não se aplicam à opção de DBA ficam guardadas (RN-33).

**Carga do contrato FISCAL:** nas empresas com FISCAIS, os campos nulos recebem os valores padrão do protótipo. O padrão conta como preenchido, e a empresa não fica pendente por causa dele. Os valores são:

- On Premise;
- e-DOCS 24x7: Não;
- Atualização contratada: Não;
- SQL Server;
- DBA: Não contratado.

### 3.4 Satélites da identidade: continuam nas tabelas atuais

Contatos, grupos de responsáveis e anexos **já existem** e não têm defeito registrado no Inventário:

- `clientes`: os contatos, com a finalidade do envio;
- `grupos_responsaveis`, `grupo_emails` e `empresa_grupos`;
- `empresa_anexos`, com o bucket do Storage.

Como a empresa nova tem o mesmo id, a proposta é **não criar tabela paralela** (pergunta P3):

- **Na transição**, a tela nova lê essas tabelas e mostra os dados só para leitura. A edição continua na tela atual, como o resto da identidade.
- **Na virada (Fase 6)**, a tela nova passa a editá-las. As políticas são refeitas para a chave `empresas`. Hoje `empresa_anexos` usa `empresas_clientes`, e `empresa_grupos` libera para qualquer autenticado, o que precisa ser corrigido.
- **Na religação (Fase 7)**, as FKs passam de `empresas_clientes` para `empresas`.

### 3.5 Nome do CS e do Comercial

A lista mostra o nome a partir do e-mail. Para não abrir `profiles` a quem vê Empresas, entra a função `perfis_resumo(p_ids uuid[], p_emails text[])`:

- devolve só o id, o e-mail e o `full_name`;
- é `SECURITY DEFINER` e exige `view` em `empresas` ou em `bancos_horas_auditoria`.

A Auditoria (seção 9) usa a mesma função para mostrar o nome de quem alterou. Na migration 18 (decisão de 22/10/2026) ela passa a responder também a quem vê as outras telas da Fase 3 (Controle, Apontamentos Retroativos, Produtos e Módulos, De-para, Ramos, Regras de contagem e Organizar Menu), para o "Última alteração por <nome>".

---

## 4. Bancos de horas

**`bancos_horas.fim_vigencia`** (date, opcional): CHECK no dia 1 e não anterior a `inicio_vigencia`. É o último mês em que o banco vale.

Efeito no motor (TypeScript, com teste antes):

- **Classificador:** o banco é candidato quando `inicio_vigencia <= mês <= fim_vigencia`. Depois do fim, as horas vão para o padrão.
- **Cálculo:** não há resultado depois do fim. O último mês aplica a regra de fim de período (pergunta P1).

**Cadastro na tela Empresas (migration 19, decisão de 23/10/2026):** três funções, com Edição em Parâmetros dos bancos:

- `bancos_horas_criar(banco, escopo, baseline, repasse)`: cria o banco com o escopo e as primeiras vigências numa transação só. Uma falha no meio (conflito de escopo, por exemplo) não deixa banco pela metade, e a tela não apaga bancos. A ordem é a última da empresa e a origem é `manual`.
- `bancos_horas_inativar(banco, motivo)`: o motivo é obrigatório e vai para a auditoria; grava quando e quem inativou. O gatilho da Fase 1 continua impedindo inativar o padrão com outros bancos ativos.
- `bancos_horas_nova_vigencia(banco, 'baseline' | 'repasse', desde, valores, motivo)`: numa transação só, fecha a vigência aberta no mês anterior e abre a nova, com motivo. A nova começa no dia 1, depois da aberta, não antes do banco e depois do último mês fechado (D-11).

Editar, reativar, reordenar e mudar o escopo de um banco existente seguem direto nas tabelas, pelas políticas da Fase 1.

---

## 5. Regras de contagem

### 5.1 `regras_contagem` (nova, uma linha só)

Guarda os filtros que hoje estão fixos em `bancos_horas_consumo_itens`. A carga grava os valores atuais.

| Coluna                    | Tipo             | Valor da carga                                                  |
| ------------------------- | ---------------- | --------------------------------------------------------------- |
| id                        | smallint PK      | CHECK `id = 1`                                                  |
| grupos_que_contam         | text[] NOT NULL  | `AMS APL`, `AMS - APL`, `AMS - ATENDIMENTO`, `AMS T&M` (contém) |
| tipos_chamado             | text[] NOT NULL  | `IM`, `RF`, `PM`                                                |
| ignorar_atividade_interna | boolean NOT NULL | true                                                            |
| itens_excluidos           | text[] NOT NULL  | `000000 - PROJETOS APL`                                         |
| so_tickets_fechados       | boolean NOT NULL | true (só status `Closed`, pela data de fechamento)              |

A chave "Só tickets fechados" segue o protótipo; a versão 0.1 previa uma lista de status. `bancos_horas_consumo_itens` passa a ler essa linha. Os testes `fase2_02` e os do motor continuam valendo como verificação de que nada mudou: em produção, rode o `fase2_02` depois da migration 13.

### 5.2 `codigos_resolucao_banco` e códigos sem regra

- A tabela ganha políticas de escrita com `edit` em `regras_contagem`. Hoje ela é escrita só por migration (Q6, revista em 16/10/2026). A leitura, que estava aberta (`USING (true)`), passa a exigir usuário logado.
- As abas "Códigos de resolução" e "Códigos sem regra" usam a função `codigos_resolucao_uso(p_meses)`, com padrão de 6 meses, como no protótipo. Ela devolve apontamentos e tickets por código, contando só o que passa nos demais filtros, se o código tem regra e a primeira ocorrência no período.
- A tela `regras_contagem` é registrada já nesta migration (13), porque as políticas dependem da chave.

### 5.3 Motivo da alteração

Salvar pede um motivo. Para isso, `auditoria_alteracoes` ganha a coluna `motivo` (text), e o gatilho genérico passa a preenchê-la com `current_setting('app.motivo', true)`. A tela salva por `salvar_regras_contagem(p_motivo, p_regras, p_codigos)`, que exige `edit`, recebe o motivo (até 500 caracteres), aplica as mudanças e grava tudo numa transação. Em `p_regras` vão só os campos que mudaram. `p_codigos` é a lista completa: o código que não estiver nela sai.

A coluna serve também para as decisões dos Apontamentos Retroativos.

---

## 6. De-para, Produtos e Módulos, Ramos

| Tela               | Mudança no schema                                                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| De-para de Grupos  | 2.4. "Excluir" um mapeamento grava `ativo = false`: o grupo volta para os não mapeados. `grupo_aranda` não muda depois de criado (gatilho)                                                    |
| De-para de Grupos  | Aba "Não mapeados": função `grupos_aranda_nao_mapeados()`, com os grupos dos últimos 12 meses sem linha ativa, as empresas e a primeira ocorrência                                            |
| De-para de Grupos  | Coluna "Uso": função `grupos_aranda_uso()` (migration 18), com apontamentos e tickets de cada grupo mapeado nos últimos 6 meses e as empresas com mais de um banco ativo que têm esse consumo |
| De-para de Grupos  | Notificação "Grupo Aranda não mapeado" no sino, para quem edita a tela (decisão complementar de 14/10/2026). Ela é gerada por pg_cron diário e resolvida quando o grupo é mapeado             |
| Produtos e Módulos | 2.1 a 2.3. A aba "Módulos de requerimento" edita `modulos_requerimento_produto`                                                                                                               |
| Ramos de Atividade | Política de DELETE com `edit`. A FK RESTRICT de `empresas_informacoes_contrato` impede apagar ramo em uso, principal ou secundário                                                            |

---

## 7. Controle de Banco de Horas

Não há tabela nova. A tela usa o motor da Fase 2 no navegador, pelo `repositorioSupabase.ts`. O que muda:

- **Anotações internas do reajuste:** `bancos_horas_reajustes` ganha `anotacao_interna` (text, opcional, até 700 caracteres). Ela aparece no Controle e na auditoria. Nunca vai para o Book, o Saldo Parcial ou e-mails: as leituras desses canais não selecionam a coluna, e um teste garante isso.
- **Status do chamado nos Apontamentos Retroativos:** vem de `apontamentos_aranda.caso_estado`, como no Aranda (Closed, Resolved, In Progress…).

- **Reajuste pendente de retificação:** é calculado, e não gravado.
  - O reajuste ativo num mês fechado que não está nos itens do fechamento vigente fica "aguardando retificação".
  - O reajuste inativado que ainda está nos itens também fica.
- **Aviso de retificação (migration 20, decisão de 23/10/2026):** observação manual e reajuste manual lançados, editados ou inativados num mês com fechamento vigente marcam `books.precisa_retificacao` da empresa e do mês. O aviso "Book precisa de retificação" no sino e a resolução no reenvio já existiam. A observação manual pode ser criada e editada em mês fechado; ela entra no Book na retificação.
- **Meses futuros do período:** o quadro os projeta pelo motor, com o consumo que já houver, e marca a coluna como "a começar" (decisão de 23/10/2026).
- **Empresa em Legado:** a tela abre em modo sombra, só para leitura e sem envio.
- **Aba Histórico:** lê `auditoria_alteracoes` pelo `banco_id`. A política de SELECT da auditoria passa a liberar também, para quem vê o Controle, as linhas dos bancos. É uma política só, refeita com `DROP POLICY IF EXISTS`. Junto com a auditoria, a aba mostra as versões de cada mês fechado (geração do Book e retificações) e as transferências de consumo entre bancos (decisão de 23/10/2026). O mês aberto não tem versões: é calculado na hora.
- **Envio manual do Saldo Parcial:** passa a gravar em `banco_horas_envio_execucoes`, com `origem = 'manual'` e sem agendamento, para aparecer no histórico (seção 11).

---

## 8. Apontamentos Retroativos (modelo novo)

A tabela atual `banco_horas_ajustes_retroativos` é do modelo legado: liga-se a `banco_horas_fechamentos` e é por empresa. Ela continua servindo às empresas em Legado até a Fase 8. O modelo novo é por banco.

### 8.1 Tabelas

**`bancos_horas_retroativos`**

| Coluna                                        | Tipo                    | Regras                                                       |
| --------------------------------------------- | ----------------------- | ------------------------------------------------------------ |
| id                                            | uuid PK                 |                                                              |
| banco_id                                      | uuid FK NOT NULL        |                                                              |
| fechamento_id                                 | uuid FK NOT NULL        | Versão vigente do mês quando a diferença foi detectada       |
| mes, ano                                      | smallint                |                                                              |
| consumo_antes_minutos, consumo_depois_minutos | integer                 | Do fechamento e do recálculo                                 |
| consumo_antes_tickets, consumo_depois_tickets | integer                 |                                                              |
| situacao                                      | text NOT NULL           | CHECK `pendente` \| `aprovado` \| `aplicado` \| `descartado` |
| detectado_em, atualizado_em                   | timestamptz             | `atualizado_em`: última detecção que mudou a diferença       |
| decidido_por, decidido_em, justificativa      | uuid, timestamptz, text | Justificativa obrigatória ao aprovar ou descartar (CHECK)    |
| fechamento_aplicado_id                        | uuid FK                 | Versão da retificação que aplicou                            |

Só pode haver um registro aberto (pendente ou aprovado) por banco e mês: é um índice único parcial.

**`bancos_horas_retroativos_itens`**: `retroativo_id`, `tipo` (`apontamento` | `ticket`), `item_id`, `minutos` e `tickets`. Os valores podem ser negativos, quando o item foi alterado ou removido no Aranda depois do fechamento. Há também `aviso_enviado_em` e `aviso_enviado_por`, do "Avisar consultores". O chamado, a tarefa e o consultor vêm de `apontamentos_aranda` pelo `item_id`.

### 8.2 Detecção

A detecção precisa classificar por banco. Pela decisão A1, quem classifica é o TypeScript. Por isso, ela é um job do sync-api que roda depois da sincronização de apontamentos e tickets e usa o motor pelo `vendor/`.

Para cada banco com fechamento vigente no período de apuração aberto (D-10), o job:

- recalcula o consumo;
- compara com os itens do fechamento;
- cria o registro ou atualiza o que está aberto.

A gravação usa a service role, e o job gera a notificação "ajuste retroativo pendente" que já existe no sino.

### 8.3 Aplicação

Na retificação, `bancos_horas_registrar_fechamento` passa a marcar como `aplicado` os retroativos aprovados do banco e do mês, com o id da nova versão. A regra do que entra no recálculo está na pergunta P4.

---

## 9. Auditoria

Não há tabela nova. A tela lê `auditoria_alteracoes` (seção 3.5 da Fase 1), com:

- a coluna `motivo` (5.3);
- o nome do usuário por `perfis_resumo` (3.5);
- os filtros de período, empresa, banco, área, ação, origem e quem.

A "área" é um agrupamento das tabelas feito na tela.

---

## 10. Sincronização

As regras da Fase 1 continuam: o legado nunca é bloqueado, não há laço (`app.sincronizando`) e o upsert é pelo mesmo id.

| Origem                         | Evento          | Efeito                                                                                                                                 |
| ------------------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `empresa_produtos` (atual)     | INSERT          | Cria a solução em `empresas_solucoes`: COMEX → COMEX; FISCAL ou GALLERY → FISCAIS. A solução nova entra com o `tem_ams` da empresa     |
| `empresa_produtos` (atual)     | DELETE          | Tira a solução só se nenhum outro código da tela atual levar a ela. Exemplo: apagar GALLERY com FISCAL ainda contratado mantém FISCAIS |
| `empresas_clientes.tem_ams`    | UPDATE          | Sim: todas as soluções com AMS. Não: todas sem (decisão de 21/10/2026). O ajuste por solução continua livre na tela nova               |
| `empresas_clientes.em_projeto` | UPDATE          | Não: tira todas as soluções do projeto e limpa as justificativas. Sim: nada muda nas soluções, e a pendência aparece (3.2)             |
| `grupos_aranda` (nova)         | INSERT / UPDATE | Grava em `de_para_categoria`, com o mesmo id, o `grupo` e o `grupo_book` (spec 7.3). O status acompanha o `ativo`                      |

A carga converte as 220 linhas de `empresa_produtos`. Na carga, "Tem AMS = Sim" deixa todas as soluções com AMS. "Em projeto = Sim" deixa a empresa pendente.

**De-para atual (P5):** hoje não existe tela de De-para. A `de_para_categoria` é mantida direto no banco. A tela nova passa a ser o único caminho: o gatilho copia de `grupos_aranda` para `de_para_categoria`, e não o contrário. Com a tela no ar, a edição direta em `de_para_categoria` precisa parar, senão as duas tabelas divergem.

---

## 11. Envio de Saldo Parcial

As tabelas atuais já atendem o protótipo:

- `banco_horas_envio_agendamentos`, `banco_horas_envio_agendamento_empresas` e `banco_horas_envio_execucoes`;
- a UQ de empresa por agendamento;
- a UQ (`empresa_id`, `executado_para`) contra envio em dobro;
- as origens `manual` e `agendado`.

**Onde fica (decisão de 22/10/2026):** na aba Saldo Parcial da tela Rotinas Automáticas (`/admin/rotinas-automaticas?aba=saldo-parcial`), como está na main desde 20/10. Não vira uma tela separada no menu Books, como estava no protótipo. O conteúdo do protótipo (agendamentos, empresas sem agendamento, histórico e "Executar agora") entra na aba, no visual novo.

A aba usa essas tabelas e a mesma chave `envio_saldo_parcial` (pergunta P6). As mudanças são três:

- **"Executar agora" pula quem já recebeu no dia** (data de Brasília). A situação nova `pulado` entra no CHECK de `status`. Não é coluna nova.
- **A origem aparece no histórico sem coluna nova:**
  - Executar agora = `manual` com agendamento;
  - envio do Controle = `manual` sem agendamento.
- **A aba "Sem agendamento"** é uma consulta das empresas ativas com AMS que não estão em nenhum agendamento.

O conteúdo do e-mail, com uma tabela por banco, é da Fase 5.

---

## 12. Telas, permissões e menu

| screen_key                 | Tela                     | Situação                                         | Menu                |
| -------------------------- | ------------------------ | ------------------------------------------------ | ------------------- |
| `empresas`                 | Empresas                 | Registrada na Fase 1                             | Clientes            |
| `bancos_horas_parametros`  | Aba Bancos da empresa    | Registrada na Fase 1                             | —                   |
| `produtos_modulos`         | Produtos e Módulos       | Registrada; categoria muda para Clientes         | Clientes            |
| `ramos_atividade`          | Ramos de Atividade       | Registrada na Fase 1                             | Clientes            |
| `de_para_grupos`           | De-para de Grupos        | Registrada na Fase 1                             | Banco de Horas      |
| `regras_contagem`          | Regras de contagem       | **Nova**                                         | Banco de Horas (P7) |
| `bancos_horas_controle`    | Controle                 | Registrada na Fase 2                             | Banco de Horas      |
| `bancos_horas_retroativos` | Apontamentos Retroativos | **Nova**. Edição = aprovar, descartar e avisar   | Banco de Horas      |
| `bancos_horas_auditoria`   | Auditoria                | Registrada na Fase 1                             | Banco de Horas      |
| `envio_saldo_parcial`      | Envio de Saldo Parcial   | Existente; aba de Rotinas Automáticas (seção 11) | Administração       |

Na carga, só Administradores recebem Edição nas chaves novas (9.3-3).

### 12.1 Organizar Menu (nova, protótipo aprovado em 22/10/2026)

A tela entra com o design system novo, por decisão de 22/10/2026, porque as cores do menu definem o destaque de todas as telas. Ela tem a chave `organizar_menu` e fica no menu Administração. Protótipo: `/prototipos/organizar-menu`.

Hoje a estrutura do menu está escrita em `Sidebar.tsx`. Ela continua no código como **ordem padrão**. As tabelas guardam só o que foi mudado na tela:

- **Sem linhas:** o menu é o do código.
- **"Ordem padrão" + Salvar:** apaga as linhas.
- **Tela nova, ainda sem linha:** entra no fim do menu em que o código a coloca.

**`menu_itens`** (nova): a ordem salva, uma linha por item.

| Coluna                 | Tipo                                  | Regra                                                                                                                                      |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `chave`                | `text` PK                             | Rota da tela (`/admin/...`) ou chave do menu. Rota, e não `screen_key`, porque duas telas dividem a mesma chave (Validar e Enviar Elogios) |
| `tipo`                 | `text` CHECK (`menu`, `tela`)         |                                                                                                                                            |
| `pai`                  | `text` FK → `menu_itens(chave)`, nula | Só em tela; o pai é sempre `menu`. Nula = solta no primeiro nível, como o Dashboard                                                        |
| `posicao`              | `int`                                 | UQ (`pai`, `posicao`) `DEFERRABLE`, para reordenar numa transação                                                                          |
| `rotulo_i18n`          | `text`                                | Chave do i18n (`nav.dashboard`). O menu criado ao soltar uma tela numa tela solta herda a chave dela                                       |
| `icone`                | `text`                                | Nome do ícone do lucide                                                                                                                    |
| autoria e `updated_at` | padrão da Fase 1                      |                                                                                                                                            |

A permissão continua vindo de `screens` e `screen_permissions`. Menu sem tela visível para o usuário não aparece, e menu sem nenhuma tela não aparece para ninguém.

**`menu_aparencia`** (nova): duas linhas, uma por tema.

| Coluna                                                                   | Tipo                                | Regra                                                       |
| ------------------------------------------------------------------------ | ----------------------------------- | ----------------------------------------------------------- |
| `tema`                                                                   | `text` PK CHECK (`claro`, `escuro`) |                                                             |
| fundo e texto de `menu`, `item`, `subitem`, `hover` e `selecionado` (10) | `text` CHECK `'^#[0-9A-F]{6}$'`     | A carga grava os padrões do protótipo (`CORES_PADRAO_MOCK`) |
| `logo_path`, `logo_recolhido_path`                                       | `text`, nulas                       | Caminho no Storage. Nula = logo da Sonda                    |
| autoria e `updated_at`                                                   | padrão da Fase 1                    |                                                             |

**Storage:** bucket `menu-logos`, até 500 KB, PNG, SVG, WebP ou JPG. Usuários logados leem; quem edita `organizar_menu` grava.

**RLS das duas tabelas:** SELECT para todo usuário logado, porque todo usuário monta o menu. Não há política de escrita: a gravação é feita só por `salvar_menu(p_itens, p_aparencia)`, que exige Edição em `organizar_menu` e grava só o que mudou. As posições são únicas por menu (conferidas no fim da gravação, para permitir trocar duas de lugar), inclusive no primeiro nível.

A auditoria segue o gatilho padrão.

**No frontend:**

- **Leitura:** um só hook lê a ordem e a aparência ao entrar no sistema, com cache longo registrado em `clearAllAppCache`.
- **Destaque do sistema:** sai da cor do selecionado de cada tema. As variáveis `--ds-accent`, `--ds-fg-accent`, `--ds-fg-on-accent`, `--ds-focus` e os tons da faixa são calculados com ajuste de contraste AA, como em `compartilhado/aparencia.ts`, e aplicados no `<html>`.
- **Antes da leitura chegar:** vale a última aparência guardada no navegador, para o menu não piscar na cor padrão.
- **Salvar:** grava ordem e aparência numa RPC transacional. Quem está com o sistema aberto vê a mudança ao recarregar; não há Realtime.

---

## 13. Sequência de entrega (TDD)

**Branch:** `feat/bancos-horas-fase-3`, saída da `origin/main` (que já tem as Fases 1 e 2), com o merge da `feat/design-system-v2`.

Cada migration tem antes um teste SQL em bloco `DO` autorreversível, que falha e depois passa.

| #   | Entrega                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10  | `fase3_catalogo.sql`: soluções, produtos, grupos, `empresas_solucoes`, reorganização (2.6) e sincronização das soluções (10)                                                                |
| 11  | `fase3_empresas.sql`: colunas de 3.1 e 3.3, carga do FISCAL e `perfis_resumo`                                                                                                               |
| 12  | `fase3_bancos.sql`: `fim_vigencia`                                                                                                                                                          |
| 13  | `fase3_regras_contagem.sql`: seção 5, com o consumo lendo a tabela                                                                                                                          |
| 14  | `fase3_de_para.sql`: sincronização nova → atual, não mapeados e notificação                                                                                                                 |
| 15  | `fase3_retroativos.sql`: seção 8 e a mudança no registro do fechamento                                                                                                                      |
| 16  | `fase3_telas.sql`: anotação interna do reajuste, auditoria lida pelo Controle, DELETE dos ramos, categoria de Produtos e Módulos e status `pulado` (as chaves novas entraram na 13 e na 15) |
| 17  | `fase3_menu.sql`: `menu_itens`, `menu_aparencia` com os padrões, bucket `menu-logos` e a chave `organizar_menu` (12.1)                                                                      |
| 18  | `fase3_uso_autoria.sql`: `grupos_aranda_uso()` (coluna Uso do De-para) e `perfis_resumo` liberada para as telas da Fase 3 (decisões de 22/10/2026)                                          |
| 19  | `fase3_bancos_cadastro.sql`: `bancos_horas_criar()`, `bancos_horas_inativar()` e `bancos_horas_nova_vigencia()` (seção 4)                                                                   |
| 20  | `fase3_retificacao.sql`: observação e reajuste manuais em mês fechado marcam o Book para retificação (seção 7)                                                                              |
| 21  | Ativação, aplicada junto com a publicação das telas: agenda a rotina diária do aviso de grupos não mapeados (pg_cron)                                                                       |

**Situação em 22/10/2026:** as migrations 10 a 17 foram aplicadas em produção, antes da publicação das telas. Nada nelas é usado pelas telas atuais. Daqui em diante, o que for visível ao usuário (avisos no sino, por exemplo) fica na migration de ativação.

No TypeScript (Vitest antes):

- motor: `fim_vigencia` (o TypeScript não tinha `sem_modulo`: o classificador só olha produto e módulo, então não houve troca de nome);
- services e hooks de cada tela;
- as telas: o JSX dos protótipos vai para `src/pages/admin/`, e o protótipo e o mock são apagados;
- sync-api: o job de detecção dos retroativos e o pulo do "Executar agora".

**Ordem das telas:** catálogo (Produtos e Módulos, De-para, Ramos, Regras) → Empresas → Controle → Apontamentos Retroativos → Auditoria → Envio de Saldo Parcial. Cada uma entra no menu quando estiver pronta.

---

## 14. Riscos

| Risco                                                                 | Mitigação                                                                                                  |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| A reorganização do catálogo quebra o vínculo de algum grupo ou escopo | Transação única, FKs recriadas e validadas, conferência no fim (contagens por produto e por classificação) |
| As regras de contagem em tabela mudam o resultado do motor            | Carga com os valores atuais e reexecução do `fase2_02` (equivalência com o motor atual nas 140 empresas)   |
| Alguém altera uma regra de contagem por engano                        | Só Administradores editam; motivo obrigatório na auditoria                                                 |
| Alguém continuar editando `de_para_categoria` direto no banco         | Com a tela no ar, o de-para só muda por ela (P5). Avisar quem hoje edita a tabela direto no banco          |
| Módulo esquecido em "A classificar"                                   | A solução mostra quantos faltam; esses produtos não entram no escopo de bancos novos                       |
| O job de retroativos gera ruído antes da Fase 4                       | Sem fechamentos novos, o job não encontra nada até a Fase 4                                                |

---

## 15. Perguntas decididas em 22/10/2026

| #   | Pergunta                                                                                                             | Decisão                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | No último mês de vigência do banco, aplica a regra de fim de período (saldo positivo zera, negativo vira excedente)? | **Sim.** O banco encerra como num fim de período, mesmo no meio do período de apuração                                                                   |
| P2  | As horas de DBA (atendimento e monitoramento) são por mês?                                                           | **Sim, por mês**, gravadas em minutos, como no protótipo                                                                                                 |
| P3  | Contatos, grupos de responsáveis e anexos continuam nas tabelas atuais, só para leitura na tela nova até a virada?   | **Sim** (3.4). Evita tabela paralela e sincronização de algo que só a tela atual edita na transição                                                      |
| P4  | Na retificação, o que entra no recálculo do mês fechado?                                                             | **Os itens do fechamento anterior mais os retroativos aprovados.** Os pendentes ficam para a próxima retificação; os descartados nunca entram            |
| P5  | A tela atual de De-para sai do menu quando a nova entrar?                                                            | **Não se aplica:** não existe tela de De-para; `de_para_categoria` é mantida direto no banco. A tela nova vira o único caminho (seção 10)                |
| P6  | A tela nova de Envio de Saldo Parcial substitui a atual, com a mesma chave e as mesmas tabelas?                      | **Sim.** É a mesma função e os mesmos dados; não há o que comparar                                                                                       |
| P7  | Regras de contagem: as regras dos requerimentos ficam fora e a tela fica no menu Banco de Horas?                     | **Sim aos dois.** A regra dos requerimentos (status e tipo de cobrança) continua na função `bancos_horas_requerimentos`                                  |
| P8  | Os três pontos da carga do catálogo (2.6)                                                                            | **Cadastro manual na tela.** Os 9 módulos sem destino vão para um produto "A classificar" e, de lá, podem ser movidos uma vez para o produto certo (2.3) |
