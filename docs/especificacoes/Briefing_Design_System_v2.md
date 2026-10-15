# Briefing — Design System v2 (telas novas do Banco de Horas)

Versão de 14/10/2026, com as decisões principais fechadas. Decisor: Willian Faria.

Marcação: **[proposto]** = preenchido a partir do código, da Especificação v2.0 e do manual de marca, aguardando validação. **[decidir]** = pergunta em aberto. O que está como "Decidido" já foi validado.

---

## 1. Objetivo

Definir o visual e os componentes das telas novas da reconstrução do Banco de Horas, com responsividade e alinhados ao manual de marca da Sonda, antes da Fase 3. O conteúdo das telas atuais não muda agora: a migração delas fica para depois da virada (ver "Decisões complementares" em [Decisoes_Negocio_Bancos_de_Horas.md](Decisoes_Negocio_Bancos_de_Horas.md)).

Observação: a Especificação v2.0 diz que os protótipos dela seguem o "padrão visual atual" e que as telas novas seguem esse mesmo padrão (seção 5.8). Este briefing substitui essa parte. Os protótipos da spec continuam valendo para **conteúdo e comportamento**, não para o visual.

## 2. Escopo

### Entra

**As 9 telas novas** (Anexo B.1 da spec):

| Tela                        | Padrão de interface predominante                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Empresas                    | Lista com filtros e busca; formulário com abas (Informações, Bancos de Horas, contatos, Book); bancos como cartões ordenáveis; importação e exportação Excel |
| Produtos e Módulos          | Cadastro hierárquico (produto → módulos) e vínculo com grupos Aranda                                                                                         |
| De-para de Grupos           | Tabela editável, atribuição em lote, lista de "não mapeados", aviso de impacto                                                                               |
| Ramos de Atividade          | Cadastro simples (lista e formulário)                                                                                                                        |
| Controle de Banco de Horas  | Quadro mensal denso, com abas por banco, reajustes, observações, histórico de versões, recálculo, alertas e envio manual                                     |
| Ajustes Retroativos         | Fila de pendências com analisar, aprovar e descartar                                                                                                         |
| Auditoria do Banco de Horas | Log filtrável com exportação                                                                                                                                 |
| Envio de Saldo Parcial      | Agendamentos com recorrência, destinatários e histórico de execuções                                                                                         |
| Comparação Legado x Novo    | Lista com status (Idêntico, Soma confere, Divergente, Liberada), detalhe da divergência, liberar e voltar para legado                                        |

**O shell (sidebar e header)**, só na responsividade (item 5) e, se aprovado, no visual (item 5.1).

### Fica fora

- O conteúdo das telas atuais, inclusive das que sofrem alteração no Anexo B.2.
- Book em PDF, e-mails e planilhas Excel: têm layout próprio e seguem como estão (spec, seção 6).
- Página de login.

## 3. Usuários e contexto de uso

**Decidido (14/10/2026):**

- **Uso frequente.** As telas novas fazem parte do dia a dia dos usuários.
- **Paridade total entre dispositivos.** No celular e no tablet, as telas novas têm **as mesmas funções que no desktop**: cadastro, edição em lote, quadro mensal, aprovação, exportação. Nada fica "só no desktop".

Consequências para o design system:

- **Eficiência acima de vitrine.** Uso frequente pede densidade confortável, filtros que lembram a última escolha, ações principais sempre visíveis, navegação por teclado no desktop e nenhum elemento decorativo no caminho da tarefa.
- Toda tabela precisa de uma forma no celular que permita **ler e agir**, não só consultar. Lista em cartões com ações por item; quadros densos (Controle, Comparação) com rolagem horizontal, primeira coluna fixa e resumo no topo.
- Formulário com abas vira seções empilhadas ou abas roláveis; ação principal fixa no rodapé da tela.
- Seleção e ação em lote (De-para) precisam de modo de seleção por toque.
- Modais longos viram tela cheia ou `Drawer` abaixo de `md`.
- Importação e exportação Excel funcionam no celular (upload pelo seletor de arquivo do sistema).

**[decidir]** (não bloqueia): perfis que usam cada tela (gestão de contratos, AMS, faturamento, administrador). Serve para priorizar as ações de cada tela no celular.

## 4. Diagnóstico do visual atual

Levantado no código em 14/10/2026:

