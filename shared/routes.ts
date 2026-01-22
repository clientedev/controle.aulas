import { z } from 'zod';
import { insertClassSchema, insertStudentSchema, insertEvaluationSchema, insertGradeSchema, classes, students, evaluations, grades } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  classes: {
    list: {
      method: 'GET' as const,
      path: '/api/classes',
      responses: {
        200: z.array(z.custom<typeof classes.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/classes/:id',
      responses: {
        200: z.custom<typeof classes.$inferSelect & { students: any[], evaluations: any[] }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/classes',
      input: insertClassSchema.omit({ id: true, teacherId: true }),
      responses: {
        201: z.custom<typeof classes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/classes/:id',
      input: insertClassSchema.omit({ id: true, teacherId: true }).partial(),
      responses: {
        200: z.custom<typeof classes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/classes/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  students: {
    list: {
      method: 'GET' as const,
      path: '/api/students',
      responses: {
        200: z.array(z.custom<typeof students.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/students',
      input: insertStudentSchema.omit({ id: true }),
      responses: {
        201: z.custom<typeof students.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    enroll: {
      method: 'POST' as const,
      path: '/api/classes/:id/enroll',
      input: z.object({ studentId: z.number() }),
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
  },
  evaluations: {
    create: {
      method: 'POST' as const,
      path: '/api/classes/:id/evaluations',
      input: insertEvaluationSchema.omit({ id: true, classId: true }),
      responses: {
        201: z.custom<typeof evaluations.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/classes/:id/evaluations',
      responses: {
        200: z.array(z.custom<typeof evaluations.$inferSelect>()),
        404: errorSchemas.notFound,
      },
    },
  },
  grades: {
    update: {
      method: 'POST' as const,
      path: '/api/grades',
      input: insertGradeSchema.omit({ id: true }),
      responses: {
        200: z.custom<typeof grades.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    listByClass: {
      method: 'GET' as const,
      path: '/api/classes/:id/grades',
      responses: {
        200: z.array(z.custom<typeof grades.$inferSelect>()),
        404: errorSchemas.notFound,
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
