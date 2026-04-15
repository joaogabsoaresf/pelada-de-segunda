import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game } from "@/lib/models/Game";
import { MatchDay } from "@/lib/models/MatchDay";
import { CreateGameSchema } from "@/lib/validators";
import { Types } from "mongoose";

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const result = CreateGameSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { matchDayId, teamAId, teamBId } = result.data;

  const matchDay = await MatchDay.findById(matchDayId);
  if (!matchDay) {
    return NextResponse.json({ error: "Pelada não encontrada" }, { status: 404 });
  }

  if (matchDay.teams.length < 2) {
    return NextResponse.json(
      { error: "É necessário pelo menos 2 times para criar um jogo" },
      { status: 400 }
    );
  }

  const teamA = matchDay.teams.find((t) => t.id === teamAId);
  const teamB = matchDay.teams.find((t) => t.id === teamBId);

  if (!teamA || !teamB) {
    return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });
  }

  if (teamAId === teamBId) {
    return NextResponse.json(
      { error: "Os times devem ser diferentes" },
      { status: 400 }
    );
  }

  const game = await Game.create({
    matchDayId: new Types.ObjectId(matchDayId),
    teamA: { id: teamA.id, players: teamA.players },
    teamB: { id: teamB.id, players: teamB.players },
    status: "pending",
    events: [],
  });

  return NextResponse.json(game.toJSON(), { status: 201 });
}
