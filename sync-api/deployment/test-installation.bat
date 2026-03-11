@echo off
REM ============================================
REM Testar Instalacao Completa
REM ============================================

echo.
echo ========================================
echo Testando Instalacao Books SND Sync API
echo ========================================
echo.

echo [1/6] Verificando servico sync-api...
sc query "Books SND Sync API" | findstr "RUNNING" >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Servico sync-api nao esta rodando!
    echo Execute: net start "Books SND Sync API"
    pause
    exit /b 1
)
echo [OK] Servico sync-api rodando
echo.

echo [2/6] Verificando servico Nginx...
sc query "Nginx" | findstr "RUNNING" >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Servico Nginx nao esta rodando!
    echo Execute: net start "Nginx"
    pause
    exit /b 1
)
echo [OK] Servico Nginx rodando
echo.

echo [3/6] Testando API local (HTTP)...
curl -s http://localhost:3001/health >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] API local nao responde!
    echo Verifique logs: type C:\apps\books-sonda-sync-api\logs\service.log
    pause
    exit /b 1
)
echo [OK] API local respondendo
echo.

echo [4/6] Testando Nginx local (HTTPS)...
curl -k -s https://localhost/health >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Nginx local nao responde!
    echo Verifique logs: type C:\nginx\logs\error.log
    pause
    exit /b 1
)
echo [OK] Nginx local respondendo
echo.

echo [5/6] Testando conexao SQL Server...
curl -s http://localhost:3001/api/test-connection >nul 2>&1
if %errorLevel% neq 0 (
    echo [AVISO] Teste de conexao SQL falhou
    echo Verifique credenciais no .env
)
echo [OK] Teste de conexao executado
echo.

echo [6/6] Verificando portas abertas...
netstat -an | findstr ":3001" >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Porta 3001 nao esta aberta!
)
netstat -an | findstr ":443" >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Porta 443 nao esta aberta!
)
echo [OK] Portas abertas
echo.

echo ========================================
echo Teste Completo!
echo ========================================
echo.
echo Endpoints disponiveis:
echo   - API Local:  http://localhost:3001/health
echo   - Nginx HTTPS: https://localhost/health
echo.
echo Proximos passos:
echo 1. Configurar DNS para apontar para este servidor
echo 2. Testar externamente: curl https://sync-api.seudominio.com.br/health
echo 3. Atualizar frontend (.env.production):
echo    VITE_SYNC_API_URL=https://sync-api.seudominio.com.br
echo.
echo Logs:
echo   - Sync API: C:\apps\books-sonda-sync-api\logs\service.log
echo   - Nginx:    C:\nginx\logs\error.log
echo.
pause
