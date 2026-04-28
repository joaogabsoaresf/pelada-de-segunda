export interface TeamColor {
  id: string;
  label: string;
  gradient: string;
  light: string;
  border: string;
  text: string;
  ring: string;
  accent: string;
  divide: string;
  badge: string;
}

export const TEAM_COLORS: TeamColor[] = [
  { id: "azul", label: "Azul", gradient: "from-blue-600 to-blue-500", light: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", ring: "ring-blue-500", accent: "bg-blue-600", divide: "divide-blue-100", badge: "border-blue-300 text-blue-700" },
  { id: "laranja", label: "Laranja", gradient: "from-orange-500 to-orange-400", light: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", ring: "ring-orange-500", accent: "bg-orange-500", divide: "divide-orange-100", badge: "border-orange-300 text-orange-700" },
  { id: "verde", label: "Verde", gradient: "from-green-600 to-green-500", light: "bg-green-50", border: "border-green-200", text: "text-green-700", ring: "ring-green-500", accent: "bg-green-600", divide: "divide-green-100", badge: "border-green-300 text-green-700" },
  { id: "vermelho", label: "Vermelho", gradient: "from-red-600 to-red-500", light: "bg-red-50", border: "border-red-200", text: "text-red-700", ring: "ring-red-500", accent: "bg-red-600", divide: "divide-red-100", badge: "border-red-300 text-red-700" },
  { id: "amarelo", label: "Amarelo", gradient: "from-yellow-500 to-yellow-400", light: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", ring: "ring-yellow-500", accent: "bg-yellow-500", divide: "divide-yellow-100", badge: "border-yellow-300 text-yellow-700" },
  { id: "branco", label: "Branco", gradient: "from-gray-200 to-gray-100", light: "bg-gray-50", border: "border-gray-300", text: "text-gray-700", ring: "ring-gray-400", accent: "bg-gray-300", divide: "divide-gray-200", badge: "border-gray-400 text-gray-700" },
  { id: "preto", label: "Preto", gradient: "from-gray-800 to-gray-700", light: "bg-gray-100", border: "border-gray-400", text: "text-gray-800", ring: "ring-gray-700", accent: "bg-gray-800", divide: "divide-gray-300", badge: "border-gray-500 text-gray-800" },
  { id: "roxo", label: "Roxo", gradient: "from-violet-600 to-violet-500", light: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", ring: "ring-violet-500", accent: "bg-violet-600", divide: "divide-violet-100", badge: "border-violet-300 text-violet-700" },
  { id: "rosa", label: "Rosa", gradient: "from-pink-500 to-pink-400", light: "bg-pink-50", border: "border-pink-200", text: "text-pink-700", ring: "ring-pink-500", accent: "bg-pink-500", divide: "divide-pink-100", badge: "border-pink-300 text-pink-700" },
  { id: "cinza", label: "Cinza", gradient: "from-slate-500 to-slate-400", light: "bg-slate-50", border: "border-slate-300", text: "text-slate-700", ring: "ring-slate-500", accent: "bg-slate-500", divide: "divide-slate-200", badge: "border-slate-400 text-slate-700" },
];

export function getTeamColor(teamName: string): TeamColor {
  const normalized = teamName.toLowerCase().trim();
  return TEAM_COLORS.find((c) => c.id === normalized || c.label.toLowerCase() === normalized) ?? TEAM_COLORS[0];
}

export function getTeamColorByIndex(index: number): TeamColor {
  return TEAM_COLORS[index % TEAM_COLORS.length];
}
