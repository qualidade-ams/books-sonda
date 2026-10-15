# Tokens — Design System v2

Aprovado em 15/10/2026 (ver a seção 6). Passo 3 do [Briefing](../Briefing_Design_System_v2.md).

**Visualização:** abra [tokens-preview.html](tokens-preview.html) no navegador. Ela aplica estes tokens em amostras de componentes, nos modos claro e escuro, e calcula o contraste ao vivo.

**Regras desta proposta:**

- Toda cor vem do manual (**M**) ou é derivada (**D**). Cada derivada tem o motivo registrado, como combinado no briefing (item 9.1).
- Contraste mínimo: 4,5 para texto, 3,0 para borda de componente e foco (WCAG 2.1 AA). Todos os valores abaixo foram calculados.
- Os nomes são semânticos e levam o prefixo `ds-`. O componente usa `ds-fg-secondary`, nunca `#3D3D3D`.

---

## 1. Paleta-base

| Token      | Valor     | Origem                                                                           |
| ---------- | --------- | -------------------------------------------------------------------------------- |
| `cyan-500` | `#00D4E8` | M                                                                                |
| `cyan-400` | `#33DDED` | D: hover do ciano no escuro                                                      |
| `cyan-600` | `#00BFD1` | D: hover do ciano no claro e pressionado no escuro                               |
| `cyan-700` | `#00A9B9` | D: pressionado do ciano no claro                                                 |
| `cyan-900` | `#006F7D` | D: ciano para **texto, link e foco no claro**. O `#00D4E8` dá 1,81 sobre branco  |
| `cyan-50`  | `#E0F8FB` | D: fundo de destaque suave no claro (item ativo, linha selecionada)              |
| `cyan-950` | `#0D2B2E` | D: fundo de destaque suave no escuro                                             |
| `white`    | `#FFFFFF` | M                                                                                |
| `gray-50`  | `#F5F5F5` | D: fundo da página no claro. O `#E4E4E4` fica escuro demais como fundo           |
| `gray-100` | `#E4E4E4` | M                                                                                |
| `gray-300` | `#B1B1B1` | M                                                                                |
| `gray-400` | `#8A8A8A` | D: borda de input no claro (3,45). O `#B1B1B1` dá 2,14; texto auxiliar no escuro |
| `gray-500` | `#737373` | D: borda de input no escuro (3,89 sobre `#141414`)                               |
| `gray-550` | `#6B6B6B` | D: texto auxiliar e placeholder no claro (5,33)                                  |
| `gray-600` | `#5C5C5C` | D: texto desabilitado no escuro                                                  |
| `gray-700` | `#3D3D3D` | M                                                                                |
| `gray-850` | `#1F1F1F` | D: superfície elevada no escuro (diálogo, cabeçalho de tabela)                   |
| `gray-900` | `#141414` | D: superfície (cartão) no escuro                                                 |
| `black`    | `#000000` | M                                                                                |

Cores de status, todas **D**, porque o manual não as define:

| Status  | Claro: texto / fundo / borda                   | Escuro: texto / fundo / borda                  |
| ------- | ---------------------------------------------- | ---------------------------------------------- |
| Sucesso | `#1E7A3D` / `#E8F5EC` / `#B7DEC3`              | `#4CC77A` / `#0F2A1A` / `#1F5A35`              |
| Alerta  | `#A15C00` / `#FFF3E0` / `#F5D49E`              | `#F0A43A` / `#2E2210` / `#6B4A17`              |
| Perigo  | `#B42328` / `#FDECEC` / `#F3B9BB`              | `#FF6B6B` / `#331616` / `#7A2A2A`              |
| Info    | usa o ciano: `#006F7D` / `#E0F8FB` / `#9FE6EE` | usa o ciano: `#00D4E8` / `#0D2B2E` / `#11606A` |

Saturação moderada: os tons ficam abaixo do vermelho e do verde puros do Tailwind, coerentes com a "temperatura" do manual.

---

## 2. Tokens semânticos de cor

### 2.1 Superfícies

