"use client"

import { useState } from "react"
import { Trophy, ChevronLeft, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useStats } from "@/hooks/use-stats"

const AVATAR_COLORS = [
  { bg: "bg-green-500", text: "text-white" },
  { bg: "bg-blue-500", text: "text-white" },
  { bg: "bg-violet-500", text: "text-white" },
  { bg: "bg-rose-500", text: "text-white" },
  { bg: "bg-amber-500", text: "text-white" },
  { bg: "bg-teal-500", text: "text-white" },
  { bg: "bg-cyan-600", text: "text-white" },
  { bg: "bg-orange-500", text: "text-white" },
]

function getAvatarColor(name: string) {
  if (!name) return AVATAR_COLORS[0]
  const idx = (name.charCodeAt(0) + (name.charCodeAt(name.length - 1) || 0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

const MEDALS = ["🥇", "🥈", "🥉"]
const PAGE_SIZE = 10

export function WinRateTable() {
  const { data: stats, isLoading } = useStats()
  const [page, setPage] = useState(0)

  if (isLoading) {
    return (
      <div className="px-4 lg:px-6 space-y-4">
        <Skeleton className="h-6 w-48 mx-auto" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  const players = stats?.playerStats ?? []
  if (players.length === 0) return null

  const totalPages = Math.ceil(players.length / PAGE_SIZE)
  const paginated = players.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="px-4 lg:px-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
          Ranking de vitórias geral
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <p className="font-bold text-sm">% de Vitórias</p>
          </div>
          <span className="text-xs text-muted-foreground">{players.length} jogadores</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-semibold text-xs text-muted-foreground px-4 py-2.5">Jogador</th>
                <th className="text-center font-semibold text-xs text-muted-foreground px-3 py-2.5 w-20">Jogos</th>
                <th className="text-center font-semibold text-xs text-muted-foreground px-3 py-2.5 w-20">Vitórias</th>
                <th className="text-center font-semibold text-xs text-muted-foreground px-3 py-2.5 w-20">%</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginated.map((player, i) => {
                const rank = page * PAGE_SIZE + i
                const color = getAvatarColor(player.name)
                return (
                  <tr key={player.userId} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base w-6 text-center shrink-0">
                          {MEDALS[rank] ?? `${rank + 1}º`}
                        </span>
                        <Avatar className="w-7 h-7 shrink-0">
                          <AvatarFallback className={`text-[10px] font-bold ${color.bg} ${color.text}`}>
                            {player.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-sm truncate">{player.name}</span>
                      </div>
                    </td>
                    <td className="text-center px-3 py-2.5 font-medium text-muted-foreground">
                      {player.gamesPlayed}
                    </td>
                    <td className="text-center px-3 py-2.5 font-medium text-muted-foreground">
                      {player.wins}
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <Badge
                        className={`border-0 text-xs font-bold px-2 ${
                          player.winRate >= 60
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : player.winRate >= 40
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                            : "bg-red-100 text-red-700 hover:bg-red-100"
                        }`}
                      >
                        {player.winRate}%
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              {page + 1} de {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={page === totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Próximo
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
