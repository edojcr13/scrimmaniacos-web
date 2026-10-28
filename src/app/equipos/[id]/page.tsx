import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getViewer } from "@/lib/supabase/server";
import { cambiarRolMiembro, editarEquipo, eliminarEquipo, quitarMiembro } from "@/app/acciones";
import Avatar from "@/components/Avatar";
import GameBadge from "@/components/GameBadge";
import SubmitButton from "@/components/SubmitButton";
import Logo from "@/components/TeamLogo";
import { ROLES_UNITE } from "@/lib/labels";
import type { Profile, Team } from "@/lib/types";

type Miembro = { role: "capitan" | "titular" | "suplente"; profile: Pick<Profile, "id" | "display_name" | "avatar_url" | "unite_role" | "country"> };

const ORDEN = { capitan: 0, titular: 1, suplente: 2 };

export default async function EquipoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: equipo }, viewer] = await Promise.all([
    supabase.from("teams").select("*, members:team_members(role, profile:profiles(id, display_name, avatar_url, unite_role, country))").eq("id", id).maybeSingle(),
    getViewer(),
  ]);
  if (!equipo) notFound();
  const e = equipo as Team & { members: Miembro[] };
  const miembros = [...e.members].sort((a, b) => ORDEN[a.role] - ORDEN[b.role]);
  const esCapitan = viewer?.user.id === e.captain_id;
  const esMiembro = miembros.some((m) => m.profile.id === viewer?.user.id);

  const { data: ranking } = await supabase.from("ranking").select("wins, losses, titles, points").eq("team_id", id).maybeSingle();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="card flex flex-wrap items-center gap-5 p-6">
        <Logo equipo={e} size={80} />
        <div>
          <h1 className="titulo">{e.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-suave"><GameBadge game={e.game} /> [{e.tag}] · {miembros.length} integrantes</p>
          {ranking && (
            <p className="mt-1 text-sm text-suave">{ranking.wins}V · {ranking.losses}D · {ranking.titles} títulos · <span className="text-acento">{ranking.points} pts</span></p>
          )}
        </div>
      </div>

      {e.description && <p className="card p-6 text-sm whitespace-pre-line">{e.description}</p>}

      {esCapitan && (
        <section className="card border-acento/40 p-6">
          <h2 className="font-semibold">Invitar jugadores</h2>
          <p className="mt-1 text-sm text-suave">Comparte este código o enlace. Cualquiera que lo tenga puede unirse.</p>
          <p className="mt-3 font-mono text-2xl tracking-widest text-acento">{e.invite_code}</p>
          <p className="mt-1 text-xs break-all text-suave">scrimmaniacos.com/equipos/unirse?codigo={e.invite_code}</p>
        </section>
      )}

      <section className="card p-6">
        <h2 className="mb-4 font-semibold">Plantilla</h2>
        <ul className="divide-y divide-borde">
          {miembros.map((m) => (
            <li key={m.profile.id} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar src={m.profile.avatar_url} nombre={m.profile.display_name} size={36} />
              <div className="min-w-0 flex-1">
                <Link href={`/jugadores/${m.profile.id}`} className="font-semibold hover:text-acento">{m.profile.display_name}</Link>
                <p className="text-xs text-suave">
                  <span className={m.role === "capitan" ? "text-acento" : ""}>{m.role === "capitan" ? "Capitán" : m.role === "titular" ? "Titular" : "Suplente"}</span>
                  {m.profile.unite_role && ` · ${ROLES_UNITE[m.profile.unite_role]}`}
                  {m.profile.country && ` · ${m.profile.country}`}
                </p>
              </div>
              {esCapitan && m.role !== "capitan" && (
                <div className="flex gap-2">
                  <form action={cambiarRolMiembro}>
                    <input type="hidden" name="team_id" value={e.id} />
                    <input type="hidden" name="user_id" value={m.profile.id} />
                    <input type="hidden" name="role" value={m.role === "titular" ? "suplente" : "titular"} />
                    <SubmitButton className="btn-secundario px-2 py-1 text-xs">Pasar a {m.role === "titular" ? "suplente" : "titular"}</SubmitButton>
                  </form>
                  <form action={quitarMiembro}>
                    <input type="hidden" name="team_id" value={e.id} />
                    <input type="hidden" name="user_id" value={m.profile.id} />
                    <SubmitButton className="btn-peligro px-2 py-1 text-xs" confirmar={`¿Quitar a ${m.profile.display_name} del equipo?`}>Quitar</SubmitButton>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
        {esMiembro && !esCapitan && viewer && (
          <form action={quitarMiembro} className="mt-4">
            <input type="hidden" name="team_id" value={e.id} />
            <input type="hidden" name="user_id" value={viewer.user.id} />
            <SubmitButton className="btn-peligro" confirmar="¿Seguro que quieres salir del equipo?">Salir del equipo</SubmitButton>
          </form>
        )}
      </section>

      {esCapitan && (
        <section className="card p-6">
          <h2 className="mb-4 font-semibold">Editar equipo</h2>
          <form action={editarEquipo} className="space-y-4">
            <input type="hidden" name="team_id" value={e.id} />
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <input name="name" className="input" defaultValue={e.name} required minLength={3} maxLength={40} />
              <input name="tag" className="input uppercase" defaultValue={e.tag} required pattern="[A-Za-z0-9]{2,5}" />
            </div>
            <input name="logo_url" type="url" className="input" defaultValue={e.logo_url ?? ""} placeholder="Enlace al logo" />
            <textarea name="description" className="input min-h-20" defaultValue={e.description ?? ""} maxLength={300} />
            <div className="flex flex-wrap gap-3">
              <SubmitButton>Guardar</SubmitButton>
            </div>
          </form>
          <form action={eliminarEquipo} className="mt-6 border-t border-borde pt-4">
            <input type="hidden" name="team_id" value={e.id} />
            <SubmitButton className="btn-peligro" confirmar="Esto elimina el equipo y sus inscripciones. ¿Continuar?">Eliminar equipo</SubmitButton>
          </form>
        </section>
      )}
    </div>
  );
}