- **Cores fora de token:** cerca de 6.400 usos diretos da paleta do Tailwind (`bg-blue-600`, `text-gray-500`…) em `src/pages` e `src/components`, contra cerca de 770 usos dos tokens `sonda-*`. Mais 33 arquivos com cor hexadecimal fixa.
- **Cor fora da marca:** o "azul Sonda" do sistema é o `blue-600` do Tailwind (`#2563eb`). Pelo manual, a cor de destaque da marca é o ciano `#00d4e8` (item 9).
- **Duas fontes de cor:** as variáveis do shadcn em `:root` (`--primary`, `--secondary`…) e as cores `sonda-*` fixas no `tailwind.config.ts` convivem sem regra clara de qual usar.
- **Tipografia fora da marca:** o sistema usa Inter (carregada do Google Fonts no `index.html`). O manual define Roboto e Kumbh Sans. Há ainda 24 arquivos com tamanho de fonte arbitrário (`text-[Npx]`).
- **Modo escuro com contraste ruim:** há `ThemeToggle` no header e 85 arquivos com `dark:`, mas a cobertura é parcial e o contraste não agrada.
- **Layout não é responsivo:** a sidebar é fixa (`w-64`/`w-16`) e o conteúdo é deslocado com `ml-64`/`ml-16`. No celular, a sidebar ocupa a tela.
- **Feedback:** duas convenções de toast (`sonner` e `useToast`).
- **i18n parcial:** a infraestrutura existe (i18next, com `pt-BR`, `en` e `es` em `src/i18n/locales/`), mas só 23 de 59 páginas a usam.

## 5. Shell: sidebar e header

**Decidido (14/10/2026): opção B.** O `LayoutAdmin` fica responsivo para todo o sistema: abaixo de `lg`, a sidebar vira drawer aberto por um botão no header, e o header se ajusta. O **conteúdo** das telas atuais não muda. Vai como entrega separada e pequena, com teste de regressão visual nas telas atuais em desktop, antes dos componentes das telas novas.

Opções avaliadas:

| Opção                                               | O que significa                                                                            | Impacto nas telas atuais                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| A. Shell responsivo só para as telas novas          | As telas novas usam uma variante do layout com sidebar em drawer abaixo de `lg`            | Nenhum. O usuário vê dois comportamentos de menu durante a transição |
| **B. Tornar o `LayoutAdmin` responsivo para todos** | Sidebar vira drawer abaixo de `lg` em todo o sistema; o conteúdo das telas atuais não muda | Baixo, mas toca todas as telas                                       |
| C. Responsividade só a partir de tablet             | Telas novas responsivas de `md` para cima; celular fora de escopo                          | Nenhum                                                               |

### 5.1 Visual do shell

Com a marca definida, surge um conflito: as telas novas em ciano e preto ficariam dentro de uma sidebar azul `#2563eb`, que não é cor da marca.

**Decidido (14/10/2026): opção X.** O shell é repintado na marca nova, na mesma entrega da responsividade.

| Opção                                                                                                                 | Resultado durante a transição                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **X. Repintar o shell junto com a opção B** (sidebar e header na marca nova, como na referência "Sonda Precificação") | Telas novas coerentes com o shell. Telas atuais mantêm o conteúdo azul dentro de um shell neutro (preto/cinza com destaque ciano) |
| Y. Manter o shell azul até a migração                                                                                 | Telas atuais intactas. Telas novas em ciano dentro de uma sidebar azul, conflito visível em toda tela nova                        |

Motivo: o shell é a superfície de marca mais visível, e um shell neutro (preto e cinza) convive melhor com o conteúdo azul antigo do que o conteúdo ciano novo convive com uma sidebar azul. Como o shell já vai ser mexido pela opção B, a repintura entra na mesma entrega.

## 6. Princípios

**[proposto]**

1. **Dado primeiro.** Telas de operação com tabela densa (Controle, Comparação, Auditoria). Densidade confortável, sem cartões decorativos nem hero com foto no caminho da tarefa.
2. **Ciano é destaque, não preenchimento.** A cor da marca marca o que importa: item ativo, ação principal, foco, link, indicador. Superfícies são preto, branco e cinzas do manual (como na referência "Sonda Precificação").
3. **Status inequívoco.** Saldo positivo ou negativo, mês aberto ou fechado, "precisa retificação", Legado ou Bancos múltiplos, pendências: cada estado tem cor, ícone e texto. Nunca só a cor.
4. **Ação destrutiva ou irreversível sempre confirma** (aprovar retroativo, liberar empresa, voltar para legado, inativar), dizendo o efeito: "Será contabilizado na retificação do Book de 09/2026".
5. **Previsível entre telas.** O mesmo padrão de página para lista, formulário e detalhe nas 9 telas.
6. **Semântico, não literal.** Componente usa token com nome de função (`ds-surface`, `ds-accent`, `ds-danger`), nunca cor da paleta.
7. **Simples ("Make it easy").** O propósito da marca também vale para a interface: menos passos, linguagem direta, nada que não ajude a tarefa.

