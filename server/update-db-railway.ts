import { db } from "./db";
import { sql } from "drizzle-orm";

async function runUpdate() {
  console.log("Iniciando script de atualização do banco de dados (Railway)...");
  try {
    // 1. Limpar a tabela criterios_avaliacao se tiver dados antigos incompatíveis
    console.log("Verificando estrutura da tabela criterios_avaliacao...");
    
    // Verificar se a coluna antiga avaliacao_id existe
    const hasOldColumn = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='criterios_avaliacao' AND column_name='avaliacao_id'
      ) as exists_col;
    `);
    
    const oldColumnExists = (hasOldColumn as any)?.[0]?.exists_col === true;
    
    if (oldColumnExists) {
      console.log("Estrutura antiga detectada (avaliacao_id). Migrando...");
      
      // Truncar dados antigos pois são incompatíveis
      await db.execute(sql`TRUNCATE TABLE "criterios_avaliacao" CASCADE;`);
      
      // Remover colunas antigas
      await db.execute(sql`
        ALTER TABLE "criterios_avaliacao" 
        DROP COLUMN IF EXISTS "avaliacao_id",
        DROP COLUMN IF EXISTS "porcentagem";
      `);
      
      console.log("Colunas antigas removidas.");
    }
    
    // 2. Adicionar coluna unidade_curricular_id se não existir
    console.log("Verificando coluna unidade_curricular_id...");
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='criterios_avaliacao' AND column_name='unidade_curricular_id'
        ) THEN
          ALTER TABLE "criterios_avaliacao" ADD COLUMN "unidade_curricular_id" INTEGER;
        END IF;
      END $$;
    `);
    
    // 3. Adicionar coluna peso se não existir
    console.log("Verificando coluna peso...");
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='criterios_avaliacao' AND column_name='peso'
        ) THEN
          ALTER TABLE "criterios_avaliacao" ADD COLUMN "peso" DOUBLE PRECISION DEFAULT 1.0 NOT NULL;
        END IF;
      END $$;
    `);
    
    // 4. Adicionar foreign key se não existir
    console.log("Verificando foreign key...");
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name='criterios_avaliacao_unidade_curricular_id_unidades_curriculares_id_fk'
          AND table_name='criterios_avaliacao'
        ) THEN
          ALTER TABLE "criterios_avaliacao" 
          ADD CONSTRAINT "criterios_avaliacao_unidade_curricular_id_unidades_curriculares_id_fk" 
          FOREIGN KEY ("unidade_curricular_id") 
          REFERENCES "unidades_curriculares"("id") 
          ON DELETE CASCADE;
        END IF;
      EXCEPTION
        WHEN others THEN
          RAISE NOTICE 'Could not add foreign key: %', SQLERRM;
      END $$;
    `);
    
    // 5. Tornar unidade_curricular_id NOT NULL (se não houver dados nulos)
    console.log("Atualizando constraints...");
    await db.execute(sql`
      DO $$
      BEGIN
        -- Remove registros órfãos
        DELETE FROM "criterios_avaliacao" WHERE "unidade_curricular_id" IS NULL;
        
        -- Tenta definir NOT NULL
        BEGIN
          ALTER TABLE "criterios_avaliacao" ALTER COLUMN "unidade_curricular_id" SET NOT NULL;
        EXCEPTION
          WHEN others THEN
            RAISE NOTICE 'Could not set NOT NULL: %', SQLERRM;
        END;
      END $$;
    `);
    
    console.log("Atualização do banco de dados concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("Erro ao atualizar o banco de dados:", error);
    process.exit(1);
  }
}

runUpdate();
