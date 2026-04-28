import { ChartGoalsPerPelada } from "@/components/chart-goals-per-pelada"
import { PlayersTable } from "@/components/players-table"
import { RankingCards } from "@/components/ranking-cards"
import { SectionCards } from "@/components/section-cards"
import { WinRateTable } from "@/components/win-rate-table"

export default function DashboardPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards />
        <div className="px-4 lg:px-6">
          <ChartGoalsPerPelada />
        </div>
        <PlayersTable />
        <RankingCards />
        <WinRateTable />
      </div>
    </div>
  )
}
