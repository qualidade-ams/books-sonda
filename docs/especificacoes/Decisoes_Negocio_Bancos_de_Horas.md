# Decisões de negócio — Múltiplos Bancos de Horas

Registro das decisões D-01 a D-16 (Inventário de Regras e Funcionalidades Atuais, seção 3) e dos pontos em aberto da Especificação v2.0 (seção 9.3). Precisam estar fechadas antes da Fase 2 (motor novo).

Decidido por: Willian Faria.

| Código | Ponto | Comportamento atual | Decisão | Data |
|---|---|---|---|---|
| D-01 | Horas de gestor nos requerimentos | Só horas funcional + técnico descontam do banco; horas de gestor são ignoradas (RC-184). | **Manter.** Horas de gestor não descontam do banco. | 14/10/2026 |
| D-02 | Contrato "ambos" (horas + tickets) | Na visão de horas, o consumo de chamados é zerado; o saldo de horas só se move por requerimentos e reajustes. Na visão de tickets, os tickets contam normalmente (RC-04). | **Manter.** Horas = requerimentos e reajustes; tickets = chamados. A separação horas/tickets continua dentro do banco. | 14/10/2026 |
| D-03 | Repasse especial simples | Calculado no fim do período, mas descartado pelo mês seguinte, sem efeito (RC-31, RC-163). Nenhuma empresa usa. | **Descartar.** O sistema novo só oferece o repasse especial "por período". | 14/10/2026 |
| D-04 | Percentual de repasse não informado | Assume 100%, 50% ou 0% conforme a cópia da regra; 0% informado é tratado como ausente (RC-10, RC-166). | **Obrigatório, sem padrão.** O % de repasse é obrigatório no histórico de cada banco; 0% é sempre respeitado. Na carga inicial, cada banco recebe o % vigente da empresa. | 14/10/2026 |
| D-05 | Reajuste em período fechado ou mês futuro | Permitido sem restrição; só valida mês 1–12 e ano ≥ 2020 (RO-07). | **Permitido em mês aberto, futuro ou fechado.** Em mês fechado, o reajuste fica registrado, mas só é contabilizado quando o Book do mês for retificado. A retificação recalcula o mês e os meses seguintes dentro do mesmo período de apuração (ex.: até o fim do trimestre ou semestre). Books já enviados desses meses seguintes ficam marcados como "precisa retificação". Se o período já estiver encerrado, a retificação recalcula até o fim dele e, se o excedente mudar, a diferença aparece como alerta para o faturamento (cobrar ou estornar), sem afetar o período atual. | 14/10/2026 |
| D-06 | Edição e exclusão de observações | Qualquer usuário edita ou exclui observação de qualquer autor; exclusão física, sem trilha (RO-16). | **Só o autor ou administrador** edita ou exclui; exclusão lógica, registrada na auditoria. | 14/10/2026 |
| D-07 | Observações de ajuste no Book | Manuais aparecem em todos os canais; as de ajuste aparecem na tela e no Saldo Parcial, mas não no Book (RO-17). | **Ajuste em todos os canais.** Observações manuais e de ajuste aparecem na tela, no Saldo Parcial e no Book. | 14/10/2026 |
| D-08 | Nome do usuário Sonda nas observações enviadas ao cliente | O e-mail de Saldo Parcial exibe o nome do autor (RS-14). | **Só o texto.** Book e e-mails mostram data e texto, sem o nome do autor; o autor continua visível internamente. | 14/10/2026 |
| D-09 | Aprovação de ajuste retroativo | A tela promete "gerar reajuste", mas o sistema incorpora no mês de referência e apaga o cálculo e a trilha (RO-32). | **Mesma regra do D-05:** a aprovação fica registrada, mas só é contabilizada quando o Book do mês for retificado. A retificação recalcula o mês e os meses seguintes dentro do mesmo período de apuração. Nada é apagado (nova versão). | 14/10/2026 |
| D-10 | Janela de detecção de retroativos | Só o mês atual e o anterior (RO-30). | **Período de apuração aberto:** detecta em todos os meses fechados do período de apuração corrente de cada banco. | 14/10/2026 |
| D-11 | Fechamento do período | Acontece ao gerar o Book; regenerar reabre e fecha de novo; a geração automática força isso a cada ciclo (RO-25). | **Fecha na primeira geração do Book; regerar não reabre** (usa o snapshot). A única forma de reabrir é a retificação do Book, ação explícita que aplica reajustes e retroativos pendentes (D-05, D-09). | 14/10/2026 |
| D-12 | Vigência do contrato | Duas vigências com regras opostas: a do contrato (vigencia_inicial/final) controla disparo e inativação, e vazia exclui a empresa; a do banco (inicio_vigencia) controla a lista de Books, e vazia inclui (E-22). | **Contrato na empresa, ciclo no banco.** A vigência do contrato (início obrigatório, fim opcional) controla disparo, lista de Books e inativação. O início de vigência de cada banco só define os ciclos de apuração e não pode ser anterior ao início do contrato. | 14/10/2026 |
| D-13 | Status "Suspenso" da empresa | Sem efeito em contatos nem taxas; nenhuma empresa suspensa (E-35). | **Remover.** A empresa nova só tem Ativo e Inativo. A sincronização trata "suspenso" da tabela atual como inativo. | 14/10/2026 |
| D-14 | Exclusão de empresa | Exclusão física com cascata em 19 tabelas. | **Só inativação.** A tela nova não tem exclusão; FKs das tabelas novas com ON DELETE RESTRICT. | 14/10/2026 |
| D-15 | Empresas consolidadas | A consolidada não recebe Book próprio, mas seu banco não é somado ao da consolidadora (RB-34). | **Bancos da consolidada no Book da consolidadora.** Aparecem como seções adicionais (uma por banco, com o nome da empresa), sem somar os saldos. | 14/10/2026 |
| D-16 | Fuso horário das bordas do mês | O motor usa hora local, o Excel usa UTC e o sync grava sem fuso (diferença de até 3 h) (RC-70). | **America/Sao_Paulo** em todas as saídas (tela, Book, Excel, Saldo Parcial). Na Fase 0, medir com dados reais quantos apontamentos mudariam de mês. | 14/10/2026 |

