import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game } from "@/lib/models/Game";
import { MatchDay } from "@/lib/models/MatchDay";
import { User } from "@/lib/models/User";

export async function GET(req: NextRequest) {
  await connectDB();

  const month = req.nextUrl.searchParams.get("month");

  let matchDayIds: any[] | undefined;

  if (month) {
    const [year, monthNum] = month.split("-").map(Number);
    const start = new Date(year, monthNum - 1, 1);
    const end = new Date(year, monthNum, 0, 23, 59, 59, 999);
    const matchDays = await MatchDay.find({ date: { $gte: start, $lte: end } }, "_id").lean();
    matchDayIds = matchDays.map((m) => m._id);
  }

  const gameFilter: any = { status: "finished" };
  if (matchDayIds !== undefined) {
    gameFilter.matchDayId = { $in: matchDayIds };
  }

  const games = await Game.find(gameFilter).lean();

  const goalCounts = new Map<string, number>();
  const assistCounts = new Map<string, number>();
  let totalGoals = 0;

  for (const game of games) {
    for (const e of game.events) {
      if (e.type === "goal" && e.playerId) {
        const pid = e.playerId.toString();
        goalCounts.set(pid, (goalCounts.get(pid) ?? 0) + 1);
        totalGoals++;
      }
      if (e.type === "assist" && e.playerId) {
        const pid = e.playerId.toString();
        assistCounts.set(pid, (assistCounts.get(pid) ?? 0) + 1);
      }
    }
  }

  const uniqueIds = [...new Set([...goalCounts.keys(), ...assistCounts.keys()])];
  const users = uniqueIds.length > 0
    ? await User.find({ _id: { $in: uniqueIds } }).lean()
    : [];
  const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

  function toStats(counts: Map<string, number>, limit = 10) {
    return [...counts.entries()]
      .map(([userId, count]) => ({
        userId,
        name: userMap.get(userId) ?? "Desconhecido",
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  return NextResponse.json({
    topScorers: toStats(goalCounts),
    topAssisters: toStats(assistCounts),
    gamesPlayed: games.length,
    totalGoals,
    month: month ?? null,
  });
}
