import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MatchDay } from "@/lib/models/MatchDay";
import { SetPotSchema } from "@/lib/validators";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const result = SetPotSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { userId, pot } = result.data;

  const matchDay = await MatchDay.findById(id);
  if (!matchDay) {
    return NextResponse.json({ error: "Pelada não encontrada" }, { status: 404 });
  }

  const playerEntry = matchDay.players.find(
    (p) => p.userId.toString() === userId
  );
  if (!playerEntry) {
    return NextResponse.json(
      { error: "Jogador não está na pelada" },
      { status: 404 }
    );
  }

  playerEntry.pot = pot;
  await matchDay.save();

  return NextResponse.json(matchDay.toJSON());
}
