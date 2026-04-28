"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2, Plus, Check, X, Users, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface GameEvent {
  type: "goal" | "assist" | "note";
  playerId?: string;
  playerName?: string;
  relatedPlayerId?: string;
  relatedPlayerName?: string;
  note?: string;
  createdAt: string;
}

interface GameData {
  id: string;
  teamA: { id: string; players: string[] };
  teamB: { id: string; players: string[] };
  scoreA: number;
  scoreB: number;
  events: GameEvent[];
  createdAt: string;
}

interface GamesResponse {
  games: GameData[];
  playerMap: Record<string, string>;
}

interface MatchDay {
  id: string;
  teams: { id: string; name: string; players: { userId: string; name: string }[] }[];
  players: { userId: string; name: string }[];
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

export default function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const [editingEvent, setEditingEvent] = useState<{ gameId: string; eventIndex: number; type: string } | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [addingToGame, setAddingToGame] = useState<{ gameId: string; type: "goal" | "assist" } | null>(null);
  const [addPlayerId, setAddPlayerId] = useState<string>("");
  const [editingTeams, setEditingTeams] = useState<{ gameId: string; teamA: string[]; teamB: string[] } | null>(null);

  const { data: matchDay } = useQuery<MatchDay>({
    queryKey: ["match-day", id],
    queryFn: async () => { const res = await fetch(`/api/match-days/${id}`); return res.json(); },
  });

