export type Juego = "unite" | "champions";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  country: string | null;
  main_game: Juego | null;
  unite_role: string | null;
  trainer_id: string | null;
  bio: string | null;
  is_admin: boolean;
  created_at: string;
};

export type Team = {
  id: string;
  name: string;
  tag: string;
  game: Juego;
  logo_url: string | null;
  description: string | null;
  captain_id: string;
  invite_code: string;
  created_at: string;
};

export type Tournament = {
  id: string;
  name: string;
  game: Juego;
  mode: "equipos" | "individual";
  description: string | null;
  rules: string | null;
  starts_at: string | null;
  max_participants: number;
  best_of: number;
  status: "borrador" | "inscripciones" | "en_curso" | "finalizado";
  champion_id: string | null;
  created_at: string;
};

export type Registration = {
  id: string;
  tournament_id: string;
  team_id: string | null;
  player_id: string | null;
  team: Pick<Team, "id" | "name" | "tag" | "logo_url" | "captain_id"> | null;
  player: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
};

export type Match = {
  id: string;
  tournament_id: string;
  round: number;
  position: number;
  a_id: string | null;
  b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  winner_id: string | null;
  status: "pendiente" | "reportado" | "disputa" | "confirmado";
  reported_by: string | null;
  evidence_url: string | null;
  scheduled_at: string | null;
};

export type Scrim = {
  id: string;
  game: Juego;
  host_user_id: string;
  host_team_id: string | null;
  rival_user_id: string | null;
  rival_team_id: string | null;
  scheduled_at: string;
  best_of: number;
  notes: string | null;
  status: "abierta" | "aceptada" | "finalizada" | "cancelada";
  score_host: number | null;
  score_rival: number | null;
};
