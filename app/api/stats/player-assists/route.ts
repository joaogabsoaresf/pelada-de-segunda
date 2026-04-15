import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game } from "@/lib/models/Game";

export async function GET() {
  await connectDB();

  const games = await Game.find({ status: "finished" }).lean();

  const assistCounts = new Map<string, number>();

  for (const game of games) {
    for (const e of game.events) {
      if (e.type === "assist" && e.playerId) {
        const pid = e.playerId.toString();
        assistCounts.set(pid, (assistCounts.get(pid) ?? 0) + 1);
      }
    }
  }

  const result = [...assistCounts.entries()].map(([playerId, total]) => ({
    playerId,
    total,
  }));

  return NextResponse.json(result);
}
