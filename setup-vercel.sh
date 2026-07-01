#!/bin/bash

echo "🚀 Configurando variáveis de produção no Vercel..."

# Adicionar DATABASE_URL
echo "📦 Adicionando DATABASE_URL..."
vercel env add DATABASE_URL production --value "postgresql://postgres:JSL@1%!Ximz@db.zaboxrzdfxzisorfkbeh.supabase.co:5432/postgres" --yes

# Adicionar NEXTAUTH_URL
echo "🔐 Adicionando NEXTAUTH_URL..."
vercel env add NEXTAUTH_URL production --value "https://academy.valecursoseconsultoria.com.br" --yes

# Gerar NEXTAUTH_SECRET
SECRET=$(openssl rand -base64 32)
echo "🔑 Adicionando NEXTAUTH_SECRET..."
vercel env add NEXTAUTH_SECRET production --value "$SECRET" --yes

# Adicionar NODE_ENV
echo "⚙️ Adicionando NODE_ENV..."
vercel env add NODE_ENV production --value "production" --yes

echo "✅ Variáveis configuradas!"
echo "🚀 Fazendo redeploy..."
vercel redeploy

echo "✨ Pronto! Seu site está online em:"
echo "📍 https://academy.valecursoseconsultoria.com.br"
