import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game } from "@/lib/models/Game";
import { AddEventSchema } from "@/lib/validators";
import { Types } from "mongoose";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const result = AddEventSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { type, playerId, relatedPlayerId, note } = result.data;

  const game = await Game.findById(id);
  if (!game) {
    return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
  }



  if (type === "goal" && !playerId) {
    return NextResponse.json(
      { error: "Gol precisa de um jogador" },
      { status: 400 }
    );
  }

  if (type === "note" && !note) {
    return NextResponse.json(
      { error: "Lance precisa de uma descrição" },
      { status: 400 }
    );
  }

  game.events.push({
    type,
    playerId: playerId ? new Types.ObjectId(playerId) : undefined,
    relatedPlayerId: relatedPlayerId ? new Types.ObjectId(relatedPlayerId) : undefined,
    note,
    createdAt: new Date(),
  });

  await game.save();
  return NextResponse.json(game.toJSON(), { status: 201 });
}
