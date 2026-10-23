import type { Metadata } from "next";
import Link from "next/link";
import { createClient, getViewer } from "@/lib/supabase/server";
import GameBadge from "@/components/GameBadge";
import LocalTime from "@/components/LocalTime";
import Vacio from "@/components/Vacio";
import { ESTADO_TORNEO } from "@/lib/labels";
import type { Tournament } from "@/lib/types";

export const metadata: Metadata = { title: "Torneos" };

export default async function TorneosPage() {
  const supabase = await createClient();
  const [{ data }, viewer] = await Promise.all([
    supabase.from("tournaments").select("*, registrations(count)").order("created_at", { ascending: false }),
    getViewer(),
  ]);
  const torneos = (data ?? []) as (Tournament & { registrations: { count: number }[] })[];
  const activos = torneos.filter((t) => t.status !== "finalizado");
  const pasados = torneos.filter((t) => t.status === "finalizado");

  const Lista = ({ items }: { items: typeof torneos }) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((t) => (
        <Link key={t.id} href={`/torneos/${t.id}`} className="card block p-5 transition hover:border-violeta">
          <div className="flex items-center gap-2">
            <GameBadge game={t.game} />
            <span className={`text-xs ${t.status === "inscripciones" ? "text-emerald-300" : "text-suave"}`}>{ESTADO_TORNEO[t.status]}</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold">{t.name}</h3>
          <p className="mt-1 text-sm text-suave">
            {t.mode === "equipos" ? "Equipos" : "Individual"} · Bo{t.best_of} · {t.registrations[0]?.count ?? 0}/{t.max_participants} inscritos
          </p>
          {t.starts_at && <p className="mt-1 text-sm text-suave">Inicio: <LocalTime iso={t.starts_at} /></p>}
        </Link>
      ))}
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="titulo">Torneos</h1>
        {viewer?.profile.is_admin && <Link href="/torneos/nuevo" className="btn-primario">Crear torneo</Link>}
      </div>
      <section>
        <h2 className="mb-4 font-semibold text-suave">Activos y próximos</h2>
        {activos.length ? <Lista items={activos} /> : <Vacio>No hay torneos activos por ahora.</Vacio>}
      </section>
      {pasados.length > 0 && (
        <section>
          <h2 className="mb-4 font-semibold text-suave">Finalizados</h2>
          <Lista items={pasados} />
        </section>
      )}
    </div>
  );
}
