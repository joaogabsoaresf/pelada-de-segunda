"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Shuffle, Check, RefreshCw, Copy, CheckCheck, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PlayerInfo {
  userId: string;
  name: string;
  phone: string;
}

interface Team {
  id: string;
  name: string;
  players: PlayerInfo[];
}

interface MatchDay {
  id: string;
  date: string;
  players: { userId: string; pot: number; name: string }[];
  teams: Team[];
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
  if (!name) return AVATAR_COLORS[0];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(name.length - 1) || 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

import { TEAM_COLORS, getTeamColor } from "@/lib/team-colors";

export default function DrawPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [numTeams, setNumTeams] = useState("3");
  const [localTeams, setLocalTeams] = useState<Team[] | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: matchDay, isLoading } = useQuery<MatchDay>({
    queryKey: ["match-day", id],
    queryFn: async () => {
      const res = await fetch(`/api/match-days/${id}`);
      return res.json();
    },
  });

  useEffect(() => {
    if (matchDay?.teams && matchDay.teams.length > 0 && !localTeams) {
      setLocalTeams(matchDay.teams);
    }
  }, [matchDay]);

  const drawMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/match-days/${id}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numTeams: parseInt(numTeams) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao sortear");
      }
      return res.json();
    },
    onSuccess: () => {
      setLocalTeams(null);
      queryClient.invalidateQueries({ queryKey: ["match-day", id] });
    },
  });

  const saveTeamsMutation = useMutation({
    mutationFn: async () => {
      if (!localTeams) return;
      const res = await fetch(`/api/match-days/${id}/teams`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teams: localTeams.map((t) => ({
            id: t.id,
            name: t.name,
            players: t.players.map((p) => p.userId),
          })),
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar times");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-day", id] });
      router.push(`/peladas/${id}/game/new`);
    },
  });

  function movePlayer(playerId: string, fromTeamId: string, toTeamId: string) {
    if (!localTeams) return;
    const player = localTeams.find((t) => t.id === fromTeamId)?.players.find((p) => p.userId === playerId);
    if (!player) return;
    setLocalTeams(
      localTeams.map((team) => {
        if (team.id === fromTeamId) return { ...team, players: team.players.filter((p) => p.userId !== playerId) };
        if (team.id === toTeamId) return { ...team, players: [...team.players, player] };
        return team;
      })
    );
  }

  const displayedTeams = localTeams ?? matchDay?.teams ?? [];
  const hasTeams = displayedTeams.length > 0;
  const goalkeepers = matchDay?.players.filter((p) => p.pot === -1) ?? [];

  function copyTeams() {
    const text = displayedTeams
      .map((t) => `${t.name}:\n${t.players.map((p) => p.name).join("\n")}`)
      .join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="relative px-4 pt-6 pb-4 overflow-hidden bg-card border-b">
        <div className="flex items-center gap-3">
          <Link href={`/peladas/${id}?manage=true`}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-lg">Sorteio de Times</h1>
            <p className="text-muted-foreground text-xs">
              {matchDay?.players.length ?? 0} jogadores disponíveis
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 space-y-4 pb-28">
        {/* Draw controls */}
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Número de times
            </label>
            <Select value={numTeams} onValueChange={setNumTeams}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6].map((n) => (
                  <SelectItem key={n} value={n.toString()}>{n} times</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasTeams ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="h-11 gap-2 shrink-0">
                  <RefreshCw className="w-4 h-4" />
                  Ressortear
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ressortear times?</AlertDialogTitle>
                  <AlertDialogDescription>Os times atuais serão perdidos. Tem certeza?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => drawMutation.mutate()}>Ressortear</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              className="h-11 gap-2 shrink-0 font-bold"
              onClick={() => drawMutation.mutate()}
              disabled={drawMutation.isPending}
            >
              <Shuffle className="w-4 h-4" />
              {drawMutation.isPending ? "Sorteando..." : "Sortear"}
            </Button>
          )}
        </div>

        {drawMutation.isError && (
          <p className="text-destructive text-sm text-center">{(drawMutation.error as Error).message}</p>
        )}

        {/* Goalkeepers */}
        {goalkeepers.length > 0 && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 space-y-2">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">
              🧤 Goleiros ({goalkeepers.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {goalkeepers.map((gk) => {
                const color = getAvatarColor(gk.name);
                return (
                  <div key={gk.userId} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-blue-100">
                    <Avatar className="w-7 h-7 shrink-0">
                      <AvatarFallback className={`text-[10px] font-bold ${color.bg} ${color.text}`}>
                        {gk.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-semibold text-blue-900">{gk.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Team cards */}
        {displayedTeams.map((team, teamIdx) => {
          const style = getTeamColor(team.name);
          return (
            <div key={team.id} className={`rounded-2xl border ${style.border} overflow-hidden shadow-sm`}>
              <div className={`bg-gradient-to-r ${style.gradient} px-4 py-3 flex items-center justify-between`}>
                <Select
                  value={team.name}
                  onValueChange={(color) => {
                    setLocalTeams((prev) => {
                      if (!prev) return prev;
                      return prev.map((t) => t.id === team.id ? { ...t, name: color } : t);
                    });
                  }}
                >
                  <SelectTrigger className="h-8 w-auto gap-2 border-white/30 bg-white/20 text-white font-black text-base hover:bg-white/30 [&>svg]:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_COLORS.map((c) => (
                      <SelectItem key={c.id} value={c.label}>
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${c.accent}`} />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-white/80 text-xs font-semibold bg-white/20 rounded-full px-2.5 py-1">
                  {team.players.length} jogadores
                </span>
              </div>
              <div className={`divide-y ${style.divide}`}>
                {team.players.map((player) => {
                  const color = getAvatarColor(player.name);
                  return (
                    <div key={player.userId} className="flex items-center gap-3 px-4 py-2.5">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className={`text-xs font-bold ${color.bg} ${color.text}`}>
                          {player.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="flex-1 text-sm font-semibold truncate">{player.name}</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2 shrink-0">
                            Mover <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {displayedTeams.filter((t) => t.id !== team.id).map((t) => (
                            <DropdownMenuItem key={t.id} onSelect={() => movePlayer(player.userId, team.id, t.id)}>
                              {t.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
                {team.players.length === 0 && (
                  <p className="text-muted-foreground text-sm py-4 text-center px-4">Sem jogadores</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasTeams && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t py-4 px-4">
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 font-semibold shrink-0" onClick={copyTeams}>
              {copied ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
            <Button
              className="flex-1 h-12 gap-2 font-bold"
              onClick={() => saveTeamsMutation.mutate()}
              disabled={saveTeamsMutation.isPending}
            >
              <Check className="w-4 h-4" />
              {saveTeamsMutation.isPending ? "Salvando..." : "Confirmar Times e Criar Jogo"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
