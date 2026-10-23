"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getViewer } from "@/lib/supabase/server";
import { esJuego } from "@/lib/labels";

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------

function texto(fd: FormData, campo: string) {
  const v = fd.get(campo);
  return typeof v === "string" ? v.trim() : "";
}

function opcional(fd: FormData, campo: string) {
  return texto(fd, campo) || null;
}

function entero(fd: FormData, campo: string) {
  const n = Number.parseInt(texto(fd, campo), 10);
  return Number.isFinite(n) ? n : NaN;
}

/** Convierte errores de Postgres/Supabase en un mensaje legible. */
function mensaje(error: { message: string; code?: string }) {
  if (error.code === "23505") return "Ese nombre ya está en uso.";
  if (error.code === "23514") return "Algún dato no tiene el formato correcto.";
  if (error.code === "42501" || error.message.includes("row-level security")) return "No tienes permiso para hacer eso.";
  return error.message;
}

function volver(ruta: string, tipo: "error" | "ok", msg: string): never {
  const sep = ruta.includes("?") ? "&" : "?";
  redirect(`${ruta}${sep}${tipo}=${encodeURIComponent(msg)}`);
}

async function requerirSesion(ruta: string) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(ruta)}`);
  return viewer;
}

// ---------------------------------------------------------------------
// Sesión y perfil
// ---------------------------------------------------------------------

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function actualizarPerfil(fd: FormData) {
  const { user } = await requerirSesion("/perfil");
  const supabase = await createClient();
  const juego = texto(fd, "main_game");

  const { error } = await supabase
    .from("profiles")
    .update({
      username: opcional(fd, "username"),
      display_name: texto(fd, "display_name") || "Entrenador",
      country: opcional(fd, "country"),
      main_game: esJuego(juego) ? juego : null,
      unite_role: opcional(fd, "unite_role"),
      trainer_id: opcional(fd, "trainer_id"),
      bio: opcional(fd, "bio"),
    })
    .eq("id", user.id);

  if (error) {
    volver("/perfil", "error", error.code === "23514" ? "El usuario debe tener de 3 a 20 letras, números o _." : mensaje(error));
  }
  revalidatePath("/", "layout");
  volver("/perfil", "ok", "Perfil actualizado.");
}

// ---------------------------------------------------------------------
// Equipos
// ---------------------------------------------------------------------

export async function crearEquipo(fd: FormData) {
  const { user } = await requerirSesion("/equipos/nuevo");
  const supabase = await createClient();
  const juego = texto(fd, "game");

  const { data, error } = await supabase
    .from("teams")
    .insert({
      name: texto(fd, "name"),
      tag: texto(fd, "tag").toUpperCase(),
      game: esJuego(juego) ? juego : "unite",
      logo_url: opcional(fd, "logo_url"),
      description: opcional(fd, "description"),
      captain_id: user.id,
    })
    .select("id")
    .single();

  if (error) volver("/equipos/nuevo", "error", mensaje(error));
  revalidatePath("/equipos");
  volver(`/equipos/${data.id}`, "ok", "Equipo creado. Comparte el código de invitación con tus compañeros.");
}

export async function unirseEquipo(fd: FormData) {
  await requerirSesion("/equipos/unirse");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_team", { p_code: texto(fd, "code") });
  if (error) volver("/equipos/unirse", "error", mensaje(error));
  revalidatePath("/equipos");
  volver(`/equipos/${data}`, "ok", "¡Te uniste al equipo!");
}

export async function editarEquipo(fd: FormData) {
  const id = texto(fd, "team_id");
  await requerirSesion(`/equipos/${id}`);
  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({
      name: texto(fd, "name"),
      tag: texto(fd, "tag").toUpperCase(),
      logo_url: opcional(fd, "logo_url"),
      description: opcional(fd, "description"),
    })
    .eq("id", id);
  if (error) volver(`/equipos/${id}`, "error", mensaje(error));
  revalidatePath(`/equipos/${id}`);
  volver(`/equipos/${id}`, "ok", "Equipo actualizado.");
}

export async function cambiarRolMiembro(fd: FormData) {
  const id = texto(fd, "team_id");
  await requerirSesion(`/equipos/${id}`);
  const supabase = await createClient();
  const { error } = await supabase
    .from("team_members")
    .update({ role: texto(fd, "role") })
    .eq("team_id", id)
    .eq("user_id", texto(fd, "user_id"));
  if (error) volver(`/equipos/${id}`, "error", mensaje(error));
  revalidatePath(`/equipos/${id}`);
}

export async function quitarMiembro(fd: FormData) {
  const id = texto(fd, "team_id");
  const { user } = await requerirSesion(`/equipos/${id}`);
  const supabase = await createClient();
  const objetivo = texto(fd, "user_id");
  const { data, error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", id)
    .eq("user_id", objetivo)
    .select("user_id");
  if (error) volver(`/equipos/${id}`, "error", mensaje(error));
  if (!data?.length) volver(`/equipos/${id}`, "error", "No se pudo quitar a ese integrante.");
  revalidatePath(`/equipos/${id}`);
  volver(`/equipos/${id}`, "ok", objetivo === user.id ? "Saliste del equipo." : "Integrante removido.");
}

export async function eliminarEquipo(fd: FormData) {
  const id = texto(fd, "team_id");
  await requerirSesion(`/equipos/${id}`);
  const supabase = await createClient();
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) volver(`/equipos/${id}`, "error", mensaje(error));
  revalidatePath("/equipos");
  volver("/equipos", "ok", "Equipo eliminado.");
}

// ---------------------------------------------------------------------
// Torneos
// ---------------------------------------------------------------------

export async function crearTorneo(fd: FormData) {
  const { profile } = await requerirSesion("/torneos/nuevo");
  if (!profile.is_admin) volver("/torneos", "error", "Solo los administradores pueden crear torneos.");
  const supabase = await createClient();
  const juego = texto(fd, "game");
  if (!esJuego(juego)) volver("/torneos/nuevo", "error", "Elige un juego.");

  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      name: texto(fd, "name"),
      game: juego,
      mode: texto(fd, "mode") === "individual" ? "individual" : "equipos",
      description: opcional(fd, "description"),
      rules: opcional(fd, "rules"),
      starts_at: opcional(fd, "starts_at"),
      max_participants: entero(fd, "max_participants"),
      best_of: entero(fd, "best_of"),
      status: "inscripciones",
    })
    .select("id")
    .single();

  if (error) volver("/torneos/nuevo", "error", mensaje(error));
  revalidatePath("/torneos");
  volver(`/torneos/${data.id}`, "ok", "Torneo creado con inscripciones abiertas.");
}

export async function inscribirse(fd: FormData) {
  const id = texto(fd, "tournament_id");
  await requerirSesion(`/torneos/${id}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("register_tournament", {
    p_tournament: id,
    p_team: opcional(fd, "team_id"),
  });
  if (error) volver(`/torneos/${id}`, "error", mensaje(error));
  revalidatePath(`/torneos/${id}`);
  volver(`/torneos/${id}`, "ok", "¡Inscripción registrada!");
}

