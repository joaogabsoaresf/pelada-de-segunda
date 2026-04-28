"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Plus, Trash2, Shuffle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface PlayerDetail {
  userId: string;
  pot: number;
  name: string;
  phone: string;
  type: string;
}

interface UserResult {
  id: string;
  name: string;
  phone: string;
  type: string;
}

interface MatchDay {
  id: string;
  date: string;
  status: string;
  players: PlayerDetail[];
  teams: { id: string; name: string; players: { userId: string; name: string }[] }[];
}

const AVATAR_COLORS = [
  { bg: "bg-green-500", text: "text-white" },
  { bg: "bg-blue-500", text: "text-white" },
  { bg: "bg-violet-500", text: "text-white" },
  { bg: "bg-rose-500", text: "text-white" },
  { bg: "bg-amber-500", text: "text-white" },
  { bg: "bg-teal-500", text: "text-white" },
  { bg: "bg-cyan-600", text: "text-white" },
  { bg: "bg-orange-500", text: "text-white" },
];

function getAvatarColor(name: string) {
  const idx = (name.charCodeAt(0) + (name.charCodeAt(name.length - 1) || 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

const POT_STYLES: Record<string, string> = {
  "-1": "bg-blue-100 text-blue-700 border-0",
  "1": "bg-green-100 text-green-700 border-0",
  "2": "bg-emerald-100 text-emerald-700 border-0",
  "3": "bg-amber-100 text-amber-700 border-0",
  "4": "bg-orange-100 text-orange-700 border-0",
  "5": "bg-red-100 text-red-700 border-0",
};

const POT_LABELS: Record<string, string> = {
  "-1": "🧤 Goleiro",
  "1": "Pote 1",
  "2": "Pote 2",
  "3": "Pote 3",
  "4": "Pote 4",
  "5": "Pote 5",
};

function AddPlayerDialog({ matchDayId, existingPlayerIds, onAdded }: {
  matchDayId: string;
  existingPlayerIds: string[];
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newType, setNewType] = useState<"monthly" | "daily" | "goalkeeper">("monthly");
  const [newPot, setNewPot] = useState("0");
  const [mode, setMode] = useState<"search" | "new">("search");
  const queryClient = useQueryClient();

  const { data: users } = useQuery<UserResult[]>({
    queryKey: ["users", search],
    queryFn: async () => {
      const q = search.trim();
      const url = q ? `/api/users?q=${encodeURIComponent(q)}` : "/api/users";
      const res = await fetch(url);
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/match-days/${matchDayId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao adicionar jogador");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-day", matchDayId] });
      setOpen(false);
      setSearch("");
      onAdded();
    },
  });

  const createAndAddMutation = useMutation({
    mutationFn: async () => {
      const createRes = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, phone: newPhone, type: newType, defaultPot: parseInt(newPot) }),
      });
      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error ?? "Erro ao cadastrar jogador");
      }
      const user = await createRes.json();
      const addRes = await fetch(`/api/match-days/${matchDayId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!addRes.ok) {
        const data = await addRes.json();
        throw new Error(data.error ?? "Erro ao adicionar jogador");
      }
      return addRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-day", matchDayId] });
      setOpen(false);
      setNewName(""); setNewPhone(""); setNewType("monthly"); setNewPot("0");
      setMode("search");
      onAdded();
    },
  });

  const error = addMutation.error || createAndAddMutation.error;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2 h-12 font-semibold">
          <Plus className="w-4 h-4" />
          Adicionar Jogador
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-bold">Adicionar Jogador</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 pb-2 bg-muted rounded-lg p-1">
          <button
            className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${
              mode === "search" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
            }`}
            onClick={() => setMode("search")}
          >
            Buscar
          </button>
          <button
            className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${
              mode === "new" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
            }`}
            onClick={() => setMode("new")}
          >
            Novo
          </button>
        </div>

        {mode === "search" && (
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Filtrar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11"
              autoFocus
            />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {users?.filter((u) => !existingPlayerIds.includes(u.id)).map((user) => {
                const color = getAvatarColor(user.name);
                return (
                  <button
                    key={user.id}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card active:bg-muted text-left transition-colors"
                    onClick={() => addMutation.mutate(user.id)}
                    disabled={addMutation.isPending}
                  >
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarFallback className={`text-sm font-bold ${color.bg} ${color.text}`}>
                        {user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.phone}</p>
                    </div>
                    {user.type === "monthly" ? (
                      <Badge className="bg-green-100 text-green-700 border-0 text-xs shrink-0">Mensalista</Badge>
                    ) : user.type === "goalkeeper" ? (
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-xs shrink-0">🧤 Goleiro</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-xs shrink-0">Diarista</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === "new" && (
          <div className="space-y-3">
            <Input type="text" placeholder="Nome completo" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-11" />
            <Input type="tel" placeholder="Telefone (ex: 11999999999)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="h-11" />
            <Select value={newType} onValueChange={(v) => setNewType(v as "monthly" | "daily" | "goalkeeper")}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensalista</SelectItem>
                <SelectItem value="daily">Diarista</SelectItem>
                <SelectItem value="goalkeeper">🧤 Goleiro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newPot} onValueChange={setNewPot}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Pote padrão" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sem pote padrão</SelectItem>
                <SelectItem value="-1">🧤 Goleiro</SelectItem>
                {[1, 2, 3, 4, 5].map((p) => (
                  <SelectItem key={p} value={p.toString()}>Pote {p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full h-12 font-bold"
              onClick={() => createAndAddMutation.mutate()}
              disabled={createAndAddMutation.isPending || !newName || !newPhone}
            >
              {createAndAddMutation.isPending ? "Cadastrando..." : "Cadastrar e Adicionar"}
            </Button>
          </div>
        )}

        {error && (
          <p className="text-destructive text-sm text-center">{(error as Error).message}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function MatchDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const manageMode = searchParams.get("manage") === "true";
  const queryClient = useQueryClient();
  const [ignoreBalance, setIgnoreBalance] = useState(false);

  const { data: matchDay, isLoading } = useQuery<MatchDay>({
    queryKey: ["match-day", id],
    queryFn: async () => {
      const res = await fetch(`/api/match-days/${id}`);
      if (!res.ok) throw new Error("Pelada não encontrada");
      return res.json();
    },
  });

  useEffect(() => {
    if (!isLoading && matchDay) {
      if (matchDay.status === "finished") {
        router.replace(`/peladas/${id}/summary`);
      } else if (matchDay.teams.length > 0 && !manageMode) {
        router.replace(`/peladas/${id}/game/new`);
      }
    }
  }, [isLoading, matchDay, manageMode]);

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/match-days/${id}/players?userId=${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover jogador");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["match-day", id] }),
  });

  const setPotMutation = useMutation({
    mutationFn: async ({ userId, pot }: { userId: string; pot: number }) => {
      const res = await fetch(`/api/match-days/${id}/players/pot`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, pot }),
      });
      if (!res.ok) throw new Error("Erro ao definir pote");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["match-day", id] }),
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!matchDay) return null;

  const allHavePot = matchDay.players.every((p) => p.pot > 0 || p.pot === -1);

  const potCounts = new Map<number, number>();
  for (const p of matchDay.players) {
    if (p.pot > 0) potCounts.set(p.pot, (potCounts.get(p.pot) ?? 0) + 1);
  }
  const countValues = [...potCounts.values()];
  const isBalanced = countValues.length <= 1 || countValues.every((c) => c === countValues[0]);

  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="relative px-4 pt-6 pb-4 overflow-hidden bg-card border-b">
        <div className="flex items-center gap-3">
          <Link href="/peladas">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-lg capitalize">
              {format(new Date(matchDay.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h1>
            <p className="text-muted-foreground text-xs">
              {matchDay.players.length} jogador{matchDay.players.length !== 1 ? "es" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-2.5 pb-44 flex-1">
        {matchDay.players.length === 0 && (
          <p className="text-center text-muted-foreground py-10 text-sm">
            Nenhum jogador adicionado ainda
          </p>
        )}

        {[...matchDay.players].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).map((player) => {
          const color = getAvatarColor(player.name);
          const potStyle = POT_STYLES[player.pot.toString()] ?? "bg-gray-100 text-gray-600 border-0";
          const potLabel = POT_LABELS[player.pot.toString()];

          return (
            <div key={player.userId} className="flex items-center gap-3 p-3 rounded-xl bg-card shadow-sm border">
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarFallback className={`font-bold text-sm ${color.bg} ${color.text}`}>
                  {player.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-sm">{player.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {potLabel && (
                    <Badge className={`text-[10px] font-semibold px-1.5 py-0 h-4 ${potStyle}`}>
                      {potLabel}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Select
                  value={player.pot !== 0 ? player.pot.toString() : ""}
                  onValueChange={(v) => setPotMutation.mutate({ userId: player.userId, pot: parseInt(v) })}
                >
                  <SelectTrigger className="w-[90px] h-8 text-xs">
                    <SelectValue placeholder="Pote" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">🧤 Goleiro</SelectItem>
                    {[1, 2, 3, 4, 5].map((p) => (
                      <SelectItem key={p} value={p.toString()}>Pote {p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                  onClick={() => removeMutation.mutate(player.userId)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t py-4 px-4 space-y-2.5">
        <AddPlayerDialog
          matchDayId={id}
          existingPlayerIds={matchDay.players.map((p) => p.userId)}
          onAdded={() => {}}
        />
        <Separator />

        {!allHavePot && matchDay.players.length > 0 && (
          <p className="text-xs text-amber-600 text-center font-medium">
            Defina o pote de todos os jogadores para sortear
          </p>
        )}

        {allHavePot && !isBalanced && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 space-y-2">
            <p className="text-xs font-semibold text-amber-800">Potes desbalanceados</p>
            <div className="flex flex-wrap gap-1.5">
              {[...potCounts.entries()].sort(([a], [b]) => a - b).map(([pot, count]) => (
                <span key={pot} className="text-[11px] font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                  Pote {pot}: {count} jog.
                </span>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ignoreBalance}
                onChange={(e) => setIgnoreBalance(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-600 cursor-pointer"
              />
              <span className="text-xs text-amber-700 font-medium">Ignorar e sortear mesmo assim</span>
            </label>
          </div>
        )}

        <Button
          className="w-full h-12 gap-2 font-bold"
          disabled={!allHavePot || matchDay.players.length < 4 || (!isBalanced && !ignoreBalance)}
          onClick={() => router.push(`/peladas/${id}/draw`)}
        >
          <Shuffle className="w-4 h-4" />
          Sortear Times
        </Button>
      </div>
    </div>
  );
}
