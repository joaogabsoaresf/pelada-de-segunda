"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export interface GameEvent {
  type: "goal" | "assist" | "note"
  playerId?: string
  relatedPlayerId?: string
  note?: string
  createdAt: string
}

export interface Game {
  id: string
  matchDayId: string
  teamA: { id: string; players: string[] }
  teamB: { id: string; players: string[] }
  waitingList: string[]
  status: "pending" | "live" | "finished"
  startedAt?: string
  endedAt?: string
  events: GameEvent[]
  createdAt: string
}

export function useGame(id: string) {
  return useQuery({
    queryKey: ["games", id],
    queryFn: async (): Promise<Game> => {
      const res = await fetch(`/api/games/${id}`)
      if (!res.ok) throw new Error("Jogo não encontrado")
      return res.json()
    },
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === "live" ? 5000 : false,
  })
}

export function useGameSummary(id: string) {
  return useQuery({
    queryKey: ["games", id, "summary"],
    queryFn: async () => {
      const res = await fetch(`/api/games/${id}/summary`)
      if (!res.ok) throw new Error("Erro ao buscar resumo")
      return res.json()
    },
    enabled: !!id,
  })
}

export function useCreateGame() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      matchDayId: string
      teamAId: string
      teamBId: string
    }) => {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao criar jogo")
      }
      return res.json() as Promise<Game>
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["peladas", vars.matchDayId] })
    },
  })
}

export function useStartGame() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/games/${id}/start`, { method: "POST" })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao iniciar jogo")
      }
      return res.json() as Promise<Game>
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["games", id] })
    },
  })
}

export function useFinishGame() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/games/${id}/finish`, { method: "POST" })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao finalizar jogo")
      }
      return res.json() as Promise<Game>
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["games", id] })
      queryClient.invalidateQueries({ queryKey: ["games", id, "summary"] })
    },
  })
}

export function useAddEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      gameId,
      ...event
    }: {
      gameId: string
      type: "goal" | "assist" | "note"
      playerId?: string
      relatedPlayerId?: string
      note?: string
    }) => {
      const res = await fetch(`/api/games/${gameId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao registrar evento")
      }
      return res.json() as Promise<Game>
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["games", vars.gameId] })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ gameId, eventIndex }: { gameId: string; eventIndex: number }) => {
      const res = await fetch(`/api/games/${gameId}/events/${eventIndex}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao remover evento")
      }
      return res.json() as Promise<Game>
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["games", vars.gameId] })
    },
  })
}

export function useUpdateGameTeams() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      gameId,
      teamAPlayers,
      teamBPlayers,
      waitingList,
    }: {
      gameId: string
      teamAPlayers: string[]
      teamBPlayers: string[]
      waitingList?: string[]
    }) => {
      const res = await fetch(`/api/games/${gameId}/teams`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamAPlayers, teamBPlayers, waitingList }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro ao atualizar times")
      }
      return res.json() as Promise<Game>
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["games", vars.gameId] })
    },
  })
}
