# Modelagem da Fase 2: motor novo de bancos de horas

Versão 0.2, 15/10/2026. Decisões de arquitetura A1 a A4 e perguntas Q1 a Q8 (seção 9) aprovadas pelo Willian, conforme as propostas.

Base: Especificação v2.0 (seções 3, 4, 8 e Anexo A), Inventário (seção 6, regras RC-xx), `Decisoes_Negocio_Bancos_de_Horas.md`, `Modelagem_Fase1.md` e consultas somente leitura ao books-qualidade em 15/10/2026.

---

## 1. O que a Fase 2 entrega

| Entra                                                                                                                                                             | Fica para depois                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Regra única de consumo** (função SQL): apontamentos, tickets e requerimentos que contam no banco, já somados                                                    | Detecção de ajustes retroativos e tela de aprovação (Fase 3)                                             |
| **Classificador**: cada apontamento, ticket e requerimento vai para exatamente um banco (RN-02 a RN-06)                                                           | Comparação Legado x Novo e modo sombra (Fase 4)                                                          |
| **Cálculo por banco**: saldo, repasse, fim de período, repasse por período, excedente e valor a faturar                                                           | Saldo Parcial novo e snapshot do Book por banco (Fase 5)                                                 |
| **Consumo entre bancos** no fechamento do período (RN-17 a RN-26)                                                                                                 | Telas (Fase 3)                                                                                           |
| Tabelas que o motor lê e grava: códigos de resolução, reajustes, observações, ajuste do banco do requerimento, fechamentos (com versões e itens) e transferências | Ligação com a geração do Book (Fase 4/5): na Fase 2 o fechamento existe como função, mas ninguém a chama |

Durante a Fase 2, **nenhuma tela e nenhum comportamento atual muda**. O motor novo só é exercitado pelos testes.

### Decisões de arquitetura (15/10/2026)

| #   | Decisão                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | **SQL soma, TypeScript calcula.** A regra de consumo é uma função SQL que aplica os filtros, o fuso de Brasília e as organizações do Aranda, e devolve tudo somado por grupo e item de configuração. Classificação e cálculo são funções TypeScript puras, testadas no Vitest e reaproveitadas pelo sync-api pelo pacote `vendor/`, como o Saldo Parcial e a geração de Books já são hoje. |
| A2  | **Mês aberto é calculado na hora; o resultado só é gravado no fechamento.** Não há `bancos_horas_calculos` para meses abertos: eles nunca ficam desatualizados, e o botão Recalcular deixa de existir (resolve RC-101 a RC-106, RC-113 e RC-175). Na 1ª geração do Book o resultado é congelado. A retificação grava uma nova versão (D-05, D-09, D-11).                                   |
| A3  | **Duração do apontamento = `tempo_gasto_minutos`** (o valor real). O texto `tempo_gasto_horas` perde os dias inteiros acima de 24 h (121:30 vira "01:30"), e o motor atual usa esse texto. Apontamentos longos, mesmo que errados, são aceitos: o chamado já está fechado e não há como ajustar. Ver a seção 8.                                                                            |
| A4  | **Escopo:** motor e as tabelas que ele usa (tabela da seção 1).                                                                                                                                                                                                                                                                                                                            |

---

## 2. Visão geral do fluxo

```
calcularEmpresa(empresa, mes, ano)
  1. carregar bancos, escopos, de-para, históricos, reajustes, fechamentos      (repositório)
  2. para cada janela distinta de apuração dos bancos:
       consumo = rpc bancos_horas_consumo(empresa, início, fim)                 (SQL, A1)
  3. requerimentos = rpc bancos_horas_requerimentos(empresa, mes, ano)          (SQL)
  4. classificar cada linha → banco                                              (TS puro)
  5. para cada banco: cadeia de meses desde o início do ciclo, ou desde o
     último mês fechado (usa o resultado congelado), até o mês pedido            (TS puro)
  6. se o mês é fim de período: consumo entre bancos, depois a regra de fim      (TS puro)
     de período de cada banco
  7. devolve o resultado por banco (nada é gravado)
fecharMes(empresa, mes, ano)  →  calcularEmpresa + rpc bancos_horas_registrar_fechamento(jsonb)
```

**Mês fechado** devolve sempre o resultado congelado da versão vigente, sem recalcular. Reajustes, baselines e percentuais alterados depois do fechamento ficam **pendentes de retificação** (D-05). A cadeia dos meses abertos seguintes parte do repasse congelado.

---

## 3. Regra única de consumo (SQL)

