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

// GET /api/classes/:id/grades
export function useClassGrades(classId: number) {
  return useQuery({
    queryKey: [api.grades.listByClass.path, classId],
    queryFn: async () => {
      const url = buildUrl(api.grades.listByClass.path, { id: classId });
      const res = await fetch(url, { credentials: "include" });
      return handleResponse(res, api.grades.listByClass.responses[200]);
    },
    enabled: !!classId,
  });
}

// POST /api/grades
export function useUpdateGrade(classId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.grades.update.input>) => {
       // Coerce numeric inputs
       const payload = {
        ...data,
        score: Number(data.score),
      };

      const res = await fetch(api.grades.update.path, {
        method: api.grades.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      return handleResponse(res, api.grades.update.responses[200]);
    },
    onSuccess: () => {
      // Invalidate grades for this class to refresh matrix
      queryClient.invalidateQueries({ queryKey: [api.grades.listByClass.path, classId] });
      toast({ title: "Saved", description: "Grade updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
