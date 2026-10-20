# Decisão — Separação do sistema por setor

Registro da decisão de permitir que outro setor use o Books SND com as mesmas telas e funcionalidades, sem enxergar os dados do setor atual. Tomada durante a reconstrução dos múltiplos bancos de horas, antes da Fase 3 (telas).

Decidido por: Willian Faria, em 16/10/2026.

## 1. Necessidade

- O novo usuário do sistema é **outro setor da Sonda**.
- Ele terá **as mesmas telas e funcionalidades**. Os módulos são todos disponíveis e liberados por permissão, como hoje.
- **Isolamento total:** um setor não enxerga nada do outro. O setor novo tem o próprio admin e o próprio login.
- A identidade visual dos Books e e-mails continua **Sonda**.
- Não há exigência contratual ou de LGPD de isolamento físico.
- A origem dos dados do setor novo **ainda não está definida**: pode ser um SQL Server Aranda ou planilha Excel com os campos da interface.
- O que pode variar entre setores: regras de validação, regras de integração, códigos de resolução e de-paras.

## 2. Decisão: separação física

Cada setor tem o **próprio ambiente**, e todos rodam o **mesmo código**:

```
                  um repositório (main)
                         │
          ┌──────────────┴──────────────┐
   Vercel projeto A               Vercel projeto B
   (setor atual)                  (setor novo)
          │                              │
   Supabase atual                 Supabase novo
   (dados, login, storage)        (dados, login, storage)
          │                              │
   sync-api → Aranda atual        Aranda do setor ou importação de Excel
```

- Os dois projetos Vercel publicam a mesma branch. O que muda entre eles são as variáveis de ambiente (`VITE_SUPABASE_URL` etc.). Uma alteração de código é feita uma vez e chega aos dois.
- Cada Supabase tem a própria autenticação. O admin e o login separados vêm daí, sem desenvolvimento.

**O que se repete a cada mudança:**

- aplicar as migrations nos dois bancos;
- publicar as Edge Functions nos dois projetos.

**O que se faz uma vez, na criação do ambiente:**

- telas e permissões (`screens`/`screen_permissions`);
- primeiro admin;
- cadastro inicial;
- instância da sync-api, se a origem for Aranda.

## 3. Alternativa descartada: separação lógica (`tenant_id`)

Seria um banco só, com uma coluna de setor em cada tabela e o filtro feito pelo RLS. Foi descartada por quatro motivos:

1. **Tabelas atuais.** Exigiria `tenant_id` nas 91 tabelas, contra a decisão da reconstrução de não alterar as tabelas atuais. Isso poria em risco o envio de Book e Saldo Parcial.
2. **RLS.** As 264 políticas existentes teriam de ser revistas. O inventário já encontrou falhas de RLS, e há histórico de políticas duplicadas. Com `tenant_id`, um erro de política vaza dados de um setor para o outro.
3. **Código com chave service role.** Esse código ignora o RLS e teria de filtrar o setor à mão. Esquecer um filtro mistura dados. Está em:
   - sync-api;
   - `api/email/send.ts` e `api/users/create.ts`;
   - Edge Functions `create-user`, `admin-reset-password` e `sync-elogios-sql-server`.
4. **Desenvolvimento extra:** escopo de admin por setor, chaves de cache e pastas de storage separadas por setor.

A vantagem da lógica (uma migration e um deploy só) não compensa esses riscos com apenas dois setores.

**Quando rever esta decisão:**

- se o número de setores passar de 4 ou 5;
- se surgir a necessidade de relatório consolidado entre setores;
- se as mesmas pessoas precisarem trabalhar em mais de um setor com um login só.

Migrar de física para lógica depois é viável, porque os schemas são idênticos. O caminho contrário, separar dados já misturados, é bem mais difícil.

## 4. Quando implantar

- **Ambiente do setor novo:** depois da Fase 8 (desativação do legado). Antes disso, o setor novo receberia os módulos antigos, que têm regras do setor atual fixas no código, e os gatilhos de sincronização entre as tabelas atuais e as novas. Implantar durante a reconstrução também dobraria a aplicação de migrations das Fases 3 a 8.
- **Exceção, se houver urgência:** antecipar com um ambiente só com os módulos já reconstruídos.
- **Cuidados da seção 5:** valem desde já, para não encarecer a separação depois.

