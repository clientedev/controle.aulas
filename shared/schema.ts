import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export * from "./models/auth";

// === TABLE DEFINITIONS ===

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "Turma A - 2024"
  unit: text("unit").notNull(), // Unidade Curricular e.g., "Lógica de Programação"
  year: integer("year").notNull(),
  semester: integer("semester").notNull(), // 1 or 2
  teacherId: text("teacher_id").references(() => users.id).notNull(),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  registrationNumber: text("registration_number").unique().notNull(), // Matrícula
});

export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  studentId: integer("student_id").references(() => students.id).notNull(),
});

export const evaluations = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  name: text("name").notNull(), // e.g., "Prova 1", "Trabalho Final"
  maxScore: doublePrecision("max_score").notNull().default(10.0),
  weight: doublePrecision("weight").default(1.0),
});

export const grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  evaluationId: integer("evaluation_id").references(() => evaluations.id).notNull(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  score: doublePrecision("score").notNull(),
});

// === RELATIONS ===

export const classesRelations = relations(classes, ({ one, many }) => ({
  teacher: one(users, {
    fields: [classes.teacherId],
    references: [users.id],
  }),
  enrollments: many(enrollments),
  evaluations: many(evaluations),
}));

export const studentsRelations = relations(students, ({ many }) => ({
  enrollments: many(enrollments),
  grades: many(grades),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  class: one(classes, {
    fields: [enrollments.classId],
    references: [classes.id],
  }),
  student: one(students, {
    fields: [enrollments.studentId],
    references: [students.id],
  }),
}));

export const evaluationsRelations = relations(evaluations, ({ one, many }) => ({
  class: one(classes, {
    fields: [evaluations.classId],
    references: [classes.id],
  }),
  grades: many(grades),
}));

export const gradesRelations = relations(grades, ({ one }) => ({
  evaluation: one(evaluations, {
    fields: [grades.evaluationId],
    references: [evaluations.id],
  }),
  student: one(students, {
    fields: [grades.studentId],
    references: [students.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertClassSchema = createInsertSchema(classes).omit({ id: true });
export const insertStudentSchema = createInsertSchema(students).omit({ id: true });
export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({ id: true });
export const insertEvaluationSchema = createInsertSchema(evaluations).omit({ id: true });
export const insertGradeSchema = createInsertSchema(grades).omit({ id: true });

// === EXPLICIT API CONTRACT TYPES ===

export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Enrollment = typeof enrollments.$inferSelect;
export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;
export type Grade = typeof grades.$inferSelect;
export type InsertGrade = z.infer<typeof insertGradeSchema>;

export type CreateClassRequest = Omit<InsertClass, "teacherId">; // Teacher ID comes from auth
export type UpdateClassRequest = Partial<CreateClassRequest>;

export type CreateStudentRequest = InsertStudent;
export type EnrollStudentRequest = { studentId: number };

export type CreateEvaluationRequest = InsertEvaluation;
export type UpdateGradeRequest = { score: number };

export type ClassWithDetails = Class & {
  studentCount?: number;
};
