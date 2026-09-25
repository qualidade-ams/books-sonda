@echo off
REM ============================================
REM Testar Instalacao - Books SND Sync API
REM (servico Windows + Cloudflare Tunnel)
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

echo [2/6] Verificando servico Cloudflared (tunel)...
sc query Cloudflared | findstr "RUNNING" >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Servico Cloudflared nao esta rodando!
    echo Execute: net start Cloudflared
    pause
    exit /b 1
)
echo [OK] Servico Cloudflared rodando
echo.

echo [3/6] Testando API local...
curl -s -f http://127.0.0.1:3001/health >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] API local nao responde em http://127.0.0.1:3001
    echo Verifique logs: type C:\apps\books-sonda-sync-api\dist\daemon\*.err.log
    pause
    exit /b 1
)
echo [OK] API local respondendo
echo.

echo [4/6] Testando acesso externo pelo tunel...
curl -s -f https://sync-api.sondalyze.com.br/health >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] https://sync-api.sondalyze.com.br/health nao responde!
    echo Confira no painel Cloudflare Zero Trust se o Public Hostname aponta para
    echo   HTTP  127.0.0.1:3001   ^(use 127.0.0.1, nao "localhost"^)
    pause
    exit /b 1
)
echo [OK] Tunel respondendo
echo.

echo [5/6] Testando conexao SQL Server...
curl -s -f http://127.0.0.1:3001/api/test-connection >nul 2>&1
if %errorLevel% neq 0 (
    echo [AVISO] Teste de conexao SQL falhou - verifique as credenciais no .env
) else (
    echo [OK] Conexao com SQL Server
)
echo.

echo [6/6] Verificando se a porta 3001 esta restrita a maquina local...
netstat -an | findstr "LISTENING" | findstr ":3001" | findstr /v "127.0.0.1:3001" >nul 2>&1
if %errorLevel% equ 0 (
    echo [AVISO] A porta 3001 esta aberta para a rede. Defina HOST=127.0.0.1 no .env e reinicie o servico.
) else (
    echo [OK] Porta 3001 escutando apenas em 127.0.0.1
)
echo.

echo ========================================
echo Teste Completo!
echo ========================================
echo.
echo Endpoints:
echo   - Local:   http://127.0.0.1:3001/health
echo   - Externo: https://sync-api.sondalyze.com.br/health
echo.
echo Logs:
echo   - Sync API: C:\apps\books-sonda-sync-api\dist\daemon\*.err.log
echo   - Tunel:    Visualizador de Eventos do Windows (origem "Cloudflared")
echo.
pause
