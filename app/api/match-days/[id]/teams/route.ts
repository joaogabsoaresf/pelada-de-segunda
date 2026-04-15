import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MatchDay } from "@/lib/models/MatchDay";
import { UpdateTeamsSchema } from "@/lib/validators";
import { Types } from "mongoose";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const result = UpdateTeamsSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const matchDay = await MatchDay.findById(id);
  if (!matchDay) {
    return NextResponse.json({ error: "Pelada não encontrada" }, { status: 404 });
  }

  matchDay.teams = result.data.teams.map((t) => ({
    id: t.id,
    name: t.name,
    players: t.players.map((pid) => new Types.ObjectId(pid)),
  }));

  await matchDay.save();
  return NextResponse.json(matchDay.toJSON());
}
