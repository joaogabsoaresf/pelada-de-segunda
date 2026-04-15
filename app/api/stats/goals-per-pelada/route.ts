import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game } from "@/lib/models/Game";
import { MatchDay } from "@/lib/models/MatchDay";

export async function GET() {
  await connectDB();

  const matchDays = await MatchDay.find({ status: "finished" })
    .sort({ date: 1 })
    .lean();

  if (matchDays.length === 0) {
    return NextResponse.json([]);
  }

  const matchDayIds = matchDays.map((m) => m._id);
  const games = await Game.find({
    matchDayId: { $in: matchDayIds },
    status: "finished",
  }).lean();

  const goalsByMatchDay = new Map<string, number>();
  for (const game of games) {
    const mid = game.matchDayId.toString();
    const goals = game.events.filter((e) => e.type === "goal").length;
    goalsByMatchDay.set(mid, (goalsByMatchDay.get(mid) ?? 0) + goals);
  }

  const result = matchDays.map((m) => ({
    peladaId: m._id.toString(),
    date: m.date.toISOString(),
    totalGoals: goalsByMatchDay.get(m._id.toString()) ?? 0,
  }));

  return NextResponse.json(result);
}
