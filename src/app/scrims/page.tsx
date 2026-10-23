import type { Metadata } from "next";
import Link from "next/link";
import { createClient, getViewer } from "@/lib/supabase/server";
import { aceptarScrim, cancelarScrim, publicarScrim, reportarScrim } from "@/app/acciones";
import DateTimeInput from "@/components/DateTimeInput";
import GameBadge from "@/components/GameBadge";
import LocalTime from "@/components/LocalTime";
import SubmitButton from "@/components/SubmitButton";
import Vacio from "@/components/Vacio";
import type { Juego, Scrim, Team } from "@/lib/types";

export const metadata: Metadata = { title: "Scrims" };

type Lado = { id: string; name: string; tag: string } | null;
type Persona = { id: string; display_name: string } | null;
type ScrimFull = Scrim & { host_team: Lado; rival_team: Lado; host: Persona; rival: Persona };

const SELECT =
  "*, host_team:teams!scrims_host_team_id_fkey(id, name, tag), rival_team:teams!scrims_rival_team_id_fkey(id, name, tag), host:profiles!scrims_host_user_id_fkey(id, display_name), rival:profiles!scrims_rival_user_id_fkey(id, display_name)";

function nombreHost(s: ScrimFull) {
  return s.host_team ? `[${s.host_team.tag}] ${s.host_team.name}` : s.host?.display_name ?? "—";
}
function nombreRival(s: ScrimFull) {
  return s.rival_team ? `[${s.rival_team.tag}] ${s.rival_team.name}` : s.rival?.display_name ?? "—";
}

