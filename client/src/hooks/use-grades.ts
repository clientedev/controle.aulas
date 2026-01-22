import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

async function handleResponse<T>(res: Response, schema: z.ZodSchema<T>): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ mensagem: "Ocorreu um erro" }));
    throw new Error(error.mensagem || `Erro ${res.status}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

export function useClassGrades(turmaId: number) {
  return useQuery({
    queryKey: [api.notas.listarPorTurma.path, turmaId],
    queryFn: async () => {
      const url = buildUrl(api.notas.listarPorTurma.path, { id: turmaId });
      const res = await fetch(url);
      return handleResponse(res, api.notas.listarPorTurma.responses[200]);
    },
    enabled: !!turmaId,
  });
}

export function useUpdateGrade(turmaId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.notas.atualizar.input>) => {
       const payload = {
        ...data,
        valor: Number(data.valor),
      };

      const res = await fetch(api.notas.atualizar.path, {
        method: api.notas.atualizar.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return handleResponse(res, api.notas.atualizar.responses[200]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.notas.listarPorTurma.path, turmaId] });
      toast({ title: "Salvo", description: "Nota atualizada com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}
