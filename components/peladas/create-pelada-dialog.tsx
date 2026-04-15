"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useCreatePelada } from "@/hooks/use-peladas"

interface CreatePeladaDialogProps {
  trigger?: React.ReactNode
}

export function CreatePeladaDialog({ trigger }: CreatePeladaDialogProps) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const router = useRouter()
  const { mutate: createPelada, isPending } = useCreatePelada()

  function handleSubmit() {
    if (!date) return
    createPelada(date.toISOString(), {
      onSuccess: (pelada) => {
        toast.success("Pelada criada!")
        setOpen(false)
        setDate(undefined)
        router.push(`/peladas/${pelada.id}`)
      },
      onError: (err) => {
        toast.error(err.message)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>Nova Pelada</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova Pelada</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Data</label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {date
                    ? format(date, "PPP", { locale: ptBR })
                    : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d)
                    setCalendarOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!date || isPending}
            className="w-full"
          >
            {isPending ? "Criando..." : "Criar Pelada"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
