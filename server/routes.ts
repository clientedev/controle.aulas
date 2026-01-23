import type { Express } from "express";
import type { Server } from "http";
import { storage, sessionStore } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import { insertAlunoSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Configuração de Sessão
  app.use(session({
    secret: process.env.SESSION_SECRET || "senai-secret-key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
  }));

  // Middleware de Autenticação
  const autenticar = (req: any, res: any, next: any) => {
    if (req.session.usuarioId) {
      next();
    } else {
      res.status(401).json({ mensagem: "Não autorizado" });
    }
  };

  // Auth
  app.post(api.auth.login.path, async (req, res) => {
    const { email, senha } = req.body;
    const usuario = await storage.getUsuarioPorEmail(email);

    if (!usuario || usuario.senha !== senha) {
      return res.status(401).json({ mensagem: "Email ou senha inválidos" });
    }

    (req.session as any).usuarioId = usuario.id;
    res.json(usuario);
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ mensagem: "Erro ao sair" });
      res.json({ mensagem: "Saiu com sucesso" });
    });
  });

  app.get(api.auth.me.path, async (req, res) => {
    if (!(req.session as any).usuarioId) {
      return res.status(401).json({ mensagem: "Não logado" });
    }
    const usuario = await storage.getUsuario((req.session as any).usuarioId);
    res.json(usuario);
  });

  app.get("/api/usuarios", autenticar, async (req: any, res) => {
    const usuario = await storage.getUsuario(req.session.usuarioId);
    if (usuario?.perfil !== "admin") {
      return res.status(403).json({ mensagem: "Acesso negado" });
    }
    const lista = await storage.getUsuarios();
    res.json(lista);
  });

  app.post("/api/usuarios/professores", autenticar, async (req: any, res) => {
    const usuario = await storage.getUsuario(req.session.usuarioId);
    if (usuario?.perfil !== "admin") {
      return res.status(403).json({ mensagem: "Acesso negado" });
    }
    try {
      const input = req.body;
      const novoProfessor = await storage.criarUsuario({ ...input, perfil: "professor" });
      res.status(201).json(novoProfessor);
    } catch (err) {
      res.status(400).json({ mensagem: "Erro ao criar professor" });
    }
  });

  // Turmas
  app.get(api.turmas.listar.path, autenticar, async (req: any, res) => {
    const usuario = await storage.getUsuario(req.session.usuarioId);
    if (usuario?.perfil === "admin") {
      const turmas = await storage.getTodasTurmas();
      return res.json(turmas);
    }
    const turmas = await storage.getTurmas(req.session.usuarioId);
    res.json(turmas);
  });

  app.get(api.turmas.obter.path, autenticar, async (req, res) => {
    const id = Number(req.params.id);
    const turma = await storage.getTurma(id);
    if (!turma) return res.status(404).json({ mensagem: "Turma não encontrada" });

    const alunos = await storage.getAlunosDaTurma(id);
    const unidadesCurriculares = await storage.getUnidadesCurricularesDaTurma(id);

    res.json({ ...turma, alunos, unidadesCurriculares });
  });

  app.post("/api/turmas/:id/unidades-curriculares", autenticar, async (req: any, res) => {
    const turmaId = Number(req.params.id);
    try {
      const { nome } = req.body;
      const uc = await storage.criarUnidadeCurricular({ nome, turmaId });
      res.status(201).json(uc);
    } catch (err) {
      res.status(400).json({ mensagem: "Erro ao criar unidade curricular" });
    }
  });

  app.get("/api/turmas/:id/unidades-curriculares", autenticar, async (req: any, res) => {
    const turmaId = Number(req.params.id);
    const ucs = await storage.getUnidadesCurricularesDaTurma(turmaId);
    res.json(ucs);
  });

  app.post(api.turmas.criar.path, autenticar, async (req: any, res) => {
    try {
      const input = api.turmas.criar.input.parse(req.body);
      const novaTurma = await storage.criarTurma({ ...input, professorId: req.session.usuarioId });
      res.status(201).json(novaTurma);
    } catch (err) {
      res.status(400).json({ mensagem: "Erro de validação" });
    }
  });

  // Alunos
  app.get(api.alunos.listar.path, autenticar, async (req, res) => {
    const alunosList = await storage.getAlunos();
    res.json(alunosList);
  });

  app.post(api.alunos.criar.path, autenticar, async (req: any, res) => {
    try {
      const input = insertAlunoSchema.parse(req.body);
      const aluno = await storage.criarAluno(input);
      res.status(201).json(aluno);
    } catch (err) {
      res.status(400).json({ mensagem: "Erro de validação" });
    }
  });

  app.patch("/api/alunos/:id", autenticar, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const data = req.body;
      const updated = await storage.atualizarAluno(id, data);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ mensagem: "Erro ao atualizar aluno" });
    }
  });

  app.post(api.alunos.matricular.path, autenticar, async (req: any, res) => {
    const turmaId = Number(req.params.id);
    const { alunoId } = req.body;
    await storage.matricularAluno(turmaId, alunoId);
    res.json({ mensagem: "Matriculado com sucesso" });
  });

  // Avaliações
  app.post("/api/unidades-curriculares/:id/avaliacoes", autenticar, async (req: any, res) => {
    const unidadeCurricularId = Number(req.params.id);
    try {
      const input = api.avaliacoes.criar.input.parse(req.body);
      const avaliacao = await storage.criarAvaliacao({ ...input, unidadeCurricularId });
      res.status(201).json(avaliacao);
    } catch (err) {
      res.status(400).json({ mensagem: "Erro de validação" });
    }
  });

  app.get("/api/unidades-curriculares/:id/avaliacoes", autenticar, async (req, res) => {
    const unidadeCurricularId = Number(req.params.id);
    const avaliacoes = await storage.getAvaliacoesDaUnidadeCurricular(unidadeCurricularId);
    res.json(avaliacoes);
  });

  // Notas
  app.post(api.notas.atualizar.path, autenticar, async (req: any, res) => {
    try {
      const input = api.notas.atualizar.input.parse(req.body);
      const nota = await storage.atualizarNota(input);
      res.json(nota);
    } catch (err) {
      res.status(400).json({ mensagem: "Erro de validação" });
    }
  });

  // Horários
  app.get("/api/turmas/:id/horarios", autenticar, async (req, res) => {
    const id = Number(req.params.id);
    const result = await storage.getHorariosDaTurma(id);
    res.json(result);
  });

  app.post("/api/turmas/:id/horarios", autenticar, async (req: any, res) => {
    const id = Number(req.params.id);
    const result = await storage.criarHorario({ ...req.body, turmaId: id });
    res.status(201).json(result);
  });

  app.delete("/api/horarios/:id", autenticar, async (req, res) => {
    const id = Number(req.params.id);
    await storage.excluirHorario(id);
    res.status(204).end();
  });

  // Frequência
  app.get("/api/turmas/:id/frequencia", autenticar, async (req, res) => {
    const id = Number(req.params.id);
    const data = req.query.data as string | undefined;
    const result = await storage.getFrequenciaDaTurma(id, data);
    res.json(result);
  });

  app.post("/api/turmas/:id/frequencia", autenticar, async (req: any, res) => {
    const result = await storage.registrarFrequencia(req.body);
    res.json(result);
  });

  // Seed Admin User
  (async () => {
    const admin = await storage.getUsuarioPorEmail("admin@senai.br");
    if (!admin) {
      await storage.criarUsuario({
        nome: "Administrador",
        email: "admin@senai.br",
        senha: "admin",
        perfil: "admin"
      });
    }
  })();

  return httpServer;
}