## 7. Requisitos

- **Acessibilidade [proposto]:** WCAG 2.1 AA. Contraste de 4,5:1 em texto normal, 3:1 em texto grande e em bordas de componentes (inputs, checkbox, foco). Foco visível, navegação por teclado, área de toque mínima de 44 px no mobile.
- **Breakpoints [proposto]:** os padrões do Tailwind (`sm` 640, `md` 768, `lg` 1024, `xl` 1280). Tabelas viram lista de cartões abaixo de `md`.
- **Modo escuro (decidido em 14/10/2026):** o modo escuro atual **não serve de referência**, porque o contraste das cores é ruim. As telas novas têm modo escuro **redesenhado do zero**: paleta escura própria (não a inversão da clara), com contraste AA verificado em todos os pares texto/fundo e estados. O toggle global continua o mesmo.
- **Tema padrão (decidido em 14/10/2026):** **claro, por enquanto.** Quem nunca escolheu tema vê o modo claro. As referências são escuras, então os dois modos recebem o mesmo cuidado, e o claro é o que mais depende das cores derivadas (item 9.1). A decisão pode ser revista depois do protótipo.
- **Idiomas (decidido em 14/10/2026):** as telas novas nascem traduzidas em **pt-BR, en e es**, usando o i18next que já existe (`src/i18n/`). Consequências:
  - Nenhum texto fixo em componente; tudo por chave de tradução, inclusive estados vazios, confirmações e mensagens de erro.
  - Componentes acomodam **textos até cerca de 30% mais longos** que o pt-BR (o espanhol costuma ser o mais longo): botão sem largura fixa, rótulo que quebra linha em vez de cortar, coluna de tabela que não depende do tamanho do título.
  - Datas e números formatados pelo idioma ativo (`Intl`). Horas sempre em `HH:MM`, em qualquer idioma.
- **Números e horas [proposto]:** algarismos tabulares (`tabular-nums`) em colunas numéricas, alinhados à direita.
- **Datas e fuso:** exibição em America/Sao_Paulo (D-16).
- **Feedback [proposto]:** `useToast` (convenção nova do projeto); estados vazio, carregando e erro padronizados.

## 8. Restrições técnicas

**[proposto]**

- Tailwind + Radix/shadcn, que já estão no projeto. **Nenhuma biblioteca nova** de UI. Ícones continuam no `lucide-react` (traço fino, igual ao da referência).
- **Isolamento:** tokens novos com prefixo `ds-`, declarados como CSS variables no escopo `[data-ds="v2"]`. As variáveis de `:root` e as cores `sonda-*` existentes **não são alteradas**.
- **Fontes:** Roboto e Kumbh Sans carregadas do Google Fonts, como a Inter hoje, e aplicadas só dentro do escopo `[data-ds="v2"]` (e no shell, se a opção X for aprovada). A Inter continua nas telas atuais.
- Componentes novos em `src/components/ds/`, embrulhando os primitivos de `src/components/ui/`.
- Validação visual por protótipo em `/prototipos/:slug` (skill `prototipo`), com dados fictícios.
- Documentação final em skill do `.claude/`, para servir de fonte de verdade na Fase 3.

## 9. Marca

Fonte: manual de marca da Sonda, trechos enviados em 14/10/2026.

### 9.1 Cores

Paleta oficial: ciano `#00d4e8`, branco `#ffffff`, preto `#000000` e os cinzas `#3d3d3d`, `#b1b1b1` e `#e4e4e4`.

Contraste entre elas (texto normal exige 4,5; texto grande e bordas, 3,0):

|                        | sobre `#fff` | sobre `#e4e4e4` | sobre `#000` | sobre `#3d3d3d` |
| ---------------------- | ------------ | --------------- | ------------ | --------------- |
| `#00d4e8` ciano        | 1,81 ✗       | 1,43 ✗          | **11,58**    | **5,99**        |
| `#000000` preto        | **21,00**    | **16,52**       | —            | 1,93 ✗          |
| `#3d3d3d` cinza escuro | **10,86**    | **8,54**        | 1,93 ✗       | —               |
| `#b1b1b1` cinza médio  | 2,14 ✗       | 1,69 ✗          | **9,79**     | **5,07**        |
| `#ffffff` branco       | —            | 1,27 ✗          | **21,00**    | **10,86**       |

