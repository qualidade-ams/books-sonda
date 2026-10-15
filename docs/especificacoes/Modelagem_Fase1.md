# Modelagem da Fase 1: tabelas novas, carga inicial e sincronização

Versão 0.2, 15/10/2026. As perguntas da seção 9 foram decididas (P1 a P4 pelo Willian; P5 e P6 conforme a proposta). Nenhuma migration foi escrita ainda.

Base: Especificação v2.0 (seções 4, 5, 7 e Anexo A), Inventário de Regras e Funcionalidades Atuais, `Decisoes_Negocio_Bancos_de_Horas.md` e `Achados_Caracterizacao_Fase0.md`. Todos os números de dados vêm do books-qualidade, consultado em 14 e 15/10/2026.

---

## 1. O que a Fase 1 entrega

| Entra                                                                                                  | Fica para depois                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Catálogos: produtos, módulos, de-para de grupos, ramos de atividade e módulo do requerimento → produto | **Tabelas operacionais** (cálculos, reajustes, observações, fechamentos, retroativos, Book e Saldo Parcial): **Fase 2**, junto com o motor novo e escritas test-first (ver seção 9, pergunta P1) |
| Empresa nova com o **mesmo id**, mais produtos, organizações do Aranda e informações do contrato       | Telas (Fase 3), com o design system novo                                                                                                                                                         |
| Bancos de horas: cadastro, escopo e históricos de baseline e de repasse                                | Sincronização de volta (nova → atual): Fase 6                                                                                                                                                    |
| Auditoria genérica das tabelas novas                                                                   | Sincronização do de-para novo → atual: Fase 3, junto com a tela De-para                                                                                                                          |
| Carga inicial e **sincronização atual → nova** das empresas                                            | —                                                                                                                                                                                                |

Durante a Fase 1, **nenhuma tela e nenhum comportamento atual muda**. As tabelas atuais só ganham gatilhos de sincronização, que nunca bloqueiam a gravação do legado (seção 6.1).

---

## 2. Padrões aplicados (Anexo A.1)

| Tema                     | Como fica                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Horas                    | `integer` em **minutos** (colunas `*_minutos`). Tickets em `integer`. Nada em INTERVAL, texto ou decimal de horas.                                                                                            |
| Percentuais              | `numeric(5,2)`, CHECK de 0 a 100. **0 é sempre respeitado** (D-04).                                                                                                                                           |
| Datas                    | `date` para vigências; `timestamptz DEFAULT now()` para instantes. Mês e ano como `smallint`.                                                                                                                 |
| Vínculos                 | Sempre por FK. Nunca por nome em texto.                                                                                                                                                                       |
| Exclusão                 | Lógica (`ativo` mais `inativado_em`/`inativado_por`). FKs com **ON DELETE RESTRICT** (D-14). As exceções são as tabelas de ligação N:N (produtos da empresa, escopo do banco), que podem ter linhas apagadas. |
| Autoria                  | `created_at`, `created_by`, `updated_at` e `updated_by` (FK `auth.users`), preenchidos por gatilho, com `(SELECT auth.uid())`.                                                                                |
| Listas fixas             | `text` com CHECK documentado (não `enum`, que é difícil de alterar).                                                                                                                                          |
| RLS                      | Habilitada em todas as tabelas. Políticas por ação, usando a função existente `has_screen_permission(tela, 'view' \| 'edit')`, que já respeita a hierarquia edit > view.                                      |
| Funções                  | `SECURITY DEFINER SET search_path = public`. Funções internas sem EXECUTE para `anon` e `authenticated`.                                                                                                      |
| Auditoria                | Gatilho genérico em todas as tabelas novas, gravando em `auditoria_alteracoes` (seção 3.5).                                                                                                                   |
| Sobreposição de vigência | Constraint `EXCLUDE` com `daterange`. Precisa da extensão **`btree_gist`**, que está disponível mas não instalada (seção 9, pergunta P6).                                                                     |

---

## 3. Tabelas

Convenções: **PK** = chave primária; **FK** = chave estrangeira (RESTRICT, salvo indicação); **UQ** = única. Todas têm as colunas de autoria da seção 2, que não são repetidas abaixo.

### 3.1 Catálogos

