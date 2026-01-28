# Script PowerShell para testar sincronização de tickets do SQL Server
# Testa a API de sincronização da tabela AMSticketsabertos

$BASE_URL = "http://localhost:3001"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Teste de Sincronização de Tickets" -ForegroundColor Cyan
Write-Host "  Tabela: AMSticketsabertos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Função para testar endpoint
function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Description
    )
    
    Write-Host "Testando: $Description" -ForegroundColor Yellow
    Write-Host "Endpoint: $Method $Endpoint" -ForegroundColor Gray
    
    try {
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri "$BASE_URL$Endpoint" -Method Get
        } else {
            $response = Invoke-RestMethod -Uri "$BASE_URL$Endpoint" -Method Post -ContentType "application/json"
        }
        
        Write-Host "✅ Sucesso!" -ForegroundColor Green
        Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
    } catch {
        Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

# 1. Testar conexão com AMSticketsabertos
Test-Endpoint -Method "GET" -Endpoint "/api/test-connection-tickets" -Description "Testar Conexão com AMSticketsabertos"

# 2. Consultar estrutura da tabela
Test-Endpoint -Method "GET" -Endpoint "/api/table-structure-tickets" -Description "Estrutura da Tabela AMSticketsabertos"

# 3. Sincronização incremental
Write-Host "Deseja executar sincronização incremental? (s/n): " -NoNewline -ForegroundColor Yellow
$response = Read-Host
if ($response -eq "s" -or $response -eq "S") {
    Test-Endpoint -Method "POST" -Endpoint "/api/sync-tickets" -Description "Sincronização Incremental"
}

# 4. Sincronização completa
Write-Host "Deseja executar sincronização completa? (s/n): " -NoNewline -ForegroundColor Yellow
$response = Read-Host
if ($response -eq "s" -or $response -eq "S") {
    Test-Endpoint -Method "POST" -Endpoint "/api/sync-tickets-full" -Description "Sincronização Completa (500 registros)"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Testes Concluídos!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