export default async function ScrimsPage() {
  const supabase = await createClient();
  const viewer = await getViewer();
  const yo = viewer?.user.id;
  const ahora = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const [{ data: abiertas }, { data: resultados }, { data: mias }, { data: equipos }] = await Promise.all([
    supabase.from("scrims").select(SELECT).eq("status", "abierta").gte("scheduled_at", ahora).order("scheduled_at"),
    supabase.from("scrims").select(SELECT).eq("status", "finalizada").order("scheduled_at", { ascending: false }).limit(10),
    yo
      ? supabase.from("scrims").select(SELECT).eq("status", "aceptada").or(`host_user_id.eq.${yo},rival_user_id.eq.${yo}`).order("scheduled_at")
      : Promise.resolve({ data: [] }),
    yo ? supabase.from("teams").select("id, name, tag, game").eq("captain_id", yo) : Promise.resolve({ data: [] }),
  ]);
  const misEquipos = (equipos ?? []) as Pick<Team, "id" | "name" | "tag" | "game">[];
  const equiposDe = (g: Juego) => misEquipos.filter((e) => e.game === g);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-8">
        <h1 className="titulo">Scrims</h1>

        {(mias as ScrimFull[] | null)?.length ? (
          <section>
            <h2 className="mb-3 font-semibold">Tus scrims confirmadas</h2>
            <ul className="space-y-3">
              {(mias as ScrimFull[]).map((s) => (
                <li key={s.id} className="card border-acento/40 p-4 text-sm">
                  <p className="flex flex-wrap items-center gap-2">
                    <GameBadge game={s.game} />
                    <strong>{nombreHost(s)}</strong> vs <strong>{nombreRival(s)}</strong>
                    <span className="text-suave">· Bo{s.best_of} · <LocalTime iso={s.scheduled_at} /></span>
                  </p>
                  <p className="mt-1 text-xs text-suave">Coordinen la sala por Discord o WhatsApp. Al terminar, cualquiera de los dos publica el marcador.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={reportarScrim} className="flex items-center gap-2">
                      <input type="hidden" name="scrim_id" value={s.id} />
                      <input name="score_host" type="number" min={0} max={20} required className="input w-16" aria-label={`Victorias de ${nombreHost(s)}`} />
                      <span>–</span>
                      <input name="score_rival" type="number" min={0} max={20} required className="input w-16" aria-label={`Victorias de ${nombreRival(s)}`} />
                      <SubmitButton className="btn-primario px-3 py-1.5 text-xs">Publicar resultado</SubmitButton>
                    </form>
                    <form action={cancelarScrim}>
                      <input type="hidden" name="scrim_id" value={s.id} />
                      <SubmitButton className="btn-peligro px-3 py-1.5 text-xs" confirmar="¿Cancelar esta scrim?">Cancelar</SubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h2 className="mb-3 font-semibold">Buscando rival</h2>
          {(abiertas as ScrimFull[] | null)?.length ? (
            <ul className="space-y-3">
              {(abiertas as ScrimFull[]).map((s) => {
                const propia = s.host_user_id === yo;
                const opciones = equiposDe(s.game).filter((e) => e.id !== s.host_team_id);
                return (
                  <li key={s.id} className="card flex flex-wrap items-center gap-3 p-4 text-sm">
                    <GameBadge game={s.game} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{nombreHost(s)}</p>
                      <p className="text-xs text-suave">Bo{s.best_of} · <LocalTime iso={s.scheduled_at} />{s.notes && ` · ${s.notes}`}</p>
                    </div>
                    {!yo ? (
                      <Link href="/login?next=/scrims" className="btn-secundario px-3 py-1.5 text-xs">Entrar para aceptar</Link>
                    ) : propia ? (
                      <form action={cancelarScrim}>
                        <input type="hidden" name="scrim_id" value={s.id} />
                        <SubmitButton className="btn-peligro px-3 py-1.5 text-xs">Retirar</SubmitButton>
                      </form>
                    ) : s.host_team_id ? (
                      opciones.length ? (
                        <form action={aceptarScrim} className="flex gap-2">
                          <input type="hidden" name="scrim_id" value={s.id} />
                          <select name="team_id" className="input w-40 py-1.5 text-xs">
                            {opciones.map((e) => <option key={e.id} value={e.id}>[{e.tag}] {e.name}</option>)}
                          </select>
                          <SubmitButton className="btn-primario px-3 py-1.5 text-xs">Aceptar</SubmitButton>
                        </form>
                      ) : (
                        <span className="text-xs text-suave">Solo capitanes pueden aceptar</span>
                      )
                    ) : (
                      <form action={aceptarScrim}>
                        <input type="hidden" name="scrim_id" value={s.id} />
                        <SubmitButton className="btn-primario px-3 py-1.5 text-xs">Aceptar</SubmitButton>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vacio>No hay scrims abiertas. Publica una y aparecerá aquí.</Vacio>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Resultados recientes</h2>
          {(resultados as ScrimFull[] | null)?.length ? (
            <ul className="card divide-y divide-borde text-sm">
              {(resultados as ScrimFull[]).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <GameBadge game={s.game} />
                  <span className={(s.score_host ?? 0) > (s.score_rival ?? 0) ? "font-semibold text-acento" : ""}>{nombreHost(s)}</span>
                  <span className="font-mono">{s.score_host} – {s.score_rival}</span>
                  <span className={(s.score_rival ?? 0) > (s.score_host ?? 0) ? "font-semibold text-acento" : ""}>{nombreRival(s)}</span>
                  <span className="ml-auto text-xs text-suave"><LocalTime iso={s.scheduled_at} conHora={false} /></span>
                </li>
              ))}
            </ul>
          ) : (
            <Vacio>Todavía no hay resultados publicados.</Vacio>
          )}
        </section>
      </div>

      <aside>
        <div className="card sticky top-20 p-5">
          <h2 className="mb-4 font-semibold">Publicar scrim</h2>
          {viewer ? (
            <form action={publicarScrim} className="space-y-4">
              <div>
                <label className="label" htmlFor="game">Juego</label>
                <select id="game" name="game" className="input" defaultValue="unite">
                  <option value="unite">Pokémon UNITE</option>
                  <option value="champions">Pokémon Champions</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="team_id">Equipo (obligatorio en UNITE)</label>
                <select id="team_id" name="team_id" className="input">
                  {misEquipos.filter((e) => e.game === "unite").map((e) => <option key={e.id} value={e.id}>[{e.tag}] {e.name}</option>)}
                  <option value="">Sin equipo (Champions 1 vs 1)</option>
                </select>
              </div>
              <div>
                <label className="label">Fecha y hora (tu hora local)</label>
                <DateTimeInput name="scheduled_at" required />
              </div>
              <div>
                <label className="label" htmlFor="best_of">Partidas</label>
                <select id="best_of" name="best_of" className="input" defaultValue="3">
                  {[1, 3, 5, 7].map((n) => <option key={n} value={n}>Bo{n}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="notes">Notas</label>
                <input id="notes" name="notes" className="input" maxLength={300} placeholder="Nivel, reglas, contacto de Discord…" />
              </div>
              <SubmitButton>Publicar</SubmitButton>
            </form>
          ) : (
            <Link href="/login?next=/scrims" className="btn-primario w-full">Entra para publicar</Link>
          )}
        </div>
      </aside>
    </div>
  );
}
