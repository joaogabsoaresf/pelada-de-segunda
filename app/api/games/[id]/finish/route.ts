import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game } from "@/lib/models/Game";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;

  const game = await Game.findById(id);
  if (!game) {
    return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
  }

  if (game.status === "finished") {
    return NextResponse.json({ error: "Jogo já foi finalizado" }, { status: 400 });
  }

  // If game was paused, accumulate the current pause duration before finishing
  if (game.pausedAt) {
    const pausedSeconds = Math.floor((Date.now() - game.pausedAt.getTime()) / 1000);
    game.pausedDuration = (game.pausedDuration ?? 0) + pausedSeconds;
    game.pausedAt = undefined;
  }

  game.status = "finished";
  game.endedAt = new Date();
  await game.save();

  return NextResponse.json(game.toJSON());
}
