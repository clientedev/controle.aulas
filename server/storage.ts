import { db } from "./db";
import { eq, and } from "drizzle-orm";
import {
  usuarios, turmas, alunos, matriculas, avaliacoes, notas, horarios, frequencia, unidadesCurriculares, fotosAlunos,
  type Usuario, type InsertUsuario, type Turma, type InsertTurma,
  type Aluno, type InsertAluno, type Avaliacao, type InsertAvaliacao,
  type Nota, type InsertNota, type TurmaComDetalhes, type UnidadeCurricular, type InsertUnidadeCurricular,
  type Horario, type InsertHorario, type Frequencia, type InsertFrequencia,
  type FotoAluno, type InsertFotoAluno
} from "@shared/schema";
import session from "express-session";
import MemoryStore from "memorystore";

const SessionStore = MemoryStore(session);
export const sessionStore = new SessionStore({
  checkPeriod: 86400000 // prune expired entries every 24h
});

export interface IStorage {
  // Usuários / Auth
  getUsuario(id: number): Promise<Usuario | undefined>;
  getUsuarioPorEmail(email: string): Promise<Usuario | undefined>;
  criarUsuario(data: InsertUsuario): Promise<Usuario>;
  getUsuarios(): Promise<Usuario[]>;
  getTodasTurmas(): Promise<Turma[]>;

  // Turmas
  getTurmas(professorId: number): Promise<Turma[]>;
  getTurma(id: number): Promise<TurmaComDetalhes | undefined>;
  criarTurma(data: InsertTurma): Promise<Turma>;
  atualizarTurma(id: number, data: Partial<InsertTurma>): Promise<Turma>;
  excluirTurma(id: number): Promise<void>;

  // Unidades Curriculares
  getUnidadesCurricularesDaTurma(turmaId: number): Promise<UnidadeCurricular[]>;
  criarUnidadeCurricular(data: InsertUnidadeCurricular): Promise<UnidadeCurricular>;

  // Alunos
  getAlunos(): Promise<Aluno[]>;
  getAluno(id: number): Promise<Aluno | undefined>;
  criarAluno(data: InsertAluno): Promise<Aluno>;
  matricularAluno(turmaId: number, alunoId: number): Promise<void>;
  getAlunosDaTurma(turmaId: number): Promise<Aluno[]>;
  getTurmasDoAluno(alunoId: number): Promise<Turma[]>;
  getNotasDoAluno(alunoId: number): Promise<(Nota & { avaliacao: Avaliacao; unidadeCurricular: UnidadeCurricular })[]>;
  getFrequenciaDoAluno(alunoId: number): Promise<(Frequencia & { turma: Turma })[]>;

  // Avaliações
  getAvaliacoesDaTurma(turmaId: number): Promise<Avaliacao[]>;
  criarAvaliacao(data: InsertAvaliacao): Promise<Avaliacao>;

  // Notas
  atualizarNota(data: InsertNota): Promise<Nota>;
  getNotasDaTurma(turmaId: number): Promise<Nota[]>;

  // Horários e Frequência
  getHorariosDaTurma(turmaId: number): Promise<Horario[]>;
  criarHorario(data: InsertHorario): Promise<Horario>;
  excluirHorario(id: number): Promise<void>;
  getFrequenciaDaTurma(turmaId: number, data?: string): Promise<Frequencia[]>;
  registrarFrequencia(data: InsertFrequencia): Promise<Frequencia>;

