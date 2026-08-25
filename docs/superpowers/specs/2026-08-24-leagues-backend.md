# WW2dle Leagues — the backend upgrade (path B, not built yet)

Follow-up to [2026-07-22-leagues-design.md](./2026-07-22-leagues-design.md).
That doc shipped the no-backend "keeper league"; 2026-08-24 extended it with
monthly periods, daily medals and per-member stats. This doc scopes what a real
server buys, so the decision is a decision and not a rewrite.

## What the local version cannot do

Everything below needs a shared write target. No amount of localStorage fixes it.

1. **Auto ingestion.** Today the keeper hand-pastes every friend's share text.
   Worldle submits the score on game end. This is the whole UX gap.
2. **Live standings.** `?league=` is a snapshot; two keepers editing the same
   league means last-import-wins.
3. **Identity.** No accounts, so a member is a free-text name — typos fork a
   member, and nothing stops anyone renaming anyone.
4. **Cross-device.** Clear your browser data and the league is gone.

## Recommended stack: Supabase

Reasons, in laziness order: no API code to write (PostgREST + the JS client),
anonymous sign-in is one call, row-level security replaces an auth layer, free
tier covers hobby traffic, and GH Pages stays a static host. Cloudflare
Workers + D1 is the alternative and means hand-writing every endpoint.

Skipped on purpose: email/password or OAuth login (anonymous rows + a display
name is enough for a friends leaderboard), realtime subscriptions (a refetch on
panel open is enough), server-side score validation (see Trust below).

## Schema

```sql
-- Supabase anonymous auth gives every device a durable auth.uid().
create table players (
  id uuid primary key references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 24)
);

create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text,
  owner uuid not null references players on delete cascade,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now()
);

create table memberships (
  league_id uuid references leagues on delete cascade,
  player_id uuid references players on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, player_id)
);

-- One row per player per day. guess_count 1..6, 0 = failed. Points stay a
-- client-side formula (scoreOf) so the scale can change without a migration.
create table results (
  player_id uuid references players on delete cascade,
  day int not null,
  guess_count int not null check (guess_count between 0 and 6),
  modifier text, -- '🙈' | '🌀' | null, for later per-mode boards
  primary key (player_id, day)
);
```

Results hang off the *player*, not the league — join a league later and your
history comes with you, exactly like Worldle's back-months view.

## RLS policies

- `results`: insert/update only `where player_id = auth.uid()`; select where the
  player shares a league with the caller.
- `memberships`: insert self only, and only when the league has fewer than 25
  members (enforced by a `before insert` trigger, since RLS can't count).
- `leagues`: update/delete only by `owner`; select for members, plus lookup by
  `invite_code` for the join screen.

## Client changes

- `src/domain/leagues.ts` — keep `scoreOf`, `standings`, `monthOf`, `parseShareResult`
  (still wanted: pasting in an absent friend). `standings()` already takes a
  `League`-shaped object, so feed it server rows and the UI is unchanged.
- New `src/hooks/useRemoteLeagues.ts` mirroring `useLeagues`' surface, so
  `Leagues.tsx` swaps hooks and keeps its props.
- `Game.tsx` — on game end, upsert the result (fire-and-forget, offline-safe:
  queue in localStorage, flush on next load).
- Join flow: `?join=<invite_code>` replaces `?league=<base64>`.
- Migration: one-time "upload this device's leagues" button; local leagues stay
  readable so nobody loses standings.

## Trust

Any client can post any score — the same hole Worldle has, and it does not
matter among friends. If it ever does: a Postgres function that only accepts a
result for today or yesterday, plus one row per player per day (the PK already
gives that).

## Cost of doing it

~2–3 days: schema + policies (½), auth + hook (½), auto-submit + offline queue
(½), join/invite UI (½), migration + tests (½–1).

## Trigger to build it

Someone complains about pasting, or a second device shows up. Until then the
local version is cheaper to own.
