"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCreatePlayer, useUpdatePlayer, type Player } from "@/hooks/use-players"
import { CreateUserSchema } from "@/lib/validators"
import type { z } from "zod"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormValues = any

const POT_OPTIONS = [
  { value: "-1", label: "Goleiro" },
  { value: "0", label: "Não definido" },
  { value: "1", label: "Pote 1" },
  { value: "2", label: "Pote 2" },
  { value: "3", label: "Pote 3" },
  { value: "4", label: "Pote 4" },
  { value: "5", label: "Pote 5" },
]

interface PlayerFormProps {
  defaultValues?: Partial<Player>
  playerId?: string
}

export function PlayerForm({ defaultValues, playerId }: PlayerFormProps) {
  const router = useRouter()
  const isEditing = !!playerId
  const { mutate: createPlayer, isPending: isCreating } = useCreatePlayer()
  const { mutate: updatePlayer, isPending: isUpdating } = useUpdatePlayer()
  const isPending = isCreating || isUpdating

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      phone: defaultValues?.phone ?? "",
      type: (defaultValues?.type as "monthly" | "daily" | "goalkeeper") ?? "monthly",
      defaultPot: defaultValues?.defaultPot ?? 0,
    },
  })

  const typeValue = watch("type")
  const potValue = watch("defaultPot")

  function onSubmit(data: FormValues) {
    if (isEditing) {
      updatePlayer(
        { id: playerId, ...data },
        {
          onSuccess: () => {
            toast.success("Jogador atualizado!")
            router.push("/dashboard")
          },
          onError: (err) => toast.error(err.message),
        }
      )
    } else {
      createPlayer(data, {
        onSuccess: () => {
          toast.success("Jogador criado!")
          router.push("/dashboard")
        },
        onError: (err) => toast.error(err.message),
      })
    }
  }

  return (
    <div className="px-4 py-6 lg:px-6">
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>{isEditing ? "Editar Jogador" : "Novo Jogador"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Nome completo"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message as string}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message as string}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select
                value={typeValue}
                onValueChange={(v) => setValue("type", v as "monthly" | "daily" | "goalkeeper")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensalista</SelectItem>
                  <SelectItem value="daily">Diarista</SelectItem>
                  <SelectItem value="goalkeeper">🧤 Goleiro</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message as string}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label>Pote padrão</Label>
              <Select
                value={String(potValue)}
                onValueChange={(v) => setValue("defaultPot", parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o pote" />
                </SelectTrigger>
                <SelectContent>
                  {POT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending
                  ? isEditing
                    ? "Salvando..."
                    : "Criando..."
                  : isEditing
                  ? "Salvar alterações"
                  : "Criar jogador"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
