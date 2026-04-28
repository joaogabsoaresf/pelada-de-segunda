import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Game } from "@/lib/models/Game";
import { User } from "@/lib/models/User";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;

  const games = await Game.find({ matchDayId: id, status: "finished" })
    .sort({ createdAt: 1 })
    .lean();

  const playerIds = new Set<string>();
  for (const game of games) {
    for (const p of game.teamA.players) playerIds.add(p.toString());
    for (const p of game.teamB.players) playerIds.add(p.toString());
    for (const e of game.events) {
      if (e.playerId) playerIds.add(e.playerId.toString());
      if (e.relatedPlayerId) playerIds.add(e.relatedPlayerId.toString());
    }
  }

  const users = playerIds.size > 0
    ? await User.find({ _id: { $in: [...playerIds] } }).lean()
    : [];
  const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

  const result = games.map((game) => {
    const teamAPlayerIds = game.teamA.players.map((p) => p.toString());
    const teamBPlayerIds = game.teamB.players.map((p) => p.toString());

    const goals = game.events.filter((e) => e.type === "goal");
    const scoreA = goals.filter((e) => e.playerId && teamAPlayerIds.includes(e.playerId.toString())).length;
    const scoreB = goals.filter((e) => e.playerId && teamBPlayerIds.includes(e.playerId.toString())).length;

    return {
      id: game._id.toString(),
      teamA: { id: game.teamA.id, players: teamAPlayerIds },
      teamB: { id: game.teamB.id, players: teamBPlayerIds },
      scoreA,
      scoreB,
      events: game.events.map((e) => ({
        type: e.type,
        playerId: e.playerId?.toString(),
        playerName: e.playerId ? userMap.get(e.playerId.toString()) : undefined,
        relatedPlayerId: e.relatedPlayerId?.toString(),
        relatedPlayerName: e.relatedPlayerId ? userMap.get(e.relatedPlayerId.toString()) : undefined,
        note: e.note,
        createdAt: e.createdAt.toISOString(),
      })),
      createdAt: game.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ games: result, playerMap: Object.fromEntries(userMap) });
}
