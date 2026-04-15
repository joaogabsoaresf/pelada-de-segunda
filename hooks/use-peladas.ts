"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export interface PeladaPlayer {
  userId: string
  pot: number
  name: string
  phone: string
  type: string
}

export interface PeladaTeam {
  id: string
  name: string
  players: { userId: string; name: string; phone: string }[]
}

export interface Pelada {
  id: string
  date: string
  status: "active" | "finished"
  players: PeladaPlayer[]
  teams: PeladaTeam[]
  createdAt: string
}

export interface PeladaSummary {
  id: string
  date: string
  status: "active" | "finished"
  mensalistas: number
  diaristas: number
  goals: number
  assists: number
}

export function usePeladas() {
  return useQuery({
    queryKey: ["peladas"],
    queryFn: async (): Promise<Pelada[]> => {
      const res = await fetch("/api/match-days")
      if (!res.ok) throw new Error("Erro ao buscar peladas")
      return res.json()
    },
  })
}

export function usePeladasSummary() {
  return useQuery({
    queryKey: ["peladas", "summary"],
    queryFn: async (): Promise<PeladaSummary[]> => {
      const res = await fetch("/api/match-days/summary")
      if (!res.ok) throw new Error("Erro ao buscar resumo")
      return res.json()
    },
  })
}

export function usePelada(id: string) {
  return useQuery({
    queryKey: ["peladas", id],
    queryFn: async (): Promise<Pelada> => {
      const res = await fetch(`/api/match-days/${id}`)
      if (!res.ok) throw new Error("Pelada não encontrada")
      return res.json()
    },
    enabled: !!id,
  })
}

export function useCreatePelada() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (date: string) => {
      const res = await fetch("/api/match-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao criar pelada")
      }
      return res.json() as Promise<Pelada>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peladas"] })
    },
  })
}

export function useDeletePelada() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/match-days/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao excluir pelada")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peladas"] })
    },
  })
}

export function usePatchPelada() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status?: string; date?: string }) => {
      const res = await fetch(`/api/match-days/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao atualizar pelada")
      }
      return res.json()
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["peladas"] })
      queryClient.invalidateQueries({ queryKey: ["peladas", vars.id] })
    },
  })
}

export function useAddPlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ matchDayId, userId }: { matchDayId: string; userId: string }) => {
      const res = await fetch(`/api/match-days/${matchDayId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao adicionar jogador")
      }
      return res.json()
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["peladas", vars.matchDayId] })
    },
  })
}

export function useRemovePlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ matchDayId, userId }: { matchDayId: string; userId: string }) => {
      const res = await fetch(
        `/api/match-days/${matchDayId}/players?userId=${userId}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao remover jogador")
      }
      return res.json()
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["peladas", vars.matchDayId] })
    },
  })
}

export function useSetPot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      matchDayId,
      userId,
      pot,
    }: {
      matchDayId: string
      userId: string
      pot: number
    }) => {
      const res = await fetch(`/api/match-days/${matchDayId}/players/pot`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, pot }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao definir pote")
      }
      return res.json()
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["peladas", vars.matchDayId] })
    },
  })
}

export function useDrawTeams() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      matchDayId,
      numTeams,
    }: {
      matchDayId: string
      numTeams: number
    }) => {
      const res = await fetch(`/api/match-days/${matchDayId}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numTeams }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao sortear times")
      }
      return res.json()
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["peladas", vars.matchDayId] })
    },
  })
}

export function useUpdateTeams() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      matchDayId,
      teams,
    }: {
      matchDayId: string
      teams: { id: string; name: string; players: string[] }[]
    }) => {
      const res = await fetch(`/api/match-days/${matchDayId}/teams`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao salvar times")
      }
      return res.json()
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["peladas", vars.matchDayId] })
    },
  })
}

export function usePeladaGamesStats(id: string) {
  return useQuery({
    queryKey: ["peladas", id, "games-stats"],
    queryFn: async () => {
      const res = await fetch(`/api/match-days/${id}/games-stats`)
      if (!res.ok) throw new Error("Erro ao buscar stats")
      return res.json()
    },
    enabled: !!id,
  })
}
