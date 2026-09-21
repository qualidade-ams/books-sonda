# Logging e dados pessoais (PII)

O console do navegador é visível a qualquer usuário que abra o DevTools. Log com dado pessoal é vulnerabilidade e violação de LGPD.

## Nunca logar

**Identificação pessoal**: nome completo (`full_name`, `nome`), email, telefone, CPF, RG, endereço, UUID de usuário (`auth.uid()`).

**Dados de negócio sensíveis**: payload completo de request/response com dados de usuário, objeto `profile` retornado do Supabase, token de autenticação ou sessão, dados de `auth.users` (`raw_user_meta_data`), mapeamento id→nome (`usersMap`, `profilesMap`).

**Estrutura interna**: array completo de IDs, resultado de query com múltiplos registros de usuário, dados de permissão contendo nome de usuário.

## Pode logar

```ts
// Mensagem de erro técnica
console.error('Erro ao buscar profiles:', error?.message);
console.error('Falha na operação:', error?.code);

// Contador sem identificação
console.error('Falha ao processar: 0 de 15 registros carregados');
```

```ts
// ❌ payload completo com PII
console.error('Erro:', error, userData, profiles);
// ❌ lista de quem são os registros
console.log('Registros:', registros.map((r) => r.nome));
```

## Por camada

### Service

```ts
// ✅
async buscarUsuarios(ids: string[]): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', ids);

  if (error) {
    console.error('Erro ao buscar profiles:', error.message);
    return {};
  }

  const map: Record<string, string> = {};
  data?.forEach((p) => {
    map[p.id] = p.full_name || p.email || 'Usuário';
  });
  return map;
}
```

```ts
// ❌
async buscarUsuarios(ids: string[]) {
  console.log('Buscando usuários:', ids);          // expõe IDs
  const { data } = await supabase.from('profiles').select('*').in('id', ids);
  console.log('Resultado:', data);                  // expõe nome e email de todos
  data?.forEach((p) => console.log(`${p.id} -> ${p.full_name}`)); // expõe nome
}
```

### Hook

```ts
// ❌
useEffect(() => {
  console.log('Usuário logado:', user);      // dados completos
  console.log('Permissões:', permissions);   // estrutura de acesso
}, [user]);
```

O hook não precisa logar: o erro sobe do service e o TanStack Query o expõe em `error`.

### Componente / página

```ts
// ✅
const handleSubmit = async (formData: FormData) => {
  try {
    await service.create(formData);
    toast({ title: 'Sucesso!' });
  } catch (error) {
    toast({ title: 'Erro ao salvar', variant: 'destructive' });
  }
};
```

```ts
// ❌
console.log('Dados do formulário:', formData);  // pode conter PII
console.log('Usuário:', user.email);            // expõe email
```

## Debug temporário

```ts
if (import.meta.env.DEV) {
  console.debug('[DEBUG] Quantidade de registros:', data?.length);
}
```

Regras: guarda `import.meta.env.DEV` sempre; nem em DEV logar nome, email ou ID completo; preferir contadores e tipos de erro; **remover antes do commit**.

## Checklist de revisão

- [ ] Nenhum `console.log` com dado de usuário (nome, email, ID)
- [ ] Nenhum `console.log` com payload completo (`data`, `profiles`, `users`)
- [ ] Nenhum `console.warn` expondo array de IDs ou mapeamento nome↔ID
- [ ] `console.error` usa só `error.message`/`error.code`, nunca o objeto inteiro
- [ ] Nenhum loop logando registro individual (`forEach` + `console.log`)
- [ ] Log de debug com guarda `import.meta.env.DEV`
- [ ] Nenhum mapeamento id→nome logado
