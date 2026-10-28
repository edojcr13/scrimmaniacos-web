import type { SupabaseClient } from "@supabase/supabase-js";
import type { Registration } from "./types";

export const SELECT_INSCRIPCION =
  "id, tournament_id, team_id, player_id, team:teams(id, name, tag, logo_url, captain_id), player:profiles!registrations_player_id_fkey(id, display_name, avatar_url)";

export function nombreInscripcion(r: Registration | undefined) {
  if (!r) return "Por definir";
  if (r.team) return r.team.name;
  if (r.player) return r.player.display_name;
  return "Retirado";
}

export async function inscripcionesDe(supabase: SupabaseClient, tournamentId: string) {
  const { data } = await supabase
    .from("registrations")
    .select(SELECT_INSCRIPCION)
    .eq("tournament_id", tournamentId)
    .order("created_at");
  return (data ?? []) as unknown as Registration[];
}
