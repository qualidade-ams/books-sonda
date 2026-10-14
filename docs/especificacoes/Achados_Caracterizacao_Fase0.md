# Achados dos testes de caracterização — Fase 0

Data: 14/10/2026. Complementa o *Inventário de Regras e Funcionalidades Atuais* (v1.0) e deve ser incorporado à próxima versão dele.

Os testes de caracterização registram o comportamento **atual** do banco de horas como linha de base para a comparação Legado x Novo. Aqui estão só os pontos em que o código **diverge** do Inventário ou que o Inventário **não descreve**. O que o Inventário já descreve corretamente está nos testes, com o código RC/RB/RO no nome.

| Teste | Escopo | Testes |
|---|---|---|
| `src/services/__tests__/bancoHorasService.caracterizacao.test.ts` | Motor (`calcularMes`) | 25 |
| `src/services/__tests__/bancoHorasIntegracaoService.caracterizacao.test.ts` | Regra de consumo do motor (A, T-A, requerimentos) | 12 |
| `src/services/__tests__/booksDataCollectorService.caracterizacao.test.ts` | Book (H, I, T-H, T-I, RC-146, RB-08, RC-148) | 32 |
| `src/utils/__tests__/excelConsumo.caracterizacao.test.ts` | Excel (E, F, T-F, RB-08) | 34 |
| `src/services/__tests__/bancoHorasTableService.caracterizacao.test.ts` | Tabela/imagem do banco de horas nos e-mails | 35 |
| `src/services/__tests__/bancoHorasQuarentenaService.caracterizacao.test.ts` | Fechamento, snapshot e extemporâneos (B, C, T-B, RO-25, RO-32) | 28 |
| `src/test/fakes/__tests__/supabaseEmMemoria.test.ts` | Supabase em memória usado pelos testes | 6 |

## Divergências em relação ao Inventário

| Ref. Inventário | O que o Inventário diz | O que o código faz |
|---|---|---|
| RC-111 / RC-112 / RC-141 / RC-148 | O recálculo em memória é da tabela do e-mail de **Saldo Parcial** | O recálculo (`buscarDadosEGerarTabelaBancoHoras`) alimenta a **imagem do e-mail do Book** (`gerarImagemBancoHoras` → `booksDisparoService`). O e-mail de Saldo Parcial usa só os geradores puros de HTML, com os cálculos da tela. |
| RC-111 | Recalcula "meses anteriores" ao de referência | Recalcula **todos os meses do período menos o de referência**, inclusive os **posteriores**, e grava todos eles. |
| RC-141 | O e-mail não trata negativo = 100% | O recálculo **já repassa 100% do déficit**, como o motor. A divergência real é a falta do fim de período especial e do repasse especial: os campos de repasse especial nem são lidos. |
| RO-17 | As observações de ajuste também aparecem no e-mail | Só no gerador puro (Saldo Parcial). No fluxo do Book, elas são buscadas e descartadas (o que bate com a regra atual do Book). |
| RC-148 (Book) | Fallback `?? 50` | É `\|\| 50` em `gerarDadosConsumoSegmentado`: um percentual **0% cadastrado também vira 50%**. |
| Matriz 8.1-H/I | Janela de dia 1 a antes do dia 1 do mês seguinte | Vale para H e I. T-H e T-I usam de dia 1 até o último dia às 23:59:59.999. |
| Matriz 8.2-T-H | 47 códigos, iguais aos de H | São 47 códigos, mas a lista **não é a de H**: tem "Alocação T&M" e não tem "Nota Publicada (Banco=S\| SLA=N)". É idêntica à lista de tickets do motor. |
| Matriz 8.2-T-F | Filtro de códigos em JS depois do limite (como E e F) | T-F filtra os códigos **na consulta**. E e F filtram em JS depois do `limit(10000)`. |
| RC-146 | Book desconta status `concluido` | O CHECK `valid_status` de `requerimentos` só aceita `lancado`, `enviado_faturamento` e `faturado`. A única diferença real em relação ao motor é a falta do filtro `enviado_faturamento = true`. |

