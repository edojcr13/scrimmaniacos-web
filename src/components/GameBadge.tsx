import { JUEGOS } from "@/lib/labels";
import type { Juego } from "@/lib/types";

export default function GameBadge({ game }: { game: Juego }) {
  const j = JUEGOS[game];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${j.color}`}>{j.corto}</span>;
}