**`produtos`**

| Coluna                             | Tipo              | Regras                                                                                                      |
| ---------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------- |
| id                                 | uuid PK           |                                                                                                             |
| codigo                             | text NOT NULL UQ  | `COMEX`, `FISCAL`, `GALLERY`: o mesmo código do legado (`empresa_produtos.produto`), usado na sincronização |
| nome                               | text NOT NULL     |                                                                                                             |
| descricao                          | text              |                                                                                                             |
| ordem                              | smallint NOT NULL | Ordem de exibição                                                                                           |
| ativo, inativado_em, inativado_por |                   | Produto inativo não aparece para escopos novos                                                              |

**`produto_modulos`**

| Coluna                             | Tipo                        | Regras                                                                              |
| ---------------------------------- | --------------------------- | ----------------------------------------------------------------------------------- |
| id                                 | uuid PK                     |                                                                                     |
| produto_id                         | uuid FK `produtos` NOT NULL |                                                                                     |
| nome                               | text NOT NULL               | UQ (`produto_id`, `lower(nome)`)                                                    |
| descricao                          | text                        |                                                                                     |
| ordem                              | smallint NOT NULL           |                                                                                     |
| ativo, inativado_em, inativado_por |                             | Inativar módulo que está no escopo de banco ativo exige confirmação (regra de tela) |

Tem também uma UQ técnica (`id`, `produto_id`), para as FKs compostas abaixo garantirem que o módulo pertence ao produto.

**`grupos_aranda`** (de-para novo; substitui `de_para_categoria`)

| Coluna                             | Tipo               | Regras                                                                                                                                                                                       |
| ---------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                                 | uuid PK            | **Mesmo id** da linha de `de_para_categoria`, para facilitar a sincronização                                                                                                                 |
| grupo_aranda                       | text NOT NULL UQ   | Exatamente como vem do Aranda (`caso_grupo` / `nome_grupo`)                                                                                                                                  |
| grupo_book                         | text NOT NULL      | Nome exibido no Book, em Elogios, Pesquisas e Dashboard                                                                                                                                      |
| produto_id                         | uuid FK `produtos` |                                                                                                                                                                                              |
| modulo_id                          | uuid               | FK composta (`modulo_id`, `produto_id`) → `produto_modulos`                                                                                                                                  |
| classificacao                      | text NOT NULL      | CHECK `modulo` \| `sem_modulo` \| `nao_se_aplica`. Coerente com `modulo_id`: só `modulo` tem módulo. `nao_se_aplica` é para grupos como DEDICADOS e T&M, que vão sempre para o Banco padrão. |
| ativo, inativado_em, inativado_por |                    |                                                                                                                                                                                              |

**`ramos_atividade`**: id, `nome` (UQ, sem diferenciar maiúsculas), `ordem`, `ativo`. Nasce **vazia** (9.3-9).

**`modulos_requerimento_produto`** (RN-09, 9.3-11)

| Coluna              | Tipo             | Regras                                                                                                     |
| ------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------- |
| id                  | uuid PK          |                                                                                                            |
| modulo_requerimento | text NOT NULL UQ | Valor de `requerimentos.modulo` (Comex, Comply, Comply e-DOCS, pw.SATI, pw.SPED, pw.SATI/pw.SPED, Gallery) |
| produto_id          | uuid FK NOT NULL |                                                                                                            |
| modulo_id           | uuid             | FK composta → `produto_modulos`; nulo = produto inteiro                                                    |

### 3.2 Empresa

**`empresas`** (identidade, configurações de Book e modelo de cálculo)

