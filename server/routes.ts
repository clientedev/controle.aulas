import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
  await setupAuth(app);
  registerAuthRoutes(app);

  // Protected Routes Middleware
  const protect = isAuthenticated;

  // Classes
  app.get(api.classes.list.path, protect, async (req: any, res) => {
    const teacherId = req.user.claims.sub;
    const classes = await storage.getClasses(teacherId);
    res.json(classes);
  });

  app.get(api.classes.get.path, protect, async (req, res) => {
    const id = Number(req.params.id);
    const cls = await storage.getClass(id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const students = await storage.getClassStudents(id);
    const evaluations = await storage.getClassEvaluations(id);

    res.json({ ...cls, students, evaluations });
  });

  app.post(api.classes.create.path, protect, async (req: any, res) => {
    try {
      const input = api.classes.create.input.parse(req.body);
      const teacherId = req.user.claims.sub;
      const cls = await storage.createClass({ ...input, teacherId });
      res.status(201).json(cls);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.classes.update.path, protect, async (req, res) => {
    const id = Number(req.params.id);
    try {
      const input = api.classes.update.input.parse(req.body);
      const cls = await storage.updateClass(id, input);
      res.json(cls);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({
              message: err.errors[0].message,
              field: err.errors[0].path.join('.'),
            });
        }
      return res.status(404).json({ message: "Class not found" });
    }
  });

  app.delete(api.classes.delete.path, protect, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteClass(id);
    res.status(204).send();
  });

  // Students
  app.get(api.students.list.path, protect, async (req, res) => {
    const students = await storage.getStudents();
    res.json(students);
  });

  app.post(api.students.create.path, protect, async (req, res) => {
    try {
      const input = api.students.create.input.parse(req.body);
      const student = await storage.createStudent(input);
      res.status(201).json(student);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.students.enroll.path, protect, async (req, res) => {
    const classId = Number(req.params.id);
    const { studentId } = req.body;
    await storage.enrollStudent(classId, studentId);
    res.json({ message: "Enrolled successfully" });
  });

  // Evaluations
  app.get(api.evaluations.list.path, protect, async (req, res) => {
    const classId = Number(req.params.id);
    const evaluations = await storage.getClassEvaluations(classId);
    res.json(evaluations);
  });

  app.post(api.evaluations.create.path, protect, async (req, res) => {
    const classId = Number(req.params.id);
    try {
      const input = api.evaluations.create.input.parse(req.body);
      const evaluation = await storage.createEvaluation({ ...input, classId });
      res.status(201).json(evaluation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Grades
  app.post(api.grades.update.path, protect, async (req, res) => {
    try {
      const input = api.grades.update.input.parse(req.body);
      const grade = await storage.updateGrade(input);
      res.json(grade);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.grades.listByClass.path, protect, async (req, res) => {
    const classId = Number(req.params.id);
    const grades = await storage.getClassGrades(classId);
    res.json(grades);
  });

  return httpServer;
}
