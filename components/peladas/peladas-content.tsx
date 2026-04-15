"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  CalendarIcon,
  MoreHorizontalIcon,
  TrophyIcon,
  TargetIcon,
  UsersIcon,
  CalendarCheckIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { CreatePeladaDialog } from "@/components/peladas/create-pelada-dialog"
import { usePeladasSummary, useDeletePelada, usePatchPelada, type PeladaSummary } from "@/hooks/use-peladas"
import { useStats } from "@/hooks/use-stats"

export function PeladasContent() {
  const router = useRouter()
  const currentMonth = format(new Date(), "yyyy-MM")

  const { data: peladas, isLoading } = usePeladasSummary()
  const { data: stats } = useStats()
  const { mutate: deletePelada, isPending: isDeleting } = useDeletePelada()
  const { mutate: patchPelada, isPending: isPatching } = usePatchPelada()

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [changingDateId, setChangingDateId] = useState<string | null>(null)
  const [newDate, setNewDate] = useState<Date | undefined>()
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Stats
  const totalPeladas = peladas?.length ?? 0
  const peladasThisMonth = peladas?.filter((p) => {
    const d = new Date(p.date)
    return format(d, "yyyy-MM") === currentMonth
  }).length ?? 0
  const totalGoals = peladas?.reduce((acc, p) => acc + p.goals, 0) ?? 0
  const diaristaThisMonth = peladas
    ?.filter((p) => {
      const d = new Date(p.date)
      return format(d, "yyyy-MM") === currentMonth
    })
    .reduce((acc, p) => acc + p.diaristas, 0) ?? 0

  const cards = [
    { title: "Total de peladas", value: totalPeladas, icon: TrophyIcon },
    { title: "Peladas este mês", value: peladasThisMonth, icon: CalendarCheckIcon },
    { title: "Total de gols", value: totalGoals, icon: TargetIcon },
    { title: "Diaristas este mês", value: diaristaThisMonth, icon: UsersIcon },
  ]

  function handleDelete(id: string) {
    deletePelada(id, {
      onSuccess: () => {
        toast.success("Pelada excluída")
        setDeletingId(null)
      },
      onError: (err) => {
        toast.error(err.message)
        setDeletingId(null)
      },
    })
  }

  function handleReactivate(id: string) {
    patchPelada(
      { id, status: "active" },
      {
        onSuccess: () => toast.success("Pelada reativada"),
        onError: (err) => toast.error(err.message),
      }
    )
  }

  function handleFinish(id: string) {
    patchPelada(
      { id, status: "finished" },
      {
        onSuccess: () => toast.success("Pelada finalizada"),
        onError: (err) => toast.error(err.message),
      }
    )
  }

  function handleChangeDate(id: string) {
    if (!newDate) return
    patchPelada(
      { id, date: newDate.toISOString() },
      {
        onSuccess: () => {
          toast.success("Data atualizada")
          setChangingDateId(null)
          setNewDate(undefined)
        },
        onError: (err) => toast.error(err.message),
      }
    )
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Stats cards */}
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:from-primary/10 grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title} data-slot="card">
              <CardHeader className="relative">
                <CardDescription>{card.title}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : card.value}
                </CardTitle>
                <div className="absolute right-4 top-4 text-muted-foreground">
                  <card.icon className="size-5" />
                </div>
              </CardHeader>
              <CardFooter />
            </Card>
          ))}
        </div>

        {/* Table */}
        <div className="px-4 lg:px-6">
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Peladas</h2>
              <CreatePeladaDialog trigger={<Button size="sm">Nova Pelada</Button>} />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Mensalistas</TableHead>
                  <TableHead className="text-right">Diaristas</TableHead>
                  <TableHead className="text-right">Gols</TableHead>
                  <TableHead className="text-right">Assistências</TableHead>
                  <TableHead className="w-[48px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : peladas?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Nenhuma pelada cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  peladas?.map((pelada) => (
                    <TableRow
                      key={pelada.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/peladas/${pelada.id}`)}
                    >
                      <TableCell className="font-medium">
                        {format(new Date(pelada.date), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            pelada.status === "active" ? "default" : "secondary"
                          }
                        >
                          {pelada.status === "active" ? "Agendada" : "Finalizada"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {pelada.mensalistas}
                      </TableCell>
                      <TableCell className="text-right">
                        {pelada.diaristas}
                      </TableCell>
                      <TableCell className="text-right">{pelada.goals}</TableCell>
                      <TableCell className="text-right">
                        {pelada.assists}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontalIcon className="size-4" />
                              <span className="sr-only">Ações</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {pelada.status === "active" ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setChangingDateId(pelada.id)
                                    setNewDate(new Date(pelada.date))
                                  }}
                                >
                                  Mudar data
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleFinish(pelada.id)}
                                >
                                  Finalizar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeletingId(pelada.id)}
                                >
                                  Excluir
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/peladas/${pelada.id}/stats`)
                                  }
                                >
                                  Ver estatísticas
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleReactivate(pelada.id)}
                                >
                                  Reativar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pelada</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Todos os jogos desta pelada serão excluídos. Esta ação
              não pode ser desfeita.
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

      {/* Change date dialog */}
      <Dialog
        open={!!changingDateId}
        onOpenChange={(open) => {
          if (!open) {
            setChangingDateId(null)
            setNewDate(undefined)
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mudar data da pelada</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !newDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {newDate
                    ? format(newDate, "PPP", { locale: ptBR })
                    : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={(d) => {
                    setNewDate(d)
                    setCalendarOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button
              onClick={() => changingDateId && handleChangeDate(changingDateId)}
              disabled={!newDate || isPatching}
            >
              {isPatching ? "Salvando..." : "Salvar data"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
