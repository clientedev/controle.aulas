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
  pinRegistro: text("pin_registro"), // PIN para login rápido em tablet
  perfil: text("perfil").notNull().default("professor"), // "professor" ou "admin"
  criadoEm: timestamp("criado_em").defaultNow(),
});

export const turmas = pgTable("turmas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(), // ex: "Turma A - 2024"
  ano: integer("ano").notNull(),
  semestre: integer("semestre").notNull(), // 1 ou 2
  professorId: integer("professor_id").references(() => usuarios.id, { onDelete: "cascade" }).notNull(),
});

export const unidadesCurriculares = pgTable("unidades_curriculares", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  turmaId: integer("turma_id").references(() => turmas.id, { onDelete: "cascade" }).notNull(),
});

export const alunos = pgTable("alunos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  matricula: text("matricula").unique().notNull(),
  email: text("email"),
});

export const matriculas = pgTable("matriculas", {
  id: serial("id").primaryKey(),
  turmaId: integer("turma_id").references(() => turmas.id, { onDelete: "cascade" }).notNull(),
  alunoId: integer("aluno_id").references(() => alunos.id, { onDelete: "cascade" }).notNull(),
});

export const avaliacoes = pgTable("avaliacoes", {
  id: serial("id").primaryKey(),
  unidadeCurricularId: integer("unidade_curricular_id").references(() => unidadesCurriculares.id, { onDelete: "cascade" }).notNull(),
  nome: text("nome").notNull(), // ex: "Prova 1", "Trabalho Final"
  notaMaxima: doublePrecision("nota_maxima").notNull().default(10.0),
  peso: doublePrecision("peso").default(1.0),
});

export const criteriosAvaliacao = pgTable("criterios_avaliacao", {
  id: serial("id").primaryKey(),
  unidadeCurricularId: integer("unidade_curricular_id").references(() => unidadesCurriculares.id, { onDelete: "cascade" }).notNull(),
  descricao: text("descricao").notNull(),
  peso: doublePrecision("peso").notNull().default(1.0),
});

export const criteriosAtendidos = pgTable("criterios_atendidos", {
  id: serial("id").primaryKey(),
  alunoId: integer("aluno_id").references(() => alunos.id, { onDelete: "cascade" }).notNull(),
  criterioId: integer("criterio_id").references(() => criteriosAvaliacao.id, { onDelete: "cascade" }).notNull(),
  atendido: integer("atendido").notNull().default(0), // 0: não, 1: sim
});

export const notasCriterios = pgTable("notas_criterios", {
  id: serial("id").primaryKey(),
  alunoId: integer("aluno_id").references(() => alunos.id, { onDelete: "cascade" }).notNull(),
  unidadeCurricularId: integer("unidade_curricular_id").references(() => unidadesCurriculares.id, { onDelete: "cascade" }).notNull(),
  aproveitamento: doublePrecision("aproveitamento").notNull(), // Porcentagem (ex: 0.70 para 70%)
});

export const notas = pgTable("notas", {
  id: serial("id").primaryKey(),
  avaliacaoId: integer("avaliacao_id").references(() => avaliacoes.id, { onDelete: "cascade" }).notNull(),
  alunoId: integer("aluno_id").references(() => alunos.id, { onDelete: "cascade" }).notNull(),
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
  unidadesCurriculares: many(unidadesCurriculares),
  matriculas: many(matriculas),
}));

export const unidadesCurricularesRelations = relations(unidadesCurriculares, ({ one, many }) => ({
  turma: one(turmas, {
    fields: [unidadesCurriculares.turmaId],
    references: [turmas.id],
  }),
  avaliacoes: many(avaliacoes),
  criterios: many(criteriosAvaliacao),
  notasCriterios: many(notasCriterios),
}));

export const alunosRelations = relations(alunos, ({ many }) => ({
  matriculas: many(matriculas),
  notas: many(notas),
  criteriosAtendidos: many(criteriosAtendidos),
  notasCriterios: many(notasCriterios),
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
  unidadeCurricular: one(unidadesCurriculares, {
    fields: [avaliacoes.unidadeCurricularId],
    references: [unidadesCurriculares.id],
  }),
  notas: many(notas),
}));

export const criteriosAvaliacaoRelations = relations(criteriosAvaliacao, ({ one, many }) => ({
  unidadeCurricular: one(unidadesCurriculares, {
    fields: [criteriosAvaliacao.unidadeCurricularId],
    references: [unidadesCurriculares.id],
  }),
  atendimentos: many(criteriosAtendidos),
}));

export const criteriosAtendidosRelations = relations(criteriosAtendidos, ({ one }) => ({
  aluno: one(alunos, {
    fields: [criteriosAtendidos.alunoId],
    references: [alunos.id],
  }),
  criterio: one(criteriosAvaliacao, {
    fields: [criteriosAtendidos.criterioId],
    references: [criteriosAvaliacao.id],
  }),
}));

export const notasCriteriosRelations = relations(notasCriterios, ({ one }) => ({
  aluno: one(alunos, {
    fields: [notasCriterios.alunoId],
    references: [alunos.id],
  }),
  unidadeCurricular: one(unidadesCurriculares, {
    fields: [notasCriterios.unidadeCurricularId],
    references: [unidadesCurriculares.id],
  }),
}));

export const horarios = pgTable("horarios", {
  id: serial("id").primaryKey(),
  turmaId: integer("turma_id").references(() => turmas.id, { onDelete: "cascade" }).notNull(),
  diaSemana: integer("dia_semana").notNull(), // 0-6 (dom-sab)
  horarioInicio: text("horario_inicio").notNull(), // HH:mm
  horarioFim: text("horario_fim").notNull(), // HH:mm
});

