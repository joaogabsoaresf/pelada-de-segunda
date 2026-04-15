"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Share2, Copy, CheckCheck, Target, Zap, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TeamPlayer { userId: string; name: string }
interface Team { id: string; name: string; players: TeamPlayer[] }
interface MatchDay { id: string; date: string; teams: Team[] }
interface RankingEntry { teamId: string; wins: number; draws: number; losses: number; points: number }
interface PlayerStat { userId: string; name: string; count: number }
interface NoteEntry { note: string; createdAt: string }
interface GamesStats {
  ranking: RankingEntry[];
  topScorers: PlayerStat[];
  topAssisters: PlayerStat[];
  gamesPlayed: number;
  notes: NoteEntry[];
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
  { medal: "🥈", border: "border-border",    bg: "bg-card",     header: "bg-muted/50",   title: "text-foreground",  record: "text-muted-foreground" },
  { medal: "🥉", border: "border-orange-200",bg: "bg-orange-50",header: "bg-orange-100", title: "text-orange-900",  record: "text-orange-600" },
];

export default function PeladaStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [copiedNotes, setCopiedNotes] = useState(false);

  const { data: matchDay, isLoading: loadingMd } = useQuery<MatchDay>({
    queryKey: ["match-day", id],
    queryFn: async () => { const res = await fetch(`/api/match-days/${id}`); return res.json(); },
  });

  const { data: stats, isLoading: loadingStats } = useQuery<GamesStats>({
    queryKey: ["match-day-stats", id],
    queryFn: async () => { const res = await fetch(`/api/match-days/${id}/games-stats`); return res.json(); },
    staleTime: 0,
  });

  const isLoading = loadingMd || loadingStats;
  const getTeamName = (teamId: string) => matchDay?.teams.find((t) => t.id === teamId)?.name ?? "Time";

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
            <h1 className="font-bold text-lg">Estatísticas</h1>
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

      <div className="px-4 pt-4 space-y-4 pb-10">

        {/* Ranking */}
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

        {/* Goals & Assists */}
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

        {/* Notes */}
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

        {gamesPlayed === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">Nenhum jogo registrado nesta pelada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
