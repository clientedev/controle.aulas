import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

async function handleResponse<T>(res: Response, schema: z.ZodSchema<T>): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ mensagem: "Ocorreu um erro inesperado" }));
    throw new Error(error.mensagem || `Erro ${res.status}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

export function useClasses() {
  return useQuery({
    queryKey: [api.turmas.listar.path],
    queryFn: async () => {
      const res = await fetch(api.turmas.listar.path);
      return handleResponse(res, api.turmas.listar.responses[200]);
    },
  });
}

export function useClass(id: number) {
  return useQuery({
    queryKey: [api.turmas.obter.path, id],
    queryFn: async () => {
      const url = buildUrl(api.turmas.obter.path, { id });
      const res = await fetch(url);
      return handleResponse(res, api.turmas.obter.responses[200]);
    },
    enabled: !!id,
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.turmas.criar.input>) => {
      const res = await fetch(api.turmas.criar.path, {
        method: api.turmas.criar.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse(res, api.turmas.criar.responses[201]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.turmas.listar.path] });
      toast({ title: "Sucesso", description: "Turma criada com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.turmas.excluir.path, { id });
      const res = await fetch(url, {
        method: api.turmas.excluir.method,
      });
      if (!res.ok) throw new Error("Falha ao excluir turma");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.turmas.listar.path] });
      toast({ title: "Sucesso", description: "Turma excluída com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}
