import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

async function handleResponse<T>(res: Response, schema?: z.ZodSchema<T>): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ mensagem: "Ocorreu um erro" }));
    throw new Error(error.mensagem || `Erro ${res.status}`);
  }
  const data = await res.json();
  if (schema) {
    return schema.parse(data);
  }
  return data;
}

export function useStudents() {
  return useQuery({
    queryKey: [api.alunos.listar.path],
    queryFn: async () => {
      const res = await fetch(api.alunos.listar.path);
      return handleResponse(res, api.alunos.listar.responses[200]);
    },
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.alunos.criar.path, {
        method: api.alunos.criar.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse(res, api.alunos.criar.responses[201]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.alunos.listar.path] });
      toast({ title: "Sucesso", description: "Aluno criado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useCreateManyStudents() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (students: any[]) => {
      const results = [];
      for (const student of students) {
        const res = await fetch(api.alunos.criar.path, {
          method: api.alunos.criar.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(student),
        });
        if (res.ok) {
          results.push(await res.json());
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.alunos.listar.path] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: "Erro ao importar alguns alunos", variant: "destructive" });
    },
  });
}

export function useEnrollStudent(turmaId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (alunoId: number) => {
      const url = buildUrl(api.alunos.matricular.path, { id: turmaId });
      const res = await fetch(url, {
        method: api.alunos.matricular.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alunoId }),
      });
      return handleResponse(res, api.alunos.matricular.responses[200]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.turmas.obter.path, turmaId] });
      toast({ title: "Sucesso", description: "Aluno matriculado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}
