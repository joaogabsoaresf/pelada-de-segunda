import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MatchDay } from "@/lib/models/MatchDay";
import { User } from "@/lib/models/User";
import { Game } from "@/lib/models/Game";

export async function GET() {
  await connectDB();

  const matchDays = await MatchDay.find().sort({ date: -1 }).lean();

  if (matchDays.length === 0) {
    return NextResponse.json([]);
  }

  // Collect all unique userIds across all matchdays
  const allUserIds = new Set<string>();
  for (const m of matchDays) {
    for (const p of m.players) {
      allUserIds.add(p.userId.toString());
    }
  }

  const users = await User.find({ _id: { $in: [...allUserIds] } })
    .select("_id type")
    .lean();
  const userTypeMap = new Map(users.map((u) => [u._id.toString(), u.type]));

  // Get goals and assists per matchDay from finished games
  const matchDayIds = matchDays.map((m) => m._id);
  const games = await Game.find({
    matchDayId: { $in: matchDayIds },
    status: "finished",
  }).lean();

  const goalsByMatchDay = new Map<string, number>();
  const assistsByMatchDay = new Map<string, number>();

  for (const game of games) {
    const mid = game.matchDayId.toString();
    for (const e of game.events) {
      if (e.type === "goal") {
        goalsByMatchDay.set(mid, (goalsByMatchDay.get(mid) ?? 0) + 1);
      }
      if (e.type === "assist") {
        assistsByMatchDay.set(mid, (assistsByMatchDay.get(mid) ?? 0) + 1);
      }
    }
  }

  const result = matchDays.map((m) => {
    const mid = m._id.toString();
    let mensalistas = 0;
    let diaristas = 0;
    for (const p of m.players) {
      const type = userTypeMap.get(p.userId.toString());
      if (type === "monthly") mensalistas++;
      else if (type === "daily") diaristas++;
    }

    return {
      id: mid,
      date: m.date.toISOString(),
      status: m.status,
      mensalistas,
      diaristas,
      goals: goalsByMatchDay.get(mid) ?? 0,
      assists: assistsByMatchDay.get(mid) ?? 0,
    };
  });

  return NextResponse.json(result);
}
