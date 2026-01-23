import type { Express } from "express";
import type { Server } from "http";
import { storage, sessionStore } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import { insertAlunoSchema } from "@shared/schema";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

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
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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

  app.post("/api/auth/login-pin", async (req, res) => {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ mensagem: "PIN obrigatório" });
    
    const usuario = await storage.getUsuarioPorPin(pin);
    if (!usuario) {
      return res.status(401).json({ mensagem: "PIN inválido" });
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
      const input = req.body;
      const novaTurma = await storage.criarTurma({ 
        nome: input.nome,
        ano: Number(input.ano),
        semestre: Number(input.semestre),
        professorId: req.session.usuarioId 
      });
      res.status(201).json(novaTurma);
    } catch (err) {
      res.status(400).json({ mensagem: "Erro ao criar turma" });
    }
  });

  // Alunos
  app.get(api.alunos.listar.path, autenticar, async (req, res) => {
    const alunosList = await storage.getAlunos();
    res.json(alunosList);
  });

  app.get("/api/alunos/:id", autenticar, async (req, res) => {
    const id = Number(req.params.id);
    const aluno = await storage.getAluno(id);
    if (!aluno) return res.status(404).json({ mensagem: "Aluno não encontrado" });

    const turmasMatriculadas = await storage.getTurmasDoAluno(id);
    const notasAluno = await storage.getNotasDoAluno(id);
    const frequenciaAluno = await storage.getFrequenciaDoAluno(id);

    res.json({
      ...aluno,
      turmas: turmasMatriculadas,
      notas: notasAluno,
      frequencia: frequenciaAluno
    });
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
      const input = req.body;
      const avaliacao = await storage.criarAvaliacao({ 
        nome: input.nome,
        notaMaxima: parseFloat(input.notaMaxima) || 10,
        peso: parseFloat(input.peso) || 1,
        unidadeCurricularId 
      });
      res.status(201).json(avaliacao);
    } catch (err) {
      res.status(400).json({ mensagem: "Erro ao criar avaliação" });
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
      const input = req.body;
      const nota = await storage.atualizarNota({
        alunoId: Number(input.alunoId),
        avaliacaoId: Number(input.avaliacaoId),
        valor: parseFloat(input.valor)
      });
      res.json(nota);
    } catch (err) {
      res.status(400).json({ mensagem: "Erro ao atualizar nota" });
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

  app.get("/api/attendance-history", autenticar, async (req, res) => {
    const history = await storage.getHistoricoCompletoFrequencia();
    res.json(history);
  });

  // Object Storage Routes
  registerObjectStorageRoutes(app);

  // Fotos de Alunos
  app.get("/api/all-student-photos", autenticar, async (req, res) => {
    const alunos = await storage.getAlunos();
    const todasFotos = [];
    for (const aluno of alunos) {
      const fotos = await storage.getFotosDoAluno(aluno.id);
      todasFotos.push(...fotos.map(f => ({ ...f, studentName: aluno.nome })));
    }
    res.json(todasFotos);
  });

  app.get("/api/alunos/:id/fotos", autenticar, async (req, res) => {
    const id = Number(req.params.id);
    const fotos = await storage.getFotosDoAluno(id);
    res.json(fotos);
  });

  app.post("/api/alunos/:id/fotos", autenticar, async (req: any, res) => {
    const alunoId = Number(req.params.id);
    const { objectPath, fotoBase64 } = req.body;
    if (!objectPath && !fotoBase64) {
      return res.status(400).json({ mensagem: "objectPath ou fotoBase64 é obrigatório" });
    }
    const foto = await storage.adicionarFotoAluno({ alunoId, objectPath, fotoBase64 });
    res.status(201).json(foto);
  });

  app.delete("/api/fotos/:id", autenticar, async (req, res) => {
    const id = Number(req.params.id);
    await storage.excluirFotoAluno(id);
    res.status(204).end();
  });

  // Critérios de Avaliação
  app.get("/api/unidades-curriculares/:id/criterios", autenticar, async (req, res) => {
    const ucId = Number(req.params.id);
    const criterios = await storage.getCriteriosDaUC(ucId);
    res.json(criterios);
  });

  app.post("/api/unidades-curriculares/:id/criterios", autenticar, async (req, res) => {
    const ucId = Number(req.params.id);
    const { criterios } = req.body;
    
    if (!Array.isArray(criterios)) {
      return res.status(400).json({ mensagem: "Formato inválido. Esperado um array de critérios." });
    }

    const criados = [];
    for (const item of criterios) {
      const criado = await storage.criarCriterio({
        unidadeCurricularId: ucId,
        descricao: item.descricao,
        peso: parseFloat(item.peso) || 1.0
      });
      criados.push(criado);
    }
    res.json(criados);
  });

  app.get("/api/unidades-curriculares/:ucId/alunos/:alunoId/aproveitamento", autenticar, async (req, res) => {
    const ucId = Number(req.params.ucId);
    const alunoId = Number(req.params.alunoId);
    const nota = await storage.getNotaCriterio(alunoId, ucId);
    res.json(nota);
  });

  app.get("/api/unidades-curriculares/:ucId/alunos/:alunoId/atendimentos", autenticar, async (req, res) => {
    const ucId = Number(req.params.ucId);
    const alunoId = Number(req.params.alunoId);
    const atendimentos = await storage.getCriteriosAtendidosPorUC(alunoId, ucId);
    res.json(atendimentos);
  });

  app.post("/api/atendimentos", autenticar, async (req, res) => {
    const { alunoId, criterioId, atendido } = req.body;
    const result = await storage.registrarCriterioAtendido({
      alunoId: Number(alunoId),
      criterioId: Number(criterioId),
      atendido: Number(atendido)
    });
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
    
    const totem = await storage.getUsuarioPorEmail("totem@senai.br");
    if (!totem) {
      await storage.criarUsuario({
        nome: "Totem Terminal",
        email: "totem@senai.br",
        senha: "senai-totem-123",
        perfil: "totem"
      });
    }
  })();

  return httpServer;
}
