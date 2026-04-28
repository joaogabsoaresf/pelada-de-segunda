"use client";

import { use, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, ArrowRightLeft, UserMinus, UserPlus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getTeamColor } from "@/lib/team-colors";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface PlayerInfo { userId: string; name: string }
interface GameEvent {
  type: "goal" | "assist" | "note";
  playerId?: string;
  relatedPlayerId?: string;
  note?: string;
  createdAt: string;
}
interface Game {
  id: string;
  matchDayId: string;
  teamA: { id: string; players: string[] };
  teamB: { id: string; players: string[] };
  waitingList: string[];
  status: "pending" | "live" | "finished";
  startedAt?: string;
  endedAt?: string;
  pausedDuration: number;
  pausedAt?: string;
  events: GameEvent[];
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

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function useGameTimer(game: Game | undefined) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    clearInterval(intervalRef.current);

    if (!game?.startedAt) return;

    const startMs = new Date(game.startedAt).getTime();
    const pausedSec = game.pausedDuration ?? 0;

    if (game.status === "finished" && game.endedAt) {
      const totalMs = new Date(game.endedAt).getTime() - startMs;
      setElapsed(Math.floor(totalMs / 1000) - pausedSec);
      return;
    }

    if (game.status !== "live") return;

    if (game.pausedAt) {
      // Frozen at the moment the pause started
      const frozenMs = new Date(game.pausedAt).getTime() - startMs;
      setElapsed(Math.floor(frozenMs / 1000) - pausedSec);
      return;
    }

    const calc = () => Math.floor((Date.now() - startMs) / 1000) - pausedSec;
    setElapsed(calc());
    intervalRef.current = setInterval(() => setElapsed(calc()), 1000);
    return () => clearInterval(intervalRef.current);
  }, [game?.status, game?.startedAt, game?.endedAt, game?.pausedAt, game?.pausedDuration]);

  return elapsed;
}

type EventSheetMode = "goal" | "assist" | "note" | null;

type SubStep =
  | { type: "pick-player" }
  | { type: "pick-action"; playerId: string; fromTeam: "A" | "B" }
  | { type: "pick-swap-target"; playerId: string; fromTeam: "A" | "B"; targetTeam: "A" | "B" | "outside" }
  | { type: "pick-add-target"; source: "bench" | "outside"; targetTeam: "A" | "B" }
  | { type: "pick-outside-add-team"; playerId: string };

