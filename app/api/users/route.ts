import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { CreateUserSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const filter = q
    ? {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const users = await User.find(filter).sort({ name: 1 }).lean();
  return NextResponse.json(users.map((u) => ({ ...u, id: u._id.toString(), _id: undefined })));
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const result = CreateUserSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  try {
    const user = await User.create(result.data);
    return NextResponse.json(user.toJSON(), { status: 201 });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      return NextResponse.json(
        { error: "Telefone já cadastrado" },
        { status: 409 }
      );
    }
    throw err;
  }
}
