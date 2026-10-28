# Modelagem da Fase 4: modo sombra e Comparação Legado x Novo

Versão 0.2, 28/10/2026. As decisões C1 a C4 são de 27/10/2026. As perguntas da seção 12 foram respondidas em 28/10/2026: P1 com a carga de todos os reajustes, desde o primeiro; P2 a P5 conforme a proposta. Nenhuma migration foi escrita ainda.

Base:

- Especificação v2.0, seções 5.7, 7.1, 7.2 e 7.4;
- `Modelagem_Fase1.md`, `Modelagem_Fase2.md` (seção 8, diferenças esperadas) e `Modelagem_Fase3.md`;
- `Decisoes_Negocio_Bancos_de_Horas.md`;
- protótipo aprovado em 28/10/2026 (`/prototipos/comparacao-legado-novo`, commit `c91c7e0`);
- levantamento do cálculo legado no código (27/10/2026).

---

## 1. O que a Fase 4 entrega

| Entra                                                                                                       | Fica para depois                                          |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Modo sombra:** rotina no sync-api que calcula as empresas em Legado pelo motor novo, sem envio ao cliente | Liberar e voltar para legado (Fase 5)                     |
| **Fechamento em sombra:** quando o legado fecha um mês, o modelo novo fecha o mesmo mês                     | Book, imagem do e-mail e Saldo Parcial por banco (Fase 5) |
| **Tela Comparação Legado x Novo**, com a situação de cada empresa, o mês a mês e as diferenças por chamado  | Detecção de retroativos do modelo novo (Fase 5, ver 7.3)  |
| **Validação** da empresa pela área, com autor e data                                                        |                                                           |
| Reajustes do legado espelhados no modelo novo, desde o primeiro (seção 6)                                   |                                                           |

**O que muda para o usuário:**

- a tela nova Comparação Legado x Novo, no menu Banco de Horas;
- o Controle novo passa a mostrar meses fechados também para as empresas em Legado.

Book, e-mails e telas atuais continuam iguais.

### Decisões de 27/10/2026

| #   | Decisão                                                                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | **Rotina no sync-api.** O cálculo em sombra roda no servidor e grava o resultado em tabela. A tela só lê. O botão "Recalcular" refaz uma empresa pelo sync-api, como o "Executar agora" do Saldo Parcial.                                     |
| C2  | **A rotina fecha os meses em sombra.** Quando o legado fecha um mês (linha em `banco_horas_fechamentos`), a rotina fecha o mesmo mês no modelo novo. O fluxo do Book não muda.                                                                |
| C3  | **"Validada" no lugar de "Liberar".** A área marca a empresa como validada. Liberar e voltar para legado entram na Fase 5, junto com o Book por banco. Liberar hoje não mudaria o Book e abriria o envio do Saldo Parcial pelo Controle novo. |
| C4  | **Situação "Explicada".** Quando toda a diferença tem motivo reconhecido (correção intencional do modelo novo), a empresa pode ser validada. Se sobra diferença sem motivo, ela fica "Divergente".                                            |

---

## 2. As duas pontas da comparação

### 2.1 Legado: o mês que o cliente recebeu

A fonte é `banco_horas_fechamentos`, gravado por `bancoHorasQuarentenaService.fecharPeriodo` depois da geração do Book. A geração automática reabre e fecha de novo (`forcar_atualizacao`), então `fechado_em` é sempre o da última geração.

| Campo                       | Uso                                                                                                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `snapshot_calculo` (jsonb)  | Cópia da linha de `banco_horas_calculos` no fechamento: consumo, requerimentos, reajustes, saldo, repasse, excedente e valores. Colunas `*_horas` chegam como texto de `interval` (`"96:40:00"`) e viram minutos |
| `apontamentos_ids` (text[]) | `apontamentos_aranda.id_externo` dos apontamentos que contaram                                                                                                                                                   |
| `tickets_ids` (text[])      | `apontamentos_tickets_aranda.nro_solicitacao` dos tickets que contaram                                                                                                                                           |
| `fechado_em`                | Detecta retificação do legado (seção 7)                                                                                                                                                                          |

