# 🚀 Quick Start - Books SND

## Desenvolvimento Local

### Opção 1: Apenas Frontend (Mais Rápido)
```bash
npm run dev
```
→ Acesse: http://localhost:8080

### Opção 2: Frontend + API (Completo)
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run dev:api
```
→ Acesse: http://localhost:8080

## Build e Deploy

### Testar Build Local
```bash
npm run build
npm run preview
```
→ Acesse: http://localhost:4173

### Deploy para Produção
```bash
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
```
→ Deploy automático pelo Vercel

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Vite na porta 8080
npm run dev:api          # Vercel API na porta 3001
npm run dev:vercel       # Vercel Dev (experimental)

# Build
npm run build            # Build de produção
npm run preview          # Preview do build

# Testes
npm run test             # Testes em watch mode
npm run test:run         # Testes uma vez

# Qualidade
npm run lint             # Linter
```

## Portas

| Serviço | Porta | URL |
|---------|-------|-----|
| Frontend (Vite) | 8080 | http://localhost:8080 |
| API (Vercel) | 3001 | http://localhost:3001 |
| Preview | 4173 | http://localhost:4173 |

## Problemas Comuns

### Porta ocupada
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8080 | xargs kill -9
```

### API não responde
Certifique-se de que `npm run dev:api` está rodando no Terminal 2.

### Erro 404 no Vercel Dev
Use a abordagem de 2 terminais em vez de `vercel dev`.

## Documentação Completa

- 📖 **Desenvolvimento**: Leia `DESENVOLVIMENTO.md`
- 🚀 **Deploy**: Leia `DEPLOY.md`
- 📝 **Changelog**: Leia `CHANGELOG-DEV-SETUP.md`

---

**Última atualização**: 2026-03-04
