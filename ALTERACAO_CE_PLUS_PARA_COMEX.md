# Alteração de CE Plus para Comex - Resumo das Mudanças

## Descrição
Alteração completa do nome do produto "CE Plus" para "Comex" em todo o sistema Books SND, incluindo código-fonte, banco de dados, testes e documentação.

## Arquivos Alterados

### 1. Tipos e Constantes
- `src/types/clientBooks.ts` - Atualizado tipo `Produto` e `PRODUTOS_OPTIONS`
- `src/types/clientBooksTypes.ts` - Atualizado constante `PRODUTOS` e `PRODUTOS_OPTIONS`
- `src/types/requerimentos.ts` - Atualizado `ModuloType` e `MODULO_OPTIONS`

### 2. Schemas de Validação
- `src/schemas/clientBooksSchemas.ts` - Atualizado schema de produtos
- `src/schemas/requerimentosSchemas.ts` - Atualizado schema de módulos
- `src/components/admin/client-books/EmpresaForm.tsx` - Atualizado validação Zod

### 3. Serviços
- `src/services/empresasClientesService.ts` - Atualizado constante `PRODUTOS`
- `src/services/excelImportService.ts` - Atualizado validações e templates
- `src/services/gruposResponsaveisService.ts` - Atualizado grupo padrão
- `src/services/clientBooksTemplateService.ts` - Atualizado dados de exemplo

### 4. Utilitários
- `src/utils/clientBooksVariableMapping.ts` - Atualizado mapeamento de variáveis
- `src/utils/clientExportUtils.ts` - Atualizado validações e mapeamentos de produtos

### 5. Componentes
- `src/components/admin/client-books/EmpresasTable.tsx` - Atualizado labels de produtos
- `src/components/admin/client-books/GrupoForm.tsx` - Atualizado placeholder
- `src/components/admin/excel/ExcelImportDialog.tsx` - Atualizado instruções
- `src/components/admin/grupos/GrupoForm.tsx` - Atualizado placeholder

### 6. Migrações do Banco de Dados
- `supabase/migration/rename_ce_plus_to_comex.sql` - **NOVA** migração completa
- `supabase/migration/client_books_management_migration.sql` - Atualizado constraints
- `supabase/migration/sistema_requerimentos_migration.sql` - Atualizado constraints

### 7. Testes (Atualizados)
- `src/test/clientBooksTypes.test.ts`
- `src/schemas/__tests__/clientBooksSchemas.test.ts`
- `src/schemas/__tests__/requerimentosSchemas.test.ts`
- `src/services/__tests__/excelImportService.test.ts`
- `src/services/__tests__/gruposResponsaveisService.test.ts`
- `src/services/__tests__/empresasClientesService.test.ts`
- `src/utils/__tests__/clientBooksVariableMapping.test.ts`
- `src/utils/__tests__/errorRecovery.test.ts`
- `src/utils/__tests__/templateSelection.integration.test.ts`
- `src/test/integration/cadastroCompleto.test.ts`
- `src/test/integration/importacaoExcel.test.ts`

### 8. Documentação
- `.kiro/specs/client-books-management/design.md` - Atualizado tipos e constraints

## Mudanças Realizadas

### Código-fonte
1. **CE_PLUS → COMEX**: Alterado valor da constante de produto
2. **'CE Plus' → 'Comex'**: Alterado label de exibição
3. **Grupos Responsáveis**: Nome do grupo padrão alterado de "CE Plus" para "Comex"
4. **Sistema de Requerimentos**: Módulo "CE Plus" alterado para "Comex"

### Banco de Dados
1. **Constraints**: Atualizadas para aceitar 'COMEX' em vez de 'CE_PLUS'
2. **Dados Existentes**: Migração automática de registros existentes
3. **Grupos**: Atualização do nome e descrição do grupo responsável

### Compatibilidade
- **Mapeamento de Importação**: Mantida compatibilidade com formatos antigos ('CE PLUS', 'CE-PLUS', etc.)
- **Migração Segura**: Script de migração com verificações e logs detalhados

## Como Aplicar as Mudanças

### 1. Executar Migração do Banco
```sql
-- Execute o arquivo de migração
\i supabase/migration/rename_ce_plus_to_comex.sql
```

### 2. Verificar Aplicação
- Todos os formulários de empresa devem mostrar "Comex" em vez de "CE Plus"
- Sistema de requerimentos deve mostrar "Comex" como opção de módulo
- Grupos responsáveis devem mostrar "Comex" em vez de "CE Plus"
- Importação Excel deve continuar funcionando com formatos antigos

### 3. Testes
```bash
npm run test:run
```

## Impacto
- **Zero Downtime**: Alteração não quebra funcionalidades existentes
- **Retrocompatibilidade**: Importação Excel aceita formatos antigos
- **Dados Preservados**: Todos os dados existentes são migrados automaticamente
- **Interface Atualizada**: Todas as telas mostram o novo nome "Comex"

## Validação
✅ Tipos TypeScript atualizados  
✅ Schemas de validação atualizados  
✅ Serviços atualizados  
✅ Componentes atualizados  
✅ Testes atualizados  
✅ Migração de banco criada  
✅ Documentação atualizada  
✅ Retrocompatibilidade mantida  

A alteração está completa e pronta para uso em produção.