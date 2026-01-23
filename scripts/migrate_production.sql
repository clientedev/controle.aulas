-- Script de migração para o ambiente de produção (Railway)
-- Este script adiciona suporte a horários e métodos de registro na tabela de frequência

-- 1. Se a tabela já existir, vamos garantir que ela tenha as novas colunas
-- Nota: O Railway/Postgres não suporta casting automático de TEXT para INTEGER se houver dados complexos,
-- por isso, se houver dados importantes, recomendamos backup.

-- Adicionando novas colunas se não existirem
ALTER TABLE frequencia ADD COLUMN IF NOT EXISTS horario TEXT;
ALTER TABLE frequencia ADD COLUMN IF NOT EXISTS metodo TEXT DEFAULT 'manual';

-- Convertendo a coluna status para INTEGER caso seja TEXT (padrão do Drizzle push quando há mudança de tipo)
-- Usando uma coluna temporária para garantir a migração segura dos dados
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'frequencia' 
        AND column_name = 'status' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE frequencia RENAME COLUMN status TO status_old;
        ALTER TABLE frequencia ADD COLUMN status INTEGER NOT NULL DEFAULT 1;
        
        -- Mapeando valores antigos se necessário
        UPDATE frequencia SET status = CASE 
            WHEN status_old = 'presente' THEN 1 
            WHEN status_old = 'falta' THEN 0 
            ELSE 1 
        END;
        
        ALTER TABLE frequencia DROP COLUMN status_old;
    END IF;
END $$;

-- Garantindo que a coluna status seja INTEGER e NOT NULL
ALTER TABLE frequencia ALTER COLUMN status SET DEFAULT 1;
ALTER TABLE frequencia ALTER COLUMN status SET NOT NULL;
