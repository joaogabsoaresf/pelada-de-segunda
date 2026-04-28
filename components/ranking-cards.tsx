"use client"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Target, Zap } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useStats, type PlayerStat } from "@/hooks/use-stats"

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

function RankingList({
  title,
  icon: Icon,
  iconColor,
  players,
  badgeClass,
  unit,
  isLoading,
}: {
  title: string
  icon: typeof Target
  iconColor: string
  players: PlayerStat[]
  badgeClass: string
  unit: string
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="p-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <p className="font-bold text-sm">{title}</p>
      </div>
      {players.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Sem dados</p>
      ) : (
        <ScrollArea className="h-[220px]">
          <div className="divide-y">
            {players.map((player, i) => {
              const color = getAvatarColor(player.name)
              return (
                <div key={player.userId} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-lg w-6 text-center shrink-0">{MEDALS[i] ?? `${i + 1}º`}</span>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className={`text-xs font-bold ${color.bg} ${color.text}`}>
                      {player.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="flex-1 font-semibold text-sm truncate">{player.name}</p>
                  <Badge className={`${badgeClass} border-0 font-bold text-xs`}>
                    {player.count} {player.count === 1 ? unit : unit + "s"}
                  </Badge>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

export function RankingCards() {
  const currentMonth = format(new Date(), "yyyy-MM")
  const monthLabel = format(new Date(), "MMMM", { locale: ptBR })

  const { data: monthStats, isLoading: loadingMonth } = useStats(currentMonth)
  const { data: allStats, isLoading: loadingAll } = useStats()

  return (
    <div className="px-4 lg:px-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
          Ranking de {monthLabel}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
        <RankingList
          title="Artilheiros do mês"
          icon={Target}
          iconColor="text-green-600"
          players={monthStats?.topScorers ?? []}
          badgeClass="bg-green-100 text-green-700 hover:bg-green-100"
          unit="gol"
          isLoading={loadingMonth}
        />
        <RankingList
          title="Assistências do mês"
          icon={Zap}
          iconColor="text-blue-500"
          players={monthStats?.topAssisters ?? []}
          badgeClass="bg-blue-100 text-blue-700 hover:bg-blue-100"
          unit="assist"
          isLoading={loadingMonth}
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
          Ranking geral
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
        <RankingList
          title="Artilheiros geral"
          icon={Target}
          iconColor="text-green-600"
          players={allStats?.topScorers ?? []}
          badgeClass="bg-green-100 text-green-700 hover:bg-green-100"
          unit="gol"
          isLoading={loadingAll}
        />
        <RankingList
          title="Assistências geral"
          icon={Zap}
          iconColor="text-blue-500"
          players={allStats?.topAssisters ?? []}
          badgeClass="bg-blue-100 text-blue-700 hover:bg-blue-100"
          unit="assist"
          isLoading={loadingAll}
        />
      </div>
    </div>
  )
}
