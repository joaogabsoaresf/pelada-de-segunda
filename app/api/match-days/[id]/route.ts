import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MatchDay } from "@/lib/models/MatchDay";
import { User } from "@/lib/models/User";
import { Game } from "@/lib/models/Game";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;

  const matchDay = await MatchDay.findById(id).lean();
  if (!matchDay) {
    return NextResponse.json({ error: "Pelada não encontrada" }, { status: 404 });
  }

  const playerListIds = matchDay.players.map((p) => p.userId.toString());
  const teamPlayerIds = matchDay.teams.flatMap((t) => t.players.map((pid) => pid.toString()));
  const allUserIds = [...new Set([...playerListIds, ...teamPlayerIds])];
  const users = await User.find({ _id: { $in: allUserIds } }).lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const playersWithDetails = matchDay.players.map((p) => {
    const user = userMap.get(p.userId.toString());
    return {
      userId: p.userId.toString(),
      pot: p.pot,
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      type: user?.type ?? "",
    };
  });

  const teamsWithDetails = matchDay.teams.map((team) => ({
    ...team,
    players: team.players.map((pid) => {
      const user = userMap.get(pid.toString());
      return {
        userId: pid.toString(),
        name: user?.name ?? "",
        phone: user?.phone ?? "",
      };
    }),
  }));

  return NextResponse.json({
    ...matchDay,
    id: matchDay._id.toString(),
    _id: undefined,
    players: playersWithDetails,
    teams: teamsWithDetails,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const matchDay = await MatchDay.findById(id);
  if (!matchDay) {
    return NextResponse.json({ error: "Pelada não encontrada" }, { status: 404 });
  }

  if (body.status === "finished") {
    matchDay.status = "finished";
  } else if (body.status === "active") {
    matchDay.status = "active";
  }

  if (body.date) {
    matchDay.date = new Date(body.date);
  }

  await matchDay.save();
  return NextResponse.json(matchDay.toJSON());
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;

  const matchDay = await MatchDay.findById(id);
  if (!matchDay) {
    return NextResponse.json({ error: "Pelada não encontrada" }, { status: 404 });
  }

  await Game.deleteMany({ matchDayId: id });
  await MatchDay.findByIdAndDelete(id);

  return NextResponse.json({ ok: true });
}
