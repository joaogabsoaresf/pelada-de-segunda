import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game } from "@/lib/models/Game";
import { MatchDay } from "@/lib/models/MatchDay";
import { User } from "@/lib/models/User";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;

  const [games, matchDay] = await Promise.all([
    Game.find({ matchDayId: id, status: "finished" }).lean(),
    MatchDay.findById(id).lean(),
  ]);

  const teamStats: Record<string, { wins: number; draws: number; losses: number }> = {};
  const goalCounts = new Map<string, number>();
  const assistCounts = new Map<string, number>();
  const notes: { note: string; createdAt: string }[] = [];

  // Initialize all match day teams with 0-0-0 so they always appear in ranking
  for (const team of matchDay?.teams ?? []) {
    teamStats[team.id] = { wins: 0, draws: 0, losses: 0 };
  }

  function ensureTeam(teamId: string) {
    if (!teamStats[teamId]) {
      teamStats[teamId] = { wins: 0, draws: 0, losses: 0 };
    }
  }

  for (const game of games) {
    const teamAId = game.teamA.id;
    const teamBId = game.teamB.id;
    ensureTeam(teamAId);
    ensureTeam(teamBId);

    const teamAPlayerIds = game.teamA.players.map((p) => p.toString());
    const teamBPlayerIds = game.teamB.players.map((p) => p.toString());

    const goals = game.events.filter((e) => e.type === "goal");
    const assists = game.events.filter((e) => e.type === "assist");

    const scoreA = goals.filter(
      (e) => e.playerId && teamAPlayerIds.includes(e.playerId.toString())
    ).length;
    const scoreB = goals.filter(
      (e) => e.playerId && teamBPlayerIds.includes(e.playerId.toString())
    ).length;

    if (scoreA > scoreB) {
      teamStats[teamAId].wins++;
      teamStats[teamBId].losses++;
    } else if (scoreB > scoreA) {
      teamStats[teamBId].wins++;
      teamStats[teamAId].losses++;
    } else {
      teamStats[teamAId].draws++;
      teamStats[teamBId].draws++;
    }

    for (const e of goals) {
      if (!e.playerId) continue;
      const pid = e.playerId.toString();
      goalCounts.set(pid, (goalCounts.get(pid) ?? 0) + 1);
    }

    for (const e of assists) {
      if (!e.playerId) continue;
      const pid = e.playerId.toString();
      assistCounts.set(pid, (assistCounts.get(pid) ?? 0) + 1);
    }

    for (const e of game.events) {
      if (e.type === "note" && e.note) {
        notes.push({ note: e.note, createdAt: e.createdAt.toISOString() });
      }
    }
  }

  const playerGames = new Map<string, number>();
  const playerWins = new Map<string, number>();

  for (const game of games) {
    const teamAPlayerIds = game.teamA.players.map((p) => p.toString());
    const teamBPlayerIds = game.teamB.players.map((p) => p.toString());
    const allPlayerIds = [...teamAPlayerIds, ...teamBPlayerIds];

    const goalsA = game.events.filter(
      (e) => e.type === "goal" && e.playerId && teamAPlayerIds.includes(e.playerId.toString())
    ).length;
    const goalsB = game.events.filter(
      (e) => e.type === "goal" && e.playerId && teamBPlayerIds.includes(e.playerId.toString())
    ).length;

    for (const pid of allPlayerIds) {
      playerGames.set(pid, (playerGames.get(pid) ?? 0) + 1);
    }

    if (goalsA !== goalsB) {
      const winnerIds = goalsA > goalsB ? teamAPlayerIds : teamBPlayerIds;
      for (const pid of winnerIds) {
        playerWins.set(pid, (playerWins.get(pid) ?? 0) + 1);
      }
    }
  }

  const allPlayerIds = [...new Set([...goalCounts.keys(), ...assistCounts.keys(), ...playerGames.keys()])];
  const users = allPlayerIds.length > 0
    ? await User.find({ _id: { $in: allPlayerIds } }).lean()
    : [];
  const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

  function toStats(counts: Map<string, number>) {
    return [...counts.entries()]
      .map(([userId, count]) => ({
        userId,
        name: userMap.get(userId) ?? "Desconhecido",
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  const ranking = Object.entries(teamStats)
    .map(([teamId, record]) => ({
      teamId,
      wins: record.wins,
      draws: record.draws,
      losses: record.losses,
      points: record.wins * 3 + record.draws,
    }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins);

  const playerStats = [...playerGames.entries()]
    .map(([userId, gamesPlayed]) => {
      const wins = playerWins.get(userId) ?? 0;
      return {
        userId,
        name: userMap.get(userId) ?? "Desconhecido",
        gamesPlayed,
        wins,
        winRate: gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0,
      };
    })
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins || b.gamesPlayed - a.gamesPlayed);

  return NextResponse.json({
    teamStats,
    ranking,
    topScorers: toStats(goalCounts),
    topAssisters: toStats(assistCounts),
    gamesPlayed: games.length,
    notes,
    playerStats,
  });
}
