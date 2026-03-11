@echo off
REM ============================================
REM Instalar Nginx como Servico Windows
REM ============================================

echo.
echo ========================================
echo Instalando Nginx como Servico Windows
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

REM Verificar se Nginx está instalado
if not exist "C:\nginx\nginx.exe" (
    echo [ERRO] Nginx nao encontrado em C:\nginx\
    echo.
    echo Por favor, instale Nginx:
    echo 1. Baixe de: http://nginx.org/en/download.html
    echo 2. Extraia para C:\nginx\
    echo.
    pause
    exit /b 1
)

echo [1/5] Parando Nginx se estiver rodando...
taskkill /F /IM nginx.exe >nul 2>&1
echo [OK] Nginx parado
echo.

echo [2/5] Criando servico Windows...
sc create "Nginx" binPath= "C:\nginx\nginx.exe" start= auto DisplayName= "Nginx Web Server"
if %errorLevel% neq 0 (
    echo [AVISO] Servico pode ja existir
)
echo.

echo [3/5] Configurando descricao do servico...
sc description "Nginx" "Nginx Web Server - Reverse Proxy para Books SND Sync API"
echo [OK] Descricao configurada
echo.

echo [4/5] Configurando Firewall...
netsh advfirewall firewall add rule name="Nginx HTTP" dir=in action=allow protocol=TCP localport=80 >nul 2>&1
netsh advfirewall firewall add rule name="Nginx HTTPS" dir=in action=allow protocol=TCP localport=443 >nul 2>&1
echo [OK] Firewall configurado (portas 80 e 443)
echo.

echo [5/5] Iniciando servico...
sc start "Nginx"
if %errorLevel% neq 0 (
    echo [ERRO] Falha ao iniciar servico!
    echo.
    echo Tente iniciar manualmente:
    echo cd C:\nginx
    echo start nginx
    echo.
    pause
    exit /b 1
)
echo [OK] Servico iniciado
echo.

echo ========================================
echo Instalacao Concluida!
echo ========================================
echo.
echo Comandos uteis:
echo   - Parar:     net stop "Nginx"
echo   - Iniciar:   net start "Nginx"
echo   - Status:    sc query "Nginx"
echo   - Recarregar: C:\nginx\nginx.exe -s reload
echo   - Testar:    C:\nginx\nginx.exe -t
echo.
echo Logs:
echo   - Acesso:  C:\nginx\logs\access.log
echo   - Erro:    C:\nginx\logs\error.log
echo.
pause
