import { db } from "./db";
import { sql } from "drizzle-orm";

async function runUpdate() {
  console.log("Iniciando script de atualização do banco de dados (Railway)...");
  try {
    // 1. Garantir que a coluna unidade_curricular_id existe na tabela criterios_avaliacao
    console.log("Verificando coluna unidade_curricular_id em criterios_avaliacao...");
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='criterios_avaliacao' AND column_name='unidade_curricular_id'
        ) THEN
          ALTER TABLE "criterios_avaliacao" ADD COLUMN "unidade_curricular_id" INTEGER;
          
          -- Tenta preencher dados se a tabela não estiver vazia (opcional, dependendo da lógica do app)
          -- ALTER TABLE "criterios_avaliacao" ALTER COLUMN "unidade_curricular_id" SET NOT NULL;
        END IF;
      END $$;
    `);

    // 2. Sincronizar outras tabelas se necessário (equivalente ao db:push do drizzle)
    // No Railway, geralmente rodamos as migrations ou o push diretamente.
    
    console.log("Atualização concluída com sucesso.");
    process.exit(0);
  } catch (error) {
    console.error("Erro ao atualizar o banco de dados:", error);
    process.exit(1);
  }
}

runUpdate();