export const frequencia = pgTable("frequencia", {
  id: serial("id").primaryKey(),
  alunoId: integer("aluno_id").references(() => alunos.id, { onDelete: "cascade" }).notNull(),
  turmaId: integer("turma_id").references(() => turmas.id, { onDelete: "cascade" }).notNull(),
  data: text("data").notNull(), // YYYY-MM-DD
  status: integer("status").notNull().default(1), // 0: falta, 1: presente
  horario: text("horario"), // HH:mm
  metodo: text("metodo"), // "manual" ou "facial"
});

export const fotosAlunos = pgTable("fotos_alunos", {
  id: serial("id").primaryKey(),
  alunoId: integer("aluno_id").references(() => alunos.id, { onDelete: "cascade" }).notNull(),
  objectPath: text("object_path"), // Mantido para compatibilidade
  fotoBase64: text("foto_base64"), // Nova coluna para armazenar a imagem no banco
  criadoEm: timestamp("criado_em").defaultNow(),
});

export const horariosRelations = relations(horarios, ({ one }) => ({
  turma: one(turmas, {
    fields: [horarios.turmaId],
    references: [turmas.id],
  }),
}));

export const frequenciaRelations = relations(frequencia, ({ one }) => ({
  aluno: one(alunos, {
    fields: [frequencia.alunoId],
    references: [alunos.id],
  }),
  turma: one(turmas, {
    fields: [frequencia.turmaId],
    references: [turmas.id],
  }),
}));

export const fotosAlunosRelations = relations(fotosAlunos, ({ one }) => ({
  aluno: one(alunos, {
    fields: [fotosAlunos.alunoId],
    references: [alunos.id],
  }),
}));

// === ESQUEMAS DE INSERÇÃO ===

export const insertUsuarioSchema = createInsertSchema(usuarios).omit({ id: true, criadoEm: true });
export const insertTurmaSchema = createInsertSchema(turmas).omit({ id: true });
export const insertUnidadeCurricularSchema = createInsertSchema(unidadesCurriculares).omit({ id: true });
export const insertAlunoSchema = createInsertSchema(alunos).omit({ id: true });
export const insertMatriculaSchema = createInsertSchema(matriculas).omit({ id: true });
export const insertAvaliacaoSchema = createInsertSchema(avaliacoes).omit({ id: true });
export const insertNotaSchema = createInsertSchema(notas).omit({ id: true });
export const insertHorarioSchema = createInsertSchema(horarios).omit({ id: true });
export const insertFrequenciaSchema = createInsertSchema(frequencia).omit({ id: true });
export const insertFotoAlunoSchema = createInsertSchema(fotosAlunos).omit({ id: true, criadoEm: true });
export const insertCriterioAvaliacaoSchema = createInsertSchema(criteriosAvaliacao).omit({ id: true });
export const insertCriterioAtendidoSchema = createInsertSchema(criteriosAtendidos).omit({ id: true });
export const insertNotaCriterioSchema = createInsertSchema(notasCriterios).omit({ id: true });

// === TIPOS DE CONTRATO DA API ===

export type Usuario = typeof usuarios.$inferSelect;
export type InsertUsuario = z.infer<typeof insertUsuarioSchema>;
export type Turma = typeof turmas.$inferSelect;
export type InsertTurma = z.infer<typeof insertTurmaSchema>;
export type UnidadeCurricular = typeof unidadesCurriculares.$inferSelect;
export type InsertUnidadeCurricular = z.infer<typeof insertUnidadeCurricularSchema>;
export type Aluno = typeof alunos.$inferSelect;
export type InsertAluno = z.infer<typeof insertAlunoSchema>;
export type Matricula = typeof matriculas.$inferSelect;
export type Avaliacao = typeof avaliacoes.$inferSelect;
export type InsertAvaliacao = z.infer<typeof insertAvaliacaoSchema>;
export type Nota = typeof notas.$inferSelect;
export type InsertNota = z.infer<typeof insertNotaSchema>;
export type Horario = typeof horarios.$inferSelect;
export type InsertHorario = z.infer<typeof insertHorarioSchema>;
export type Frequencia = typeof frequencia.$inferSelect;
export type InsertFrequencia = z.infer<typeof insertFrequenciaSchema>;
export type FotoAluno = typeof fotosAlunos.$inferSelect;
export type InsertFotoAluno = z.infer<typeof insertFotoAlunoSchema>;
export type CriterioAvaliacao = typeof criteriosAvaliacao.$inferSelect;
export type InsertCriterioAvaliacao = z.infer<typeof insertCriterioAvaliacaoSchema>;
export type CriterioAtendido = typeof criteriosAtendidos.$inferSelect;
export type InsertCriterioAtendido = z.infer<typeof insertCriterioAtendidoSchema>;
export type NotaCriterio = typeof notasCriterios.$inferSelect;
export type InsertNotaCriterio = z.infer<typeof insertNotaCriterioSchema>;

export type CriarTurmaRequest = Omit<InsertTurma, "professorId">;
export type AtualizarTurmaRequest = Partial<CriarTurmaRequest>;

export type CriarAlunoRequest = InsertAluno;
export type MatricularAlunoRequest = { alunoId: number };

export type CriarAvaliacaoRequest = InsertAvaliacao;
export type AtualizarNotaRequest = { valor: number };

export type TurmaComDetalhes = Turma & {
  contagemAlunos?: number;
};
