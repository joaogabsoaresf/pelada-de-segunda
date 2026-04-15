import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game } from "@/lib/models/Game";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; eventIndex: string }> }
) {
  await connectDB();
  const { id, eventIndex } = await params;

  const index = parseInt(eventIndex, 10);
  if (isNaN(index) || index < 0) {
    return NextResponse.json({ error: "Índice de evento inválido" }, { status: 400 });
  }

  const game = await Game.findById(id);
  if (!game) {
    return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
  }

  if (game.status === "finished") {
    return NextResponse.json(
      { error: "Não é possível remover eventos de um jogo finalizado" },
      { status: 400 }
    );
  }

  if (index >= game.events.length) {
    return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  }

  game.events.splice(index, 1);
  await game.save();

  return NextResponse.json(game.toJSON());
}