## 5. Regras que valem desde já

### 5.1 Diferença entre setores é dado, não código

Códigos de resolução, filtros de contagem, regras de validação e de-paras vêm de tabela de configuração, com tela. Nunca `if (setor === ...)` nem lista fixa no código. Entra no checklist de revisão das Fases 3 em diante.

Situação hoje:

- **Motor novo** (`src/services/bancosHoras/`): orientado a dados. Escopo, filtro de item de configuração e de-para de grupos vêm de tabela.
- **Legado:** tem os códigos de resolução do setor atual fixos no código, com 439 ocorrências como `'AMS SAP (Banco=S |SLA=S)'` em 14 arquivos (ex.: `booksDataCollectorService.ts`). Cada módulo reconstruído deve trocar essas listas por configuração.

### 5.2 Entrada de dados independente da origem

A sync-api (Aranda) e um futuro importador de Excel gravam **nas mesmas tabelas, com os mesmos campos**. O motor e as telas só leem dessas tabelas. O motor de consumo usa:

| Tabela                         | Uso                                  |
| ------------------------------ | ------------------------------------ |
| `apontamentos_aranda`          | Apontamentos (horas)                 |
| `apontamentos_tickets_aranda`  | Tickets                              |
| `empresas_organizacoes_aranda` | Liga o nome da organização à empresa |
| `requerimentos`                | Requerimentos                        |

O "aranda" no nome é só nome: a tabela recebe dados de qualquer origem. Para o importador de Excel:

- **O layout cobre todos os módulos, não só o motor.** Books, inconsistências e outros módulos leem mais campos dessas tabelas. O modelo de planilha sai de um levantamento de todos os campos usados.
- **Os valores seguem o mesmo domínio.** Tipo de chamado, status e código de resolução precisam bater com as tabelas de configuração. O importador valida antes de gravar.
- **Reimportar não duplica.** Cada linha tem uma chave única (ex.: número do chamado + tarefa), e a segunda carga atualiza em vez de inserir.

### 5.3 Banco reconstruível só pelas migrations

Isso já vale desde a Fase 0 (baseline + migrations versionadas). Complementos:

- separar o que é **schema**, que vai para todo ambiente, do que é **dado do setor atual** (ex.: a carga da migration `20261015000006_fase1_carga.sql`, as telas e as permissões);
- não amarrar nada a um projeto Supabase específico. No código da aplicação (`src/`, `api/`, Edge Functions, sync-api) não há nada amarrado. Ficam dois pontos para ajustar na criação do ambiente (seção 8).

## 6. Mudança na decisão Q6 da Fase 2: tela de Regras de contagem

A Q6 (Modelagem_Fase2.md) decidiu que a lista de códigos de resolução seria mantida por migration, sem tela. **Ela foi revista:** a Fase 3 inclui a tela **Regras de contagem**, que configura o que entra no banco de horas. A tela reúne:

1. **Códigos de resolução** (`codigos_resolucao_banco`), que já estão em tabela: o que conta horas e o que conta tickets.
2. **Filtros hoje fixos na função `bancos_horas_consumo_itens`** (`20261015000008_fase2_consumo.sql`), que passam para uma tabela de configuração:

   | Filtro                        | Valor atual (setor atual)                                       | Aplica-se a            |
   | ----------------------------- | --------------------------------------------------------------- | ---------------------- |
   | Atividade interna             | Só `ativi_interna = 'Não'`                                      | Apontamentos           |
   | Item de configuração excluído | `000000 - PROJETOS APL`                                         | Apontamentos e tickets |
   | Tipos de chamado              | `IM`, `RF`, `PM`                                                | Apontamentos           |
   | Grupos que contam             | Contêm `AMS APL`, `AMS - APL`, `AMS - ATENDIMENTO` ou `AMS T&M` | Apontamentos e tickets |
   | Status do ticket              | `Closed`                                                        | Tickets                |