| Token           | Claro              | Escuro    | Uso                                                 |
| --------------- | ------------------ | --------- | --------------------------------------------------- |
| `ds-bg-page`    | `#F5F5F5`          | `#121212` | Fundo da página                                     |
| `ds-bg-surface` | `#FFFFFF`          | `#1C1C1C` | Cartão, tabela, seção                               |
| `ds-bg-raised`  | `#FFFFFF` + sombra | `#262626` | Diálogo, popover, menu                              |
| `ds-bg-subtle`  | `#F5F5F5`          | `#262626` | Cabeçalho de tabela, hover de linha, linha de total |

**Ajuste (15/10/2026):** o fundo escuro deixou de ser preto puro (`#000000`), que ficava pesado demais na tela inteira. Página `#121212`, superfícies `#1C1C1C` e elevadas `#262626`. O preto puro fica reservado à faixa de topo e ao menu, que são de marca. Branco sobre `#1C1C1C` mantém contraste 16,0.
| `ds-bg-selected` | `#E0F8FB` | `#0D2B2E` | Linha selecionada, item ativo |
| `ds-overlay` | `rgba(0,0,0,.5)` | `rgba(0,0,0,.7)` | Fundo atrás de diálogo e drawer |

No escuro, a profundidade vem da cor da superfície, não da sombra.

### 2.2 Texto

| Token             | Claro     | Contraste   | Escuro    | Contraste     | Uso                                     |
| ----------------- | --------- | ----------- | --------- | ------------- | --------------------------------------- |
| `ds-fg`           | `#000000` | 21 / 19,3*  | `#FFFFFF` | 18,4 / 16,5** | Texto principal, títulos, números       |
| `ds-fg-secondary` | `#3D3D3D` | 10,9 / 10,0 | `#B1B1B1` | 8,6 / 7,7     | Subtítulo, rótulo, descrição            |
| `ds-fg-muted`     | `#6B6B6B` | 5,3 / 4,9   | `#8A8A8A` | 5,3 / 4,8     | Ajuda, placeholder, cabeçalho de tabela |
| `ds-fg-disabled`  | `#B1B1B1` | isento      | `#5C5C5C` | isento        | Desabilitado (WCAG não exige contraste) |
| `ds-fg-accent`    | `#006F7D` | 5,9 / 5,4   | `#00D4E8` | 10,2 / 9,1    | Link, item ativo, destaque em texto     |
| `ds-fg-on-accent` | `#000000` | 11,6        | `#000000` | 11,6          | Texto sobre o ciano (botão primário)    |

\* sobre `ds-bg-surface` / `ds-bg-page`. \*\* sobre `ds-bg-surface` / `ds-bg-raised`.

### 2.3 Bordas e foco

| Token              | Claro            | Escuro           | Uso                                                               |
| ------------------ | ---------------- | ---------------- | ----------------------------------------------------------------- |
| `ds-border`        | `#E4E4E4`        | `#3D3D3D`        | Borda decorativa de cartão e divisor (sem exigência de contraste) |
| `ds-border-strong` | `#8A8A8A` (3,45) | `#737373` (3,89) | Borda de input, checkbox, botão secundário                        |
| `ds-focus`         | `#006F7D` (5,9)  | `#00D4E8` (10,2) | Anel de foco, 2 px com afastamento de 2 px                        |

### 2.4 Destaque (ciano)

| Token               | Claro     | Escuro    | Uso                                      |
| ------------------- | --------- | --------- | ---------------------------------------- |
| `ds-accent`         | `#00D4E8` | `#00D4E8` | Fundo do botão primário, indicador ativo |
| `ds-accent-hover`   | `#00BFD1` | `#33DDED` | Hover                                    |
| `ds-accent-pressed` | `#00A9B9` | `#00BFD1` | Pressionado                              |
| `ds-accent-subtle`  | `#E0F8FB` | `#0D2B2E` | Fundo de item ativo, selo "Novo"         |

O botão primário é ciano **com texto preto** nos dois modos (11,6). Sobre branco, o ciano não tem contraste de borda (1,81). Isso é aceito pela WCAG porque o texto do botão o identifica, mas por isso ele **nunca aparece sem texto** (ícone sozinho em ciano sobre branco, não).

### 2.5 Status