**`banco_horas_calculos` não serve como referência.** Ele tem uma linha por empresa e mês, regravada sempre que alguém abre o Controle atual, gera a imagem do e-mail ou roda o Saldo Parcial.

**Empresas segmentadas (ANGLO):** o legado não grava o resultado por segmento (`banco_horas_calculos_segmentados` não tem escritor). Por isso só se compara o total, que é o critério "Soma confere".

### 2.2 Novo: o motor da Fase 2

- **Mês já fechado em sombra:** devolve o resultado congelado.
- **Mês ainda não fechado:** calcula na hora com `calcularEmpresaMes`, sobre um repositório com cache (`comCache`, como no Controle).
- **Itens de cada banco:** vêm de `itensDeConsumoPorBanco` (`fechamento.ts`), ou de `bancos_horas_fechamento_itens` quando o mês está fechado.

**Cruzamento dos itens:** o modelo novo usa o UUID de `apontamentos_aranda` e de `apontamentos_tickets_aranda`. O legado usa `id_externo` e `nro_solicitacao`. A rotina converte os IDs do legado pelas tabelas do Aranda numa consulta só por mês.

### 2.3 Meses comparados

- São os últimos 12 meses com fechamento do legado (seção 7.4 da especificação).
- O mês aberto fica fora.
- Empresa sem nenhum fechamento do legado nesse intervalo não aparece na tela (ver P4).

---

## 3. Critérios

### 3.1 O que se compara em cada mês

| Medida                                       | 1 banco        | Vários bancos                     |
| -------------------------------------------- | -------------- | --------------------------------- |
| Consumo de horas (apontamentos) e de tickets | ✔              | ✔ soma dos bancos                 |
| Requerimentos (horas e tickets)              | ✔              | ✔ soma dos bancos                 |
| Reajustes (entrada − saída)                  | ✔              | ✔ soma dos bancos                 |
| Saldo, repasse e excedente                   | ✔              | — (o legado não separa por banco) |
| Valor a faturar                              | só informativo | —                                 |

O valor a faturar fica fora do critério. As diferenças de taxa já são conhecidas e intencionais (RC-71, RC-72, RC-74 em `Modelagem_Fase2.md`, seção 8). Ver P2.

### 3.2 Situação do mês

- **Igual:** todas as medidas da 3.1 batem, ao minuto e ao ticket.
- **Explicada:** há diferença, mas cada item que a causa tem motivo reconhecido (seção 4). Diferença de saldo, repasse ou excedente herdada de um mês anterior do mesmo período também conta como explicada, desde que aquele mês esteja explicado (ver 3.3).
- **Divergente:** sobra diferença sem motivo.

### 3.3 Diferença que passa para os meses seguintes

Uma diferença de consumo num mês muda o saldo e o repasse até o fim do período de apuração.

Para não marcar todos esses meses como divergentes, a comparação guarda a "origem" da diferença de saldo:

- o primeiro mês do período com diferença de consumo, requerimento ou reajuste;
- os meses seguintes herdam a situação dele, só para saldo, repasse e excedente.

Um período novo começa limpo, exceto pelo repasse entre períodos. Se o repasse recebido difere, a origem é o mês do período anterior que causou a diferença.

### 3.4 Situação da empresa

| Situação     | Regra                                             |
| ------------ | ------------------------------------------------- |
| Idêntico     | 1 banco e todos os meses "Igual"                  |
| Soma confere | Vários bancos e todos os meses "Igual"            |
| Explicada    | Nenhum mês "Divergente" e ao menos um "Explicada" |
| Divergente   | Ao menos um mês "Divergente"                      |

### 3.5 Validação