## Decisões complementares

| Tema | Decisão | Data |
|---|---|---|
| Notificações do sino | Pendências passam a aparecer no sino do header, só para quem tem permissão de **Edição** na tela responsável (quem só visualiza não recebe). Eventos: book precisa de retificação (Geração de Books), ajuste retroativo pendente (Ajustes Retroativos), falha no Saldo Parcial (Envio de Saldo Parcial) e falha na geração automática de books (Geração de Books). Cada usuário marca como lida para si; a notificação é resolvida para todos quando a pendência é resolvida: a de retificação, quando o Book retificado é reenviado. As pendências que já existiam entram na carga inicial. Implementado na branch `feat/notificacoes-sino`, já no fluxo atual. | 14/10/2026 |
| Notificação "Grupo Aranda não mapeado" | Fica para a Fase 3, junto com a tela De-para de Grupos, que é a tela responsável por ela. | 14/10/2026 |
| Design system | O novo design system (com responsividade) é definido antes da Fase 3 e vale só para as telas novas; as telas atuais não são redesenhadas agora. | 14/10/2026 |

## Medição do D-16 (fuso das bordas do mês) — 14/10/2026

Base: books-qualidade, de out/2025 a set/2026, com os filtros de AMS do motor (atividade não interna, sem PROJETOS APL, IM/RF/PM, grupos AMS). Os códigos de resolução ficaram de fora, então é uma aproximação.

