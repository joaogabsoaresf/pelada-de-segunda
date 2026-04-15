import { Types } from "mongoose";
import { Game } from "@/lib/models/Game";
import { User } from "@/lib/models/User";

export interface PlayerStat {
  userId: string;
  name: string;
  count: number;
}

export interface GameSummary {
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
    createdAt: Date;
  }[];
}

export async function getGameSummary(gameId: string): Promise<GameSummary> {
  const game = await Game.findById(gameId).lean();
  if (!game) throw new Error("Jogo não encontrado");

  const goals = game.events.filter((e) => e.type === "goal");
  const assists = game.events.filter((e) => e.type === "assist");

  const teamAPlayerIds = game.teamA.players.map((p) => p.toString());
  const teamBPlayerIds = game.teamB.players.map((p) => p.toString());

  const scoreA = goals.filter(
    (e) => e.playerId && teamAPlayerIds.includes(e.playerId.toString())
  ).length;
  const scoreB = goals.filter(
    (e) => e.playerId && teamBPlayerIds.includes(e.playerId.toString())
  ).length;

  const allPlayerIds = [
    ...game.teamA.players,
    ...game.teamB.players,
    ...game.events.flatMap((e) =>
      [e.playerId, e.relatedPlayerId].filter(Boolean)
    ),
  ] as Types.ObjectId[];

  const uniqueIds = [...new Set(allPlayerIds.map((id) => id.toString()))];
  const users = await User.find({ _id: { $in: uniqueIds } }).lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

  function countByPlayer(events: typeof goals): PlayerStat[] {
    const counts = new Map<string, number>();
    for (const e of events) {
      if (!e.playerId) continue;
      const pid = e.playerId.toString();
      counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([userId, count]) => ({
        userId,
        name: userMap.get(userId) ?? "Desconhecido",
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  const enrichedEvents = game.events.map((e) => ({
    type: e.type,
    playerName: e.playerId ? userMap.get(e.playerId.toString()) : undefined,
    relatedPlayerName: e.relatedPlayerId
      ? userMap.get(e.relatedPlayerId.toString())
      : undefined,
    note: e.note,
    createdAt: e.createdAt,
  }));

  return {
    gameId: game._id.toString(),
    status: game.status,
    teamAId: game.teamA.id,
    teamBId: game.teamB.id,
    scoreA,
    scoreB,
    result: scoreA > scoreB ? "teamA" : scoreB > scoreA ? "teamB" : "draw",
    topScorers: countByPlayer(goals),
    topAssisters: countByPlayer(assists),
    events: enrichedEvents,
  };
}