- **Quem marca:** a área marca a empresa como validada se a situação não for "Divergente".
- **O que fica registrado:** autor, data e a situação no momento.
- **Quando cai:** se uma rodada posterior deixar a empresa "Divergente", a validação cai sozinha, com o motivo "nova divergência em <mês>", e a auditoria registra.
- **Desfazer:** é manual e exige motivo.
- **Efeito no cliente:** nenhum. A validação é o pré-requisito da liberação na Fase 5.

---

## 4. Diferenças por item e motivos reconhecidos

Para cada mês com diferença, a rotina lista os itens que estão só de um lado ou têm quantidade diferente. Cada item ganha o primeiro motivo que se aplicar:

| Motivo                                 | Como reconhece                                                                                 | Explicado? | Origem                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------- |
| Apontamento acima de 24 h              | Item nos dois lados, `tempo_gasto_minutos` ≥ 1.440 e o legado com os dias inteiros a menos     | Sim        | A3                                        |
| Fuso de Brasília                       | Item só de um lado, com a data em Brasília num mês e em UTC no vizinho                         | Sim        | D-16                                      |
| Lançado depois do fechamento do legado | Item só no novo, com `synced_at` posterior a `fechado_em`. O legado trata pela quarentena dele | Sim        | —                                         |
| Organização por igualdade              | Item só no legado, que casou por curinga `_` ou `%` no nome da organização                     | Sim        | RC-60                                     |
| Empresa renomeada no legado            | Item só no novo, de organização ligada à empresa nova, mas fora do nome atual no legado        | Sim        | `Modelagem_Fase1.md`, nota sobre renomear |
| Código de resolução sem regra          | Item só no legado, com código que não conta nas Regras de contagem                             | **Não**    | Tratar na tela Regras de contagem         |
| Grupo fora do escopo dos bancos        | Item só no legado, sem banco que o receba                                                      | **Não**    | Cadastrar o Banco padrão ou o escopo      |
| Sem motivo identificado                | Qualquer outro                                                                                 | **Não**    | —                                         |

**Requerimentos e reajustes** são comparados pelo total do mês, não item a item:

- requerimento com diferença: "Divergente";
- reajuste com diferença, antes do espelhamento da seção 6: "Explicada", com o motivo "reajuste do legado não espelhado".

O motivo é calculado em TypeScript puro (`comparacao.ts`) a partir dos itens dos dois lados e de poucos campos do Aranda (data, `synced_at`, minutos, código, organização). Não grava nada nas tabelas do Aranda.

---

## 5. Tabelas

### 5.1 `bancos_horas_comparacao` (nova): uma linha por empresa

| Coluna                                       | Tipo                                                               | Observação                                                           |
| -------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| empresa_id                                   | uuid PK, FK `empresas`                                             |                                                                      |
| situacao                                     | text CHECK (`identico`, `soma_confere`, `explicada`, `divergente`) |                                                                      |
| meses_comparados                             | smallint                                                           |                                                                      |
| consumo_legado_minutos, consumo_novo_minutos | integer                                                            | Somas dos meses comparados, para a lista                             |
| consumo_legado_tickets, consumo_novo_tickets | integer                                                            |                                                                      |
| calculado_em                                 | timestamptz DEFAULT NOW()                                          | Hora mostrada na faixa da tela                                       |
| erro                                         | text                                                               | Mensagem da última falha da rotina para a empresa (sem dado pessoal) |
| validada_por, validada_em                    | uuid FK `profiles`, timestamptz                                    | Nulos quando não validada                                            |
| validacao_situacao                           | text                                                               | Situação no momento da validação                                     |

### 5.2 `bancos_horas_comparacao_meses` (nova): uma linha por empresa e mês

