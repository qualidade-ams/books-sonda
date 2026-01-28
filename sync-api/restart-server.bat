@echo off
echo Parando servidor na porta 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3001" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul

echo Aguardando 2 segundos...
timeout /t 2 /nobreak >nul

echo Iniciando servidor...
set PORT=3001
node dist/server.js
