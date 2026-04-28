"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";

interface ActiveGame {
  id: string;
  matchDayId: string;
  status: "live" | "pending";
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  startedAt: string | null;
  pausedAt: string | null;
  pausedDuration: number;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function useElapsed(game: ActiveGame | null | undefined) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!game?.startedAt || game.status !== "live") {
      setElapsed(0);
      return;
    }

    const startMs = new Date(game.startedAt).getTime();
    const pausedSec = game.pausedDuration ?? 0;

    if (game.pausedAt) {
      const frozenMs = new Date(game.pausedAt).getTime() - startMs;
      setElapsed(Math.floor(frozenMs / 1000) - pausedSec);
      return;
    }

    const calc = () => Math.floor((Date.now() - startMs) / 1000) - pausedSec;
    setElapsed(calc());
    intervalRef.current = setInterval(() => setElapsed(calc()), 1000);
    return () => clearInterval(intervalRef.current);
  }, [game?.startedAt, game?.pausedAt, game?.pausedDuration, game?.status]);

  return elapsed;
}

export function ActiveGameBar() {
  const pathname = usePathname();
  const router = useRouter();

  const { data: game } = useQuery<ActiveGame | null>({
    queryKey: ["active-game"],
    queryFn: async () => {
      const res = await fetch("/api/games/active");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const elapsed = useElapsed(game);

  if (!game) return null;

  const isOnGamePage = pathname.includes(`/game/${game.id}`);
  if (isOnGamePage) return null;

  const isPaused = game.status === "live" && !!game.pausedAt;
  const isPending = game.status === "pending";

  return (
    <button
      onClick={() => router.push(`/peladas/${game.matchDayId}/game/${game.id}`)}
      className="w-full bg-slate-900 text-white px-4 py-2 flex items-center gap-3 hover:bg-slate-800 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-1.5">
        {isPending ? (
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        ) : isPaused ? (
          <span className="w-2 h-2 rounded-full bg-amber-400" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        )}
        <span className={`font-mono text-xs font-bold tabular-nums ${isPaused ? "text-amber-400" : "text-green-400"}`}>
          {isPending ? "AGUARD." : formatTime(elapsed)}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="font-bold text-sm truncate">{game.teamAName}</span>
        <span className="font-black text-sm tabular-nums">{game.scoreA} × {game.scoreB}</span>
        <span className="font-bold text-sm truncate">{game.teamBName}</span>
      </div>
      <span className="text-xs text-slate-400 font-semibold shrink-0">Voltar →</span>
    </button>
  );
}