| Token                                 | Uso                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `ds-success-fg` / `-bg` / `-border`   | Saldo positivo, "Idêntico", "Soma confere", "Ativo", "Sem conflito"                              |
| `ds-warning-fg` / `-bg` / `-border`   | "Sem módulo", "Cedido a outros bancos", "Legado (em validação)", impacto de alteração            |
| `ds-danger-fg` / `-bg` / `-border`    | Saldo negativo, "Divergente", erro, ação destrutiva                                              |
| `ds-info-fg` / `-bg` / `-border`      | "Consumido de outros bancos", observação automática, dica                                        |
| `ds-danger-solid` / `ds-fg-on-danger` | Botão destrutivo: claro `#B42328` com texto branco (6,5); escuro `#FF6B6B` com texto preto (7,6) |

Todos os textos de status passam AA sobre o próprio fundo e sobre `ds-bg-surface` (ver a seção 1 e a visualização).

### 2.6 Shell (sidebar)

**Decidido (15/10/2026): a sidebar acompanha o tema.** No claro, ela é branca; no escuro, `#141414`. A proposta de sidebar sempre preta foi recusada. A presença de marca vem do **logotipo**, numa versão de cor adequada a cada fundo (seção 2.7).

| Token                | Claro     | Contraste | Escuro    | Contraste |
| -------------------- | --------- | --------- | --------- | --------- |
| `ds-shell-bg`        | `#FFFFFF` | —         | `#1C1C1C` | —         |
| `ds-shell-fg`        | `#000000` | 21        | `#FFFFFF` | 18,4      |
| `ds-shell-fg-muted`  | `#6B6B6B` | 5,3       | `#B1B1B1` | 8,6       |
| `ds-shell-hover`     | `#F5F5F5` | —         | `#262626` | —         |
| `ds-shell-active-bg` | `#E0F8FB` | —         | `#0D2B2E` | —         |
| `ds-shell-active-fg` | `#006F7D` | 5,3       | `#00D4E8` | 8,3       |
| `ds-shell-border`    | `#E4E4E4` | —         | `#262626` | —         |

O item ativo também ganha uma barra de 2 px na cor `ds-shell-active-fg` à esquerda, para não depender só da cor de fundo.

### 2.7 Logotipo

Logos que existem hoje em `public/images/`:

- `logo-sonda.png`: branco, serve para fundo escuro. É o que a sidebar azul atual usa.
- `sonda-logo.png`: "SONDA" no **azul antigo** (próximo do `#2563EB`) com "make it easy" em preto. Não serve para o v2, porque o azul saiu da paleta.

**Pendente (Willian):** enviar o logo numa cor para fundo claro, de preferência em **SVG**, nas versões "SONDA" e "SONDA make it easy". A sidebar usa o logo de fundo claro no tema claro e o branco no escuro. Se o logo de fundo claro for ciano `#00D4E8`, ele precisa de tamanho grande para ser legível sobre branco (1,81:1). Preto ou `#3D3D3D` funcionam em qualquer tamanho.

---

## 3. Tipografia

**Decisão de 15/10/2026 (Willian):** o texto passa a usar a **Inter** no lugar da Roboto do manual. É um desvio autorizado, porque a Roboto deixou o protótipo com aspecto apagado. A Inter tem números tabulares melhores, é mais nítida em tamanho pequeno e já é carregada pelo sistema. Ela usa as variantes `cv11`, `ss01` e `ss03` para um desenho mais moderno. A **Kumbh Sans** (500 e 600), do manual, continua nos títulos. Nas tabelas abaixo, onde está "Roboto", leia "Inter".

Fontes carregadas do Google Fonts: Inter 300–700 (já existente) e Kumbh Sans 500/600. Para código e identificadores (Grupo Aranda, JSON), uma fonte monoespaçada do sistema (`ui-monospace`).

