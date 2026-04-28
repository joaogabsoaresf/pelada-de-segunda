"use client"

import { useQuery } from "@tanstack/react-query"

export interface PlayerStat {
  userId: string
  name: string
  count: number
}

export interface PlayerWinStat {
  userId: string
  name: string
  gamesPlayed: number
  wins: number
  winRate: number
}

export interface StatsResult {
  topScorers: PlayerStat[]
  topAssisters: PlayerStat[]
  gamesPlayed: number
  totalGoals: number
  playerStats: PlayerWinStat[]
  month: string | null
}

export interface GoalsPerPelada {
  peladaId: string
  date: string
  totalGoals: number
}

export interface PlayerGoals {
  playerId: string
  total: number
}

export interface PlayerAssists {
  playerId: string
  total: number
}

export function useStats(month?: string) {
  return useQuery({
    queryKey: ["stats", month ?? "all"],
    queryFn: async (): Promise<StatsResult> => {
      const url = month ? `/api/stats?month=${month}` : "/api/stats"
      const res = await fetch(url)
      if (!res.ok) throw new Error("Erro ao buscar estatísticas")
      return res.json()
    },
  })
}

export function useGoalsPerPelada() {
  return useQuery({
    queryKey: ["stats", "goals-per-pelada"],
    queryFn: async (): Promise<GoalsPerPelada[]> => {
      const res = await fetch("/api/stats/goals-per-pelada")
      if (!res.ok) throw new Error("Erro ao buscar gols por pelada")
      return res.json()
    },
  })
}

export function usePlayerGoals() {
  return useQuery({
    queryKey: ["stats", "player-goals"],
    queryFn: async (): Promise<PlayerGoals[]> => {
      const res = await fetch("/api/stats/player-goals")
      if (!res.ok) throw new Error("Erro ao buscar gols de jogadores")
      return res.json()
    },
  })
}

export function usePlayerAssists() {
  return useQuery({
    queryKey: ["stats", "player-assists"],
    queryFn: async (): Promise<PlayerAssists[]> => {
      const res = await fetch("/api/stats/player-assists")
      if (!res.ok) throw new Error("Erro ao buscar assistências de jogadores")
      return res.json()
    },
  })
}
