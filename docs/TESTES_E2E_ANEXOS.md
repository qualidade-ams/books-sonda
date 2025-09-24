# Testes End-to-End - Sistema de Anexos

## Visão Geral

Este documento descreve os testes end-to-end implementados para o sistema de anexos em disparos personalizados. Os testes cobrem tanto o fluxo completo do usuário final quanto as validações de limites e segurança.

## Arquivos de Teste

### 1. `src/test/e2e/anexosFluxoUsuarioFinal.test.ts`

Testa o fluxo completo de uso do sistema de anexos do ponto de vista do usuário final.

#### Cenários Testados:

- **Upload de múltiplos arquivos**: Verifica se o serviço consegue fazer upload de vários arquivos simultaneamente
- **Validação de limite total**: Testa se o sistema valida corretamente o limite de 25MB por empresa
- **Cálculo de tamanho**: Verifica se o cálculo do tamanho total dos anexos está funcionando
- **Disparo personalizado com anexos**: Testa a execução de disparos incluindo anexos
- **Obtenção de anexos por empresa**: Verifica a busca de anexos específicos de uma empresa

#### Requisitos Cobertos:
- 1.1: Interface de upload de arquivos
- 1.8: Fluxo completo de anexos
- 3.5: Processamento no Power Automate

### 2. `src/test/e2e/anexosLimitesValidacoes.test.ts`

Testa todas as validações de limites e segurança do sistema de anexos.

#### Cenários Testados:

##### Limite de Tamanho Total (25MB)
- Rejeição quando excede 25MB total
- Cálculo correto com múltiplos arquivos
- Indicador de uso de espaço

##### Limite de Tamanho Individual (10MB)
- Rejeição de arquivos maiores que 10MB
- Aceitação de arquivos no limite exato

##### Tipos de Arquivo Permitidos
- Rejeição de tipos não permitidos (executáveis, etc.)
- Aceitação de todos os tipos permitidos:
  - PDF (`application/pdf`)
  - DOC (`application/msword`)
  - DOCX (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
  - XLS (`application/vnd.ms-excel`)
  - XLSX (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)
- Validação simultânea de extensão e MIME type

##### Limite de Quantidade (10 arquivos)
- Rejeição de mais de 10 arquivos
- Aceitação de exatamente 10 arquivos
- Consideração de arquivos já existentes

##### Validações Combinadas
- Múltiplas regras simultaneamente
- Feedback específico para cada tipo de erro

#### Requisitos Cobertos:
- 1.3: Validação de limite total de 25MB
- 1.4: Validação de limite individual de 10MB
- 5.1: Validação de tipos permitidos
- 5.4: Validações de segurança

## Estrutura dos Testes

### Mocks Utilizados

Os testes utilizam mocks dos serviços principais:

```typescript
// Mock do anexoService
vi.mock('../../services/anexoService', () => ({
  anexoService: {
    uploadAnexos: vi.fn(),
    obterAnexosEmpresa: vi.fn(),
    validarLimiteTotal: vi.fn(),
    calcularTamanhoTotal: vi.fn(),
  }
}));

// Mock do booksDisparoService
vi.mock('../../services/booksDisparoService', () => ({
  booksDisparoService: {
    executarDisparoPersonalizado: vi.fn(),
  }
}));
```

### Dados de Teste

#### Arquivos de Teste
- PDF de 1MB: `relatorio.pdf`
- Excel de 2MB: `planilha.xlsx`
- Arquivo grande (15MB): Para testar limites
- Arquivo inválido: `virus.exe` (tipo não permitido)

#### Empresa de Teste
```typescript
const empresaComAnexo = {
  id: 'empresa-1',
  nome: 'Empresa Teste Anexo',
  email_gestor: 'gestor@empresa.com',
  anexo: true,
  book_personalizado: true,
  status: 'Ativo',
  tem_ams: true,
  tipo_book: 'qualidade'
};
```

## Constantes de Validação

```typescript
const LIMITE_TOTAL_MB = 25;           // Limite total por empresa
const LIMITE_INDIVIDUAL_MB = 10;      // Limite por arquivo
const LIMITE_MAXIMO_ARQUIVOS = 10;    // Máximo de arquivos por empresa

const TIPOS_PERMITIDOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];
```

## Execução dos Testes

### Executar todos os testes E2E
```bash
npm run test -- src/test/e2e/ --run
```

### Executar teste específico
```bash
npm run test -- src/test/e2e/anexosFluxoUsuarioFinal.test.ts --run
npm run test -- src/test/e2e/anexosLimitesValidacoes.test.ts --run
```

## Resultados Esperados

### Fluxo do Usuário Final
- ✅ 5 testes passando
- Cobertura completa do fluxo de upload e disparo
- Validação da integração entre serviços

### Limites e Validações
- ✅ 13 testes passando
- Cobertura completa de todas as validações
- Testes de cenários de erro e sucesso

## Benefícios dos Testes E2E

1. **Confiança na Funcionalidade**: Garantem que o fluxo completo funciona como esperado
2. **Detecção Precoce de Problemas**: Identificam problemas de integração entre componentes
3. **Documentação Viva**: Servem como documentação executável dos requisitos
4. **Regressão**: Previnem quebras em funcionalidades existentes
5. **Validação de Requisitos**: Confirmam que todos os requisitos especificados foram implementados

## Próximos Passos

1. **Testes de Performance**: Adicionar testes para verificar performance com arquivos grandes
2. **Testes de Concorrência**: Testar upload simultâneo de múltiplas empresas
3. **Testes de Falha de Rede**: Simular falhas de conexão durante upload
4. **Testes de Integração Real**: Testes com Supabase real (ambiente de teste)

## Manutenção

- Os testes devem ser atualizados sempre que novos requisitos forem adicionados
- Mocks devem ser mantidos sincronizados com as interfaces dos serviços
- Dados de teste devem refletir cenários reais de uso
- Constantes de validação devem ser mantidas atualizadas com as regras de negócio