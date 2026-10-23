import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import GameBadge from "@/components/GameBadge";
import LocalTime from "@/components/LocalTime";
import { ESTADO_TORNEO } from "@/lib/labels";
import type { Scrim, Tournament } from "@/lib/types";

export default async function Inicio() {
  const supabase = await createClient();
  const [{ data: torneos }, { data: scrims }, { count: jugadores }, { count: equipos }] = await Promise.all([
    supabase.from("tournaments").select("*").in("status", ["inscripciones", "en_curso"]).order("starts_at", { ascending: true, nullsFirst: false }).limit(4),
    supabase.from("scrims").select("*, host_team:teams!scrims_host_team_id_fkey(name, tag)").eq("status", "abierta").gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(5),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("teams").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-2xl border border-borde bg-gradient-to-br from-violeta/30 via-panel to-fondo p-8 sm:p-12">
        <p className="text-sm font-semibold tracking-widest text-acento uppercase">Pokémon UNITE · Pokémon Champions</p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl leading-tight font-bold sm:text-5xl">
          La casa de la escena competitiva de Pokémon en Latinoamérica
        </h1>
        <p className="mt-4 max-w-xl text-suave">
          Arma tu equipo, consigue scrims todos los días, inscríbete en torneos y sube en el ranking.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/torneos" className="btn-primario">Ver torneos</Link>
          <Link href="/scrims" className="btn-secundario">Buscar scrim</Link>
          <Link href="/equipos/nuevo" className="btn-secundario">Crear equipo</Link>
        </div>
        <dl className="mt-8 flex gap-8 text-sm">
          <div><dt className="text-suave">Jugadores</dt><dd className="font-display text-2xl font-bold">{jugadores ?? 0}</dd></div>
          <div><dt className="text-suave">Equipos</dt><dd className="font-display text-2xl font-bold">{equipos ?? 0}</dd></div>
        </dl>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="titulo">Torneos activos</h2>
          <Link href="/torneos" className="text-sm text-acento hover:underline">Ver todos</Link>
        </div>
        {torneos?.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {(torneos as Tournament[]).map((t) => (
              <Link key={t.id} href={`/torneos/${t.id}`} className="card block p-5 transition hover:border-violeta">
                <div className="flex items-center gap-2"><GameBadge game={t.game} /><span className="text-xs text-suave">{ESTADO_TORNEO[t.status]}</span></div>
                <h3 className="mt-2 text-lg font-semibold">{t.name}</h3>
                <p className="mt-1 text-sm text-suave">
                  {t.mode === "equipos" ? "Por equipos" : "Individual"} · Bo{t.best_of}
                  {t.starts_at && <> · <LocalTime iso={t.starts_at} /></>}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="card p-6 text-sm text-suave">Pronto anunciaremos el próximo torneo.</p>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="titulo">Scrims buscando rival</h2>
          <Link href="/scrims" className="text-sm text-acento hover:underline">Publicar una</Link>
        </div>
        {scrims?.length ? (
          <ul className="card divide-y divide-borde">
            {(scrims as (Scrim & { host_team: { name: string; tag: string } | null })[]).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <GameBadge game={s.game} />
                <span className="font-semibold">{s.host_team ? `[${s.host_team.tag}] ${s.host_team.name}` : "Jugador individual"}</span>
                <span className="text-suave">Bo{s.best_of}</span>
                <span className="ml-auto text-suave"><LocalTime iso={s.scheduled_at} /></span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-6 text-sm text-suave">No hay scrims abiertas ahora. ¡Publica la primera!</p>
        )}
      </section>
    </div>
  );
}
