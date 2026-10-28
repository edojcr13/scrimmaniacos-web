import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import Logo from "@/components/TeamLogo";
import Vacio from "@/components/Vacio";
import { JUEGOS, esJuego } from "@/lib/labels";
import type { Juego, Profile, Team } from "@/lib/types";

export const metadata: Metadata = { title: "Ranking" };

type Fila = { team_id: string | null; player_id: string | null; wins: number; losses: number; titles: number; points: number };

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ juego?: string }> }) {
  const { juego: q } = await searchParams;
  const juego: Juego = esJuego(q) ? q : "unite";
  const supabase = await createClient();
  const { data } = await supabase.from("ranking").select("*").eq("game", juego).order("points", { ascending: false }).order("wins", { ascending: false }).limit(100);
  const filas = (data ?? []) as Fila[];

  const teamIds = filas.flatMap((f) => (f.team_id ? [f.team_id] : []));
  const playerIds = filas.flatMap((f) => (f.player_id ? [f.player_id] : []));
  const [{ data: equipos }, { data: jugadores }] = await Promise.all([
    teamIds.length ? supabase.from("teams").select("id, name, tag, logo_url").in("id", teamIds) : Promise.resolve({ data: [] }),
    playerIds.length ? supabase.from("profiles").select("id, display_name, avatar_url").in("id", playerIds) : Promise.resolve({ data: [] }),
  ]);
  const eq = new Map(((equipos ?? []) as Pick<Team, "id" | "name" | "tag" | "logo_url">[]).map((e) => [e.id, e]));
  const ju = new Map(((jugadores ?? []) as Pick<Profile, "id" | "display_name" | "avatar_url">[]).map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="titulo mb-2">Ranking</h1>
      <p className="mb-6 text-sm text-suave">3 puntos por cada serie ganada en torneos oficiales y 10 por cada título. Los pases directos no suman.</p>
      <div className="mb-5 flex gap-2">
        {(Object.keys(JUEGOS) as Juego[]).map((g) => (
          <Link key={g} href={`/ranking?juego=${g}`} className={`rounded-full px-3 py-1 text-sm ${juego === g ? "bg-acento text-black" : "bg-white/5 text-suave hover:text-texto"}`}>
            {JUEGOS[g].nombre}
          </Link>
        ))}
      </div>
      {filas.length ? (
        <ol className="card divide-y divide-borde">
          {filas.map((f, i) => {
            const e = f.team_id ? eq.get(f.team_id) : undefined;
            const p = f.player_id ? ju.get(f.player_id) : undefined;
            return (
              <li key={f.team_id ?? f.player_id} className="flex items-center gap-4 px-4 py-3 text-sm">
                <span className={`w-6 text-right font-display text-lg font-bold ${i < 3 ? "text-acento" : "text-suave"}`}>{i + 1}</span>
                {e ? <Logo equipo={e} size={32} /> : <Avatar src={p?.avatar_url ?? null} nombre={p?.display_name ?? "?"} size={32} />}
                <Link href={e ? `/equipos/${e.id}` : `/jugadores/${p?.id}`} className="min-w-0 flex-1 truncate font-semibold hover:text-acento">
                  {e ? `[${e.tag}] ${e.name}` : p?.display_name ?? "Jugador"}
                </Link>
                <span className="hidden text-suave sm:inline">{f.wins}V · {f.losses}D{f.titles > 0 && ` · 🏆${f.titles}`}</span>
                <span className="w-16 text-right font-semibold tabular-nums">{f.points} pts</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <Vacio>El ranking de {JUEGOS[juego].nombre} se llenará con los resultados del primer torneo.</Vacio>
      )}
    </div>
  );
}