### 3.1 `bancos_horas_consumo(p_empresa_id, p_inicio, p_fim)`

Devolve uma linha por `(fonte, grupo, item_configuracao)`, com `minutos` e `tickets`. As bordas chegam como `timestamptz` montado em America/Sao_Paulo (D-16).

| Fonte                                   | Filtros (iguais ao motor atual, RC-61 a RC-65)                                                                                                                            | Mudanças                                                                                                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apontamentos (`apontamentos_aranda`)    | `ativi_interna = 'Não'`; item ≠ `000000 - PROJETOS APL`; tipo IM, RF ou PM; `caso_grupo` nos 4 padrões AMS; `cod_resolucao` na lista de horas; `data_atividade` na janela | Organização por `empresas_organizacoes_aranda`, com igualdade sem diferenciar maiúsculas (sem curinga, RC-60). Duração = `tempo_gasto_minutos` (A3). Soma no SQL: sem limite de linhas (RC-69). |
| Tickets (`apontamentos_tickets_aranda`) | `status = 'Closed'`; `data_fechamento` na janela; item ≠ PROJETOS APL; `nome_grupo` nos 4 padrões; `cod_resolucao` na lista de tickets                                    | Mesma organização. Conta tickets distintos por `nro_solicitacao` (RC-52; hoje não há duplicados).                                                                                               |

Os dados dispensam três decisões do Inventário (consulta de 15/10/2026, últimos 12 meses):

- não há item de configuração nulo em apontamentos nem em tickets AMS (RC-61);
- não há ticket duplicado (RC-52);
- não há minuto fracionário nem texto com segundos (RC-41).

### 3.2 `bancos_horas_requerimentos(p_empresa_id, p_mes, p_ano)`

Devolve uma linha por requerimento que desconta do banco (RC-66, D-01):

- tipo de cobrança "Banco de Horas", com `enviado_faturamento` verdadeiro;
- status `enviado_faturamento` ou `faturado`;
- mês de cobrança igual ao mês calculado (mês civil, sem janela customizada);
- `minutos = round((horas_funcional + horas_tecnico) × 60)`, sem as horas de gestor;
- `tickets = quantidade_tickets`.

A linha também traz o produto e o módulo (pela `modulos_requerimento_produto`) e o banco ajustado manualmente, se houver (`requerimentos_bancos`).

### 3.3 Códigos de resolução: tabela de domínio

**`codigos_resolucao_banco`**: `codigo` (text PK, valor exato), `conta_horas` (bool) e `conta_tickets` (bool). A carga traz a lista canônica (RC-65): 48 códigos para horas e 47 para tickets. As variações de espaço ("Banco=S |SLA=N" e "Banco=S| SLA=N") são valores distintos e continuam como estão. A lista substitui os 9 arrays copiados no código atual.

---

## 4. Classificador (TypeScript puro)

Para cada linha (grupo, item de configuração; ou módulo do requerimento):

1. **De-para:** `grupos_aranda` pelo grupo, sem diferenciar maiúsculas, dá o produto e o módulo. Grupo sem de-para, ou com classificação `nao_se_aplica`, não tem produto.
2. **Bancos candidatos:** ativos, não padrão, com `inicio_vigencia <= mês`, na **ordem** do cadastro (RN-06).
3. **Primeiro banco que atende:**
   - escopo: o banco cobre o produto inteiro ou aquele módulo; se o banco não tem escopo, cobre qualquer item;
   - filtro avançado, se houver: o item de configuração contém o valor, ou é igual a ele, sem diferenciar maiúsculas.
4. **Nenhum atende:** a linha vai para o **Banco padrão** (RN-04).

Requerimento com banco ajustado manualmente vai direto para esse banco (RN-09).

Hoje, 5 grupos de apontamentos e 8 de tickets dos últimos 12 meses não têm de-para. Eles vão para o Banco padrão, e a aba "Grupos não mapeados" (CA-03) é da Fase 3.

---

## 5. Cálculo por banco (TypeScript puro)

Tudo em minutos inteiros (horas) e inteiros (tickets). Os campos espelham os do legado (RC-100), para a comparação da Fase 4.

