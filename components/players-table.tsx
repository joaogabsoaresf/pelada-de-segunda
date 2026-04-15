"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { PencilIcon, Trash2Icon, PlusIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { usePlayers } from "@/hooks/use-players"
import { useDeletePlayer } from "@/hooks/use-players"
import { useStats } from "@/hooks/use-stats"
import { usePlayerGoals, usePlayerAssists } from "@/hooks/use-stats"

const POT_LABELS: Record<number, string> = {
  [-1]: "Goleiro",
  0: "Não definido",
  1: "Pote 1",
  2: "Pote 2",
  3: "Pote 3",
  4: "Pote 4",
  5: "Pote 5",
}

const PAGE_SIZE_OPTIONS = [10, 15, 30]

export function PlayersTable() {
  const router = useRouter()
  const currentMonth = format(new Date(), "yyyy-MM")
  const { data: players, isLoading: loadingPlayers } = usePlayers()
  const { data: stats, isLoading: loadingStats } = useStats(currentMonth)
  const { data: playerGoals, isLoading: loadingGoals } = usePlayerGoals()
  const { data: playerAssists, isLoading: loadingAssists } = usePlayerAssists()
  const { mutate: deletePlayer, isPending: isDeleting } = useDeletePlayer()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Build stat maps
  const goalsThisMonthMap = new Map<string, number>()
  if (stats?.topScorers) {
    for (const s of stats.topScorers) goalsThisMonthMap.set(s.userId, s.count)
  }
  const goalsTotalMap = new Map<string, number>()
  if (playerGoals) {
    for (const g of playerGoals) goalsTotalMap.set(g.playerId, g.total)
  }
  const assistsThisMonthMap = new Map<string, number>()
  if (stats?.topAssisters) {
    for (const s of stats.topAssisters) assistsThisMonthMap.set(s.userId, s.count)
  }
  const assistsTotalMap = new Map<string, number>()
  if (playerAssists) {
    for (const a of playerAssists) assistsTotalMap.set(a.playerId, a.total)
  }

  function handleDelete(id: string) {
    deletePlayer(id, {
      onSuccess: () => {
        toast.success("Jogador excluído")
        setDeletingId(null)
      },
      onError: (err) => {
        toast.error(err.message)
        setDeletingId(null)
      },
    })
  }

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePageSize(value: string) {
    setPageSize(Number(value))
    setPage(1)
  }

  const isLoading = loadingPlayers || loadingStats || loadingGoals || loadingAssists

  const filtered = (players ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="px-4 lg:px-6">
      <div className="rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Jogadores</h2>
          <Button size="sm" onClick={() => router.push("/players/new")}>
            <PlusIcon className="mr-1 size-4" />
            Adicionar Jogador
          </Button>
        </div>

        {/* Search + page size */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={String(pageSize)} onValueChange={handlePageSize}>
            <SelectTrigger className="w-20 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Pote padrão</TableHead>
              <TableHead className="text-right">Gol Mês</TableHead>
              <TableHead className="text-right">Ass Mês</TableHead>
              <TableHead className="text-right">Gol Total</TableHead>
              <TableHead className="text-right">Ass Total</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {search ? "Nenhum jogador encontrado" : "Nenhum jogador cadastrado"}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell>
                    <Badge variant={player.type === "monthly" ? "default" : player.type === "goalkeeper" ? "outline" : "secondary"}>
                      {player.type === "monthly" ? "Mensalista" : player.type === "goalkeeper" ? "🧤 Goleiro" : "Diarista"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {POT_LABELS[player.defaultPot] ?? `Pote ${player.defaultPot}`}
                  </TableCell>
                  <TableCell className="text-right">
                    {goalsThisMonthMap.get(player.id) ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {assistsThisMonthMap.get(player.id) ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {goalsTotalMap.get(player.id) ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {assistsTotalMap.get(player.id) ?? 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => router.push(`/players/${player.id}/edit`)}
                      >
                        <PencilIcon className="size-3.5" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingId(player.id)}
                      >
                        <Trash2Icon className="size-3.5" />
                        <span className="sr-only">Excluir</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {filtered.length === (players?.length ?? 0)
                ? `${filtered.length} jogador${filtered.length !== 1 ? "es" : ""}`
                : `${filtered.length} de ${players?.length ?? 0} jogador${(players?.length ?? 0) !== 1 ? "es" : ""}`}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeftIcon className="size-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-2 tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRightIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir jogador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este jogador? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
