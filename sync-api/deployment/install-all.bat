@echo off
REM ============================================
REM Script de Instalação Completa
REM Books SND Sync API + Nginx
REM ============================================

echo.
echo ========================================
echo Books SND Sync API - Instalacao Completa
echo ========================================
echo.

REM Verificar se está rodando como Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Este script precisa ser executado como Administrador!
    echo.
    echo Clique com botao direito e selecione "Executar como administrador"
    pause
    exit /b 1
)

echo [1/8] Verificando Node.js...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale Node.js LTS de: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js instalado
echo.

echo [2/8] Criando diretorios...
if not exist "C:\apps" mkdir "C:\apps"
if not exist "C:\apps\books-sonda-sync-api" mkdir "C:\apps\books-sonda-sync-api"
if not exist "C:\apps\books-sonda-sync-api\logs" mkdir "C:\apps\books-sonda-sync-api\logs"
echo [OK] Diretorios criados
echo.

echo [3/8] Copiando arquivos...
echo Por favor, copie manualmente os arquivos da sync-api para:
echo C:\apps\books-sonda-sync-api\
echo.
echo Pressione qualquer tecla quando terminar...
pause >nul
echo.

echo [4/8] Instalando dependencias...
cd C:\apps\books-sonda-sync-api
call npm install
if %errorLevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias!
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas
echo.

echo [5/8] Compilando TypeScript...
call npm run build
if %errorLevel% neq 0 (
    echo [ERRO] Falha ao compilar!
    pause
    exit /b 1
)
echo [OK] Compilacao concluida
echo.

echo [6/8] Instalando node-windows...
call npm install -g node-windows
if %errorLevel% neq 0 (
    echo [ERRO] Falha ao instalar node-windows!
    pause
    exit /b 1
)
echo [OK] node-windows instalado
echo.

echo [7/8] Instalando servico Windows...
node deployment\install-service.js
if %errorLevel% neq 0 (
    echo [ERRO] Falha ao instalar servico!
    pause
    exit /b 1
)
echo [OK] Servico instalado
echo.

echo [8/8] Configurando Firewall...
netsh advfirewall firewall add rule name="Books SND Sync API" dir=in action=allow protocol=TCP localport=3001 >nul 2>&1
echo [OK] Firewall configurado
echo.

echo ========================================
echo Instalacao Concluida!
echo ========================================
echo.
echo Proximos passos:
echo.
echo 1. Configurar Nginx:
echo    - Instalar Nginx em C:\nginx
echo    - Copiar deployment\nginx.conf para C:\nginx\conf\nginx.conf
echo    - Ajustar server_name no nginx.conf
echo    - Configurar certificados SSL
echo.
echo 2. Testar API:
echo    curl http://localhost:3001/health
echo.
echo 3. Iniciar Nginx:
echo    cd C:\nginx
echo    start nginx
echo.
echo 4. Testar HTTPS:
echo    curl https://sync-api.seudominio.com.br/health
echo.
pause
