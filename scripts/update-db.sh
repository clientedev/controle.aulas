#!/bin/bash
# Script para atualizar o banco de dados e forçar redeploy (simulado para Railway/Replit context)
echo "Sincronizando banco de dados com Drizzle..."
npm run db:push -- --force
echo "Banco de dados atualizado com sucesso."