| Coluna                                  | Tipo                           | Origem no legado / regra                                                                                       |
| --------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| id                                      | uuid PK, **sem default**       | = `empresas_clientes.id` (CA-18)                                                                               |
| nome_completo                           | text NOT NULL                  | Igual ao legado. **Deixa de ser a chave do Aranda** (ver `empresas_organizacoes_aranda`)                       |
| nome_abreviado                          | text NOT NULL                  |                                                                                                                |
| status                                  | text NOT NULL                  | CHECK `ativo` \| `inativo`. O "suspenso" do legado vira `inativo` (D-13; hoje não há nenhuma empresa suspensa) |
| data_status                             | timestamptz                    |                                                                                                                |
| descricao_status                        | text                           | Obrigatória quando inativo (regra de tela)                                                                     |
| email_gestor, email_comercial, email_tm | text                           |                                                                                                                |
| link_sharepoint                         | text                           |                                                                                                                |
| observacao                              | text                           | CHECK de até 500 caracteres                                                                                    |
| em_projeto, tem_ams                     | boolean NOT NULL               |                                                                                                                |
| vigencia_inicio                         | date                           | ← `vigencia_inicial`. **Vigência do contrato** (D-12): controla disparo, lista de Books e inativação           |
| vigencia_fim                            | date                           | ← `vigencia_final`                                                                                             |
| empresa_consolidadora_id                | uuid FK `empresas`             | D-15                                                                                                           |
| tipo_book                               | text NOT NULL                  | CHECK `nao_tem_book` \| `qualidade` \| `outros`                                                                |
| book_personalizado, book_anexo          | boolean NOT NULL               | ← `book_personalizado`, `anexo`                                                                                |
| template_padrao                         | text                           | Igual ao legado (`portugues`, `ingles` ou UUID de `email_templates`). Normalização fica para a Fase 6          |
| meta_sla_percentual                     | numeric(5,2)                   | ← legado (configuração do Book)                                                                                |
| quantidade_minima_chamados_sla          | integer                        | ← legado                                                                                                       |
| modelo_calculo                          | text NOT NULL DEFAULT `legado` | CHECK `legado` \| `multiplo` (RN-15)                                                                           |
| modelo_alterado_em, modelo_alterado_por |                                | Liberar e voltar para o legado (seção 5.7 da spec)                                                             |
| sincronizado_em                         | timestamptz                    | Última sincronização vinda do legado                                                                           |
| excluida_no_legado_em                   | timestamptz                    | Preenchida se a empresa for excluída fisicamente no legado (seção 6.1)                                         |

Ficam fora da empresa, porque passam para o banco: `tipo_contrato`, `tipo_cobranca`, `periodo_apuracao`, `inicio_vigencia`, `dia_inicio_apuracao`, `dia_fim_apuracao`, baseline, repasse, repasse especial e segmentação. **Descartada:** `ciclo_atual` (Inventário, prova do DESCARTAR).

**`empresas_produtos`**: PK (`empresa_id`, `produto_id`), mais `created_at` e `created_by`. Produtos contratados.

**`empresas_organizacoes_aranda`** (Inventário 5; substitui o vínculo pelo nome)

| Coluna                             | Tipo             | Regras                                                                              |
| ---------------------------------- | ---------------- | ----------------------------------------------------------------------------------- |
| id                                 | uuid PK          |                                                                                     |
| empresa_id                         | uuid FK NOT NULL |                                                                                     |
| nome_organizacao                   | text NOT NULL    | UQ em `lower(trim(nome_organizacao))`: uma organização pertence a uma única empresa |
| ativo, inativado_em, inativado_por |                  |                                                                                     |

**`empresas_informacoes_contrato`** (1:1 com a empresa; RN-27 a RN-35)

| Coluna                        | Tipo        | Regras                                                                                            |
| ----------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| empresa_id                    | uuid PK, FK |                                                                                                   |
| ramo_atividade_id             | uuid FK     |                                                                                                   |
| fiscal_modalidade             | text        | CHECK `saas` \| `on_premise`                                                                      |
| fiscal_edocs_24x7             | boolean     |                                                                                                   |
| fiscal_atualizacao_contratada | boolean     |                                                                                                   |
| fiscal_atualizacoes_por_ano   | smallint    | CHECK > 0                                                                                         |
| fiscal_dba                    | text        | CHECK `atendimento` \| `monitoramento` \| `atendimento_monitoramento` \| `nao_contratado` (9.3-8) |
| fiscal_banco_dados            | text        | CHECK `sql_server` \| `oracle`                                                                    |

Todas as colunas aceitam nulo, porque os clientes antigos ficam pendentes até a próxima edição (RN-35, 9.3-10). A obrigatoriedade condicional (RN-28 a RN-33) fica na tela (Zod). O banco só valida os domínios (valores aceitos e quantidade > 0). Ele não valida a coerência entre campos, porque os campos que deixam de se aplicar ficam guardados (RN-33): por exemplo, a quantidade de atualizações continua gravada quando "Atualização contratada" passa para "Não".

