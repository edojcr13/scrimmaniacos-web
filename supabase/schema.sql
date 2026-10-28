-- =====================================================================
-- Scrim Maníacos · esquema de base de datos (Supabase / PostgreSQL)
--
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
-- Se puede volver a ejecutar sin problema: no borra datos existentes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
do $$ begin
  create type public.juego as enum ('unite', 'champions');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Perfiles (uno por cada usuario de auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text unique check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  display_name text not null default 'Entrenador',
  avatar_url   text,
  country      text,
  main_game    public.juego,
  unite_role   text check (unite_role in ('atacante', 'defensor', 'todoterreno', 'veloz', 'apoyo')),
  trainer_id   text check (char_length(trainer_id) <= 40),
  bio          text check (char_length(bio) <= 300),
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse con Google.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'Entrenador'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Perfiles para los usuarios que ya existían antes de crear el trigger.
insert into public.profiles (id, display_name, avatar_url)
select id,
       coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', 'Entrenador'),
       raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------
-- Equipos
-- ---------------------------------------------------------------------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 3 and 40),
  tag         text not null check (tag ~ '^[A-Za-z0-9]{2,5}$'),
  game        public.juego not null default 'unite',
  logo_url    text,
  description text check (char_length(description) <= 300),
  captain_id  uuid not null references public.profiles (id),
  invite_code text not null unique default substr(md5(gen_random_uuid()::text), 1, 8),
  created_at  timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id   uuid not null references public.teams (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'titular' check (role in ('capitan', 'titular', 'suplente')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists team_members_user_idx on public.team_members (user_id);

-- El creador del equipo entra como capitán.
create or replace function public.handle_new_team()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.team_members tm join public.teams t on t.id = tm.team_id
    where tm.user_id = new.captain_id and t.game = new.game and t.id <> new.id
  ) then
    raise exception 'Ya perteneces a un equipo de este juego';
  end if;
  insert into public.team_members (team_id, user_id, role) values (new.id, new.captain_id, 'capitan');
  return new;
end $$;

drop trigger if exists on_team_created on public.teams;
create trigger on_team_created
  after insert on public.teams
  for each row execute function public.handle_new_team();

create or replace function public.is_captain(p_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teams where id = p_team and captain_id = auth.uid());
$$;

-- Unirse a un equipo con el código que comparte el capitán.
create or replace function public.join_team(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_team public.teams;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;

  select * into v_team from public.teams where invite_code = lower(trim(p_code));
  if not found then raise exception 'Código de invitación no válido'; end if;

  if exists (
    select 1 from public.team_members tm join public.teams t on t.id = tm.team_id
    where tm.user_id = auth.uid() and t.game = v_team.game
  ) then
    raise exception 'Ya perteneces a un equipo de este juego';
  end if;

  if (select count(*) from public.team_members where team_id = v_team.id) >= 8 then
    raise exception 'El equipo ya tiene 8 integrantes';
  end if;

  insert into public.team_members (team_id, user_id) values (v_team.id, auth.uid());
  return v_team.id;
end $$;

-- ---------------------------------------------------------------------
-- Torneos, inscripciones y partidas
-- ---------------------------------------------------------------------
create table if not exists public.tournaments (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(name) between 3 and 80),
  game             public.juego not null,
  mode             text not null check (mode in ('equipos', 'individual')),
  description      text,
  rules            text,
  starts_at        timestamptz,
  max_participants int not null default 16 check (max_participants between 2 and 128),
  best_of          int not null default 3 check (best_of in (1, 3, 5, 7)),
  status           text not null default 'inscripciones'
                   check (status in ('borrador', 'inscripciones', 'en_curso', 'finalizado')),
  champion_id      uuid,
  created_by       uuid references public.profiles (id) default auth.uid(),
  created_at       timestamptz not null default now()
);

create table if not exists public.registrations (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  team_id       uuid references public.teams (id) on delete cascade,
  player_id     uuid references public.profiles (id) on delete cascade,
  registered_by uuid not null references public.profiles (id),
  created_at    timestamptz not null default now(),
  check ((team_id is null) <> (player_id is null)),
  unique (tournament_id, team_id),
  unique (tournament_id, player_id)
);

do $$ begin
  alter table public.tournaments
    add constraint tournaments_champion_fk foreign key (champion_id)
    references public.registrations (id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  round         int not null,
  position      int not null,
  a_id          uuid references public.registrations (id) on delete set null,
  b_id          uuid references public.registrations (id) on delete set null,
  score_a       int check (score_a >= 0),
  score_b       int check (score_b >= 0),
  winner_id     uuid references public.registrations (id) on delete set null,
  status        text not null default 'pendiente'
                check (status in ('pendiente', 'reportado', 'disputa', 'confirmado')),
  reported_by   uuid references public.profiles (id),
  evidence_url  text,
  next_match_id uuid references public.matches (id) on delete set null,
  next_slot     text check (next_slot in ('a', 'b')),
  scheduled_at  timestamptz,
  updated_at    timestamptz not null default now(),
  unique (tournament_id, round, position)
);

-- ¿El usuario actual representa a esta inscripción? (el jugador o el capitán)
create or replace function public.acts_for(p_reg uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.registrations r
    left join public.teams t on t.id = r.team_id
    where r.id = p_reg and (r.player_id = auth.uid() or t.captain_id = auth.uid())
  );
$$;

create or replace function public.register_tournament(p_tournament uuid, p_team uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_t   public.tournaments;
  v_id  uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;

  select * into v_t from public.tournaments where id = p_tournament for update;
  if not found then raise exception 'Torneo no encontrado'; end if;
  if v_t.status <> 'inscripciones' then raise exception 'Las inscripciones están cerradas'; end if;
  if (select count(*) from public.registrations where tournament_id = p_tournament) >= v_t.max_participants then
    raise exception 'El torneo ya está lleno';
  end if;

  if v_t.mode = 'equipos' then
    if p_team is null then raise exception 'Este torneo es por equipos: elige tu equipo'; end if;
    if not public.is_captain(p_team) then raise exception 'Solo el capitán puede inscribir al equipo'; end if;
    if (select game from public.teams where id = p_team) <> v_t.game then
      raise exception 'El equipo no es de este juego';
    end if;
    if v_t.game = 'unite' and (select count(*) from public.team_members where team_id = p_team) < 5 then
      raise exception 'Un equipo de Pokémon UNITE necesita al menos 5 integrantes';
    end if;
    -- Un mismo jugador no puede competir con dos equipos en el mismo torneo.
    if exists (
      select 1 from public.team_members mine
      join public.team_members other on other.user_id = mine.user_id and other.team_id <> mine.team_id
      join public.registrations r on r.team_id = other.team_id and r.tournament_id = p_tournament
      where mine.team_id = p_team
    ) then
      raise exception 'Algún integrante ya está inscrito con otro equipo';
    end if;
    insert into public.registrations (tournament_id, team_id, registered_by)
    values (p_tournament, p_team, auth.uid()) returning id into v_id;
  else
    insert into public.registrations (tournament_id, player_id, registered_by)
    values (p_tournament, auth.uid(), auth.uid()) returning id into v_id;
  end if;

  return v_id;
exception when unique_violation then
  raise exception 'Ya estás inscrito en este torneo';
end $$;

-- Coloca al ganador de una partida confirmada en la siguiente ronda.
create or replace function public._advance(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_m public.matches;
begin
  select * into v_m from public.matches where id = p_match;
  if v_m.next_match_id is null then
    update public.tournaments set status = 'finalizado', champion_id = v_m.winner_id
    where id = v_m.tournament_id;
  elsif v_m.next_slot = 'a' then
    update public.matches set a_id = v_m.winner_id, updated_at = now() where id = v_m.next_match_id;
  else
    update public.matches set b_id = v_m.winner_id, updated_at = now() where id = v_m.next_match_id;
  end if;
end $$;

-- Sorteo aleatorio y creación del bracket de eliminación simple.
create or replace function public.generate_bracket(p_tournament uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_t       public.tournaments;
  v_regs    uuid[];
  v_n       int;
  v_size    int := 2;
  v_rounds  int := 1;
  v_byes    int;
  v_half    int;
  v_order   int[];
  v_r       int;
  v_p       int;
  v_idx     int := 1;
  v_mid     uuid;
  v_id      uuid;
begin
  if not public.is_admin() then raise exception 'Solo un administrador puede generar el bracket'; end if;

  select * into v_t from public.tournaments where id = p_tournament for update;
  if not found then raise exception 'Torneo no encontrado'; end if;
  if v_t.status not in ('borrador', 'inscripciones')
     or exists (select 1 from public.matches where tournament_id = p_tournament) then
    raise exception 'El bracket ya fue generado';
  end if;

  select array_agg(id order by random()) into v_regs
  from public.registrations where tournament_id = p_tournament;
  v_n := coalesce(array_length(v_regs, 1), 0);
  if v_n < 2 then raise exception 'Se necesitan al menos 2 inscritos'; end if;

  while v_size < v_n loop v_size := v_size * 2; v_rounds := v_rounds + 1; end loop;
  v_byes := v_size - v_n;
  v_half := v_size / 2;

  -- Crear partidas desde la final hacia atrás para poder enlazar next_match_id.
  for v_r in reverse v_rounds..1 loop
    for v_p in 1..(v_size / (2 ^ v_r))::int loop
      if v_r = v_rounds then
        v_mid := null;
      else
        select id into v_mid from public.matches
        where tournament_id = p_tournament and round = v_r + 1 and position = (v_p + 1) / 2;
      end if;
      insert into public.matches (tournament_id, round, position, next_match_id, next_slot)
      values (p_tournament, v_r, v_p, v_mid, case when v_mid is null then null when v_p % 2 = 1 then 'a' else 'b' end);
    end loop;
  end loop;

  -- Los "byes" (pases directos) se reparten en posiciones impares y luego pares,
  -- para que no se acumulen en un mismo lado del cuadro.
  select array_agg(p order by (p + 1) % 2, p) into v_order from generate_series(1, v_half) p;

  for v_p in 1..v_half loop
    if v_p <= v_byes then
      update public.matches
      set a_id = v_regs[v_idx], winner_id = v_regs[v_idx], status = 'confirmado'
      where tournament_id = p_tournament and round = 1 and position = v_order[v_p]
      returning id into v_id;
      v_idx := v_idx + 1;
      perform public._advance(v_id);
    else
      update public.matches set a_id = v_regs[v_idx], b_id = v_regs[v_idx + 1]
      where tournament_id = p_tournament and round = 1 and position = v_order[v_p];
      v_idx := v_idx + 2;
    end if;
  end loop;

  update public.tournaments set status = 'en_curso' where id = p_tournament;
  return v_size / 2;
end $$;

create or replace function public.report_result(p_match uuid, p_score_a int, p_score_b int, p_evidence text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_m    public.matches;
  v_need int;
begin
  select m.* into v_m from public.matches m where m.id = p_match for update;
  if not found then raise exception 'Partida no encontrada'; end if;
  if v_m.a_id is null or v_m.b_id is null then raise exception 'La partida aún no tiene ambos rivales'; end if;
  if v_m.status = 'confirmado' then raise exception 'El resultado ya está confirmado'; end if;

  select (best_of / 2) + 1 into v_need from public.tournaments where id = v_m.tournament_id;
  if p_score_a < 0 or p_score_b < 0 or p_score_a = p_score_b or greatest(p_score_a, p_score_b) <> v_need then
    raise exception 'Marcador no válido: el ganador debe llegar a % victorias', v_need;
  end if;

  if public.is_admin() then
    update public.matches set score_a = p_score_a, score_b = p_score_b, evidence_url = coalesce(p_evidence, evidence_url),
      winner_id = case when p_score_a > p_score_b then a_id else b_id end,
      status = 'confirmado', reported_by = auth.uid(), updated_at = now()
    where id = p_match;
    perform public._advance(p_match);
  elsif public.acts_for(v_m.a_id) or public.acts_for(v_m.b_id) then
    update public.matches set score_a = p_score_a, score_b = p_score_b, evidence_url = p_evidence,
      winner_id = null, status = 'reportado', reported_by = auth.uid(), updated_at = now()
    where id = p_match;
  else
    raise exception 'No participas en esta partida';
  end if;
end $$;

-- El rival confirma (p_accept = true) o abre una disputa (false).
create or replace function public.respond_result(p_match uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_m       public.matches;
  v_rep_reg uuid;
begin
  select * into v_m from public.matches where id = p_match for update;
  if not found then raise exception 'Partida no encontrada'; end if;
  if v_m.status <> 'reportado' then raise exception 'No hay un resultado pendiente de confirmar'; end if;

  -- Inscripción que reportó: la que representa quien reportó.
  v_rep_reg := case
    when exists (select 1 from public.registrations r left join public.teams t on t.id = r.team_id
                 where r.id = v_m.a_id and (r.player_id = v_m.reported_by or t.captain_id = v_m.reported_by))
    then v_m.a_id else v_m.b_id end;

  if not (public.acts_for(case when v_rep_reg = v_m.a_id then v_m.b_id else v_m.a_id end)) then
    raise exception 'Solo el rival puede confirmar o disputar el resultado';
  end if;

  if p_accept then
    update public.matches
    set status = 'confirmado', winner_id = case when score_a > score_b then a_id else b_id end, updated_at = now()
    where id = p_match;
    perform public._advance(p_match);
  else
    update public.matches set status = 'disputa', updated_at = now() where id = p_match;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Scrims (partidas de práctica)
-- ---------------------------------------------------------------------
create table if not exists public.scrims (
  id            uuid primary key default gen_random_uuid(),
  game          public.juego not null,
  host_user_id  uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  host_team_id  uuid references public.teams (id) on delete cascade,
  rival_user_id uuid references public.profiles (id) on delete set null,
  rival_team_id uuid references public.teams (id) on delete set null,
  scheduled_at  timestamptz not null,
  best_of       int not null default 3 check (best_of between 1 and 9),
  notes         text check (char_length(notes) <= 300),
  status        text not null default 'abierta' check (status in ('abierta', 'aceptada', 'finalizada', 'cancelada')),
  score_host    int check (score_host >= 0),
  score_rival   int check (score_rival >= 0),
  created_at    timestamptz not null default now(),
  check (game <> 'unite' or host_team_id is not null)
);

create index if not exists scrims_date_idx on public.scrims (scheduled_at);

create or replace function public.accept_scrim(p_scrim uuid, p_team uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_s public.scrims;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select * into v_s from public.scrims where id = p_scrim for update;
  if not found then raise exception 'Scrim no encontrada'; end if;
  if v_s.status <> 'abierta' then raise exception 'Esta scrim ya no está disponible'; end if;
  if v_s.host_user_id = auth.uid() then raise exception 'No puedes aceptar tu propia scrim'; end if;

  if v_s.host_team_id is not null then
    if p_team is null or not public.is_captain(p_team) then
      raise exception 'Debes ser capitán de un equipo para aceptar';
    end if;
    if p_team = v_s.host_team_id then raise exception 'No puedes jugar contra tu propio equipo'; end if;
    if (select game from public.teams where id = p_team) <> v_s.game then
      raise exception 'Tu equipo no es de este juego';
    end if;
  end if;

  update public.scrims
  set status = 'aceptada', rival_user_id = auth.uid(), rival_team_id = p_team
  where id = p_scrim;
end $$;

create or replace function public.report_scrim(p_scrim uuid, p_host int, p_rival int)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.scrims
  set score_host = p_host, score_rival = p_rival, status = 'finalizada'
  where id = p_scrim and status = 'aceptada'
    and auth.uid() in (host_user_id, rival_user_id);
  if not found then raise exception 'No puedes reportar esta scrim'; end if;
end $$;

create or replace function public.cancel_scrim(p_scrim uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.scrims set status = 'cancelada'
  where id = p_scrim and status in ('abierta', 'aceptada')
    and (auth.uid() in (host_user_id, rival_user_id) or public.is_admin());
  if not found then raise exception 'No puedes cancelar esta scrim'; end if;
end $$;

-- ---------------------------------------------------------------------
-- Ranking: 3 puntos por victoria en partidas oficiales, +10 por título.
-- Los pases directos (byes) no cuentan.
-- ---------------------------------------------------------------------
create or replace view public.ranking with (security_invoker = true) as
with results as (
  select m.winner_id as reg_id, 1 as wins, 0 as losses
  from public.matches m
  where m.status = 'confirmado' and m.a_id is not null and m.b_id is not null
  union all
  select case when m.winner_id = m.a_id then m.b_id else m.a_id end, 0, 1
  from public.matches m
  where m.status = 'confirmado' and m.a_id is not null and m.b_id is not null
),
titles as (
  select champion_id as reg_id, 1 as titles from public.tournaments where champion_id is not null
),
per_reg as (
  select r.id, r.team_id, r.player_id, t.game,
         coalesce(sum(res.wins), 0) as wins, coalesce(sum(res.losses), 0) as losses,
         coalesce(max(ti.titles), 0) as titles
  from public.registrations r
  join public.tournaments t on t.id = r.tournament_id
  left join results res on res.reg_id = r.id
  left join titles ti on ti.reg_id = r.id
  group by r.id, r.team_id, r.player_id, t.game
)
select game,
       team_id,
       player_id,
       sum(wins)::int   as wins,
       sum(losses)::int as losses,
       sum(titles)::int as titles,
       (sum(wins) * 3 + sum(titles) * 10)::int as points
from per_reg
group by game, team_id, player_id
having sum(wins) + sum(losses) > 0;

-- ---------------------------------------------------------------------
-- Seguridad (Row Level Security)
-- Todo es de lectura pública; las escrituras sensibles pasan por funciones.
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.teams         enable row level security;
alter table public.team_members  enable row level security;
alter table public.tournaments   enable row level security;
alter table public.registrations enable row level security;
alter table public.matches       enable row level security;
alter table public.scrims        enable row level security;

drop policy if exists "lectura publica" on public.profiles;
create policy "lectura publica" on public.profiles for select using (true);
drop policy if exists "editar mi perfil" on public.profiles;
create policy "editar mi perfil" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "lectura publica" on public.teams;
create policy "lectura publica" on public.teams for select using (true);
drop policy if exists "crear equipo" on public.teams;
create policy "crear equipo" on public.teams for insert with check (captain_id = auth.uid());
drop policy if exists "capitan edita" on public.teams;
create policy "capitan edita" on public.teams for update using (captain_id = auth.uid());
drop policy if exists "capitan borra" on public.teams;
create policy "capitan borra" on public.teams for delete using (captain_id = auth.uid() or public.is_admin());

drop policy if exists "lectura publica" on public.team_members;
create policy "lectura publica" on public.team_members for select using (true);
drop policy if exists "capitan cambia rol" on public.team_members;
create policy "capitan cambia rol" on public.team_members for update
  using (public.is_captain(team_id)) with check (role <> 'capitan');
drop policy if exists "salir o expulsar" on public.team_members;
create policy "salir o expulsar" on public.team_members for delete
  using (role <> 'capitan' and (user_id = auth.uid() or public.is_captain(team_id)));

drop policy if exists "lectura publica" on public.tournaments;
create policy "lectura publica" on public.tournaments for select using (status <> 'borrador' or public.is_admin());
drop policy if exists "admin gestiona" on public.tournaments;
create policy "admin gestiona" on public.tournaments for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "lectura publica" on public.registrations;
create policy "lectura publica" on public.registrations for select using (true);
drop policy if exists "retirar inscripcion" on public.registrations;
create policy "retirar inscripcion" on public.registrations for delete using (
  public.is_admin() or (
    public.acts_for(id)
    and (select status from public.tournaments where id = tournament_id) = 'inscripciones'
  )
);

drop policy if exists "lectura publica" on public.matches;
create policy "lectura publica" on public.matches for select using (true);
drop policy if exists "admin programa" on public.matches;
create policy "admin programa" on public.matches for update using (public.is_admin());

drop policy if exists "lectura publica" on public.scrims;
create policy "lectura publica" on public.scrims for select using (true);
drop policy if exists "publicar scrim" on public.scrims;
create policy "publicar scrim" on public.scrims for insert with check (
  host_user_id = auth.uid() and status = 'abierta'
  and rival_user_id is null and rival_team_id is null
  and (host_team_id is null or public.is_captain(host_team_id))
);

-- Permisos por columna: nadie puede darse admin ni cambiar al capitán desde la web.
revoke insert, update on public.profiles from anon, authenticated;
grant update (username, display_name, avatar_url, country, main_game, unite_role, trainer_id, bio)
  on public.profiles to authenticated;

revoke update on public.teams from anon, authenticated;
grant update (name, tag, logo_url, description) on public.teams to authenticated;

revoke insert, update on public.team_members from anon, authenticated;
grant update (role) on public.team_members to authenticated;

revoke insert on public.registrations from anon, authenticated;

revoke insert on public.matches from anon, authenticated;
revoke update on public.matches from anon, authenticated;
grant update (scheduled_at) on public.matches to authenticated;

revoke update on public.scrims from anon, authenticated;

-- Funciones: solo usuarios con sesión pueden ejecutarlas.
revoke execute on function public._advance(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_team() from public, anon, authenticated;
-- Ayudantes de las políticas: solo los necesitan usuarios con sesión
-- (is_admin también lo usa la lectura pública de torneos).
revoke execute on function public.acts_for(uuid) from public, anon;
revoke execute on function public.is_captain(uuid) from public, anon;
grant execute on function public.acts_for(uuid) to authenticated;
grant execute on function public.is_captain(uuid) to authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'public.join_team(text)',
    'public.register_tournament(uuid, uuid)',
    'public.generate_bracket(uuid)',
    'public.report_result(uuid, int, int, text)',
    'public.respond_result(uuid, boolean)',
    'public.accept_scrim(uuid, uuid)',
    'public.report_scrim(uuid, int, int)',
    'public.cancel_scrim(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

grant select on public.ranking to anon, authenticated;