export async function retirarInscripcion(fd: FormData) {
  const id = texto(fd, "tournament_id");
  await requerirSesion(`/torneos/${id}`);
  const supabase = await createClient();
  const { data, error } = await supabase.from("registrations").delete().eq("id", texto(fd, "registration_id")).select("id");
  if (error) volver(`/torneos/${id}`, "error", mensaje(error));
  if (!data?.length) volver(`/torneos/${id}`, "error", "No se pudo retirar la inscripción.");
  revalidatePath(`/torneos/${id}`);
  volver(`/torneos/${id}`, "ok", "Inscripción retirada.");
}

export async function generarBracket(fd: FormData) {
  const id = texto(fd, "tournament_id");
  await requerirSesion(`/torneos/${id}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("generate_bracket", { p_tournament: id });
  if (error) volver(`/torneos/${id}`, "error", mensaje(error));
  revalidatePath(`/torneos/${id}`);
  volver(`/torneos/${id}`, "ok", "Sorteo realizado. ¡El bracket está listo!");
}

export async function cambiarEstadoTorneo(fd: FormData) {
  const id = texto(fd, "tournament_id");
  await requerirSesion(`/torneos/${id}`);
  const supabase = await createClient();
  const { error } = await supabase.from("tournaments").update({ status: texto(fd, "status") }).eq("id", id);
  if (error) volver(`/torneos/${id}`, "error", mensaje(error));
  revalidatePath(`/torneos/${id}`);
  volver(`/torneos/${id}`, "ok", "Estado actualizado.");
}

export async function eliminarTorneo(fd: FormData) {
  const id = texto(fd, "tournament_id");
  await requerirSesion(`/torneos/${id}`);
  const supabase = await createClient();
  const { error } = await supabase.from("tournaments").delete().eq("id", id);
  if (error) volver(`/torneos/${id}`, "error", mensaje(error));
  revalidatePath("/torneos");
  volver("/torneos", "ok", "Torneo eliminado.");
}

export async function reportarResultado(fd: FormData) {
  const id = texto(fd, "tournament_id");
  await requerirSesion(`/torneos/${id}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_result", {
    p_match: texto(fd, "match_id"),
    p_score_a: entero(fd, "score_a"),
    p_score_b: entero(fd, "score_b"),
    p_evidence: opcional(fd, "evidence_url"),
  });
  if (error) volver(`/torneos/${id}`, "error", mensaje(error));
  revalidatePath(`/torneos/${id}`);
  volver(`/torneos/${id}`, "ok", "Resultado enviado.");
}

