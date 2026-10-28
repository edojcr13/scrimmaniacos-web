import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import GameBadge from "@/components/GameBadge";
import Vacio from "@/components/Vacio";
import Logo from "@/components/TeamLogo";
import { esJuego } from "@/lib/labels";
import type { Team } from "@/lib/types";

export const metadata: Metadata = { title: "Equipos" };

export default async function EquiposPage({ searchParams }: { searchParams: Promise<{ juego?: string }> }) {
  const { juego } = await searchParams;
  const supabase = await createClient();
  let consulta = supabase.from("teams").select("id, name, tag, game, logo_url, description, team_members(count)").order("created_at", { ascending: false });
  if (esJuego(juego)) consulta = consulta.eq("game", juego);
  const { data } = await consulta;
  const equipos = (data ?? []) as unknown as (Team & { team_members: { count: number }[] })[];

  const filtro = (valor: string | undefined, texto: string) => (
    <Link href={valor ? `/equipos?juego=${valor}` : "/equipos"} className={`rounded-full px-3 py-1 text-sm ${juego === valor ? "bg-acento text-black" : "bg-white/5 text-suave hover:text-texto"}`}>
      {texto}
    </Link>
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="titulo">Equipos</h1>
        <div className="flex gap-2">
          <Link href="/equipos/unirse" className="btn-secundario">Unirme con código</Link>
          <Link href="/equipos/nuevo" className="btn-primario">Crear equipo</Link>
        </div>
      </div>
      <div className="mb-5 flex gap-2">
        {filtro(undefined, "Todos")}
        {filtro("unite", "UNITE")}
        {filtro("champions", "Champions")}
      </div>
      {equipos.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {equipos.map((e) => (
            <Link key={e.id} href={`/equipos/${e.id}`} className="card p-5 transition hover:border-violeta">
              <div className="flex items-center gap-3">
                <Logo equipo={e} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{e.name}</p>
                  <p className="flex items-center gap-2 text-xs text-suave"><GameBadge game={e.game} /> {e.team_members[0]?.count ?? 0} integrantes</p>
                </div>
              </div>
              {e.description && <p className="mt-3 line-clamp-2 text-sm text-suave">{e.description}</p>}
            </Link>
          ))}
        </div>
      ) : (
        <Vacio>Todavía no hay equipos. ¡Crea el primero!</Vacio>
      )}
    </div>
  );
}
