import { db } from "./db";
import { sql } from "drizzle-orm";

async function updateDb() {
  console.log("Iniciando atualização do banco de dados no Railway...");
  try {
    // Adicionar coluna anotacoes na tabela salas
    await db.execute(sql`ALTER TABLE salas ADD COLUMN IF NOT EXISTS anotacoes TEXT;`);
    console.log("Coluna 'anotacoes' verificada/adicionada na tabela 'salas'.");

    // Criar tabela ocorrencias_computador se não existir
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ocorrencias_computador (
        id SERIAL PRIMARY KEY,
        computador_id INTEGER NOT NULL REFERENCES computadores(id) ON DELETE CASCADE,
        descricao TEXT NOT NULL,
        resolvido INTEGER NOT NULL DEFAULT 0,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("Tabela 'ocorrencias_computador' verificada/criada.");

    // Corrigir coluna status na tabela frequencia se necessário
    await db.execute(sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'frequencia' 
          AND column_name = 'status' 
          AND data_type = 'character varying'
        ) THEN
          ALTER TABLE frequencia ALTER COLUMN status TYPE integer USING status::integer;
        END IF;
      END $$;
    `);
    console.log("Coluna 'status' na tabela 'frequencia' verificada/convertida.");

    console.log("Sincronização concluída com sucesso!");
    process.exit(0);
  } catch (err) {
    console.error("Erro ao atualizar banco de dados no Railway:", err);
    process.exit(1);
  }
}

updateDb();