export async function responderResultado(fd: FormData) {
  const id = texto(fd, "tournament_id");
  await requerirSesion(`/torneos/${id}`);
  const supabase = await createClient();
  const aceptar = texto(fd, "accept") === "si";
  const { error } = await supabase.rpc("respond_result", { p_match: texto(fd, "match_id"), p_accept: aceptar });
  if (error) volver(`/torneos/${id}`, "error", mensaje(error));
  revalidatePath(`/torneos/${id}`);
  volver(`/torneos/${id}`, "ok", aceptar ? "Resultado confirmado." : "Resultado en disputa: un administrador lo revisará.");
}

export async function programarPartida(fd: FormData) {
  const id = texto(fd, "tournament_id");
  await requerirSesion(`/torneos/${id}`);
  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({ scheduled_at: opcional(fd, "scheduled_at") })
    .eq("id", texto(fd, "match_id"));
  if (error) volver(`/torneos/${id}`, "error", mensaje(error));
  revalidatePath(`/torneos/${id}`);
}

// ---------------------------------------------------------------------
// Scrims
// ---------------------------------------------------------------------

export async function publicarScrim(fd: FormData) {
  const { user } = await requerirSesion("/scrims");
  const supabase = await createClient();
  const juego = texto(fd, "game");
  if (!esJuego(juego)) volver("/scrims", "error", "Elige un juego.");
  if (!texto(fd, "scheduled_at")) volver("/scrims", "error", "Indica fecha y hora.");

  const { error } = await supabase.from("scrims").insert({
    game: juego,
    host_user_id: user.id,
    host_team_id: juego === "unite" ? opcional(fd, "team_id") : null,
    scheduled_at: texto(fd, "scheduled_at"),
    best_of: entero(fd, "best_of") || 3,
    notes: opcional(fd, "notes"),
  });
  if (error) {
    volver("/scrims", "error", error.code === "23514" ? "Para UNITE debes publicar a nombre de un equipo del que seas capitán." : mensaje(error));
  }
  revalidatePath("/scrims");
  volver("/scrims", "ok", "Scrim publicada. Te avisaremos aquí cuando alguien la acepte.");
}

export async function aceptarScrim(fd: FormData) {
  await requerirSesion("/scrims");
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_scrim", { p_scrim: texto(fd, "scrim_id"), p_team: opcional(fd, "team_id") });
  if (error) volver("/scrims", "error", mensaje(error));
  revalidatePath("/scrims");
  volver("/scrims", "ok", "Scrim aceptada. Coordinen la sala con el rival.");
}

export async function reportarScrim(fd: FormData) {
  await requerirSesion("/scrims");
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_scrim", {
    p_scrim: texto(fd, "scrim_id"),
    p_host: entero(fd, "score_host"),
    p_rival: entero(fd, "score_rival"),
  });
  if (error) volver("/scrims", "error", mensaje(error));
  revalidatePath("/scrims");
  volver("/scrims", "ok", "Resultado de la scrim publicado.");
}

export async function cancelarScrim(fd: FormData) {
  await requerirSesion("/scrims");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_scrim", { p_scrim: texto(fd, "scrim_id") });
  if (error) volver("/scrims", "error", mensaje(error));
  revalidatePath("/scrims");
  volver("/scrims", "ok", "Scrim cancelada.");
}
