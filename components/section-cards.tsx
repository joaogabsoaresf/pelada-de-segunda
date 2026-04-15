"use client"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { UsersIcon, UserCheckIcon, CalendarIcon, TargetIcon } from "lucide-react"

import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { usePlayers } from "@/hooks/use-players"
import { usePeladas } from "@/hooks/use-peladas"
import { useStats } from "@/hooks/use-stats"

export function SectionCards() {
  const currentMonth = format(new Date(), "yyyy-MM")
  const { data: players, isLoading: loadingPlayers } = usePlayers()
  const { data: peladas, isLoading: loadingPeladas } = usePeladas()
  const { data: stats, isLoading: loadingStats } = useStats(currentMonth)

  const totalPlayers = players?.length ?? 0
  const mensalistas = players?.filter((p) => p.type === "monthly").length ?? 0
  const peladasThisMonth =
    peladas?.filter((p) => {
      const d = new Date(p.date)
      return format(d, "yyyy-MM") === currentMonth
    }).length ?? 0
  const goalsThisMonth = stats?.totalGoals ?? 0

  const cards = [
    {
      title: "Jogadores cadastrados",
      value: totalPlayers,
      footer: `${mensalistas} mensalistas`,
      icon: UsersIcon,
      loading: loadingPlayers,
    },
    {
      title: "Mensalistas",
      value: mensalistas,
      footer: `de ${totalPlayers} jogadores total`,
      icon: UserCheckIcon,
      loading: loadingPlayers,
    },
    {
      title: "Peladas este mês",
      value: peladasThisMonth,
      footer: format(new Date(), "MMMM yyyy", { locale: ptBR }),
      icon: CalendarIcon,
      loading: loadingPeladas,
    },
    {
      title: "Gols este mês",
      value: goalsThisMonth,
      footer: format(new Date(), "MMMM yyyy", { locale: ptBR }),
      icon: TargetIcon,
      loading: loadingStats,
    },
  ]

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:from-primary/10 grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} data-slot="card">
          <CardHeader className="relative">
            <CardDescription>{card.title}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {card.loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                card.value
              )}
            </CardTitle>
            <div className="absolute right-4 top-4 text-muted-foreground">
              <card.icon className="size-5" />
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-sm">
            <div className="text-muted-foreground capitalize">{card.footer}</div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
