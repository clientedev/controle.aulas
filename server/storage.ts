import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { format } from "date-fns";
import {
  usuarios, turmas, alunos, matriculas, avaliacoes, notas, horarios, frequencia, unidadesCurriculares, fotosAlunos,
  criteriosAvaliacao, criteriosAtendidos, notasCriterios,
  type Usuario, type InsertUsuario, type Turma, type InsertTurma,
  type Aluno, type InsertAluno, type Avaliacao, type InsertAvaliacao,
  type Nota, type InsertNota, type TurmaComDetalhes, type UnidadeCurricular, type InsertUnidadeCurricular,
  type Horario, type InsertHorario, type Frequencia, type InsertFrequencia,
  type FotoAluno, type InsertFotoAluno, type CriterioAvaliacao, type InsertCriterioAvaliacao,
  type CriterioAtendido, type InsertCriterioAtendido,
  type NotaCriterio, type InsertNotaCriterio
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
  getUsuarioPorPin(pin: string): Promise<Usuario | undefined>;
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
  atualizarAluno(id: number, data: Partial<InsertAluno>): Promise<Aluno>;
  excluirAluno(id: number): Promise<void>;

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
  getHistoricoCompletoFrequencia(): Promise<(Frequencia & { aluno: Aluno; turma: Turma })[]>;

  // Fotos de Alunos
  getFotosDoAluno(alunoId: number): Promise<FotoAluno[]>;
  adicionarFotoAluno(data: InsertFotoAluno): Promise<FotoAluno>;
  excluirFotoAluno(id: number): Promise<void>;

  // Critérios de Avaliação
  getCriteriosDaAvaliacao(avaliacaoId: number): Promise<CriterioAvaliacao[]>;
  criarCriterio(data: InsertCriterioAvaliacao): Promise<CriterioAvaliacao>;
  getCriteriosAtendidos(alunoId: number, avaliacaoId: number): Promise<CriterioAtendido[]>;
  registrarCriterioAtendido(data: InsertCriterioAtendido): Promise<CriterioAtendido>;
  
  // Notas por Critérios
  getCriteriosAtendidosPorUC(alunoId: number, ucId: number): Promise<CriterioAtendido[]>;
  getNotaCriterio(alunoId: number, ucId: number): Promise<NotaCriterio | undefined>;
  registrarNotaCriterio(data: InsertNotaCriterio): Promise<NotaCriterio>;
  getCriteriosDaUC(ucId: number): Promise<CriterioAvaliacao[]>;
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

  async getUsuarioPorPin(pin: string): Promise<Usuario | undefined> {
    const [user] = await db.select().from(usuarios).where(eq(usuarios.pinRegistro, pin));
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

  async getTurma(id: number): Promise<any | undefined> {
    try {
      const [t] = await db.select().from(turmas).where(eq(turmas.id, id));
      if (!t) return undefined;

      const [professor] = await db.select().from(usuarios).where(eq(usuarios.id, t.professorId));
      const alunosTurma = await this.getAlunosDaTurma(id);
      const ucs = await this.getUnidadesCurricularesDaTurma(id);
      
      // Buscar avaliações de todas as UCs da turma
      const avs: Avaliacao[] = [];
      for (const uc of ucs) {
        const ucas = await db.select().from(avaliacoes).where(eq(avaliacoes.unidadeCurricularId, uc.id));
        avs.push(...ucas);
      }

      const contagem = await db
        .select({ count: matriculas.id })
        .from(matriculas)
        .where(eq(matriculas.turmaId, id));

      return { 
        ...t, 
        professor,
        alunos: alunosTurma,
        unidadesCurriculares: ucs,
        avaliacoes: avs,
        contagemAlunos: contagem.length 
      };
    } catch (error) {
      console.error(`Erro ao buscar turma ${id}:`, error);
      throw error;
    }
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
    try {
      // Limpeza direta e absoluta via SQL bruto para garantir que nada impeça a exclusão
      // A ordem é importante para respeitar as chaves estrangeiras
      console.log(`Iniciando exclusão da turma ${id} e todas as suas dependências...`);
      
      await db.execute(sql`DELETE FROM notas_criterios WHERE unidade_curricular_id IN (SELECT id FROM unidades_curriculares WHERE turma_id = ${id})`);
      await db.execute(sql`DELETE FROM criterios_atendidos WHERE criterio_id IN (SELECT id FROM criterios_avaliacao WHERE unidade_curricular_id IN (SELECT id FROM unidades_curriculares WHERE turma_id = ${id}))`);
      await db.execute(sql`DELETE FROM criterios_avaliacao WHERE unidade_curricular_id IN (SELECT id FROM unidades_curriculares WHERE turma_id = ${id})`);
      await db.execute(sql`DELETE FROM notas WHERE avaliacao_id IN (SELECT id FROM avaliacoes WHERE unidade_curricular_id IN (SELECT id FROM unidades_curriculares WHERE turma_id = ${id}))`);
      await db.execute(sql`DELETE FROM avaliacoes WHERE unidade_curricular_id IN (SELECT id FROM unidades_curriculares WHERE turma_id = ${id})`);
      await db.execute(sql`DELETE FROM unidades_curriculares WHERE turma_id = ${id}`);
      await db.execute(sql`DELETE FROM frequencia WHERE turma_id = ${id}`);
      await db.execute(sql`DELETE FROM matriculas WHERE turma_id = ${id}`);
      await db.execute(sql`DELETE FROM horarios WHERE turma_id = ${id}`);
      await db.execute(sql`DELETE FROM turmas WHERE id = ${id}`);
      
      console.log(`Turma ${id} excluída com sucesso.`);
    } catch (error) {
      console.error(`Erro crítico ao excluir turma ${id}:`, error);
      throw error;
    }
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
    try {
      console.log(`Buscando aluno no banco com ID: ${id} (tipo: ${typeof id})`);
      const [aluno] = await db.select().from(alunos).where(eq(alunos.id, id));
      if (!aluno) {
        console.warn(`Nenhum aluno encontrado no banco para o ID: ${id}`);
      }
      return aluno;
    } catch (error) {
      console.error(`Erro ao buscar aluno ${id} no storage:`, error);
      throw error;
    }
  }

  async getTurmasDoAluno(alunoId: number): Promise<Turma[]> {
    try {
      const resultados = await db.select({
        turma: turmas
      })
      .from(matriculas)
      .innerJoin(turmas, eq(matriculas.turmaId, turmas.id))
      .where(eq(matriculas.alunoId, alunoId));
      
      console.log(`Turmas encontradas para o aluno ${alunoId}: ${resultados.length}`);
      return resultados.map(r => r.turma);
    } catch (error) {
      console.error(`Erro ao buscar turmas do aluno ${alunoId}:`, error);
      return [];
    }
  }

  async getNotasDoAluno(alunoId: number): Promise<(Nota & { avaliacao: Avaliacao; unidadeCurricular: UnidadeCurricular })[]> {
    try {
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
    } catch (error) {
      console.error(`Erro ao buscar notas do aluno ${alunoId}:`, error);
      return [];
    }
  }

  async getFrequenciaDoAluno(alunoId: number): Promise<(Frequencia & { turma: Turma })[]> {
    try {
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
    } catch (error) {
      console.error(`Erro ao buscar frequencia do aluno ${alunoId}:`, error);
      return [];
    }
  }

  async criarAluno(data: InsertAluno): Promise<Aluno> {
    const [existe] = await db.select().from(alunos).where(eq(alunos.matricula, data.matricula));
    if (existe) return existe;
    const [a] = await db.insert(alunos).values(data).returning();
    return a;
  }

  async atualizarAluno(id: number, data: Partial<InsertAluno>): Promise<Aluno> {
    const [updated] = await db.update(alunos).set(data).where(eq(alunos.id, id)).returning();
    if (!updated) throw new Error("Aluno não encontrado");
    return updated;
  }

  async excluirAluno(id: number): Promise<void> {
    try {
      console.log(`Iniciando exclusão do aluno ${id} e todas as suas dependências...`);
      
      // Limpeza manual de dependências que podem causar erro 400 (Foreign Key Violation)
      await db.execute(sql`DELETE FROM frequencia WHERE aluno_id = ${id}`);
      await db.execute(sql`DELETE FROM notas WHERE aluno_id = ${id}`);
      await db.execute(sql`DELETE FROM notas_criterios WHERE aluno_id = ${id}`);
      await db.execute(sql`DELETE FROM criterios_atendidos WHERE aluno_id = ${id}`);
      await db.execute(sql`DELETE FROM matriculas WHERE aluno_id = ${id}`);
      await db.execute(sql`DELETE FROM fotos_alunos WHERE aluno_id = ${id}`);
      
      // Finalmente exclui o aluno
      const result = await db.delete(alunos).where(eq(alunos.id, id)).returning();
      
      if (result.length === 0) {
        console.warn(`Tentativa de excluir aluno inexistente: ${id}`);
      } else {
        console.log(`Aluno ${id} excluído com sucesso.`);
      }
    } catch (error) {
      console.error(`Erro crítico ao excluir aluno ${id}:`, error);
      throw error;
    }
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
    .innerJoin(unidadesCurriculares, eq(avaliacoes.unidadeCurricularId, unidadesCurriculares.id))
    .where(eq(unidadesCurriculares.turmaId, turmaId));

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
    try {
      const today = data.data;
      
      const [existe] = await db.select().from(frequencia)
        .where(and(
          eq(frequencia.turmaId, data.turmaId),
          eq(frequencia.alunoId, data.alunoId),
          eq(frequencia.data, today)
        ));

      if (existe) {
        const [u] = await db.update(frequencia)
          .set({ 
            status: data.status,
            horario: data.horario || format(new Date(), "HH:mm"),
          })
          .where(eq(frequencia.id, existe.id))
          .returning();
        return u;
      } else {
        const [n] = await db.insert(frequencia).values({
          alunoId: data.alunoId,
          turmaId: data.turmaId,
          data: today,
          status: data.status,
          horario: data.horario || format(new Date(), "HH:mm"),
        }).returning();
        return n;
      }
    } catch (error: any) {
      console.error("Erro crítico em registrarFrequencia:", error);
      throw error;
    }
  }

  async getHistoricoCompletoFrequencia(): Promise<(Frequencia & { aluno: Aluno; turma: Turma })[]> {
    const resultados = await db.select({
      frequencia: frequencia,
      aluno: alunos,
      turma: turmas
    })
    .from(frequencia)
    .innerJoin(alunos, eq(frequencia.alunoId, alunos.id))
    .innerJoin(turmas, eq(frequencia.turmaId, turmas.id))
    .orderBy(frequencia.data);
    
    return resultados.map(r => ({
      ...r.frequencia,
      aluno: r.aluno,
      turma: r.turma
    }));
  }

  // Fotos de Alunos
  async getFotosDoAluno(alunoId: number): Promise<FotoAluno[]> {
    return await db.select().from(fotosAlunos).where(eq(fotosAlunos.alunoId, alunoId));
  }

  async adicionarFotoAluno(data: { alunoId: number; objectPath?: string; fotoBase64?: string }): Promise<FotoAluno> {
    const [foto] = await db.insert(fotosAlunos).values(data).returning();
    return foto;
  }

  async excluirFotoAluno(id: number): Promise<void> {
    await db.delete(fotosAlunos).where(eq(fotosAlunos.id, id));
  }

  async getCriteriosDaAvaliacao(avaliacaoId: number): Promise<CriterioAvaliacao[]> {
    // Esse método agora é legado mas mantido para compatibilidade se necessário
    return [];
  }

  async getCriteriosDaUC(ucId: number): Promise<CriterioAvaliacao[]> {
    try {
      if (!ucId || isNaN(ucId)) return [];
      const results = await db.select().from(criteriosAvaliacao).where(eq(criteriosAvaliacao.unidadeCurricularId, ucId));
      return results || [];
    } catch (error) {
      console.error(`Erro ao buscar critérios da UC ${ucId}:`, error);
      return [];
    }
  }

  async criarCriterio(data: InsertCriterioAvaliacao): Promise<CriterioAvaliacao> {
    const [c] = await db.insert(criteriosAvaliacao).values(data).returning();
    return c;
  }

  async getCriteriosAtendidos(alunoId: number, avaliacaoId: number): Promise<CriterioAtendido[]> {
    // Legado
    return [];
  }

  async getCriteriosAtendidosPorUC(alunoId: number, ucId: number): Promise<CriterioAtendido[]> {
    return await db.select({
      atendimento: criteriosAtendidos
    })
    .from(criteriosAtendidos)
    .innerJoin(criteriosAvaliacao, eq(criteriosAtendidos.criterioId, criteriosAvaliacao.id))
    .where(and(
      eq(criteriosAtendidos.alunoId, alunoId),
      eq(criteriosAvaliacao.unidadeCurricularId, ucId)
    ))
    .then(res => res.map(r => r.atendimento));
  }

  async registrarCriterioAtendido(data: InsertCriterioAtendido): Promise<CriterioAtendido> {
    const [existe] = await db.select().from(criteriosAtendidos)
      .where(and(
        eq(criteriosAtendidos.alunoId, data.alunoId),
        eq(criteriosAtendidos.criterioId, data.criterioId)
      ));

    if (existe) {
      const [u] = await db.update(criteriosAtendidos)
        .set({ atendido: data.atendido })
        .where(eq(criteriosAtendidos.id, existe.id))
        .returning();
      
      await this.recalcularAproveitamento(data.alunoId, data.criterioId);
      return u;
    } else {
      const [n] = await db.insert(criteriosAtendidos).values(data).returning();
      await this.recalcularAproveitamento(data.alunoId, data.criterioId);
      return n;
    }
  }

  async getNotaCriterio(alunoId: number, ucId: number): Promise<NotaCriterio | undefined> {
    const [nota] = await db.select().from(notasCriterios).where(and(
      eq(notasCriterios.alunoId, alunoId),
      eq(notasCriterios.unidadeCurricularId, ucId)
    ));
    return nota;
  }

  async registrarNotaCriterio(data: InsertNotaCriterio): Promise<NotaCriterio> {
    const [existe] = await db.select().from(notasCriterios).where(and(
      eq(notasCriterios.alunoId, data.alunoId),
      eq(notasCriterios.unidadeCurricularId, data.unidadeCurricularId)
    ));

    if (existe) {
      const [u] = await db.update(notasCriterios)
        .set({ aproveitamento: data.aproveitamento })
        .where(eq(notasCriterios.id, existe.id))
        .returning();
      return u;
    } else {
      const [n] = await db.insert(notasCriterios).values(data).returning();
      return n;
    }
  }

  private async recalcularAproveitamento(alunoId: number, criterioId: number) {
    const [criterio] = await db.select().from(criteriosAvaliacao).where(eq(criteriosAvaliacao.id, criterioId));
    if (!criterio) return;

    const ucId = criterio.unidadeCurricularId;
    const todosCriterios = await this.getCriteriosDaUC(ucId);
    const atendidos = await this.getCriteriosAtendidosPorUC(alunoId, ucId);

    let totalPeso = 0;
    let pesoAtendido = 0;

    for (const c of todosCriterios) {
      totalPeso += c.peso;
      const atendimento = atendidos.find(a => a.criterioId === c.id);
      if (atendimento?.atendido === 1) {
        pesoAtendido += c.peso;
      }
    }

    const aproveitamento = totalPeso > 0 ? (pesoAtendido / totalPeso) : 0;

    await this.registrarNotaCriterio({
      alunoId,
      unidadeCurricularId: ucId,
      aproveitamento
    });
  }

  private async recalcularNotaAluno(alunoId: number, criterioId: number) {
    // Legado mantido para não quebrar interface se chamada
  }
}

export const storage = new DatabaseStorage();
