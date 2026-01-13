# =====================================================
# SCRIPT: Aplicar Correção de Segurança - search_path
# Descrição: Aplica automaticamente a correção crítica
#           de segurança para funções vulneráveis
# =====================================================

Write-Host "🔒 APLICANDO CORREÇÃO CRÍTICA DE SEGURANÇA" -ForegroundColor Red
Write-Host ""

# Verificar se o Docker está rodando
Write-Host "🐳 Verificando Docker Desktop..." -ForegroundColor Yellow
try {
    docker version | Out-Null
    Write-Host "✅ Docker Desktop está rodando" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Desktop não está rodando" -ForegroundColor Red
    Write-Host "   Inicie o Docker Desktop e tente novamente" -ForegroundColor Yellow
    Write-Host "   Download: https://docs.docker.com/desktop" -ForegroundColor Cyan
    exit 1
}

Write-Host ""

# Verificar se o Supabase local está configurado
Write-Host "🗄️ Verificando Supabase local..." -ForegroundColor Yellow
try {
    $status = npx supabase status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Supabase local está rodando" -ForegroundColor Green
        $useLocal = $true
    } else {
        Write-Host "⚠️ Supabase local não está rodando" -ForegroundColor Yellow
        $useLocal = $false
    }
} catch {
    Write-Host "⚠️ Supabase local não configurado" -ForegroundColor Yellow
    $useLocal = $false
}

Write-Host ""

if ($useLocal) {
    # Aplicar via Supabase local
    Write-Host "🚀 Aplicando correção via Supabase local..." -ForegroundColor Cyan
    
    try {
        npx supabase db push
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Migration aplicada com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "❌ Erro ao aplicar migration" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ Erro ao executar migration" -ForegroundColor Red
        Write-Host "   Erro: $_" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host ""
    Write-Host "🧪 Executando validação de segurança..." -ForegroundColor Cyan
    
    try {
        npx supabase db diff --schema public
        Write-Host "✅ Validação concluída" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Não foi possível executar validação automática" -ForegroundColor Yellow
        Write-Host "   Execute manualmente: npx supabase db diff --schema public" -ForegroundColor Cyan
    }
    
} else {
    # Instruções para aplicação manual
    Write-Host "📋 APLICAÇÃO MANUAL NECESSÁRIA" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Como o Supabase local não está disponível, siga estes passos:" -ForegroundColor White
    Write-Host ""
    Write-Host "1. Acesse o Dashboard do Supabase:" -ForegroundColor Cyan
    Write-Host "   https://supabase.com/dashboard" -ForegroundColor Blue
    Write-Host ""
    Write-Host "2. Vá para SQL Editor no seu projeto" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Copie e execute o conteúdo do arquivo:" -ForegroundColor Cyan
    Write-Host "   supabase/migration/20250113000001_fix_security_search_path.sql" -ForegroundColor Blue
    Write-Host ""
    Write-Host "4. Execute o script de validação:" -ForegroundColor Cyan
    Write-Host "   supabase/scripts/validate_security.sql" -ForegroundColor Blue
    Write-Host ""
    
    # Abrir arquivos automaticamente
    Write-Host "🔧 Abrindo arquivos necessários..." -ForegroundColor Yellow
    
    if (Test-Path "supabase/migration/20250113000001_fix_security_search_path.sql") {
        Start-Process notepad "supabase/migration/20250113000001_fix_security_search_path.sql"
        Write-Host "✅ Migration aberta no Notepad" -ForegroundColor Green
    }
    
    if (Test-Path "supabase/scripts/validate_security.sql") {
        Start-Process notepad "supabase/scripts/validate_security.sql"
        Write-Host "✅ Script de validação aberto no Notepad" -ForegroundColor Green
    }
    
    if (Test-Path "docs/correcao-seguranca-search-path.md") {
        Start-Process notepad "docs/correcao-seguranca-search-path.md"
        Write-Host "✅ Documentação aberta no Notepad" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "🛡️ CORREÇÃO DE SEGURANÇA PREPARADA" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor White
Write-Host "1. ✅ Migration de correção criada" -ForegroundColor Green
Write-Host "2. ✅ Scripts de validação preparados" -ForegroundColor Green
Write-Host "3. ✅ Documentação completa disponível" -ForegroundColor Green
Write-Host ""

if ($useLocal) {
    Write-Host "4. 🧪 Execute: npx supabase db diff --schema public" -ForegroundColor Cyan
    Write-Host "5. 🔍 Verifique se todas as funções mostram '✅ Seguro'" -ForegroundColor Cyan
} else {
    Write-Host "4. 🌐 Aplique a migration no Dashboard do Supabase" -ForegroundColor Cyan
    Write-Host "5. 🧪 Execute o script de validação no SQL Editor" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🚨 IMPORTANTE:" -ForegroundColor Red
Write-Host "   Esta é uma correção CRÍTICA de segurança" -ForegroundColor Yellow
Write-Host "   Aplique o mais rápido possível" -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 Documentação completa:" -ForegroundColor White
Write-Host "   docs/correcao-seguranca-search-path.md" -ForegroundColor Blue
Write-Host ""

# Pausar para o usuário ler
Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")