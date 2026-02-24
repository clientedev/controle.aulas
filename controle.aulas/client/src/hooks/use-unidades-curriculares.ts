import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { UnidadeCurricular } from "@shared/schema";

export function useUnidadesCurriculares(turmaId: number) {
  return useQuery<UnidadeCurricular[]>({
    queryKey: [api.unidadesCurriculares.listar.path, { turmaId }],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.unidadesCurriculares.listar.path, { id: turmaId }));
      if (!res.ok) throw new Error("Erro ao carregar unidades curriculares");
      return res.json();
    },
  });
}

export function useCreateUnidadeCurricular(turmaId: number) {
  return useMutation({
    mutationFn: async (nome: string) => {
      const res = await fetch(buildUrl(api.unidadesCurriculares.criar.path, { id: turmaId }), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      if (!res.ok) throw new Error("Erro ao criar unidade curricular");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.unidadesCurriculares.listar.path, { turmaId }] });
      queryClient.invalidateQueries({ queryKey: [api.turmas.obter.path, { id: turmaId }] });
    },
  });
}