| Coluna               | Tipo                                            | Observação                                                                           |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| empresa_id, ano, mes | PK                                              |                                                                                      |
| situacao             | text CHECK (`igual`, `explicada`, `divergente`) |                                                                                      |
| legado               | jsonb                                           | Medidas da 3.1, em minutos e tickets                                                 |
| novo                 | jsonb                                           | As mesmas medidas, mais o consumo por banco (`[{banco_id, nome, minutos, tickets}]`) |
| origem_saldo         | jsonb                                           | Mês que originou a diferença de saldo (3.3), ou nulo                                 |
| itens                | jsonb                                           | Diferenças por item (seção 4), limitado a 500 por mês                                |
| fechamento_legado_em | timestamptz                                     | `fechado_em` usado                                                                   |
| calculado_em         | timestamptz DEFAULT NOW()                       |                                                                                      |

**RLS (as duas tabelas):**

- SELECT para quem tem `has_screen_permission('bancos_horas_comparacao', 'view')`, com `(SELECT auth.uid())` onde houver usuário;
- sem política de INSERT, UPDATE ou DELETE para `authenticated`: quem grava é a rotina, com a service role.

**Validação:** pela função `validar_comparacao(p_empresa_id, p_validar boolean, p_motivo text)`:

- `SECURITY DEFINER SET search_path = public`;
- exige `bancos_horas_comparacao` com permissão `edit`;
- recusa validar empresa "Divergente";
- exige motivo para desfazer;
- grava em `auditoria_alteracoes` pelo gatilho genérico, com o motivo em `app.motivo` (padrão da Fase 3).

Não existe `bancos_horas_comparacao` no schema atual. O Anexo A da especificação só a nomeia.

---

## 6. Reajustes do legado no modelo novo

**Problema:**

- A carga da Fase 1 não copiou `banco_horas_reajustes` para `bancos_horas_reajustes`.
- Enquanto a empresa estiver em Legado, os reajustes continuam sendo lançados no Controle atual.
- Sem eles, o saldo do modelo novo diverge em todo mês com reajuste.
- Pior: na liberação (Fase 5), o banco começaria com um saldo diferente do que o cliente vê hoje.

**Decisão (P1):** espelhar os reajustes como a Fase 1 já espelha os parâmetros do banco padrão:

- **Carga (decisão de 28/10/2026):** todos os reajustes do legado, desde o primeiro, entram no modelo novo.
  - Entram os tipos `entrada` e `saida`, ativos e inativos, com a mesma situação. O inativo serve de histórico e não entra no cálculo, como no legado.
  - Os tipos legados `positivo` e `negativo` não entram, porque o cálculo legado os ignora (`bancoHorasService`, consultas por `tipo_reajuste` `entrada` e `saida` com `ativo`). Copiá-los criaria uma diferença que não existe. O teste da carga informa quantos ficaram de fora.
  - Reajuste de mês anterior ao início de vigência do banco entra assim mesmo: o motor só lê os meses do período, e o histórico fica completo.
  - Reajuste comum vai para o Banco padrão.
  - Reajuste segmentado (`empresa_segmentada`) vai para o banco de mesmo nome. Se não houver, vai para o Banco padrão com observação.
- **Espelho:** gatilho em `banco_horas_reajustes`, ativo só enquanto a empresa estiver em Legado.
  - Ele cria, inativa ou atualiza o reajuste espelhado, guardando o ID de origem numa coluna nova da tabela **nova**.
  - Como os gatilhos da Fase 1, nunca bloqueia o legado: em erro, registra e segue.
- **Em mês fechado em sombra:** o reajuste espelhado fica pendente até a retificação, como qualquer reajuste do modelo novo (D-05). A retificação vem do legado (seção 7).

---

## 7. Fechamento em sombra

### 7.1 Regra

Para cada empresa com `modelo_calculo = 'legado'` e ao menos um banco ativo, a rotina segue esta tabela para cada mês fechado no legado:

