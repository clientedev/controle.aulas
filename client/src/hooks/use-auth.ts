import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Usuario } from "@shared/schema";
import { api } from "@shared/routes";

async function fetchMe(): Promise<Usuario | null> {
  const response = await fetch(api.auth.me.path);
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Falha ao buscar usuário");
  return response.json();
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<Usuario | null>({
    queryKey: [api.auth.me.path],
    queryFn: fetchMe,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; senha: string }) => {
      const res = await fetch(api.auth.login.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.mensagem || "Falha no login");
      }
      return res.json();
    },
    onSuccess: (newUser) => {
      queryClient.setQueryData([api.auth.me.path], newUser);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch(api.auth.logout.path, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      window.location.href = "/login";
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation,
    logout: logoutMutation,
  };
}
