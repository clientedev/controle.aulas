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

  app.get(api.turmas.obter.path, autenticar, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const turma = await storage.getTurma(id);
      if (!turma) return res.status(404).json({ mensagem: "Turma não encontrada" });

      // Verificar se o professor tem acesso à turma (ou se é admin)
      const usuario = await storage.getUsuario(req.session.usuarioId);
      if (usuario?.perfil !== "admin" && turma.professorId !== req.session.usuarioId) {
        return res.status(403).json({ mensagem: "Acesso negado" });
      }

      res.json(turma);
    } catch (err) {
      console.error("Erro ao obter turma:", err);
      res.status(500).json({ mensagem: "Erro interno do servidor" });
    }
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
    try {
      const id = parseInt(req.params.id, 10);
      console.log(`Requisição GET /api/alunos/${req.params.id} -> ID processado: ${id}`);
      
      if (isNaN(id)) {
        return res.status(400).json({ mensagem: "ID de aluno inválido" });
      }
      
      const aluno = await storage.getAluno(id);
      if (!aluno) {
        console.error(`Aluno ID ${id} não encontrado no banco`);
        return res.status(404).json({ mensagem: "Aluno não encontrado" });
      }

      // Buscar dependências com logs individuais para identificar falhas
      let turmasMatriculadas: any[] = [];
      try {
        turmasMatriculadas = await storage.getTurmasDoAluno(id);
      } catch (e) {
        console.error(`Erro ao buscar turmas do aluno ${id}:`, e);
      }

      let notasAluno: any[] = [];
      try {
        notasAluno = await storage.getNotasDoAluno(id);
      } catch (e) {
        console.error(`Erro ao buscar notas do aluno ${id}:`, e);
      }

      let frequenciaAluno: any[] = [];
      try {
        frequenciaAluno = await storage.getFrequenciaDoAluno(id);
      } catch (e) {
        console.error(`Erro ao buscar frequencia do aluno ${id}:`, e);
      }

      res.json({
        ...aluno,
        turmas: turmasMatriculadas,
        notas: notasAluno,
        frequencia: frequenciaAluno
      });
    } catch (error) {
      console.error(`Erro CRÍTICO no endpoint /api/alunos/${req.params.id}:`, error);
      res.status(500).json({ mensagem: "Erro interno ao buscar dados do aluno" });
    }
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

  app.delete("/api/alunos/:id", autenticar, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ mensagem: "ID de aluno inválido" });
      }
      await storage.excluirAluno(id);
      res.status(204).end();
    } catch (err: any) {
      console.error("Erro ao excluir aluno:", err);
      res.status(400).json({ 
        mensagem: "Erro ao excluir aluno.",
        detalhes: err.message 
      });
    }
  });

  app.post(api.alunos.matricular.path, autenticar, async (req: any, res) => {
    const turmaId = Number(req.params.id);
    const { alunoId } = req.body;
    await storage.matricularAluno(turmaId, alunoId);
    res.json({ mensagem: "Matriculado com sucesso" });
  });

  // Avaliações
  app.post("/api/turmas/:id/avaliacoes", autenticar, async (req: any, res) => {
    const turmaId = Number(req.params.id);
    try {
      const input = req.body;
      const avaliacao = await storage.criarAvaliacao({ 
        nome: input.nome,
        notaMaxima: parseFloat(input.notaMaxima) || 100,
        peso: parseFloat(input.peso) || 1,
        turmaId,
        unidadeCurricularId: input.unidadeCurricularId ? Number(input.unidadeCurricularId) : null
      });
      res.status(201).json(avaliacao);
    } catch (err) {
      res.status(400).json({ mensagem: "Erro ao criar avaliação" });
    }
  });

  app.get("/api/turmas/:id/avaliacoes", autenticar, async (req, res) => {
    const turmaId = Number(req.params.id);
    const avaliacoes = await storage.getAvaliacoesDaTurma(turmaId);
    res.json(avaliacoes);
  });

  app.post("/api/unidades-curriculares/:id/avaliacoes", autenticar, async (req: any, res) => {
    const unidadeCurricularId = Number(req.params.id);
    try {
      const input = req.body;
      // Precisamos do turmaId para a nova estrutura
      const ucs = await storage.getUnidadesCurricularesDaTurma(0); // Mock call to get schema context if needed, but better find it
      // Na verdade, vamos buscar a UC para pegar o turmaId
      const ucsDaTurma = await storage.getUnidadesCurricularesDaTurma(unidadeCurricularId); // This is also not ideal
      
      // Vamos assumir que o frontend agora usa a rota de turma, mas para manter compatibilidade:
      // Precisaríamos buscar a UC no banco. Como não quero importar o db aqui se não estiver, vou simplificar.
      // A maioria das chamadas virá da nova rota /api/turmas/:id/avaliacoes
      res.status(400).json({ mensagem: "Use a rota /api/turmas/:id/avaliacoes para criar avaliações" });
    } catch (err) {
      res.status(400).json({ mensagem: "Erro ao criar avaliação" });
    }
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
  app.get("/api/turmas/:id/fotos", autenticar, async (req, res) => {
    const turmaId = Number(req.params.id);
    const alunos = await storage.getAlunosDaTurma(turmaId);
    const fotos = [];
    for (const aluno of alunos) {
      const alunoFotos = await storage.getFotosDoAluno(aluno.id);
      fotos.push(...alunoFotos.map(f => ({ ...f, studentName: aluno.nome })));
    }
    res.json(fotos);
  });

  app.get("/api/turmas/:id/alunos", autenticar, async (req, res) => {
    const id = Number(req.params.id);
    const alunos = await storage.getAlunosDaTurma(id);
    res.json(alunos);
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

  app.delete("/api/turmas/:id", autenticar, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ mensagem: "ID de turma inválido" });
      }
      
      console.log(`Tentando excluir turma ID: ${id}`);
      await storage.excluirTurma(id);
      
      res.status(204).end();
    } catch (err: any) {
      console.error("Erro ao excluir turma:", err);
      res.status(400).json({ 
        mensagem: "Erro ao excluir turma.",
        detalhes: err.message 
      });
    }
  });

  app.get("/api/turmas/:id/notas-com-criterios", autenticar, async (req, res) => {
    const turmaId = Number(req.params.id);
    const alunos = await storage.getAlunosDaTurma(turmaId);
    const ucs = await storage.getUnidadesCurricularesDaTurma(turmaId);
    
    const result = [];
    for (const aluno of alunos) {
      for (const uc of ucs) {
        const avaliacoes = await storage.getAvaliacoesDaUnidadeCurricular(uc.id);
        let somaNotas = 0;
        let count = 0;
        
        for (const av of avaliacoes) {
          const studentNotas = await storage.getNotasDoAluno(aluno.id);
          const nota = studentNotas.find(n => n.avaliacaoId === av.id);
          if (nota) {
            somaNotas += nota.valor;
            count++;
          }
        }
        
        const avaliacoesAvg = count > 0 ? somaNotas / count : 0;
        const notaCriterio = await storage.getNotaCriterio(aluno.id, uc.id);
        const criteriosScore = notaCriterio ? (notaCriterio.aproveitamento * 100) : 0;
        
        let finalGrade = 0;
        if (count > 0 && notaCriterio) {
          finalGrade = (avaliacoesAvg + criteriosScore) / 2;
        } else if (count > 0) {
          finalGrade = avaliacoesAvg;
        } else if (notaCriterio) {
          finalGrade = criteriosScore;
        }
        
        result.push({
          alunoId: aluno.id,
          unidadeCurricularId: uc.id,
          notaFinal: finalGrade
        });
      }
    }
    res.json(result);
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
    try {
      const ucId = Number(req.params.id);
      const { criterios } = req.body;
      
      console.log("Recebendo critérios para UC", ucId, ":", JSON.stringify(criterios));
      
      if (!Array.isArray(criterios)) {
        return res.status(400).json({ mensagem: "Formato inválido. Esperado um array de critérios." });
      }

      if (criterios.length === 0) {
        return res.status(400).json({ mensagem: "Nenhum critério encontrado na planilha." });
      }

      const criados = [];
      for (const item of criterios) {
        // Validar campos obrigatórios
        if (!item.descricao || typeof item.descricao !== 'string' || item.descricao.trim() === '') {
          console.warn("Critério sem descrição válida ignorado:", item);
          continue;
        }
        
        const criado = await storage.criarCriterio({
          unidadeCurricularId: ucId,
          descricao: String(item.descricao).trim(),
          peso: parseFloat(item.peso) || 1.0
        });
        criados.push(criado);
      }
      
      if (criados.length === 0) {
        return res.status(400).json({ mensagem: "Nenhum critério válido encontrado. Verifique se a planilha tem a coluna 'Descrição'." });
      }
      
      console.log("Critérios criados com sucesso:", criados.length);
      res.json(criados);
    } catch (error: any) {
      console.error("Erro ao importar critérios:", error);
      res.status(500).json({ mensagem: error.message || "Erro interno ao importar critérios" });
    }
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
