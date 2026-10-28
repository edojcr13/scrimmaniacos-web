import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { actualizarPerfil } from "@/app/acciones";
import SubmitButton from "@/components/SubmitButton";
import Avatar from "@/components/Avatar";
import { PAISES, ROLES_UNITE } from "@/lib/labels";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function PerfilPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/perfil");
  const p = viewer.profile;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Avatar src={p.avatar_url} nombre={p.display_name} size={64} />
        <div>
          <h1 className="titulo">Mi perfil</h1>
          <Link href={`/jugadores/${p.id}`} className="text-sm text-acento hover:underline">Ver mi perfil público</Link>
        </div>
      </div>

      <form action={actualizarPerfil} className="card space-y-5 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="display_name">Nombre visible / nick</label>
            <input id="display_name" name="display_name" className="input" defaultValue={p.display_name} maxLength={30} required />
          </div>
          <div>
            <label className="label" htmlFor="username">Usuario (para tu enlace)</label>
            <input id="username" name="username" className="input" defaultValue={p.username ?? ""} pattern="[A-Za-z0-9_]{3,20}" placeholder="ej. ash_ketchum" />
          </div>
          <div>
            <label className="label" htmlFor="country">País</label>
            <select id="country" name="country" className="input" defaultValue={p.country ?? ""}>
              <option value="">Sin indicar</option>
              {PAISES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="main_game">Juego principal</label>
            <select id="main_game" name="main_game" className="input" defaultValue={p.main_game ?? ""}>
              <option value="">Ambos</option>
              <option value="unite">Pokémon UNITE</option>
              <option value="champions">Pokémon Champions</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="unite_role">Rol en UNITE</label>
            <select id="unite_role" name="unite_role" className="input" defaultValue={p.unite_role ?? ""}>
              <option value="">Sin rol fijo</option>
              {Object.entries(ROLES_UNITE).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="trainer_id">ID de entrenador / nick en el juego</label>
            <input id="trainer_id" name="trainer_id" className="input" defaultValue={p.trainer_id ?? ""} maxLength={40} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="bio">Sobre mí</label>
          <textarea id="bio" name="bio" className="input min-h-24" defaultValue={p.bio ?? ""} maxLength={300} placeholder="Pokémon favoritos, horarios en los que juegas, logros…" />
        </div>
        <SubmitButton>Guardar cambios</SubmitButton>
      </form>
    </div>
  );
}