| Token                 | Fonte          | Peso | Tamanho / altura de linha (desktop)          | Celular | Uso                                                             |
| --------------------- | -------------- | ---- | -------------------------------------------- | ------- | --------------------------------------------------------------- |
| `ds-text-page-title`  | Kumbh Sans     | 500  | 28 / 36                                      | 22 / 28 | Título da página                                                |
| `ds-text-title`       | Roboto         | 500  | 18 / 24                                      | 18 / 24 | Título de diálogo, de cartão de entidade (BancoCard)            |
| `ds-text-section`     | Roboto         | 700  | 12 / 16, caixa alta, `letter-spacing: .06em` | igual   | Título de seção ("EVOLUÇÃO DOS ORÇAMENTOS")                     |
| `ds-text-body`        | Roboto         | 400  | 14 / 20                                      | 15 / 22 | Texto, célula de tabela                                         |
| `ds-text-body-strong` | Roboto         | 500  | 14 / 20                                      | 15 / 22 | Ênfase, rótulo de campo                                         |
| `ds-text-small`       | Roboto         | 400  | 12 / 16                                      | 13 / 18 | Ajuda, metadado ("Última alteração…")                           |
| `ds-text-table-head`  | Roboto         | 500  | 12 / 16, caixa alta, `letter-spacing: .04em` | igual   | Cabeçalho de tabela                                             |
| `ds-text-kpi`         | Roboto         | 700  | 28 / 32, `tabular-nums`                      | 22 / 28 | Valor de indicador                                              |
| `ds-text-lead`        | Roboto         | 300  | 20 / 28                                      | 18 / 26 | Texto de destaque; único uso do Light (só a partir de 18–20 px) |
| `ds-text-mono`        | `ui-monospace` | 400  | 13 / 20                                      | 13 / 20 | Identificador do Aranda, JSON                                   |

**Regras:**

- Campos de formulário usam **16 px no celular**. Abaixo disso, o iOS dá zoom ao focar o campo.
- Toda coluna e todo valor numérico usam `tabular-nums`.
- Itálico só para observação automática e citação.
- O Kumbh Sans aparece **só** no título de página, nunca em texto corrido nem em tabela.

---

## 4. Espaço, forma e movimento

| Grupo                | Tokens                                   | Valores                                                                                                                |
| -------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Espaçamento          | escala do Tailwind (base 4 px)           | Padding de página: 24 px desktop, 16 px celular. Entre seções: 24 px. Dentro de cartão: 20 px desktop, 16 px celular   |
| Raio                 | `ds-radius-sm` / `-md` / `-lg` / `-full` | 6 px (selo quadrado, checkbox) / 8 px (botão, input) / 12 px (cartão, diálogo) / pílula (selo, chip, tabs segmentadas) |
| Altura de controle   | `ds-control-sm` / `-md` / `-lg`          | 32 / 36 / 44 px. **No celular, mínimo de 44 px** em tudo que é tocável                                                 |
| Linha de tabela      | `ds-row`                                 | 44 px desktop (densidade confortável); cartões no celular                                                              |
| Sombra (só no claro) | `ds-shadow-sm` / `-lg`                   | Cartão sem sombra (borda basta); popover e menu com `-sm`; diálogo com `-lg`                                           |
| Movimento            | `ds-duration-fast` / `-base`             | 120 ms / 200 ms, `ease-out`. Com `prefers-reduced-motion`, sem animação                                                |
| Breakpoints          | padrão Tailwind                          | `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280. Sidebar vira drawer abaixo de `lg`; tabela vira cartões abaixo de `md`    |
| Camadas              | `ds-z-*`                                 | sticky 10 · shell 20 · drawer 40 · dialog 50 · popover 60 · toast 70                                                   |

---

## 5. Rascunho técnico

Como fica no código, para referência. Não é aplicado agora.

```css
[data-ds='v2'] {
  --ds-bg-page: #f5f5f5;
  --ds-bg-surface: #ffffff;
  --ds-fg: #000000;
  --ds-fg-accent: #006f7d;
  --ds-accent: #00d4e8;
  /* … demais tokens … */
}
.dark [data-ds='v2'],
[data-ds='v2'].dark {
  --ds-bg-page: #000000;
  --ds-bg-surface: #141414;
  --ds-fg: #ffffff;
  --ds-fg-accent: #00d4e8;
  /* … */
}
```

No `tailwind.config.ts`, os tokens entram como cores com nome próprio (`ds-bg-surface`, `ds-fg-muted`…) e **sem mexer nas cores existentes**. As telas atuais não são afetadas.

---

## 6. Decisões (15/10/2026)

1. **Paleta derivada** (seção 1): aprovada.
2. **Texto principal preto puro no claro** (`#000000`): adotado para avaliar no protótipo. Se ficar duro, a alternativa é o `#3D3D3D` do manual no texto corrido e o preto só nos títulos. A troca é de um token só (`ds-fg`).
3. **Sidebar:** acompanha o tema (2.6). O logotipo para fundo claro está pendente (2.7).
4. **Tipografia** (3): aprovada.
5. **Densidade** (4): aprovada.
