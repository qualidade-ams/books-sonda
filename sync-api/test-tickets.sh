#!/bin/bash

# Script Bash para testar sincronização de tickets do SQL Server
# Testa a API de sincronização da tabela AMSticketsabertos

BASE_URL="http://localhost:3001"

echo "========================================"
echo "  Teste de Sincronização de Tickets"
echo "  Tabela: AMSticketsabertos"
echo "========================================"
echo ""

# Função para testar endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    
    echo -e "\033[1;33mTestando: $description\033[0m"
    echo -e "\033[0;37mEndpoint: $method $endpoint\033[0m"
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -X GET "$BASE_URL$endpoint")
    else
        response=$(curl -s -X POST "$BASE_URL$endpoint" -H "Content-Type: application/json")
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "\033[1;32m✅ Sucesso!\033[0m"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    else
        echo -e "\033[1;31m❌ Erro ao executar requisição\033[0m"
    fi
    
    echo ""
}

# 1. Testar conexão com AMSticketsabertos
test_endpoint "GET" "/api/test-connection-tickets" "Testar Conexão com AMSticketsabertos"

# 2. Consultar estrutura da tabela
test_endpoint "GET" "/api/table-structure-tickets" "Estrutura da Tabela AMSticketsabertos"

# 3. Sincronização incremental
echo -e "\033[1;33mDeseja executar sincronização incremental? (s/n):\033[0m "
read -r response
echo ""
if [[ $response =~ ^[Ss]$ ]]; then
    test_endpoint "POST" "/api/sync-tickets" "Sincronização Incremental"
fi

# 4. Sincronização completa
echo -e "\033[1;33mDeseja executar sincronização completa? (s/n):\033[0m "
read -r response
echo ""
if [[ $response =~ ^[Ss]$ ]]; then
    test_endpoint "POST" "/api/sync-tickets-full" "Sincronização Completa (500 registros)"
fi

echo "========================================"
echo "  Testes Concluídos!"
echo "========================================"
