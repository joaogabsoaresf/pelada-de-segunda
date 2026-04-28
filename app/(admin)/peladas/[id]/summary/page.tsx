"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, Share2, Copy, CheckCheck, Target, Zap, FileText, Trophy,
  Pencil, Trash2, Plus, Check, X, Users, ArrowRightLeft,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface TeamPlayer { userId: string; name: string }
interface Team { id: string; name: string; players: TeamPlayer[] }
interface MatchDay { id: string; date: string; teams: Team[]; players: { userId: string; name: string; pot: number }[] }
interface RankingEntry { teamId: string; wins: number; draws: number; losses: number; points: number }
interface PlayerStat { userId: string; name: string; count: number }
interface PlayerWinStat { userId: string; name: string; gamesPlayed: number; wins: number; winRate: number }
interface NoteEntry { note: string; createdAt: string }
interface GamesStats {
  ranking: RankingEntry[];
  topScorers: PlayerStat[];
  topAssisters: PlayerStat[];
  gamesPlayed: number;
  notes: NoteEntry[];
  playerStats: PlayerWinStat[];
}

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

const MEDALS = ["🥇", "🥈", "🥉"];

const PODIUM_STYLES = [
  { medal: "🥇", border: "border-amber-200", bg: "bg-amber-50", header: "bg-amber-100", title: "text-amber-900", record: "text-amber-600" },
  { medal: "🥈", border: "border-border", bg: "bg-card", header: "bg-muted/50", title: "text-foreground", record: "text-muted-foreground" },
  { medal: "🥉", border: "border-orange-200", bg: "bg-orange-50", header: "bg-orange-100", title: "text-orange-900", record: "text-orange-600" },
];

