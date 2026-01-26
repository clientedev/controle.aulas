#!/bin/bash
echo "Railway: Iniciando sincronização forçada do banco de dados..."

if [ -z "$DATABASE_URL" ]; then
  echo "Erro: DATABASE_URL não definida."
  exit 0
fi

# Tenta adicionar as colunas via SQL puro primeiro
psql "$DATABASE_URL" -c "ALTER TABLE frequencia ADD COLUMN IF NOT EXISTS metodo text DEFAULT 'manual'; ALTER TABLE frequencia ADD COLUMN IF NOT EXISTS horario text; UPDATE frequencia SET metodo = 'manual' WHERE metodo IS NULL;"

# Sincroniza via drizzle-kit
npx drizzle-kit push --force

echo "Railway: Sincronização concluída."
