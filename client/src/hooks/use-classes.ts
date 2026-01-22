import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Helper to handle API errors
async function handleResponse<T>(res: Response, schema: z.ZodSchema<T>): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "An unexpected error occurred" }));
    throw new Error(error.message || `Error ${res.status}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

// GET /api/classes
export function useClasses() {
  return useQuery({
    queryKey: [api.classes.list.path],
    queryFn: async () => {
      const res = await fetch(api.classes.list.path, { credentials: "include" });
      return handleResponse(res, api.classes.list.responses[200]);
    },
  });
}

// GET /api/classes/:id
export function useClass(id: number) {
  return useQuery({
    queryKey: [api.classes.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.classes.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      return handleResponse(res, api.classes.get.responses[200]);
    },
    enabled: !!id,
  });
}

// POST /api/classes
export function useCreateClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.classes.create.input>) => {
      const res = await fetch(api.classes.create.path, {
        method: api.classes.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      return handleResponse(res, api.classes.create.responses[201]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.classes.list.path] });
      toast({ title: "Success", description: "Class created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

// DELETE /api/classes/:id
export function useDeleteClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.classes.delete.path, { id });
      const res = await fetch(url, {
        method: api.classes.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete class");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.classes.list.path] });
      toast({ title: "Success", description: "Class deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
