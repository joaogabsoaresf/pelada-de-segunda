"use client";

import { use, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
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

export default function LiveGamePage({ params }: { params: Promise<{ id: string; gameId: string }> }) {
  const { id, gameId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [sheetMode, setSheetMode] = useState<EventSheetMode>(null);
  const [noteText, setNoteText] = useState("");
  const [allPlayers, setAllPlayers] = useState<PlayerInfo[]>([]);

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
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
      setSheetMode(null); setNoteText("");
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventIndex: number) => {
      const res = await fetch(`/api/games/${gameId}/events/${eventIndex}`, { method: "DELETE" });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? "Erro ao remover evento"); }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/games/${gameId}/pause`, { method: "POST" });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? "Erro ao pausar jogo"); }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/games/${gameId}/resume`, { method: "POST" });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? "Erro ao retomar jogo"); }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
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

      {/* Event log */}
      <div className="flex-1 px-4 pt-4 pb-52">
        {game.events.length > 0 && (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4 py-2.5 border-b">
              Eventos
            </p>
            <ScrollArea className="h-44">
              <div className="p-3 space-y-1">
                {[...game.events].reverse().map((event, i) => {
                  const realIndex = game.events.length - 1 - i;
                  return (
                    <div key={i} className="flex items-start gap-2 text-sm py-1.5 border-b border-border/40 last:border-0">
                      <span className="shrink-0 text-base">
                        {event.type === "goal" ? "⚽" : event.type === "assist" ? "👟" : "📝"}
                      </span>
                      <div className="flex-1 text-sm">
                        {event.type === "goal" && event.playerId && (
                          <p>
                            <span className="font-semibold">{getPlayerName(event.playerId)}</span>
                            <span className="text-muted-foreground"> marcou!</span>
                            {event.relatedPlayerId && (
                              <span className="text-muted-foreground text-xs"> · assist: {getPlayerName(event.relatedPlayerId)}</span>
                            )}
                          </p>
                        )}
                        {event.type === "assist" && event.playerId && (
                          <p>Assistência de <span className="font-semibold">{getPlayerName(event.playerId)}</span></p>
                        )}
                        {event.type === "note" && <p className="text-muted-foreground italic">{event.note}</p>}
                      </div>
                      {(event.type === "goal" || event.type === "assist") && isLive && (
                        <button
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                          onClick={() => deleteEventMutation.mutate(realIndex)}
                          disabled={deleteEventMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

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
            <div className="grid grid-cols-3 gap-2">
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
    </div>
  );
}