### 3.3 Bancos de horas

**`bancos_horas`**

| Coluna                                    | Tipo                              | Regras                                                                                                                |
| ----------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| id                                        | uuid PK                           |                                                                                                                       |
| empresa_id                                | uuid FK NOT NULL                  |                                                                                                                       |
| nome                                      | text NOT NULL                     | UQ (`empresa_id`, `lower(nome)`). Exibido ao cliente (RN-11)                                                          |
| descricao                                 | text                              | Uso interno                                                                                                           |
| padrao                                    | boolean NOT NULL                  | No máximo um banco padrão ativo por empresa (índice único parcial); "pelo menos um" é regra de gatilho (RN-01, RN-14) |
| visivel_cliente                           | boolean NOT NULL DEFAULT true     | `false` no Banco padrão interno do cenário 1: fica fora do Book e do Saldo Parcial (9.3-1)                            |
| ordem                                     | smallint NOT NULL                 | Prioridade de classificação (RN-06)                                                                                   |
| ativo, inativado_em, inativado_por        |                                   | O padrão não pode ser inativado enquanto houver outro banco ativo (RN-14)                                             |
| tipo_contrato                             | text NOT NULL                     | CHECK `horas` \| `tickets` \| `ambos` (substitui `tipo_contrato` e `tipo_cobranca` do legado, E-21)                   |
| periodo_apuracao                          | smallint NOT NULL                 | CHECK de 1 a 12                                                                                                       |
| inicio_vigencia                           | date NOT NULL                     | Sempre no dia 1. Define os ciclos. Não pode ser anterior a `empresas.vigencia_inicio` (D-12; gatilho)                 |
| dia_inicio_apuracao                       | smallint NOT NULL DEFAULT 1       | CHECK de 1 a 28                                                                                                       |
| dia_fim_apuracao                          | smallint NOT NULL DEFAULT 0       | CHECK de 0 a 28 (0 = último dia do mês)                                                                               |
| taxa_produto                              | text NOT NULL                     | CHECK `GALLERY` \| `OUTROS`: qual taxa do cliente usar (`taxas_clientes.tipo_produto`)                                |
| taxa_tipo_hora                            | text NOT NULL DEFAULT `excedente` | CHECK `excedente` \| `normal` (9.3-1b)                                                                                |
| repasse_especial                          | text NOT NULL DEFAULT `nenhum`    | CHECK `nenhum` \| `por_periodo` (D-03 descartou o "simples")                                                          |
| duracao_periodo_meses, periodos_ate_zerar | smallint                          | Obrigatórios só quando `repasse_especial = 'por_periodo'` (CHECK)                                                     |
| consome_outros_bancos                     | boolean NOT NULL DEFAULT false    | RN-17                                                                                                                 |
| filtro_ic_operador                        | text                              | CHECK `contem` \| `igual`. Filtro avançado por item de configuração (RN-06, ANGLO)                                    |
| filtro_ic_valor                           | text                              | Obrigatório quando há operador                                                                                        |
| origem                                    | text NOT NULL                     | CHECK `carga_legado` \| `manual`                                                                                      |
| espelha_legado                            | boolean NOT NULL DEFAULT false    | Ver seção 6.2 e pergunta P2                                                                                           |

**`bancos_horas_escopo`** (o que o banco consome; RN-03 a RN-05)

| Coluna     | Tipo                                | Regras                                                                                 |
| ---------- | ----------------------------------- | -------------------------------------------------------------------------------------- |
| id         | uuid PK                             |                                                                                        |
| banco_id   | uuid FK NOT NULL (pode ser apagado) |                                                                                        |
| produto_id | uuid FK NOT NULL                    |                                                                                        |
| modulo_id  | uuid                                | FK composta → `produto_modulos`; nulo = **produto inteiro**, inclusive módulos futuros |

O gatilho de validação impede três coisas: escopo no Banco padrão, o mesmo módulo em dois bancos da mesma empresa, e produto inteiro num banco com módulo do mesmo produto em outro banco (RN-05). Um banco que não é padrão precisa de pelo menos um escopo ou de filtro avançado (regra de tela).

