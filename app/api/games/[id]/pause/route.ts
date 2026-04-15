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

  if (game.status !== "live") {
    return NextResponse.json({ error: "Jogo não está ao vivo" }, { status: 400 });
  }

  if (game.pausedAt) {
    return NextResponse.json({ error: "Jogo já está pausado" }, { status: 400 });
  }

  game.pausedAt = new Date();
  await game.save();

  return NextResponse.json(game.toJSON());
}