A nova tabela, a chave da tela e a permissão são definidas na modelagem da Fase 3. A carga inicial grava os valores atuais acima, então o resultado do motor não muda (os testes SQL `fase2_02` e os do motor continuam valendo como verificação).

## 7. Pedidos específicos de um setor

Uma mudança no código vale para os dois setores. Um pedido que só um setor quer entra no código único, mas fica **ligado só no ambiente que pediu**. Nunca se cria branch ou cópia por setor.

| Tipo de pedido                          | Como atender só um setor                                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tela nova                               | A tela entra no código, mas só é registrada em `screens` no banco do setor que pediu. No outro, o `ProtectedRoute` nega o acesso.                       |
| Regra ou validação diferente            | Parâmetro em tabela de configuração com tela, como Regras de contagem                                                                                   |
| Comportamento extra numa tela existente | Chave de recurso numa tabela de configuração do sistema, criada no primeiro pedido desse tipo. Hoje só existem `webhook_config` e `job_configurations`. |

**Quem pode habilitar.** O admin do setor só libera permissão (`screen_permissions`, política `user_can_manage_permissions()`) para telas que já existem em `screens`. Em `screens`, o RLS só tem política de SELECT (`baseline_schema.sql`, linha ~12229). Por isso nenhum usuário do sistema consegue registrar uma tela, só quem acessa o banco por SQL. Daí a regra:

- **a estrutura (tabelas, funções) vai na migration comum**, aplicada nos dois bancos, que continuam idênticos. A tabela de um recurso exclusivo existe vazia no outro setor;
- **o registro de uma tela ou recurso exclusivo não vai na migration comum.** Entra num script de dados por ambiente, rodado pela equipe de desenvolvimento.

**Dois níveis de controle:**

| Nível             | Exemplos                                                   | Quem controla                                                                       |
| ----------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| O que o setor tem | Telas e recursos exclusivos (`screens`, chaves de recurso) | Só a equipe de desenvolvimento. Sem política de escrita no RLS e sem tela de edição |
| Como o setor usa  | Regras de contagem, de-para, permissões dos usuários       | Admin do setor, pelas telas de configuração                                         |

Mais três cuidados:

- O acesso ao painel do Supabase de cada ambiente fica só com a equipe de desenvolvimento.
- Configuração em tabela é preferível a variável `VITE_*`, que exige nova publicação.
- Antes de atender um pedido específico, verificar se ele serve ao outro setor.

Se os pedidos específicos virarem a maioria, ou mudarem o funcionamento interno (ex.: outro modelo de cálculo), vale a revisão da seção 3.

## 8. Roteiro para criar o ambiente novo (quando for implantar)

1. Criar o projeto Supabase e aplicar só as migrations de schema.
2. Ajustar os pontos amarrados ao projeto atual:
   - `deploy-functions.sh`, com o `--project-ref` fixo;
   - baseline `20261014140000_baseline_schema.sql` (linha ~4652), com a integração de storage (iceberg/S3) apontando para a URL do projeto atual.
3. Automatizar a aplicação de migrations nos dois bancos (Supabase CLI ou CI), para que um ambiente não fique com migration a menos que o outro.
4. Publicar as Edge Functions no projeto novo.
5. Criar o projeto Vercel com as variáveis do ambiente novo.
6. Registrar telas e permissões, criar o primeiro admin e o cadastro inicial.
7. Configurar a origem dos dados: instância da sync-api (Aranda) ou importador de Excel.

## 9. Pendências

| Ponto                                                                                         | Responsável     | Quando                |
| --------------------------------------------------------------------------------------------- | --------------- | --------------------- |
| Origem dos dados do setor novo (Aranda ou Excel)                                              | Setor novo      | Antes da implantação  |
| Layout do Excel (levantamento dos campos usados por todos os módulos) e chave de reimportação | Desenvolvimento | Se a origem for Excel |
| Custo do segundo projeto Supabase (plano Pro por projeto) e do segundo projeto Vercel         | Willian         | Antes da implantação  |
| Modelagem da tela Regras de contagem                                                          | Desenvolvimento | Fase 3                |