## Comportamentos não descritos no Inventário

### Consumo e cálculo
- **O Book ignora `tempo_gasto_minutos`** (cópias H e I). Um apontamento só com minutos vale 0 hora no Book, mas conta no motor, que usa minutos quando falta `tempo_gasto_horas`.
- **Contrato com tipo não reconhecido** (ex.: nulo): o Book não faz nenhuma consulta de consumo e mostra "00:00:00" como horas.
- **Baseline fracionado no Book segmentado:** 10,5 h vira 10 h, porque o decimal é lido como "HH:MM".
- **Requerimentos do segmento** (Book segmentado): status `enviado_faturamento`, `faturado`, `concluido` e `em_desenvolvimento`, sem filtro de `tipo_cobranca` nem de `enviado_faturamento`.
- **Requerimentos descontados no Book:** `valor_total` sai 0 quando falta o valor funcional ou o técnico (o código usa `&&`), e `tickets` é sempre 0.
- **Horas ou tickets na tabela/imagem do e-mail:** a escolha é feita por `tipo_cobranca` (padrão `banco_horas`), não por `tipo_contrato`. Um contrato "tickets" com o valor padrão sai em horas. A detecção completa de retroativos usa o mesmo critério e só detecta tickets quando `tipo_cobranca = 'ticket'`.
- **Repasse de tickets no recálculo do e-mail:** usa `Math.round` (5 × 50% = 3), enquanto o motor grava 2 (RC-56/RC-177).

### Fechamento e ajustes retroativos
- **`aprovarAjuste` ignora `mesAplicacao`/`anoAplicacao`** recebidos e grava sempre o mês de referência.
- **Ajuste de tickets aprovado com `valor_novo = "0"`:** o snapshot mantém o valor anterior, porque o código faz `parseInt("0") || anterior`.

### Excel
- **Empresa sem `nome_completo`:**
  - E gera a planilha vazia sem avisar;
  - F e T-F buscam no Aranda pelo nome recebido (o abreviado), o que pode trazer dados errados;
  - o motor dá erro (`NOME_COMPLETO_MISSING`).
- **Dia de fim que não existe no mês:** a data avança para o mês seguinte. Com início no dia 30 de janeiro, o fim vira 01/03 (E e F).
- **Tipo de contrato:** o `tipoContrato` passado por parâmetro prevalece sobre o do cadastro.
- **Aba Tickets:** as colunas ANALISTA e RESPONSÁVEL PELO CHAMADO repetem `nome_responsavel`, e a aba não tem linha de total.

### Formatação
- **Zero com dois formatos na mesma tabela:** o valor recalculado sai "0:00" e aparece em **verde**; o valor zerado ou de fim de período sai "00:00" e aparece neutro (ver BUG-18).

## Fuso das bordas do mês (D-16)

O dado gravado está correto em America/Sao_Paulo. O erro é a borda do mês usada por cada cópia: os Excels usam UTC. A medição está em `Decisoes_Negocio_Bancos_de_Horas.md`.

## Código que usa objetos inexistentes no banco (revelado pelo types.ts regerado)

O `types.ts` gerado do banco real em 14/10/2026 mostra três usos de objetos que não existem. Os três foram confirmados por consulta ao catálogo:

| Objeto | Onde o código usa | Efeito hoje |
|---|---|---|
| Função `force_recalculate_banco_horas` | `BotaoForcarRecalculo.tsx` | O botão "Forçar recálculo" sempre falha (já registrado no Inventário, achado 9). |
| Função `get_users_by_ids` | `requerimentosService.ts`, busca do nome do autor | A chamada falha e só gera `console.error`. Os nomes não encontrados em `profiles` ficam sem nome. |
| Coluna `banco_horas_calculos.versao` | `bancoHorasVersionamentoService.ts` | Leitura sempre `undefined` (o Inventário registra que a coluna não existe, mas não o uso no service). |

Os outros 23 erros de tipo novos são de tipagem (union literal × string, Json × array) e não indicam diferença de comportamento.