  const { data, isLoading } = useQuery<GamesResponse>({
    queryKey: ["match-day-games", id],
    queryFn: async () => {
      const res = await fetch(`/api/match-days/${id}/games`);
      if (!res.ok) throw new Error("Erro ao carregar jogos");
      return res.json();
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ gameId, eventIndex, playerId }: { gameId: string; eventIndex: number; playerId: string }) => {
      const res = await fetch(`/api/games/${gameId}/events/${eventIndex}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar evento");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-day-games", id] });
      queryClient.invalidateQueries({ queryKey: ["match-day-stats", id] });
      setEditingEvent(null);
      setSelectedPlayerId("");
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async ({ gameId, eventIndex }: { gameId: string; eventIndex: number }) => {
      const res = await fetch(`/api/games/${gameId}/events/${eventIndex}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover evento");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-day-games", id] });
      queryClient.invalidateQueries({ queryKey: ["match-day-stats", id] });
    },
  });

  const addEventMutation = useMutation({
    mutationFn: async ({ gameId, type, playerId }: { gameId: string; type: "goal" | "assist"; playerId: string }) => {
      const res = await fetch(`/api/games/${gameId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, playerId }),
      });
      if (!res.ok) throw new Error("Erro ao adicionar evento");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-day-games", id] });
      queryClient.invalidateQueries({ queryKey: ["match-day-stats", id] });
      setAddingToGame(null);
      setAddPlayerId("");
    },
  });

  const saveTeamsMutation = useMutation({
    mutationFn: async ({ gameId, teamAPlayers, teamBPlayers }: { gameId: string; teamAPlayers: string[]; teamBPlayers: string[] }) => {
      const res = await fetch(`/api/games/${gameId}/teams`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamAPlayers, teamBPlayers }),
      });
      if (!res.ok) throw new Error("Erro ao salvar times");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-day-games", id] });
      queryClient.invalidateQueries({ queryKey: ["match-day-stats", id] });
      setEditingTeams(null);
    },
  });

  const getTeamName = (teamId: string) =>
    matchDay?.teams?.find((t) => t.id === teamId)?.name ?? teamId;

  const getAllPlayers = (): { userId: string; name: string }[] => {
    if (!data || !matchDay) return [];
    const map = new Map<string, string>();
    for (const [uid, name] of Object.entries(data.playerMap)) {
      map.set(uid, name);
    }
    for (const p of matchDay.players ?? []) {
      if (!map.has(p.userId)) map.set(p.userId, p.name);
    }
    for (const team of matchDay.teams ?? []) {
      for (const p of team.players ?? []) {
        if (!map.has(p.userId)) map.set(p.userId, p.name);
      }
    }
    return [...map.entries()].map(([userId, name]) => ({ userId, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  };


  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const games = data?.games ?? [];

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
          <div>
            <h1 className="font-bold text-lg">Histórico de Jogos</h1>
            <p className="text-muted-foreground text-xs">
              {games.length} jogo{games.length !== 1 ? "s" : ""} finalizado{games.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-8 space-y-4">
        {games.length === 0 && (
          <p className="text-center text-muted-foreground py-10 text-sm">
            Nenhum jogo finalizado ainda
          </p>
        )}

        {games.map((game, gameIdx) => {
          const teamAName = getTeamName(game.teamA.id);
          const teamBName = getTeamName(game.teamB.id);
          const goalEvents = game.events
            .map((e, i) => ({ ...e, originalIndex: i }))
            .filter((e) => e.type === "goal" || e.type === "assist");

          return (
            <div key={game.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              {/* Game header */}
              <div className="px-4 py-3 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Jogo {gameIdx + 1}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{teamAName}</span>
                    <Badge variant="secondary" className="font-black text-base px-2.5">
                      {game.scoreA} × {game.scoreB}
                    </Badge>
                    <span className="font-bold text-sm">{teamBName}</span>
                  </div>
                </div>
              </div>

              {/* Events */}
              <div className="divide-y">
                {goalEvents.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Sem eventos</p>
                )}
                {goalEvents.map((event) => {
                  const isEditing = editingEvent?.gameId === game.id && editingEvent?.eventIndex === event.originalIndex;
                  const playerName = event.playerName ?? "Desconhecido";
                  const color = getAvatarColor(playerName);

                  return (
                    <div key={event.originalIndex} className="flex items-center gap-2 px-4 py-2.5">
                      <span className="text-base shrink-0">
                        {event.type === "goal" ? "⚽" : "👟"}
                      </span>

                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                            <SelectTrigger className="h-8 text-xs flex-1">
                              <SelectValue placeholder="Selecionar jogador" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAllPlayers().map((p) => (
                                <SelectItem key={p.userId} value={p.userId}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                            disabled={!selectedPlayerId || updateEventMutation.isPending}
                            onClick={() => updateEventMutation.mutate({
                              gameId: game.id,
                              eventIndex: event.originalIndex,
                              playerId: selectedPlayerId,
                            })}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => { setEditingEvent(null); setSelectedPlayerId(""); }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Avatar className="w-7 h-7 shrink-0">
                            <AvatarFallback className={`text-[10px] font-bold ${color.bg} ${color.text}`}>
                              {playerName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{playerName}</p>
                            {event.type === "goal" && event.relatedPlayerName && (
                              <p className="text-xs text-muted-foreground">assist: {event.relatedPlayerName}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {event.type === "goal" ? "Gol" : "Assist"}
                          </Badge>
                          <button
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            onClick={() => {
                              setEditingEvent({ gameId: game.id, eventIndex: event.originalIndex, type: event.type });
                              setSelectedPlayerId(event.playerId ?? "");
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover evento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {event.type === "goal" ? "Gol" : "Assistência"} de {playerName} será removido.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => deleteEventMutation.mutate({ gameId: game.id, eventIndex: event.originalIndex })}
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add event buttons */}
              <div className="border-t px-4 py-2.5 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold"
                  onClick={() => { setAddingToGame({ gameId: game.id, type: "goal" }); setAddPlayerId(""); }}
                >
                  <Plus className="w-3 h-3" /> Gol
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold"
                  onClick={() => { setAddingToGame({ gameId: game.id, type: "assist" }); setAddPlayerId(""); }}
                >
                  <Plus className="w-3 h-3" /> Assist
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold ml-auto"
                  onClick={() => setEditingTeams({ gameId: game.id, teamA: [...game.teamA.players], teamB: [...game.teamB.players] })}
                >
                  <Users className="w-3 h-3" /> Times
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add event sheet */}
      <Sheet open={addingToGame !== null} onOpenChange={(o) => !o && setAddingToGame(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[60vh]">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-bold text-lg">
              {addingToGame?.type === "goal" ? "⚽ Adicionar Gol" : "👟 Adicionar Assistência"}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {addingToGame && (() => {
              const players = getAllPlayers();
              return players.map((player) => {
                const color = getAvatarColor(player.name);
                return (
                  <button
                    key={player.userId}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-left"
                    onClick={() => addEventMutation.mutate({
                      gameId: addingToGame.gameId,
                      type: addingToGame.type,
                      playerId: player.userId,
                    })}
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
              });
            })()}
          </div>
          {addEventMutation.isError && (
            <p className="text-destructive text-sm text-center mt-2">{(addEventMutation.error as Error).message}</p>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit teams sheet */}
      <Sheet open={editingTeams !== null} onOpenChange={(o) => !o && setEditingTeams(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] flex flex-col overflow-hidden">
          <SheetHeader className="pb-3 shrink-0">
            <SheetTitle className="font-bold text-lg">Editar Times</SheetTitle>
          </SheetHeader>

          {editingTeams && (() => {
            const game = games.find((g) => g.id === editingTeams.gameId);
            if (!game) return null;
            const teamAName = getTeamName(game.teamA.id);
            const teamBName = getTeamName(game.teamB.id);
            const getPlayerName = (pid: string) => data?.playerMap[pid] ?? pid.slice(-4);

            return (
              <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pb-4">
                {/* Team A */}
                <div className="rounded-xl border border-blue-200 overflow-hidden">
                  <div className="bg-blue-50 px-3 py-2 flex items-center justify-between">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">{teamAName}</p>
                    <Badge variant="outline" className="text-blue-700 border-blue-300 bg-card text-xs">
                      {editingTeams.teamA.length}
                    </Badge>
                  </div>
                  <div className="divide-y divide-blue-100">
                    {editingTeams.teamA.map((pid) => {
                      const name = getPlayerName(pid);
                      const ac = getAvatarColor(name);
                      return (
                        <div key={pid} className="flex items-center gap-2 px-3 py-2 bg-card">
                          <Avatar className="w-7 h-7 shrink-0">
                            <AvatarFallback className={`text-[10px] font-bold ${ac.bg} ${ac.text}`}>
                              {name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <p className="flex-1 text-sm font-semibold truncate">{name}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 px-2 shrink-0"
                            onClick={() => {
                              setEditingTeams((prev) => prev ? {
                                ...prev,
                                teamA: prev.teamA.filter((p) => p !== pid),
                                teamB: [...prev.teamB, pid],
                              } : null);
                            }}
                          >
                            <ArrowRightLeft className="w-3 h-3" /> {teamBName}
                          </Button>
                          <button
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors shrink-0"
                            onClick={() => {
                              setEditingTeams((prev) => prev ? {
                                ...prev,
                                teamA: prev.teamA.filter((p) => p !== pid),
                              } : null);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    {editingTeams.teamA.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">Sem jogadores</p>
                    )}
                  </div>
                </div>

                {/* Team B */}
                <div className="rounded-xl border border-rose-200 overflow-hidden">
                  <div className="bg-rose-50 px-3 py-2 flex items-center justify-between">
                    <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">{teamBName}</p>
                    <Badge variant="outline" className="text-rose-700 border-rose-300 bg-card text-xs">
                      {editingTeams.teamB.length}
                    </Badge>
                  </div>
                  <div className="divide-y divide-rose-100">
                    {editingTeams.teamB.map((pid) => {
                      const name = getPlayerName(pid);
                      const ac = getAvatarColor(name);
                      return (
                        <div key={pid} className="flex items-center gap-2 px-3 py-2 bg-card">
                          <Avatar className="w-7 h-7 shrink-0">
                            <AvatarFallback className={`text-[10px] font-bold ${ac.bg} ${ac.text}`}>
                              {name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <p className="flex-1 text-sm font-semibold truncate">{name}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 px-2 shrink-0"
                            onClick={() => {
                              setEditingTeams((prev) => prev ? {
                                ...prev,
                                teamB: prev.teamB.filter((p) => p !== pid),
                                teamA: [...prev.teamA, pid],
                              } : null);
                            }}
                          >
                            <ArrowRightLeft className="w-3 h-3" /> {teamAName}
                          </Button>
                          <button
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors shrink-0"
                            onClick={() => {
                              setEditingTeams((prev) => prev ? {
                                ...prev,
                                teamB: prev.teamB.filter((p) => p !== pid),
                              } : null);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    {editingTeams.teamB.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">Sem jogadores</p>
                    )}
                  </div>
                </div>

                {/* Add player from outside */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Adicionar Jogador</p>
                  </div>
                  <div className="p-3 space-y-2">
                    <Select
                      value=""
                      onValueChange={(pid) => {
                        setEditingTeams((prev) => prev ? { ...prev, teamA: [...prev.teamA, pid] } : null);
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder={`Adicionar em ${teamAName}...`} />
                      </SelectTrigger>
                      <SelectContent>
                        {getAllPlayers()
                          .filter((p) => !editingTeams.teamA.includes(p.userId) && !editingTeams.teamB.includes(p.userId))
                          .map((p) => (
                            <SelectItem key={p.userId} value={p.userId}>{p.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value=""
                      onValueChange={(pid) => {
                        setEditingTeams((prev) => prev ? { ...prev, teamB: [...prev.teamB, pid] } : null);
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder={`Adicionar em ${teamBName}...`} />
                      </SelectTrigger>
                      <SelectContent>
                        {getAllPlayers()
                          .filter((p) => !editingTeams.teamA.includes(p.userId) && !editingTeams.teamB.includes(p.userId))
                          .map((p) => (
                            <SelectItem key={p.userId} value={p.userId}>{p.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="pt-3 shrink-0 border-t">
            {saveTeamsMutation.isError && (
              <p className="text-destructive text-xs text-center mb-2">{(saveTeamsMutation.error as Error).message}</p>
            )}
            <Button
              className="w-full h-12 font-bold"
              disabled={saveTeamsMutation.isPending}
              onClick={() => {
                if (!editingTeams) return;
                saveTeamsMutation.mutate({
                  gameId: editingTeams.gameId,
                  teamAPlayers: editingTeams.teamA,
                  teamBPlayers: editingTeams.teamB,
                });
              }}
            >
              {saveTeamsMutation.isPending ? "Salvando..." : "Salvar Times"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
