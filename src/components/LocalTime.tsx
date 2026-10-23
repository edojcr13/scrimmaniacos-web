"use client";

import { useEffect, useState } from "react";

/** Muestra la fecha en la zona horaria de quien visita (cada país de LATAM ve su hora). */
export default function LocalTime({ iso, conHora = true }: { iso: string; conHora?: boolean }) {
  const [texto, setTexto] = useState<string | null>(null);

  useEffect(() => {
    const fecha = new Date(iso);
    setTexto(
      fecha.toLocaleString("es-419", {
        weekday: "short",
        day: "numeric",
        month: "short",
        ...(conHora ? { hour: "2-digit", minute: "2-digit", timeZoneName: "short" } : {}),
      }),
    );
  }, [iso, conHora]);

  return <time dateTime={iso}>{texto ?? "…"}</time>;
}
