import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game } from "@/lib/models/Game";
import { Types } from "mongoose";

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

  if (index >= game.events.length) {
    return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  }

  game.events.splice(index, 1);
  await game.save();

  return NextResponse.json(game.toJSON());
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eventIndex: string }> }
) {
  await connectDB();
  const { id, eventIndex } = await params;
  const body = await req.json();

  const index = parseInt(eventIndex, 10);
  if (isNaN(index) || index < 0) {
    return NextResponse.json({ error: "Índice de evento inválido" }, { status: 400 });
  }

  const game = await Game.findById(id);
  if (!game) {
    return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
  }

  if (index >= game.events.length) {
    return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  }

  const event = game.events[index];

  if (body.playerId !== undefined) {
    event.playerId = body.playerId ? new Types.ObjectId(body.playerId) : undefined;
  }
  if (body.relatedPlayerId !== undefined) {
    event.relatedPlayerId = body.relatedPlayerId ? new Types.ObjectId(body.relatedPlayerId) : undefined;
  }

  game.markModified("events");
  await game.save();

  return NextResponse.json(game.toJSON());
}