- **O dado gravado está correto.** O sync envia a data sem fuso, mas a sessão do banco usa America/Sao_Paulo, então ela é gravada como o instante certo em Brasília. Os apontamentos se concentram entre 8h e 17h de Brasília.
- **Quem erra é a borda do mês, não o dado.** O motor, quando roda em Brasília, usa a borda certa. Os Excels (`T00:00:00.000Z`) usam UTC: incluem as últimas 3 h (21h às 24h) do último dia do mês anterior e excluem as do mês corrente.
- **Impacto em 12 meses (janela UTC contra janela de Brasília):**
  - apontamentos: 12 de 29.603 mudam de mês (19,7 h de 71.062 h), em 9 empresas e 4 meses;
  - tickets fechados: 20 de 15.943, em 18 organizações e 5 meses.
- **Conclusão:** padronizar em America/Sao_Paulo (decisão D-16) corrige o Excel e mantém o resultado do motor. Na comparação Legado x Novo, uma diferença nesses registros é explicada por esta correção.

## Pontos em aberto da Especificação v2.0 (seção 9.3)

| # | Ponto | Decisão | Data |
|---|---|---|---|
| 9.3-1 | Horas de produtos sem banco (cenário 1) | Vão para um **Banco padrão interno**, que não aparece para o cliente (fica fora do Book e do Saldo Parcial). Essas horas **são convertidas em valor faturado** pelas taxas cadastradas (detalhes em 9.3-1a e 9.3-1b). | 14/10/2026 |
| 9.3-3 | Permissão de edição no De-para e em Produtos e Módulos | Telas próprias em `screens`/`screen_permissions`. Na carga inicial, só o grupo administrador recebe Edição; os demais recebem Visualização se precisarem. | 14/10/2026 |
| 9.3-9 | Lista inicial de Ramos de Atividade | A tabela nasce vazia; a lista será cadastrada pela tela Ramos de Atividade (Fase 3) antes de o campo virar obrigatório. | 14/10/2026 |
| 9.3-11 | Correspondência módulo do requerimento → produto/módulo | Como proposto: Comex → COMEX; Comply, pw.SATI, pw.SPED e pw.SATI/pw.SPED → FISCAL; Comply e-DOCS → FISCAL › COMPLY e-DOCS; Gallery → GALLERY. Sem correspondência, vai para o Banco padrão. A tabela `modulos_requerimento_produto` pode ser editada. Valores conferidos nos requerimentos reais. | 14/10/2026 |
| 9.3-1a | Quando as horas do Banco padrão interno viram valor faturado | **No fechamento do período de apuração** do banco interno. As horas acumulam durante o período e são faturadas no fechamento, como excedente. | 14/10/2026 |
| 9.3-1b | Taxa que converte essas horas | **Escolhida no cadastro do banco**: hora excedente (adicional) ou hora normal (valor base da função). | 14/10/2026 |
| 9.3-2 | Mês de corte da ANGLO | Primeiro mês aberto depois de a comparação Legado x Novo da ANGLO ser aprovada. Os meses anteriores ficam como foram fechados. | 14/10/2026 |
| 9.3-4 | Nomes dos bancos no assunto do e-mail de Saldo Parcial | Manter o assunto atual (por empresa); os bancos aparecem só no corpo. | 14/10/2026 |
| 9.3-5 | Visão consolidada no Controle | Fica fora da 1ª versão (uma aba por banco); avaliar depois do uso. | 14/10/2026 |
| 9.3-6 | O banco que cede também autoriza? | Não: qualquer banco elegível cede. Um parâmetro "não ceder saldo" pode vir depois, se houver necessidade. | 14/10/2026 |
| 9.3-7 | Consumo entre bancos × repasse especial por período | Manter a RN-23: o saldo é cedido antes de aplicar a regra de fim de período do banco que cede. | 14/10/2026 |
| 9.3-8 | Opção DBA "Não contratado" | Incluir, como no protótipo. | 14/10/2026 |
| 9.3-10 | Clientes já cadastrados sem as informações novas | Exigir na próxima edição da empresa e oferecer o filtro "informações pendentes" (RN-35). | 14/10/2026 |
| 9.3-12 | Prazo de convivência entre a tela atual e a nova de empresas | A definir com as áreas usuárias antes da Fase 6. | — |
| 9.3-13 | Decisões D-01 a D-16 | Fechadas (tabela acima). | 14/10/2026 |
