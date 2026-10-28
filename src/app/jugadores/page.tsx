import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import GameBadge from "@/components/GameBadge";
import Vacio from "@/components/Vacio";
import { ROLES_UNITE } from "@/lib/labels";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Jugadores" };

export default async function JugadoresPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = await createClient();
  let consulta = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(60);
  if (q) consulta = consulta.ilike("display_name", `%${q.replace(/[%_,()]/g, "")}%`);
  const { data } = await consulta;
  const jugadores = (data ?? []) as Profile[];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="titulo">Jugadores</h1>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Buscar por nick" className="input w-56" />
          <button className="btn-secundario">Buscar</button>
        </form>
      </div>
      {jugadores.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jugadores.map((p) => (
            <Link key={p.id} href={`/jugadores/${p.id}`} className="card flex items-center gap-3 p-4 transition hover:border-violeta">
              <Avatar src={p.avatar_url} nombre={p.display_name} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.display_name}</p>
                <p className="flex items-center gap-2 text-xs text-suave">
                  {p.main_game && <GameBadge game={p.main_game} />}
                  {p.unite_role && ROLES_UNITE[p.unite_role]}
                  {p.country && <span>{p.country}</span>}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Vacio>No encontramos jugadores.</Vacio>
      )}
    </div>
  );
}