export default function LiveGamePage({ params }: { params: Promise<{ id: string; gameId: string }> }) {
  const { id, gameId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [sheetMode, setSheetMode] = useState<EventSheetMode>(null);
  const [noteText, setNoteText] = useState("");
  const [allPlayers, setAllPlayers] = useState<PlayerInfo[]>([]);
  const [subOpen, setSubOpen] = useState(false);
  const [subStep, setSubStep] = useState<SubStep>({ type: "pick-player" });
  const closeOnSubRef = useRef(false);

  const { data: game, isLoading } = useQuery<Game>({
    queryKey: ["game", gameId],
    queryFn: async () => {
      const res = await fetch(`/api/games/${gameId}`);
      if (!res.ok) throw new Error("Jogo não encontrado");
      return res.json();
    },
    refetchInterval: (query) => query.state.data?.status === "live" ? 10000 : false,
  });

  const { data: matchDay } = useQuery({
    queryKey: ["match-day", id],
    queryFn: async () => { const res = await fetch(`/api/match-days/${id}`); return res.json(); },
    enabled: !!id,
  });

  useEffect(() => {
    if (!matchDay) return;
    const playerMap = new Map<string, string>();
    for (const p of matchDay.players ?? []) {
      playerMap.set(p.userId, p.name);
    }
    for (const team of matchDay.teams ?? []) {
      for (const p of team.players ?? []) {
        if (!playerMap.has(p.userId)) playerMap.set(p.userId, p.name);
      }
    }
    setAllPlayers([...playerMap.entries()].map(([userId, name]) => ({ userId, name })));
  }, [matchDay]);

  const elapsed = useGameTimer(game);

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/games/${gameId}/start`, { method: "POST" });
      if (!res.ok) throw new Error("Erro ao iniciar jogo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      queryClient.invalidateQueries({ queryKey: ["active-game"] });
    },
  });

  const finishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/games/${gameId}/finish`, { method: "POST" });
      if (!res.ok) throw new Error("Erro ao finalizar jogo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      queryClient.invalidateQueries({ queryKey: ["match-day-stats", id] });
      queryClient.invalidateQueries({ queryKey: ["active-game"] });
      router.push(`/peladas/${id}/game/new`);
    },
  });

  const addEventMutation = useMutation({
    mutationFn: async (payload: { type: "goal" | "assist" | "note"; playerId?: string; note?: string }) => {
      const res = await fetch(`/api/games/${gameId}/events`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? "Erro ao registrar evento"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      queryClient.invalidateQueries({ queryKey: ["active-game"] });
      setSheetMode(null); setNoteText("");
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventIndex: number) => {
      const res = await fetch(`/api/games/${gameId}/events/${eventIndex}`, { method: "DELETE" });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? "Erro ao remover evento"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      queryClient.invalidateQueries({ queryKey: ["active-game"] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/games/${gameId}/pause`, { method: "POST" });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? "Erro ao pausar jogo"); }
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["game", gameId] });
      const prev = queryClient.getQueryData<Game>(["game", gameId]);
      if (prev) {
        queryClient.setQueryData<Game>(["game", gameId], { ...prev, pausedAt: new Date().toISOString() });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["game", gameId], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/games/${gameId}/resume`, { method: "POST" });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? "Erro ao retomar jogo"); }
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["game", gameId] });
      const prev = queryClient.getQueryData<Game>(["game", gameId]);
      if (prev && prev.pausedAt) {
        const additionalPaused = Math.floor((Date.now() - new Date(prev.pausedAt).getTime()) / 1000);
        queryClient.setQueryData<Game>(["game", gameId], {
          ...prev,
          pausedAt: undefined,
          pausedDuration: (prev.pausedDuration ?? 0) + additionalPaused,
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["game", gameId], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
  });

  const subMutation = useMutation({
    mutationFn: async ({ teamAPlayers, teamBPlayers, waitingList }: { teamAPlayers: string[]; teamBPlayers: string[]; waitingList: string[] }) => {
      const res = await fetch(`/api/games/${gameId}/teams`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamAPlayers, teamBPlayers, waitingList }),
      });
      if (!res.ok) throw new Error("Erro na substituição");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      if (closeOnSubRef.current) {
        setSubOpen(false);
        closeOnSubRef.current = false;
      }
      setSubStep({ type: "pick-player" });
    },
  });

  const getPlayerName = (pid: string) => allPlayers.find((p) => p.userId === pid)?.name ?? pid.slice(-4);

  function getTeamPlayers(teamSide: "A" | "B") {
    if (!game) return [];
    const team = teamSide === "A" ? game.teamA : game.teamB;
    return team.players.map((pid) => ({ userId: pid, name: getPlayerName(pid) }));
  }

  function getTeamName(teamSide: "A" | "B") {
    if (!matchDay) return `Time ${teamSide}`;
    const teamId = teamSide === "A" ? game?.teamA.id : game?.teamB.id;
    return matchDay.teams?.find((t: { id: string; name: string }) => t.id === teamId)?.name ?? `Time ${teamSide}`;
  }

  function countGoals(teamSide: "A" | "B") {
    if (!game) return 0;
    const players = teamSide === "A" ? game.teamA.players : game.teamB.players;
    return game.events.filter((e) => e.type === "goal" && e.playerId && players.includes(e.playerId)).length;
  }

  function getOutsidePlayers(): PlayerInfo[] {
    if (!game || !matchDay) return [];
    const inGame = new Set([...game.teamA.players, ...game.teamB.players, ...(game.waitingList ?? [])]);
    const outside: PlayerInfo[] = [];
    for (const team of matchDay.teams ?? []) {
      for (const p of team.players ?? []) {
        if (!inGame.has(p.userId)) {
          outside.push({ userId: p.userId, name: p.name ?? getPlayerName(p.userId) });
        }
      }
    }
    for (const p of matchDay.players ?? []) {
      if (!inGame.has(p.userId) && !outside.some((o) => o.userId === p.userId)) {
        outside.push({ userId: p.userId, name: p.name ?? getPlayerName(p.userId) });
      }
    }
    return outside.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  function getBenchPlayers(): PlayerInfo[] {
    if (!game) return [];
    return (game.waitingList ?? []).map((pid) => ({ userId: pid, name: getPlayerName(pid) }));
  }

  function doSub(newA: string[], newB: string[], newWaiting: string[]) {
    subMutation.mutate({ teamAPlayers: newA, teamBPlayers: newB, waitingList: newWaiting });
  }

  function swapPlayers(playerOut: string, fromTeam: "A" | "B", playerIn: string, fromSource: "A" | "B" | "bench" | "outside") {
    if (!game) return;
    let newA = [...game.teamA.players];
    let newB = [...game.teamB.players];
    let newWaiting = [...(game.waitingList ?? [])];

    if (fromTeam === "A") newA = newA.filter((p) => p !== playerOut);
    else newB = newB.filter((p) => p !== playerOut);

    if (fromSource === "A") newA = newA.filter((p) => p !== playerIn);
    else if (fromSource === "B") newB = newB.filter((p) => p !== playerIn);
    else if (fromSource === "bench") newWaiting = newWaiting.filter((p) => p !== playerIn);

    if (fromTeam === "A") newA.push(playerIn);
    else newB.push(playerIn);

    if (fromSource === "A" || fromSource === "B") {
      if (fromSource === "A") newA.push(playerOut);
      else newB.push(playerOut);
    } else {
      newWaiting.push(playerOut);
    }

    closeOnSubRef.current = true;
    doSub(newA, newB, newWaiting);
  }

  function sendToBench(playerId: string, fromTeam: "A" | "B") {
    if (!game) return;
    let newA = [...game.teamA.players];
    let newB = [...game.teamB.players];
    const newWaiting = [...(game.waitingList ?? []), playerId];
    if (fromTeam === "A") newA = newA.filter((p) => p !== playerId);
    else newB = newB.filter((p) => p !== playerId);
    doSub(newA, newB, newWaiting);
  }

  function addFromBench(playerId: string, toTeam: "A" | "B") {
    if (!game) return;
    const newA = toTeam === "A" ? [...game.teamA.players, playerId] : [...game.teamA.players];
    const newB = toTeam === "B" ? [...game.teamB.players, playerId] : [...game.teamB.players];
    const newWaiting = (game.waitingList ?? []).filter((p) => p !== playerId);
    doSub(newA, newB, newWaiting);
  }

  function addFromOutside(playerId: string, toTeam: "A" | "B") {
    if (!game) return;
    const newA = toTeam === "A" ? [...game.teamA.players, playerId] : [...game.teamA.players];
    const newB = toTeam === "B" ? [...game.teamB.players, playerId] : [...game.teamB.players];
    doSub(newA, newB, [...(game.waitingList ?? [])]);
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (!game) return null;

  const scoreA = countGoals("A");
  const scoreB = countGoals("B");
  const teamAName = getTeamName("A");
  const teamBName = getTeamName("B");
  const isLive = game.status === "live";
  const isPending = game.status === "pending";
  const isFinished = game.status === "finished";
  const isPaused = isLive && !!game.pausedAt;

  return (
    <div className="flex flex-col min-h-0 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="relative px-4 pt-6 pb-4 bg-card border-b">
        <div className="flex items-center gap-3">
          <Link href={`/peladas/${id}/game/new`}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Jogo</h1>
            <p className="text-muted-foreground text-xs">{teamAName} vs {teamBName}</p>
          </div>
          {isLive && !isPaused && (
            <Badge className="bg-green-100 text-green-700 border-0 gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 inline-block" />
              Ao Vivo
            </Badge>
          )}
          {isPaused && (
            <Badge className="bg-amber-100 text-amber-700 border-0 gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              Pausado
            </Badge>
          )}
          {isFinished && <Badge variant="secondary">Finalizado</Badge>}
          {isPending && <Badge variant="outline">Aguardando</Badge>}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="px-4 pt-4">
        <div className="rounded-xl bg-slate-900 p-5 text-white">
          <div className="text-center mb-4">
            <span className={`font-mono text-base font-bold tabular-nums ${isPaused ? "text-amber-400" : "text-green-400"}`}>
              {isLive || isFinished ? formatTime(elapsed) : "00:00"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <p className="font-semibold text-sm text-slate-300 truncate px-2">{teamAName}</p>
              <p className="text-8xl font-black mt-1 tabular-nums leading-none">{scoreA}</p>
            </div>
            <div className="px-4">
              <span className="text-slate-600 text-2xl font-light">×</span>
            </div>
            <div className="flex-1 text-center">
              <p className="font-semibold text-sm text-slate-300 truncate px-2">{teamBName}</p>
              <p className="text-8xl font-black mt-1 tabular-nums leading-none">{scoreB}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3-column: Team A | Events | Team B */}
      <TooltipProvider>
        <div className="flex-1 px-4 pt-4 pb-52">
          <div className="grid grid-cols-[1fr_1.2fr_1fr] gap-3">
            {/* Team A players */}
            {(() => {
              const style = getTeamColor(teamAName);
              const players = getTeamPlayers("A");
              return (
                <div className={`rounded-xl border ${style.border} overflow-hidden shadow-sm`}>
                  <div className={`bg-gradient-to-r ${style.gradient} px-3 py-2 text-center`}>
                    <p className="font-black text-xs text-white truncate">{teamAName}</p>
                  </div>
                  <div className="p-2">
                    <div className="grid grid-cols-2 gap-2">
                      {players.map((player) => {
                        const color = getAvatarColor(player.name);
                        return (
                          <Tooltip key={player.userId}>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-center gap-1 cursor-default">
                                <Avatar className="w-9 h-9">
                                  <AvatarFallback className={`text-xs font-bold ${color.bg} ${color.text}`}>
                                    {player.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs font-semibold">{player.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Events center card */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-3 py-2 border-b text-center">
                Eventos
              </p>
              {game.events.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Sem eventos</p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="p-2 space-y-0.5">
                    {[...game.events].reverse().map((event, i) => {
                      const realIndex = game.events.length - 1 - i;
                      return (
                        <div key={i} className="flex items-start gap-1.5 text-xs py-1.5 border-b border-border/40 last:border-0">
                          <span className="shrink-0 text-sm">
                            {event.type === "goal" ? "⚽" : event.type === "assist" ? "👟" : "📝"}
                          </span>
                          <div className="flex-1 min-w-0">
                            {event.type === "goal" && event.playerId && (
                              <p className="truncate">
                                <span className="font-semibold">{getPlayerName(event.playerId)}</span>
                                {event.relatedPlayerId && (
                                  <span className="text-muted-foreground"> · {getPlayerName(event.relatedPlayerId)}</span>
                                )}
                              </p>
                            )}
                            {event.type === "assist" && event.playerId && (
                              <p className="truncate">Assist <span className="font-semibold">{getPlayerName(event.playerId)}</span></p>
                            )}
                            {event.type === "note" && <p className="text-muted-foreground italic truncate">{event.note}</p>}
                          </div>
                          {(event.type === "goal" || event.type === "assist") && isLive && (
                            <button
                              className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                              onClick={() => deleteEventMutation.mutate(realIndex)}
                              disabled={deleteEventMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Team B players */}
            {(() => {
              const style = getTeamColor(teamBName);
              const players = getTeamPlayers("B");
              return (
                <div className={`rounded-xl border ${style.border} overflow-hidden shadow-sm`}>
                  <div className={`bg-gradient-to-r ${style.gradient} px-3 py-2 text-center`}>
                    <p className="font-black text-xs text-white truncate">{teamBName}</p>
                  </div>
                  <div className="p-2">
                    <div className="grid grid-cols-2 gap-2">
                      {players.map((player) => {
                        const color = getAvatarColor(player.name);
                        return (
                          <Tooltip key={player.userId}>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-center gap-1 cursor-default">
                                <Avatar className="w-9 h-9">
                                  <AvatarFallback className={`text-xs font-bold ${color.bg} ${color.text}`}>
                                    {player.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs font-semibold">{player.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </TooltipProvider>

      {/* Bottom bar */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t py-4 px-4 space-y-2">
        {isPending && (
          <Button
            className="w-full h-14 text-base gap-2 font-bold bg-green-600 hover:bg-green-700"
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
          >
            <span className="text-lg">▶</span>
            {startMutation.isPending ? "Iniciando..." : "Iniciar Jogo"}
          </Button>
        )}

        {isLive && (
          <>
            <div className="grid grid-cols-4 gap-2">
              <Button
                className="h-16 gap-1 flex-col font-bold bg-green-600 hover:bg-green-700"
                onClick={() => setSheetMode("goal")}
                disabled={isPaused}
              >
                <span className="text-xl">⚽</span>
                <span className="text-xs">Gol</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 gap-1 flex-col font-bold"
                onClick={() => setSheetMode("assist")}
                disabled={isPaused}
              >
                <span className="text-xl">👟</span>
                <span className="text-xs">Assist</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 gap-1 flex-col font-bold"
                onClick={() => { setSubStep({ type: "pick-player" }); setSubOpen(true); }}
              >
                <ArrowRightLeft className="w-5 h-5" />
                <span className="text-xs">Sub</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 gap-1 flex-col font-bold"
                onClick={() => setSheetMode("note")}
                disabled={isPaused}
              >
                <span className="text-xl">📝</span>
                <span className="text-xs">Lance</span>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {isPaused ? (
                <Button
                  variant="outline"
                  className="h-11 font-bold gap-2"
                  onClick={() => resumeMutation.mutate()}
                  disabled={resumeMutation.isPending}
                >
                  <span>▶</span>
                  {resumeMutation.isPending ? "Retomando..." : "Retomar"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="h-11 font-bold gap-2"
                  onClick={() => pauseMutation.mutate()}
                  disabled={pauseMutation.isPending}
                >
                  <span>⏸</span>
                  {pauseMutation.isPending ? "Pausando..." : "Pausar"}
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="h-11 font-bold">Finalizar Jogo</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Finalizar jogo?</AlertDialogTitle>
                    <AlertDialogDescription>Placar atual: {scoreA} × {scoreB}. Confirmar?</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => finishMutation.mutate()}>Finalizar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}

        {isFinished && (
          <Button className="w-full h-12 gap-2 font-bold" onClick={() => router.push(`/peladas/${id}/game/new`)}>
            Ver Placar da Pelada
          </Button>
        )}
      </div>

      {/* Event Sheet */}
      <Sheet open={sheetMode !== null} onOpenChange={(o) => !o && setSheetMode(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh]">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-bold text-lg">
              {sheetMode === "goal" ? "⚽ Registrar Gol" : sheetMode === "assist" ? "👟 Registrar Assistência" : "📝 Registrar Lance"}
            </SheetTitle>
          </SheetHeader>

          {sheetMode === "note" ? (
            <div className="space-y-4">
              <textarea
                placeholder="Descreva o lance..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full h-24 px-3 py-2 border border-border rounded-xl text-base resize-none bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                autoFocus
              />
              <Button
                className="w-full h-12 font-bold"
                disabled={!noteText || addEventMutation.isPending}
                onClick={() => addEventMutation.mutate({ type: "note", note: noteText })}
              >
                {addEventMutation.isPending ? "Registrando..." : "Registrar"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Tabs defaultValue="A">
                <TabsList className="w-full">
                  <TabsTrigger value="A" className="flex-1 font-semibold">{teamAName}</TabsTrigger>
                  <TabsTrigger value="B" className="flex-1 font-semibold">{teamBName}</TabsTrigger>
                </TabsList>
                {(["A", "B"] as const).map((side) => (
                  <TabsContent key={side} value={side} className="space-y-2 mt-3">
                    <ScrollArea className="h-52">
                      <div className="space-y-2 pr-1">
                        {getTeamPlayers(side).map((player) => {
                          const color = getAvatarColor(player.name);
                          return (
                            <button
                              key={player.userId}
                              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-left"
                              onClick={() => {
                                if (sheetMode === "goal" || sheetMode === "assist") {
                                  addEventMutation.mutate({ type: sheetMode, playerId: player.userId });
                                }
                              }}
                              disabled={addEventMutation.isPending}
                            >
                              <Avatar className="w-9 h-9 shrink-0">
                                <AvatarFallback className={`text-sm font-bold ${color.bg} ${color.text}`}>
                                  {player.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-semibold text-sm">{player.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
              {addEventMutation.isError && (
                <p className="text-destructive text-sm text-center">{(addEventMutation.error as Error).message}</p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Substitution Sheet */}
      <Sheet open={subOpen} onOpenChange={(o) => { if (!o) { setSubOpen(false); setSubStep({ type: "pick-player" }); } }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh]">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-bold text-lg flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              Substituição
            </SheetTitle>
          </SheetHeader>

          {subStep.type === "pick-player" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground font-medium">Selecione o jogador ou ação:</p>

              <Tabs defaultValue="field">
                <TabsList className="w-full">
                  <TabsTrigger value="field" className="flex-1 font-semibold">Em Campo</TabsTrigger>
                  <TabsTrigger value="bench" className="flex-1 font-semibold">Banco ({getBenchPlayers().length})</TabsTrigger>
                  <TabsTrigger value="outside" className="flex-1 font-semibold">Fora ({getOutsidePlayers().length})</TabsTrigger>
                </TabsList>

                <TabsContent value="field" className="mt-3">
                  <ScrollArea className="h-52">
                    <div className="space-y-1">
                      {game && (
                        <>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 pb-1">{teamAName}</p>
                          {getTeamPlayers("A").map((player) => {
                            const color = getAvatarColor(player.name);
                            return (
                              <button
                                key={player.userId}
                                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-left"
                                onClick={() => setSubStep({ type: "pick-action", playerId: player.userId, fromTeam: "A" })}
                              >
                                <Avatar className="w-8 h-8 shrink-0">
                                  <AvatarFallback className={`text-xs font-bold ${color.bg} ${color.text}`}>
                                    {player.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-sm">{player.name}</span>
                              </button>
                            );
                          })}
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 pb-1 pt-3">{teamBName}</p>
                          {getTeamPlayers("B").map((player) => {
                            const color = getAvatarColor(player.name);
                            return (
                              <button
                                key={player.userId}
                                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-left"
                                onClick={() => setSubStep({ type: "pick-action", playerId: player.userId, fromTeam: "B" })}
                              >
                                <Avatar className="w-8 h-8 shrink-0">
                                  <AvatarFallback className={`text-xs font-bold ${color.bg} ${color.text}`}>
                                    {player.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-sm">{player.name}</span>
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="bench" className="mt-3">
                  <ScrollArea className="h-52">
                    <div className="space-y-2">
                      {getBenchPlayers().length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Banco vazio</p>
                      )}
                      {getBenchPlayers().map((player) => {
                        const color = getAvatarColor(player.name);
                        return (
                          <div
                            key={player.userId}
                            className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
                          >
                            <Avatar className="w-8 h-8 shrink-0">
                              <AvatarFallback className={`text-xs font-bold ${color.bg} ${color.text}`}>
                                {player.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-sm flex-1">{player.name}</span>
                            <div className="flex gap-1.5 shrink-0">
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => addFromBench(player.userId, "A")}>
                                <UserPlus className="w-3 h-3 mr-1" /> {teamAName}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => addFromBench(player.userId, "B")}>
                                <UserPlus className="w-3 h-3 mr-1" /> {teamBName}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="outside" className="mt-3">
                  <ScrollArea className="h-52">
                    <div className="space-y-2">
                      {getOutsidePlayers().length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum jogador de fora</p>
                      )}
                      {getOutsidePlayers().map((player) => {
                        const color = getAvatarColor(player.name);
                        return (
                          <div key={player.userId} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                            <Avatar className="w-8 h-8 shrink-0">
                              <AvatarFallback className={`text-xs font-bold ${color.bg} ${color.text}`}>
                                {player.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-sm flex-1">{player.name}</span>
                            <div className="flex gap-1.5 shrink-0">
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => addFromOutside(player.userId, "A")}>
                                <UserPlus className="w-3 h-3 mr-1" /> {teamAName}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => addFromOutside(player.userId, "B")}>
                                <UserPlus className="w-3 h-3 mr-1" /> {teamBName}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {subStep.type === "pick-action" && (() => {
            const playerName = getPlayerName(subStep.playerId);
            const oppositeTeam = subStep.fromTeam === "A" ? "B" : "A";
            const oppositeTeamName = subStep.fromTeam === "A" ? teamBName : teamAName;
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarFallback className={`text-sm font-bold ${getAvatarColor(playerName).bg} ${getAvatarColor(playerName).text}`}>
                      {playerName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-sm">{playerName}</p>
                    <p className="text-xs text-muted-foreground">{subStep.fromTeam === "A" ? teamAName : teamBName}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-left"
                    onClick={() => setSubStep({ type: "pick-swap-target", playerId: subStep.playerId, fromTeam: subStep.fromTeam, targetTeam: oppositeTeam as "A" | "B" })}
                  >
                    <ArrowRightLeft className="w-5 h-5 text-blue-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Trocar com {oppositeTeamName}</p>
                      <p className="text-xs text-muted-foreground">Troca com jogador do time adversário</p>
                    </div>
                  </button>

                  <button
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-left"
                    onClick={() => sendToBench(subStep.playerId, subStep.fromTeam)}
                    disabled={subMutation.isPending}
                  >
                    <UserMinus className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Mandar pro banco</p>
                      <p className="text-xs text-muted-foreground">Sai de campo sem substituir</p>
                    </div>
                  </button>

                  {getOutsidePlayers().length > 0 && (
                    <button
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-left"
                      onClick={() => setSubStep({ type: "pick-swap-target", playerId: subStep.playerId, fromTeam: subStep.fromTeam, targetTeam: "outside" })}
                    >
                      <ArrowRightLeft className="w-5 h-5 text-violet-500 shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">Trocar com time de fora</p>
                        <p className="text-xs text-muted-foreground">Troca com jogador que não está jogando</p>
                      </div>
                    </button>
                  )}
                </div>

                <Button variant="ghost" className="w-full" onClick={() => setSubStep({ type: "pick-player" })}>
                  Voltar
                </Button>
              </div>
            );
          })()}

          {subStep.type === "pick-swap-target" && (() => {
            const playerName = getPlayerName(subStep.playerId);
            const targets = subStep.targetTeam === "outside"
              ? getOutsidePlayers()
              : getTeamPlayers(subStep.targetTeam);
            const targetLabel = subStep.targetTeam === "outside" ? "time de fora" : (subStep.targetTeam === "A" ? teamAName : teamBName);

            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className={`text-xs font-bold ${getAvatarColor(playerName).bg} ${getAvatarColor(playerName).text}`}>
                      {playerName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-bold text-sm">{playerName}</p>
                  <ArrowRightLeft className="w-4 h-4 text-muted-foreground mx-1" />
                  <p className="text-sm text-muted-foreground">Trocar com quem do {targetLabel}?</p>
                </div>

                <ScrollArea className="h-52">
                  <div className="space-y-2">
                    {targets.map((target) => {
                      const color = getAvatarColor(target.name);
                      const fromSource = subStep.targetTeam === "outside" ? "outside" as const : subStep.targetTeam;
                      return (
                        <button
                          key={target.userId}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-left"
                          onClick={() => swapPlayers(subStep.playerId, subStep.fromTeam, target.userId, fromSource)}
                          disabled={subMutation.isPending}
                        >
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className={`text-xs font-bold ${color.bg} ${color.text}`}>
                              {target.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-sm">{target.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>

                <Button variant="ghost" className="w-full" onClick={() => setSubStep({ type: "pick-action", playerId: subStep.playerId, fromTeam: subStep.fromTeam })}>
                  Voltar
                </Button>
              </div>
            );
          })()}

          {subMutation.isError && (
            <p className="text-destructive text-sm text-center mt-2">{(subMutation.error as Error).message}</p>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