**`bancos_horas_baseline`** (histórico; substitui `baseline_historico`)

| Coluna             | Tipo                           | Regras                                                                |
| ------------------ | ------------------------------ | --------------------------------------------------------------------- |
| id                 | uuid PK                        |                                                                       |
| banco_id           | uuid FK NOT NULL               |                                                                       |
| baseline_minutos   | integer                        | CHECK ≥ 0. Obrigatório se o banco for de horas ou ambos (gatilho)     |
| baseline_tickets   | integer                        | CHECK ≥ 0. Obrigatório se o banco for de tickets ou ambos (gatilho)   |
| credito            | text NOT NULL DEFAULT `mensal` | CHECK `mensal` \| `anual` (← `tipo_banco`; RC-09)                     |
| data_inicio        | date NOT NULL                  |                                                                       |
| data_fim           | date                           | Nulo = vigente. **EXCLUDE**: sem vigências sobrepostas do mesmo banco |
| motivo, observacao | text                           |                                                                       |

**`bancos_horas_repasse`** (histórico de percentuais; substitui `percentual_repasse_historico`)

| Coluna                                               | Tipo                  | Regras                                                                           |
| ---------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------- |
| id                                                   | uuid PK               |                                                                                  |
| banco_id                                             | uuid FK NOT NULL      |                                                                                  |
| percentual_mensal                                    | numeric(5,2) NOT NULL | **Obrigatório, sem padrão** (D-04)                                               |
| percentual_dentro_periodo, percentual_entre_periodos | numeric(5,2)          | Obrigatórios se o banco for "por período" (gatilho). **0 é respeitado** (RC-166) |
| data_inicio, data_fim                                | date                  | EXCLUDE, igual ao baseline                                                       |
| motivo, observacao                                   | text                  |                                                                                  |

### 3.4 Requerimentos

`modulos_requerimento_produto` (3.1) entra na Fase 1 porque é um catálogo. A tabela `requerimentos_bancos` (banco classificado de cada requerimento) entra na Fase 2, junto com o classificador.

### 3.5 Infraestrutura

**`auditoria_alteracoes`** (genérica; atende "auditoria gravada de fato", Inv. 7)

| Coluna                    | Tipo                               | Regras                                                             |
| ------------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| id                        | bigint identity PK                 |                                                                    |
| tabela                    | text NOT NULL                      |                                                                    |
| registro_id               | text NOT NULL                      | PK do registro alterado                                            |
| empresa_id                | uuid                               | Para filtrar por empresa (sem FK, para a trilha nunca ser apagada) |
| banco_id                  | uuid                               | Idem, por banco (seção 6.4 da spec)                                |
| acao                      | text NOT NULL                      | CHECK `insert` \| `update` \| `delete`                             |
| campos_alterados          | text[]                             |                                                                    |
| dados_antes, dados_depois | jsonb                              |                                                                    |
| usuario_id                | uuid                               | `auth.uid()`; nulo quando a origem é sistema                       |
| origem                    | text NOT NULL                      | CHECK `app` \| `sincronizacao` \| `carga` \| `sistema`             |
| created_at                | timestamptz NOT NULL DEFAULT now() |                                                                    |

Só tem INSERT, e ele é feito pelo gatilho. Ninguém altera nem apaga. A leitura segue a permissão da tela Auditoria do Banco de Horas.

**`sincronizacao_legado_falhas`**

| Coluna                   | Tipo               | Regras                                                 |
| ------------------------ | ------------------ | ------------------------------------------------------ |
| id                       | bigint identity PK |                                                        |
| tabela_origem            | text NOT NULL      |                                                        |
| registro_id              | text NOT NULL      |                                                        |
| operacao                 | text NOT NULL      |                                                        |
| erro                     | text NOT NULL      | Só `SQLSTATE` e mensagem, sem os dados da linha (LGPD) |
| created_at, resolvida_em | timestamptz        |                                                        |

Recebe as falhas de sincronização. O gatilho nunca aborta a gravação do legado (6.1). Uma falha aberta gera notificação no sino para quem edita a tela Empresas (nova).

---

## 4. Permissões e RLS