| Situação                                                                              | Ação                                                         |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| O legado fechou e o modelo novo não                                                   | `fecharMes(..., 'geracao_book')`                             |
| O legado reabriu e fechou de novo (`fechado_em` posterior ao fechamento novo vigente) | `fecharMes(..., 'retificacao')`, que grava nova versão       |
| O legado reabriu e ainda não fechou                                                   | Nada: o fechamento novo continua até o legado fechar de novo |

- **Alcance:** só fecha os meses que o legado fechar **depois da ativação** (P5). Os meses anteriores são comparados com o cálculo na hora.
- **Permissão:** a gravação usa `bancos_horas_registrar_fechamento`, que já aceita a service role.
- **Falha:** a falha de uma empresa não para as outras. Fica em `bancos_horas_comparacao.erro` e no log da etapa.

### 7.2 Efeito nas telas novas

- **Controle novo:** para as empresas em Legado, passa a mostrar esses meses como fechados.
- **Auditoria:** registra os fechamentos pelo gatilho genérico. Sem usuário (service role), o autor fica vazio, como nas outras gravações do sync-api.

### 7.3 Retroativos do modelo novo

- **Achado:** o job de detecção do modelo novo, previsto na Fase 3 (`Modelagem_Fase3.md`, 8.2), não foi implementado. No sync-api só existe a detecção do legado (`deteccaoAjustesRetroativosService`).
- **Pela C2**, os retroativos novos ficam desligados para empresas em Legado, porque o legado trata pela quarentena dele e retifica o Book.
- **Consequência:** o job só é necessário para empresas liberadas e passa para a **Fase 5**. A tela Apontamentos Retroativos continua vazia até lá.

---

## 8. Rotina no sync-api

### 8.1 Pacote

- **Arquivo:** `sync-api/vendor/comparacao.cjs`, gerado por `scripts/build-comparacao.mjs` no mesmo molde do `saldoParcial.cjs`, com o plugin `pluginAliasFront` e o client do servidor.
- **Conteúdo:** o motor, `fecharMes`, o comparador e a orquestração (`src/services/bancosHoras/sombra.ts`).
- **Trava:** um teste (`pacoteComparacao.test.ts`) falha se o pacote ficar desatualizado, como o do Saldo Parcial.

### 8.2 Quando roda

- **Encaixe:** etapa nova "Modo sombra (Comparação Legado x Novo)" no orquestrador, depois de "Ajustes retroativos", na sincronização que inclui apontamentos.
- **Frequência:** a comparação completa (todas as empresas, 12 meses) roda uma vez por dia, na primeira sincronização com apontamentos depois das 6h (P3). Nas demais sincronizações do dia, a etapa só faz o fechamento em sombra dos meses que o legado fechou desde a última rodada.
- **Desligar:** a etapa tem a mesma chave de ligar e desligar das outras (`TabelasSync.modoSombra`, padrão: ligada).

### 8.3 Recalcular uma empresa

- **Rota:** `POST /api/comparacao/recalcular { empresaId }`, com permissão `bancos_horas_comparacao` `edit`, pela mesma autenticação das rotas do Saldo Parcial (`exigirPermissao`).
- **Execução:** responde 202 na hora e roda em segundo plano, porque a Cloudflare corta requisições com mais de 100 s.
- **Retorno à tela:** a tela recarrega ao ver `calculado_em` mudar.

### 8.4 Publicação

- **Como entra:** o sync-api é publicado pelo usuário no servidor Windows, como nas Fases anteriores.
- **Sem a publicação:** a tela abre vazia, com a mensagem de que a rotina ainda não rodou.

---

## 9. Tela, permissão e menu

| Item     | Valor                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------- |
| Chave    | `bancos_horas_comparacao` (view: ver; edit: Recalcular e validar)                                  |
| Rota     | `/admin/comparacao-bancos-horas`                                                                   |
| Menu     | Banco de Horas, depois de Controle (`config/menuPadrao.ts`)                                        |
| Textos   | pt-BR, en e es, em `src/i18n/locales/fase3/<lang>/comparacao.ts`, mesmo padrão das telas da Fase 3 |
| Exportar | Excel e PDF da lista e do mês a mês (`exportarTabela`)                                             |

