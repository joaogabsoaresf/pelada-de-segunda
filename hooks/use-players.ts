"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export interface Player {
  id: string
  name: string
  phone: string
  type: "monthly" | "daily" | "goalkeeper"
  defaultPot: number
  createdAt: string
}

async function fetchPlayers(q?: string): Promise<Player[]> {
  const url = q ? `/api/users?q=${encodeURIComponent(q)}` : "/api/users"
  const res = await fetch(url)
  if (!res.ok) throw new Error("Erro ao buscar jogadores")
  return res.json()
}

async function fetchPlayer(id: string): Promise<Player> {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error("Jogador não encontrado")
  return res.json()
}

export function usePlayers(q?: string) {
  return useQuery({
    queryKey: ["players", q ?? ""],
    queryFn: () => fetchPlayers(q),
  })
}

export function usePlayer(id: string) {
  return useQuery({
    queryKey: ["player", id],
    queryFn: () => fetchPlayer(id),
    enabled: !!id,
  })
}

export function useCreatePlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; phone: string; type: string; defaultPot?: number }) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao criar jogador")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] })
    },
  })
}

export function useUpdatePlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; phone?: string; type?: string; defaultPot?: number }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao atualizar jogador")
      }
      return res.json()
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["players"] })
      queryClient.invalidateQueries({ queryKey: ["player", vars.id] })
    },
  })
}

export function useDeletePlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao excluir jogador")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] })
    },
  })
}
