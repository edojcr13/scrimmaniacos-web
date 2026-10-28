import Link from "next/link";
import { getViewer } from "@/lib/supabase/server";
import { cerrarSesion } from "@/app/acciones";
import Avatar from "./Avatar";

const enlaces = [
  { href: "/torneos", texto: "Torneos" },
  { href: "/scrims", texto: "Scrims" },
  { href: "/equipos", texto: "Equipos" },
  { href: "/jugadores", texto: "Jugadores" },
  { href: "/ranking", texto: "Ranking" },
];

export default async function Nav() {
  const viewer = await getViewer();

  return (
    <header className="sticky top-0 z-20 border-b border-borde bg-fondo/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="font-display text-xl font-bold tracking-wide">
          SCRIM<span className="text-acento">MANÍACOS</span>
        </Link>
        <nav className="order-3 flex w-full gap-4 overflow-x-auto text-sm text-suave sm:order-none sm:w-auto">
          {enlaces.map((e) => (
            <Link key={e.href} href={e.href} className="whitespace-nowrap hover:text-texto">
              {e.texto}
            </Link>
          ))}
          {viewer?.profile.is_admin && (
            <Link href="/admin" className="whitespace-nowrap text-acento hover:text-yellow-300">
              Admin
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {viewer ? (
            <>
              <Link href="/perfil" className="flex items-center gap-2 text-sm hover:text-acento">
                <Avatar src={viewer.profile.avatar_url} nombre={viewer.profile.display_name} size={28} />
                <span className="hidden sm:inline">{viewer.profile.display_name}</span>
              </Link>
              <form action={cerrarSesion}>
                <button className="text-xs text-suave hover:text-texto">Salir</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn-primario">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
