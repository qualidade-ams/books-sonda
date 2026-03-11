@echo off
REM ============================================
REM Gerar Certificado SSL Self-Signed
REM ============================================
REM 
REM IMPORTANTE: Este certificado é apenas para TESTES!
REM Para produção, use Let's Encrypt ou certificado comercial.

echo.
echo ========================================
echo Gerando Certificado SSL Self-Signed
echo ========================================
echo.
echo [AVISO] Este certificado e apenas para TESTES!
echo Para producao, use Let's Encrypt (win-acme) ou certificado comercial.
echo.

REM Verificar se OpenSSL está disponível
openssl version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] OpenSSL nao encontrado!
    echo.
    echo OpenSSL esta incluido no Git for Windows.
    echo Instale de: https://git-scm.com/download/win
    echo.
    echo Ou adicione OpenSSL ao PATH:
    echo set PATH=%%PATH%%;C:\Program Files\Git\usr\bin
    echo.
    pause
    exit /b 1
)

echo [1/3] Criando diretorio SSL...
if not exist "C:\nginx\ssl" mkdir "C:\nginx\ssl"
cd C:\nginx\ssl
echo [OK] Diretorio criado
echo.

echo [2/3] Gerando chave privada e certificado...
echo.
echo Por favor, preencha as informacoes:
echo (Pressione Enter para usar valores padrao)
echo.

openssl req -x509 -nodes -days 365 -newkey rsa:2048 ^
  -keyout private.key ^
  -out certificate.crt ^
  -subj "/C=BR/ST=SP/L=SaoPaulo/O=Sonda/OU=IT/CN=sync-api.seudominio.com.br"

if %errorLevel% neq 0 (
    echo [ERRO] Falha ao gerar certificado!
    pause
    exit /b 1
)
echo.
echo [OK] Certificado gerado
echo.

echo [3/3] Verificando certificado...
openssl x509 -in certificate.crt -text -noout | findstr "Subject:"
echo.
echo [OK] Certificado valido
echo.

echo ========================================
echo Certificado SSL Criado!
echo ========================================
echo.
echo Arquivos criados:
echo   - C:\nginx\ssl\private.key (chave privada)
echo   - C:\nginx\ssl\certificate.crt (certificado)
echo.
echo Validade: 365 dias
echo.
echo [IMPORTANTE] Atualize nginx.conf com os caminhos:
echo   ssl_certificate      C:/nginx/ssl/certificate.crt;
echo   ssl_certificate_key  C:/nginx/ssl/private.key;
echo.
echo [AVISO] Navegadores mostrarao aviso de seguranca!
echo Este certificado e apenas para TESTES.
echo.
echo Para producao, use:
echo   - Let's Encrypt (win-acme): https://www.win-acme.com/
echo   - Certificado comercial da sua empresa
echo.
pause
