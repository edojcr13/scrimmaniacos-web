import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getViewer } from "@/lib/supabase/server";
import GameBadge from "@/components/GameBadge";
import Vacio from "@/components/Vacio";
import { ESTADO_TORNEO } from "@/lib/labels";
import type { Tournament } from "@/lib/types";

export const metadata: Metadata = { title: "Administración" };

export default async function AdminPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/admin");
  if (!viewer.profile.is_admin) redirect("/?error=" + encodeURIComponent("Esta sección es solo para administradores."));

  const supabase = await createClient();
  const [{ data: torneos }, { data: pendientes }] = await Promise.all([
    supabase.from("tournaments").select("*").neq("status", "finalizado").order("created_at", { ascending: false }),
    supabase.from("matches").select("id, status, tournament:tournaments(id, name)").in("status", ["disputa", "reportado"]),
  ]);
  const revisar = (pendientes ?? []) as unknown as { id: string; status: string; tournament: { id: string; name: string } }[];
  const disputas = revisar.filter((m) => m.status === "disputa");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="titulo">Administración</h1>
        <Link href="/torneos/nuevo" className="btn-primario">Crear torneo</Link>
      </div>

      <section>
        <h2 className="mb-3 font-semibold">Disputas abiertas ({disputas.length})</h2>
        {disputas.length ? (
          <ul className="card divide-y divide-borde text-sm">
            {disputas.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3">
                <span>{m.tournament.name}</span>
                <Link href={`/torneos/${m.tournament.id}`} className="text-acento hover:underline">Resolver</Link>
              </li>
            ))}
          </ul>
        ) : (
          <Vacio>No hay disputas. 🎉</Vacio>
        )}
        {revisar.length > disputas.length && (
          <p className="mt-2 text-xs text-suave">{revisar.length - disputas.length} resultados esperan la confirmación del rival.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Torneos activos y borradores</h2>
        {torneos?.length ? (
          <ul className="card divide-y divide-borde text-sm">
            {(torneos as Tournament[]).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <GameBadge game={t.game} />
                <Link href={`/torneos/${t.id}`} className="font-semibold hover:text-acento">{t.name}</Link>
                <span className="ml-auto text-suave">{ESTADO_TORNEO[t.status]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Vacio>No hay torneos activos.</Vacio>
        )}
      </section>
    </div>
  );
}
