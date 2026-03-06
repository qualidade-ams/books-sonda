# Configuração de Variáveis de Ambiente no Vercel

## ⚠️ PROBLEMA ATUAL
A aplicação em produção está tentando acessar `https://api.books-sonda.vercel.app` em vez da URL correta do Supabase.

## ✅ SOLUÇÃO
Configure as variáveis de ambiente no painel do Vercel:

### 1. Acesse o Painel do Vercel
1. Vá para https://vercel.com
2. Selecione o projeto `books-sonda`
3. Clique em **Settings** (Configurações)
4. Clique em **Environment Variables** (Variáveis de Ambiente)

### 2. Adicione as Variáveis de Ambiente

Adicione as seguintes variáveis para **Production**, **Preview** e **Development**:

#### Supabase (OBRIGATÓRIO)
```
VITE_SUPABASE_URL=https://qiahexepsdggkzgmklhq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_RFyt_JWwjtthTkDBiKE9vA_RIGt4KUD
```

#### API de Sincronização (OPCIONAL)
```
VITE_SYNC_API_URL=https://sync-api-p3jr.onrender.com:3001
```

### 3. Faça o Redeploy
Após adicionar as variáveis:
1. Vá para a aba **Deployments**
2. Clique nos três pontos (...) do último deployment
3. Clique em **Redeploy**
4. Marque a opção **Use existing Build Cache** (opcional)
5. Clique em **Redeploy**

## 📋 Checklist

- [ ] Variáveis adicionadas no Vercel
- [ ] Redeploy realizado
- [ ] Teste de login funcionando
- [ ] Sem erros de `Failed to fetch` no console

## 🔍 Como Verificar se Funcionou

Após o redeploy, abra o console do navegador (F12) e execute:
```javascript
console.log(import.meta.env.VITE_SUPABASE_URL);
```

Deve retornar: `https://qiahexepsdggkzgmklhq.supabase.co`

Se retornar `undefined`, as variáveis não foram configuradas corretamente.

## 📚 Documentação Oficial
https://vercel.com/docs/projects/environment-variables
