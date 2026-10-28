import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getViewer } from "@/lib/supabase/server";
import {
  cambiarEstadoTorneo,
  eliminarTorneo,
  generarBracket,
  inscribirse,
  programarPartida,
  reportarResultado,
  responderResultado,
  retirarInscripcion,
} from "@/app/acciones";
import Bracket from "@/components/Bracket";
import DateTimeInput from "@/components/DateTimeInput";
import GameBadge from "@/components/GameBadge";
import LocalTime from "@/components/LocalTime";
import SubmitButton from "@/components/SubmitButton";
import Logo from "@/components/TeamLogo";
import Avatar from "@/components/Avatar";
import { inscripcionesDe, nombreInscripcion } from "@/lib/datos";
import { ESTADO_TORNEO, JUEGOS, nombreRonda } from "@/lib/labels";
import type { Match, Registration, Team, Tournament } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("tournaments").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Torneo" };
}

export default async function TorneoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: torneo }, viewer, inscripciones, { data: partidas }] = await Promise.all([
    supabase.from("tournaments").select("*").eq("id", id).maybeSingle(),
    getViewer(),
    inscripcionesDe(supabase, id),
    supabase.from("matches").select("*").eq("tournament_id", id).order("round").order("position"),
  ]);
  if (!torneo) notFound();
  const t = torneo as Tournament;
  const matches = (partidas ?? []) as Match[];
  const porId = new Map(inscripciones.map((r) => [r.id, r]));
  const yo = viewer?.user.id;
  const esAdmin = !!viewer?.profile.is_admin;

  // ¿Qué inscripciones representa el usuario? (su inscripción individual o la de su equipo como capitán)
  const representa = (r: Registration | undefined) => !!r && !!yo && (r.player_id === yo || r.team?.captain_id === yo);
  const misInscripciones = inscripciones.filter(representa);

  let equiposCapitan: Pick<Team, "id" | "name" | "tag">[] = [];
  if (yo && t.mode === "equipos" && t.status === "inscripciones") {
    const { data } = await supabase.from("teams").select("id, name, tag").eq("captain_id", yo).eq("game", t.game);
    equiposCapitan = data ?? [];
  }

  const totalRondas = matches.length ? Math.max(...matches.map((m) => m.round)) : 0;
  const listas = matches.filter((m) => m.a_id && m.b_id && m.status !== "confirmado");
  const misPartidas = listas.filter((m) => representa(porId.get(m.a_id!)) || representa(porId.get(m.b_id!)));
  const paraAdmin = listas.filter((m) => m.status === "disputa" || m.status === "reportado");
  const campeon = t.champion_id ? porId.get(t.champion_id) : undefined;
  const lleno = inscripciones.length >= t.max_participants;
  const victorias = Math.floor(t.best_of / 2) + 1;

  return (
    <div className="space-y-8">
      <header className="card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <GameBadge game={t.game} />
          <span className="text-xs text-suave">{ESTADO_TORNEO[t.status]}</span>
        </div>
        <h1 className="titulo mt-2">{t.name}</h1>
        <p className="mt-2 text-sm text-suave">
          {JUEGOS[t.game].nombre} · {t.mode === "equipos" ? "Por equipos" : "Individual"} · Eliminación simple · Bo{t.best_of} ·{" "}
          {inscripciones.length}/{t.max_participants} inscritos
        </p>
        {t.starts_at && <p className="mt-1 text-sm">Inicio: <LocalTime iso={t.starts_at} /></p>}
        {campeon && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-acento/15 px-4 py-2 font-semibold text-acento">
            🏆 Campeón: {nombreInscripcion(campeon)}
          </p>
        )}
      </header>

      {t.status === "inscripciones" && (
        <section className="card p-6">
          <h2 className="mb-3 font-semibold">Inscripción</h2>
          {!viewer ? (
            <Link href={`/login?next=/torneos/${t.id}`} className="btn-primario">Entra para inscribirte</Link>
          ) : misInscripciones.length ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-emerald-300">✓ Inscrito como {nombreInscripcion(misInscripciones[0])}</span>
              <form action={retirarInscripcion}>
                <input type="hidden" name="tournament_id" value={t.id} />
                <input type="hidden" name="registration_id" value={misInscripciones[0].id} />
                <SubmitButton className="btn-peligro px-3 py-1 text-xs" confirmar="¿Retirar la inscripción?">Retirar inscripción</SubmitButton>
              </form>
            </div>
          ) : lleno ? (
            <p className="text-sm text-suave">Cupos completos.</p>
          ) : t.mode === "individual" ? (
            <form action={inscribirse}>
              <input type="hidden" name="tournament_id" value={t.id} />
              <SubmitButton>Inscribirme</SubmitButton>
            </form>
          ) : equiposCapitan.length ? (
            <form action={inscribirse} className="flex flex-wrap gap-3">
              <input type="hidden" name="tournament_id" value={t.id} />
              <select name="team_id" className="input w-auto">
                {equiposCapitan.map((e) => <option key={e.id} value={e.id}>[{e.tag}] {e.name}</option>)}
              </select>
              <SubmitButton>Inscribir equipo</SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-suave">
              Solo el capitán de un equipo de {JUEGOS[t.game].corto} puede inscribirlo.{" "}
              <Link href="/equipos/nuevo" className="text-acento hover:underline">Crear equipo</Link>
            </p>
          )}
        </section>
      )}

      {misPartidas.length > 0 && (
        <section className="card border-acento/40 p-6">
          <h2 className="mb-4 font-semibold">Tus partidas pendientes</h2>
          <div className="space-y-4">
            {misPartidas.map((m) => (
              <PartidaPropia key={m.id} m={m} t={t} porId={porId} yo={yo!} victorias={victorias} ronda={nombreRonda(m.round, totalRondas)} />
            ))}
          </div>
        </section>
      )}

      {matches.length > 0 ? (
        <section>
          <h2 className="titulo mb-4">Bracket</h2>
          <Bracket matches={matches} inscripciones={inscripciones} />
        </section>
      ) : (
        <section className="card p-6">
          <h2 className="mb-4 font-semibold">Inscritos ({inscripciones.length})</h2>
          {inscripciones.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inscripciones.map((r) => (
                <li key={r.id} className="flex items-center gap-3 text-sm">
                  {r.team ? <Logo equipo={r.team} size={32} /> : <Avatar src={r.player?.avatar_url ?? null} nombre={nombreInscripcion(r)} size={32} />}
                  <Link href={r.team ? `/equipos/${r.team.id}` : `/jugadores/${r.player?.id}`} className="hover:text-acento">
                    {nombreInscripcion(r)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-suave">Aún no hay inscritos.</p>
          )}
          {t.status === "inscripciones" && (
            <p className="mt-4 text-xs text-suave">Cuando cierren las inscripciones se hará el sorteo aleatorio del bracket.</p>
          )}
        </section>
      )}

      {(t.description || t.rules) && (
        <section className="grid gap-4 md:grid-cols-2">
          {t.description && (
            <div className="card p-6">
              <h2 className="mb-2 font-semibold">Información</h2>
              <p className="text-sm whitespace-pre-line text-suave">{t.description}</p>
            </div>
          )}
          {t.rules && (
            <div className="card p-6">
              <h2 className="mb-2 font-semibold">Reglamento</h2>
              <p className="text-sm whitespace-pre-line text-suave">{t.rules}</p>
            </div>
          )}
        </section>
      )}

      {esAdmin && (
        <section className="card border-violeta/50 p-6">
          <h2 className="mb-4 font-semibold text-violet-300">Panel de administración</h2>
          <div className="flex flex-wrap gap-3">
            {(t.status === "inscripciones" || t.status === "borrador") && (
              <form action={generarBracket}>
                <input type="hidden" name="tournament_id" value={t.id} />
                <SubmitButton confirmar={`Se cerrarán las inscripciones y se sorteará el bracket con ${inscripciones.length} participantes. ¿Continuar?`}>
                  Cerrar inscripciones y sortear bracket
                </SubmitButton>
              </form>
            )}
            {(t.status === "inscripciones" || t.status === "borrador") && (
              <form action={cambiarEstadoTorneo}>
                <input type="hidden" name="tournament_id" value={t.id} />
                <input type="hidden" name="status" value={t.status === "borrador" ? "inscripciones" : "borrador"} />
                <SubmitButton className="btn-secundario">{t.status === "borrador" ? "Publicar (abrir inscripciones)" : "Ocultar (pasar a borrador)"}</SubmitButton>
              </form>
            )}
            <form action={eliminarTorneo}>
              <input type="hidden" name="tournament_id" value={t.id} />
              <SubmitButton className="btn-peligro" confirmar="Se borrará el torneo con todas sus partidas. ¿Seguro?">Eliminar torneo</SubmitButton>
            </form>
          </div>

          {listas.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-semibold">Partidas en juego {paraAdmin.length > 0 && <span className="text-red-300">· {paraAdmin.length} requieren revisión</span>}</h3>
              {[...paraAdmin, ...listas.filter((m) => !paraAdmin.includes(m))].map((m) => (
                <div key={m.id} className="rounded-lg bg-fondo p-4 text-sm">
                  <p className="mb-2">
                    <span className="text-suave">{nombreRonda(m.round, totalRondas)}:</span> {nombreInscripcion(porId.get(m.a_id!))} vs {nombreInscripcion(porId.get(m.b_id!))}
                    {m.status !== "pendiente" && (
                      <span className={m.status === "disputa" ? "text-red-300" : "text-sky-300"}>
                        {" "}· {m.status === "disputa" ? "En disputa" : "Reportado"} {m.score_a}-{m.score_b}
                      </span>
                    )}
                    {m.evidence_url && <> · <a href={m.evidence_url} target="_blank" rel="noreferrer" className="text-acento underline">ver evidencia</a></>}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <FormResultado m={m} t={t} victorias={victorias} boton="Fijar resultado (admin)" />
                    <form action={programarPartida} className="flex items-center gap-2">
                      <input type="hidden" name="tournament_id" value={t.id} />
                      <input type="hidden" name="match_id" value={m.id} />
                      <div className="w-52"><DateTimeInput name="scheduled_at" /></div>
                      <SubmitButton className="btn-secundario px-3 py-1 text-xs">Programar</SubmitButton>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function PartidaPropia({
  m, t, porId, yo, victorias, ronda,
}: {
  m: Match; t: Tournament; porId: Map<string, Registration>; yo: string; victorias: number; ronda: string;
}) {
  const a = porId.get(m.a_id!);
  const b = porId.get(m.b_id!);
  const reportoA = !!m.reported_by && (a?.player_id === m.reported_by || a?.team?.captain_id === m.reported_by);
  const yoSoyA = a?.player_id === yo || a?.team?.captain_id === yo;
  const meTocaResponder = m.status === "reportado" && reportoA !== yoSoyA;

  return (
    <div className="rounded-lg bg-fondo p-4 text-sm">
      <p className="font-semibold">
        <span className="text-suave">{ronda}:</span> {nombreInscripcion(a)} vs {nombreInscripcion(b)}
      </p>
      {m.scheduled_at && <p className="text-xs text-suave">Programada: <LocalTime iso={m.scheduled_at} /></p>}

      {m.status === "pendiente" && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-suave">Al terminar, reporta el marcador. El rival deberá confirmarlo.</p>
          <FormResultado m={m} t={t} victorias={victorias} boton="Reportar resultado" />
        </div>
      )}

      {m.status === "reportado" && meTocaResponder && (
        <div className="mt-3 space-y-2">
          <p>
            El rival reportó: <strong>{nombreInscripcion(a)} {m.score_a} – {m.score_b} {nombreInscripcion(b)}</strong>
            {m.evidence_url && <> · <a href={m.evidence_url} target="_blank" rel="noreferrer" className="text-acento underline">ver evidencia</a></>}
          </p>
          <div className="flex gap-2">
            <Respuesta m={m} t={t} acepta />
            <Respuesta m={m} t={t} acepta={false} />
          </div>
        </div>
      )}

      {m.status === "reportado" && !meTocaResponder && (
        <p className="mt-2 text-sky-300">Reportaste {m.score_a}–{m.score_b}. Esperando que el rival confirme.</p>
      )}

      {m.status === "disputa" && (
        <div className="mt-2 space-y-2">
          <p className="text-red-300">Resultado en disputa. Un administrador lo revisará; también pueden corregir el reporte si se pusieron de acuerdo.</p>
          <FormResultado m={m} t={t} victorias={victorias} boton="Volver a reportar" />
        </div>
      )}
    </div>
  );
}

function FormResultado({ m, t, victorias, boton }: { m: Match; t: Tournament; victorias: number; boton: string }) {
  const opciones = Array.from({ length: victorias + 1 }, (_, i) => i);
  return (
    <form action={reportarResultado} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="tournament_id" value={t.id} />
      <input type="hidden" name="match_id" value={m.id} />
      <select name="score_a" className="input w-16" defaultValue={m.score_a ?? undefined} aria-label="Victorias del primero">
        {opciones.map((n) => <option key={n}>{n}</option>)}
      </select>
      <span>–</span>
      <select name="score_b" className="input w-16" defaultValue={m.score_b ?? undefined} aria-label="Victorias del segundo">
        {opciones.map((n) => <option key={n}>{n}</option>)}
      </select>
      <input name="evidence_url" type="url" className="input w-56" placeholder="Enlace a captura (opcional)" />
      <SubmitButton className="btn-primario px-3 py-1.5 text-xs">{boton}</SubmitButton>
    </form>
  );
}

function Respuesta({ m, t, acepta }: { m: Match; t: Tournament; acepta: boolean }) {
  return (
    <form action={responderResultado}>
      <input type="hidden" name="tournament_id" value={t.id} />
      <input type="hidden" name="match_id" value={m.id} />
      <input type="hidden" name="accept" value={acepta ? "si" : "no"} />
      <SubmitButton className={acepta ? "btn-primario px-3 py-1.5 text-xs" : "btn-peligro px-3 py-1.5 text-xs"} confirmar={acepta ? undefined : "¿Abrir una disputa? Un administrador revisará el resultado."}>
        {acepta ? "Confirmar" : "Disputar"}
      </SubmitButton>
    </form>
  );
}
