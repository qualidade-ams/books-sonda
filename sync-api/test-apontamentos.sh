#!/bin/bash

# Script para testar endpoints de sincronização de apontamentos
# Uso: ./test-apontamentos.sh

API_URL="http://localhost:3001"

echo "======================================"
echo "Teste de Sincronização de Apontamentos"
echo "======================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    
    echo -e "${YELLOW}Testando: ${description}${NC}"
    echo "Endpoint: ${method} ${endpoint}"
    echo ""
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "${API_URL}${endpoint}")
    else
        response=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}${endpoint}")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "200" ]; then
        echo -e "${GREEN}✅ Sucesso (HTTP ${http_code})${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}❌ Erro (HTTP ${http_code})${NC}"
        echo "$body"
    fi
    
    echo ""
    echo "--------------------------------------"
    echo ""
}

# 1. Testar conexão com AMSapontamento
test_endpoint "GET" "/api/test-connection-apontamentos" "Testar Conexão com AMSapontamento"

# 2. Consultar estrutura da tabela
test_endpoint "GET" "/api/table-structure-apontamentos" "Consultar Estrutura da Tabela"

# 3. Sincronização incremental
echo -e "${YELLOW}⚠️  Atenção: A sincronização incremental irá buscar novos registros${NC}"
read -p "Deseja executar sincronização incremental? (s/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    test_endpoint "POST" "/api/sync-apontamentos" "Sincronização Incremental"
fi

# 4. Sincronização completa
echo -e "${YELLOW}⚠️  Atenção: A sincronização completa irá buscar até 500 registros${NC}"
read -p "Deseja executar sincronização completa? (s/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    test_endpoint "POST" "/api/sync-apontamentos-full" "Sincronização Completa (500 registros)"
fi

echo ""
echo "======================================"
echo "Testes concluídos!"
echo "======================================"
