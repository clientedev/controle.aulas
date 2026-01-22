import { pgTable, text, serial, integer, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === DEFINIÇÕES DE TABELAS ===

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").unique().notNull(),
  senha: text("senha").notNull(),
  perfil: text("perfil").notNull().default("professor"), // "professor" ou "admin"
  criadoEm: timestamp("criado_em").defaultNow(),
});

export const turmas = pgTable("turmas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(), // ex: "Turma A - 2024"
  unidadeCurricular: text("unidade_curricular").notNull(), // ex: "Lógica de Programação"
  ano: integer("ano").notNull(),
  semestre: integer("semestre").notNull(), // 1 ou 2
  professorId: integer("professor_id").references(() => usuarios.id).notNull(),
});

export const alunos = pgTable("alunos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  matricula: text("matricula").unique().notNull(),
  email: text("email"),
});

export const matriculas = pgTable("matriculas", {
  id: serial("id").primaryKey(),
  turmaId: integer("turma_id").references(() => turmas.id).notNull(),
  alunoId: integer("aluno_id").references(() => alunos.id).notNull(),
});

export const avaliacoes = pgTable("avaliacoes", {
  id: serial("id").primaryKey(),
  turmaId: integer("turma_id").references(() => turmas.id).notNull(),
  nome: text("nome").notNull(), // ex: "Prova 1", "Trabalho Final"
  notaMaxima: doublePrecision("nota_maxima").notNull().default(10.0),
  peso: doublePrecision("peso").default(1.0),
});

export const notas = pgTable("notas", {
  id: serial("id").primaryKey(),
  avaliacaoId: integer("avaliacao_id").references(() => avaliacoes.id).notNull(),
  alunoId: integer("aluno_id").references(() => alunos.id).notNull(),
  valor: doublePrecision("valor").notNull(),
});

// === RELAÇÕES ===

export const usuariosRelations = relations(usuarios, ({ many }) => ({
  turmas: many(turmas),
}));

export const turmasRelations = relations(turmas, ({ one, many }) => ({
  professor: one(usuarios, {
    fields: [turmas.professorId],
    references: [usuarios.id],
  }),
  matriculas: many(matriculas),
  avaliacoes: many(avaliacoes),
}));

export const alunosRelations = relations(alunos, ({ many }) => ({
  matriculas: many(matriculas),
  notas: many(notas),
}));

export const matriculasRelations = relations(matriculas, ({ one }) => ({
  turma: one(turmas, {
    fields: [matriculas.turmaId],
    references: [turmas.id],
  }),
  aluno: one(alunos, {
    fields: [matriculas.alunoId],
    references: [alunos.id],
  }),
}));

export const avaliacoesRelations = relations(avaliacoes, ({ one, many }) => ({
  turma: one(turmas, {
    fields: [avaliacoes.turmaId],
    references: [turmas.id],
  }),
  notas: many(notas),
}));

export const notasRelations = relations(notas, ({ one }) => ({
  avaliacao: one(avaliacoes, {
    fields: [notas.avaliacaoId],
    references: [avaliacoes.id],
  }),
  aluno: one(alunos, {
    fields: [notas.alunoId],
    references: [alunos.id],
  }),
}));

// === ESQUEMAS DE INSERÇÃO ===

export const insertUsuarioSchema = createInsertSchema(usuarios).omit({ id: true, criadoEm: true });
export const insertTurmaSchema = createInsertSchema(turmas).omit({ id: true });
export const insertAlunoSchema = createInsertSchema(alunos).omit({ id: true });
export const insertMatriculaSchema = createInsertSchema(matriculas).omit({ id: true });
export const insertAvaliacaoSchema = createInsertSchema(avaliacoes).omit({ id: true });
export const insertNotaSchema = createInsertSchema(notas).omit({ id: true });

// === TIPOS DE CONTRATO DA API ===

export type Usuario = typeof usuarios.$inferSelect;
export type InsertUsuario = z.infer<typeof insertUsuarioSchema>;
export type Turma = typeof turmas.$inferSelect;
export type InsertTurma = z.infer<typeof insertTurmaSchema>;
export type Aluno = typeof alunos.$inferSelect;
export type InsertAluno = z.infer<typeof insertAlunoSchema>;
export type Matricula = typeof matriculas.$inferSelect;
export type Avaliacao = typeof avaliacoes.$inferSelect;
export type InsertAvaliacao = z.infer<typeof insertAvaliacaoSchema>;
export type Nota = typeof notas.$inferSelect;
export type InsertNota = z.infer<typeof insertNotaSchema>;

export type CriarTurmaRequest = Omit<InsertTurma, "professorId">;
export type AtualizarTurmaRequest = Partial<CriarTurmaRequest>;

export type CriarAlunoRequest = InsertAluno;
export type MatricularAlunoRequest = { alunoId: number };

export type CriarAvaliacaoRequest = InsertAvaliacao;
export type AtualizarNotaRequest = { valor: number };

export type TurmaComDetalhes = Turma & {
  contagemAlunos?: number;
};
