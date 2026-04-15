import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game } from "@/lib/models/Game";

export async function GET() {
  await connectDB();

  const games = await Game.find({ status: "finished" }).lean();

  const goalCounts = new Map<string, number>();

  for (const game of games) {
    for (const e of game.events) {
      if (e.type === "goal" && e.playerId) {
        const pid = e.playerId.toString();
        goalCounts.set(pid, (goalCounts.get(pid) ?? 0) + 1);
      }
    }
  }

  const result = [...goalCounts.entries()].map(([playerId, total]) => ({
    playerId,
    total,
  }));

  return NextResponse.json(result);
}
