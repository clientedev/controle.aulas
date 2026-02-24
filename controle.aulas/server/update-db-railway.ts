import { db } from "./db";
import { sql } from "drizzle-orm";

async function updateDb() {
  console.log("Iniciando atualização do banco de dados no Railway...");
  try {

    // ── Garantir todas as tabelas base existam ──────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        nome TEXT NOT NULL,
        senha TEXT NOT NULL,
        pin_registro TEXT,
        perfil TEXT NOT NULL DEFAULT 'professor',
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS turmas (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        descricao TEXT,
        professor_id INTEGER REFERENCES usuarios(id),
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS alunos (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT,
        matricula TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS matriculas (
        id SERIAL PRIMARY KEY,
        aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
        turma_id INTEGER NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS unidades_curriculares (
        id SERIAL PRIMARY KEY,
        turma_id INTEGER NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS avaliacoes (
        id SERIAL PRIMARY KEY,
        turma_id INTEGER NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
        unidade_curricular_id INTEGER REFERENCES unidades_curriculares(id) ON DELETE SET NULL,
        nome TEXT NOT NULL,
        nota_maxima NUMERIC NOT NULL DEFAULT 10,
        peso NUMERIC NOT NULL DEFAULT 1,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notas (
        id SERIAL PRIMARY KEY,
        aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
        avaliacao_id INTEGER NOT NULL REFERENCES avaliacoes(id) ON DELETE CASCADE,
        valor NUMERIC,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS horarios (
        id SERIAL PRIMARY KEY,
        turma_id INTEGER NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
        dia_semana TEXT NOT NULL,
        hora_inicio TEXT NOT NULL,
        hora_fim TEXT NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS frequencia (
        id SERIAL PRIMARY KEY,
        turma_id INTEGER NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
        aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        status INTEGER NOT NULL DEFAULT 0,
        horario TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS fotos_alunos (
        id SERIAL PRIMARY KEY,
        aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
        foto_url TEXT NOT NULL,
        descritores TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS criterios_avaliacao (
        id SERIAL PRIMARY KEY,
        unidade_curricular_id INTEGER REFERENCES unidades_curriculares(id) ON DELETE CASCADE,
        avaliacao_id INTEGER REFERENCES avaliacoes(id) ON DELETE CASCADE,
        descricao TEXT NOT NULL,
        peso NUMERIC NOT NULL DEFAULT 1
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS criterios_atendidos (
        id SERIAL PRIMARY KEY,
        criterio_id INTEGER NOT NULL REFERENCES criterios_avaliacao(id) ON DELETE CASCADE,
        aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
        atendido INTEGER NOT NULL DEFAULT 0
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notas_criterios (
        id SERIAL PRIMARY KEY,
        nota_id INTEGER NOT NULL REFERENCES notas(id) ON DELETE CASCADE,
        criterio_id INTEGER NOT NULL REFERENCES criterios_avaliacao(id) ON DELETE CASCADE,
        valor NUMERIC
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS salas (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        capacidade INTEGER,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS computadores (
        id SERIAL PRIMARY KEY,
        sala_id INTEGER NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
        numero INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'disponivel',
        observacao TEXT
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ocorrencias_computador (
        id SERIAL PRIMARY KEY,
        computador_id INTEGER NOT NULL REFERENCES computadores(id) ON DELETE CASCADE,
        descricao TEXT NOT NULL,
        resolvido INTEGER NOT NULL DEFAULT 0,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ocorrencias_aluno (
        id SERIAL PRIMARY KEY,
        aluno_id INTEGER NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
        turma_id INTEGER REFERENCES turmas(id) ON DELETE SET NULL,
        descricao TEXT NOT NULL,
        resolvido INTEGER NOT NULL DEFAULT 0,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Corrigir colunas com tipo incorreto ─────────────────────────────────
    // frequencia.status pode ser boolean ou varchar no banco legado
    await db.execute(sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'frequencia' AND column_name = 'status'
          AND data_type IN ('boolean','character varying','text','character')
        ) THEN
          ALTER TABLE frequencia ALTER COLUMN status TYPE integer
            USING CASE WHEN status::text IN ('true','1','t') THEN 1 ELSE 0 END;
        END IF;
      END $$;
    `);

    // ── Colunas adicionadas em versões posteriores ───────────────────────────
    await db.execute(sql`ALTER TABLE salas ADD COLUMN IF NOT EXISTS anotacoes TEXT;`);
    await db.execute(sql`ALTER TABLE alunos ADD COLUMN IF NOT EXISTS foto_url TEXT;`);
    await db.execute(sql`ALTER TABLE turmas ADD COLUMN IF NOT EXISTS turno TEXT;`);
    await db.execute(sql`ALTER TABLE turmas ADD COLUMN IF NOT EXISTS curso TEXT;`);

    console.log("Banco de dados sincronizado com sucesso!");
    process.exit(0);
  } catch (err) {
    console.error("Erro ao atualizar banco de dados no Railway:", err);
    process.exit(1);
  }
}

updateDb();
