"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Swords, Users, Target, Zap, Flag, Settings2, Copy, CheckCheck, BarChart2, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Separator } from "@/components/ui/separator";

interface TeamPlayer { userId: string; name: string }
interface Team { id: string; name: string; players: TeamPlayer[] }
interface MatchDayPlayer { userId: string; name: string; pot: number }
interface MatchDay { id: string; teams: Team[]; players: MatchDayPlayer[] }
interface TeamRecord { wins: number; draws: number; losses: number }
interface PlayerStat { userId: string; name: string; count: number }
interface GamesStats {
  teamStats: Record<string, TeamRecord>;
  topScorers: PlayerStat[];
  topAssisters: PlayerStat[];
  gamesPlayed: number;
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

const TEAM_COLORS = [
  { ring: "ring-blue-500", accent: "bg-blue-600", light: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", divide: "divide-blue-100", badge: "border-blue-300 text-blue-700" },
  { ring: "ring-rose-500", accent: "bg-rose-600", light: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", divide: "divide-rose-100", badge: "border-rose-300 text-rose-700" },
  { ring: "ring-amber-500", accent: "bg-amber-500", light: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", divide: "divide-amber-100", badge: "border-amber-300 text-amber-700" },
  { ring: "ring-violet-500", accent: "bg-violet-600", light: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", divide: "divide-violet-100", badge: "border-violet-300 text-violet-700" },
  { ring: "ring-teal-500", accent: "bg-teal-600", light: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", divide: "divide-teal-100", badge: "border-teal-300 text-teal-700" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

export default function NewGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [copiedTeams, setCopiedTeams] = useState(false);
  const [editRosters, setEditRosters] = useState<Record<string, string[]>>({});
  const [pendingOutside, setPendingOutside] = useState<string[]>([]);
  const [localPlayerNames, setLocalPlayerNames] = useState<Record<string, string>>({});
  const [playerSearch, setPlayerSearch] = useState("");
  const [addMode, setAddMode] = useState<"search" | "new">("search");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newType, setNewType] = useState<"monthly" | "daily" | "goalkeeper">("monthly");

  const { data: matchDay, isLoading } = useQuery<MatchDay>({
    queryKey: ["match-day", id],
    queryFn: async () => { const res = await fetch(`/api/match-days/${id}`); return res.json(); },
  });

  const { data: stats } = useQuery<GamesStats>({
    queryKey: ["match-day-stats", id],
    queryFn: async () => { const res = await fetch(`/api/match-days/${id}/games-stats`); return res.json(); },
    staleTime: 0,
  });

  const { data: allSystemPlayers } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["players"],
    queryFn: async () => { const res = await fetch("/api/users"); return res.json(); },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchDayId: id, teamAId: selectedTeams[0], teamBId: selectedTeams[1] }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? "Erro ao criar jogo"); }
      return res.json();
    },
    onSuccess: (game) => router.push(`/peladas/${id}/game/${game.id}`),
  });

  const finishPeladaMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/match-days/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "finished" }),
      });
      if (!res.ok) throw new Error("Erro ao finalizar pelada");
    },
    onSuccess: () => router.push("/peladas"),
  });

  const saveTeamsMutation = useMutation({
    mutationFn: async () => {
      for (const pid of pendingOutside) {
        await fetch(`/api/match-days/${id}/players`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: pid }),
        });
      }
      const teams = (matchDay?.teams ?? []).map((t) => ({
        id: t.id, name: t.name,
        players: editRosters[t.id] ?? t.players.map((p) => p.userId),
      }));
      const res = await fetch(`/api/match-days/${id}/teams`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams }),
      });
      if (!res.ok) throw new Error("Erro ao salvar times");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-day", id] });
      setManageOpen(false);
      setPendingOutside([]);
    },
  });

  const createPlayerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), phone: newPhone.trim(), type: newType }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? "Erro ao cadastrar jogador"); }
      return res.json();
    },
    onSuccess: (user) => {
      setLocalPlayerNames((prev) => ({ ...prev, [user.id]: user.name }));
      setPendingOutside((prev) => [...prev, user.id]);
      queryClient.invalidateQueries({ queryKey: ["players"] });
      setNewName(""); setNewPhone(""); setNewType("monthly"); setAddMode("search");
    },
  });

  function copyTeams() {
    const text = (matchDay?.teams ?? [])
      .map((t) => {
        const roster = editRosters[t.id] ?? t.players.map((p) => p.userId);
        return `${t.name}:\n${roster.map(getEditPlayerName).join("\n")}`;
      }).join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTeams(true); setTimeout(() => setCopiedTeams(false), 2000);
    });
  }

  function openManage() {
    if (!matchDay) return;
    setEditRosters(Object.fromEntries(matchDay.teams.map((t) => [t.id, t.players.map((p) => p.userId)])));
    setPendingOutside([]); setPlayerSearch(""); setAddMode("search");
    setNewName(""); setNewPhone(""); setNewType("monthly"); setManageOpen(true);
  }

  function movePlayer(playerId: string, toTeamId: string | "waiting") {
    setEditRosters((prev) => {
      const next = { ...prev };
      for (const tid of Object.keys(next)) next[tid] = next[tid].filter((p) => p !== playerId);
      if (toTeamId !== "waiting" && next[toTeamId] !== undefined) next[toTeamId] = [...next[toTeamId], playerId];
      return next;
    });
    if (toTeamId !== "waiting") setPendingOutside((prev) => prev.filter((p) => p !== playerId));
  }

  function addOutsidePlayer(playerId: string) {
    if (pendingOutside.includes(playerId)) return;
    const alreadyInTeam = Object.values(editRosters).some((r) => r.includes(playerId));
    const alreadyInMatchDay = (matchDay?.players ?? []).some((p) => p.userId === playerId);
    if (alreadyInTeam || alreadyInMatchDay) return;
    setPendingOutside((prev) => [...prev, playerId]); setPlayerSearch("");
  }

  function getEditPlayerName(playerId: string): string {
    if (localPlayerNames[playerId]) return localPlayerNames[playerId];
    const fromMD = (matchDay?.players ?? []).find((p) => p.userId === playerId);
    if (fromMD) return fromMD.name;
    return (allSystemPlayers ?? []).find((p) => p.id === playerId)?.name ?? playerId.slice(-4);
  }

  function getWaitingList() {
    const allTeamIds = new Set(Object.values(editRosters).flat());
    const mdWaiting = (matchDay?.players ?? []).map((p) => p.userId).filter((pid) => !allTeamIds.has(pid));
    const pendingWaiting = pendingOutside.filter((pid) => !allTeamIds.has(pid));
    return [...mdWaiting, ...pendingWaiting];
  }

  function toggleTeam(teamId: string) {
    setSelectedTeams((prev) => {
      if (prev.includes(teamId)) return prev.filter((t) => t !== teamId);
      if (prev.length >= 2) return [prev[1], teamId];
      return [...prev, teamId];
    });
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  const teams = matchDay?.teams ?? [];
  const canCreate = selectedTeams.length === 2;
  const gamesPlayed = stats?.gamesPlayed ?? 0;
  const getRecord = (teamId: string): TeamRecord => stats?.teamStats[teamId] ?? { wins: 0, draws: 0, losses: 0 };

  return (
    <div className="flex flex-col min-h-0 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="relative px-4 pt-6 pb-4 bg-card border-b">
        <div className="flex items-center gap-3">
          <Link href={`/peladas/${id}?manage=true`}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Selecionar Times</h1>
            <p className="text-muted-foreground text-xs">
              {gamesPlayed > 0
                ? `${gamesPlayed} jogo${gamesPlayed !== 1 ? "s" : ""} disputado${gamesPlayed !== 1 ? "s" : ""} · selecione 2 times`
                : "Selecione 2 times para jogar"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {gamesPlayed > 0 && (
              <Link href={`/peladas/${id}/stats`}>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <BarChart2 className="w-4 h-4" />
                  Estatísticas
                </Button>
              </Link>
            )}
            {teams.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openManage}>
                <Settings2 className="w-4 h-4" />
                Times
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 space-y-4 pb-44">
        {/* Teams */}
        <div className="space-y-2.5">
          {teams.length === 0 && (
            <p className="text-center text-muted-foreground py-10 text-sm">
              Nenhum time definido.{" "}
              <Link href={`/peladas/${id}/draw`} className="text-primary font-semibold underline">Sortear times</Link>
            </p>
          )}

          {teams.map((team, idx) => {
            const isSelected = selectedTeams.includes(team.id);
            const selectionOrder = selectedTeams.indexOf(team.id);
            const tc = TEAM_COLORS[idx % TEAM_COLORS.length];
            const label = isSelected ? (selectionOrder === 0 ? "A" : "B") : null;
            const record = getRecord(team.id);

            return (
              <button
                key={team.id}
                className={`w-full text-left rounded-xl transition-all overflow-hidden shadow-sm border ${
                  isSelected ? `ring-2 ${tc.ring} shadow-md border-transparent` : "border-border bg-card"
                }`}
                onClick={() => toggleTeam(team.id)}
              >
                <div className="flex items-stretch">
                  <div className={`w-12 flex items-center justify-center shrink-0 ${isSelected ? tc.accent : "bg-muted"}`}>
                    {label
                      ? <span className="text-white font-black text-xl">{label}</span>
                      : <Users className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 px-3 py-3">
                    <p className="font-bold text-sm">{team.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {team.players.slice(0, 5).map((p) => {
                        const color = getAvatarColor(p.name);
                        return (
                          <Avatar key={p.userId} className="w-6 h-6">
                            <AvatarFallback className={`text-[9px] font-bold ${color.bg} ${color.text}`}>
                              {p.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        );
                      })}
                      {team.players.length > 5 && (
                        <span className="text-xs text-muted-foreground self-center ml-0.5">+{team.players.length - 5}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center px-3 py-3 border-l border-border shrink-0 min-w-[56px]">
                    <div className="flex items-center gap-0.5 text-sm font-black tabular-nums">
                      <span className="text-green-600">{record.wins}</span>
                      <span className="text-muted-foreground font-normal">-</span>
                      <span className="text-amber-500">{record.draws}</span>
                      <span className="text-muted-foreground font-normal">-</span>
                      <span className="text-destructive">{record.losses}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-semibold tracking-wide mt-0.5">V · E · D</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Stats */}
        {gamesPlayed > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Estatísticas</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {stats && stats.topScorers.length > 0 && (
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
              {stats && stats.topAssisters.length > 0 && (
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
        )}
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t py-4 px-4 space-y-2">
        {createMutation.isError && (
          <p className="text-destructive text-sm text-center">{(createMutation.error as Error).message}</p>
        )}
        <Button
          className="w-full h-12 gap-2 font-bold"
          disabled={!canCreate || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          <Swords className="w-4 h-4" />
          {createMutation.isPending ? "Criando..." : "Iniciar Jogo"}
        </Button>
        <Separator />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="w-full h-10 gap-2 font-semibold text-muted-foreground hover:text-destructive">
              <Flag className="w-4 h-4" />
              Finalizar Pelada
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalizar a pelada?</AlertDialogTitle>
              <AlertDialogDescription>
                {gamesPlayed > 0
                  ? `Foram disputados ${gamesPlayed} jogo${gamesPlayed !== 1 ? "s" : ""} nesta pelada.`
                  : "Nenhum jogo foi disputado nesta pelada."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => finishPeladaMutation.mutate()}>
                Finalizar Pelada
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Manage Teams Sheet */}
      <Sheet open={manageOpen} onOpenChange={setManageOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl h-[88vh] flex flex-col overflow-hidden">
          <SheetHeader className="pb-3 shrink-0">
            <SheetTitle className="font-bold text-lg">Gerenciar Times</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
            <div className="space-y-4 pb-4">
              {(matchDay?.teams ?? []).map((team, idx) => {
                const tc = TEAM_COLORS[idx % TEAM_COLORS.length];
                const otherTeams = (matchDay?.teams ?? []).filter((t) => t.id !== team.id);
                const roster = editRosters[team.id] ?? [];
                return (
                  <div key={team.id} className={`rounded-xl border ${tc.border} overflow-hidden`}>
                    <div className={`${tc.light} px-3 py-2 flex items-center justify-between`}>
                      <p className={`text-xs font-bold ${tc.text} uppercase tracking-wider`}>{team.name}</p>
                      <Badge variant="outline" className={`${tc.badge} bg-card text-xs`}>{roster.length}</Badge>
                    </div>
                    {roster.length === 0
                      ? <p className="text-xs text-muted-foreground text-center py-3">Sem jogadores</p>
                      : (
                        <div className={`divide-y ${tc.divide}`}>
                          {roster.map((pid) => {
                            const name = getEditPlayerName(pid);
                            const ac = getAvatarColor(name);
                            return (
                              <div key={pid} className="flex items-center gap-2 px-3 py-2 bg-card">
                                <Avatar className="w-7 h-7 shrink-0">
                                  <AvatarFallback className={`text-[10px] font-bold ${ac.bg} ${ac.text}`}>
                                    {name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="flex-1 text-sm font-semibold truncate">{name}</p>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2 shrink-0">
                                      Mover <ChevronDown className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {otherTeams.map((ot) => (
                                      <DropdownMenuItem key={ot.id} onSelect={() => movePlayer(pid, ot.id)}>
                                        {ot.name}
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuItem onSelect={() => movePlayer(pid, "waiting")}>
                                      Banco
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </div>
                );
              })}

              {/* Banco */}
              {(() => {
                const banco = getWaitingList();
                return (
                  <div className="rounded-xl border border-amber-200 overflow-hidden">
                    <div className="bg-amber-50 px-3 py-2 flex items-center justify-between">
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Banco</p>
                      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-card text-xs">{banco.length}</Badge>
                    </div>
                    {banco.length === 0
                      ? <p className="text-xs text-muted-foreground text-center py-3">Vazio</p>
                      : (
                        <div className="divide-y divide-amber-100">
                          {banco.map((pid) => {
                            const name = getEditPlayerName(pid);
                            const ac = getAvatarColor(name);
                            const isNew = pendingOutside.includes(pid);
                            return (
                              <div key={pid} className="flex items-center gap-2 px-3 py-2 bg-card">
                                <Avatar className="w-7 h-7 shrink-0">
                                  <AvatarFallback className={`text-[10px] font-bold ${ac.bg} ${ac.text}`}>
                                    {name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="flex-1 text-sm font-semibold truncate">{name}</p>
                                {isNew && (
                                  <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] mr-1">novo</Badge>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2 shrink-0">
                                      Mover <ChevronDown className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {(matchDay?.teams ?? []).map((t) => (
                                      <DropdownMenuItem key={t.id} onSelect={() => movePlayer(pid, t.id)}>
                                        {t.name}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </div>
                );
              })()}

              {/* Add outside player */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Adicionar de Fora</p>
                  <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
                    {(["search", "new"] as const).map((m) => (
                      <button
                        key={m}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${addMode === m ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                        onClick={() => setAddMode(m)}
                      >
                        {m === "search" ? "Buscar" : "Novo"}
                      </button>
                    ))}
                  </div>
                </div>

                {addMode === "search" && (
                  <div className="p-3 space-y-2">
                    <Input placeholder="Buscar jogador..." value={playerSearch} onChange={(e) => setPlayerSearch(e.target.value)} className="h-9 text-sm" />
                    {playerSearch.trim() && (() => {
                      const allInGame = new Set([...(matchDay?.players ?? []).map((p) => p.userId), ...pendingOutside]);
                      const results = (allSystemPlayers ?? []).filter((p) => !allInGame.has(p.id) && p.name.toLowerCase().includes(playerSearch.toLowerCase())).slice(0, 8);
                      return (
                        <div className="space-y-1">
                          {results.length === 0
                            ? <p className="text-xs text-muted-foreground text-center py-2">Nenhum encontrado</p>
                            : results.map((p) => {
                              const ac = getAvatarColor(p.name);
                              return (
                                <button
                                  key={p.id}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:bg-muted transition-colors text-left"
                                  onClick={() => addOutsidePlayer(p.id)}
                                >
                                  <Avatar className="w-7 h-7 shrink-0">
                                    <AvatarFallback className={`text-[10px] font-bold ${ac.bg} ${ac.text}`}>
                                      {p.name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-semibold">{p.name}</span>
                                  <span className="ml-auto text-xs text-muted-foreground">+ Banco</span>
                                </button>
                              );
                            })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {addMode === "new" && (
                  <div className="p-3 space-y-2">
                    <Input placeholder="Nome completo" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9 text-sm" />
                    <Input placeholder="Telefone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="h-9 text-sm" type="tel" />
                    <Select value={newType} onValueChange={(v) => setNewType(v as "monthly" | "daily" | "goalkeeper")}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensalista</SelectItem>
                        <SelectItem value="daily">Diarista</SelectItem>
                        <SelectItem value="goalkeeper">🧤 Goleiro</SelectItem>
                      </SelectContent>
                    </Select>
                    {createPlayerMutation.isError && (
                      <p className="text-destructive text-xs text-center">{(createPlayerMutation.error as Error).message}</p>
                    )}
                    <Button
                      className="w-full h-9 font-bold text-sm"
                      disabled={!newName.trim() || !newPhone.trim() || createPlayerMutation.isPending}
                      onClick={() => createPlayerMutation.mutate()}
                    >
                      {createPlayerMutation.isPending ? "Cadastrando..." : "Cadastrar e Adicionar ao Banco"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 shrink-0 border-t">
            {saveTeamsMutation.isError && (
              <p className="text-destructive text-xs text-center mb-2">{(saveTeamsMutation.error as Error).message}</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2 font-semibold shrink-0" onClick={copyTeams}>
                {copiedTeams ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copiedTeams ? "Copiado!" : "Copiar"}
              </Button>
              <Button className="flex-1 h-12 font-bold" onClick={() => saveTeamsMutation.mutate()} disabled={saveTeamsMutation.isPending}>
                {saveTeamsMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
