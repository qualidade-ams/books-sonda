#!/bin/bash
# Script para sincronizar casos em lotes de 50 via /api/sync-pesquisas-por-chamados

API_URL="http://localhost:3001"

# Lista completa de casos
CASOS=(
4648072
7216882
7391749
7883424
7883424
7883424
8356693
8787289
9010819
9010819
)

# Configurações
BATCH_SIZE=50
TOTAL=${#CASOS[@]}
LOTE=1
INSERIDOS=0
ATUALIZADOS=0
IGNORADOS=0
ERROS=0

echo "============================================"
echo "  SYNC DE PESQUISAS POR CASOS"
echo "  Total de casos: $TOTAL"
echo "  Lotes de: $BATCH_SIZE"
echo "  API: $API_URL"
echo "============================================"
echo ""

# Processar em lotes de 50
for (( i=0; i<TOTAL; i+=BATCH_SIZE )); do
  # Montar JSON do lote atual
  BATCH=("${CASOS[@]:$i:$BATCH_SIZE}")
  BATCH_COUNT=${#BATCH[@]}
  FIM=$((i + BATCH_COUNT))

  # Construir array JSON: ["caso1","caso2",...]
  JSON_ARRAY=$(printf '"%s",' "${BATCH[@]}")
  JSON_ARRAY="[${JSON_ARRAY%,}]"

  echo "--- Lote $LOTE (casos $((i+1)) a $FIM de $TOTAL) ---"

  RESP=$(curl -s -X POST "$API_URL/api/sync-pesquisas-por-chamados" \
    -H "Content-Type: application/json" \
    -d "{\"chamados\": $JSON_ARRAY}")

  # Extrair contadores do JSON de resposta (sem jq)
  INS=$(echo "$RESP" | grep -o '"novos":[0-9]*' | grep -o '[0-9]*')
  ATU=$(echo "$RESP" | grep -o '"atualizados":[0-9]*' | grep -o '[0-9]*')
  IGN=$(echo "$RESP" | grep -o '"ignorados":[0-9]*' | grep -o '[0-9]*')
  ERR=$(echo "$RESP" | grep -o '"erros":[0-9]*' | grep -o '[0-9]*')

  INS=${INS:-0}; ATU=${ATU:-0}; IGN=${IGN:-0}; ERR=${ERR:-0}

  echo "  inseridos=$INS  atualizados=$ATU  ignorados=$IGN  erros=$ERR"

  INSERIDOS=$((INSERIDOS + INS))
  ATUALIZADOS=$((ATUALIZADOS + ATU))
  IGNORADOS=$((IGNORADOS + IGN))
  ERROS=$((ERROS + ERR))

  LOTE=$((LOTE + 1))
  sleep 1  # Pausa entre lotes para não sobrecarregar
done

echo ""
echo "============================================"
echo "  RESULTADO FINAL"
echo "  Inseridos  : $INSERIDOS"
echo "  Atualizados: $ATUALIZADOS"
echo "  Ignorados  : $IGNORADOS"
echo "  Erros      : $ERROS"
echo "============================================"
