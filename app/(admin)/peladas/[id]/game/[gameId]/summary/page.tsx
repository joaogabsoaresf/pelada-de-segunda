"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Target, Zap, Trophy } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface PlayerStat { userId: string; name: string; count: number }
interface GameSummary {
  gameId: string;
  status: string;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  result: "teamA" | "teamB" | "draw";
  topScorers: PlayerStat[];
  topAssisters: PlayerStat[];
  events: {
    type: string;
    playerName?: string;
    relatedPlayerName?: string;
    note?: string;
    createdAt: string;
  }[];
}
interface MatchDay { teams: { id: string; name: string }[] }

const MEDALS = ["🥇", "🥈", "🥉"];

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

export default function SummaryPage({ params }: { params: Promise<{ id: string; gameId: string }> }) {
  const { id, gameId } = use(params);

  const { data: summary, isLoading } = useQuery<GameSummary>({
    queryKey: ["summary", gameId],
    queryFn: async () => {
      const res = await fetch(`/api/games/${gameId}/summary`);
      if (!res.ok) throw new Error("Resumo não disponível");
      return res.json();
    },
  });

  const { data: matchDay } = useQuery<MatchDay>({
    queryKey: ["match-day", id],
    queryFn: async () => { const res = await fetch(`/api/match-days/${id}`); return res.json(); },
  });

  const getTeamName = (teamId: string) => matchDay?.teams?.find((t) => t.id === teamId)?.name ?? teamId;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!summary) return null;

  const teamAName = getTeamName(summary.teamAId);
  const teamBName = getTeamName(summary.teamBId);
  const winnerName = summary.result === "teamA" ? teamAName : summary.result === "teamB" ? teamBName : null;

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
            <h1 className="font-bold text-lg">Resultado Final</h1>
            <p className="text-muted-foreground text-xs">
              {winnerName ? `${winnerName} venceu!` : "Empate!"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-8 space-y-4">
        {/* Score card */}
        <div className="rounded-xl bg-slate-900 text-white overflow-hidden shadow-sm">
          {winnerName && (
            <div className="bg-amber-500 py-2.5 text-center">
              <p className="text-white text-sm font-black tracking-wide">🏆 {winnerName} venceu!</p>
            </div>
          )}
          {summary.result === "draw" && (
            <div className="bg-slate-600 py-2.5 text-center">
              <p className="text-white text-sm font-bold">🤝 Empate!</p>
            </div>
          )}
          <div className="py-6 px-4">
            <div className="flex items-center justify-between text-center">
              <div className="flex-1">
                <p className="font-semibold text-sm text-slate-300 truncate px-2">{teamAName}</p>
                <p className={`text-8xl font-black mt-2 tabular-nums leading-none ${summary.result === "teamA" ? "text-amber-400" : "text-white"}`}>
                  {summary.scoreA}
                </p>
              </div>
              <div className="px-4">
                <p className="text-slate-600 text-2xl font-light">×</p>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-slate-300 truncate px-2">{teamBName}</p>
                <p className={`text-8xl font-black mt-2 tabular-nums leading-none ${summary.result === "teamB" ? "text-amber-400" : "text-white"}`}>
                  {summary.scoreB}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Scorers */}
        {summary.topScorers.length > 0 && (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <Target className="w-4 h-4 text-green-600" />
              <p className="font-bold text-sm">Artilheiros</p>
            </div>
            <div className="divide-y">
              {summary.topScorers.map((player, i) => {
                const color = getAvatarColor(player.name);
                return (
                  <div key={player.userId} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xl w-7 text-center">{MEDALS[i] ?? "·"}</span>
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarFallback className={`text-sm font-bold ${color.bg} ${color.text}`}>
                        {player.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="flex-1 font-semibold text-sm">{player.name}</p>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 font-bold">
                      {player.count} {player.count === 1 ? "gol" : "gols"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Assisters */}
        {summary.topAssisters.length > 0 && (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <Zap className="w-4 h-4 text-blue-500" />
              <p className="font-bold text-sm">Assistências</p>
            </div>
            <div className="divide-y">
              {summary.topAssisters.map((player, i) => {
                const color = getAvatarColor(player.name);
                return (
                  <div key={player.userId} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xl w-7 text-center">{MEDALS[i] ?? "·"}</span>
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarFallback className={`text-sm font-bold ${color.bg} ${color.text}`}>
                        {player.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="flex-1 font-semibold text-sm">{player.name}</p>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 font-bold">
                      {player.count} {player.count === 1 ? "assist" : "assists"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Event log */}
        {summary.events.length > 0 && (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <Trophy className="w-4 h-4 text-amber-500" />
              <p className="font-bold text-sm">Eventos</p>
            </div>
            <div className="divide-y">
              {summary.events.map((event, i) => (
                <div key={i} className="flex items-start gap-2.5 px-4 py-3 text-sm">
                  <span className="shrink-0 text-base">
                    {event.type === "goal" ? "⚽" : event.type === "assist" ? "👟" : "📝"}
                  </span>
                  <div>
                    {event.type === "goal" && event.playerName && (
                      <p>
                        <span className="font-semibold">{event.playerName}</span>
                        <span className="text-muted-foreground"> marcou</span>
                        {event.relatedPlayerName && (
                          <span className="text-muted-foreground text-xs"> · assist: {event.relatedPlayerName}</span>
                        )}
                      </p>
                    )}
                    {event.type === "assist" && event.playerName && (
                      <p>Assistência de <span className="font-semibold">{event.playerName}</span></p>
                    )}
                    {event.type === "note" && <p className="text-muted-foreground italic">{event.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-2 pb-4">
          <Link href={`/peladas/${id}/game/new`} className="block">
            <Button variant="outline" className="w-full h-12 font-bold">Novo Jogo</Button>
          </Link>
          <Link href={`/peladas/${id}/game/new`} className="block">
            <Button variant="ghost" className="w-full h-12 font-semibold">Voltar para a Pelada</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
