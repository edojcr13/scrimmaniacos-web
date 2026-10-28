import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import GameBadge from "@/components/GameBadge";
import { JUEGOS, ROLES_UNITE } from "@/lib/labels";
import type { Juego, Profile, Team } from "@/lib/types";

type Fila = { game: Juego; wins: number; losses: number; titles: number; points: number };

export default async function JugadorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: perfil } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!perfil) notFound();
  const p = perfil as Profile;

  const [{ data: membresias }, { data: ranking }] = await Promise.all([
    supabase.from("team_members").select("role, team:teams(id, name, tag, game)").eq("user_id", id),
    supabase.from("ranking").select("game, wins, losses, titles, points").eq("player_id", id),
  ]);
  const equipos = (membresias ?? []) as unknown as { role: string; team: Pick<Team, "id" | "name" | "tag" | "game"> }[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="card flex flex-wrap items-center gap-5 p-6">
        <Avatar src={p.avatar_url} nombre={p.display_name} size={80} />
        <div className="space-y-1">
          <h1 className="titulo">{p.display_name}</h1>
          {p.username && <p className="text-sm text-suave">@{p.username}</p>}
          <p className="flex flex-wrap items-center gap-2 text-sm text-suave">
            {p.main_game ? <GameBadge game={p.main_game} /> : <><GameBadge game="unite" /><GameBadge game="champions" /></>}
            {p.unite_role && <span>Rol: {ROLES_UNITE[p.unite_role]}</span>}
            {p.country && <span>· {p.country}</span>}
          </p>
          {p.trainer_id && <p className="text-sm">ID de entrenador: <span className="font-mono text-acento">{p.trainer_id}</span></p>}
        </div>
      </div>

      {p.bio && <p className="card p-6 text-sm whitespace-pre-line">{p.bio}</p>}

      <section className="card p-6">
        <h2 className="mb-3 font-semibold">Equipos</h2>
        {equipos.length ? (
          <ul className="space-y-2">
            {equipos.map((m) => (
              <li key={m.team.id} className="flex items-center gap-2 text-sm">
                <GameBadge game={m.team.game} />
                <Link href={`/equipos/${m.team.id}`} className="font-semibold hover:text-acento">[{m.team.tag}] {m.team.name}</Link>
                <span className="text-suave capitalize">· {m.role}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-suave">Agente libre: todavía no pertenece a ningún equipo.</p>
        )}
      </section>

      <section className="card p-6">
        <h2 className="mb-3 font-semibold">Estadísticas individuales en torneos</h2>
        {ranking?.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {(ranking as Fila[]).map((r) => (
              <li key={r.game} className="rounded-lg bg-fondo p-4 text-sm">
                <p className="font-semibold">{JUEGOS[r.game].nombre}</p>
                <p className="text-suave">{r.wins}V · {r.losses}D · {r.titles} títulos · <span className="text-acento">{r.points} pts</span></p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-suave">Aún no tiene partidas oficiales en torneos individuales.</p>
        )}
      </section>
    </div>
  );
}
