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

  if (game.status !== "pending") {
    return NextResponse.json(
      { error: "Jogo já foi iniciado ou finalizado" },
      { status: 400 }
    );
  }

  game.status = "live";
  game.startedAt = new Date();
  await game.save();

  return NextResponse.json(game.toJSON());
}
