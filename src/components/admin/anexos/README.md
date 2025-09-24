# Componente AnexoUpload

O componente `AnexoUpload` fornece uma interface completa para upload de múltiplos arquivos com validações de segurança, controle de limites e feedback visual em tempo real.

## Características Principais

### ✅ Interface Drag-and-Drop
- Área de drop intuitiva com feedback visual
- Suporte a múltiplos arquivos simultaneamente
- Indicadores visuais durante drag/drop

### ✅ Validações de Segurança
- **Magic Numbers**: Verificação de assinatura de arquivos
- **Whitelist MIME**: Apenas tipos permitidos (PDF, DOC, DOCX, XLS, XLSX)
- **Validação de Extensão**: Dupla verificação por extensão
- **Limite de Tamanho**: 10MB por arquivo, 25MB total por empresa
- **Limite de Arquivos**: Máximo 10 arquivos por empresa

### ✅ Lista de Arquivos Selecionados
- Preview com nome, tamanho e tipo
- Ícones específicos por tipo de arquivo
- Status visual (pendente, enviando, processado, erro)
- Remoção individual com botão X
- Barra de progresso durante upload

### ✅ Controle de Limites
- Contador de arquivos (X/10)
- Barra de progresso de tamanho total
- Desabilitação automática quando limite atingido
- Feedback visual de limites

## Uso Básico

```tsx
import { AnexoUpload, AnexoData } from '@/components/admin/anexos';

function MinhaTelaComAnexos() {
  const [anexos, setAnexos] = useState<AnexoData[]>([]);

  const handleAnexosChange = (novosAnexos: AnexoData[]) => {
    setAnexos(novosAnexos);
    // Processar anexos conforme necessário
  };

  return (
    <AnexoUpload
      empresaId="empresa-123"
      onAnexosChange={handleAnexosChange}
    />
  );
}
```

## Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `empresaId` | `string` | - | **Obrigatório**. ID da empresa |
| `onAnexosChange` | `(anexos: AnexoData[]) => void` | - | **Obrigatório**. Callback para mudanças |
| `disabled` | `boolean` | `false` | Desabilita o componente |
| `maxTotalSize` | `number` | `25MB` | Limite total de tamanho |
| `maxFiles` | `number` | `10` | Limite de arquivos |
| `className` | `string` | - | Classes CSS adicionais |

## Tipos

```tsx
interface AnexoData {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  url: string;
  status: 'pendente' | 'enviando' | 'processado' | 'erro';
  empresaId: string;
  token?: string;
  dataUpload?: string;
  dataExpiracao?: string;
}

interface AnexosSummary {
  totalArquivos: number;
  tamanhoTotal: number;
  tamanhoLimite: number;
  podeAdicionar: boolean;
}
```

## Validações Implementadas

### 1. Tipos de Arquivo Permitidos
- **PDF**: `application/pdf`
- **DOC**: `application/msword`
- **DOCX**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **XLS**: `application/vnd.ms-excel`
- **XLSX**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### 2. Magic Numbers (Assinaturas)
- **PDF**: `%PDF` (25504446)
- **DOCX/XLSX**: ZIP header (504b0304)
- **DOC/XLS**: OLE2 header (d0cf11e0)

### 3. Limites de Tamanho
- **Individual**: 10MB por arquivo
- **Total**: 25MB por empresa (configurável)
- **Quantidade**: 10 arquivos por empresa (configurável)

## Estados Visuais

### Status dos Arquivos
- 🔵 **Pendente**: Arquivo selecionado, aguardando processamento
- 🟡 **Enviando**: Upload em progresso
- 🟢 **Processado**: Upload concluído com sucesso
- 🔴 **Erro**: Falha no upload ou processamento

### Feedback de Validação
- ❌ **Erros**: Lista detalhada de problemas encontrados
- ⚠️ **Avisos**: Limites próximos de serem atingidos
- ✅ **Sucesso**: Confirmação de operações bem-sucedidas

## Integração com Serviços

O componente está preparado para integração com:
- `anexoService`: Upload e gerenciamento de arquivos
- `anexoTokenService`: Autenticação e segurança
- Supabase Storage: Armazenamento de arquivos

## Exemplo Completo

Veja `AnexoUploadExample.tsx` para um exemplo completo de integração em uma tela real.

## Testes

Execute os testes com:
```bash
npm run test -- src/components/admin/anexos/__tests__/AnexoUpload.test.tsx
```

## Próximos Passos

1. **Integração Real**: Conectar com `anexoService` real
2. **Hook useAnexos**: Criar hook para gerenciamento de estado
3. **Integração com Disparos**: Conectar com tela de disparos personalizados
4. **Otimizações**: Implementar upload em chunks para arquivos grandes