export default function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [copiedNotes, setCopiedNotes] = useState(false);

  // History state
  const [editingEvent, setEditingEvent] = useState<{ gameId: string; eventIndex: number; type: string } | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [addingToGame, setAddingToGame] = useState<{ gameId: string; type: "goal" | "assist" } | null>(null);
  const [editingTeams, setEditingTeams] = useState<{ gameId: string; teamA: string[]; teamB: string[] } | null>(null);

  const { data: matchDay, isLoading: loadingMd } = useQuery<MatchDay>({
    queryKey: ["match-day", id],
    queryFn: async () => { const res = await fetch(`/api/match-days/${id}`); return res.json(); },
  });

  const { data: stats, isLoading: loadingStats } = useQuery<GamesStats>({
    queryKey: ["match-day-stats", id],
    queryFn: async () => { const res = await fetch(`/api/match-days/${id}/games-stats`); return res.json(); },
    staleTime: 0,
  });

  const { data: gamesData, isLoading: loadingGames } = useQuery<GamesResponse>({
    queryKey: ["match-day-games", id],
    queryFn: async () => {
      const res = await fetch(`/api/match-days/${id}/games`);
      if (!res.ok) throw new Error("Erro ao carregar jogos");
      return res.json();
    },
  });

  const isLoading = loadingMd || loadingStats || loadingGames;
  const getTeamName = (teamId: string) => matchDay?.teams.find((t) => t.id === teamId)?.name ?? "Time";

  // Mutations
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

  const getAllPlayers = (): { userId: string; name: string }[] => {
    if (!gamesData || !matchDay) return [];
    const map = new Map<string, string>();
    for (const [uid, name] of Object.entries(gamesData.playerMap)) map.set(uid, name);
    for (const p of matchDay.players ?? []) if (!map.has(p.userId)) map.set(p.userId, p.name);
    for (const team of matchDay.teams ?? []) for (const p of team.players ?? []) if (!map.has(p.userId)) map.set(p.userId, p.name);
    return [...map.entries()].map(([userId, name]) => ({ userId, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  };

  function shareNotesWhatsApp() {
    if (!stats?.notes.length) return;
    const date = matchDay ? format(new Date(matchDay.date), "d 'de' MMMM", { locale: ptBR }) : "";
    const lines = stats.notes.map((n) => `• ${n.note}`).join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(`*Lances da Pelada${date ? ` de ${date}` : ""}* ⚽\n\n${lines}`)}`, "_blank");
  }

  function copyNotes() {
    if (!stats?.notes.length) return;
    const date = matchDay ? format(new Date(matchDay.date), "d 'de' MMMM", { locale: ptBR }) : "";
    const lines = stats.notes.map((n) => `• ${n.note}`).join("\n");
    navigator.clipboard.writeText(`Lances da Pelada${date ? ` de ${date}` : ""}:\n\n${lines}`).then(() => {
      setCopiedNotes(true); setTimeout(() => setCopiedNotes(false), 2000);
    });
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  const gamesPlayed = stats?.gamesPlayed ?? 0;
  const ranking = stats?.ranking ?? [];
  const notes = stats?.notes ?? [];
  const games = gamesData?.games ?? [];

  return (
    <div className="flex flex-col min-h-0 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="relative px-4 pt-6 pb-4 bg-card border-b">
        <div className="flex items-center gap-3">
          <Link href="/peladas">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-lg">Resumo da Pelada</h1>
            {matchDay && (
              <p className="text-muted-foreground text-xs capitalize">
                {format(new Date(matchDay.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            )}
          </div>
          {gamesPlayed > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {gamesPlayed} jogo{gamesPlayed !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="stats" className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-3 bg-card">
          <TabsList className="w-full">
            <TabsTrigger value="stats" className="flex-1">Estatísticas</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
          </TabsList>
        </div>

        {/* === STATS TAB === */}
        <TabsContent value="stats" className="flex-1 m-0">
          <div className="px-4 pt-4 space-y-4 pb-10">
            {ranking.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Classificação</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {ranking.map((r, i) => {
                  const team = matchDay?.teams.find((t) => t.id === r.teamId);
                  const style = PODIUM_STYLES[i] ?? { medal: `${i + 1}º`, border: "border-border", bg: "bg-card", header: "bg-muted/50", title: "text-foreground", record: "text-muted-foreground" };
                  return (
                    <div key={r.teamId} className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden shadow-sm`}>
                      <div className={`${style.header} px-4 py-3 flex items-center gap-2`}>
                        <span className="text-xl shrink-0">{style.medal}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-black text-base ${style.title} truncate`}>{team?.name ?? getTeamName(r.teamId)}</p>
                          <p className={`text-xs font-semibold ${style.record}`}>{r.wins}V · {r.draws}E · {r.losses}D</p>
                        </div>
                        <Badge variant="outline" className="text-xs font-semibold shrink-0">{team?.players.length ?? 0} jog.</Badge>
                      </div>
                      {team && team.players.length > 0 && (
                        <div className="px-4 py-2.5 flex flex-wrap gap-1.5">
                          {team.players.map((p) => {
                            const color = getAvatarColor(p.name);
                            return (
                              <div key={p.userId} className="flex items-center gap-1.5 bg-background rounded-full border border-border px-2 py-1">
                                <Avatar className="w-5 h-5 shrink-0">
                                  <AvatarFallback className={`text-[8px] font-bold ${color.bg} ${color.text}`}>
                                    {p.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-semibold">{p.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {(stats?.topScorers.length || stats?.topAssisters.length) ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Destaques</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {stats?.topScorers && stats.topScorers.length > 0 && (
                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b">
                        <Target className="w-3.5 h-3.5 text-green-600 shrink-0" />
                        <p className="font-bold text-xs">Artilheiros</p>
                      </div>
                      <div className="divide-y">
                        {stats.topScorers.map((player, i) => {
                          const color = getAvatarColor(player.name);
                          return (
                            <div key={player.userId} className="flex items-center gap-2 px-3 py-2">
                              <span className="text-sm w-5 shrink-0">{MEDALS[i]}</span>
                              <Avatar className="w-6 h-6 shrink-0">
                                <AvatarFallback className={`text-[9px] font-bold ${color.bg} ${color.text}`}>
                                  {player.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <p className="flex-1 font-semibold text-xs truncate">{player.name}</p>
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-[10px] font-bold px-1.5 shrink-0">
                                {player.count}⚽
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {stats?.topAssisters && stats.topAssisters.length > 0 && (
                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b">
                        <Zap className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <p className="font-bold text-xs">Assistências</p>
                      </div>
                      <div className="divide-y">
                        {stats.topAssisters.map((player, i) => {
                          const color = getAvatarColor(player.name);
                          return (
                            <div key={player.userId} className="flex items-center gap-2 px-3 py-2">
                              <span className="text-sm w-5 shrink-0">{MEDALS[i]}</span>
                              <Avatar className="w-6 h-6 shrink-0">
                                <AvatarFallback className={`text-[9px] font-bold ${color.bg} ${color.text}`}>
                                  {player.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <p className="flex-1 font-semibold text-xs truncate">{player.name}</p>
                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-[10px] font-bold px-1.5 shrink-0">
                                {player.count}👟
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {notes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Lances Anotados</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="font-bold text-xs">{notes.length} lance{notes.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2.5" onClick={copyNotes}>
                        {copiedNotes ? <CheckCheck className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedNotes ? "Copiado!" : "Copiar"}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2.5 text-green-700 hover:text-green-800 hover:bg-green-50" onClick={shareNotesWhatsApp}>
                        <Share2 className="w-3.5 h-3.5" />
                        WhatsApp
                      </Button>
                    </div>
                  </div>
                  <div className="divide-y">
                    {notes.map((n, i) => (
                      <div key={i} className="flex items-start gap-2.5 px-4 py-3">
                        <span className="text-base shrink-0 mt-px">📝</span>
                        <p className="text-sm leading-relaxed">{n.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {stats?.playerStats && stats.playerStats.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Desempenho Individual</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center gap-1.5 px-4 py-3 border-b">
                    <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <p className="font-bold text-xs">% de Vitórias</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left font-semibold text-xs text-muted-foreground px-4 py-2.5">Jogador</th>
                          <th className="text-center font-semibold text-xs text-muted-foreground px-3 py-2.5 w-16">Jogos</th>
                          <th className="text-center font-semibold text-xs text-muted-foreground px-3 py-2.5 w-16">Vitórias</th>
                          <th className="text-center font-semibold text-xs text-muted-foreground px-3 py-2.5 w-16">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {stats.playerStats.map((player, i) => {
                          const color = getAvatarColor(player.name);
                          return (
                            <tr key={player.userId} className="hover:bg-muted/30">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                                  <Avatar className="w-6 h-6 shrink-0">
                                    <AvatarFallback className={`text-[9px] font-bold ${color.bg} ${color.text}`}>
                                      {player.name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-semibold text-sm truncate">{player.name}</span>
                                </div>
                              </td>
                              <td className="text-center px-3 py-2.5 font-medium text-muted-foreground">{player.gamesPlayed}</td>
                              <td className="text-center px-3 py-2.5 font-medium text-muted-foreground">{player.wins}</td>
                              <td className="text-center px-3 py-2.5">
                                <Badge
                                  className={`border-0 text-[10px] font-bold px-1.5 ${
                                    player.winRate >= 60
                                      ? "bg-green-100 text-green-700 hover:bg-green-100"
                                      : player.winRate >= 40
                                      ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                      : "bg-red-100 text-red-700 hover:bg-red-100"
                                  }`}
                                >
                                  {player.winRate}%
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {gamesPlayed === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-sm">Nenhum jogo registrado nesta pelada.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* === HISTORY TAB === */}
        <TabsContent value="history" className="flex-1 m-0">
          <div className="px-4 pt-4 pb-8 space-y-4">
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
                                    <SelectItem key={p.userId} value={p.userId}>{p.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                disabled={!selectedPlayerId || updateEventMutation.isPending}
                                onClick={() => updateEventMutation.mutate({ gameId: game.id, eventIndex: event.originalIndex, playerId: selectedPlayerId })}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
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

                  <div className="border-t px-4 py-2.5 flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold"
                      onClick={() => { setAddingToGame({ gameId: game.id, type: "goal" }); }}>
                      <Plus className="w-3 h-3" /> Gol
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold"
                      onClick={() => { setAddingToGame({ gameId: game.id, type: "assist" }); }}>
                      <Plus className="w-3 h-3" /> Assist
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold ml-auto"
                      onClick={() => setEditingTeams({ gameId: game.id, teamA: [...game.teamA.players], teamB: [...game.teamB.players] })}>
                      <Users className="w-3 h-3" /> Times
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add event sheet */}
      <Sheet open={addingToGame !== null} onOpenChange={(o) => !o && setAddingToGame(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[60vh]">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-bold text-lg">
              {addingToGame?.type === "goal" ? "⚽ Adicionar Gol" : "👟 Adicionar Assistência"}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {addingToGame && getAllPlayers().map((player) => {
              const color = getAvatarColor(player.name);
              return (
                <button
                  key={player.userId}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-left"
                  onClick={() => addEventMutation.mutate({ gameId: addingToGame.gameId, type: addingToGame.type, playerId: player.userId })}
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
            const getPlayerName = (pid: string) => gamesData?.playerMap[pid] ?? pid.slice(-4);

            return (
              <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pb-4">
                {[
                  { key: "teamA" as const, name: teamAName, otherKey: "teamB" as const, otherName: teamBName, borderColor: "border-blue-200", bgColor: "bg-blue-50", textColor: "text-blue-700", divideColor: "divide-blue-100", badgeBorder: "border-blue-300" },
                  { key: "teamB" as const, name: teamBName, otherKey: "teamA" as const, otherName: teamAName, borderColor: "border-rose-200", bgColor: "bg-rose-50", textColor: "text-rose-700", divideColor: "divide-rose-100", badgeBorder: "border-rose-300" },
                ].map((t) => (
                  <div key={t.key} className={`rounded-xl border ${t.borderColor} overflow-hidden`}>
                    <div className={`${t.bgColor} px-3 py-2 flex items-center justify-between`}>
                      <p className={`text-xs font-bold ${t.textColor} uppercase tracking-wider`}>{t.name}</p>
                      <Badge variant="outline" className={`${t.textColor} ${t.badgeBorder} bg-card text-xs`}>
                        {editingTeams[t.key].length}
                      </Badge>
                    </div>
                    <div className={`divide-y ${t.divideColor}`}>
                      {editingTeams[t.key].map((pid) => {
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
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2 shrink-0"
                              onClick={() => {
                                setEditingTeams((prev) => prev ? {
                                  ...prev,
                                  [t.key]: prev[t.key].filter((p) => p !== pid),
                                  [t.otherKey]: [...prev[t.otherKey], pid],
                                } : null);
                              }}>
                              <ArrowRightLeft className="w-3 h-3" /> {t.otherName}
                            </Button>
                            <button className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors shrink-0"
                              onClick={() => {
                                setEditingTeams((prev) => prev ? {
                                  ...prev,
                                  [t.key]: prev[t.key].filter((p) => p !== pid),
                                } : null);
                              }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      {editingTeams[t.key].length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-3">Sem jogadores</p>
                      )}
                    </div>
                  </div>
                ))}

                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Adicionar Jogador</p>
                  </div>
                  <div className="p-3 space-y-2">
                    {["teamA" as const, "teamB" as const].map((key) => {
                      const name = key === "teamA" ? getTeamName(game.teamA.id) : getTeamName(game.teamB.id);
                      return (
                        <Select key={key} value="" onValueChange={(pid) => {
                          setEditingTeams((prev) => prev ? { ...prev, [key]: [...prev[key], pid] } : null);
                        }}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder={`Adicionar em ${name}...`} />
                          </SelectTrigger>
                          <SelectContent>
                            {getAllPlayers()
                              .filter((p) => !editingTeams.teamA.includes(p.userId) && !editingTeams.teamB.includes(p.userId))
                              .map((p) => (
                                <SelectItem key={p.userId} value={p.userId}>{p.name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
          <div className="pt-3 shrink-0 border-t">
            <Button className="w-full h-12 font-bold" disabled={saveTeamsMutation.isPending}
              onClick={() => {
                if (!editingTeams) return;
                saveTeamsMutation.mutate({ gameId: editingTeams.gameId, teamAPlayers: editingTeams.teamA, teamBPlayers: editingTeams.teamB });
              }}>
              {saveTeamsMutation.isPending ? "Salvando..." : "Salvar Times"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
