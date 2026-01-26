#!/bin/bash
echo "🚀 Iniciando processo de atualização no Railway..."

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Build do frontend e backend
echo "🏗️ Construindo o projeto..."
npm run build

# Sincronizar o banco de dados
echo "🗄️ Sincronizando o banco de dados..."
npm run db:push:force

echo "✅ Atualização concluída com sucesso!"
