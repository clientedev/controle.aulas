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

// GET /api/students
export function useStudents() {
  return useQuery({
    queryKey: [api.students.list.path],
    queryFn: async () => {
      const res = await fetch(api.students.list.path, { credentials: "include" });
      return handleResponse(res, api.students.list.responses[200]);
    },
  });
}

// POST /api/students (Create Student)
export function useCreateStudent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.students.create.input>) => {
      const res = await fetch(api.students.create.path, {
        method: api.students.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      return handleResponse(res, api.students.create.responses[201]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.students.list.path] });
      toast({ title: "Success", description: "Student created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

// POST /api/classes/:id/enroll (Enroll Student in Class)
export function useEnrollStudent(classId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (studentId: number) => {
      const url = buildUrl(api.students.enroll.path, { id: classId });
      const res = await fetch(url, {
        method: api.students.enroll.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
        credentials: "include",
      });
      return handleResponse(res, api.students.enroll.responses[200]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.classes.get.path, classId] });
      toast({ title: "Success", description: "Student enrolled successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
