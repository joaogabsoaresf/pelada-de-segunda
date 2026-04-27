"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

interface AuthUser {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
}

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<AuthUser>({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) throw new Error("Não autenticado");
      return res.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    queryClient.removeQueries({ queryKey: ["auth-user"] });
    router.push("/login");
  }

  return { user, isLoading, logout };
}
