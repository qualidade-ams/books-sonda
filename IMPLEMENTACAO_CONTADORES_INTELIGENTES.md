# Implementação de Contadores Inteligentes nos Botões de Disparo

## Resumo
Implementação de contadores inteligentes nos botões "Disparar Selecionados" e "Reenviar Selecionados" nas telas de Disparos e Disparos Personalizados, que separam as empresas selecionadas baseado no status de envio.

## Problema Resolvido
Anteriormente, ambos os botões mostravam o mesmo contador com o total de empresas selecionadas, independentemente do status de envio. Isso causava confusão sobre quantas empresas realmente precisavam ser disparadas versus reenviadas.

## Solução Implementada

### Lógica dos Contadores
- **Contador "Disparar Selecionados"**: Conta apenas empresas com status `pendente`, `agendado` ou `falhou`
- **Contador "Reenviar Selecionados"**: Conta apenas empresas com status `enviado`

### Arquivos Modificados
1. `src/pages/admin/ControleDisparos.tsx`
2. `src/pages/admin/ControleDisparosPersonalizados.tsx`

### Implementação Técnica

#### 1. Novo Hook `contadoresInteligentes`
```typescript
const contadoresInteligentes = useMemo(() => {
  const paraDisparar = empresasSelecionadasStatus.filter(empresa => 
    empresa.status === 'pendente' || empresa.status === 'agendado' || empresa.status === 'falhou'
  ).length;
  
  const paraReenviar = empresasSelecionadasStatus.filter(empresa => 
    empresa.status === 'enviado'
  ).length;

  return { paraDisparar, paraReenviar };
}, [empresasSelecionadasStatus]);
```

#### 2. Botões com Contadores Separados
```typescript
// Botão Disparar - só conta empresas não enviadas
<Button
  disabled={contadoresInteligentes.paraDisparar === 0}
  title={contadoresInteligentes.paraDisparar === 0 ? 'Nenhuma empresa selecionada precisa ser disparada' : undefined}
>
  {`Disparar Selecionados (${contadoresInteligentes.paraDisparar})`}
</Button>

// Botão Reenviar - só conta empresas já enviadas
<Button
  disabled={contadoresInteligentes.paraReenviar === 0}
  title={contadoresInteligentes.paraReenviar === 0 ? 'Nenhuma empresa selecionada precisa ser reenviada' : 'Reenviar empresas já processadas'}
>
  {`Reenviar Selecionados (${contadoresInteligentes.paraReenviar})`}
</Button>
```

## Comportamento dos Botões

### Cenários de Uso
1. **5 empresas selecionadas (3 pendentes + 2 enviadas)**:
   - "Disparar Selecionados (3)" - habilitado
   - "Reenviar Selecionados (2)" - habilitado

2. **3 empresas selecionadas (todas pendentes)**:
   - "Disparar Selecionados (3)" - habilitado
   - "Reenviar Selecionados (0)" - desabilitado

3. **2 empresas selecionadas (todas enviadas)**:
   - "Disparar Selecionados (0)" - desabilitado
   - "Reenviar Selecionados (2)" - habilitado

### Estados dos Botões
- **Habilitado**: Quando há empresas no status apropriado
- **Desabilitado**: Quando não há empresas no status apropriado
- **Tooltip**: Mensagem explicativa quando desabilitado

## Benefícios
1. **Clareza Visual**: Usuário vê exatamente quantas empresas serão afetadas por cada ação
2. **Prevenção de Erros**: Botões desabilitados quando não há empresas no status apropriado
3. **Melhor UX**: Tooltips explicativos quando botões estão desabilitados
4. **Consistência**: Mesmo comportamento em ambas as telas (Disparos e Disparos Personalizados)

## Compatibilidade
- ✅ Mantém toda funcionalidade existente
- ✅ Não altera lógica de negócio dos serviços
- ✅ Compatível com sistema de permissões
- ✅ Funciona em ambas as telas (padrão e personalizada)

## Testes
- ✅ Build bem-sucedido
- ✅ TypeScript sem erros
- ✅ Lógica de contadores testada via useMemo
- ✅ Estados de botões validados