| Passo               | Regra                                                                                                                                                                                                                                                                                                                                                    | Ref.                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Janela do mês       | `dia_inicio_apuracao` > 1: do dia início de M até o dia fim de M+1. Senão, mês civil. Vale só para apontamentos e tickets.                                                                                                                                                                                                                               | RC-05               |
| Baseline            | Vigência ativa no dia 1 do mês. Crédito anual: só no mês de `data_inicio`, todo ano. Vigência sem valor = 0 (não volta ao cadastro).                                                                                                                                                                                                                     | RC-06, RC-08, RC-09 |
| Repasse anterior    | Repasse de M-1 calculado na mesma cadeia, ou congelado se M-1 está fechado. É 0 no 1º mês da vigência e depois de um fim de período.                                                                                                                                                                                                                     | RC-22               |
| Reajustes           | Entradas e saídas ativas do mês, do banco.                                                                                                                                                                                                                                                                                                               | RC-24 a RC-26       |
| Contrato "ambos"    | Horas: consumo de chamados = 0 (só requerimentos e reajustes); tickets: normal.                                                                                                                                                                                                                                                                          | D-02                |
| Saldo               | baseline + repasse anterior − (consumo + requerimentos + saídas − entradas).                                                                                                                                                                                                                                                                             | RC-21, RC-27        |
| Mês normal          | Saldo positivo: repassa o % mensal (horas arredondadas ao minuto; tickets arredondados para baixo). Saldo negativo: repassa 100%.                                                                                                                                                                                                                        | RC-29, RC-56        |
| Fim de período      | `(meses desde a vigência + 1) % periodo_apuracao = 0`. Saldo positivo zera; saldo negativo vira excedente.                                                                                                                                                                                                                                               | RC-28, RC-30        |
| Repasse por período | Posição = (meses desde a vigência) mod (duração × períodos). Último mês de um subperíodo: % entre períodos; dentro dele: % dentro. Na zeragem, saldo negativo **vira excedente** (corrige RC-164). Sem o ajuste "−12" (corrige RC-165).                                                                                                                  | RC-32               |
| Excedente           | Quantidade = saldo negativo sem o sinal. Horas × taxa hora e tickets × taxa ticket, arredondados a 2 casas.                                                                                                                                                                                                                                              | RC-34, RC-57, RC-76 |
| Taxa                | `taxas_clientes` do cliente, com `tipo_produto` = `taxa_produto` do banco e o `vigencia_inicio` mais recente até o dia 1 do mês. A hora usa `taxa_tipo_hora`: excedente (RC-72) ou normal (valor base Funcional, 9.3-1b). O ticket usa a cadeia RC-73. "Ambos" usa a taxa do ticket para tickets (corrige RC-74). Sem taxa: excedente com R$ 0 e alerta. | RC-71 a RC-77       |
| Antes da vigência   | O banco não existe: nenhuma linha é classificada nele (vai para o padrão) e não há resultado.                                                                                                                                                                                                                                                            | RC-38               |

### 5.1 Consumo entre bancos (no fim de período)

O cálculo roda depois do saldo de todos os bancos no mês de fechamento e antes da regra de fim de período de cada um (RN-23):

1. **Bancos que consomem:** têm `consome_outros_bancos`, saldo negativo e o mês é o fim de período deles. São atendidos na ordem do cadastro (RN-21).
2. **Bancos que cedem:** ativos, da mesma empresa, com o mesmo tipo de contrato e o mesmo período de apuração, fechando no mesmo mês, com saldo positivo. São usados na ordem do cadastro (RN-19, RN-20, 9.3-6).
3. **Quanto cede:** cada banco cede no máximo o seu saldo positivo, e o saldo dele nunca fica negativo. A unidade é a do contrato: horas com horas, tickets com tickets. Em "ambos", as duas unidades são tratadas em separado.
4. **Registro:** cada movimentação vira uma transferência. A observação automática é gerada nos dois bancos (RN-24): "06:30 horas consumidas do Banco FISCAL" e "06:30 horas cedidas ao banco FISCAL – e-DOCS".
5. **Excedente:** fica só o que não foi coberto (RN-22).

O caso 8.3 da spec (três cenários) vira teste de aceite.

### 5.2 Banco padrão interno (9.3-1)

O Banco padrão interno não precisa de código especial. É um banco com baseline 0 e `visivel_cliente = false`: o saldo negativo acumula com repasse de 100% e vira excedente no fim do período, pela taxa escolhida no banco. A visibilidade só importa no Book e no Saldo Parcial (Fase 5).

---

## 6. Tabelas novas

Os padrões são os da Fase 1:

- RLS por `has_screen_permission`;
- autoria por gatilho e auditoria genérica;
- `ON DELETE RESTRICT`;
- exclusão lógica.

