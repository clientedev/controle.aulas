import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

async function handleResponse<T>(res: Response, schema: z.ZodSchema<T>): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "An error occurred" }));
    throw new Error(error.message || `Error ${res.status}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

// POST /api/classes/:id/evaluations
export function useCreateEvaluation(classId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.evaluations.create.input>) => {
      // Coerce numeric inputs
      const payload = {
        ...data,
        maxScore: Number(data.maxScore),
        weight: Number(data.weight),
      };
      
      const url = buildUrl(api.evaluations.create.path, { id: classId });
      const res = await fetch(url, {
        method: api.evaluations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      return handleResponse(res, api.evaluations.create.responses[201]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.classes.get.path, classId] });
      toast({ title: "Success", description: "Evaluation created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
