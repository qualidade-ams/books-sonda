#!/bin/bash

# ============================================
# Exemplos de Uso da API de Sincronização
# ============================================

API_URL="http://localhost:3000"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     EXEMPLOS DE USO - SINCRONIZAÇÃO DE APONTAMENTOS       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================
# 1. HEALTH CHECK
# ============================================
echo "1️⃣  Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "${API_URL}/health" | jq '.'
echo ""
echo ""

# ============================================
# 2. TESTAR CONEXÃO SQL SERVER
# ============================================
echo "2️⃣  Testar Conexão com SQL Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "${API_URL}/api/test-connection-apontamentos" | jq '.'
echo ""
echo ""

# ============================================
# 3. VERIFICAR ESTRUTURA DA TABELA
# ============================================
echo "3️⃣  Verificar Estrutura da Tabela AMSapontamento"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "${API_URL}/api/table-structure-apontamentos" | jq '.columns[] | select(.COLUMN_NAME == "Data_Ult_Modificacao_Geral")'
echo ""
echo ""

# ============================================
# 4. SINCRONIZAÇÃO INCREMENTAL (RECOMENDADO)
# ============================================
echo "4️⃣  Sincronização Incremental (limite: 10 registros)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "${API_URL}/api/sync-apontamentos-incremental" \
  -H "Content-Type: application/json" \
  -d '{"limite": 10}' | jq '.'
echo ""
echo ""

# ============================================
# 5. SINCRONIZAÇÃO INCREMENTAL (LIMITE MAIOR)
# ============================================
echo "5️⃣  Sincronização Incremental (limite: 100 registros)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "${API_URL}/api/sync-apontamentos-incremental" \
  -H "Content-Type: application/json" \
  -d '{"limite": 100}' | jq '.'
echo ""
echo ""

# ============================================
# 6. SINCRONIZAÇÃO INCREMENTAL (PADRÃO 500)
# ============================================
echo "6️⃣  Sincronização Incremental (limite padrão: 500 registros)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "${API_URL}/api/sync-apontamentos-incremental" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'
echo ""
echo ""

# ============================================
# 7. SINCRONIZAÇÃO ANTIGA (COMPATIBILIDADE)
# ============================================
echo "7️⃣  Sincronização Antiga (apenas INSERT)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "${API_URL}/api/sync-apontamentos" | jq '.'
echo ""
echo ""

# ============================================
# 8. SINCRONIZAÇÃO COMPLETA
# ============================================
echo "8️⃣  Sincronização Completa (desde 28/02/2024)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  ATENÇÃO: Pode demorar vários minutos"
# curl -s -X POST "${API_URL}/api/sync-apontamentos-full" | jq '.'
echo "Comando comentado para evitar execução acidental"
echo ""
echo ""

# ============================================
# EXEMPLOS AVANÇADOS
# ============================================
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    EXEMPLOS AVANÇADOS                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================
# 9. SINCRONIZAÇÃO COM TIMEOUT CUSTOMIZADO
# ============================================
echo "9️⃣  Sincronização com Timeout de 60 segundos"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "${API_URL}/api/sync-apontamentos-incremental" \
  -H "Content-Type: application/json" \
  -d '{"limite": 50}' \
  --max-time 60 | jq '.'
echo ""
echo ""

# ============================================
# 10. SINCRONIZAÇÃO COM VERBOSE
# ============================================
echo "🔟 Sincronização com Output Verbose"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -v -X POST "${API_URL}/api/sync-apontamentos-incremental" \
  -H "Content-Type: application/json" \
  -d '{"limite": 5}' 2>&1 | grep -E "(HTTP|Content-Type|sucesso|total_processados)"
echo ""
echo ""

# ============================================
# 11. SALVAR RESULTADO EM ARQUIVO
# ============================================
echo "1️⃣1️⃣  Salvar Resultado em Arquivo JSON"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
OUTPUT_FILE="sync-result-$(date +%Y%m%d-%H%M%S).json"
curl -s -X POST "${API_URL}/api/sync-apontamentos-incremental" \
  -H "Content-Type: application/json" \
  -d '{"limite": 10}' > "${OUTPUT_FILE}"
echo "✅ Resultado salvo em: ${OUTPUT_FILE}"
cat "${OUTPUT_FILE}" | jq '.'
echo ""
echo ""

# ============================================
# 12. LOOP DE SINCRONIZAÇÃO (BATCH)
# ============================================
echo "1️⃣2️⃣  Loop de Sincronização em Lotes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Executando 3 lotes de 10 registros cada..."
for i in {1..3}; do
  echo ""
  echo "Lote ${i}/3:"
  curl -s -X POST "${API_URL}/api/sync-apontamentos-incremental" \
    -H "Content-Type: application/json" \
    -d '{"limite": 10}' | jq '{lote: '${i}', total_processados, novos, atualizados, ignorados, erros}'
  
  # Aguardar 2 segundos entre lotes
  if [ $i -lt 3 ]; then
    echo "Aguardando 2 segundos..."
    sleep 2
  fi
done
echo ""
echo ""

# ============================================
# 13. MONITORAMENTO CONTÍNUO
# ============================================
echo "1️⃣3️⃣  Monitoramento Contínuo (Ctrl+C para parar)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Executando sincronização a cada 10 segundos..."
echo "Pressione Ctrl+C para parar"
echo ""

# Descomentar para ativar monitoramento contínuo
# while true; do
#   TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
#   echo "[$TIMESTAMP] Executando sincronização..."
#   
#   RESULT=$(curl -s -X POST "${API_URL}/api/sync-apontamentos-incremental" \
#     -H "Content-Type: application/json" \
#     -d '{"limite": 50}')
#   
#   echo "$RESULT" | jq '{timestamp: "'${TIMESTAMP}'", total_processados, novos, atualizados, ignorados, erros}'
#   
#   echo "Aguardando 10 segundos..."
#   sleep 10
#   echo ""
# done

echo "Comando comentado para evitar execução acidental"
echo ""
echo ""

# ============================================
# DICAS E BOAS PRÁTICAS
# ============================================
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  DICAS E BOAS PRÁTICAS                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Use sincronização incremental para melhor performance"
echo "✅ Ajuste o limite conforme necessidade (padrão: 500)"
echo "✅ Execute a cada 5-15 minutos para sincronização quase real-time"
echo "✅ Monitore logs do servidor para troubleshooting"
echo "✅ Verifique campo Data_Ult_Modificacao_Geral no SQL Server"
echo "✅ Crie índices para melhor performance"
echo ""
echo "⚠️  Evite sincronização completa em produção"
echo "⚠️  Use timeout adequado para grandes volumes"
echo "⚠️  Monitore erros e ajuste limite se necessário"
echo ""
echo "📚 Documentação completa: README_INCREMENTAL_SYNC.md"
echo "📚 Documentação técnica: SINCRONIZACAO_INCREMENTAL.md"
echo ""