| Tabela                          | Conteúdo                                                                                                                                                                                  | Regras principais                                                                                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codigos_resolucao_banco`       | Domínio dos códigos que contam (3.3)                                                                                                                                                      | Leitura para qualquer autenticado. Escrita só por migration nesta versão (Q6).                                                                                             |
| `bancos_horas_reajustes`        | banco_id, mes, ano, tipo (`entrada` ou `saida`), minutos, tickets, justificativa, ativo e inativação                                                                                      | Só `entrada`/`saida` (sem os tipos legados). Desativar é lógico e registrado. Em mês fechado, fica pendente até a retificação (D-05).                                      |
| `bancos_horas_observacoes`      | banco_id, mes, ano, texto, origem (`manual`, `ajuste`, `consumo_entre_bancos`, `faturamento`), ativo                                                                                      | Manual: só o autor ou administrador edita ou inativa (D-06). Automática: não editável (RN-24). Ao cliente vai só o texto (D-08).                                           |
| `requerimentos_bancos`          | requerimento_id (PK, FK `requerimentos`), banco_id, motivo e quem ajustou                                                                                                                 | **Só os ajustes manuais.** A classificação automática é calculada (seção 4). Mês fechado não muda (CA-20).                                                                 |
| `bancos_horas_fechamentos`      | banco_id, mes, ano, **versao**, `vigente`, motivo (`geracao_book` ou `retificacao`), todos os campos do resultado (seção 5), parâmetros usados (baseline, %, taxa) e quem fechou e quando | UQ (banco, mes, ano) WHERE vigente. Versões anteriores nunca são apagadas. Substitui `banco_horas_calculos` + `banco_horas_versoes` + `banco_horas_fechamentos` do legado. |
| `bancos_horas_fechamento_itens` | fechamento_id, tipo (`apontamento`, `ticket`, `requerimento` ou `reajuste`), item_id, minutos, tickets                                                                                    | O snapshot do que entrou. Base da detecção de retroativos (Fase 3) e da regra "reajuste pendente".                                                                         |
| `bancos_horas_transferencias`   | fechamento do banco que consome, fechamento do banco que cede, unidade (`horas` ou `tickets`), quantidade                                                                                 | Gravadas com os fechamentos do mesmo mês (RN-26: congeladas após o fechamento).                                                                                            |

**Gravação do fechamento:** a função `bancos_horas_registrar_fechamento(jsonb)` grava numa transação só todos os bancos da empresa no mês, com itens, transferências e observações automáticas. Ela recusa gravar se já existe versão vigente e o motivo não é retificação (D-11). Na retificação, a versão anterior deixa de ser a vigente.

**Telas e permissões** (registradas agora, telas na Fase 3):

- `bancos_horas_controle`: Edição permite criar e inativar reajustes e observações e ajustar o banco de um requerimento.
- O fechamento e a retificação usam a permissão da tela Geração de Books (`geracao_books`), que é quem os dispara.

---

## 7. Arquivos e sequência de entrega (TDD)

Todos os passos foram entregues em 15/10/2026, na branch `feat/bancos-horas-fase-2`. As migrations foram aplicadas pelo Willian no SQL Editor, com os testes verdes.

| #   | Entrega                                                                                                                                                         | Teste                                                                                                                            | Situação              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | `src/services/bancosHoras/calculo.ts` e `vigencias.ts`: cadeia mensal, repasse, fim de período, por período, excedente, baseline e percentual do mês            | Vitest                                                                                                                           | Feito                 |
| 2   | `consumoEntreBancos.ts`                                                                                                                                         | Vitest com o caso 8.3 da spec e as RN-17 a RN-24                                                                                 | Feito                 |
| 3   | `classificacao.ts`                                                                                                                                              | Vitest com o caso 8.1 da spec, ANGLO (filtro) e as RN-03 a RN-06                                                                 | Feito                 |
| 4   | `20261015000007_fase2_tabelas.sql`: tabelas da seção 6, RLS, auditoria, carga dos códigos, regra Q3                                                             | `supabase/tests/fase2_01_tabelas.test.sql`                                                                                       | Aplicada; teste verde |
| 5   | `20261015000008_fase2_consumo.sql`: as funções da seção 3                                                                                                       | `fase2_02_consumo.test.sql`, com a equivalência com o motor atual nas 140 empresas com banco, de jul a set/2026, sem divergência | Aplicada; teste verde |
| 6   | `taxas.ts`, `motorBancosHoras.ts` (orquestração, seção 2) e `repositorioSupabase.ts`                                                                            | Vitest; o repositório com o fake do Supabase em memória                                                                          | Feito                 |
| 7   | `20261015000009_fase2_fechamento.sql` (`bancos_horas_registrar_fechamento` e leitura dos bancos por quem vê o Controle ou a Geração de Books) e `fechamento.ts` | `fase2_03_fechamento.test.sql` e Vitest                                                                                          | Aplicada; teste verde |
| 8   | Tipos do Supabase regerados                                                                                                                                     | `npm run typecheck` (os mesmos 333 erros preexistentes) e build                                                                  | Feito                 |

Os tipos do motor ficam nos próprios módulos de `src/services/bancosHoras/`, que formam uma biblioteca de domínio sem dependência de tela. Eles vão para `src/types/bancosHoras.ts` quando os hooks e as telas da Fase 3 passarem a usá-los.

Ainda não ligado: ninguém chama `fecharMes` nem o motor fora dos testes. A ligação com a geração do Book e com o modo sombra é das Fases 4 e 5.

---

## 8. Diferenças esperadas em relação ao legado

A comparação da Fase 4 (CA-06) vai encontrar estas diferenças, todas intencionais:

| Diferença                                                      | Onde aparece                                                                                                                                                                   | Origem |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Apontamentos acima de 24 h passam a contar inteiros            | Nos últimos 12 meses, 4 apontamentos com código válido: CPFL (+1.104 h, fev/2026), ABBOTT (+600 h, fev/2026), GERDAU (+192 h, fev/2026) e SONDA PROCWORK (+10.000 h, ago/2026) | A3     |
| Taxa do ticket em contrato "ambos"                             | EXXONMOBIL                                                                                                                                                                     | RC-74  |
| Taxa escolhida pelo produto do banco                           | 5 clientes têm taxas de dois produtos e hoje pegam a mais recente de qualquer um                                                                                               | RC-71  |
| Taxa média (modo "média") arredondada a 2 casas                | Centavos no valor do excedente das taxas em modo média; a taxa exibida passa a ser a usada                                                                                     | RC-72  |
| Repasse por período: zeragem com saldo negativo gera excedente | TK ELEVADORES                                                                                                                                                                  | RC-164 |
| Baseline de vigência sem valor = 0                             | Contratos de um tipo só, com histórico parcial                                                                                                                                 | RC-08  |
| Organização por igualdade (sem curinga `_`/`%`)                | Nomes com `_` ou `%`                                                                                                                                                           | RC-60  |

Os meses já fechados no legado não mudam. Para a empresa, o modelo novo só vale a partir da liberação (Fase 5).

---

## 9. Perguntas decididas (15/10/2026, todas conforme a proposta)

| #   | Pergunta                                                                                                         | Decisão                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Os tickets são classificados pelo mesmo de-para dos apontamentos (`nome_grupo` → `grupos_aranda`)?               | **Sim**, catálogo único de grupos.                                                                                              |
| Q2  | Banco não padrão **sem escopo** e com filtro avançado (ANGLO "NIQUEL") cobre qualquer produto?                   | **Sim.** E banco não padrão sem escopo e sem filtro passa a ser recusado (capturaria tudo).                                     |
| Q3  | No repasse por período, o período de apuração deve ser igual a duração × períodos até zerar?                     | **Sim, validado no cadastro.** Assim há uma fonte só para o fim do ciclo (RC-33). TK ELEVADORES já atende (6 = 3 × 2).          |
| Q4  | Requerimentos e reajustes seguem o mês civil, mesmo em banco com janela customizada (SAMARCO, 16 a 15)?          | **Sim, como hoje.** O requerimento é cobrado por mês, e o reajuste é lançado no mês.                                            |
| Q5  | Na taxa, o `vigencia_fim` vencido continua sendo ignorado?                                                       | **Sim, como hoje**, para não ficar sem taxa. A tela de Controle (Fase 3) avisa quando a taxa usada está vencida.                |
| Q6  | A lista de códigos de resolução ganha tela de edição?                                                            | **Não nesta versão.** É mantida por migration; uma tela pode vir junto com o De-para (Fase 3), se houver demanda.               |
| Q7  | Mudar baseline, % de repasse, taxa ou escopo depois do fechamento: fica pendente de retificação como o reajuste? | **Sim.** O mês fechado é congelado por inteiro (resultado e parâmetros). Qualquer mudança só vale na retificação (D-05, RN-12). |
| Q8  | Requerimentos "em desenvolvimento" (informativos, RC-67) entram no motor?                                        | **Não.** Eles não descontam; a regra única de exibição fica com a tela e o Book (Fases 3 e 5).                                  |