Telas novas a registrar já na Fase 1 em `screens`, para a RLS funcionar. Na carga, só o grupo **Administradores** recebe Edição (9.3-3). As rotas e o menu só aparecem na Fase 3.

| screen_key (proposta)     | Tela                                 | O que libera                                                  |
| ------------------------- | ------------------------------------ | ------------------------------------------------------------- |
| `empresas`                | Empresas (nova)                      | Identidade, produtos, organizações e informações do contrato  |
| `bancos_horas_parametros` | Aba Bancos de Horas da tela Empresas | Cadastro, escopo, baseline e repasse dos bancos (pergunta P4) |
| `produtos_modulos`        | Produtos e Módulos                   | Catálogo e módulo do requerimento → produto                   |
| `de_para_grupos`          | De-para de Grupos                    | `grupos_aranda`                                               |
| `ramos_atividade`         | Ramos de Atividade                   | `ramos_atividade`                                             |
| `bancos_horas_auditoria`  | Auditoria do Banco de Horas          | Leitura de `auditoria_alteracoes`                             |

As chaves do Controle, da aprovação de retroativos, da comparação e do Saldo Parcial novo entram com as tabelas da Fase 2.

Padrão das políticas, com uma política por comando e sem duplicar (`DROP POLICY IF EXISTS` antes):

- SELECT: `has_screen_permission('<tela>', 'view')`.
- INSERT e UPDATE: `has_screen_permission('<tela>', 'edit')`.
- DELETE: só nas tabelas de ligação (`empresas_produtos`, `bancos_horas_escopo`), com `edit`. Nas demais não há política (a exclusão é lógica).
- Catálogos (`produtos`, `produto_modulos`, `ramos_atividade`): SELECT para qualquer usuário autenticado, por serem dados de referência sem informação pessoal usados em várias telas; escrita com `edit` da tela dona.

**"Aprovar"** (spec 4.3): o RBAC atual só tem `view` e `edit`. A proposta é não mexer no RBAC e criar uma tela de ação própria (ex.: `bancos_horas_aprovacao`), em que `edit` = poder aprovar. Isso entra na Fase 2.

---

## 5. Carga inicial

Ela roda numa migration de dados, dentro de uma transação, com `origem = 'carga'` na auditoria. Depois dela, uma bateria de consultas de conferência precisa voltar 100% (5.2).

### 5.1 O que é carregado

| #   | Destino                         | De onde vem                                                                           | Volume (14/10/2026)                          |
| --- | ------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | `produtos`                      | Fixo: COMEX, FISCAL, GALLERY                                                          | 3                                            |
| 2   | `produto_modulos`               | Os 64 `grupo_book` de `de_para_categoria`, no formato "PRODUTO - Módulo"              | 55 módulos (COMEX 15, FISCAL 25, GALLERY 15) |
| 3   | `grupos_aranda`                 | `de_para_categoria` (172 linhas), mesmo id                                            | 170 (2 duplicadas idênticas descartadas)     |
| 4   | `ramos_atividade`               | —                                                                                     | 0                                            |
| 5   | `modulos_requerimento_produto`  | Tabela da decisão 9.3-11                                                              | 7                                            |
| 6   | `empresas`                      | `empresas_clientes`, mesmo id                                                         | 190                                          |
| 7   | `empresas_produtos`             | `empresa_produtos`                                                                    | 220                                          |
| 8   | `empresas_organizacoes_aranda`  | `nome_completo` de cada empresa: o vínculo que o motor usa hoje                       | 190 (sem duplicados)                         |
| 9   | `empresas_informacoes_contrato` | Linha vazia por empresa (pendente)                                                    | 190                                          |
| 10  | `bancos_horas`                  | Um **Banco padrão** por empresa com `tipo_contrato`, copiando os parâmetros do legado | 141                                          |
| 11  | `bancos_horas_baseline`         | `baseline_historico`, com horas decimais × 60 arredondadas                            | todas as vigências                           |
| 12  | `bancos_horas_repasse`          | `percentual_repasse_historico`, mais os percentuais por período da empresa            | todas as vigências (188 vigentes)            |

Detalhes da carga:

