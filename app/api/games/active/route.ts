import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game } from "@/lib/models/Game";
import { MatchDay } from "@/lib/models/MatchDay";
import { User } from "@/lib/models/User";

export async function GET() {
  await connectDB();

  const game = await Game.findOne({ status: { $in: ["live", "pending"] } })
    .sort({ createdAt: -1 })
    .lean();

  if (!game) return NextResponse.json(null);

  const matchDay = await MatchDay.findById(game.matchDayId).lean();
  const teamAId = game.teamA.id;
  const teamBId = game.teamB.id;
  const teamAName = matchDay?.teams?.find((t: any) => t.id === teamAId)?.name ?? "Time A";
  const teamBName = matchDay?.teams?.find((t: any) => t.id === teamBId)?.name ?? "Time B";

  const teamAPlayerIds = game.teamA.players.map((p: any) => p.toString());
  const teamBPlayerIds = game.teamB.players.map((p: any) => p.toString());

  const goals = game.events.filter((e: any) => e.type === "goal" && e.playerId);
  const scoreA = goals.filter((e: any) => teamAPlayerIds.includes(e.playerId.toString())).length;
  const scoreB = goals.filter((e: any) => teamBPlayerIds.includes(e.playerId.toString())).length;

  return NextResponse.json({
    id: game._id.toString(),
    matchDayId: game.matchDayId.toString(),
    status: game.status,
    teamAName,
    teamBName,
    scoreA,
    scoreB,
    startedAt: game.startedAt?.toISOString() ?? null,
    pausedAt: game.pausedAt?.toISOString() ?? null,
    pausedDuration: game.pausedDuration ?? 0,
  });
}
