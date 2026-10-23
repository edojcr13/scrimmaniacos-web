import type { Juego, Tournament } from "./types";

export const JUEGOS: Record<Juego, { nombre: string; corto: string; color: string }> = {
  unite: { nombre: "Pokémon UNITE", corto: "UNITE", color: "bg-orange-500/15 text-orange-300 ring-orange-500/30" },
  champions: { nombre: "Pokémon Champions", corto: "Champions", color: "bg-sky-500/15 text-sky-300 ring-sky-500/30" },
};

export const ROLES_UNITE: Record<string, string> = {
  atacante: "Atacante",
  defensor: "Defensor",
  todoterreno: "Todoterreno",
  veloz: "Veloz",
  apoyo: "Apoyo",
};

export const ESTADO_TORNEO: Record<Tournament["status"], string> = {
  borrador: "Borrador",
  inscripciones: "Inscripciones abiertas",
  en_curso: "En curso",
  finalizado: "Finalizado",
};

export const PAISES = [
  "Argentina", "Bolivia", "Chile", "Colombia", "Costa Rica", "Cuba", "Ecuador", "El Salvador",
  "España", "Estados Unidos", "Guatemala", "Honduras", "México", "Nicaragua", "Panamá",
  "Paraguay", "Perú", "Puerto Rico", "República Dominicana", "Uruguay", "Venezuela", "Otro",
];

export function nombreRonda(round: number, totalRounds: number) {
  const restantes = totalRounds - round;
  if (restantes === 0) return "Final";
  if (restantes === 1) return "Semifinales";
  if (restantes === 2) return "Cuartos de final";
  if (restantes === 3) return "Octavos de final";
  return `Ronda ${round}`;
}

export function esJuego(v: unknown): v is Juego {
  return v === "unite" || v === "champions";
}
