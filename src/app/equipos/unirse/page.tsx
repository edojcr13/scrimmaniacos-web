import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { unirseEquipo } from "@/app/acciones";
import SubmitButton from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Unirme a un equipo" };

export default async function UnirsePage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const { codigo } = await searchParams;
  if (!(await getViewer())) redirect(`/login?next=${encodeURIComponent(`/equipos/unirse${codigo ? `?codigo=${codigo}` : ""}`)}`);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="titulo mb-2">Unirme a un equipo</h1>
      <p className="mb-6 text-sm text-suave">Pídele al capitán el código de invitación (8 caracteres).</p>
      <form action={unirseEquipo} className="card space-y-4 p-6">
        <input name="code" className="input font-mono text-lg tracking-widest" defaultValue={codigo} required minLength={8} maxLength={8} placeholder="a1b2c3d4" />
        <SubmitButton>Unirme</SubmitButton>
      </form>
    </div>
  );
}
