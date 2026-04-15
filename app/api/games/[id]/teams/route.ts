import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game } from "@/lib/models/Game";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;

  const game = await Game.findById(id);
  if (!game) {
    return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
  }

  if (game.status === "finished") {
    return NextResponse.json(
      { error: "Não é possível editar os times de um jogo finalizado" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { teamAPlayers, teamBPlayers, waitingList } = body;

  if (!Array.isArray(teamAPlayers) || !Array.isArray(teamBPlayers)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  game.teamA.players = teamAPlayers;
  game.teamB.players = teamBPlayers;
  game.waitingList = Array.isArray(waitingList) ? waitingList : [];

  await game.save();

  return NextResponse.json(game.toJSON());
}