- **Módulos (2):**
  - "COMEX - Câmbio" vira produto COMEX, módulo Câmbio.
  - "FISCAL - EFD ICMS" vira FISCAL, módulo EFD ICMS.
  - **"FISCAL GALLERY - X" vira produto GALLERY**, porque os grupos Aranda de origem se chamam "AMS APL - GALLERY…" (pergunta P3).
  - Os grupos sem produto ficam `nao_se_aplica`: BPO, CUSTOMER SUCCESS, DEDICADOS, GERAL, GERENTE, PROJETO, Qualidade AMS, T&M e Ticket Manager.
- **Banco padrão (10):**
  - Nome **"Banco de Horas"** (pergunta P5), `padrao = true`, `visivel_cliente = true`, `origem = 'carga_legado'`.
  - `taxa_produto` = o `tipo_produto` da taxa mais recente do cliente, como o motor faz hoje (OUTROS se não houver taxa).
  - `repasse_especial`: `por_periodo` para a única empresa que usa; `nenhum` para as demais. Nenhuma usa o "simples".
- **ANGLO (segmentada):** entra com **um único Banco padrão**, com o baseline total, igual ao legado. A divisão em NIQUEL e IOB acontece no mês de corte, depois da validação (9.3-2).
- **10 empresas AMS ativas sem `tipo_contrato`:** ficam **sem banco** e aparecem como pendência. O legado também não calcula para elas.
- **Todas** as empresas entram com `modelo_calculo = 'legado'`.

### 5.2 Conferência pós-carga (consultas que precisam bater)

- **CA-18:** os mesmos ids e os mesmos dados de identidade entre `empresas` e `empresas_clientes`, com 190 = 190 e zero diferenças.
- **Contagens:** produtos por empresa iguais, e as vigências de baseline e repasse com a mesma quantidade e as mesmas datas.
- **Valores:** a soma dos baselines em minutos = soma(`baseline_horas` × 60) arredondada, e os percentuais iguais.
- **Bancos:** um Banco padrão por empresa com `tipo_contrato`, e nenhuma empresa com dois.

Essas consultas viram um teste SQL versionado, que roda de novo a cada carga e em cada ambiente.

---

## 6. Sincronização atual → nova (Fases 1 a 5)

### 6.1 Princípios

1. **O legado nunca é bloqueado.** O gatilho de sincronização roda em `BEGIN … EXCEPTION`. Se falhar, grava em `sincronizacao_legado_falhas` e deixa a gravação do legado seguir.
2. **Sem laço.** O gatilho marca a sessão (`set_config('app.sincronizando', 'on', true)`). Assim, a sincronização inversa da Fase 6 ignora o que veio dela, e vice-versa.
3. **Só identidade.** Os campos exclusivos da tabela nova (bancos, organizações, informações do contrato, ramo, modelo de cálculo) nunca são sobrescritos pelo legado.
4. **Idempotente.** É um upsert pelo mesmo id, e o resultado é igual se rodar duas vezes.

### 6.2 Gatilhos

| Tabela atual                                                                                      | Evento          | Efeito na nova                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `empresas_clientes`                                                                               | INSERT          | Cria `empresas` (mesmo id) e uma linha vazia em `empresas_informacoes_contrato`. Cria a organização do Aranda = `nome_completo`, se ninguém a tiver ainda.                                                         |
| `empresas_clientes`                                                                               | UPDATE          | Atualiza os campos de identidade (tabela 3.2) e `sincronizado_em`. Se o status for "suspenso", grava `inativo`. **Renomear não altera as organizações do Aranda** (é a correção do Inventário 5; ver nota abaixo). |
| `empresas_clientes`                                                                               | DELETE          | Não apaga nada: grava `status = 'inativo'` e `excluida_no_legado_em = now()` (D-14).                                                                                                                               |
| `empresa_produtos`                                                                                | INSERT / DELETE | Espelha em `empresas_produtos`, convertendo o código em `produto_id`.                                                                                                                                              |
| Parâmetros do banco em `empresas_clientes`, `baseline_historico` e `percentual_repasse_historico` | INSERT / UPDATE | **Depende da pergunta P2.**                                                                                                                                                                                        |