O que isso define **[proposto]**:

- **A paleta da marca é escura por natureza.** Ciano e cinza médio funcionam muito bem sobre preto e cinza escuro, e falham sobre branco. Isso explica por que as três referências são escuras.
- **Modo escuro:** usa a paleta oficial quase sem ajuste. Ciano como texto, link e ícone de destaque; `#b1b1b1` como texto secundário; branco como texto principal. Para dar profundidade (fundo → cartão → elemento elevado), entram cinzas intermediários entre `#000` e `#3d3d3d`, como `#141414` e `#1f1f1f`. São tons derivados, e o contraste se mantém: ciano sobre `#1f1f1f` fica em 9,09 e `#b1b1b1` em 7,69.
- **Modo claro:** o ciano **nunca é texto** sobre fundo claro. Aparece como preenchimento de botão e indicador, com **texto preto por cima** (11,58). Para link, foco e texto de destaque no claro, entra um **ciano escurecido derivado**: `#006f7d` dá 5,88 sobre branco e 4,63 sobre `#e4e4e4`.
- **Bordas de input no claro:** `#b1b1b1` sobre branco dá 2,14, abaixo dos 3:1 exigidos. Entra um cinza derivado de pelo menos `#8a8a8a` (3,45).
- **Cores de status:** o manual não define sucesso, alerta e erro, e elas são necessárias (saldo negativo, divergente, pendente, liberada). São derivadas com saturação moderada, coerente com a temperatura do manual, uma versão por modo e todas AA. "Informação" usa o próprio ciano.

Toda cor derivada fica registrada na documentação final com o motivo, conforme combinado: tons fora do manual só onde ele não atinge AA ou não cobre a necessidade.

### 9.2 Tipografia

Do manual: **Roboto** (Light, Light Italic, Regular, Medium, Bold, Bold Italic) e **Kumbh Sans** (Medium).

Uso **[proposto]**:

| Papel                            | Fonte                                                 | Observação                                                                    |
| -------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| Título de página                 | Kumbh Sans Medium                                     | Só títulos; nunca texto corrido                                               |
| Título de seção ou cartão        | Roboto Bold, caixa alta, com espaçamento entre letras | Como "EVOLUÇÃO DOS ORÇAMENTOS" na referência                                  |
| Texto, tabela, formulário        | Roboto Regular                                        | Medium para ênfase e rótulos                                                  |
| Números de destaque (KPI, saldo) | Roboto Bold                                           | `tabular-nums`                                                                |
| Texto auxiliar grande            | Roboto Light                                          | Só a partir de 20 px. Light em tamanho pequeno perde legibilidade e contraste |
| Itálico                          | Roboto Light Italic / Bold Italic                     | Uso pontual (citação, observação automática)                                  |

### 9.3 Fotografia

Resumo das diretrizes do manual:

- Propósito **"Make it easy"**: a pessoa no centro da imagem, aproveitando a vida e o trabalho; a Sonda como quem entrega soluções sob medida.
- Transmitir alegria, prazer, simplicidade, um momento de tranquilidade.
- **Proibido:** imagens que estigmatizem pessoas, situações, símbolos ou ações de discriminação.
- **Temperatura:** natural, real, bom contraste, tom quente mas com azuis; corporativo, mas moderno.
- **Luz e saturação:** contraste baixo (sem imagens muito escuras), sem imagens muito claras, sem saturação alta.
- **Dois cenários:** (1) pessoas reais, satisfeitas com o trabalho e com a confiança na Sonda, com enquadramento cuidadoso e cores não saturadas; (2) negócios e indústrias, destacando compromisso, qualidade e inovação.

Aplicação **[proposto]**: as 9 telas novas são operacionais e **não usam fotografia** (princípio 1). As diretrizes ficam documentadas para uso futuro em login, dashboard e página inicial.

### 9.4 Referências gráficas

Arquivos em [design-system-v2/referencias/](design-system-v2/referencias/):

- `sonda-precificacao-dashboard.png`: sistema interno "Sonda Precificação".
- `convite-workshop-topo.png` e `convite-workshop-rodape.png`: peça de comunicação interna.

Traços que o design system v2 adota **[proposto]**:

- Fundo escuro quase preto, cartões um tom acima, com borda fina e sutil e cantos arredondados (cerca de 8–12 px).
- Ciano só no destaque: item ativo do menu (fundo ciano translúcido + texto ciano), link "Ver todos", ícones de KPI, palavra-chave de título.
- Ícone de traço fino dentro de um círculo com fundo translúcido nos cartões de indicador.
- Títulos de seção em caixa alta, negrito, com espaçamento entre letras; cabeçalho de tabela em caixa alta pequena, cinza.
- Selos em pílula (como "CONVITE - DIA 4" e "Dashboard").
- Estados vazios com título e linha de explicação, centralizados.
- Sidebar escura com rodapé "Recolher".

