import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { crearEquipo } from "@/app/acciones";
import SubmitButton from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Crear equipo" };

export default async function NuevoEquipoPage() {
  if (!(await getViewer())) redirect("/login?next=/equipos/nuevo");

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="titulo mb-2">Crear equipo</h1>
      <p className="mb-6 text-sm text-suave">
        Serás el capitán. Después podrás invitar a tus compañeros con un código. Para torneos de UNITE se necesitan al menos 5 integrantes.
      </p>
      <form action={crearEquipo} className="card space-y-5 p-6">
        <div>
          <label className="label" htmlFor="game">Juego</label>
          <select id="game" name="game" className="input" defaultValue="unite">
            <option value="unite">Pokémon UNITE (5 vs 5)</option>
            <option value="champions">Pokémon Champions (clan / club)</option>
          </select>
        </div>
        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          <div>
            <label className="label" htmlFor="name">Nombre del equipo</label>
            <input id="name" name="name" className="input" required minLength={3} maxLength={40} />
          </div>
          <div>
            <label className="label" htmlFor="tag">Tag</label>
            <input id="tag" name="tag" className="input uppercase" required pattern="[A-Za-z0-9]{2,5}" placeholder="ej. SMX" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="logo_url">Logo (enlace a imagen, opcional)</label>
          <input id="logo_url" name="logo_url" type="url" className="input" placeholder="https://…" />
        </div>
        <div>
          <label className="label" htmlFor="description">Descripción</label>
          <textarea id="description" name="description" className="input min-h-20" maxLength={300} placeholder="Horarios, país, qué buscan…" />
        </div>
        <SubmitButton>Crear equipo</SubmitButton>
      </form>
    </div>
  );
}
