# Leagues v2 — Supabase-backed shared standings

**Date:** 2026-07-23
**Supersedes:** the paste-to-import / base64-link league (2026-07-22 design).

## Problem

The v1 league had no shared state: one "keeper" device held the truth, friends
could not see standings themselves, and every result had to be pasted in by hand
per friend per day. That is a spreadsheet, not a league.

## Goal

Real shared leagues on a static gh-pages app with **no server to run**: the
browser talks directly to a hosted Supabase project. Friends join by a secret
code, play, and see live-ish standings without anyone acting as keeper.

## Decisions

- **Access model:** capability by secret code. The `league_id` is a random,
  unguessable string that *is* the access credential. No accounts, no login.
- **Submit flow:** automatic. Finishing today's puzzle upserts the player's
  result to every league they have joined.
- **No realtime (v1):** standings are refetched when the panel opens and after a
  submit. `// ponytail: refetch-on-open; add supabase realtime subscription if
  friends want truly live updates.`

## Security

The anon key is public in a static build. A naive open table could be dumped
(`select *`), leaking all league names and player names. Instead:

- Direct table access is **revoked** for the `anon` role.
- The only surface is three `SECURITY DEFINER` RPC functions. Reading anything
  requires passing a known `league_id`, so leagues cannot be enumerated.
- `// ponytail: capability via unguessable id + RPC-only access. Add Supabase
  Auth + per-user RLS if abuse/griefing ever happens.`

## Data model

```sql
create table leagues (
  id text primary key,            -- random secret code, e.g. "a1b2c3d4e5"
  name text not null,
  created_at timestamptz not null default now()
);

create table results (
  league_id text not null references leagues(id) on delete cascade,
  day int not null,               -- ww2dle day number
  player text not null,           -- display name, chosen by the player
  guesses int not null,           -- 1..6 solved in N, 0 = failed (X/6)
  updated_at timestamptz not null default now(),
  primary key (league_id, day, player)
);
```

## RPC surface (only thing `anon` can touch)

- `create_league(p_name text) returns text` — generates a random id, inserts the
  league, returns the id.
- `get_league(p_id text) returns json` — returns `{ name, results: [{day,
  player, guesses}] }` for that id, or null. This is the read path used to both
  validate a join and load standings.
- `submit_result(p_league_id text, p_player text, p_day int, p_guesses int)
  returns void` — upsert on `(league_id, day, player)`. No-ops silently if the
  league id does not exist (avoids leaking existence).

Grants: `revoke all` from `anon` on both tables; `grant execute` on the three
functions to `anon`.

## Client architecture

- `src/lib/supabase.ts` — creates the client from `REACT_APP_SUPABASE_URL` and
  `REACT_APP_SUPABASE_ANON_KEY`. Exports `isConfigured` so the UI degrades
  gracefully when env is missing (local dev without creds, tests).
- `src/domain/leagues.ts` — keep `scoreOf` and the monthly/medal/per-player
  stats from the parity pass; refactor `standings`/`monthsOf` to take a flat
  `Result[]` (`{day, player, guesses}`) instead of the old nested map. Drop
  `parseShareResult`, `encodeLeague`, `decodeLeague` (no more paste/link) and
  `MAX_MEMBERS`/member removal (no server-side member list).
- `src/hooks/useLeagues.tsx` — one `LeaguesProvider` at the App root holds the
  state; `useLeagues()` reads it from context, so App (join link), Game
  (auto-submit) and the panel share one membership list instead of each
  loading their own stale copy. localStorage stores only membership:
  `{ myName: string, joined: {id, name}[] }`. Async actions wrap the RPCs:
  `createLeague(name)`, `joinLeague(id)`, `leaveLeague(id)` (local only),
  `loadLeague(id)` (returns results for standings), `submitResult(id, day,
  guesses)`. Player name is `myName`.
- `src/components/panels/Leagues.tsx` — rewritten:
  - Set display name once (input, persisted).
  - List joined leagues; create a league; join by code (paste code / share it).
  - Open a league → fetch results → render standings (existing table).
  - Share = copy the league **code** (and a `?join=<id>` link for convenience).
- Auto-submit: a hook (App-level) watches today's finished game state and, once
  per day per league, calls `submitResult` for each joined league. Guard with a
  localStorage marker `submitted:<day>` so it fires once.

## Join link

Keep a `?join=<league_id>` URL param (replaces the old `?league=` snapshot). On
load, if present, auto-join (store id+name locally after a `get_league` lookup
to fetch the name), then clean the URL.

## Config / deploy

- `.env.example` documents the two `REACT_APP_SUPABASE_*` vars.
- Real values live in GitHub repo secrets, injected into the `build` step of
  `ci.yml` so the gh-pages build is configured. The anon key is public by
  design, so committing it would also be acceptable, but secrets keep it out of
  git.
- Feature is inert (shows "leagues unavailable") when unconfigured, so the app
  still builds and runs without Supabase.

## Testing

- `leagues.test.ts` — `scoreOf` and the refactored `standings` (pure, unchanged
  coverage).
- Supabase client is mocked in component/integration tests; no network.
- Drop the base64 round-trip tests (functions removed).

## Manual go-live steps (user)

1. Create a free Supabase project.
2. Run the SQL (schema + functions + grants) in the SQL editor.
3. Add `REACT_APP_SUPABASE_URL` + `REACT_APP_SUPABASE_ANON_KEY` as GitHub repo
   secrets (and a local `.env` for dev).
