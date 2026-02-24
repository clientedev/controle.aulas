import { z } from 'zod';
import { 
  insertUsuarioSchema, 
  insertTurmaSchema, 
  insertAlunoSchema, 
  insertAvaliacaoSchema, 
  insertNotaSchema, 
  insertUnidadeCurricularSchema,
  insertHorarioSchema,
  insertFrequenciaSchema,
  usuarios, 
  turmas, 
  alunos, 
  avaliacoes, 
  notas,
  horarios,
  frequencia,
  type UnidadeCurricular
} from './schema';

export const esquemasErro = {
  validacao: z.object({
    mensagem: z.string(),
    campo: z.string().optional(),
  }),
  naoEncontrado: z.object({
    mensagem: z.string(),
  }),
  interno: z.object({
    mensagem: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({
        email: z.string().email(),
        senha: z.string(),
      }),
      responses: {
        200: z.custom<typeof usuarios.$inferSelect>(),
        401: z.object({ mensagem: z.string() }),
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.object({ mensagem: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/me',
      responses: {
        200: z.custom<typeof usuarios.$inferSelect>(),
        401: z.object({ mensagem: z.string() }),
      },
    },
    listarUsuarios: {
      method: 'GET' as const,
      path: '/api/usuarios',
      responses: {
        200: z.array(z.custom<typeof usuarios.$inferSelect>()),
        401: z.object({ mensagem: z.string() }),
        403: z.object({ mensagem: z.string() }),
      },
    },
    criarProfessor: {
      method: 'POST' as const,
      path: '/api/usuarios/professores',
      input: insertUsuarioSchema.omit({ id: true, perfil: true, criadoEm: true }),
      responses: {
        201: z.custom<typeof usuarios.$inferSelect>(),
        400: esquemasErro.validacao,
        401: z.object({ mensagem: z.string() }),
        403: z.object({ mensagem: z.string() }),
      },
    },
  },
  turmas: {
    listar: {
      method: 'GET' as const,
      path: '/api/turmas',
      responses: {
        200: z.array(z.custom<typeof turmas.$inferSelect>()),
      },
    },
    obter: {
      method: 'GET' as const,
      path: '/api/turmas/:id',
      responses: {
        200: z.custom<typeof turmas.$inferSelect & { alunos: any[], unidadesCurriculares: any[] }>(),
        404: esquemasErro.naoEncontrado,
      },
    },
    criar: {
      method: 'POST' as const,
      path: '/api/turmas',
      input: insertTurmaSchema.omit({ id: true, professorId: true }),
      responses: {
        201: z.custom<typeof turmas.$inferSelect>(),
        400: esquemasErro.validacao,
      },
    },
    atualizar: {
      method: 'PATCH' as const,
      path: '/api/turmas/:id',
      input: insertTurmaSchema.omit({ id: true, professorId: true }).partial(),
      responses: {
        200: z.custom<typeof turmas.$inferSelect>(),
        404: esquemasErro.naoEncontrado,
      },
    },
    excluir: {
      method: 'DELETE' as const,
      path: '/api/turmas/:id',
      responses: {
        204: z.void(),
        404: esquemasErro.naoEncontrado,
      },
    },
  },
  unidadesCurriculares: {
    criar: {
      method: 'POST' as const,
      path: '/api/turmas/:id/unidades-curriculares',
      input: z.object({ nome: z.string() }),
      responses: {
        201: z.custom<UnidadeCurricular>(),
        400: esquemasErro.validacao,
      },
    },
    listar: {
      method: 'GET' as const,
      path: '/api/turmas/:id/unidades-curriculares',
      responses: {
        200: z.array(z.custom<UnidadeCurricular>()),
      },
    },
  },
  alunos: {
    listar: {
      method: 'GET' as const,
      path: '/api/alunos',
      responses: {
        200: z.array(z.custom<typeof alunos.$inferSelect>()),
      },
    },
    criar: {
      method: 'POST' as const,
      path: '/api/alunos',
      input: insertAlunoSchema.omit({ id: true }),
      responses: {
        201: z.custom<typeof alunos.$inferSelect>(),
        400: esquemasErro.validacao,
      },
    },
    matricular: {
      method: 'POST' as const,
      path: '/api/turmas/:id/matricular',
      input: z.object({ alunoId: z.number() }),
      responses: {
        201: z.object({ mensagem: z.string() }),
        404: esquemasErro.naoEncontrado,
      },
    },
  },
  avaliacoes: {
    criar: {
      method: 'POST' as const,
      path: '/api/unidades-curriculares/:id/avaliacoes',
      input: insertAvaliacaoSchema.omit({ id: true, unidadeCurricularId: true }),
      responses: {
        201: z.custom<typeof avaliacoes.$inferSelect>(),
        400: esquemasErro.validacao,
        404: esquemasErro.naoEncontrado,
      },
    },
    listar: {
      method: 'GET' as const,
      path: '/api/unidades-curriculares/:id/avaliacoes',
      responses: {
        200: z.array(z.custom<typeof avaliacoes.$inferSelect>()),
        404: esquemasErro.naoEncontrado,
      },
    },
  },
  notas: {
    atualizar: {
      method: 'POST' as const,
      path: '/api/notas',
      input: insertNotaSchema.omit({ id: true }),
      responses: {
        200: z.custom<typeof notas.$inferSelect>(),
        400: esquemasErro.validacao,
      },
    },
    listarPorTurma: {
      method: 'GET' as const,
      path: '/api/turmas/:id/notas',
      responses: {
        200: z.array(z.custom<typeof notas.$inferSelect>()),
        404: esquemasErro.naoEncontrado,
      },
    },
  },
  frequencia: {
    listar: {
      method: 'GET' as const,
      path: '/api/turmas/:id/frequencia',
      responses: {
        200: z.array(z.custom<typeof frequencia.$inferSelect>()),
      },
    },
    registrar: {
      method: 'POST' as const,
      path: '/api/turmas/:id/frequencia',
      input: insertFrequenciaSchema,
      responses: {
        200: z.custom<typeof frequencia.$inferSelect>(),
      },
    },
  },
  horarios: {
    listar: {
      method: 'GET' as const,
      path: '/api/turmas/:id/horarios',
      responses: {
        200: z.array(z.custom<typeof horarios.$inferSelect>()),
      },
    },
    criar: {
      method: 'POST' as const,
      path: '/api/turmas/:id/horarios',
      input: insertHorarioSchema.omit({ turmaId: true }),
      responses: {
        201: z.custom<typeof horarios.$inferSelect>(),
      },
    },
    excluir: {
      method: 'DELETE' as const,
      path: '/api/horarios/:id',
      responses: {
        204: z.void(),
      },
    },
  },
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
