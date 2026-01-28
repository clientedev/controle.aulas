import { db } from "./db";
import { sql } from "drizzle-orm";

async function runUpdate() {
  console.log("Starting database update script...");
  try {
    // Adiciona a coluna unidade_curricular_id se ela não existir
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='criterios_avaliacao' AND column_name='unidade_curricular_id'
        ) THEN
          ALTER TABLE "criterios_avaliacao" ADD COLUMN "unidade_curricular_id" INTEGER NOT NULL;
        END IF;
      END $$;
    `);
    console.log("Database update completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error updating database:", error);
    process.exit(1);
  }
}

runUpdate();
