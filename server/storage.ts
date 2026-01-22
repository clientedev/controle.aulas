import { db } from "./db";
import { eq, and } from "drizzle-orm";
import {
  classes, students, enrollments, evaluations, grades,
  type Class, type InsertClass, type Student, type InsertStudent,
  type Enrollment, type Evaluation, type InsertEvaluation,
  type Grade, type InsertGrade, type ClassWithDetails
} from "@shared/schema";
import { authStorage } from "./replit_integrations/auth/storage";

export interface IStorage {
  // Auth methods
  getUser(id: string): Promise<any>; // Re-using authStorage

  // Classes
  getClasses(teacherId: string): Promise<Class[]>;
  getClass(id: number): Promise<ClassWithDetails | undefined>;
  createClass(data: InsertClass): Promise<Class>;
  updateClass(id: number, data: Partial<InsertClass>): Promise<Class>;
  deleteClass(id: number): Promise<void>;

  // Students
  getStudents(): Promise<Student[]>;
  createStudent(data: InsertStudent): Promise<Student>;
  enrollStudent(classId: number, studentId: number): Promise<void>;
  getClassStudents(classId: number): Promise<Student[]>;

  // Evaluations
  getClassEvaluations(classId: number): Promise<Evaluation[]>;
  createEvaluation(data: InsertEvaluation): Promise<Evaluation>;

  // Grades
  updateGrade(data: InsertGrade): Promise<Grade>;
  getClassGrades(classId: number): Promise<Grade[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string) {
    return authStorage.getUser(id);
  }

  async getClasses(teacherId: string): Promise<Class[]> {
    return await db.select().from(classes).where(eq(classes.teacherId, teacherId));
  }

  async getClass(id: number): Promise<ClassWithDetails | undefined> {
    const [cls] = await db.select().from(classes).where(eq(classes.id, id));
    if (!cls) return undefined;

    const studentCount = await db
      .select({ count: enrollments.id })
      .from(enrollments)
      .where(eq(enrollments.classId, id));

    return { ...cls, studentCount: studentCount.length };
  }

  async createClass(data: InsertClass): Promise<Class> {
    const [cls] = await db.insert(classes).values(data).returning();
    return cls;
  }

  async updateClass(id: number, data: Partial<InsertClass>): Promise<Class> {
    const [cls] = await db.update(classes).set(data).where(eq(classes.id, id)).returning();
    return cls;
  }

  async deleteClass(id: number): Promise<void> {
    await db.delete(classes).where(eq(classes.id, id));
  }

  async getStudents(): Promise<Student[]> {
    return await db.select().from(students);
  }

  async createStudent(data: InsertStudent): Promise<Student> {
    const [student] = await db.insert(students).values(data).returning();
    return student;
  }

  async enrollStudent(classId: number, studentId: number): Promise<void> {
    // Check if already enrolled
    const existing = await db.select().from(enrollments)
      .where(and(eq(enrollments.classId, classId), eq(enrollments.studentId, studentId)));
    
    if (existing.length === 0) {
      await db.insert(enrollments).values({ classId, studentId });
    }
  }

  async getClassStudents(classId: number): Promise<Student[]> {
    const results = await db.select({
      student: students
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .where(eq(enrollments.classId, classId));
    
    return results.map(r => r.student);
  }

  async getClassEvaluations(classId: number): Promise<Evaluation[]> {
    return await db.select().from(evaluations).where(eq(evaluations.classId, classId));
  }

  async createEvaluation(data: InsertEvaluation): Promise<Evaluation> {
    const [evaluation] = await db.insert(evaluations).values(data).returning();
    return evaluation;
  }

  async updateGrade(data: InsertGrade): Promise<Grade> {
    // Upsert logic for grade
    const [existing] = await db.select().from(grades)
      .where(and(eq(grades.evaluationId, data.evaluationId), eq(grades.studentId, data.studentId)));

    if (existing) {
      const [updated] = await db.update(grades)
        .set({ score: data.score })
        .where(eq(grades.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(grades).values(data).returning();
      return created;
    }
  }

  async getClassGrades(classId: number): Promise<Grade[]> {
    // Get all evaluations for the class, then get grades for those evaluations
    const evals = await this.getClassEvaluations(classId);
    if (evals.length === 0) return [];
    
    const evalIds = evals.map(e => e.id);
    // Drizzle doesn't support 'inArray' easily without importing, doing a simple fetch for now or join
    // Better to join evaluations and grades
    
    const results = await db.select({
      grade: grades
    })
    .from(grades)
    .innerJoin(evaluations, eq(grades.evaluationId, evaluations.id))
    .where(eq(evaluations.classId, classId));

    return results.map(r => r.grade);
  }
}

export const storage = new DatabaseStorage();
