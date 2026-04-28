export interface PlayerWithPot {
  userId: string;
  pot: number;
}

export interface DrawnTeam {
  id: string;
  name: string;
  players: string[];
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

import { TEAM_COLORS } from "@/lib/team-colors";

export function drawTeams(players: PlayerWithPot[], numTeams: number): DrawnTeam[] {
  if (players.some((p) => !p.pot || p.pot < 1)) {
    throw new Error("Todos os jogadores precisam ter um pote definido");
  }

  if (numTeams < 2) {
    throw new Error("Número mínimo de times é 2");
  }

  const teams: DrawnTeam[] = Array.from({ length: numTeams }, (_, i) => ({
    id: `team-${i + 1}`,
    name: TEAM_COLORS[i % TEAM_COLORS.length].label,
    players: [],
  }));

  const byPot = new Map<number, PlayerWithPot[]>();
  for (const player of players) {
    const pot = player.pot;
    if (!byPot.has(pot)) byPot.set(pot, []);
    byPot.get(pot)!.push(player);
  }

  const sortedPots = [...byPot.keys()].sort((a, b) => a - b);

  for (const pot of sortedPots) {
    const potPlayers = shuffle(byPot.get(pot)!);
    potPlayers.forEach((player, index) => {
      teams[index % numTeams].players.push(player.userId);
    });
  }

  return teams;
}
