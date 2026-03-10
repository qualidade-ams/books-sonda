#!/bin/bash

# Script para deploy de todas as Edge Functions do Supabase
# Uso: ./deploy-functions.sh

echo "🚀 Iniciando deploy das Edge Functions..."
echo ""

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI não encontrado!"
    echo "📦 Instale com: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Verificar se está logado
if ! supabase projects list &> /dev/null
then
    echo "❌ Não está logado no Supabase!"
    echo "🔐 Faça login com: supabase login"
    exit 1
fi

echo "✅ Autenticado no Supabase"
echo ""

# Verificar se o projeto está linkado
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Projeto não está linkado"
    echo "🔗 Linkando projeto..."
    supabase link --project-ref qiahexepsdggkzgmklhq
    
    if [ $? -ne 0 ]; then
        echo "❌ Erro ao linkar projeto"
        exit 1
    fi
    
    echo "✅ Projeto linkado com sucesso"
    echo ""
fi

# Deploy das funções
echo "📦 Deployando funções..."
echo ""

# 1. create-user
echo "1️⃣  Deployando create-user..."
supabase functions deploy create-user

if [ $? -eq 0 ]; then
    echo "✅ create-user deployada com sucesso"
else
    echo "❌ Erro ao deployar create-user"
fi
echo ""

# 2. admin-reset-password
echo "2️⃣  Deployando admin-reset-password..."
supabase functions deploy admin-reset-password

if [ $? -eq 0 ]; then
    echo "✅ admin-reset-password deployada com sucesso"
else
    echo "❌ Erro ao deployar admin-reset-password"
fi
echo ""

# 3. sync-elogios-sql-server (se existir)
if [ -f "supabase/functions/sync-elogios-sql-server/index.ts" ]; then
    echo "3️⃣  Deployando sync-elogios-sql-server..."
    supabase functions deploy sync-elogios-sql-server
    
    if [ $? -eq 0 ]; then
        echo "✅ sync-elogios-sql-server deployada com sucesso"
    else
        echo "❌ Erro ao deployar sync-elogios-sql-server"
    fi
    echo ""
fi

# Listar funções deployadas
echo "📋 Funções deployadas:"
supabase functions list

echo ""
echo "🎉 Deploy concluído!"
