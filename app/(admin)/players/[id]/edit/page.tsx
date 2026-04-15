"use client"

import { use } from "react"
import { PlayerForm } from "@/components/players/player-form"
import { usePlayer } from "@/hooks/use-players"
import { Skeleton } from "@/components/ui/skeleton"

export default function EditPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: player, isLoading } = usePlayer(id)

  if (isLoading) {
    return (
      <div className="px-4 py-6 lg:px-6">
        <Skeleton className="mx-auto h-64 max-w-lg rounded-lg" />
      </div>
    )
  }

  return <PlayerForm defaultValues={player} playerId={id} />
}