**Nota sobre renomear:** enquanto a empresa estiver no modelo legado, renomear no legado continua desligando o consumo **no legado**, mas não no modelo novo. Na Comparação Legado x Novo, essa diferença aparece como "explicada por correção".

### 6.3 Parâmetros do banco durante a transição (pergunta P2)

O problema é este. Até a liberação de cada empresa, a tela atual continua alterando baseline, repasse e período de apuração, e o cálculo legado usa esses valores. Se o banco novo ficar congelado na carga, a Comparação Legado x Novo acusa divergências que vêm só do cadastro.

- **Proposta:** enquanto o banco tiver `espelha_legado = true` (o Banco padrão criado pela carga, numa empresa em modelo legado), os parâmetros e os históricos de baseline e repasse são espelhados do legado para ele.
- **O espelhamento desliga sozinho (passa para `false`) quando:**
  - alguém edita o banco na tela nova;
  - a empresa ganha um segundo banco;
  - a empresa é liberada para o modelo múltiplo.
- **Depois disso,** o banco passa a ser mantido só na tela nova.

---

## 7. Arquivos e sequência de entrega

Cada passo é uma migration. Cada um tem antes um teste SQL de verificação, que falha e depois passa (TDD aplicado a schema).

1. `20261015000001_fase1_infra_catalogos.sql`: autoria e auditoria genérica (antes, para as tabelas já nascerem auditadas), mais os catálogos e as telas de catálogo. **Aplicada em 15/10/2026; teste `supabase/tests/fase1_01_catalogos.test.sql` verde.**
2. `…_fase1_empresas.sql`: empresas e satélites, com RLS e auditoria.
3. `…_fase1_bancos_horas.sql`: bancos, escopo e históricos, com gatilhos de validação (RN-01, RN-05, RN-14, D-12, EXCLUDE).
4. `…_fase1_sincronizacao.sql`: tabela de falhas e gatilhos de sincronização.
5. `…_fase1_carga.sql`: carga inicial (5.1) e conferência (5.2).

Do lado do app, entram tipos regerados e testes de integração dos gatilhos, rodando no banco dentro de transação revertida. Não há tela nesta fase.

---

## 8. Riscos

| Risco                                                            | Mitigação                                                                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Um gatilho de sincronização derruba a gravação do legado         | `EXCEPTION` em todo gatilho, mais o registro de falha (6.1). Teste específico: forçar um erro e confirmar que o legado gravou. |
| Divergência silenciosa entre as duas tabelas                     | Consulta de conferência agendada (diária), com notificação no sino se aparecer diferença. Critério da virada 7.5 da spec.      |
| A carga roda duas vezes                                          | `ON CONFLICT DO NOTHING` pelos ids, e conferência no fim.                                                                      |
| A tabela de empresas recebe gatilho novo num sistema em produção | Os gatilhos são AFTER e não alteram a linha do legado. Teste de regressão: a suíte de caracterização continua verde.           |

---

## 9. Decisões tomadas antes da migration

| #   | Pergunta                                                                                                                                            | Decisão (15/10/2026)                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| P1  | As tabelas operacionais (cálculos, reajustes, observações, fechamentos, retroativos, Book e Saldo Parcial por banco) entram na Fase 1 ou na Fase 2? | **Fase 2**, junto com o motor e escritas test-first.                                      |
| P2  | Os parâmetros do Banco padrão da carga acompanham o legado até a liberação?                                                                         | **Sim**, com o espelhamento automático da seção 6.3.                                      |
| P3  | Os grupos "FISCAL GALLERY - X" pertencem ao produto GALLERY?                                                                                        | **Sim**, pelos nomes dos grupos Aranda ("AMS APL - GALLERY…").                            |
| P4  | Os parâmetros dos bancos têm permissão própria (`bancos_horas_parametros`) ou usam a da tela Empresas?                                              | **Própria**: editar a identidade da empresa não deve permitir mudar regra de faturamento. |
| P5  | Nome do Banco padrão criado pela carga                                                                                                              | **"Banco de Horas"**: é o que o cliente vê hoje, e pode ser editado.                      |
| P6  | Instalar a extensão `btree_gist` (para a constraint de vigências sem sobreposição)?                                                                 | **Sim.** É padrão do Postgres, já está disponível no projeto e é mais seguro que gatilho. |
