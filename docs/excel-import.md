# Funcionalidade de Importação Excel

## Visão Geral

A funcionalidade de importação Excel permite importar empresas clientes em lote através de arquivos Excel (.xlsx, .xls). O sistema inclui validação de dados, preview antes da importação e relatórios detalhados de erros e sucessos.

## Como Usar

### 1. Acessar a Funcionalidade

1. Navegue para **Administração > Cadastro de Empresas**
2. Clique no botão **"Importar Excel"** no canto superior direito

### 2. Baixar Template

1. No modal de importação, clique em **"Baixar Template Excel"**
2. Um arquivo `template_empresas.xlsx` será baixado
3. Use este template como base para seus dados

### 3. Preencher o Template

O template contém as seguintes colunas:

| Coluna | Obrigatório | Descrição | Exemplo |
|--------|-------------|-----------|---------|
| Nome Completo | ✅ | Nome completo da empresa | "Exemplo Empresa Ltda" |
| Nome Abreviado | ✅ | Nome abreviado para e-mails | "Exemplo" |
| Link SharePoint | ❌ | URL da pasta no SharePoint | "https://sharepoint.com/exemplo" |
| Template Padrão | ❌ | Idioma do template (portugues/ingles) | "portugues" |
| Status | ❌ | Status da empresa (ativo/inativo/suspenso) | "ativo" |
| Email Gestor | ❌ | E-mail do gestor de contas | "gestor@exemplo.com" |
| Produtos | ❌ | Produtos contratados (separados por vírgula) | "CE_PLUS,FISCAL" |
| Grupos | ❌ | Grupos de responsáveis (separados por vírgula) | "CE Plus,Todos" |

#### Valores Válidos

**Produtos:**
- `CE_PLUS`
- `FISCAL` 
- `GALLERY`

**Status:**
- `ativo` (padrão)
- `inativo`
- `suspenso`

**Template Padrão:**
- `portugues` (padrão)
- `ingles`

### 4. Fazer Upload do Arquivo

1. Arraste o arquivo Excel para a área de upload ou clique para selecionar
2. O sistema processará o arquivo automaticamente
3. Aguarde a validação dos dados

### 5. Revisar Preview

Após o processamento, você verá:

- **Resumo:** Total de linhas, status de validação e número de erros
- **Erros de Validação:** Lista detalhada de erros encontrados (se houver)
- **Preview dos Dados:** Tabela com todos os dados a serem importados

### 6. Confirmar Importação

1. Revise os dados no preview
2. Se houver erros, corrija o arquivo Excel e faça upload novamente
3. Se tudo estiver correto, clique em **"Confirmar Importação"**

### 7. Visualizar Resultado

Após a importação, você verá:

- **Resumo:** Estatísticas de sucessos e erros
- **Empresas Importadas:** Lista das empresas criadas com sucesso
- **Erros:** Detalhes de qualquer erro que ocorreu durante a importação
- **Relatório:** Opção para baixar relatório completo em Excel

## Validações Realizadas

### Validações de Campo

- **Nome Completo:** Obrigatório, não pode estar vazio
- **Nome Abreviado:** Obrigatório, não pode estar vazio
- **Email Gestor:** Deve ser um e-mail válido (se preenchido)
- **Template Padrão:** Deve ser "portugues" ou "ingles"
- **Status:** Deve ser "ativo", "inativo" ou "suspenso"
- **Produtos:** Devem ser valores válidos da lista permitida
- **Grupos:** Devem corresponder a grupos cadastrados no sistema

### Validações de Negócio

- Verificação de duplicatas por nome da empresa
- Validação de existência dos grupos referenciados
- Verificação de formato de e-mail

## Tratamento de Erros

### Tipos de Erro

1. **Erros de Validação:** Campos obrigatórios vazios, formatos inválidos
2. **Erros de Negócio:** Grupos inexistentes, duplicatas
3. **Erros de Sistema:** Falhas na criação no banco de dados

### Recuperação de Erros

- Erros de validação impedem a importação
- Erros individuais não afetam outras linhas
- Relatório detalhado para correção

## Relatórios

### Relatório de Importação

O sistema gera um relatório Excel contendo:

- Resumo da importação (sucessos/erros)
- Lista detalhada de erros com linha e campo
- Lista de empresas importadas com sucesso

### Download do Relatório

1. Após a importação, clique em **"Baixar Relatório"**
2. Um arquivo `relatorio_importacao_YYYY-MM-DD.xlsx` será baixado

## Dicas e Boas Práticas

### Preparação dos Dados

1. **Use o template:** Sempre baixe e use o template oficial
2. **Valide e-mails:** Certifique-se de que os e-mails estão corretos
3. **Teste com poucos dados:** Faça um teste com 2-3 empresas primeiro
4. **Backup:** Mantenha backup dos dados originais

### Produtos e Grupos

1. **Produtos:** Use exatamente os valores listados (case-sensitive)
2. **Grupos:** Certifique-se de que os grupos existem no sistema
3. **Separadores:** Use vírgula sem espaços extras

### Resolução de Problemas

1. **Arquivo não aceito:** Verifique se é .xlsx ou .xls
2. **Erros de validação:** Consulte a tabela de valores válidos
3. **Grupos não encontrados:** Cadastre os grupos antes da importação
4. **Falhas na importação:** Verifique o relatório de erros

## Limitações

- Máximo de 1000 empresas por importação
- Arquivos até 10MB
- Apenas formatos .xlsx e .xls
- Não suporta imagens ou formatação especial

## Suporte

Em caso de problemas:

1. Verifique este guia primeiro
2. Baixe o relatório de erros para análise
3. Entre em contato com o suporte técnico com o arquivo e relatório