import { nombreInscripcion } from "@/lib/datos";
import { nombreRonda } from "@/lib/labels";
import type { Match, Registration } from "@/lib/types";
import LocalTime from "./LocalTime";

const ESTADO: Record<Match["status"], { texto: string; clase: string }> = {
  pendiente: { texto: "Por jugar", clase: "text-suave" },
  reportado: { texto: "Esperando confirmación", clase: "text-sky-300" },
  disputa: { texto: "En disputa", clase: "text-red-300" },
  confirmado: { texto: "Final", clase: "text-emerald-300" },
};

export default function Bracket({ matches, inscripciones }: { matches: Match[]; inscripciones: Registration[] }) {
  const porId = new Map(inscripciones.map((r) => [r.id, r]));
  const totalRondas = Math.max(...matches.map((m) => m.round));
  const rondas = Array.from({ length: totalRondas }, (_, i) =>
    matches.filter((m) => m.round === i + 1).sort((a, b) => a.position - b.position),
  );

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-6">
        {rondas.map((partidas, i) => (
          <div key={i} className="flex w-60 flex-col">
            <h3 className="mb-3 text-center text-xs font-semibold tracking-wider text-suave uppercase">{nombreRonda(i + 1, totalRondas)}</h3>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {partidas.map((m) => {
                const bye = m.round === 1 && m.status === "confirmado" && (!m.a_id || !m.b_id);
                return (
                  <div key={m.id} className={`card overflow-hidden text-sm ${bye ? "opacity-50" : ""}`}>
                    <Lado nombre={m.a_id ? nombreInscripcion(porId.get(m.a_id)) : "Por definir"} score={m.score_a} gana={!!m.winner_id && m.winner_id === m.a_id} vacio={!m.a_id} />
                    <div className="border-t border-borde" />
                    <Lado nombre={bye ? "Pase directo" : m.b_id ? nombreInscripcion(porId.get(m.b_id)) : "Por definir"} score={m.score_b} gana={!!m.winner_id && m.winner_id === m.b_id} vacio={!m.b_id} />
                    {!bye && (
                      <p className={`flex justify-between gap-2 bg-fondo/60 px-3 py-1 text-[11px] ${ESTADO[m.status].clase}`}>
                        <span>{ESTADO[m.status].texto}</span>
                        {m.scheduled_at && m.status !== "confirmado" && <span className="text-suave"><LocalTime iso={m.scheduled_at} /></span>}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Lado({ nombre, score, gana, vacio }: { nombre: string; score: number | null; gana: boolean; vacio: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 ${gana ? "bg-acento/10 font-semibold text-acento" : ""}`}>
      <span className={`truncate ${vacio ? "text-suave italic" : ""}`}>{nombre}</span>
      <span className="font-mono">{score ?? ""}</span>
    </div>
  );
}