O JSX do protótipo vai para `src/pages/admin/ComparacaoBancosHoras.tsx`, e o protótipo e o mock são apagados.

---

## 10. Sequência de entrega (TDD)

| #   | Entrega                                                                                                                                   | Teste                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1   | `comparacao.ts`, puro: leitura do `snapshot_calculo`, comparação do mês, motivos dos itens, origem do saldo, situação do mês e da empresa | Vitest                                   |
| 2   | Migration 24, `fase4_comparacao.sql`: as tabelas da seção 5, RLS, `validar_comparacao`, tela e permissões                                 | `fase4_01_comparacao.test.sql`           |
| 3   | Migration 25, `fase4_reajustes_legado.sql`: carga de todos os reajustes e espelho (seção 6)                                               | `fase4_02_reajustes.test.sql`            |
| 4   | `sombra.ts`: empresas em Legado, fechamento em sombra (seção 7), comparação e gravação; repositório com as leituras do legado             | Vitest com o fake do Supabase em memória |
| 5   | sync-api: pacote, etapa no orquestrador e rota de recalcular                                                                              | Vitest do sync-api                       |
| 6   | Service, hook e tela, com i18n                                                                                                            | Vitest                                   |
| 7   | Tipos do Supabase regerados                                                                                                               | `npm run typecheck:ci`                   |

Antes do PR: `npm run test:ci`, `npm run typecheck:ci`, `npm run lint` e `npm run build`.

---

## 11. Riscos

| Risco                                                               | Mitigação                                                                                                                        |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Poucos meses com fechamento do legado (a quarentena é recente)      | Consulta de conferência abaixo, antes de implementar. Se houver poucos meses, a tela mostra quantos foram comparados por empresa |
| Rotina pesada (cerca de 190 empresas × 12 meses)                    | Uma rodada completa por dia, repositório com cache por empresa e fechamentos congelados reduzindo o cálculo com o tempo          |
| Fechamento em sombra com regra de contagem ou de-para ainda errados | Retificação pelo legado grava nova versão. Antes da liberação (Fase 5), uma retificação manual pela tela nova corrige            |
| Validação antiga depois de mudança de cadastro                      | A validação cai sozinha na próxima divergência (3.5)                                                                             |

**Conferência para rodar no SQL Editor (só leitura):**

```sql
SELECT count(DISTINCT empresa_id) AS empresas,
       count(*) AS meses_fechados,
       min(make_date(ano, mes, 1)) AS primeiro_mes,
       max(make_date(ano, mes, 1)) AS ultimo_mes
FROM banco_horas_fechamentos
WHERE make_date(ano, mes, 1) >= date_trunc('month', now()) - interval '12 months';
```

---

## 12. Perguntas decididas em 28/10/2026

| #   | Pergunta                                                                                                                                   | Decisão                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| P1  | Espelhar os reajustes do legado no modelo novo (carga + gatilho enquanto a empresa estiver em Legado)?                                     | **Sim, com todos os reajustes desde o primeiro**, não só os dos últimos 12 meses (seção 6) |
| P2  | Para empresa de 1 banco, o critério é consumo, requerimentos, reajustes, saldo, repasse e excedente, com o valor a faturar só informativo? | **Sim** (3.1)                                                                              |
| P3  | A comparação completa roda uma vez por dia, na primeira sincronização depois das 6h?                                                       | **Sim** (8.2)                                                                              |
| P4  | Empresa sem fechamento do legado nos últimos 12 meses fica fora da tela?                                                                   | **Sim**; a contagem aparece na exportação                                                  |
| P5  | O fechamento em sombra vale só para os meses que o legado fechar depois da ativação?                                                       | **Sim**; os meses anteriores são comparados com o cálculo na hora (7.1)                    |
