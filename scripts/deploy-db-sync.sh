#!/bin/bash
# Script de sincronização automática do banco de dados para o deploy no Railway
echo "Iniciando sincronização do banco de dados..."

# Garantir que as colunas críticas existam usando SQL bruto
# Substitua o DATABASE_URL se necessário, mas geralmente ele vem do ambiente
psql "$DATABASE_URL" -c "
DO \$\$ 
BEGIN 
    -- Coluna metodo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='frequencia' AND column_name='metodo') THEN
        ALTER TABLE frequencia ADD COLUMN metodo text DEFAULT 'manual';
        RAISE NOTICE 'Coluna metodo criada.';
    END IF;
    
    -- Coluna horario
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='frequencia' AND column_name='horario') THEN
        ALTER TABLE frequencia ADD COLUMN horario text;
        RAISE NOTICE 'Coluna horario criada.';
    END IF;
END \$\$;"

# Sincronizar o restante do esquema via Drizzle (sem interatividade)
npx drizzle-kit push --force

echo "Sincronização concluída com sucesso!"
