import type { Team } from "@/lib/types";

export default function Logo({ equipo, size = 48 }: { equipo: Pick<Team, "tag" | "logo_url">; size?: number }) {
  if (equipo.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={equipo.logo_url} alt="" className="shrink-0 rounded-lg object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violeta to-fuchsia-700 font-display font-bold" style={{ width: size, height: size, fontSize: size * 0.3 }}>
      {equipo.tag}
    </span>
  );
}
