import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MatchDay } from "@/lib/models/MatchDay";
import { DrawTeamsSchema } from "@/lib/validators";
import { drawTeams } from "@/services/draw";
import { Types } from "mongoose";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const result = DrawTeamsSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { numTeams } = result.data;

  const matchDay = await MatchDay.findById(id);
  if (!matchDay) {
    return NextResponse.json({ error: "Pelada não encontrada" }, { status: 404 });
  }

  const playersWithoutPot = matchDay.players.filter((p) => p.pot === 0);
  if (playersWithoutPot.length > 0) {
    return NextResponse.json(
      { error: "Todos os jogadores precisam ter um pote definido antes do sorteio" },
      { status: 400 }
    );
  }

  const drawablePlayers = matchDay.players.filter((p) => p.pot !== -1);

  if (drawablePlayers.length < numTeams) {
    return NextResponse.json(
      { error: "Jogadores insuficientes para o número de times (desconsiderando goleiros)" },
      { status: 400 }
    );
  }

  try {
    const drawnTeams = drawTeams(
      drawablePlayers.map((p) => ({ userId: p.userId.toString(), pot: p.pot })),
      numTeams
    );

    matchDay.teams = drawnTeams.map((t) => ({
      id: t.id,
      name: t.name,
      players: t.players.map((pid) => new Types.ObjectId(pid)),
    }));

    await matchDay.save();
    return NextResponse.json(matchDay.toJSON());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao sortear times";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
