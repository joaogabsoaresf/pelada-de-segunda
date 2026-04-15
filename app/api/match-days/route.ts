import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MatchDay } from "@/lib/models/MatchDay";
import { User } from "@/lib/models/User";
import { CreateMatchDaySchema } from "@/lib/validators";

export async function GET() {
  await connectDB();
  const matchDays = await MatchDay.find()
    .sort({ date: -1 })
    .lean();

  return NextResponse.json(
    matchDays.map((m) => ({ ...m, id: m._id.toString(), _id: undefined }))
  );
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const result = CreateMatchDaySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const mensalistas = await User.find({ type: "monthly" }).select("_id defaultPot").lean();
  const players = mensalistas.map((u) => ({ userId: u._id, pot: (u as any).defaultPot ?? 0 }));
  const matchDay = await MatchDay.create({ date: new Date(result.data.date), players });
  return NextResponse.json(matchDay.toJSON(), { status: 201 });
}