  // Fotos de Alunos
  getFotosDoAluno(alunoId: number): Promise<FotoAluno[]>;
  adicionarFotoAluno(data: InsertFotoAluno): Promise<FotoAluno>;
  excluirFotoAluno(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUsuario(id: number): Promise<Usuario | undefined> {
    const [user] = await db.select().from(usuarios).where(eq(usuarios.id, id));
    return user;
  }

  async getUsuarioPorEmail(email: string): Promise<Usuario | undefined> {
    const [user] = await db.select().from(usuarios).where(eq(usuarios.email, email));
    return user;
  }

  async criarUsuario(data: InsertUsuario): Promise<Usuario> {
    const [user] = await db.insert(usuarios).values(data).returning();
    return user;
  }

  async getUsuarios(): Promise<Usuario[]> {
    return await db.select().from(usuarios);
  }

  async getTodasTurmas(): Promise<Turma[]> {
    return await db.select().from(turmas);
  }

  async getTurmas(professorId: number): Promise<Turma[]> {
    return await db.select().from(turmas).where(eq(turmas.professorId, professorId));
  }

  async getTurma(id: number): Promise<TurmaComDetalhes | undefined> {
    const [t] = await db.select().from(turmas).where(eq(turmas.id, id));
    if (!t) return undefined;

    const contagem = await db
      .select({ count: matriculas.id })
      .from(matriculas)
      .where(eq(matriculas.turmaId, id));

    return { ...t, contagemAlunos: contagem.length };
  }

  async criarTurma(data: InsertTurma): Promise<Turma> {
    const [t] = await db.insert(turmas).values(data).returning();
    return t;
  }

  async atualizarTurma(id: number, data: Partial<InsertTurma>): Promise<Turma> {
    const [t] = await db.update(turmas).set(data).where(eq(turmas.id, id)).returning();
    return t;
  }

  async excluirTurma(id: number): Promise<void> {
    await db.delete(turmas).where(eq(turmas.id, id));
  }

  async getUnidadesCurricularesDaTurma(turmaId: number): Promise<UnidadeCurricular[]> {
    return await db.select().from(unidadesCurriculares).where(eq(unidadesCurriculares.turmaId, turmaId));
  }

  async criarUnidadeCurricular(data: InsertUnidadeCurricular): Promise<UnidadeCurricular> {
    const [uc] = await db.insert(unidadesCurriculares).values(data).returning();
    return uc;
  }

  async getAlunos(): Promise<Aluno[]> {
    return await db.select().from(alunos);
  }

  async getAluno(id: number): Promise<Aluno | undefined> {
    const [aluno] = await db.select().from(alunos).where(eq(alunos.id, id));
    return aluno;
  }

  async getTurmasDoAluno(alunoId: number): Promise<Turma[]> {
    const resultados = await db.select({
      turma: turmas
    })
    .from(matriculas)
    .innerJoin(turmas, eq(matriculas.turmaId, turmas.id))
    .where(eq(matriculas.alunoId, alunoId));
    
    return resultados.map(r => r.turma);
  }

  async getNotasDoAluno(alunoId: number): Promise<(Nota & { avaliacao: Avaliacao; unidadeCurricular: UnidadeCurricular })[]> {
    const resultados = await db.select({
      nota: notas,
      avaliacao: avaliacoes,
      unidadeCurricular: unidadesCurriculares
    })
    .from(notas)
    .innerJoin(avaliacoes, eq(notas.avaliacaoId, avaliacoes.id))
    .innerJoin(unidadesCurriculares, eq(avaliacoes.unidadeCurricularId, unidadesCurriculares.id))
    .where(eq(notas.alunoId, alunoId));
    
    return resultados.map(r => ({
      ...r.nota,
      avaliacao: r.avaliacao,
      unidadeCurricular: r.unidadeCurricular
    }));
  }

  async getFrequenciaDoAluno(alunoId: number): Promise<(Frequencia & { turma: Turma })[]> {
    const resultados = await db.select({
      frequencia: frequencia,
      turma: turmas
    })
    .from(frequencia)
    .innerJoin(turmas, eq(frequencia.turmaId, turmas.id))
    .where(eq(frequencia.alunoId, alunoId));
    
    return resultados.map(r => ({
      ...r.frequencia,
      turma: r.turma
    }));
  }

  async criarAluno(data: InsertAluno): Promise<Aluno> {
    const [existe] = await db.select().from(alunos).where(eq(alunos.matricula, data.matricula));
    if (existe) return existe;
    const [a] = await db.insert(alunos).values(data).returning();
    return a;
  }

  async atualizarAluno(id: number, data: Partial<InsertAluno>): Promise<Aluno> {
    const [updated] = await db.update(alunos).set(data).where(eq(alunos.id, id)).returning();
    return updated;
  }

  async matricularAluno(turmaId: number, alunoId: number): Promise<void> {
    const existe = await db.select().from(matriculas)
      .where(and(eq(matriculas.turmaId, turmaId), eq(matriculas.alunoId, alunoId)));
    
    if (existe.length === 0) {
      await db.insert(matriculas).values({ turmaId, alunoId });
    }
  }

  async getAlunosDaTurma(turmaId: number): Promise<Aluno[]> {
    const resultados = await db.select({
      aluno: alunos
    })
    .from(matriculas)
    .innerJoin(alunos, eq(matriculas.alunoId, alunos.id))
    .where(eq(matriculas.turmaId, turmaId));
    
    return resultados.map(r => r.aluno);
  }

  async getAvaliacoesDaTurma(turmaId: number): Promise<Avaliacao[]> {
    const resultados = await db.select({
      avaliacao: avaliacoes
    })
    .from(avaliacoes)
    .innerJoin(unidadesCurriculares, eq(avaliacoes.unidadeCurricularId, unidadesCurriculares.id))
    .where(eq(unidadesCurriculares.turmaId, turmaId));

    return resultados.map(r => r.avaliacao);
  }

  async getAvaliacoesDaUnidadeCurricular(unidadeCurricularId: number): Promise<Avaliacao[]> {
    return await db.select().from(avaliacoes).where(eq(avaliacoes.unidadeCurricularId, unidadeCurricularId));
  }

  async criarAvaliacao(data: InsertAvaliacao): Promise<Avaliacao> {
    const [a] = await db.insert(avaliacoes).values(data).returning();
    return a;
  }

  async atualizarNota(data: InsertNota): Promise<Nota> {
    const [existe] = await db.select().from(notas)
      .where(and(eq(notas.avaliacaoId, data.avaliacaoId), eq(notas.alunoId, data.alunoId)));

    if (existe) {
      const [u] = await db.update(notas)
        .set({ valor: data.valor })
        .where(eq(notas.id, existe.id))
        .returning();
      return u;
    } else {
      const [c] = await db.insert(notas).values(data).returning();
      return c;
    }
  }

  async getNotasDaTurma(turmaId: number): Promise<Nota[]> {
    const resultados = await db.select({
      nota: notas
    })
    .from(notas)
    .innerJoin(avaliacoes, eq(notas.avaliacaoId, avaliacoes.id))
    .where(eq(avaliacoes.turmaId, turmaId));

    return resultados.map(r => r.nota);
  }

  // Horários e Frequência
  async getHorariosDaTurma(turmaId: number): Promise<Horario[]> {
    return await db.select().from(horarios).where(eq(horarios.turmaId, turmaId));
  }

  async criarHorario(data: InsertHorario): Promise<Horario> {
    const [h] = await db.insert(horarios).values(data).returning();
    return h;
  }

  async excluirHorario(id: number): Promise<void> {
    await db.delete(horarios).where(eq(horarios.id, id));
  }

  async getFrequenciaDaTurma(turmaId: number, data?: string): Promise<Frequencia[]> {
    if (data) {
      return await db.select().from(frequencia).where(and(eq(frequencia.turmaId, turmaId), eq(frequencia.data, data)));
    }
    return await db.select().from(frequencia).where(eq(frequencia.turmaId, turmaId));
  }

  async registrarFrequencia(data: InsertFrequencia): Promise<Frequencia> {
    const [existe] = await db.select().from(frequencia)
      .where(and(
        eq(frequencia.turmaId, data.turmaId),
        eq(frequencia.alunoId, data.alunoId),
        eq(frequencia.data, data.data)
      ));

    if (existe) {
      const [u] = await db.update(frequencia)
        .set({ status: data.status })
        .where(eq(frequencia.id, existe.id))
        .returning();
      return u;
    } else {
      const [n] = await db.insert(frequencia).values(data).returning();
      return n;
    }
  }

  // Fotos de Alunos
  async getFotosDoAluno(alunoId: number): Promise<FotoAluno[]> {
    return await db.select().from(fotosAlunos).where(eq(fotosAlunos.alunoId, alunoId));
  }

  async adicionarFotoAluno(data: InsertFotoAluno): Promise<FotoAluno> {
    const [foto] = await db.insert(fotosAlunos).values(data).returning();
    return foto;
  }

  async excluirFotoAluno(id: number): Promise<void> {
    await db.delete(fotosAlunos).where(eq(fotosAlunos.id, id));
  }
}

export const storage = new DatabaseStorage();
