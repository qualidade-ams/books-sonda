# Script para testar endpoints de sincronização de apontamentos
# Uso: .\test-apontamentos.ps1

$API_URL = "http://localhost:3001"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Teste de Sincronização de Apontamentos" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Função para testar endpoint
function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Description
    )
    
    Write-Host "Testando: $Description" -ForegroundColor Yellow
    Write-Host "Endpoint: $Method $Endpoint"
    Write-Host ""
    
    try {
        $url = "$API_URL$Endpoint"
        
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $url -Method Get -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Uri $url -Method Post -ErrorAction Stop
        }
        
        Write-Host "✅ Sucesso" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10
    }
    catch {
        Write-Host "❌ Erro" -ForegroundColor Red
        Write-Host $_.Exception.Message
        if ($_.ErrorDetails.Message) {
            Write-Host $_.ErrorDetails.Message
        }
    }
    
    Write-Host ""
    Write-Host "--------------------------------------"
    Write-Host ""
}

# 1. Testar conexão com AMSapontamento
Test-Endpoint -Method "GET" -Endpoint "/api/test-connection-apontamentos" -Description "Testar Conexão com AMSapontamento"

# 2. Consultar estrutura da tabela
Test-Endpoint -Method "GET" -Endpoint "/api/table-structure-apontamentos" -Description "Consultar Estrutura da Tabela"

# 3. Sincronização incremental
Write-Host "⚠️  Atenção: A sincronização incremental irá buscar novos registros" -ForegroundColor Yellow
$response = Read-Host "Deseja executar sincronização incremental? (s/n)"
if ($response -eq "s" -or $response -eq "S") {
    Test-Endpoint -Method "POST" -Endpoint "/api/sync-apontamentos" -Description "Sincronização Incremental"
}

# 4. Sincronização completa
Write-Host "⚠️  Atenção: A sincronização completa irá buscar até 500 registros" -ForegroundColor Yellow
$response = Read-Host "Deseja executar sincronização completa? (s/n)"
if ($response -eq "s" -or $response -eq "S") {
    Test-Endpoint -Method "POST" -Endpoint "/api/sync-apontamentos-full" -Description "Sincronização Completa (500 registros)"
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Testes concluídos!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
