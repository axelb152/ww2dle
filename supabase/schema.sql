-- ww2dle leagues — run this once in the Supabase SQL editor.
-- Access model: the league id is a random secret = the capability. The anon
-- role gets NO direct table access; the only surface is the three RPC
-- functions below, so leagues cannot be enumerated (you must know the id).

create table if not exists leagues (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists results (
  league_id text not null references leagues(id) on delete cascade,
  day int not null,
  player text not null,
  guesses int not null,               -- 1..6 solved in N, 0 = failed (X/6)
  updated_at timestamptz not null default now(),
  primary key (league_id, day, player)
);

-- Lock the tables down: anon can only reach the RPCs.
alter table leagues enable row level security;
alter table results enable row level security;
revoke all on leagues from anon;
revoke all on results from anon;

-- Random 10-char lowercase-alphanumeric id (~52 bits, unguessable enough).
create or replace function create_league(p_name text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  new_id text;
begin
  if length(coalesce(trim(p_name), '')) = 0 then
    raise exception 'name required';
  end if;
  new_id := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into leagues (id, name) values (new_id, trim(p_name));
  return new_id;
end;
$$;

-- Read path: name + all results for one league, or null if unknown.
create or replace function get_league(p_id text)
returns json
language sql security definer set search_path = public
as $$
  select case when l.id is null then null else json_build_object(
    'id', l.id,
    'name', l.name,
    'results', coalesce(
      (select json_agg(json_build_object('day', r.day, 'player', r.player, 'guesses', r.guesses))
       from results r where r.league_id = l.id),
      '[]'::json)
  ) end
  from (select * from leagues where id = p_id) l;
$$;

-- Upsert one player's result. Silently no-ops for an unknown league id.
create or replace function submit_result(p_league_id text, p_player text, p_day int, p_guesses int)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if length(coalesce(trim(p_player), '')) = 0 then
    return;
  end if;
  if not exists (select 1 from leagues where id = p_league_id) then
    return;
  end if;
  insert into results (league_id, day, player, guesses, updated_at)
  values (p_league_id, trim(p_player), p_day, p_guesses, now())
  on conflict (league_id, day, player)
  do update set guesses = excluded.guesses, updated_at = now();
end;
$$;

grant execute on function create_league(text) to anon;
grant execute on function get_league(text) to anon;
grant execute on function submit_result(text, text, int, int) to anon;
