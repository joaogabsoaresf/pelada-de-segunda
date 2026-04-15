import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MatchDay } from "@/lib/models/MatchDay";
import { User } from "@/lib/models/User";
import { AddPlayerSchema } from "@/lib/validators";
import { Types } from "mongoose";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const result = AddPlayerSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { userId } = result.data;

  const matchDay = await MatchDay.findById(id);
  if (!matchDay) {
    return NextResponse.json({ error: "Pelada não encontrada" }, { status: 404 });
  }

  const user = await User.findById(userId);
  if (!user) {
    return NextResponse.json({ error: "Jogador não encontrado" }, { status: 404 });
  }

  const alreadyAdded = matchDay.players.some(
    (p) => p.userId.toString() === userId
  );
  if (alreadyAdded) {
    return NextResponse.json(
      { error: "Jogador já está na pelada" },
      { status: 409 }
    );
  }

  matchDay.players.push({ userId: new Types.ObjectId(userId), pot: (user as any).defaultPot ?? 0 });
  await matchDay.save();

  return NextResponse.json(matchDay.toJSON(), { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });
  }

  const matchDay = await MatchDay.findById(id);
  if (!matchDay) {
    return NextResponse.json({ error: "Pelada não encontrada" }, { status: 404 });
  }

  matchDay.players = matchDay.players.filter(
    (p) => p.userId.toString() !== userId
  );
  await matchDay.save();

  return NextResponse.json(matchDay.toJSON());
}