Traços que **não** adota: o hero com fotografia no topo da tela (ocupa a primeira dobra de uma tela de uso frequente) e títulos em ciano de tamanho grande (próprios de peça de comunicação, não de tela operacional).

**Decidido (14/10/2026):** o código do Sonda Precificação **não** é reaproveitado. Ele serve só como referência visual. O design system v2 é construído do zero, de forma profissional, a partir deste briefing.

A direção visual é a das referências (neutra, com destaque ciano), com tema padrão claro (item 7).

**Em avaliação (15/10/2026):** nova referência `dashboard-cartoes-arredondados.png` (dashboard de cartões brancos de cantos largos sobre fundo claro, sidebar em pílula, chips e anéis de progresso). O protótipo `/prototipos/controle-banco-horas-suave` aplica esse estilo com a paleta Sonda: preto na ação principal e na sidebar, ciano no que está selecionado ou ativo. Se for aprovado, os traços acima (cantos 8–12 px, títulos em caixa alta, sidebar escura fixa) são revistos nos Tokens.

**Direção escolhida (15/10/2026), aprovada por enquanto no protótipo `/prototipos/controle-banco-horas`:** menu em pílula preta, com logo e expansível (recolhido só ícones); topo igual ao da referência Sonda Precificação (faixa escura com foto de marca, selo da tela atual, tema, notificações e usuário), seguido do hero da versão expressiva e dos indicadores sobrepostos; passador de período grande; conteúdo em abas em pílula sem "Visão geral", abrindo direto no Quadro. Pendentes: foto definitiva do topo (a atual é a do login) e versão do logo para o menu recolhido.

Ajustes aprovados na mesma rodada: menu acompanha o tema (branco no claro) com logo centralizado; faixa de topo arredondada, 20 px além dos indicadores de cada lado, com a foto em degradê suave para a esquerda; sem selo da tela e sem a linha "Novo"; fundo escuro `#121212` em vez de preto puro (Tokens); passador de período só com o período; cartões de banco compactos, nome sem negrito, selecionado com borda ciano só à esquerda e embaixo; título do banco à esquerda e abas à direita na mesma linha; mês corrente do Quadro em cor de acento, sem o texto "fechamento"; linhas de tabela com mais respiro.

## 10. Entregáveis e critério de aceite

**[proposto]**

| Entregável                                                                         | Critério de aceite                                                                                                                                                          |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LayoutAdmin` responsivo (opção B) e, se aprovado, repintado (opção X)             | Sidebar em drawer abaixo de `lg`; conteúdo das telas atuais idêntico em desktop                                                                                             |
| Tokens (cor, tipografia, espaçamento, raio, sombra, breakpoints) em claro e escuro | Contraste AA verificado em todos os pares texto/fundo e bordas; cores derivadas registradas com motivo                                                                      |
| Componentes base, definidos pelo inventário das 9 telas                            | Variantes e estados (hover, foco, desabilitado, erro, carregando) cobertos; teste nos componentes com lógica; textos por chave de tradução                                  |
| Padrões de página: lista com filtros, formulário com abas, detalhe                 | Aplicados no protótipo                                                                                                                                                      |
| Protótipo de 3 telas: **Controle**, **Empresas** e **Comparação**                  | Aprovado por você em desktop (1366 e 1920), tablet (768) e celular (390), nos modos claro e escuro, nos três idiomas, executando **as mesmas funções** em todos os tamanhos |
| Skill de documentação                                                              | Classes e templates exatos, prontos para a Fase 3                                                                                                                           |

**Prazo:** concluído antes do início da Fase 3. **[decidir]** a data-limite.

## 11. Próximos passos

1. Abertos, sem bloquear o início: data-limite (10) e perfis por tela (3).
2. ~~Inventário de componentes das 9 telas~~: feito em 14/10/2026, ver [design-system-v2/Inventario_Componentes.md](design-system-v2/Inventario_Componentes.md).
3. Proposta de tokens, para aprovação: em 15/10/2026, ver [design-system-v2/Tokens.md](design-system-v2/Tokens.md) e a visualização [tokens-preview.html](design-system-v2/tokens-preview.html).
4. Shell responsivo (opção B).
5. Componentes base, padrões de página e protótipo.
6. Skill de documentação.
