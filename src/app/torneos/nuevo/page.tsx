import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { crearTorneo } from "@/app/acciones";
import DateTimeInput from "@/components/DateTimeInput";
import SubmitButton from "@/components/SubmitButton";
import SelectorModo from "./SelectorModo";

export const metadata: Metadata = { title: "Crear torneo" };

export default async function NuevoTorneoPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/torneos/nuevo");
  if (!viewer.profile.is_admin) redirect("/torneos?error=" + encodeURIComponent("Solo los administradores pueden crear torneos."));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="titulo mb-6">Crear torneo</h1>
      <form action={crearTorneo} className="card space-y-5 p-6">
        <div>
          <label className="label" htmlFor="name">Nombre</label>
          <input id="name" name="name" className="input" required minLength={3} maxLength={80} placeholder="Copa Maníacos #1" />
        </div>
        <SelectorModo />
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="best_of">Partidas por serie</label>
            <select id="best_of" name="best_of" className="input" defaultValue="3">
              <option value="1">Bo1</option>
              <option value="3">Bo3</option>
              <option value="5">Bo5</option>
              <option value="7">Bo7</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="max_participants">Cupos</label>
            <input id="max_participants" name="max_participants" type="number" min={2} max={128} defaultValue={16} className="input" />
          </div>
          <div>
            <label className="label">Inicio</label>
            <DateTimeInput name="starts_at" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">Descripción y premios</label>
          <textarea id="description" name="description" className="input min-h-20" />
        </div>
        <div>
          <label className="label" htmlFor="rules">Reglamento</label>
          <textarea id="rules" name="rules" className="input min-h-32" placeholder="Formato de sala, baneos, puntualidad, capturas obligatorias…" />
        </div>
        <SubmitButton>Crear y abrir inscripciones</SubmitButton>
      </form>
    </div>
  );
}
